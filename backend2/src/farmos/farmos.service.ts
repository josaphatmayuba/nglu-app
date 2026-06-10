import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { UsersService } from "../users/users.service";
import { roles } from "../database/schema";
import { departments, designations, farmosAiInsights, farmosAnimalPhotos, farmosAnimals, farmosDocuments, farmosDiseases, farmosExpenses, farmosFeedForecasts, farmosLookups, farmosMedicines, farmosMortalityEvents, farmosPriceList, farmosProductionLogs, farmosReproductionEvents, farmosSales, farmosSemenStraws, farmosTreatments, farmosVaccinations, farmosVetExams, farmosVetPrescriptions, farmosWorkLogs, suppliers, transactions, transactionTypes, users } from "../database/schema";
import type { Database } from "../database/types";
import { RealtimeDataPublisher } from "../realtime/realtime-data-publisher.service";
import type {
  CreateAnimalDto,
  CreateDiseaseDto,
  CreateExpenseDto,
  CreateMedicineDto,
  CreateProductionLogDto,
  CreateReproductionEventDto,
  CreateSaleDto,
  CreateSemenStrawDto,
  CreateTreatmentDto,
  UpdateAnimalDto,
  UpdateDiseaseDto,
  UpdateMedicineDto,
  UpdateSemenStrawDto,
  UpdateTreatmentDto,
  UpsertFarmosPriceDto,
} from "./dto/farmos.dto";
import { FARMOS_SPECIES, type FarmosSpecies } from "./dto/farmos.dto";

