import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { departments, designations, farmosAiInsights, farmosAnimalPhotos, farmosAnimals, farmosDiseases, farmosExpenses, farmosFeedForecasts, farmosLookups, farmosMedicines, farmosProductionLogs, farmosReproductionEvents, farmosSales, farmosSemenStraws, farmosTreatments, farmosVaccinations, suppliers, transactions, transactionTypes, users } from "../database/schema";
import type { Database } from "../database/types";
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
} from "./dto/farmos.dto";

@Injectable()
export class FarmosService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

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
      status: input.status ?? "healthy",
      lastEvent: input.last_event ?? null,
    });
    return this.getAnimal(Number(result.insertId), orgId);
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
    if (input.status !== undefined) patch.status = input.status;
    if (input.last_event !== undefined) patch.lastEvent = input.last_event;
    if (Object.keys(patch).length === 0) return this.getAnimal(id, orgId);
    await this.db.update(farmosAnimals).set(patch).where(eq(farmosAnimals.id, id));
    return this.getAnimal(id, orgId);
  }

  async deleteAnimal(id: number, orgId: number) {
    await this.getAnimal(id, orgId);
    await this.db.update(farmosAnimals).set({ isActive: 0 }).where(eq(farmosAnimals.id, id));
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
    return this.getMedicine(Number(result.insertId), orgId);
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
    return this.getMedicine(id, orgId);
  }

  async listFeedForecasts(orgId: number) {
    return this.db
      .select()
      .from(farmosFeedForecasts)
      .where(and(eq(farmosFeedForecasts.organizationId, orgId), eq(farmosFeedForecasts.isActive, 1)))
      .orderBy(desc(farmosFeedForecasts.urgent), desc(farmosFeedForecasts.neededKg));
  }

  async deleteMedicine(id: number, orgId: number) {
    await this.getMedicine(id, orgId);
    await this.db.update(farmosMedicines).set({ isActive: 0 }).where(eq(farmosMedicines.id, id));
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
    return this.getTreatment(Number(result.insertId), orgId);
  }

  async updateTreatment(id: number, input: UpdateTreatmentDto, orgId: number) {
    await this.getTreatment(id, orgId);
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
    return this.getTreatment(id, orgId);
  }

  async deleteTreatment(id: number, orgId: number) {
    await this.getTreatment(id, orgId);
    await this.db.update(farmosTreatments).set({ isActive: 0 }).where(eq(farmosTreatments.id, id));
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
    return this.getDisease(Number(result.insertId), orgId);
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
    return this.getDisease(id, orgId);
  }

  async deleteDisease(id: number, orgId: number) {
    const disease = await this.getDisease(id, orgId);
    if (disease.organizationId === null) {
      throw new BadRequestException("Cannot delete a disease from the global catalogue.");
    }
    await this.db.update(farmosDiseases).set({ isActive: 0 }).where(eq(farmosDiseases.id, id));
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
    const [res] = await this.db.insert(farmosSales).values({
      organizationId: orgId,
      animalId: input.animal_id ?? null,
      species: input.species ?? null,
      productType: input.product_type ?? null,
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
    return { id: res.id, transactionId: txId };
  }

  async deleteSale(id: number, orgId: number) {
    const [row] = await this.db.select().from(farmosSales).where(and(eq(farmosSales.id, id), eq(farmosSales.organizationId, orgId))).limit(1);
    await this.db.update(farmosSales).set({ isActive: 0 }).where(and(eq(farmosSales.id, id), eq(farmosSales.organizationId, orgId)));
    if (row?.transactionId) {
      await this.db.update(transactions).set({ status: "false" }).where(eq(transactions.id, row.transactionId));
    }
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
    return { id: res.id, transactionId: txId };
  }

  async deleteExpense(id: number, orgId: number) {
    const [row] = await this.db.select().from(farmosExpenses).where(and(eq(farmosExpenses.id, id), eq(farmosExpenses.organizationId, orgId))).limit(1);
    await this.db.update(farmosExpenses).set({ isActive: 0 }).where(and(eq(farmosExpenses.id, id), eq(farmosExpenses.organizationId, orgId)));
    if (row?.transactionId) {
      await this.db.update(transactions).set({ status: "false" }).where(eq(transactions.id, row.transactionId));
    }
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
    return { id: res.id };
  }

  async deleteReproductionEvent(id: number, orgId: number) {
    await this.db.update(farmosReproductionEvents).set({ isActive: 0 }).where(and(eq(farmosReproductionEvents.id, id), eq(farmosReproductionEvents.organizationId, orgId)));
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
    return this.getSemenStraw(id, orgId);
  }

  async deleteSemenStraw(id: number, orgId: number) {
    await this.db.update(farmosSemenStraws).set({ status: "archived" })
      .where(and(eq(farmosSemenStraws.id, id), eq(farmosSemenStraws.organizationId, orgId)));
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
    return { id: res.id };
  }

  async deleteProductionLog(id: number, orgId: number) {
    await this.db.update(farmosProductionLogs).set({ isActive: 0 }).where(and(eq(farmosProductionLogs.id, id), eq(farmosProductionLogs.organizationId, orgId)));
    return { message: "Production supprimée." };
  }

  // ─── CRM ledger auto-sync (SCRUM-220) ───────────────────────────────────
  // Looks up a transaction_type configured by name ("FarmOS Sale" / "FarmOS Expense")
  // and creates a transaction with its debit/credit accounts. If the type isn't
  // configured for the organisation, sync is skipped silently (returns null).

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
    return { id: (result as any).insertId };
  }

  async deleteLookup(id: number, orgId: number) {
    await this.db
      .update(farmosLookups)
      .set({ isActive: 0 })
      .where(and(eq(farmosLookups.id, id), eq(farmosLookups.organizationId, orgId)));
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

  private async syncSaleToTransaction(saleId: number, input: CreateSaleDto, orgId: number): Promise<number | null> {
    try {
      const type = await this.findTransactionType("FarmOS Sale");
      if (!type) return null;
      const particulars = `Vente FarmOS · ${input.product_type ?? input.species ?? "produit"}${input.buyer ? ` · ${input.buyer}` : ""}`;
      const [res] = await this.db.insert(transactions).values({
        organizationId: orgId,
        date: new Date(input.sale_date) as any,
        debitId: type.debitAccountId,
        creditId: type.creditAccountId,
        particulars,
        amount: Number(input.total_amount),
        currencyId: input.currency_id ?? null,
        type: "FarmOS Sale",
        relatedId: `farmos_sale:${saleId}`,
      }).$returningId();
      return res.id;
    } catch (err) {
      console.warn("[FarmOS] syncSaleToTransaction failed:", (err as Error).message);
      return null;
    }
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
