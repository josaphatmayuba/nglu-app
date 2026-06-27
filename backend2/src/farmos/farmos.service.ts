import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { renderPdfViaService } from "../common/pdf-client";
import { and, desc, eq, gte, inArray, isNull, like, lt, notInArray, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { UsersService } from "../users/users.service";
import { roles } from "../database/schema";
import { departments, designations, farmosAiInsights, farmosAnimalPhotos, farmosAnimals, farmosBoxes, farmosBuildings, farmosDocuments, farmosDiseases, farmosExpenses, farmosFarms, farmosFeedForecasts, farmosLandFeatures, farmosLookups, farmosMedicines, farmosMortalityEvents, farmosPriceList, farmosProductionLogs, farmosReproductionEvents, farmosSales, farmosSemenStraws, farmosTasks, farmosTreatments, farmosVaccinations, farmosVaccines, farmosVetExams, farmosVetPrescriptions, farmosWeighings, farmosWorkLogs, farmosZones, suppliers, transactions, transactionTypes, users } from "../database/schema";
import type { Database } from "../database/types";
import { LedgerService } from "../ledger/ledger.service";
import { WorkflowService } from "../workflow/workflow.service";
import { RealtimeDataPublisher } from "../realtime/realtime-data-publisher.service";
import type {
  CreateAnimalDto,
  ImportAnimalsDto,
  CreateDiseaseDto,
  CreateExpenseDto,
  CreateMedicineDto,
  CreateProductionLogDto,
  CreateReproductionEventDto,
  CreateSaleDto,
  CreateSemenStrawDto,
  CreateTreatmentDto,
  CreateWeighingDto,
  SetFarmosStaffStatusDto,
  UpdateAnimalDto,
  UpdateFarmosStaffDto,
  UpdateDiseaseDto,
  UpdateMedicineDto,
  UpdateSemenStrawDto,
  UpdateTreatmentDto,
  UpsertFarmosPriceDto,
} from "./dto/farmos.dto";
import { FARMOS_SPECIES, type FarmosSpecies } from "./dto/farmos.dto";

const DECEASED_ANIMAL_STATUSES = ["deceased", "dead", "decede", "décédé", "mort"];
const SALE_LISTED_ANIMAL_STATUSES = ["available_sale", "for_sale", "a_vendre"];
const SALE_LOCKED_ANIMAL_STATUSES = [...SALE_LISTED_ANIMAL_STATUSES, "sold", "vendu", ...DECEASED_ANIMAL_STATUSES];

@Injectable()
export class FarmosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly usersService: UsersService,
    private readonly realtime: RealtimeDataPublisher,
    private readonly ledger: LedgerService,
    private readonly workflow: WorkflowService,
  ) {}

  private isDeceasedStatus(status: unknown) {
    return DECEASED_ANIMAL_STATUSES.includes(String(status || "").trim().toLowerCase());
  }

  private isSaleLockedStatus(status: unknown) {
    const s = String(status || "").trim().toLowerCase();
    return SALE_LOCKED_ANIMAL_STATUSES.includes(s);
  }

  private isSaleListedStatus(status: unknown) {
    return SALE_LISTED_ANIMAL_STATUSES.includes(String(status || "").trim().toLowerCase());
  }

  private activeLivestockSqlCondition() {
    return or(isNull(farmosAnimals.status), notInArray(farmosAnimals.status, SALE_LOCKED_ANIMAL_STATUSES));
  }

  private animalListingNote(animalId: number) {
    return `animal:${animalId}`;
  }

  private assertAnimalWritable(animal: { status?: unknown } | null | undefined) {
    if (this.isSaleLockedStatus(animal?.status)) {
      throw new BadRequestException(
        this.isDeceasedStatus(animal?.status)
          ? "Ce dossier est verrouille: l'animal est decede."
          : "Ce dossier est verrouille: l'animal est en vente ou vendu.",
      );
    }
  }

  private async assertAnimalWritableById(animalId: number | null | undefined, orgId: number) {
    if (animalId == null) return null;
    const animal = await this.getAnimal(Number(animalId), orgId);
    this.assertAnimalWritable(animal);
    return animal;
  }

  async getDashboardSnapshot(orgId: number) {
    const [
      animals,
      medicines,
      sales,
      expenses,
      treatments,
      repro,
      vaccinations,
      aiInsights,
      finance,
      productionLogs,
      mortalityEvents,
    ] = await Promise.all([
      this.listAnimals(orgId),
      this.listMedicines(orgId),
      this.listSales(orgId),
      this.listExpenses(orgId),
      this.listTreatments(orgId),
      this.listReproductionEvents(orgId),
      this.listVaccinations(orgId),
      this.listAiInsights(orgId),
      this.getFinanceSummary(orgId),
      this.listProductionLogs(orgId),
      this.listMortalityEvents(orgId),
    ]);
    const withdrawalAlerts = this.computeWithdrawalAlerts(treatments, animals);
    return {
      animals,
      medicines,
      sales,
      expenses,
      treatments,
      repro,
      vaccinations,
      aiInsights,
      finance,
      productionLogs,
      mortalityEvents,
      withdrawalAlerts,
    };
  }

  // ─── Délai de retrait (withdrawal period) — conformité sécurité alimentaire ──
  // Calcule la date « commercialisable à partir de » par produit (viande/lait/œufs)
  // à partir des traitements actifs : (endDate ?? startDate) + délai.
  private withdrawalEndDates(treatment: any): { meat: string | null; milk: string | null; eggs: string | null } {
    const base = treatment.endDate ?? treatment.startDate;
    if (!base) return { meat: null, milk: null, eggs: null };
    const addDays = (days: number | null | undefined): string | null => {
      if (days == null || days <= 0) return null;
      const d = new Date(`${base}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) return null;
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };
    const milkDays = treatment.withdrawalMilkHours != null ? Math.ceil(Number(treatment.withdrawalMilkHours) / 24) : null;
    return {
      meat: addDays(treatment.withdrawalMeatDays),
      milk: addDays(milkDays),
      eggs: addDays(treatment.withdrawalEggsDays),
    };
  }

  // Pour un animal donné : la date de fin de retrait la plus tardive encore active (par produit).
  private animalWithdrawalUntil(treatments: any[], animalId: number, today: string) {
    const result: { meat: string | null; milk: string | null; eggs: string | null } = { meat: null, milk: null, eggs: null };
    for (const t of treatments) {
      if (Number(t.animalId) !== Number(animalId)) continue;
      const ends = this.withdrawalEndDates(t);
      for (const key of ["meat", "milk", "eggs"] as const) {
        const end = ends[key];
        if (end && end >= today && (!result[key] || end > result[key]!)) result[key] = end;
      }
    }
    return result;
  }

  // Recalcule et dénormalise withdrawalUntil/withdrawalKind sur l'animal à partir
  // de ses traitements actifs. Appelé après toute mutation de traitement.
  // withdrawalUntil = la date la plus tardive tous produits confondus (sécurité max),
  // withdrawalKind = le produit qui porte cette date.
  private async recomputeAnimalWithdrawal(animalId: number, orgId: number) {
    const today = new Date().toISOString().slice(0, 10);
    const treatments = await this.db
      .select()
      .from(farmosTreatments)
      .where(and(eq(farmosTreatments.animalId, animalId), eq(farmosTreatments.organizationId, orgId), eq(farmosTreatments.isActive, 1)));
    const until = this.animalWithdrawalUntil(treatments, animalId, today);
    let kind: string | null = null;
    let date: string | null = null;
    for (const key of ["meat", "milk", "eggs"] as const) {
      if (until[key] && (!date || until[key]! > date)) {
        date = until[key];
        kind = key;
      }
    }
    await this.db
      .update(farmosAnimals)
      .set({ withdrawalUntil: date, withdrawalKind: kind })
      .where(and(eq(farmosAnimals.id, animalId), eq(farmosAnimals.organizationId, orgId)));
  }

  private computeWithdrawalAlerts(treatments: any[], animals: any[]) {
    const today = new Date().toISOString().slice(0, 10);
    const alerts: Array<{
      animalId: number;
      animalName: string | null;
      species: string | null;
      meatUntil: string | null;
      milkUntil: string | null;
      eggsUntil: string | null;
    }> = [];
    for (const a of animals) {
      const until = this.animalWithdrawalUntil(treatments, Number(a.id), today);
      if (until.meat || until.milk || until.eggs) {
        alerts.push({
          animalId: Number(a.id),
          animalName: a.name ?? a.tag ?? null,
          species: a.species ?? null,
          meatUntil: until.meat,
          milkUntil: until.milk,
          eggsUntil: until.eggs,
        });
      }
    }
    return alerts;
  }

  // ─── FarmOS staff onboarding (creates a CRM user assigned to the FarmOS dept) ─
  async getSettings(orgId: number) {
    const rows = await this.db
      .select({ valueFr: farmosLookups.valueFr })
      .from(farmosLookups)
      .where(and(
        eq(farmosLookups.organizationId, orgId),
        eq(farmosLookups.category, "enabled_species"),
        eq(farmosLookups.isActive, 1),
      ));
    const valid = new Set(FARMOS_SPECIES);
    const enabled = Array.from(new Set(rows
      .map((r) => r.valueFr)
      .filter((v): v is FarmosSpecies => valid.has(v as FarmosSpecies))));
    return {
      enabled_species: enabled.length ? enabled : [...FARMOS_SPECIES],
      available_species: [...FARMOS_SPECIES],
    };
  }

  async updateSpeciesSettings(orgId: number, enabledSpecies: FarmosSpecies[]) {
    const valid = new Set(FARMOS_SPECIES);
    const enabled = Array.from(new Set((enabledSpecies || []).filter((s) => valid.has(s))));
    if (enabled.length === 0) throw new BadRequestException("Au moins une espece doit rester active.");

    await this.db
      .update(farmosLookups)
      .set({ isActive: 0 })
      .where(and(eq(farmosLookups.organizationId, orgId), eq(farmosLookups.category, "enabled_species")));

    await this.db.insert(farmosLookups).values(enabled.map((species) => ({
      organizationId: orgId,
      category: "enabled_species",
      scopeKey: null,
      valueFr: species,
      valueEn: species,
    })));

    await this.publishFarmosUpdate("updateFarmosSettings", ["lookups"], "updated", "enabled_species", orgId);
    return this.getSettings(orgId);
  }

  async listPrices(orgId: number) {
    return this.db
      .select()
      .from(farmosPriceList)
      .where(and(eq(farmosPriceList.organizationId, orgId), eq(farmosPriceList.isActive, 1)))
      .orderBy(farmosPriceList.saleSource, farmosPriceList.productType, farmosPriceList.species);
  }

  async createPrice(input: UpsertFarmosPriceDto, orgId: number) {
    const [res] = await this.db.insert(farmosPriceList).values({
      organizationId: orgId,
      saleSource: input.sale_source ?? "production",
      species: input.species ?? null,
      productType: input.product_type,
      unit: input.unit ?? null,
      unitPrice: String(input.unit_price),
      currencyId: input.currency_id ?? null,
      notes: input.notes ?? null,
    }).$returningId();
    await this.publishFarmosUpdate("createPrice", ["priceList"], "created", res.id, orgId);
    return this.getPrice(res.id, orgId);
  }

  async updatePrice(id: number, input: UpsertFarmosPriceDto, orgId: number) {
    await this.getPrice(id, orgId);
    await this.db.update(farmosPriceList).set({
      saleSource: input.sale_source ?? "production",
      species: input.species ?? null,
      productType: input.product_type,
      unit: input.unit ?? null,
      unitPrice: String(input.unit_price),
      currencyId: input.currency_id ?? null,
      notes: input.notes ?? null,
    }).where(and(eq(farmosPriceList.id, id), eq(farmosPriceList.organizationId, orgId)));
    await this.publishFarmosUpdate("updatePrice", ["priceList"], "updated", id, orgId);
    return this.getPrice(id, orgId);
  }

  async deletePrice(id: number, orgId: number) {
    await this.getPrice(id, orgId);
    await this.db.update(farmosPriceList).set({ isActive: 0 }).where(and(eq(farmosPriceList.id, id), eq(farmosPriceList.organizationId, orgId)));
    await this.publishFarmosUpdate("deletePrice", ["priceList"], "deleted", id, orgId);
    return { message: "Prix supprimé." };
  }

  async unlistAnimalFromSale(id: number, orgId: number) {
    const animal = await this.getAnimal(id, orgId);
    if (String(animal.status || "").trim().toLowerCase() === "sold") {
      throw new BadRequestException("Impossible de retirer de la vente: l'animal est déjà vendu.");
    }

    const [activeSale] = await this.db
      .select({ id: farmosSales.id })
      .from(farmosSales)
      .where(and(eq(farmosSales.organizationId, orgId), eq(farmosSales.isActive, 1), eq(farmosSales.animalId, id)))
      .limit(1);
    if (activeSale) {
      throw new BadRequestException("Impossible de retirer de la vente: une vente existe déjà pour cet animal.");
    }

    const marker = this.animalListingNote(id);
    const linkedListing = and(
      eq(farmosPriceList.organizationId, orgId),
      eq(farmosPriceList.isActive, 1),
      eq(farmosPriceList.saleSource, "animal"),
      eq(farmosPriceList.productType, "animal"),
      or(eq(farmosPriceList.notes, marker), like(farmosPriceList.notes, `${marker} %`)),
    );
    await this.db.update(farmosPriceList).set({ isActive: 0 }).where(linkedListing);

    if (this.isSaleListedStatus(animal.status)) {
      await this.db
        .update(farmosAnimals)
        .set({ status: "healthy" })
        .where(and(eq(farmosAnimals.id, id), eq(farmosAnimals.organizationId, orgId)));
    }

    await this.publishFarmosUpdate("unlistAnimalSale", ["animals", "priceList"], "updated", id, orgId);
    return { message: "Animal retiré de la vente.", animal: await this.getAnimal(id, orgId) };
  }

  private async getPrice(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosPriceList)
      .where(and(eq(farmosPriceList.id, id), eq(farmosPriceList.organizationId, orgId), eq(farmosPriceList.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Prix introuvable.");
    return row;
  }

  async createFarmosStaff(
    input: { firstName?: string; lastName?: string; email: string; designation: string; phone?: string; password?: string },
    orgId: number,
  ) {
    if (!input.email) throw new BadRequestException("Email requis.");
    if (!input.designation) throw new BadRequestException("Désignation (rôle métier) requise.");

    // Find or create the FarmOS department (departments are global, not per-org).
    let [dept] = await this.db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(or(sql`LOWER(${departments.name}) = 'farmos'`, sql`LOWER(${departments.name}) = 'ferme'`))
      .limit(1);
    if (!dept) {
      const [r] = await this.db.insert(departments).values({ name: "FarmOS" } as any).$returningId();
      dept = { id: Number(r.id), name: "FarmOS" };
    }

    // Find or create the designation by name.
    let [desig] = await this.db
      .select({ id: designations.id })
      .from(designations)
      .where(sql`LOWER(${designations.name}) = ${input.designation.toLowerCase()}`)
      .limit(1);
    if (!desig) {
      const [r] = await this.db.insert(designations).values({ name: input.designation } as any).$returningId();
      desig = { id: Number(r.id) };
    }

    // Pick a sensible default role (manager > salesman > first non super-admin).
    const roleRows = await this.db.select({ id: roles.id, name: roles.name }).from(roles);
    const pickRole = (name: string) => roleRows.find((r) => (r.name || "").toLowerCase() === name)?.id;
    const roleId = pickRole("manager") || pickRole("salesman") || roleRows.find((r) => (r.name || "").toLowerCase() !== "super-admin")?.id;
    if (!roleId) throw new BadRequestException("Aucun rôle CRM disponible pour assigner l'employé.");

    // Username from email local-part; password generated if not provided.
    const username = (input.email.split("@")[0] || `user-${Date.now()}`).toLowerCase().replace(/[^a-z0-9._-]/g, "-");
    const generatedPassword = input.password && input.password.length >= 12
      ? input.password
      : `Farm${Math.random().toString(36).slice(2, 10)}${Math.floor(Math.random() * 9000 + 1000)}!`;

    const created = await this.usersService.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      username,
      password: generatedPassword,
      roleId,
      designationId: desig.id,
      departmentId: dept.id,
      organizationId: orgId,
      status: "true",
    } as any, {});

    await this.publishFarmosUpdate("createFarmosStaff", ["staff"], "created", created?.id ?? input.email, orgId);
    return { user: created, generatedPassword: input.password ? null : generatedPassword };
  }

  // Modifie un employé FarmOS (nom, téléphone, désignation/rôle métier).
  async updateFarmosStaff(id: number, input: UpdateFarmosStaffDto, orgId: number) {
    const [existing] = await this.db.select({ id: users.id }).from(users)
      .where(and(eq(users.id, id), eq(users.organizationId, orgId))).limit(1);
    if (!existing) throw new NotFoundException("Employé introuvable.");
    const patch: Record<string, unknown> = {};
    if (input.firstName !== undefined) patch.firstName = input.firstName;
    if (input.lastName !== undefined) patch.lastName = input.lastName;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.designation !== undefined && input.designation) {
      const [d] = await this.db.select({ id: designations.id }).from(designations)
        .where(sql`LOWER(${designations.name}) = ${input.designation.toLowerCase()}`).limit(1);
      let designationId = d?.id;
      if (!designationId) {
        const [r] = await this.db.insert(designations).values({ name: input.designation } as any).$returningId();
        designationId = (r as any).id;
      }
      patch.designationId = designationId;
    }
    if (input.role_id !== undefined && input.role_id != null) {
      // Vérifie que le rôle existe avant de l'assigner (permissions de l'employé).
      const [r] = await this.db.select({ id: roles.id }).from(roles).where(eq(roles.id, input.role_id)).limit(1);
      if (!r) throw new BadRequestException("Rôle introuvable.");
      patch.roleId = input.role_id;
    }
    if (Object.keys(patch).length > 0) {
      await this.db.update(users).set(patch).where(eq(users.id, id));
    }
    await this.publishFarmosUpdate("updateFarmosStaff", ["staff"], "updated", id, orgId);
    return { ok: true };
  }

  // Change le statut d'un employé : active / left (parti) / resigned (démissionné).
  // Inactif => status="false" (n'apparaît plus dans la liste active) + leaveDate/reason.
  async setFarmosStaffStatus(id: number, input: SetFarmosStaffStatusDto, orgId: number) {
    const [existing] = await this.db.select({ id: users.id }).from(users)
      .where(and(eq(users.id, id), eq(users.organizationId, orgId))).limit(1);
    if (!existing) throw new NotFoundException("Employé introuvable.");
    if (input.status === "active") {
      await this.db.update(users).set({ status: "true", leaveDate: null, leaveReason: null }).where(eq(users.id, id));
    } else {
      const reason = input.leave_reason ?? (input.status === "resigned" ? "Démission" : "Départ");
      await this.db.update(users).set({
        status: "false",
        leaveDate: input.leave_date ? new Date(input.leave_date) : new Date(),
        leaveReason: reason,
      }).where(eq(users.id, id));
    }
    await this.publishFarmosUpdate("setFarmosStaffStatus", ["staff"], "updated", id, orgId);
    return { ok: true };
  }

  // Rôles assignables à un employé (gestion des permissions). On expose tous les
  // rôles actifs sauf super-admin (non assignable depuis FarmOS).
  async listAssignableRoles() {
    const rows = await this.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.status, "true"));
    return rows.filter((r) => (r.name || "").toLowerCase() !== "super-admin");
  }

  // ─── Animals ─────────────────────────────────────────────────────────────

  async listAnimals(orgId: number) {
    return this.db
      .select()
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.organizationId, orgId), eq(farmosAnimals.isActive, 1)))
      .orderBy(desc(farmosAnimals.id));
  }

  async getAnimal(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.id, id), eq(farmosAnimals.organizationId, orgId)))
      .limit(1);
    if (!row) throw new NotFoundException("Animal not found.");
    return row;
  }

  async createAnimal(input: CreateAnimalDto, orgId: number) {
    const [result] = await this.db.insert(farmosAnimals).values({
      organizationId: orgId,
      externalId: input.external_id ?? null,
      name: input.name ?? null,
      species: input.species,
      race: input.race ?? null,
      sex: input.sex ?? null,
      dateOfBirth: input.date_of_birth ?? null,
      weight: input.weight != null ? String(input.weight) : null,
      weightUnit: input.weight_unit ?? "kg",
      count: input.count ?? null,
      lot: input.lot ?? null,
      barn: input.barn ?? null,
      room: input.room ?? null,
      type: input.type ?? null,
      status: input.status ?? "healthy",
      motherId: input.mother_id ?? null,
      fatherId: input.father_id ?? null,
      estimatedValue: input.estimated_value != null ? String(input.estimated_value) : null,
      lastEvent: input.last_event ?? null,
    });
    const id = Number(result.insertId);
    await this.publishFarmosUpdate("createAnimal", ["animals"], "created", id, orgId);
    return this.getAnimal(id, orgId);
  }

  // Import en masse depuis un CSV mappé côté client (COMP-P1-001).
  // - validation ligne par ligne (espèce requise/valide)
  // - détection des doublons par external_id : dans le fichier ET contre la DB
  // - dryRun : valide et compte sans rien écrire (import test)
  async importAnimals(input: ImportAnimalsDto, orgId: number) {
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const validSpecies = new Set(FARMOS_SPECIES as unknown as string[]);

    // external_id déjà présents en base pour cet org (animaux actifs).
    const existing = await this.db
      .select({ externalId: farmosAnimals.externalId })
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.organizationId, orgId), eq(farmosAnimals.isActive, 1)));
    const existingExtIds = new Set(
      existing.map((r) => (r.externalId ?? "").trim().toLowerCase()).filter((v) => v),
    );

    const errors: { line: number; field: string; message: string }[] = [];
    const seenInFile = new Set<string>();
    const toInsert: { line: number; values: any }[] = [];
    let duplicates = 0;

    rows.forEach((row, idx) => {
      const line = idx + 1;
      const species = (row.species ?? "").toString().trim();
      if (!species) {
        errors.push({ line, field: "species", message: "Espèce requise." });
        return;
      }
      if (!validSpecies.has(species)) {
        errors.push({ line, field: "species", message: `Espèce invalide : ${species}.` });
        return;
      }
      const extId = (row.external_id ?? "").toString().trim();
      const extKey = extId.toLowerCase();
      if (extKey) {
        if (existingExtIds.has(extKey) || seenInFile.has(extKey)) {
          duplicates += 1;
          return; // doublon ignoré (pas une erreur bloquante)
        }
        seenInFile.add(extKey);
      }
      toInsert.push({
        line,
        values: {
          organizationId: orgId,
          externalId: extId || null,
          name: row.name ?? null,
          species,
          race: row.race ?? null,
          sex: row.sex ?? null,
          dateOfBirth: row.date_of_birth ?? null,
          weight: row.weight != null ? String(row.weight) : null,
          weightUnit: row.weight_unit ?? "kg",
          count: row.count ?? null,
          lot: row.lot ?? null,
          barn: row.barn ?? null,
          room: row.room ?? null,
          type: row.type ?? null,
          status: row.status ?? "healthy",
          motherId: row.mother_id ?? null,
          fatherId: row.father_id ?? null,
          estimatedValue: row.estimated_value != null ? String(row.estimated_value) : null,
          lastEvent: row.last_event ?? null,
        },
      });
    });

    if (input.dryRun) {
      return { dryRun: true, total: rows.length, inserted: toInsert.length, duplicates, errors };
    }

    let inserted = 0;
    for (const item of toInsert) {
      try {
        await this.db.insert(farmosAnimals).values(item.values);
        inserted += 1;
      } catch (e) {
        errors.push({ line: item.line, field: "_row", message: "Insertion échouée." });
      }
    }
    if (inserted > 0) {
      await this.publishFarmosUpdate("importAnimals", ["animals"], "created", 0, orgId);
    }
    return { dryRun: false, total: rows.length, inserted, duplicates, errors };
  }

  async updateAnimal(id: number, input: UpdateAnimalDto, orgId: number) {
    const current = await this.getAnimal(id, orgId);
    this.assertAnimalWritable(current);
    const patch: Record<string, unknown> = {};
    if (input.external_id !== undefined) patch.externalId = input.external_id;
    if (input.name !== undefined) patch.name = input.name;
    if (input.species !== undefined) patch.species = input.species;
    if (input.race !== undefined) patch.race = input.race;
    if (input.sex !== undefined) patch.sex = input.sex;
    if (input.date_of_birth !== undefined) patch.dateOfBirth = input.date_of_birth;
    if (input.weight !== undefined) patch.weight = input.weight != null ? String(input.weight) : null;
    if (input.weight_unit !== undefined) patch.weightUnit = input.weight_unit;
    if (input.count !== undefined) patch.count = input.count;
    if (input.lot !== undefined) patch.lot = input.lot;
    if (input.barn !== undefined) patch.barn = input.barn;
    if (input.room !== undefined) patch.room = input.room;
    if (input.type !== undefined) patch.type = input.type;
    if (input.status !== undefined) patch.status = input.status;
    if (input.mother_id !== undefined) patch.motherId = input.mother_id;
    if (input.father_id !== undefined) patch.fatherId = input.father_id;
    if (input.estimated_value !== undefined) patch.estimatedValue = input.estimated_value != null ? String(input.estimated_value) : null;
    if (input.last_event !== undefined) patch.lastEvent = input.last_event;
    if (Object.keys(patch).length === 0) return this.getAnimal(id, orgId);
    await this.db.update(farmosAnimals).set(patch).where(eq(farmosAnimals.id, id));
    await this.publishFarmosUpdate("updateAnimal", ["animals"], "updated", id, orgId);
    return this.getAnimal(id, orgId);
  }

  async deleteAnimal(id: number, orgId: number) {
    const current = await this.getAnimal(id, orgId);
    this.assertAnimalWritable(current);
    await this.db.update(farmosAnimals).set({ isActive: 0 }).where(eq(farmosAnimals.id, id));
    // Cascade soft-delete : les traitements de l'animal supprime ne doivent plus
    // apparaitre (sinon ils remontent en mode "Tout" sans animal de reference).
    await this.db
      .update(farmosTreatments)
      .set({ isActive: 0 })
      .where(and(eq(farmosTreatments.animalId, id), eq(farmosTreatments.organizationId, orgId)));
    await this.publishFarmosUpdate("deleteAnimal", ["animals"], "deleted", id, orgId);
    return { message: "Animal supprimé." };
  }

  // ─── Medicines ───────────────────────────────────────────────────────────

  async listMedicines(orgId: number) {
    return this.db
      .select()
      .from(farmosMedicines)
      .where(and(eq(farmosMedicines.organizationId, orgId), eq(farmosMedicines.isActive, 1)))
      .orderBy(desc(farmosMedicines.id));
  }

  async getMedicine(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosMedicines)
      .where(and(eq(farmosMedicines.id, id), eq(farmosMedicines.organizationId, orgId)))
      .limit(1);
    if (!row) throw new NotFoundException("Medicine not found.");
    return row;
  }

  async createMedicine(input: CreateMedicineDto, orgId: number) {
    const [result] = await this.db.insert(farmosMedicines).values({
      organizationId: orgId,
      name: input.name,
      kind: input.kind ?? "med",
      quantity: String(input.quantity),
      unit: input.unit ?? null,
      minQuantity: input.min_quantity != null ? String(input.min_quantity) : null,
      supplier: input.supplier ?? null,
      supplierId: input.supplier_id ?? null,
      expiryDate: input.expiry_date ?? null,
      notes: input.notes ?? null,
      species: Array.isArray(input.species) && input.species.length ? input.species : null,
    });
    const id = Number(result.insertId);
    await this.publishFarmosUpdate("createMedicine", ["medicines"], "created", id, orgId);
    return this.getMedicine(id, orgId);
  }

  async updateMedicine(id: number, input: UpdateMedicineDto, orgId: number) {
    await this.getMedicine(id, orgId);
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.kind !== undefined) patch.kind = input.kind;
    if (input.quantity !== undefined) patch.quantity = String(input.quantity);
    if (input.unit !== undefined) patch.unit = input.unit;
    if (input.min_quantity !== undefined) patch.minQuantity = input.min_quantity != null ? String(input.min_quantity) : null;
    if (input.supplier !== undefined) patch.supplier = input.supplier;
    if (input.supplier_id !== undefined) patch.supplierId = input.supplier_id;
    if (input.expiry_date !== undefined) patch.expiryDate = input.expiry_date;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.species !== undefined) patch.species = Array.isArray(input.species) && input.species.length ? input.species : null;
    if (Object.keys(patch).length === 0) return this.getMedicine(id, orgId);
    await this.db.update(farmosMedicines).set(patch).where(eq(farmosMedicines.id, id));
    await this.publishFarmosUpdate("updateMedicine", ["medicines"], "updated", id, orgId);
    return this.getMedicine(id, orgId);
  }

  async listFeedForecasts(orgId: number) {
    return this.db
      .select()
      .from(farmosFeedForecasts)
      .where(and(eq(farmosFeedForecasts.organizationId, orgId), eq(farmosFeedForecasts.isActive, 1)))
      .orderBy(desc(farmosFeedForecasts.urgent), desc(farmosFeedForecasts.neededKg));
  }

  async consumeMedicine(id: number, quantity: number, orgId: number) {
    if (!(quantity > 0)) throw new BadRequestException("Quantity must be > 0.");
    const med = await this.getMedicine(id, orgId);
    const current = Number(med.quantity || 0);
    const next = Math.max(0, current - quantity);
    await this.db.update(farmosMedicines).set({ quantity: String(next) }).where(eq(farmosMedicines.id, id));
    await this.publishFarmosUpdate("consumeMedicine", ["medicines"], "updated", id, orgId);
    return { id, previousQuantity: current, newQuantity: next, consumed: current - next };
  }

  async deleteMedicine(id: number, orgId: number) {
    await this.getMedicine(id, orgId);
    await this.db.update(farmosMedicines).set({ isActive: 0 }).where(eq(farmosMedicines.id, id));
    await this.publishFarmosUpdate("deleteMedicine", ["medicines"], "deleted", id, orgId);
    return { message: "Médicament supprimé." };
  }

  // ─── Treatments ──────────────────────────────────────────────────────────

  async listTreatments(orgId: number) {
    // LEFT JOIN sur l'animal (sans filtre isActive) pour conserver l'espece et
    // le nom meme quand l'animal lie a ete soft-delete (vendu/mort) : sinon le
    // frontend recoit species=null et plante en mode "Tout".
    const rows = await this.db
      .select({
        treatment: farmosTreatments,
        animalSpecies: farmosAnimals.species,
        animalName: farmosAnimals.name,
        animalExternalId: farmosAnimals.externalId,
        animalStatus: farmosAnimals.status,
      })
      .from(farmosTreatments)
      .leftJoin(farmosAnimals, eq(farmosTreatments.animalId, farmosAnimals.id))
      .where(and(eq(farmosTreatments.organizationId, orgId), eq(farmosTreatments.isActive, 1)))
      .orderBy(desc(farmosTreatments.id));
    return rows.map((r) => ({
      ...r.treatment,
      animalSpecies: r.animalSpecies ?? null,
      animalName: r.animalName ?? null,
      animalExternalId: r.animalExternalId ?? null,
      animalStatus: r.animalStatus ?? null,
    }));
  }

  async getTreatment(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosTreatments)
      .where(and(eq(farmosTreatments.id, id), eq(farmosTreatments.organizationId, orgId)))
      .limit(1);
    if (!row) throw new NotFoundException("Treatment not found.");
    return row;
  }

  async createTreatment(input: CreateTreatmentDto, orgId: number) {
    // ensure animal belongs to the same organization
    const [animal] = await this.db
      .select({ id: farmosAnimals.id, species: farmosAnimals.species, status: farmosAnimals.status })
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.id, input.animal_id), eq(farmosAnimals.organizationId, orgId)))
      .limit(1);
    if (!animal) throw new NotFoundException("Animal not found.");
    this.assertAnimalWritable(animal);

    // disease must exist either in global catalogue or in the same organization
    const [disease] = await this.db
      .select({ id: farmosDiseases.id, species: farmosDiseases.species })
      .from(farmosDiseases)
      .where(
        and(
          eq(farmosDiseases.id, input.disease_id),
          or(isNull(farmosDiseases.organizationId), eq(farmosDiseases.organizationId, orgId)),
        ),
      )
      .limit(1);
    if (!disease) throw new NotFoundException("Disease not found.");
    if (disease.species !== animal.species) {
      throw new BadRequestException(`Disease species mismatch (animal=${animal.species}, disease=${disease.species}).`);
    }

    const [result] = await this.db.insert(farmosTreatments).values({
      organizationId: orgId,
      animalId: input.animal_id,
      diseaseId: input.disease_id,
      medicineId: input.medicine_id ?? null,
      medicineName: input.medicine_name ?? null,
      dosage: input.dosage ?? null,
      route: input.route ?? null,
      startDate: input.start_date ?? null,
      endDate: input.end_date ?? null,
      vet: input.vet ?? null,
      withdrawalMeatDays: input.withdrawal_meat_days ?? null,
      withdrawalMilkHours: input.withdrawal_milk_hours ?? null,
      withdrawalEggsDays: input.withdrawal_eggs_days ?? null,
      status: input.status ?? "running",
      notes: input.notes ?? null,
    });
    const id = Number(result.insertId);
    // Associer le médicament au stock : si le traitement référence un médicament
    // du stock + une quantité consommée, on décrémente le stock (prompt #275).
    if (input.medicine_id && Number(input.medicine_quantity) > 0) {
      await this.consumeMedicine(input.medicine_id, Number(input.medicine_quantity), orgId).catch((e) =>
        console.warn("[FarmOS] consume on treatment failed:", (e as Error).message));
    }
    await this.recomputeAnimalWithdrawal(input.animal_id, orgId);
    await this.publishFarmosUpdate("createTreatment", ["treatments", "medicines", "animals"], "created", id, orgId);
    return this.getTreatment(id, orgId);
  }

  async updateTreatment(id: number, input: UpdateTreatmentDto, orgId: number) {
    const previous = await this.getTreatment(id, orgId);
    await this.assertAnimalWritableById(Number(previous.animalId), orgId);
    if (input.animal_id !== undefined && Number(input.animal_id) !== Number(previous.animalId)) {
      await this.assertAnimalWritableById(Number(input.animal_id), orgId);
    }
    const patch: Record<string, unknown> = {};
    if (input.animal_id !== undefined) patch.animalId = input.animal_id;
    if (input.disease_id !== undefined) patch.diseaseId = input.disease_id;
    if (input.medicine_id !== undefined) patch.medicineId = input.medicine_id;
    if (input.medicine_name !== undefined) patch.medicineName = input.medicine_name;
    if (input.dosage !== undefined) patch.dosage = input.dosage;
    if (input.route !== undefined) patch.route = input.route;
    if (input.start_date !== undefined) patch.startDate = input.start_date;
    if (input.end_date !== undefined) patch.endDate = input.end_date;
    if (input.vet !== undefined) patch.vet = input.vet;
    if (input.withdrawal_meat_days !== undefined) patch.withdrawalMeatDays = input.withdrawal_meat_days;
    if (input.withdrawal_milk_hours !== undefined) patch.withdrawalMilkHours = input.withdrawal_milk_hours;
    if (input.withdrawal_eggs_days !== undefined) patch.withdrawalEggsDays = input.withdrawal_eggs_days;
    if (input.status !== undefined) patch.status = input.status;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (Object.keys(patch).length === 0) return this.getTreatment(id, orgId);
    await this.db.update(farmosTreatments).set(patch).where(eq(farmosTreatments.id, id));
    await this.recomputeAnimalWithdrawal(Number(previous.animalId), orgId);
    if (input.animal_id !== undefined && Number(input.animal_id) !== Number(previous.animalId)) {
      await this.recomputeAnimalWithdrawal(Number(input.animal_id), orgId);
    }
    await this.publishFarmosUpdate("updateTreatment", ["treatments", "medicines", "animals"], "updated", id, orgId);
    return this.getTreatment(id, orgId);
  }

  async deleteTreatment(id: number, orgId: number) {
    const previous = await this.getTreatment(id, orgId);
    await this.assertAnimalWritableById(Number(previous.animalId), orgId);
    await this.db.update(farmosTreatments).set({ isActive: 0 }).where(eq(farmosTreatments.id, id));
    await this.recomputeAnimalWithdrawal(Number(previous.animalId), orgId);
    await this.publishFarmosUpdate("deleteTreatment", ["treatments", "animals"], "deleted", id, orgId);
    return { message: "Traitement supprimé." };
  }

  // ─── Diseases (catalogue : global + par organisation) ────────────────────

  async listDiseases(orgId: number, species?: string) {
    const conditions = [
      eq(farmosDiseases.isActive, 1),
      or(isNull(farmosDiseases.organizationId), eq(farmosDiseases.organizationId, orgId)),
    ];
    if (species) conditions.push(eq(farmosDiseases.species, species));
    return this.db
      .select()
      .from(farmosDiseases)
      .where(and(...conditions))
      .orderBy(farmosDiseases.species, farmosDiseases.nameFr);
  }

  async getDisease(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosDiseases)
      .where(
        and(
          eq(farmosDiseases.id, id),
          or(isNull(farmosDiseases.organizationId), eq(farmosDiseases.organizationId, orgId)),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Disease not found.");
    return row;
  }

  async createDisease(input: CreateDiseaseDto, orgId: number) {
    const [result] = await this.db.insert(farmosDiseases).values({
      organizationId: orgId,
      species: input.species,
      nameFr: input.name_fr,
      nameEn: input.name_en ?? null,
      contagious: input.contagious ? 1 : 0,
      severityDefault: input.severity_default ?? null,
      commonRoute: input.common_route ?? null,
      urgencyLevel: input.urgency_level ?? null,
      symptoms: input.symptoms ?? null,
      prevention: input.prevention ?? null,
      vaccineAvailable: input.vaccine_available ? 1 : 0,
      mortalityRisk: input.mortality_risk ?? null,
      recommendedProtocol: input.recommended_protocol ?? null,
      possibleCauses: input.possible_causes ?? null,
      recommendedExams: input.recommended_exams ?? null,
      notes: input.notes ?? null,
    });
    const id = Number(result.insertId);
    await this.publishFarmosUpdate("createDisease", ["diseases"], "created", id, orgId);
    return this.getDisease(id, orgId);
  }

  async updateDisease(id: number, input: UpdateDiseaseDto, orgId: number) {
    const disease = await this.getDisease(id, orgId);
    if (disease.organizationId === null) {
      throw new BadRequestException("Cannot edit a disease from the global catalogue.");
    }
    const patch: Record<string, unknown> = {};
    if (input.species !== undefined) patch.species = input.species;
    if (input.name_fr !== undefined) patch.nameFr = input.name_fr;
    if (input.name_en !== undefined) patch.nameEn = input.name_en;
    if (input.contagious !== undefined) patch.contagious = input.contagious ? 1 : 0;
    if (input.severity_default !== undefined) patch.severityDefault = input.severity_default;
    if (input.common_route !== undefined) patch.commonRoute = input.common_route;
    if (input.urgency_level !== undefined) patch.urgencyLevel = input.urgency_level;
    if (input.symptoms !== undefined) patch.symptoms = input.symptoms;
    if (input.prevention !== undefined) patch.prevention = input.prevention;
    if (input.vaccine_available !== undefined) patch.vaccineAvailable = input.vaccine_available ? 1 : 0;
    if (input.mortality_risk !== undefined) patch.mortalityRisk = input.mortality_risk;
    if (input.recommended_protocol !== undefined) patch.recommendedProtocol = input.recommended_protocol;
    if (input.possible_causes !== undefined) patch.possibleCauses = input.possible_causes;
    if (input.recommended_exams !== undefined) patch.recommendedExams = input.recommended_exams;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (Object.keys(patch).length === 0) return disease;
    await this.db.update(farmosDiseases).set(patch).where(eq(farmosDiseases.id, id));
    await this.publishFarmosUpdate("updateDisease", ["diseases"], "updated", id, orgId);
    return this.getDisease(id, orgId);
  }

  async deleteDisease(id: number, orgId: number) {
    const disease = await this.getDisease(id, orgId);
    if (disease.organizationId === null) {
      throw new BadRequestException("Cannot delete a disease from the global catalogue.");
    }
    await this.db.update(farmosDiseases).set({ isActive: 0 }).where(eq(farmosDiseases.id, id));
    await this.publishFarmosUpdate("deleteDisease", ["diseases"], "deleted", id, orgId);
    return { message: "Maladie supprimée." };
  }

  // ─── Reproduction events ───────────────────────────────────────────────

  async listReproductionEvents(orgId: number) {
    return this.db
      .select()
      .from(farmosReproductionEvents)
      .where(and(eq(farmosReproductionEvents.organizationId, orgId), eq(farmosReproductionEvents.isActive, 1)))
      .orderBy(desc(farmosReproductionEvents.eventDate));
  }

  // ─── Sales & expenses (read-only for now) ───────────────────────────────

  async listSales(orgId: number) {
    return this.db
      .select()
      .from(farmosSales)
      .where(and(eq(farmosSales.organizationId, orgId), eq(farmosSales.isActive, 1)))
      .orderBy(desc(farmosSales.saleDate));
  }

  async listExpenses(orgId: number) {
    return this.db
      .select()
      .from(farmosExpenses)
      .where(and(eq(farmosExpenses.organizationId, orgId), eq(farmosExpenses.isActive, 1)))
      .orderBy(desc(farmosExpenses.expenseDate));
  }

  async createSale(input: CreateSaleDto, orgId: number) {
    const animal = input.animal_id ? await this.getAnimal(input.animal_id, orgId) : null;
    if (!animal) {
      await this.assertProductionSaleAvailable(input, orgId);
    } else {
      this.assertNotUnderMeatWithdrawal(animal);
      this.assertAnimalSaleAvailable(animal, input);
    }
    const [res] = await this.db.insert(farmosSales).values({
      organizationId: orgId,
      animalId: input.animal_id ?? null,
      species: input.species ?? animal?.species ?? null,
      productType: input.product_type ?? (animal ? "animal" : null),
      quantity: String(input.quantity),
      unit: input.unit ?? null,
      unitPrice: input.unit_price != null ? String(input.unit_price) : null,
      totalAmount: String(input.total_amount),
      currencyId: input.currency_id ?? null,
      buyer: input.buyer ?? null,
      saleDate: input.sale_date,
      notes: input.notes ?? null,
    }).$returningId();
    // Auto-sync to CRM ledger (SCRUM-220)
    const txId = await this.syncSaleToTransaction(res.id, input, orgId);
    if (txId) {
      await this.db.update(farmosSales).set({ transactionId: txId }).where(eq(farmosSales.id, res.id));
    }
    if (animal) {
      await this.applyAnimalSale(animal, input, orgId);
    }
    await this.publishFarmosUpdate("createSale", ["sales", "animals"], "created", res.id, orgId);
    return { id: res.id, transactionId: txId };
  }

  // Bloque la vente d'un animal (= abattage/viande) encore sous délai de retrait viande.
  private assertNotUnderMeatWithdrawal(animal: any) {
    const until = animal.withdrawalUntil ?? animal.withdrawal_until;
    const kind = animal.withdrawalKind ?? animal.withdrawal_kind;
    if (!until) return;
    const today = new Date().toISOString().slice(0, 10);
    if (String(until).slice(0, 10) >= today && (kind == null || kind === "meat")) {
      throw new BadRequestException(
        `Animal sous délai de retrait viande jusqu'au ${String(until).slice(0, 10)} — vente interdite (sécurité alimentaire).`,
      );
    }
  }

  private async applyAnimalSale(animal: any, input: CreateSaleDto, orgId: number) {
    const quantity = Number(input.quantity);
    const soldQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const currentCount = Number(animal.count ?? 0);
    if (this.isWeightSaleUnit(input.unit)) {
      await this.db
        .update(farmosAnimals)
        .set({ count: currentCount > 0 ? 0 : animal.count, status: "sold" })
        .where(and(eq(farmosAnimals.id, animal.id), eq(farmosAnimals.organizationId, orgId)));
      return;
    }
    if (currentCount > soldQty) {
      await this.db
        .update(farmosAnimals)
        .set({ count: Math.max(0, currentCount - soldQty), status: "available_sale" })
        .where(and(eq(farmosAnimals.id, animal.id), eq(farmosAnimals.organizationId, orgId)));
      return;
    }
    await this.db
      .update(farmosAnimals)
      .set({ count: currentCount > 0 ? 0 : animal.count, status: "sold" })
      .where(and(eq(farmosAnimals.id, animal.id), eq(farmosAnimals.organizationId, orgId)));
  }

  private assertAnimalSaleAvailable(animal: any, input: CreateSaleDto) {
    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new BadRequestException("Quantite vendue requise.");
    }
    if (this.isWeightSaleUnit(input.unit)) {
      const maxWeight = this.weightInSaleUnit(animal.weight, animal.weightUnit ?? animal.weight_unit ?? "kg", input.unit);
      if (maxWeight == null || maxWeight <= 0) {
        throw new BadRequestException("Poids actuel requis pour vendre cet animal au poids.");
      }
      if (qty > maxWeight + 0.000001) {
        throw new BadRequestException(`Quantite superieure au poids actuel. Maximum: ${this.formatQuantity(maxWeight)} ${input.unit ?? "kg"}.`);
      }
      return;
    }
    if (this.normalizeSaleUnit(input.unit) !== "lot") {
      const currentCount = Number(animal.count ?? 0);
      const maxCount = currentCount > 0 ? currentCount : 1;
      if (qty > maxCount + 0.000001) {
        throw new BadRequestException(`Quantite superieure au disponible. Maximum: ${this.formatQuantity(maxCount)} ${input.unit ?? ""}.`);
      }
    }
  }

  private async assertProductionSaleAvailable(input: CreateSaleDto, orgId: number) {
    const productType = input.product_type;
    if (!productType || !["eggs", "milk", "meat", "wool", "fish"].includes(productType)) return;

    const targetUnit = this.normalizeSaleUnit(input.unit);
    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || qty <= 0) return;

    const logConditions = [
      eq(farmosProductionLogs.organizationId, orgId),
      eq(farmosProductionLogs.isActive, 1),
      eq(farmosProductionLogs.productType, productType),
    ];
    if (input.species) logConditions.push(eq(farmosProductionLogs.species, input.species));

    const saleConditions = [
      eq(farmosSales.organizationId, orgId),
      eq(farmosSales.isActive, 1),
      eq(farmosSales.productType, productType),
      isNull(farmosSales.animalId),
    ];
    if (input.species) saleConditions.push(eq(farmosSales.species, input.species));

    const [logs, sales] = await Promise.all([
      this.db.select({ quantity: farmosProductionLogs.quantity, unit: farmosProductionLogs.unit }).from(farmosProductionLogs).where(and(...logConditions)),
      this.db.select({ quantity: farmosSales.quantity, unit: farmosSales.unit }).from(farmosSales).where(and(...saleConditions)),
    ]);

    const matchesUnit = (unit: string | null | undefined) => !targetUnit || this.normalizeSaleUnit(unit) === targetUnit;
    const produced = logs.filter((row) => matchesUnit(row.unit)).reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const sold = sales.filter((row) => matchesUnit(row.unit)).reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const available = Math.max(0, produced - sold);

    if (qty > available) {
      throw new BadRequestException(`Quantite disponible insuffisante. Disponible: ${available}.`);
    }
  }

  private normalizeSaleUnit(unit: string | null | undefined) {
    return String(unit || "")
      .trim()
      .toLowerCase()
      .replaceAll("œ", "oe")
      .replaceAll("å“", "oe");
  }

  private isWeightSaleUnit(unit: string | null | undefined) {
    return ["kg", "kilo", "kilos", "kilogram", "kilograms", "kilogramme", "kilogrammes", "g", "gram", "grams", "gramme", "grammes", "lb", "lbs", "livre", "livres", "t", "tonne", "tonnes"].includes(this.normalizeSaleUnit(unit));
  }

  private weightAsKg(weight: unknown, unit: string | null | undefined) {
    const value = Number(weight);
    if (!Number.isFinite(value) || value <= 0) return null;
    const normalized = this.normalizeSaleUnit(unit || "kg");
    if (["g", "gram", "grams", "gramme", "grammes"].includes(normalized)) return value / 1000;
    if (["lb", "lbs", "livre", "livres"].includes(normalized)) return value * 0.45359237;
    if (["t", "tonne", "tonnes"].includes(normalized)) return value * 1000;
    return value;
  }

  private weightInSaleUnit(weight: unknown, fromUnit: string | null | undefined, saleUnit: string | null | undefined) {
    const kg = this.weightAsKg(weight, fromUnit);
    if (kg == null) return null;
    const normalized = this.normalizeSaleUnit(saleUnit || "kg");
    if (["g", "gram", "grams", "gramme", "grammes"].includes(normalized)) return kg * 1000;
    if (["lb", "lbs", "livre", "livres"].includes(normalized)) return kg / 0.45359237;
    if (["t", "tonne", "tonnes"].includes(normalized)) return kg / 1000;
    return kg;
  }

  private formatQuantity(value: number) {
    return Number(value.toFixed(2)).toString();
  }

  async deleteSale(id: number, orgId: number) {
    const [row] = await this.db.select().from(farmosSales).where(and(eq(farmosSales.id, id), eq(farmosSales.organizationId, orgId))).limit(1);
    if (row?.animalId != null) {
      await this.assertAnimalWritableById(Number(row.animalId), orgId);
    }
    await this.db.update(farmosSales).set({ isActive: 0 }).where(and(eq(farmosSales.id, id), eq(farmosSales.organizationId, orgId)));
    if (row?.transactionId) {
      await this.db.update(transactions).set({ status: "false" }).where(eq(transactions.id, row.transactionId));
    }
    await this.publishFarmosUpdate("deleteSale", ["sales"], "deleted", id, orgId);
    return { message: "Vente supprimée." };
  }

  async createExpense(input: CreateExpenseDto, orgId: number) {
    if (input.related_animal_id != null) {
      await this.assertAnimalWritableById(Number(input.related_animal_id), orgId);
    }
    const [res] = await this.db.insert(farmosExpenses).values({
      organizationId: orgId,
      category: input.category,
      description: input.description ?? null,
      quantity: input.quantity != null ? String(input.quantity) : null,
      unit: input.unit ?? null,
      amount: String(input.amount),
      currencyId: input.currency_id ?? null,
      supplier: input.supplier ?? null,
      expenseDate: input.expense_date,
      relatedAnimalId: input.related_animal_id ?? null,
      relatedMedicineId: input.related_medicine_id ?? null,
      projectId: input.project_id ?? null,
      notes: input.notes ?? null,
    }).$returningId();
    // Stock-in : si la dépense est liée à un médicament/aliment et porte une
    // quantité, on incrémente l'inventaire. Sinon le stock affiché reste figé.
    if (input.related_medicine_id && input.quantity != null && Number(input.quantity) > 0) {
      const [med] = await this.db
        .select({ id: farmosMedicines.id, quantity: farmosMedicines.quantity })
        .from(farmosMedicines)
        .where(and(eq(farmosMedicines.id, input.related_medicine_id), eq(farmosMedicines.organizationId, orgId)))
        .limit(1);
      if (med) {
        const newQty = Number(med.quantity || 0) + Number(input.quantity);
        await this.db
          .update(farmosMedicines)
          .set({ quantity: String(newQty) })
          .where(eq(farmosMedicines.id, med.id));
      }
    }
    // Auto-sync to CRM ledger (SCRUM-220)
    const txId = await this.syncExpenseToTransaction(res.id, input, orgId);
    if (txId) {
      await this.db.update(farmosExpenses).set({ transactionId: txId }).where(eq(farmosExpenses.id, res.id));
    }
    // Soumet au circuit d'approbation (effectif seulement si un workflow exp_approval existe
    // et que le module est sous gate ; sinon no-op et la compta a deja eu lieu).
    await this.submitExpenseForApproval(res.id, orgId);
    await this.publishFarmosUpdate("createExpense", ["expenses", "medicines"], "created", res.id, orgId);
    return { id: res.id, transactionId: txId };
  }

  async deleteExpense(id: number, orgId: number) {
    const [row] = await this.db.select().from(farmosExpenses).where(and(eq(farmosExpenses.id, id), eq(farmosExpenses.organizationId, orgId))).limit(1);
    if (row?.relatedAnimalId != null) {
      await this.assertAnimalWritableById(Number(row.relatedAnimalId), orgId);
    }
    await this.db.update(farmosExpenses).set({ isActive: 0 }).where(and(eq(farmosExpenses.id, id), eq(farmosExpenses.organizationId, orgId)));
    if (row?.transactionId) {
      await this.db.update(transactions).set({ status: "false" }).where(eq(transactions.id, row.transactionId));
    }
    await this.publishFarmosUpdate("deleteExpense", ["expenses"], "deleted", id, orgId);
    return { message: "Dépense supprimée." };
  }

  async createReproductionEvent(input: CreateReproductionEventDto, orgId: number) {
    // Validate the animal belongs to the organisation.
    const [a] = await this.db.select().from(farmosAnimals).where(and(eq(farmosAnimals.id, input.animal_id), eq(farmosAnimals.organizationId, orgId))).limit(1);
    if (!a) throw new NotFoundException("Animal not found in this organisation.");
    this.assertAnimalWritable(a);

    const breedingType = (input.breeding_type ?? "unknown");

    // Si IA: vérifie la paillette + décrémente le stock.
    if (input.sire_straw_id) {
      const [straw] = await this.db.select().from(farmosSemenStraws)
        .where(and(eq(farmosSemenStraws.id, input.sire_straw_id), eq(farmosSemenStraws.organizationId, orgId)))
        .limit(1);
      if (!straw) throw new NotFoundException("Paillette introuvable.");
      if (straw.species !== a.species) {
        throw new BadRequestException(`Espèce de la paillette (${straw.species}) ne correspond pas à la femelle (${a.species}).`);
      }
      if (straw.strawsRemaining <= 0) throw new BadRequestException("Stock paillettes épuisé.");
      await this.db.update(farmosSemenStraws)
        .set({ strawsRemaining: straw.strawsRemaining - 1 })
        .where(eq(farmosSemenStraws.id, straw.id));
    }
    // Si saillie naturelle: vérifie que le mâle existe et est compatible.
    if (input.sire_animal_id) {
      const [sire] = await this.db.select().from(farmosAnimals)
        .where(and(eq(farmosAnimals.id, input.sire_animal_id), eq(farmosAnimals.organizationId, orgId)))
        .limit(1);
      if (!sire) throw new NotFoundException("Mâle introuvable.");
      if (sire.sex !== "M") throw new BadRequestException("L'animal sélectionné comme père doit avoir sex=M.");
      if (sire.species !== a.species) {
        throw new BadRequestException(`Espèce du mâle (${sire.species}) ne correspond pas à la femelle (${a.species}).`);
      }
    }

    const [res] = await this.db.insert(farmosReproductionEvents).values({
      organizationId: orgId,
      animalId: input.animal_id,
      eventType: input.event_type,
      eventDate: input.event_date,
      partnerExternalId: input.partner_external_id ?? null,
      expectedDueDate: input.expected_due_date ?? null,
      offspringCount: input.offspring_count ?? null,
      outcome: input.outcome ?? null,
      notes: input.notes ?? null,
      breedingType,
      sireStrawId: input.sire_straw_id ?? null,
      sireAnimalId: input.sire_animal_id ?? null,
    }).$returningId();
    await this.publishFarmosUpdate("createReproductionEvent", ["reproductionEvents", "semenStraws"], "created", res.id, orgId);
    return { id: res.id };
  }

  async deleteReproductionEvent(id: number, orgId: number) {
    const [previous] = await this.db.select().from(farmosReproductionEvents).where(and(eq(farmosReproductionEvents.id, id), eq(farmosReproductionEvents.organizationId, orgId))).limit(1);
    if (!previous) throw new NotFoundException("Reproduction event not found.");
    await this.assertAnimalWritableById(Number(previous.animalId), orgId);
    await this.db.update(farmosReproductionEvents).set({ isActive: 0 }).where(and(eq(farmosReproductionEvents.id, id), eq(farmosReproductionEvents.organizationId, orgId)));
    await this.publishFarmosUpdate("deleteReproductionEvent", ["reproductionEvents"], "deleted", id, orgId);
    return { message: "Événement supprimé." };
  }

  // ─── Semen straws (banque IA) ────────────────────────────────────────────

  async listSemenStraws(orgId: number, species?: string | null) {
    const conds = [eq(farmosSemenStraws.organizationId, orgId), eq(farmosSemenStraws.status, "active")];
    if (species) conds.push(eq(farmosSemenStraws.species, species));
    return this.db
      .select({
        id: farmosSemenStraws.id,
        code: farmosSemenStraws.code,
        sireName: farmosSemenStraws.sireName,
        sireRegistration: farmosSemenStraws.sireRegistration,
        species: farmosSemenStraws.species,
        breed: farmosSemenStraws.breed,
        country: farmosSemenStraws.country,
        region: farmosSemenStraws.region,
        supplierId: farmosSemenStraws.supplierId,
        supplierName: suppliers.name,
        collectionCenter: farmosSemenStraws.collectionCenter,
        collectionDate: farmosSemenStraws.collectionDate,
        batchNumber: farmosSemenStraws.batchNumber,
        motilityPct: farmosSemenStraws.motilityPct,
        concentrationMillionPerMl: farmosSemenStraws.concentrationMillionPerMl,
        strawsPerDose: farmosSemenStraws.strawsPerDose,
        geneticTraits: farmosSemenStraws.geneticTraits,
        notes: farmosSemenStraws.notes,
        strawsTotal: farmosSemenStraws.strawsTotal,
        strawsRemaining: farmosSemenStraws.strawsRemaining,
        tankLocation: farmosSemenStraws.tankLocation,
        pricePerDose: farmosSemenStraws.pricePerDose,
        currencyId: farmosSemenStraws.currencyId,
        status: farmosSemenStraws.status,
      })
      .from(farmosSemenStraws)
      .leftJoin(suppliers, eq(farmosSemenStraws.supplierId, suppliers.id))
      .where(and(...conds))
      .orderBy(farmosSemenStraws.sireName);
  }

  async getSemenStraw(id: number, orgId: number) {
    const rows = await this.listSemenStraws(orgId, null);
    const row = rows.find((r) => r.id === id);
    if (!row) throw new NotFoundException("Paillette introuvable.");
    // Historique d'utilisation (events repro) + taux réussite.
    const events = await this.db.select()
      .from(farmosReproductionEvents)
      .where(and(eq(farmosReproductionEvents.sireStrawId, id), eq(farmosReproductionEvents.organizationId, orgId)))
      .orderBy(desc(farmosReproductionEvents.eventDate));
    const ai = events.filter((e) => e.eventType === "insemination");
    const ok = ai.filter((e) => e.outcome === "success" || e.outcome === "confirmed" || e.outcome === "pregnant").length;
    const successRate = ai.length > 0 ? Math.round((ok / ai.length) * 100) : null;
    return { ...row, events, successRate, totalUses: ai.length };
  }

  async createSemenStraw(input: CreateSemenStrawDto, orgId: number) {
    const [res] = await this.db.insert(farmosSemenStraws).values({
      organizationId: orgId,
      code: input.code,
      sireName: input.sire_name,
      sireRegistration: input.sire_registration ?? null,
      species: input.species,
      breed: input.breed ?? null,
      country: input.country ?? null,
      region: input.region ?? null,
      supplierId: input.supplier_id ?? null,
      collectionCenter: input.collection_center ?? null,
      collectionDate: input.collection_date ?? null,
      batchNumber: input.batch_number ?? null,
      motilityPct: input.motility_pct ?? null,
      concentrationMillionPerMl: input.concentration_million_per_ml ?? null,
      strawsPerDose: input.straws_per_dose ?? 1,
      geneticTraits: input.genetic_traits ?? null,
      notes: input.notes ?? null,
      strawsTotal: input.straws_total,
      strawsRemaining: input.straws_remaining ?? input.straws_total,
      tankLocation: input.tank_location ?? null,
      pricePerDose: input.price_per_dose != null ? String(input.price_per_dose) : null,
      currencyId: input.currency_id ?? null,
    }).$returningId();
    await this.publishFarmosUpdate("createSemenStraw", ["semenStraws"], "created", res.id, orgId);
    return this.getSemenStraw(Number(res.id), orgId);
  }

  async updateSemenStraw(id: number, input: UpdateSemenStrawDto, orgId: number) {
    const [existing] = await this.db.select().from(farmosSemenStraws)
      .where(and(eq(farmosSemenStraws.id, id), eq(farmosSemenStraws.organizationId, orgId))).limit(1);
    if (!existing) throw new NotFoundException("Paillette introuvable.");
    const patch: Record<string, unknown> = {};
    if (input.sire_name !== undefined) patch.sireName = input.sire_name;
    if (input.sire_registration !== undefined) patch.sireRegistration = input.sire_registration;
    if (input.breed !== undefined) patch.breed = input.breed;
    if (input.country !== undefined) patch.country = input.country;
    if (input.region !== undefined) patch.region = input.region;
    if (input.supplier_id !== undefined) patch.supplierId = input.supplier_id;
    if (input.collection_center !== undefined) patch.collectionCenter = input.collection_center;
    if (input.collection_date !== undefined) patch.collectionDate = input.collection_date;
    if (input.batch_number !== undefined) patch.batchNumber = input.batch_number;
    if (input.motility_pct !== undefined) patch.motilityPct = input.motility_pct;
    if (input.concentration_million_per_ml !== undefined) patch.concentrationMillionPerMl = input.concentration_million_per_ml;
    if (input.straws_per_dose !== undefined) patch.strawsPerDose = input.straws_per_dose;
    if (input.genetic_traits !== undefined) patch.geneticTraits = input.genetic_traits;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.straws_total !== undefined) patch.strawsTotal = input.straws_total;
    if (input.straws_remaining !== undefined) patch.strawsRemaining = input.straws_remaining;
    if (input.tank_location !== undefined) patch.tankLocation = input.tank_location;
    if (input.price_per_dose !== undefined) patch.pricePerDose = input.price_per_dose != null ? String(input.price_per_dose) : null;
    if (input.currency_id !== undefined) patch.currencyId = input.currency_id;
    if (input.status !== undefined) patch.status = input.status;
    if (Object.keys(patch).length > 0) {
      await this.db.update(farmosSemenStraws).set(patch).where(eq(farmosSemenStraws.id, id));
    }
    await this.publishFarmosUpdate("updateSemenStraw", ["semenStraws"], "updated", id, orgId);
    return this.getSemenStraw(id, orgId);
  }

  async deleteSemenStraw(id: number, orgId: number) {
    await this.db.update(farmosSemenStraws).set({ status: "archived" })
      .where(and(eq(farmosSemenStraws.id, id), eq(farmosSemenStraws.organizationId, orgId)));
    await this.publishFarmosUpdate("deleteSemenStraw", ["semenStraws"], "deleted", id, orgId);
    return { message: "Paillette archivée." };
  }

  // Mâles disponibles pour saillie naturelle (filtré par espèce).
  async listBreedingMales(orgId: number, species?: string | null) {
    const conds = [
      eq(farmosAnimals.organizationId, orgId),
      eq(farmosAnimals.isActive, 1),
      eq(farmosAnimals.sex, "M"),
    ];
    if (species) conds.push(eq(farmosAnimals.species, species));
    return this.db.select({
      id: farmosAnimals.id,
      externalId: farmosAnimals.externalId,
      name: farmosAnimals.name,
      species: farmosAnimals.species,
      race: farmosAnimals.race,
      dateOfBirth: farmosAnimals.dateOfBirth,
      status: farmosAnimals.status,
    }).from(farmosAnimals).where(and(...conds)).orderBy(farmosAnimals.name);
  }

  // Suggestion pour pré-remplir le formulaire IA: dernière paillette utilisée
  // avec succès sur cette femelle (mode "history"), sinon la dernière utilisée
  // sur la même race (fallback "breed").
  async suggestBreedingForFemale(animalId: number, orgId: number, mode: "history" | "genetic" = "history") {
    const [female] = await this.db.select().from(farmosAnimals)
      .where(and(eq(farmosAnimals.id, animalId), eq(farmosAnimals.organizationId, orgId))).limit(1);
    if (!female) throw new NotFoundException("Femelle introuvable.");

    if (mode === "history") {
      // 1) Dernière IA réussie sur cette femelle
      const [hit] = await this.db.select().from(farmosReproductionEvents)
        .where(and(
          eq(farmosReproductionEvents.animalId, animalId),
          eq(farmosReproductionEvents.organizationId, orgId),
          eq(farmosReproductionEvents.eventType, "insemination"),
          or(eq(farmosReproductionEvents.outcome, "success"), eq(farmosReproductionEvents.outcome, "confirmed"), eq(farmosReproductionEvents.outcome, "pregnant")),
        ))
        .orderBy(desc(farmosReproductionEvents.eventDate))
        .limit(1);
      if (hit?.sireStrawId) {
        const straw = await this.getSemenStraw(hit.sireStrawId, orgId).catch(() => null);
        if (straw && straw.strawsRemaining > 0) return { reason: "last_success_on_female", straw };
      }
      // 2) Sinon, dernière utilisée sur la même race
      if (female.race) {
        const sameRace = await this.listSemenStraws(orgId, female.species);
        const byBreed = sameRace.find((s) => (s.breed || "").toLowerCase() === female.race!.toLowerCase() && s.strawsRemaining > 0);
        if (byBreed) return { reason: "same_breed", straw: byBreed };
      }
      // 3) Sinon, n'importe quelle paillette de la même espèce avec stock
      const any = await this.listSemenStraws(orgId, female.species);
      const firstAvail = any.find((s) => s.strawsRemaining > 0);
      return firstAvail ? { reason: "same_species", straw: firstAvail } : { reason: "none", straw: null };
    }

    // mode = "genetic": classe par taux de réussite décroissant sur la race.
    const candidates = await this.listSemenStraws(orgId, female.species);
    const scored: Array<{ straw: typeof candidates[number]; score: number }> = [];
    for (const c of candidates) {
      if (c.strawsRemaining <= 0) continue;
      const detail = await this.getSemenStraw(c.id, orgId);
      let score = detail.successRate ?? 50; // neutre si jamais utilisé
      if (female.race && (c.breed || "").toLowerCase() === female.race.toLowerCase()) score += 15;
      if ((c.motilityPct ?? 0) >= 70) score += 5;
      scored.push({ straw: c, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.length > 0
      ? { reason: "genetic_ranked", straw: scored[0].straw, score: scored[0].score }
      : { reason: "none", straw: null };
  }

  // ─── Production logs ────────────────────────────────────────────────────

  async listProductionLogs(orgId: number) {
    return this.db
      .select()
      .from(farmosProductionLogs)
      .where(and(eq(farmosProductionLogs.organizationId, orgId), eq(farmosProductionLogs.isActive, 1)))
      .orderBy(desc(farmosProductionLogs.logDate));
  }

  async getEggStock(orgId: number) {
    const [logs, sales] = await Promise.all([
      this.db.select({ quantity: farmosProductionLogs.quantity, unit: farmosProductionLogs.unit, buildingId: farmosProductionLogs.buildingId, logDate: farmosProductionLogs.logDate })
        .from(farmosProductionLogs)
        .where(and(eq(farmosProductionLogs.organizationId, orgId), eq(farmosProductionLogs.isActive, 1), eq(farmosProductionLogs.productType, "eggs"))),
      this.db.select({ quantity: farmosSales.quantity })
        .from(farmosSales)
        .where(and(eq(farmosSales.organizationId, orgId), eq(farmosSales.isActive, 1), eq(farmosSales.productType, "eggs"), isNull(farmosSales.animalId))),
    ]);
    const produced = logs.reduce((s, r) => s + Number(r.quantity || 0), 0);
    const sold = sales.reduce((s, r) => s + Number(r.quantity || 0), 0);
    const byBuilding: Record<number, number> = {};
    for (const r of logs) {
      if (r.buildingId) byBuilding[r.buildingId] = (byBuilding[r.buildingId] || 0) + Number(r.quantity || 0);
    }
    return { produced, sold, available: Math.max(0, produced - sold), byBuilding };
  }

  async createProductionLog(input: CreateProductionLogDto, orgId: number) {
    if (input.animal_id != null) {
      await this.assertAnimalWritableById(Number(input.animal_id), orgId);
    }
    const [res] = await this.db.insert(farmosProductionLogs).values({
      organizationId: orgId,
      animalId: input.animal_id ?? null,
      buildingId: input.building_id ?? null,
      species: input.species,
      productType: input.product_type,
      logDate: input.log_date,
      period: input.period ?? null,
      quantity: String(input.quantity),
      unit: input.unit ?? null,
      quality: (input.quality ?? null) as any,
      notes: input.notes ?? null,
    }).$returningId();
    await this.publishFarmosUpdate("createProductionLog", ["productionLogs"], "created", res.id, orgId);
    return { id: res.id };
  }

  async deleteProductionLog(id: number, orgId: number) {
    const [previous] = await this.db.select().from(farmosProductionLogs).where(and(eq(farmosProductionLogs.id, id), eq(farmosProductionLogs.organizationId, orgId))).limit(1);
    if (!previous) throw new NotFoundException("Production log not found.");
    if (previous.animalId != null) {
      await this.assertAnimalWritableById(Number(previous.animalId), orgId);
    }
    await this.db.update(farmosProductionLogs).set({ isActive: 0 }).where(and(eq(farmosProductionLogs.id, id), eq(farmosProductionLogs.organizationId, orgId)));
    await this.publishFarmosUpdate("deleteProductionLog", ["productionLogs"], "deleted", id, orgId);
    return { message: "Production supprimée." };
  }

  // ─── CRM ledger auto-sync (SCRUM-220) ───────────────────────────────────
  // Looks up a transaction_type configured by name ("FarmOS Sale" / "FarmOS Expense")
  // and creates a transaction with its debit/credit accounts. If the type isn't
  // configured for the organisation, sync is skipped silently (returns null).

  private async publishFarmosUpdate(
    kind: string,
    tables: string[],
    action: "created" | "updated" | "deleted",
    entityId: number | string,
    orgId: number,
  ) {
    try {
      await this.realtime.publishDataUpdated({
        entity: "farmos",
        action,
        entityId,
        scope: { module: "farmos", tenantId: orgId },
        permissions: ["readAll-farmos"],
        tags: ["farmos", kind, ...tables],
      });
    } catch (error) {
      console.warn("[FarmOS] realtime publish failed:", error instanceof Error ? error.message : String(error));
    }
  }

  private async findTransactionType(name: string) {
    const [t] = await this.db
      .select()
      .from(transactionTypes)
      .where(and(eq(transactionTypes.name, name), eq(transactionTypes.isActive, true)))
      .limit(1);
    return t ?? null;
  }

  // ─── Vaccinations & AI insights ─────────────────────────────────────────

  async listVaccinations(orgId: number) {
    return this.db
      .select()
      .from(farmosVaccinations)
      .where(and(eq(farmosVaccinations.organizationId, orgId), eq(farmosVaccinations.isActive, 1)))
      .orderBy(farmosVaccinations.dueDate);
  }

  async createVaccination(input: any, orgId: number) {
    const [res] = await this.db.insert(farmosVaccinations).values({
      organizationId: orgId,
      species: input.species,
      vaccine: input.vaccine,
      target: input.target ?? null,
      animalCount: input.animal_count ?? null,
      dueDate: input.due_date,
      status: input.status ?? "scheduled",
      notes: input.notes ?? null,
    }).$returningId();
    await this.publishFarmosUpdate("createVaccination", ["vaccinations"], "created", res.id, orgId);
    return { id: res.id };
  }

  // ─── Base de donnees de vaccins (catalogue + specifications) ───────────────
  async listVaccines(orgId: number, species?: string) {
    const conds = [eq(farmosVaccines.organizationId, orgId), eq(farmosVaccines.isActive, 1)];
    if (species) conds.push(sql`${farmosVaccines.species} like ${"%" + species + "%"}`);
    return this.db
      .select({
        id: farmosVaccines.id,
        name: farmosVaccines.name,
        species: farmosVaccines.species,
        targetDiseases: farmosVaccines.targetDiseases,
        manufacturer: farmosVaccines.manufacturer,
        isSeed: farmosVaccines.isSeed,
      })
      .from(farmosVaccines)
      .where(and(...conds))
      .orderBy(farmosVaccines.name);
  }

  async getVaccine(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosVaccines)
      .where(and(eq(farmosVaccines.id, id), eq(farmosVaccines.organizationId, orgId)))
      .limit(1);
    if (!row) throw new NotFoundException("Vaccin introuvable.");
    return row;
  }

  async createVaccine(input: any, orgId: number, userId?: number) {
    const [res] = await this.db.insert(farmosVaccines).values({
      organizationId: orgId,
      name: input.name,
      commercialNames: input.commercial_names ?? input.commercialNames ?? null,
      manufacturer: input.manufacturer ?? null,
      species: input.species ?? null,
      targetDiseases: input.target_diseases ?? input.targetDiseases ?? null,
      vaccineType: input.vaccine_type ?? input.vaccineType ?? null,
      dose: input.dose ?? null,
      route: input.route ?? null,
      primoAge: input.primo_age ?? input.primoAge ?? null,
      boosterSchedule: input.booster_schedule ?? input.boosterSchedule ?? null,
      protectionDuration: input.protection_duration ?? input.protectionDuration ?? null,
      treatmentDuration: input.treatment_duration ?? input.treatmentDuration ?? null,
      withdrawalMeat: input.withdrawal_meat ?? input.withdrawalMeat ?? null,
      withdrawalMilk: input.withdrawal_milk ?? input.withdrawalMilk ?? null,
      withdrawalEggs: input.withdrawal_eggs ?? input.withdrawalEggs ?? null,
      sideEffects: input.side_effects ?? input.sideEffects ?? null,
      contraindications: input.contraindications ?? null,
      precautions: input.precautions ?? null,
      storage: input.storage ?? null,
      packaging: input.packaging ?? null,
      sourceUrl: input.source_url ?? input.sourceUrl ?? null,
      registrationNo: input.registration_no ?? input.registrationNo ?? null,
      notes: input.notes ?? null,
      createdBy: userId,
    }).$returningId();
    return { id: res.id };
  }

  async listVetExams(orgId: number) {
    return this.db
      .select()
      .from(farmosVetExams)
      .where(and(eq(farmosVetExams.organizationId, orgId), eq(farmosVetExams.isActive, 1)))
      .orderBy(desc(farmosVetExams.examDate));
  }

  // Dossier vétérinaire complet : examen + lignes d'ordonnance.
  async getVetExam(id: number, orgId: number) {
    const [exam] = await this.db
      .select()
      .from(farmosVetExams)
      .where(and(eq(farmosVetExams.id, id), eq(farmosVetExams.organizationId, orgId), eq(farmosVetExams.isActive, 1)))
      .limit(1);
    if (!exam) throw new NotFoundException("Vet exam not found.");
    const prescriptions = await this.db
      .select()
      .from(farmosVetPrescriptions)
      .where(and(eq(farmosVetPrescriptions.examId, id), eq(farmosVetPrescriptions.organizationId, orgId), eq(farmosVetPrescriptions.isActive, 1)));
    return { ...exam, prescriptions };
  }

  async createVetExam(input: any, orgId: number) {
    if (input.animal_id != null) {
      await this.assertAnimalWritableById(Number(input.animal_id), orgId);
    }
    const [res] = await this.db.insert(farmosVetExams).values({
      organizationId: orgId,
      animalId: input.animal_id ?? null,
      species: input.species ?? null,
      vet: input.vet ?? null,
      vetUserId: input.vet_user_id ?? null,
      examDate: input.exam_date,
      examType: input.exam_type ?? null,
      reason: input.reason ?? null,
      anamnesis: input.anamnesis ?? null,
      clinicalExam: input.clinical_exam ?? null,
      differentialDiagnosis: input.differential_diagnosis ?? null,
      protocol: input.protocol ?? null,
      temperature: input.temperature != null ? String(input.temperature) : null,
      weight: input.weight != null ? String(input.weight) : null,
      diagnosis: input.diagnosis ?? null,
      labTests: input.lab_tests ?? null,
      labResults: input.lab_results ?? null,
      recommendation: input.recommendation ?? null,
      followup: input.followup ?? null,
      notes: input.notes ?? null,
    }).$returningId();
    const examId = Number(res.id);
    await this.replacePrescriptions(examId, input.prescriptions, orgId);
    await this.publishFarmosUpdate("createVetExam", ["vetExams"], "created", examId, orgId);
    return this.getVetExam(examId, orgId);
  }

  async updateVetExam(id: number, input: any, orgId: number) {
    const exam = await this.getVetExam(id, orgId);
    if (exam.animalId != null) {
      await this.assertAnimalWritableById(Number(exam.animalId), orgId);
    }
    if (input.animal_id !== undefined && input.animal_id != null && Number(input.animal_id) !== Number(exam.animalId)) {
      await this.assertAnimalWritableById(Number(input.animal_id), orgId);
    }
    if (exam.signedAt) throw new BadRequestException("Examen signé — modification interdite.");
    const patch: Record<string, unknown> = {};
    if (input.animal_id !== undefined) patch.animalId = input.animal_id;
    if (input.species !== undefined) patch.species = input.species;
    if (input.vet !== undefined) patch.vet = input.vet;
    if (input.vet_user_id !== undefined) patch.vetUserId = input.vet_user_id;
    if (input.exam_date !== undefined) patch.examDate = input.exam_date;
    if (input.exam_type !== undefined) patch.examType = input.exam_type;
    if (input.reason !== undefined) patch.reason = input.reason;
    if (input.anamnesis !== undefined) patch.anamnesis = input.anamnesis;
    if (input.clinical_exam !== undefined) patch.clinicalExam = input.clinical_exam;
    if (input.differential_diagnosis !== undefined) patch.differentialDiagnosis = input.differential_diagnosis;
    if (input.protocol !== undefined) patch.protocol = input.protocol;
    if (input.temperature !== undefined) patch.temperature = input.temperature != null ? String(input.temperature) : null;
    if (input.weight !== undefined) patch.weight = input.weight != null ? String(input.weight) : null;
    if (input.diagnosis !== undefined) patch.diagnosis = input.diagnosis;
    if (input.lab_tests !== undefined) patch.labTests = input.lab_tests;
    if (input.lab_results !== undefined) patch.labResults = input.lab_results;
    if (input.recommendation !== undefined) patch.recommendation = input.recommendation;
    if (input.followup !== undefined) patch.followup = input.followup;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (Object.keys(patch).length > 0) {
      await this.db.update(farmosVetExams).set(patch).where(eq(farmosVetExams.id, id));
    }
    if (input.prescriptions !== undefined) {
      await this.replacePrescriptions(id, input.prescriptions, orgId);
    }
    await this.publishFarmosUpdate("updateVetExam", ["vetExams"], "updated", id, orgId);
    return this.getVetExam(id, orgId);
  }

  // Signature vétérinaire — verrouille l'examen (cf. workflow signature HR).
  async signVetExam(id: number, input: any, orgId: number) {
    const exam = await this.getVetExam(id, orgId);
    if (exam.animalId != null) {
      await this.assertAnimalWritableById(Number(exam.animalId), orgId);
    }
    if (exam.signedAt) throw new BadRequestException("Examen déjà signé.");
    if (!input.signature) throw new BadRequestException("Signature requise.");
    await this.db
      .update(farmosVetExams)
      .set({ signature: input.signature, signedBy: input.signed_by ?? exam.vet ?? null, signedAt: new Date() })
      .where(eq(farmosVetExams.id, id));
    await this.publishFarmosUpdate("signVetExam", ["vetExams"], "updated", id, orgId);
    return this.getVetExam(id, orgId);
  }

  async deleteVetExam(id: number, orgId: number) {
    const exam = await this.getVetExam(id, orgId);
    if (exam.animalId != null) {
      await this.assertAnimalWritableById(Number(exam.animalId), orgId);
    }
    await this.db.update(farmosVetExams).set({ isActive: 0 }).where(eq(farmosVetExams.id, id));
    await this.publishFarmosUpdate("deleteVetExam", ["vetExams"], "deleted", id, orgId);
    return { message: "Examen supprimé." };
  }

  // Remplace les lignes d'ordonnance d'un examen (désactive les anciennes, insère les nouvelles).
  private async replacePrescriptions(examId: number, lines: any[] | undefined, orgId: number) {
    if (lines === undefined) return;
    await this.db
      .update(farmosVetPrescriptions)
      .set({ isActive: 0 })
      .where(and(eq(farmosVetPrescriptions.examId, examId), eq(farmosVetPrescriptions.organizationId, orgId)));
    if (!Array.isArray(lines) || lines.length === 0) return;
    await this.db.insert(farmosVetPrescriptions).values(lines.map((l) => ({
      organizationId: orgId,
      examId,
      medicineId: l.medicine_id ?? null,
      medicineName: l.medicine_name ?? null,
      dosage: l.dosage ?? null,
      frequency: l.frequency ?? null,
      duration: l.duration ?? null,
      route: l.route ?? null,
      withdrawalMeatDays: l.withdrawal_meat_days ?? null,
      withdrawalMilkHours: l.withdrawal_milk_hours ?? null,
      withdrawalEggsDays: l.withdrawal_eggs_days ?? null,
      notes: l.notes ?? null,
    })));
  }

  // ─── Documents FarmOS (#3) : certificats, ordonnances, factures, analyses ────
  async listDocuments(orgId: number, animalId?: number | null, docType?: string | null) {
    const conds = [eq(farmosDocuments.organizationId, orgId), eq(farmosDocuments.isActive, 1)];
    if (animalId) conds.push(eq(farmosDocuments.animalId, animalId));
    if (docType) conds.push(eq(farmosDocuments.docType, docType));
    // Liste sans le data_url (lourd) — récupéré seulement au téléchargement.
    return this.db
      .select({
        id: farmosDocuments.id,
        animalId: farmosDocuments.animalId,
        examId: farmosDocuments.examId,
        docType: farmosDocuments.docType,
        title: farmosDocuments.title,
        filename: farmosDocuments.filename,
        contentType: farmosDocuments.contentType,
        sizeBytes: farmosDocuments.sizeBytes,
        issuedDate: farmosDocuments.issuedDate,
        notes: farmosDocuments.notes,
        createdAt: farmosDocuments.createdAt,
      })
      .from(farmosDocuments)
      .where(and(...conds))
      .orderBy(desc(farmosDocuments.id));
  }

  async getDocument(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosDocuments)
      .where(and(eq(farmosDocuments.id, id), eq(farmosDocuments.organizationId, orgId), eq(farmosDocuments.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Document not found.");
    return row;
  }

  async createDocument(input: any, orgId: number, currentUserId?: number) {
    if (!input.data_url) throw new BadRequestException("data_url requis.");
    if (!input.title) throw new BadRequestException("title requis.");
    if (input.animal_id != null) {
      await this.assertAnimalWritableById(Number(input.animal_id), orgId);
    }
    const [res] = await this.db.insert(farmosDocuments).values({
      organizationId: orgId,
      animalId: input.animal_id ?? null,
      examId: input.exam_id ?? null,
      docType: input.doc_type ?? "other",
      title: input.title,
      filename: input.filename ?? null,
      contentType: input.content_type ?? null,
      sizeBytes: input.size_bytes ?? null,
      dataUrl: input.data_url,
      issuedDate: input.issued_date ?? null,
      notes: input.notes ?? null,
      uploadedBy: currentUserId ?? null,
    }).$returningId();
    await this.publishFarmosUpdate("createDocument", ["documents"], "created", res.id, orgId);
    return { id: res.id };
  }

  async deleteDocument(id: number, orgId: number) {
    const previous = await this.getDocument(id, orgId);
    if (previous.animalId != null) {
      await this.assertAnimalWritableById(Number(previous.animalId), orgId);
    }
    await this.db.update(farmosDocuments).set({ isActive: 0 }).where(eq(farmosDocuments.id, id));
    await this.publishFarmosUpdate("deleteDocument", ["documents"], "deleted", id, orgId);
    return { message: "Document supprimé." };
  }

  // ─── Zones FarmOS ─────────────────────────────────────────────────────────
  async listFarms(orgId: number) {
    return this.db
      .select()
      .from(farmosFarms)
      .where(and(eq(farmosFarms.organizationId, orgId), eq(farmosFarms.isActive, 1)))
      .orderBy(farmosFarms.name);
  }

  async createFarm(input: any, orgId: number) {
    if (!input.name) throw new BadRequestException("name requis.");
    const [res] = await this.db.insert(farmosFarms).values({
      organizationId: orgId,
      name: input.name,
      location: input.location ?? null,
      hectares: input.hectares != null ? String(input.hectares) : null,
      status: input.status ?? "active",
      description: input.description ?? null,
    } as any).$returningId();
    return { id: res.id };
  }

  async updateFarm(id: number, input: any, orgId: number) {
    const [row] = await this.db.select({ id: farmosFarms.id }).from(farmosFarms)
      .where(and(eq(farmosFarms.id, id), eq(farmosFarms.organizationId, orgId))).limit(1);
    if (!row) throw new NotFoundException("Farm not found.");
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.location !== undefined) patch.location = input.location;
    if (input.hectares !== undefined) patch.hectares = input.hectares != null ? String(input.hectares) : null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.description !== undefined) patch.description = input.description;
    if (Object.keys(patch).length) await this.db.update(farmosFarms).set(patch).where(eq(farmosFarms.id, id));
    return { id };
  }

  async deleteFarm(id: number, orgId: number) {
    const [row] = await this.db.select({ id: farmosFarms.id }).from(farmosFarms)
      .where(and(eq(farmosFarms.id, id), eq(farmosFarms.organizationId, orgId))).limit(1);
    if (!row) throw new NotFoundException("Farm not found.");
    await this.db.update(farmosFarms).set({ isActive: 0 } as any).where(eq(farmosFarms.id, id));
    return { ok: true };
  }

  async listZones(orgId: number) {
    return this.db
      .select()
      .from(farmosZones)
      .where(and(eq(farmosZones.organizationId, orgId), eq(farmosZones.isActive, 1)))
      .orderBy(farmosZones.name);
  }

  async createZone(input: any, orgId: number) {
    if (!input.name) throw new BadRequestException("name requis.");
    const [res] = await this.db.insert(farmosZones).values({
      organizationId: orgId,
      farmId: input.farm_id ?? input.farmId ?? null,
      name: input.name,
      description: input.description ?? null,
    } as any).$returningId();
    return { id: res.id };
  }

  async updateZone(id: number, input: any, orgId: number) {
    const [row] = await this.db.select({ id: farmosZones.id }).from(farmosZones)
      .where(and(eq(farmosZones.id, id), eq(farmosZones.organizationId, orgId))).limit(1);
    if (!row) throw new NotFoundException("Zone not found.");
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.farm_id !== undefined || input.farmId !== undefined) patch.farmId = input.farm_id ?? input.farmId ?? null;
    if (Object.keys(patch).length) await this.db.update(farmosZones).set(patch).where(eq(farmosZones.id, id));
    return { id };
  }

  async deleteZone(id: number, orgId: number) {
    const [row] = await this.db.select({ id: farmosZones.id }).from(farmosZones)
      .where(and(eq(farmosZones.id, id), eq(farmosZones.organizationId, orgId))).limit(1);
    if (!row) throw new NotFoundException("Zone not found.");
    await this.db.update(farmosZones).set({ isActive: 0 } as any).where(eq(farmosZones.id, id));
    return { ok: true };
  }

  // ─── Bâtiments FarmOS — occupation calculée depuis animals.barn (par nom) ─────
  async listBuildings(orgId: number, species?: string | null, zoneId?: number | null) {
    const conds = [eq(farmosBuildings.organizationId, orgId), eq(farmosBuildings.isActive, 1)];
    if (species) conds.push(eq(farmosBuildings.species, species));
    if (zoneId) conds.push(eq(farmosBuildings.zoneId, zoneId));
    const [buildings, animals, zones] = await Promise.all([
      this.db.select().from(farmosBuildings).where(and(...conds)).orderBy(farmosBuildings.name),
      this.db
        .select({ barn: farmosAnimals.barn, count: farmosAnimals.count })
        .from(farmosAnimals)
        .where(and(eq(farmosAnimals.organizationId, orgId), eq(farmosAnimals.isActive, 1), this.activeLivestockSqlCondition())),
      this.db.select().from(farmosZones).where(and(eq(farmosZones.organizationId, orgId), eq(farmosZones.isActive, 1))),
    ]);
    const zoneById = new Map(zones.map((z) => [z.id, z]));
    // Occupation = somme des count (ou 1 par tête) des animaux dont barn == nom du bâtiment.
    const occByName = new Map<string, number>();
    for (const a of animals) {
      if (!a.barn) continue;
      const n = Number(a.count ?? 0) || 1;
      occByName.set(a.barn, (occByName.get(a.barn) ?? 0) + n);
    }
    return buildings.map((b) => {
      const occupancy = occByName.get(b.name) ?? 0;
      const cap = b.capacity ?? null;
      const zone = b.zoneId ? zoneById.get(b.zoneId) ?? null : null;
      return {
        ...b,
        zone: zone ? { id: zone.id, name: zone.name } : null,
        occupancy,
        occupancyRate: cap && cap > 0 ? Math.round((occupancy / cap) * 100) : null,
        overCapacity: cap != null && cap > 0 && occupancy > cap,
      };
    });
  }

  async getBuilding(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosBuildings)
      .where(and(eq(farmosBuildings.id, id), eq(farmosBuildings.organizationId, orgId), eq(farmosBuildings.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Building not found.");
    return row;
  }

  async createBuilding(input: any, orgId: number) {
    if (!input.name) throw new BadRequestException("name requis.");
    const [res] = await this.db.insert(farmosBuildings).values({
      organizationId: orgId,
      zoneId: input.zone_id ?? null,
      name: input.name,
      species: input.species ?? null,
      type: input.type ?? null,
      capacity: input.capacity ?? null,
      temperature: input.temperature != null ? String(input.temperature) : null,
      humidity: input.humidity != null ? String(input.humidity) : null,
      manager: input.manager ?? null,
      hygieneStatus: input.hygiene_status ?? null,
      notes: input.notes ?? null,
    }).$returningId();
    await this.publishFarmosUpdate("createBuilding", ["buildings"], "created", res.id, orgId);
    return { id: res.id };
  }

  async updateBuilding(id: number, input: any, orgId: number) {
    await this.getBuilding(id, orgId);
    const patch: Record<string, unknown> = {};
    if (input.zone_id !== undefined) patch.zoneId = input.zone_id;
    if (input.name !== undefined) patch.name = input.name;
    if (input.species !== undefined) patch.species = input.species;
    if (input.type !== undefined) patch.type = input.type;
    if (input.capacity !== undefined) patch.capacity = input.capacity;
    if (input.temperature !== undefined) patch.temperature = input.temperature != null ? String(input.temperature) : null;
    if (input.humidity !== undefined) patch.humidity = input.humidity != null ? String(input.humidity) : null;
    if (input.manager !== undefined) patch.manager = input.manager;
    if (input.hygiene_status !== undefined) patch.hygieneStatus = input.hygiene_status;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.pos_x !== undefined) patch.posX = input.pos_x != null ? String(input.pos_x) : null;
    if (input.pos_y !== undefined) patch.posY = input.pos_y != null ? String(input.pos_y) : null;
    if (Object.keys(patch).length === 0) return this.getBuilding(id, orgId);
    await this.db.update(farmosBuildings).set(patch).where(eq(farmosBuildings.id, id));
    await this.publishFarmosUpdate("updateBuilding", ["buildings"], "updated", id, orgId);
    return this.getBuilding(id, orgId);
  }

  async deleteBuilding(id: number, orgId: number) {
    await this.getBuilding(id, orgId);
    await this.db.update(farmosBuildings).set({ isActive: 0 }).where(eq(farmosBuildings.id, id));
    await this.publishFarmosUpdate("deleteBuilding", ["buildings"], "deleted", id, orgId);
    return { message: "Bâtiment supprimé." };
  }

  // ─── Box (loges/emplacements) ───────────────────────────────────────────────
  // Box = vraie entité rattachée à un bâtiment, avec capacité max. Box libre :
  // N animaux de n'importe quel lot (ou sans lot) via animal.box_id, sans contrainte.
  async listBoxes(orgId: number, buildingId?: number | null) {
    const conds = [eq(farmosBoxes.organizationId, orgId), eq(farmosBoxes.isActive, 1)];
    if (buildingId) conds.push(eq(farmosBoxes.buildingId, buildingId));
    const [boxes, animals] = await Promise.all([
      this.db.select().from(farmosBoxes).where(and(...conds)).orderBy(farmosBoxes.name),
      this.db
        .select({ boxId: farmosAnimals.boxId, count: farmosAnimals.count, status: farmosAnimals.status })
        .from(farmosAnimals)
        .where(and(eq(farmosAnimals.organizationId, orgId), eq(farmosAnimals.isActive, 1), this.activeLivestockSqlCondition())),
    ]);
    // Occupation par box = somme des count (ou 1/tête) des animaux pointant sur box_id.
    const occByBox = new Map<number, number>();
    const sickByBox = new Map<number, number>();
    for (const a of animals) {
      if (!a.boxId) continue;
      const n = Number(a.count ?? 0) || 1;
      occByBox.set(a.boxId, (occByBox.get(a.boxId) ?? 0) + n);
      if (a.status === "sick" || a.status === "quarantine") {
        sickByBox.set(a.boxId, (sickByBox.get(a.boxId) ?? 0) + n);
      }
    }
    return boxes.map((b) => {
      const occupancy = occByBox.get(b.id) ?? 0;
      const cap = b.capacity ?? null;
      return {
        ...b,
        occupancy,
        sick: sickByBox.get(b.id) ?? 0,
        occupancyRate: cap && cap > 0 ? Math.round((occupancy / cap) * 100) : null,
        overCapacity: cap != null && cap > 0 && occupancy > cap,
      };
    });
  }

  async getBox(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosBoxes)
      .where(and(eq(farmosBoxes.id, id), eq(farmosBoxes.organizationId, orgId), eq(farmosBoxes.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Box not found.");
    return row;
  }

  async createBox(input: any, orgId: number) {
    if (!input.building_id) throw new BadRequestException("building_id requis.");
    if (!input.name) throw new BadRequestException("name requis.");
    const [res] = await this.db.insert(farmosBoxes).values({
      organizationId: orgId,
      buildingId: input.building_id,
      name: String(input.name),
      section: input.section ?? null,
      capacity: input.capacity ?? null,
      notes: input.notes ?? null,
    }).$returningId();
    await this.publishFarmosUpdate("createBox", ["boxes"], "created", res.id, orgId);
    return { id: res.id };
  }

  // Génère N box d'un coup pour un bâtiment (ex: 70 box, capacité 4) — saisie indolore.
  async generateBoxes(input: any, orgId: number) {
    const buildingId = input.building_id;
    if (!buildingId) throw new BadRequestException("building_id requis.");
    const building = await this.getBuilding(buildingId, orgId);
    const countRaw = Number(input.count ?? building.capacity ?? 0);
    const count = Math.max(1, Math.min(500, Math.floor(countRaw)));
    const capacity = input.capacity != null ? Number(input.capacity) : null;
    const prefix = input.prefix != null ? String(input.prefix) : "";
    // Numérotation : reprend après le plus grand numéro de box existant du bâtiment
    // (évite de recréer 1..N en double à chaque clic "+ Box"). Le start explicite l'emporte.
    let start = input.start != null ? Number(input.start) || 1 : 1;
    if (input.start == null) {
      const existing = await this.db
        .select({ name: farmosBoxes.name })
        .from(farmosBoxes)
        .where(and(eq(farmosBoxes.buildingId, buildingId), eq(farmosBoxes.organizationId, orgId), eq(farmosBoxes.isActive, 1)));
      let maxNum = 0;
      for (const b of existing) {
        const m = String(b.name ?? "").match(/(\d+)\s*$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      }
      start = maxNum + 1;
    }
    const values = Array.from({ length: count }, (_, i) => ({
      organizationId: orgId,
      buildingId,
      name: `${prefix}${start + i}`,
      section: input.section ?? null,
      capacity,
      notes: null,
    }));
    await this.db.insert(farmosBoxes).values(values);
    await this.publishFarmosUpdate("generateBoxes", ["boxes"], "created", buildingId, orgId);
    return { created: count };
  }

  async updateBox(id: number, input: any, orgId: number) {
    await this.getBox(id, orgId);
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = String(input.name);
    if (input.section !== undefined) patch.section = input.section;
    if (input.capacity !== undefined) patch.capacity = input.capacity;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (Object.keys(patch).length === 0) return this.getBox(id, orgId);
    await this.db.update(farmosBoxes).set(patch).where(eq(farmosBoxes.id, id));
    await this.publishFarmosUpdate("updateBox", ["boxes"], "updated", id, orgId);
    return this.getBox(id, orgId);
  }

  async deleteBox(id: number, orgId: number) {
    await this.getBox(id, orgId);
    // Soft delete : on désassigne les animaux du box pour ne pas laisser de FK orpheline.
    await this.db.update(farmosAnimals).set({ boxId: null }).where(eq(farmosAnimals.boxId, id));
    await this.db.update(farmosBoxes).set({ isActive: 0 }).where(eq(farmosBoxes.id, id));
    await this.publishFarmosUpdate("deleteBox", ["boxes", "animals"], "deleted", id, orgId);
    return { message: "Box supprimé." };
  }

  // Suppression en lot (soft delete) : on désassigne les animaux puis on désactive les box.
  async deleteBoxes(ids: any, orgId: number) {
    const list = Array.isArray(ids) ? [...new Set(ids.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))] : [];
    if (list.length === 0) throw new BadRequestException("ids requis.");
    // Ne supprimer que les box appartenant à l'org (évite la fuite inter-org).
    const owned = await this.db
      .select({ id: farmosBoxes.id })
      .from(farmosBoxes)
      .where(and(inArray(farmosBoxes.id, list), eq(farmosBoxes.organizationId, orgId), eq(farmosBoxes.isActive, 1)));
    const ownedIds = owned.map((b) => b.id);
    if (ownedIds.length === 0) return { deleted: 0 };
    await this.db.update(farmosAnimals).set({ boxId: null }).where(inArray(farmosAnimals.boxId, ownedIds));
    await this.db.update(farmosBoxes).set({ isActive: 0 }).where(inArray(farmosBoxes.id, ownedIds));
    await this.publishFarmosUpdate("deleteBoxes", ["boxes", "animals"], "deleted", 0, orgId);
    return { deleted: ownedIds.length };
  }

  // Capacité dispo d'un box, en excluant éventuellement des animaux déjà comptés (réassignation).
  private async boxFreeSpace(box: { id: number; capacity: number | null }, orgId: number, excludeAnimalIds: number[] = []) {
    if (box.capacity == null) return { capacity: null as number | null, occupancy: 0, free: Infinity };
    const rows = await this.db
      .select({ id: farmosAnimals.id, count: farmosAnimals.count })
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.boxId, box.id), eq(farmosAnimals.organizationId, orgId), eq(farmosAnimals.isActive, 1), this.activeLivestockSqlCondition()));
    const exclude = new Set(excludeAnimalIds);
    let occupancy = 0;
    for (const r of rows) {
      if (exclude.has(r.id)) continue;
      occupancy += Number(r.count ?? 0) || 1;
    }
    return { capacity: box.capacity, occupancy, free: box.capacity - occupancy };
  }

  // Assigne un ou plusieurs animaux à un box. Bloque si dépassement de capacité,
  // sauf force=true. Désassigne si box_id null. "Box libre" : aucune contrainte de lot.
  async assignAnimalsToBox(input: any, orgId: number) {
    const animalIds: number[] = Array.isArray(input.animal_ids)
      ? input.animal_ids.map(Number).filter((n: number) => Number.isFinite(n))
      : [];
    if (animalIds.length === 0) throw new BadRequestException("animal_ids requis.");
    const targetBoxId = input.box_id != null ? Number(input.box_id) : null;
    const force = input.force === true || input.force === "true";

    if (targetBoxId == null) {
      await this.db.update(farmosAnimals)
        .set({ boxId: null })
        .where(and(eq(farmosAnimals.organizationId, orgId), sql`${farmosAnimals.id} in (${sql.join(animalIds.map((n) => sql`${n}`), sql`, `)})`));
      await this.publishFarmosUpdate("assignBox", ["animals", "boxes"], "updated", 0, orgId);
      return { assigned: animalIds.length, boxId: null };
    }

    const box = await this.getBox(targetBoxId, orgId);
    // Têtes à placer (somme des count des animaux ciblés), en excluant ceux déjà dans ce box.
    const animals = await this.db
      .select({ id: farmosAnimals.id, count: farmosAnimals.count, boxId: farmosAnimals.boxId })
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.organizationId, orgId), eq(farmosAnimals.isActive, 1),
        this.activeLivestockSqlCondition(),
        sql`${farmosAnimals.id} in (${sql.join(animalIds.map((n) => sql`${n}`), sql`, `)})`));
    const alreadyHere = animals.filter((a) => a.boxId === targetBoxId).map((a) => a.id);
    const incoming = animals.filter((a) => a.boxId !== targetBoxId)
      .reduce((s, a) => s + (Number(a.count ?? 0) || 1), 0);
    const { capacity, occupancy, free } = await this.boxFreeSpace(box, orgId, alreadyHere);

    if (capacity != null && incoming > free && !force) {
      throw new BadRequestException({
        code: "BOX_FULL",
        message: `Box plein : ${occupancy}/${capacity} occupé, ${free} place(s) libre(s), ${incoming} à ajouter.`,
        capacity, occupancy, free, incoming,
      });
    }

    await this.db.update(farmosAnimals)
      .set({ boxId: targetBoxId })
      .where(and(eq(farmosAnimals.organizationId, orgId), sql`${farmosAnimals.id} in (${sql.join(animalIds.map((n) => sql`${n}`), sql`, `)})`));
    await this.publishFarmosUpdate("assignBox", ["animals", "boxes"], "updated", targetBoxId, orgId);
    return { assigned: animalIds.length, boxId: targetBoxId, forced: force && capacity != null && incoming > free };
  }

  // ─── Éléments de terrain (décor du plan : champ, eau, route…) ───────────────
  async listLandFeatures(orgId: number, zoneId?: number | null) {
    const conds = [eq(farmosLandFeatures.organizationId, orgId), eq(farmosLandFeatures.isActive, 1)];
    if (zoneId) conds.push(eq(farmosLandFeatures.zoneId, zoneId));
    return this.db.select().from(farmosLandFeatures).where(and(...conds)).orderBy(farmosLandFeatures.id);
  }

  async createLandFeature(input: any, orgId: number) {
    if (!input.type) throw new BadRequestException("type requis.");
    const [res] = await this.db.insert(farmosLandFeatures).values({
      organizationId: orgId,
      zoneId: input.zone_id ?? null,
      type: input.type,
      label: input.label ?? null,
      posX: input.pos_x != null ? String(input.pos_x) : "0",
      posY: input.pos_y != null ? String(input.pos_y) : "0",
      width: input.width != null ? String(input.width) : null,
      height: input.height != null ? String(input.height) : null,
      meta: input.meta ?? null,
    }).$returningId();
    await this.publishFarmosUpdate("createLandFeature", ["land-features"], "created", res.id, orgId);
    return { id: res.id };
  }

  async updateLandFeature(id: number, input: any, orgId: number) {
    const [row] = await this.db.select({ id: farmosLandFeatures.id }).from(farmosLandFeatures)
      .where(and(eq(farmosLandFeatures.id, id), eq(farmosLandFeatures.organizationId, orgId), eq(farmosLandFeatures.isActive, 1))).limit(1);
    if (!row) throw new NotFoundException("Land feature not found.");
    const patch: Record<string, unknown> = {};
    if (input.zone_id !== undefined) patch.zoneId = input.zone_id;
    if (input.type !== undefined) patch.type = input.type;
    if (input.label !== undefined) patch.label = input.label;
    if (input.pos_x !== undefined) patch.posX = String(input.pos_x);
    if (input.pos_y !== undefined) patch.posY = String(input.pos_y);
    if (input.width !== undefined) patch.width = input.width != null ? String(input.width) : null;
    if (input.height !== undefined) patch.height = input.height != null ? String(input.height) : null;
    if (input.meta !== undefined) patch.meta = input.meta;
    if (Object.keys(patch).length) await this.db.update(farmosLandFeatures).set(patch).where(eq(farmosLandFeatures.id, id));
    await this.publishFarmosUpdate("updateLandFeature", ["land-features"], "updated", id, orgId);
    return { id };
  }

  async deleteLandFeature(id: number, orgId: number) {
    const [row] = await this.db.select({ id: farmosLandFeatures.id }).from(farmosLandFeatures)
      .where(and(eq(farmosLandFeatures.id, id), eq(farmosLandFeatures.organizationId, orgId))).limit(1);
    if (!row) throw new NotFoundException("Land feature not found.");
    await this.db.update(farmosLandFeatures).set({ isActive: 0 } as any).where(eq(farmosLandFeatures.id, id));
    await this.publishFarmosUpdate("deleteLandFeature", ["land-features"], "deleted", id, orgId);
    return { message: "Élément supprimé." };
  }

  // ─── Rapports PDF — délégués au microservice pdf-service (voir pdf-client) ───
  private async htmlToPdf(html: string): Promise<Buffer> {
    return renderPdfViaService(html, "FarmOS");
  }

  private esc(v: any): string {
    return String(v ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
  }

  // Rapport PDF d'un dossier vétérinaire (examen + ordonnance + signature).
  async vetExamPdf(id: number, orgId: number): Promise<{ buffer: Buffer; reference: string }> {
    const exam: any = await this.getVetExam(id, orgId);
    const animal = exam.animalId ? await this.getAnimal(exam.animalId, orgId).catch(() => null) : null;
    const rows = (exam.prescriptions || []).map((p: any) => `
      <tr>
        <td>${this.esc(p.medicineName)}</td><td>${this.esc(p.dosage)}</td>
        <td>${this.esc(p.frequency)}</td><td>${this.esc(p.duration)}</td><td>${this.esc(p.route)}</td>
        <td>${[p.withdrawalMeatDays ? `Viande ${p.withdrawalMeatDays}j` : "", p.withdrawalMilkHours ? `Lait ${p.withdrawalMilkHours}h` : "", p.withdrawalEggsDays ? `Œufs ${p.withdrawalEggsDays}j` : ""].filter(Boolean).join(" · ")}</td>
      </tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,Helvetica,sans-serif;color:#0E2418;font-size:12px}
      h1{font-size:20px;margin:0 0 4px} .sub{color:#4a5944;margin-bottom:16px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:14px}
      .k{color:#7a8a74;font-size:10px;text-transform:uppercase} .v{font-weight:600}
      .block{margin:10px 0;padding:8px 10px;background:#f5f3ee;border-radius:6px;white-space:pre-wrap}
      table{width:100%;border-collapse:collapse;margin-top:6px} th,td{border:1px solid #d8d4cb;padding:5px 7px;text-align:left;font-size:11px}
      th{background:#eceae3} .sign{margin-top:24px;display:flex;justify-content:space-between;align-items:flex-end}
      img.sig{height:60px}
    </style></head><body>
      <h1>Dossier vétérinaire</h1>
      <div class="sub">${this.esc(animal?.name || "Troupeau")} · ${this.esc(exam.species || "")} · ${this.esc(String(exam.examDate || "").slice(0, 10))}</div>
      <div class="grid">
        <div><div class="k">Type</div><div class="v">${this.esc(exam.examType)}</div></div>
        <div><div class="k">Vétérinaire</div><div class="v">${this.esc(exam.vet)}</div></div>
        <div><div class="k">Température</div><div class="v">${this.esc(exam.temperature)} °C</div></div>
        <div><div class="k">Poids</div><div class="v">${this.esc(exam.weight)} kg</div></div>
      </div>
      ${exam.reason ? `<div class="k">Motif</div><div class="block">${this.esc(exam.reason)}</div>` : ""}
      ${exam.anamnesis ? `<div class="k">Anamnèse</div><div class="block">${this.esc(exam.anamnesis)}</div>` : ""}
      ${exam.clinicalExam ? `<div class="k">Examen clinique</div><div class="block">${this.esc(exam.clinicalExam)}</div>` : ""}
      ${exam.differentialDiagnosis ? `<div class="k">Diagnostic différentiel</div><div class="block">${this.esc(exam.differentialDiagnosis)}</div>` : ""}
      ${exam.diagnosis ? `<div class="k">Diagnostic</div><div class="block">${this.esc(exam.diagnosis)}</div>` : ""}
      ${exam.labTests ? `<div class="k">Examens labo</div><div class="block">${this.esc(exam.labTests)}</div>` : ""}
      ${exam.labResults ? `<div class="k">Résultats labo</div><div class="block">${this.esc(exam.labResults)}</div>` : ""}
      ${exam.protocol ? `<div class="k">Protocole</div><div class="block">${this.esc(exam.protocol)}</div>` : ""}
      ${exam.recommendation ? `<div class="k">Recommandation</div><div class="block">${this.esc(exam.recommendation)}</div>` : ""}
      ${exam.followup ? `<div class="k">Suivi</div><div class="block">${this.esc(exam.followup)}</div>` : ""}
      ${rows ? `<div class="k">Ordonnance</div><table><tr><th>Médicament</th><th>Dose</th><th>Fréquence</th><th>Durée</th><th>Voie</th><th>Délai de retrait</th></tr>${rows}</table>` : ""}
      <div class="sign">
        <div><div class="k">Signé par</div><div class="v">${this.esc(exam.signedBy || exam.vet || "—")}</div>
          <div style="font-size:10px;color:#7a8a74">${exam.signedAt ? this.esc(String(exam.signedAt).slice(0, 10)) : "Non signé"}</div></div>
        ${exam.signature ? `<img class="sig" src="${exam.signature}" alt="signature"/>` : ""}
      </div>
    </body></html>`;
    const buffer = await this.htmlToPdf(html);
    return { buffer, reference: `dossier-vet-${id}` };
  }

  // Rapport PDF de rentabilité (résumé financier + ventes/dépenses récentes).
  async financePdf(orgId: number): Promise<{ buffer: Buffer; reference: string }> {
    const [finance, sales, expenses] = await Promise.all([
      this.getFinanceSummary(orgId),
      this.listSales(orgId),
      this.listExpenses(orgId),
    ]);
    const f: any = finance || {};
    const sRows = (Array.isArray(sales) ? sales : []).slice(0, 30).map((s: any) => `
      <tr><td>${this.esc(String(s.saleDate || "").slice(0, 10))}</td><td>${this.esc(s.productType || s.species)}</td>
      <td>${this.esc(s.buyer)}</td><td style="text-align:right">${this.esc(s.totalAmount)}</td></tr>`).join("");
    const eRows = (Array.isArray(expenses) ? expenses : []).slice(0, 30).map((e: any) => `
      <tr><td>${this.esc(String(e.expenseDate || "").slice(0, 10))}</td><td>${this.esc(e.category)}</td>
      <td>${this.esc(e.notes)}</td><td style="text-align:right">${this.esc(e.amount)}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,Helvetica,sans-serif;color:#0E2418;font-size:12px}
      h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;margin:16px 0 4px}
      .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}
      .kpi{background:#f5f3ee;border-radius:6px;padding:10px} .kpi .k{color:#7a8a74;font-size:10px;text-transform:uppercase}
      .kpi .v{font-size:18px;font-weight:700} table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #d8d4cb;padding:5px 7px;font-size:11px;text-align:left} th{background:#eceae3}
    </style></head><body>
      <h1>Rapport de rentabilité</h1>
      <div style="color:#4a5944">Généré le ${new Date().toISOString().slice(0, 10)}</div>
      <div class="kpis">
        <div class="kpi"><div class="k">Revenus</div><div class="v">${this.esc(f.totalSales ?? f.revenue ?? 0)}</div></div>
        <div class="kpi"><div class="k">Dépenses</div><div class="v">${this.esc(f.totalExpenses ?? f.expenses ?? 0)}</div></div>
        <div class="kpi"><div class="k">Profit</div><div class="v">${this.esc(f.profit ?? f.net ?? 0)}</div></div>
      </div>
      <h2>Ventes récentes</h2>
      <table><tr><th>Date</th><th>Produit</th><th>Acheteur</th><th style="text-align:right">Montant</th></tr>${sRows || "<tr><td colspan=4>—</td></tr>"}</table>
      <h2>Dépenses récentes</h2>
      <table><tr><th>Date</th><th>Catégorie</th><th>Note</th><th style="text-align:right">Montant</th></tr>${eRows || "<tr><td colspan=4>—</td></tr>"}</table>
    </body></html>`;
    const buffer = await this.htmlToPdf(html);
    return { buffer, reference: `rentabilite-${new Date().toISOString().slice(0, 10)}` };
  }

  async listWorkLogs(orgId: number, userId?: number | null, from?: string | null, to?: string | null) {
    const conds = [eq(farmosWorkLogs.organizationId, orgId), eq(farmosWorkLogs.isActive, 1)];
    if (userId) conds.push(eq(farmosWorkLogs.userId, userId));
    if (from) conds.push(gte(farmosWorkLogs.workDate, from));
    if (to) conds.push(lt(farmosWorkLogs.workDate, to));
    return this.db
      .select({
        id: farmosWorkLogs.id,
        userId: farmosWorkLogs.userId,
        workDate: farmosWorkLogs.workDate,
        hours: farmosWorkLogs.hours,
        notes: farmosWorkLogs.notes,
        tasks: farmosWorkLogs.tasks,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(farmosWorkLogs)
      .leftJoin(users, eq(users.id, farmosWorkLogs.userId))
      .where(and(...conds))
      .orderBy(desc(farmosWorkLogs.workDate), desc(farmosWorkLogs.id));
  }

  async createWorkLog(input: any, orgId: number, currentUserId: number) {
    const userId = input.user_id ?? currentUserId;
    if (!userId) throw new BadRequestException("user_id manquant.");
    const [res] = await this.db.insert(farmosWorkLogs).values({
      organizationId: orgId,
      userId,
      workDate: input.work_date,
      hours: input.hours != null ? String(input.hours) : null,
      notes: input.notes ?? null,
      tasks: Array.isArray(input.tasks) && input.tasks.length ? input.tasks : null,
    }).$returningId();
    await this.publishFarmosUpdate("createWorkLog", ["workLogs"], "created", res.id, orgId);
    return { id: res.id };
  }

  // ─── Tasks (taches equipe, COMP-P1-010) ──────────────────────────────────
  async listTasks(orgId: number, opts: { status?: string | null; assignedUserId?: number | null } = {}) {
    const conds = [eq(farmosTasks.organizationId, orgId), eq(farmosTasks.isActive, 1)];
    if (opts.status) conds.push(eq(farmosTasks.status, opts.status));
    if (opts.assignedUserId) conds.push(eq(farmosTasks.assignedUserId, opts.assignedUserId));
    return this.db
      .select({
        id: farmosTasks.id,
        title: farmosTasks.title,
        description: farmosTasks.description,
        status: farmosTasks.status,
        priority: farmosTasks.priority,
        assignedUserId: farmosTasks.assignedUserId,
        dueDate: farmosTasks.dueDate,
        animalId: farmosTasks.animalId,
        lot: farmosTasks.lot,
        buildingId: farmosTasks.buildingId,
        zoneId: farmosTasks.zoneId,
        photoUrl: farmosTasks.photoUrl,
        doneAt: farmosTasks.doneAt,
        createdAt: farmosTasks.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(farmosTasks)
      .leftJoin(users, eq(users.id, farmosTasks.assignedUserId))
      .where(and(...conds))
      .orderBy(desc(farmosTasks.id));
  }

  async createTask(input: any, orgId: number, currentUserId: number) {
    const [res] = await this.db.insert(farmosTasks).values({
      organizationId: orgId,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      assignedUserId: input.assigned_user_id ?? null,
      dueDate: input.due_date ?? null,
      animalId: input.animal_id ?? null,
      lot: input.lot ?? null,
      buildingId: input.building_id ?? null,
      zoneId: input.zone_id ?? null,
      photoUrl: input.photo_url ?? null,
      doneAt: input.status === "done" ? new Date() : null,
      createdBy: currentUserId ?? null,
    }).$returningId();
    await this.publishFarmosUpdate("createTask", ["tasks"], "created", res.id, orgId);
    return { id: res.id };
  }

  private async getTaskRow(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosTasks)
      .where(and(eq(farmosTasks.id, id), eq(farmosTasks.organizationId, orgId), eq(farmosTasks.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Tâche introuvable.");
    return row;
  }

  async updateTask(id: number, input: any, orgId: number) {
    const current = await this.getTaskRow(id, orgId);
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.assigned_user_id !== undefined) patch.assignedUserId = input.assigned_user_id;
    if (input.due_date !== undefined) patch.dueDate = input.due_date;
    if (input.animal_id !== undefined) patch.animalId = input.animal_id;
    if (input.lot !== undefined) patch.lot = input.lot;
    if (input.building_id !== undefined) patch.buildingId = input.building_id;
    if (input.zone_id !== undefined) patch.zoneId = input.zone_id;
    if (input.photo_url !== undefined) patch.photoUrl = input.photo_url;
    if (input.status !== undefined) {
      patch.status = input.status;
      // Trace l'achèvement : done_at posé au passage à "done", effacé sinon.
      patch.doneAt = input.status === "done" ? (current.doneAt ?? new Date()) : null;
    }
    if (Object.keys(patch).length === 0) return { id };
    await this.db.update(farmosTasks).set(patch).where(eq(farmosTasks.id, id));
    await this.publishFarmosUpdate("updateTask", ["tasks"], "updated", id, orgId);
    return { id };
  }

  async deleteTask(id: number, orgId: number) {
    await this.getTaskRow(id, orgId);
    await this.db.update(farmosTasks).set({ isActive: 0 }).where(eq(farmosTasks.id, id));
    await this.publishFarmosUpdate("deleteTask", ["tasks"], "deleted", id, orgId);
    return { message: "Tâche supprimée." };
  }

  async listMortalityEvents(orgId: number) {
    return this.db
      .select()
      .from(farmosMortalityEvents)
      .where(and(eq(farmosMortalityEvents.organizationId, orgId), eq(farmosMortalityEvents.isActive, 1)))
      .orderBy(desc(farmosMortalityEvents.eventDate));
  }

  // Stats mortalité (prompt design) : décès par mois / espèce / cause, totaux,
  // perte financière. Calcul en mémoire (volumétrie faible) à partir des events.
  async getMortalityStats(orgId: number) {
    const rows = await this.db
      .select()
      .from(farmosMortalityEvents)
      .where(and(eq(farmosMortalityEvents.organizationId, orgId), eq(farmosMortalityEvents.isActive, 1)));
    const byMonth: Record<string, number> = {};
    const bySpecies: Record<string, number> = {};
    const byCause: Record<string, number> = {};
    let totalDeaths = 0;
    let totalLoss = 0;
    for (const r of rows) {
      const n = Number(r.count ?? 1);
      totalDeaths += n;
      totalLoss += Number(r.estimatedLoss ?? 0);
      const month = String(r.eventDate ?? "").slice(0, 7);
      if (month) byMonth[month] = (byMonth[month] ?? 0) + n;
      if (r.species) bySpecies[r.species] = (bySpecies[r.species] ?? 0) + n;
      const cause = (r.confirmedCause || r.cause || "—") as string;
      byCause[cause] = (byCause[cause] ?? 0) + n;
    }
    const sortDesc = (obj: Record<string, number>) =>
      Object.entries(obj).map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
    return {
      totalDeaths,
      totalLoss: Math.round(totalLoss),
      eventsCount: rows.length,
      byMonth: Object.entries(byMonth).map(([key, value]) => ({ key, value })).sort((a, b) => a.key.localeCompare(b.key)),
      bySpecies: sortDesc(bySpecies),
      byCause: sortDesc(byCause),
    };
  }

  async createMortalityEvent(input: any, orgId: number) {
    const deathCount = Number(input.count ?? 1);
    if (!Number.isInteger(deathCount) || deathCount <= 0) {
      throw new BadRequestException("Nombre de deces requis.");
    }
    let animal: any = null;
    if (input.animal_id) {
      animal = await this.assertAnimalWritableById(Number(input.animal_id), orgId);
      const currentCount = Number(animal.count ?? 0);
      const availableCount = currentCount > 0 ? currentCount : 1;
      if (deathCount > availableCount) {
        throw new BadRequestException(`Nombre de deces superieur au nombre disponible. Maximum: ${availableCount}.`);
      }
    }
    const [res] = await this.db.insert(farmosMortalityEvents).values({
      organizationId: orgId,
      animalId: input.animal_id ?? null,
      species: input.species,
      eventDate: input.event_date,
      count: deathCount,
      cause: input.cause ?? null,
      necropsyRequested: input.necropsy_requested ? 1 : 0,
      eventTime: input.event_time ?? null,
      barn: input.barn ?? null,
      lot: input.lot ?? null,
      confirmedCause: input.confirmed_cause ?? null,
      relatedDiseaseId: input.related_disease_id ?? null,
      preDeathSymptoms: input.pre_death_symptoms ?? null,
      vetConsulted: input.vet_consulted ?? null,
      estimatedLoss: input.estimated_loss != null ? String(input.estimated_loss) : null,
      necropsyDone: input.necropsy_done ? 1 : 0,
      notes: input.notes ?? null,
    }).$returningId();
    // Sur un lot, un deces partiel reduit le nombre sans cloturer tout le dossier.
    if (animal) {
      const currentCount = Number(animal.count ?? 0);
      if (currentCount > deathCount) {
        await this.db
          .update(farmosAnimals)
          .set({ count: currentCount - deathCount })
          .where(and(eq(farmosAnimals.id, animal.id), eq(farmosAnimals.organizationId, orgId)));
      } else {
        await this.db
          .update(farmosAnimals)
          .set({ count: currentCount > 0 ? 0 : animal.count, status: "deceased" })
          .where(and(eq(farmosAnimals.id, animal.id), eq(farmosAnimals.organizationId, orgId)));
      }
    }
    await this.publishFarmosUpdate("createMortalityEvent", ["mortalityEvents", "animals"], "created", res.id, orgId);
    return { id: res.id };
  }

  // ─── Pesées / courbe de croissance ──────────────────────────────────────
  async listWeighings(orgId: number, animalId?: number) {
    const conditions = [eq(farmosWeighings.organizationId, orgId), eq(farmosWeighings.isActive, 1)];
    if (animalId) conditions.push(eq(farmosWeighings.animalId, animalId));
    return this.db
      .select()
      .from(farmosWeighings)
      .where(and(...conditions))
      .orderBy(farmosWeighings.weighDate);
  }

  async createWeighing(input: CreateWeighingDto, orgId: number) {
    await this.assertAnimalWritableById(Number(input.animal_id), orgId);
    const [res] = await this.db.insert(farmosWeighings).values({
      organizationId: orgId,
      animalId: input.animal_id,
      weighDate: input.weigh_date,
      weight: String(input.weight),
      weightUnit: input.weight_unit ?? "kg",
      notes: input.notes ?? null,
    }).$returningId();
    // Met à jour le poids courant de l'animal avec la dernière pesée.
    await this.db
      .update(farmosAnimals)
      .set({ weight: String(input.weight), weightUnit: input.weight_unit ?? "kg" })
      .where(and(eq(farmosAnimals.id, input.animal_id), eq(farmosAnimals.organizationId, orgId)));
    await this.publishFarmosUpdate("createWeighing", ["weighings", "animals"], "created", res.id, orgId);
    return { id: res.id };
  }

  async deleteWeighing(id: number, orgId: number) {
    const [previous] = await this.db.select().from(farmosWeighings).where(and(eq(farmosWeighings.id, id), eq(farmosWeighings.organizationId, orgId))).limit(1);
    if (!previous) throw new NotFoundException("Weighing not found.");
    await this.assertAnimalWritableById(Number(previous.animalId), orgId);
    await this.db
      .update(farmosWeighings)
      .set({ isActive: 0 })
      .where(and(eq(farmosWeighings.id, id), eq(farmosWeighings.organizationId, orgId)));
    await this.publishFarmosUpdate("deleteWeighing", ["weighings"], "deleted", id, orgId);
    return { message: "Pesée supprimée." };
  }

  async listAiInsights(orgId: number) {
    return this.db
      .select()
      .from(farmosAiInsights)
      .where(and(eq(farmosAiInsights.organizationId, orgId), eq(farmosAiInsights.isActive, 1)))
      .orderBy(desc(farmosAiInsights.confidence));
  }

  // ─── Lookups (user-editable dropdowns: breeds, types, vets, routes…) ────

  async listLookups(orgId: number, category: string, scope?: string | null) {
    const conds = [
      eq(farmosLookups.organizationId, orgId),
      eq(farmosLookups.category, category),
      eq(farmosLookups.isActive, 1),
    ];
    if (scope) conds.push(eq(farmosLookups.scopeKey, scope));
    return this.db
      .select()
      .from(farmosLookups)
      .where(and(...conds))
      .orderBy(farmosLookups.valueFr);
  }

  async createLookup(
    input: { category: string; value_fr: string; value_en?: string | null; scope_key?: string | null },
    orgId: number,
  ) {
    if (!input.category || !input.value_fr) {
      throw new BadRequestException("category and value_fr are required.");
    }
    const [existing] = await this.db
      .select()
      .from(farmosLookups)
      .where(
        and(
          eq(farmosLookups.organizationId, orgId),
          eq(farmosLookups.category, input.category),
          input.scope_key ? eq(farmosLookups.scopeKey, input.scope_key) : isNull(farmosLookups.scopeKey),
          eq(farmosLookups.valueFr, input.value_fr),
        ),
      )
      .limit(1);
    if (existing) {
      if (existing.isActive !== 1) {
        await this.db.update(farmosLookups).set({ isActive: 1 }).where(eq(farmosLookups.id, existing.id));
      }
      return { id: existing.id };
    }
    const [result] = await this.db.insert(farmosLookups).values({
      organizationId: orgId,
      category: input.category,
      scopeKey: input.scope_key ?? null,
      valueFr: input.value_fr,
      valueEn: input.value_en ?? null,
    });
    const id = (result as any).insertId;
    await this.publishFarmosUpdate("createLookup", ["lookups"], "created", id, orgId);
    return { id };
  }

  async deleteLookup(id: number, orgId: number) {
    await this.db
      .update(farmosLookups)
      .set({ isActive: 0 })
      .where(and(eq(farmosLookups.id, id), eq(farmosLookups.organizationId, orgId)));
    await this.publishFarmosUpdate("deleteLookup", ["lookups"], "deleted", id, orgId);
    return { ok: true };
  }

  // ─── Animal photos (dev: data URL inline; prod-ready for S3 swap) ───────
  // Listing global utilisé par la reconnaissance faciale côté navigateur:
  // pour chaque animal de l'organisation, on renvoie ses N premières photos
  // (data URL). Le client calcule un embedding local par photo et indexe.
  async listAnimalsWithPhotos(orgId: number, perAnimal = 3) {
    const photos = await this.db
      .select({
        id: farmosAnimalPhotos.id,
        animalId: farmosAnimalPhotos.animalId,
        dataUrl: farmosAnimalPhotos.dataUrl,
        contentType: farmosAnimalPhotos.contentType,
        createdAt: farmosAnimalPhotos.createdAt,
      })
      .from(farmosAnimalPhotos)
      .where(and(eq(farmosAnimalPhotos.organizationId, orgId), eq(farmosAnimalPhotos.isActive, 1)))
      .orderBy(desc(farmosAnimalPhotos.createdAt));

    const animalIds = Array.from(new Set(photos.map((p) => p.animalId)));
    if (animalIds.length === 0) return [];
    const animalRows = await this.db
      .select({
        id: farmosAnimals.id,
        externalId: farmosAnimals.externalId,
        name: farmosAnimals.name,
        species: farmosAnimals.species,
        race: farmosAnimals.race,
      })
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.organizationId, orgId), eq(farmosAnimals.isActive, 1)));

    const byId = new Map(animalRows.map((a) => [a.id, a]));
    const grouped = new Map<number, { id: number; dataUrl: string }[]>();
    for (const p of photos) {
      if (!byId.has(p.animalId)) continue;
      const arr = grouped.get(p.animalId) ?? [];
      if (arr.length < perAnimal) arr.push({ id: p.id, dataUrl: p.dataUrl });
      grouped.set(p.animalId, arr);
    }
    return Array.from(grouped.entries()).map(([animalId, photos]) => ({
      ...byId.get(animalId)!,
      photos,
    }));
  }

  async listAnimalPhotos(animalId: number, orgId: number) {
    return this.db
      .select({
        id: farmosAnimalPhotos.id,
        animalId: farmosAnimalPhotos.animalId,
        filename: farmosAnimalPhotos.filename,
        contentType: farmosAnimalPhotos.contentType,
        sizeBytes: farmosAnimalPhotos.sizeBytes,
        dataUrl: farmosAnimalPhotos.dataUrl,
        createdAt: farmosAnimalPhotos.createdAt,
      })
      .from(farmosAnimalPhotos)
      .where(and(
        eq(farmosAnimalPhotos.animalId, animalId),
        eq(farmosAnimalPhotos.organizationId, orgId),
        eq(farmosAnimalPhotos.isActive, 1),
      ))
      .orderBy(desc(farmosAnimalPhotos.createdAt));
  }

  async createAnimalPhoto(
    animalId: number,
    input: { data_url: string; filename?: string | null; content_type?: string | null; size_bytes?: number | null },
    orgId: number,
    userId?: number | null,
  ) {
    await this.assertAnimalWritableById(animalId, orgId);
    if (!input?.data_url || !input.data_url.startsWith("data:")) {
      throw new BadRequestException("data_url required (data:image/*;base64,…)");
    }
    if (input.data_url.length > 8_000_000) {
      throw new BadRequestException("Photo too large (max ~6MB base64).");
    }
    const [result] = await this.db.insert(farmosAnimalPhotos).values({
      organizationId: orgId,
      animalId,
      dataUrl: input.data_url,
      filename: input.filename ?? null,
      contentType: input.content_type ?? null,
      sizeBytes: input.size_bytes ?? null,
      uploadedBy: userId ?? null,
    });
    return { id: (result as any).insertId };
  }

  async deleteAnimalPhoto(id: number, orgId: number) {
    const [previous] = await this.db
      .select()
      .from(farmosAnimalPhotos)
      .where(and(eq(farmosAnimalPhotos.id, id), eq(farmosAnimalPhotos.organizationId, orgId)))
      .limit(1);
    if (!previous) throw new NotFoundException("Animal photo not found.");
    await this.assertAnimalWritableById(Number(previous.animalId), orgId);
    await this.db
      .update(farmosAnimalPhotos)
      .set({ isActive: 0 })
      .where(and(eq(farmosAnimalPhotos.id, id), eq(farmosAnimalPhotos.organizationId, orgId)));
    return { ok: true };
  }

  // ─── Staff (HR users assigned to the "FarmOS" department) ───────────────
  // Returns active employees from CRM HR (table `users`) that are part of the
  // FarmOS / Ferme department. Optional ?role= filters by designation name.
  async listFarmosStaff(orgId: number, role?: string | null) {
    const rows = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        image: users.image,
        joinDate: users.joinDate,
        leaveDate: users.leaveDate,
        designationId: users.designationId,
        designation: designations.name,
        departmentId: users.departmentId,
        department: departments.name,
        roleId: users.roleId,
        role: roles.name,
      })
      .from(users)
      .leftJoin(designations, eq(users.designationId, designations.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(
        and(
          eq(users.organizationId, orgId),
          eq(users.status, "true"),
          or(
            sql`LOWER(${departments.name}) = 'farmos'`,
            sql`LOWER(${departments.name}) = 'ferme'`,
          ),
        ),
      )
      .orderBy(users.firstName);

    const filtered = role
      ? rows.filter((r) => (r.designation || "").toLowerCase().includes(role.toLowerCase()))
      : rows;
    return filtered;
  }

  // ─── Finance summary (monthly aggregates for charts) ────────────────────

  async getFinanceSummary(orgId: number) {
    // 12 month rolling window ending current month.
    const now = new Date();
    const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const startISO = startMonth.toISOString().slice(0, 10);

    const salesRaw = await this.db
      .select({ saleDate: farmosSales.saleDate, total: farmosSales.totalAmount, productType: farmosSales.productType, species: farmosSales.species })
      .from(farmosSales)
      .where(and(eq(farmosSales.organizationId, orgId), eq(farmosSales.isActive, 1), gte(farmosSales.saleDate, startISO)));

    const expensesRaw = await this.db
      .select({ expenseDate: farmosExpenses.expenseDate, amount: farmosExpenses.amount, category: farmosExpenses.category })
      .from(farmosExpenses)
      .where(and(eq(farmosExpenses.organizationId, orgId), eq(farmosExpenses.isActive, 1), gte(farmosExpenses.expenseDate, startISO)));

    // Build 12 month buckets.
    const buckets: { key: string; revenue: number; expense: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + i, 1));
      buckets.push({ key: d.toISOString().slice(0, 7), revenue: 0, expense: 0 });
    }
    const idxFor = (iso: string) => buckets.findIndex((b) => b.key === iso.slice(0, 7));
    for (const r of salesRaw) {
      const i = idxFor(String(r.saleDate));
      if (i >= 0) buckets[i].revenue += Number(r.total ?? 0);
    }
    for (const r of expensesRaw) {
      const i = idxFor(String(r.expenseDate));
      if (i >= 0) buckets[i].expense += Number(r.amount ?? 0);
    }

    const PRODUCT_LABELS: Record<string, { fr: string; en: string; color: string }> = {
      milk: { fr: "Lait", en: "Milk", color: "var(--pertinence-500)" },
      eggs: { fr: "Œufs", en: "Eggs", color: "var(--autorite-500)" },
      meat: { fr: "Viande", en: "Meat", color: "var(--oxblood-500)" },
      wool: { fr: "Laine", en: "Wool", color: "var(--solidite-500)" },
      fish: { fr: "Poisson", en: "Fish", color: "var(--pertinence-300)" },
    };
    const byCategoryMap: Record<string, number> = {};
    for (const r of salesRaw) {
      const key = (r.productType ?? r.species ?? "other") as string;
      byCategoryMap[key] = (byCategoryMap[key] ?? 0) + Number(r.total ?? 0);
    }
    const byCategory = Object.entries(byCategoryMap).map(([cat, amount]) => ({
      cat, amount,
      fr: PRODUCT_LABELS[cat]?.fr ?? cat,
      en: PRODUCT_LABELS[cat]?.en ?? cat,
      color: PRODUCT_LABELS[cat]?.color ?? "var(--ink-400)",
    }));

    return {
      months: buckets.map((b) => b.key),
      revenue: buckets.map((b) => Math.round(b.revenue)),
      expense: buckets.map((b) => Math.round(b.expense)),
      byCategory,
    };
  }

  // ─── Rentabilité par animal / lot (#4) ──────────────────────────────────────
  // Revenu = ventes liées (animal_id). Coût = dépenses liées (related_animal_id).
  // Profit = revenu − coût. Agrégé aussi par lot (animal.lot).
  async getProfitability(orgId: number) {
    const [animals, sales, expenses] = await Promise.all([
      this.db
        .select({ id: farmosAnimals.id, name: farmosAnimals.name, species: farmosAnimals.species, lot: farmosAnimals.lot, barn: farmosAnimals.barn })
        .from(farmosAnimals)
        .where(and(eq(farmosAnimals.organizationId, orgId), eq(farmosAnimals.isActive, 1))),
      this.db
        .select({ animalId: farmosSales.animalId, total: farmosSales.totalAmount })
        .from(farmosSales)
        .where(and(eq(farmosSales.organizationId, orgId), eq(farmosSales.isActive, 1))),
      this.db
        .select({ animalId: farmosExpenses.relatedAnimalId, amount: farmosExpenses.amount, category: farmosExpenses.category })
        .from(farmosExpenses)
        .where(and(eq(farmosExpenses.organizationId, orgId), eq(farmosExpenses.isActive, 1))),
    ]);

    const revenueByAnimal = new Map<number, number>();
    for (const s of sales) {
      if (s.animalId == null) continue;
      revenueByAnimal.set(Number(s.animalId), (revenueByAnimal.get(Number(s.animalId)) ?? 0) + Number(s.total ?? 0));
    }
    const costByAnimal = new Map<number, number>();
    const costByCategory = new Map<number, Record<string, number>>();
    for (const e of expenses) {
      if (e.animalId == null) continue;
      const id = Number(e.animalId);
      costByAnimal.set(id, (costByAnimal.get(id) ?? 0) + Number(e.amount ?? 0));
      const cat = e.category || "other";
      const m = costByCategory.get(id) ?? {};
      m[cat] = (m[cat] ?? 0) + Number(e.amount ?? 0);
      costByCategory.set(id, m);
    }

    const byAnimal = animals
      .map((a) => {
        const id = Number(a.id);
        const revenue = Math.round(revenueByAnimal.get(id) ?? 0);
        const cost = Math.round(costByAnimal.get(id) ?? 0);
        return {
          animalId: id, name: a.name, species: a.species, lot: a.lot, barn: a.barn,
          revenue, cost, profit: revenue - cost,
          costByCategory: costByCategory.get(id) ?? {},
        };
      })
      .filter((r) => r.revenue !== 0 || r.cost !== 0)
      .sort((x, y) => y.profit - x.profit);

    // Agrégation générique par clé (lot ou bâtiment).
    const groupBy = (keyOf: (r: typeof byAnimal[number]) => string, keyName: "lot" | "building") => {
      const map = new Map<string, any>();
      for (const r of byAnimal) {
        const key = keyOf(r) || "—";
        const agg = map.get(key) ?? { [keyName]: key, revenue: 0, cost: 0, count: 0 };
        agg.revenue += r.revenue; agg.cost += r.cost; agg.count += 1;
        map.set(key, agg);
      }
      return Array.from(map.values())
        .map((l) => ({ ...l, profit: l.revenue - l.cost }))
        .sort((x, y) => y.profit - x.profit);
    };
    const byLot = groupBy((r) => r.lot ?? "", "lot");
    const byBuilding = groupBy((r) => r.barn ?? "", "building");

    const totals = byAnimal.reduce(
      (acc, r) => ({ revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, profit: acc.profit + r.profit }),
      { revenue: 0, cost: 0, profit: 0 },
    );

    return { byAnimal, byLot, byBuilding, totals };
  }

  private async syncSaleToTransaction(saleId: number, input: CreateSaleDto, orgId: number): Promise<number | null> {
    try {
      const txTypeName = this.resolveFarmosSaleTransactionType(input);
      const type = await this.findTransactionType(txTypeName) ?? await this.findTransactionType("FarmOS Sale");
      if (!type) return null;
      const particulars = `Vente FarmOS · ${input.product_type ?? input.species ?? "produit"}${input.buyer ? ` · ${input.buyer}` : ""}`;
      const [res] = await this.db.insert(transactions).values({
        organizationId: orgId,
        date: new Date(input.sale_date) as any,
        debitId: type.debitAccountId,
        creditId: type.creditAccountId,
        particulars: this.buildFarmosSaleParticulars(input, txTypeName),
        amount: Number(input.total_amount),
        currencyId: input.currency_id ?? null,
        type: txTypeName,
        relatedId: `farmos_sale:${saleId}:${input.sale_source ?? this.resolveFarmosSaleSource(input)}:${input.product_type ?? input.species ?? "item"}`,
      }).$returningId();
      // Ecriture moderne (dual-write) via LedgerService, idempotent par vente.
      await this.ledger.post(
        {
          date: new Date(input.sale_date),
          reference: `FARMSALE-${saleId}`,
          particulars: this.buildFarmosSaleParticulars(input, txTypeName),
          sourceModule: "farmos_sale",
          relatedId: String(saleId),
          currencyId: input.currency_id ?? undefined,
          idempotencyKey: `farmos_sale:${saleId}`,
          lines: [
            { accountId: type.debitAccountId, side: "DEBIT", amount: Number(input.total_amount), description: txTypeName },
            { accountId: type.creditAccountId, side: "CREDIT", amount: Number(input.total_amount), description: txTypeName },
          ],
        },
        orgId,
      );
      return res.id;
    } catch (err) {
      console.warn("[FarmOS] syncSaleToTransaction failed:", (err as Error).message);
      return null;
    }
  }

  private resolveFarmosSaleSource(input: CreateSaleDto) {
    if (input.sale_source) return input.sale_source;
    if (input.animal_id) return "animal";
    if (input.product_type) return "production";
    return "other";
  }

  private resolveFarmosSaleTransactionType(input: CreateSaleDto) {
    const product = (input.product_type || "").toLowerCase();
    const source = this.resolveFarmosSaleSource(input);
    if (source === "animal" || product === "animal" || product === "livestock") return "FarmOS Animal Sale";
    if (product === "eggs" || product === "egg") return "FarmOS Egg Sale";
    if (product === "milk") return "FarmOS Milk Sale";
    if (product === "meat") return "FarmOS Meat Sale";
    if (product === "wool") return "FarmOS Wool Sale";
    if (product === "fish") return "FarmOS Fish Sale";
    if (source === "production") return "FarmOS Production Sale";
    return "FarmOS Sale";
  }

  private buildFarmosSaleParticulars(input: CreateSaleDto, txTypeName: string) {
    const parts = [
      txTypeName.replace("FarmOS ", "Vente FarmOS - "),
      input.species ? `espece=${input.species}` : null,
      input.product_type ? `produit=${input.product_type}` : null,
      input.animal_id ? `animal=${input.animal_id}` : null,
      `qte=${input.quantity}${input.unit ? ` ${input.unit}` : ""}`,
      input.buyer ? `acheteur=${input.buyer}` : null,
    ].filter(Boolean);
    return parts.join(" | ").slice(0, 255);
  }

  private async syncExpenseToTransaction(expenseId: number, input: CreateExpenseDto, orgId: number): Promise<number | null> {
    try {
      const type = await this.findTransactionType("FarmOS Expense");
      if (!type) return null;
      const particulars = `Dépense FarmOS · ${input.category}${input.supplier ? ` · ${input.supplier}` : ""}${input.description ? ` · ${input.description}` : ""}`.slice(0, 250);
      const [res] = await this.db.insert(transactions).values({
        organizationId: orgId,
        date: new Date(input.expense_date) as any,
        debitId: type.debitAccountId,
        creditId: type.creditAccountId,
        particulars,
        amount: Number(input.amount),
        currencyId: input.currency_id ?? null,
        type: "FarmOS Expense",
        relatedId: `farmos_expense:${expenseId}`,
      }).$returningId();
      // Ecriture moderne (dual-write) via LedgerService, idempotent par depense.
      await this.ledger.post(
        {
          date: new Date(input.expense_date),
          reference: `FARMEXP-${expenseId}`,
          particulars,
          sourceModule: "farmos_expense",
          relatedId: String(expenseId),
          currencyId: input.currency_id ?? undefined,
          idempotencyKey: `farmos_expense:${expenseId}`,
          lines: [
            { accountId: type.debitAccountId, side: "DEBIT", amount: Number(input.amount), description: "FarmOS Expense", projectId: input.project_id ?? undefined },
            { accountId: type.creditAccountId, side: "CREDIT", amount: Number(input.amount), description: "FarmOS Expense" },
          ],
        },
        orgId,
      );
      return res.id;
    } catch (err) {
      // Inclut le cas "gate d'approbation" (422) : depense creee, comptabilisation
      // moderne reportee a l'approbation. Le dual-write plat reste en place.
      console.warn("[FarmOS] syncExpenseToTransaction failed:", (err as Error).message);
      return null;
    }
  }

  /** Comptabilise une depense via le grand livre, en bypassant le gate (post-approbation). */
  private async postExpenseLedgerApproved(expenseId: number, orgId: number) {
    const [exp] = await this.db
      .select()
      .from(farmosExpenses)
      .where(and(eq(farmosExpenses.id, expenseId), eq(farmosExpenses.organizationId, orgId)))
      .limit(1);
    if (!exp) throw new NotFoundException("Dépense introuvable.");
    const type = await this.findTransactionType("FarmOS Expense");
    if (!type) return null;
    const particulars = `Dépense FarmOS · ${exp.category}${exp.supplier ? ` · ${exp.supplier}` : ""}`.slice(0, 250);
    return this.ledger.post(
      {
        date: exp.expenseDate ? new Date(exp.expenseDate as any) : undefined,
        reference: `FARMEXP-${expenseId}`,
        particulars,
        sourceModule: "farmos_expense",
        relatedId: String(expenseId),
        currencyId: exp.currencyId ?? undefined,
        idempotencyKey: `farmos_expense:${expenseId}`,
        skipApprovalGate: true,
        lines: [
          { accountId: type.debitAccountId, side: "DEBIT", amount: Number(exp.amount), description: "FarmOS Expense", projectId: exp.projectId ?? undefined },
          { accountId: type.creditAccountId, side: "CREDIT", amount: Number(exp.amount), description: "FarmOS Expense" },
        ],
      },
      orgId,
    );
  }

  /** Soumet une depense au circuit d'approbation (no-op si le workflow n'existe pas). */
  async submitExpenseForApproval(expenseId: number, orgId: number, userId?: number) {
    try {
      return await this.workflow.submit(
        { workflowKey: "exp_approval", entityType: "farmos_expense", entityId: String(expenseId) },
        orgId,
        userId,
      );
    } catch (err) {
      console.warn("[FarmOS] submitExpenseForApproval skipped:", (err as Error).message);
      return null;
    }
  }

  /** Approuve une etape de l'instance liee a la depense ; comptabilise si approuvee. */
  async approveExpense(expenseId: number, comment: string | undefined, orgId: number, userId?: number) {
    const instances = await this.workflow.listInstances(orgId, "pending");
    const inst = instances.find(
      (i: any) => i.entityType === "farmos_expense" && i.entityId === String(expenseId),
    );
    if (!inst) throw new NotFoundException("Aucune instance d'approbation en attente pour cette dépense.");
    const result = await this.workflow.approve((inst as any).id, comment, orgId, userId);
    if (result.status === "approved") {
      await this.postExpenseLedgerApproved(expenseId, orgId);
    }
    return { expenseId, approval: result };
  }
}