@Injectable()
export class FarmosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly usersService: UsersService,
    private readonly realtime: RealtimeDataPublisher,
  ) {}

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
      lastEvent: input.last_event ?? null,
    });
    const id = Number(result.insertId);
    await this.publishFarmosUpdate("createAnimal", ["animals"], "created", id, orgId);
    return this.getAnimal(id, orgId);
  }

  async updateAnimal(id: number, input: UpdateAnimalDto, orgId: number) {
    await this.getAnimal(id, orgId);
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
    if (input.last_event !== undefined) patch.lastEvent = input.last_event;
    if (Object.keys(patch).length === 0) return this.getAnimal(id, orgId);
    await this.db.update(farmosAnimals).set(patch).where(eq(farmosAnimals.id, id));
    await this.publishFarmosUpdate("updateAnimal", ["animals"], "updated", id, orgId);
    return this.getAnimal(id, orgId);
  }

  async deleteAnimal(id: number, orgId: number) {
    await this.getAnimal(id, orgId);
    await this.db.update(farmosAnimals).set({ isActive: 0 }).where(eq(farmosAnimals.id, id));
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
    return this.db
      .select()
      .from(farmosTreatments)
      .where(and(eq(farmosTreatments.organizationId, orgId), eq(farmosTreatments.isActive, 1)))
      .orderBy(desc(farmosTreatments.id));
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
      .select({ id: farmosAnimals.id, species: farmosAnimals.species })
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.id, input.animal_id), eq(farmosAnimals.organizationId, orgId)))
      .limit(1);
    if (!animal) throw new NotFoundException("Animal not found.");

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
    await this.recomputeAnimalWithdrawal(input.animal_id, orgId);
    await this.publishFarmosUpdate("createTreatment", ["treatments", "medicines", "animals"], "created", id, orgId);
    return this.getTreatment(id, orgId);
  }

  async updateTreatment(id: number, input: UpdateTreatmentDto, orgId: number) {
    const previous = await this.getTreatment(id, orgId);
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
      await this.applyAnimalSale(animal, Number(input.quantity), orgId);
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

  private async applyAnimalSale(animal: any, quantity: number, orgId: number) {
    const soldQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const currentCount = Number(animal.count ?? 0);
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

  async deleteSale(id: number, orgId: number) {
    const [row] = await this.db.select().from(farmosSales).where(and(eq(farmosSales.id, id), eq(farmosSales.organizationId, orgId))).limit(1);
    await this.db.update(farmosSales).set({ isActive: 0 }).where(and(eq(farmosSales.id, id), eq(farmosSales.organizationId, orgId)));
    if (row?.transactionId) {
      await this.db.update(transactions).set({ status: "false" }).where(eq(transactions.id, row.transactionId));
    }
    await this.publishFarmosUpdate("deleteSale", ["sales"], "deleted", id, orgId);
    return { message: "Vente supprimée." };
  }

  async createExpense(input: CreateExpenseDto, orgId: number) {
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
    await this.publishFarmosUpdate("createExpense", ["expenses", "medicines"], "created", res.id, orgId);
    return { id: res.id, transactionId: txId };
  }

  async deleteExpense(id: number, orgId: number) {
    const [row] = await this.db.select().from(farmosExpenses).where(and(eq(farmosExpenses.id, id), eq(farmosExpenses.organizationId, orgId))).limit(1);
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

  async createProductionLog(input: CreateProductionLogDto, orgId: number) {
    const [res] = await this.db.insert(farmosProductionLogs).values({
      organizationId: orgId,
      animalId: input.animal_id ?? null,
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
    const [res] = await this.db.insert(farmosVetExams).values({
      organizationId: orgId,
      animalId: input.animal_id ?? null,
      species: input.species ?? null,
      vet: input.vet ?? null,
      vetUserId: input.vet_user_id ?? null,
      examDate: input.exam_date,
      examType: input.exam_type ?? null,
      clinicalExam: input.clinical_exam ?? null,
      protocol: input.protocol ?? null,
      temperature: input.temperature != null ? String(input.temperature) : null,
      weight: input.weight != null ? String(input.weight) : null,
      diagnosis: input.diagnosis ?? null,
      notes: input.notes ?? null,
    }).$returningId();
    const examId = Number(res.id);
    await this.replacePrescriptions(examId, input.prescriptions, orgId);
    await this.publishFarmosUpdate("createVetExam", ["vetExams"], "created", examId, orgId);
    return this.getVetExam(examId, orgId);
  }

  async updateVetExam(id: number, input: any, orgId: number) {
    const exam = await this.getVetExam(id, orgId);
    if (exam.signedAt) throw new BadRequestException("Examen signé — modification interdite.");
    const patch: Record<string, unknown> = {};
    if (input.animal_id !== undefined) patch.animalId = input.animal_id;
    if (input.species !== undefined) patch.species = input.species;
    if (input.vet !== undefined) patch.vet = input.vet;
    if (input.vet_user_id !== undefined) patch.vetUserId = input.vet_user_id;
    if (input.exam_date !== undefined) patch.examDate = input.exam_date;
    if (input.exam_type !== undefined) patch.examType = input.exam_type;
    if (input.clinical_exam !== undefined) patch.clinicalExam = input.clinical_exam;
    if (input.protocol !== undefined) patch.protocol = input.protocol;
    if (input.temperature !== undefined) patch.temperature = input.temperature != null ? String(input.temperature) : null;
    if (input.weight !== undefined) patch.weight = input.weight != null ? String(input.weight) : null;
    if (input.diagnosis !== undefined) patch.diagnosis = input.diagnosis;
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
    await this.getVetExam(id, orgId);
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
    await this.getDocument(id, orgId);
    await this.db.update(farmosDocuments).set({ isActive: 0 }).where(eq(farmosDocuments.id, id));
    await this.publishFarmosUpdate("deleteDocument", ["documents"], "deleted", id, orgId);
    return { message: "Document supprimé." };
  }

  // ─── Rapports PDF (#3) — réutilise Puppeteer (déjà dép. via le module HR) ────
  private async htmlToPdf(html: string): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = require("puppeteer");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    // Le Dockerfile (Alpine) installe chromium ; selon la version le binaire est
    // /usr/bin/chromium ou /usr/bin/chromium-browser. On résout le 1er existant
    // (la var d'env peut pointer un chemin absent → crash 500).
    const candidates = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
    ].filter(Boolean) as string[];
    const executablePath = candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" } });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
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
      ${exam.clinicalExam ? `<div class="k">Examen clinique</div><div class="block">${this.esc(exam.clinicalExam)}</div>` : ""}
      ${exam.diagnosis ? `<div class="k">Diagnostic</div><div class="block">${this.esc(exam.diagnosis)}</div>` : ""}
      ${exam.protocol ? `<div class="k">Protocole</div><div class="block">${this.esc(exam.protocol)}</div>` : ""}
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

  async listMortalityEvents(orgId: number) {
    return this.db
      .select()
      .from(farmosMortalityEvents)
      .where(and(eq(farmosMortalityEvents.organizationId, orgId), eq(farmosMortalityEvents.isActive, 1)))
      .orderBy(desc(farmosMortalityEvents.eventDate));
  }

  async createMortalityEvent(input: any, orgId: number) {
    const [res] = await this.db.insert(farmosMortalityEvents).values({
      organizationId: orgId,
      animalId: input.animal_id ?? null,
      species: input.species,
      eventDate: input.event_date,
      count: input.count ?? 1,
      cause: input.cause ?? null,
      necropsyRequested: input.necropsy_requested ? 1 : 0,
      notes: input.notes ?? null,
    }).$returningId();
    // Marquer l'animal comme décédé si un ID précis est fourni.
    if (input.animal_id) {
      await this.db
        .update(farmosAnimals)
        .set({ status: "deceased" })
        .where(and(eq(farmosAnimals.id, input.animal_id), eq(farmosAnimals.organizationId, orgId)));
    }
    await this.publishFarmosUpdate("createMortalityEvent", ["mortalityEvents", "animals"], "created", res.id, orgId);
    return { id: res.id };
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
      })
      .from(users)
      .leftJoin(designations, eq(users.designationId, designations.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
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
        .select({ id: farmosAnimals.id, name: farmosAnimals.name, species: farmosAnimals.species, lot: farmosAnimals.lot })
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
          animalId: id, name: a.name, species: a.species, lot: a.lot,
          revenue, cost, profit: revenue - cost,
          costByCategory: costByCategory.get(id) ?? {},
        };
      })
      .filter((r) => r.revenue !== 0 || r.cost !== 0)
      .sort((x, y) => y.profit - x.profit);

    const lotMap = new Map<string, { lot: string; revenue: number; cost: number; count: number }>();
    for (const r of byAnimal) {
      const key = r.lot || "—";
      const agg = lotMap.get(key) ?? { lot: key, revenue: 0, cost: 0, count: 0 };
      agg.revenue += r.revenue; agg.cost += r.cost; agg.count += 1;
      lotMap.set(key, agg);
    }
    const byLot = Array.from(lotMap.values())
      .map((l) => ({ ...l, profit: l.revenue - l.cost }))
      .sort((x, y) => y.profit - x.profit);

    const totals = byAnimal.reduce(
      (acc, r) => ({ revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, profit: acc.profit + r.profit }),
      { revenue: 0, cost: 0, profit: 0 },
    );

    return { byAnimal, byLot, totals };
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
      return res.id;
    } catch (err) {
      console.warn("[FarmOS] syncExpenseToTransaction failed:", (err as Error).message);
      return null;
    }
  }
}
