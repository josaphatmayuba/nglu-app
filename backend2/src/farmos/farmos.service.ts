import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { farmosAnimals, farmosDiseases, farmosMedicines, farmosTreatments } from "../database/schema";
import type { Database } from "../database/types";
import type {
  CreateAnimalDto,
  CreateDiseaseDto,
  CreateMedicineDto,
  CreateTreatmentDto,
  UpdateAnimalDto,
  UpdateDiseaseDto,
  UpdateMedicineDto,
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
    if (Object.keys(patch).length === 0) return this.getMedicine(id, orgId);
    await this.db.update(farmosMedicines).set(patch).where(eq(farmosMedicines.id, id));
    return this.getMedicine(id, orgId);
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
}
