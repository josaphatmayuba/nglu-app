import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { farmosAnimalOperations, farmosAnimals, farmosOperationTypes, farmosProductionLogs } from "../database/schema";
import type { Database } from "../database/types";
import { FarmosService } from "./farmos.service";
import type {
  BulkCreateAnimalOperationsDto,
  CreateAnimalOperationDto,
  CreateOperationTypeDto,
  UpdateAnimalOperationDto,
  UpdateOperationTypeDto,
} from "./dto/farmos.dto";

// Catalogue standard bootstrap (idempotent, jamais en migration — regle projet
// "pas de seed data dans les migrations"). species=null => toutes especes.
const STANDARD_OPERATION_TYPES: Array<{
  code: string;
  labelFr: string;
  labelEn: string;
  species: string[] | null;
  defaultUnit: string | null;
  requiresWithdrawal: boolean;
}> = [
  { code: "castration", labelFr: "Castration", labelEn: "Castration", species: ["pig", "cow", "goat", "sheep"], defaultUnit: null, requiresWithdrawal: false },
  { code: "shearing", labelFr: "Tonte", labelEn: "Shearing", species: ["sheep"], defaultUnit: "kg", requiresWithdrawal: false },
  { code: "dehorning", labelFr: "Écornage", labelEn: "Dehorning", species: ["cow", "goat"], defaultUnit: null, requiresWithdrawal: false },
  { code: "tagging", labelFr: "Pose de boucle", labelEn: "Tagging", species: null, defaultUnit: null, requiresWithdrawal: false },
  { code: "hoof_trimming", labelFr: "Taille des onglons", labelEn: "Hoof trimming", species: ["cow", "sheep", "goat"], defaultUnit: null, requiresWithdrawal: false },
  { code: "teeth_clipping", labelFr: "Épointage des dents", labelEn: "Teeth clipping", species: ["pig"], defaultUnit: null, requiresWithdrawal: false },
  { code: "tail_docking", labelFr: "Caudectomie", labelEn: "Tail docking", species: ["pig", "sheep"], defaultUnit: null, requiresWithdrawal: false },
  { code: "debeaking", labelFr: "Ébecquage", labelEn: "Debeaking", species: ["chicken", "duck", "turkey"], defaultUnit: null, requiresWithdrawal: false },
];

@Injectable()
export class FarmosOperationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly farmos: FarmosService,
  ) {}

  // ─── Catalogue des types d'operation ────────────────────────────────────

  async listOperationTypes(orgId: number, species?: string | null) {
    const rows = await this.db
      .select()
      .from(farmosOperationTypes)
      .where(and(eq(farmosOperationTypes.organizationId, orgId), eq(farmosOperationTypes.isActive, 1)))
      .orderBy(farmosOperationTypes.labelFr);
    if (!species) return rows;
    return rows.filter((r) => !r.species || (r.species as string[]).includes(species));
  }

  async getOperationType(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosOperationTypes)
      .where(and(eq(farmosOperationTypes.id, id), eq(farmosOperationTypes.organizationId, orgId)))
      .limit(1);
    if (!row) throw new NotFoundException("Operation type not found.");
    return row;
  }

  async createOperationType(input: CreateOperationTypeDto, orgId: number) {
    const [res] = await this.db.insert(farmosOperationTypes).values({
      organizationId: orgId,
      code: input.code,
      labelFr: input.label_fr ?? null,
      labelEn: input.label_en ?? null,
      species: (input.species ?? null) as any,
      defaultUnit: input.default_unit ?? null,
      requiresWithdrawal: input.requires_withdrawal ? 1 : 0,
    }).$returningId();
    return this.getOperationType(res.id, orgId);
  }

  async updateOperationType(id: number, input: UpdateOperationTypeDto, orgId: number) {
    await this.getOperationType(id, orgId);
    const patch: Record<string, unknown> = {};
    if (input.label_fr !== undefined) patch.labelFr = input.label_fr;
    if (input.label_en !== undefined) patch.labelEn = input.label_en;
    if (input.species !== undefined) patch.species = input.species;
    if (input.default_unit !== undefined) patch.defaultUnit = input.default_unit;
    if (input.requires_withdrawal !== undefined) patch.requiresWithdrawal = input.requires_withdrawal ? 1 : 0;
    if (Object.keys(patch).length) {
      await this.db.update(farmosOperationTypes).set(patch).where(eq(farmosOperationTypes.id, id));
    }
    return this.getOperationType(id, orgId);
  }

  async deleteOperationType(id: number, orgId: number) {
    await this.getOperationType(id, orgId);
    await this.db.update(farmosOperationTypes).set({ isActive: 0 }).where(eq(farmosOperationTypes.id, id));
    return { message: "Type d'opération supprimé." };
  }

  // Idempotent : n'insere que les codes absents pour l'organisation. Peut etre
  // rappele sans effet de bord si le catalogue est deja peuple/partiellement modifie.
  async bootstrapOperationTypes(orgId: number) {
    const existing = await this.db
      .select({ code: farmosOperationTypes.code })
      .from(farmosOperationTypes)
      .where(eq(farmosOperationTypes.organizationId, orgId));
    const existingCodes = new Set(existing.map((r) => r.code));
    const toInsert = STANDARD_OPERATION_TYPES.filter((t) => !existingCodes.has(t.code));
    for (const t of toInsert) {
      await this.db.insert(farmosOperationTypes).values({
        organizationId: orgId,
        code: t.code,
        labelFr: t.labelFr,
        labelEn: t.labelEn,
        species: t.species as any,
        defaultUnit: t.defaultUnit,
        requiresWithdrawal: t.requiresWithdrawal ? 1 : 0,
      });
    }
    return { inserted: toInsert.length, skipped: STANDARD_OPERATION_TYPES.length - toInsert.length };
  }

  // ─── Journal des operations ──────────────────────────────────────────────

  private async resolveOperationType(code: string, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosOperationTypes)
      .where(and(eq(farmosOperationTypes.code, code), eq(farmosOperationTypes.organizationId, orgId), eq(farmosOperationTypes.isActive, 1)))
      .limit(1);
    return row ?? null;
  }

  private assertSpeciesAllowed(operationType: { species: string[] | null } | null, species: string | null | undefined) {
    if (!operationType?.species) return; // catalogue ouvert a toutes especes, ou type inconnu (pas de restriction applicable)
    if (!species) return; // pas d'espece connue (acte de lot sans animal) : pas de blocage silencieux, mais rien a valider
    if (!operationType.species.includes(species)) {
      throw new BadRequestException(
        `Ce type d'opération n'est pas disponible pour l'espèce "${species}" (espèces autorisées: ${operationType.species.join(", ")}).`,
      );
    }
  }

  async listOperations(
    orgId: number,
    speciesScope: "all" | string[],
    filters: { from?: string; to?: string; code?: string; animalId?: number; lot?: string; species?: string } = {},
  ) {
    const speciesFilter =
      speciesScope === "all"
        ? undefined
        : speciesScope.length
          ? or(isNull(farmosAnimalOperations.species), inArray(farmosAnimalOperations.species, speciesScope))
          : sql`1 = 0`;

    const conditions = [
      eq(farmosAnimalOperations.organizationId, orgId),
      eq(farmosAnimalOperations.isActive, 1),
      speciesFilter,
    ];
    if (filters.from) conditions.push(gte(farmosAnimalOperations.operationDate, filters.from));
    if (filters.to) conditions.push(lte(farmosAnimalOperations.operationDate, filters.to));
    if (filters.code) conditions.push(eq(farmosAnimalOperations.operationCode, filters.code));
    if (filters.animalId != null) conditions.push(eq(farmosAnimalOperations.animalId, filters.animalId));
    if (filters.lot) conditions.push(eq(farmosAnimalOperations.lot, filters.lot));
    if (filters.species) conditions.push(eq(farmosAnimalOperations.species, filters.species));

    return this.db
      .select()
      .from(farmosAnimalOperations)
      .where(and(...conditions))
      .orderBy(desc(farmosAnimalOperations.operationDate), desc(farmosAnimalOperations.id));
  }

  async getOperation(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosAnimalOperations)
      .where(and(eq(farmosAnimalOperations.id, id), eq(farmosAnimalOperations.organizationId, orgId)))
      .limit(1);
    if (!row) throw new NotFoundException("Operation not found.");
    return row;
  }

  async listAnimalOperations(animalId: number, orgId: number) {
    return this.db
      .select()
      .from(farmosAnimalOperations)
      .where(and(
        eq(farmosAnimalOperations.animalId, animalId),
        eq(farmosAnimalOperations.organizationId, orgId),
        eq(farmosAnimalOperations.isActive, 1),
      ))
      .orderBy(desc(farmosAnimalOperations.operationDate));
  }

  // Cree la depense liee (via FarmosService.createExpense, jamais d'insert direct
  // dans farmos_expenses) et, pour la tonte, la ligne de production associee.
  private async createSideEffects(
    operationId: number,
    input: { operationCode: string; animalId: number | null; species: string | null; cost: number | null; currencyId: number | null; quantity: number | null; unit: string | null; buildingId: number | null; operationDate: string },
    orgId: number,
  ) {
    let expenseId: number | null = null;
    if (input.cost != null && Number(input.cost) > 0) {
      const created = await this.farmos.createExpense({
        category: "operation",
        description: `Opération: ${input.operationCode}`,
        amount: Number(input.cost),
        currency_id: input.currencyId ?? null,
        expense_date: input.operationDate,
        related_animal_id: input.animalId ?? null,
        notes: `Dépense générée par l'opération #${operationId} (${input.operationCode}).`,
      } as any, orgId);
      expenseId = created.id;
    }
    if (input.operationCode === "shearing" && input.quantity != null && Number(input.quantity) > 0) {
      await this.db.insert(farmosProductionLogs).values({
        organizationId: orgId,
        animalId: input.animalId ?? null,
        buildingId: input.buildingId ?? null,
        species: input.species ?? "sheep",
        productType: "wool",
        logDate: input.operationDate,
        quantity: String(input.quantity),
        unit: input.unit ?? "kg",
        notes: `Production générée par l'opération de tonte #${operationId}.`,
      });
    }
    return expenseId;
  }

  async createOperation(input: CreateAnimalOperationDto, orgId: number) {
    let animal: { id: number; species: string | null } | null = null;
    if (input.animal_id != null) {
      const a = await this.farmos.assertAnimalWritableByIdPublic(Number(input.animal_id), orgId);
      animal = a ? { id: Number(a.id), species: (a as any).species ?? null } : null;
    }
    const species = input.species ?? animal?.species ?? null;
    const operationType = await this.resolveOperationType(input.operation_code, orgId);
    this.assertSpeciesAllowed(operationType, species);

    const [res] = await this.db.insert(farmosAnimalOperations).values({
      organizationId: orgId,
      operationTypeId: operationType?.id ?? null,
      operationCode: input.operation_code,
      animalId: input.animal_id ?? null,
      lot: input.lot ?? null,
      buildingId: input.building_id ?? null,
      boxId: input.box_id ?? null,
      species: species ?? null,
      animalCount: input.animal_count ?? 1,
      operationDate: input.operation_date,
      performedBy: input.performed_by ?? null,
      performedByName: input.performed_by_name ?? null,
      result: input.result ?? null,
      quantity: input.quantity != null ? String(input.quantity) : null,
      unit: input.unit ?? operationType?.defaultUnit ?? null,
      cost: input.cost != null ? String(input.cost) : null,
      currencyId: input.currency_id ?? null,
      details: (input.details ?? null) as any,
      notes: input.notes ?? null,
    }).$returningId();

    const expenseId = await this.createSideEffects(res.id, {
      operationCode: input.operation_code,
      animalId: input.animal_id ?? null,
      species,
      cost: input.cost ?? null,
      currencyId: input.currency_id ?? null,
      quantity: input.quantity ?? null,
      unit: input.unit ?? operationType?.defaultUnit ?? null,
      buildingId: input.building_id ?? null,
      operationDate: input.operation_date,
    }, orgId);
    if (expenseId != null) {
      await this.db.update(farmosAnimalOperations).set({ expenseId }).where(and(eq(farmosAnimalOperations.id, res.id), eq(farmosAnimalOperations.organizationId, orgId)));
    }

    await this.farmos.publishFarmosUpdatePublic("createOperation", ["operations", "expenses", "animals"], "created", res.id, orgId);
    return this.getOperation(res.id, orgId);
  }

  // Acte de lot : N animaux, une transaction. Le cout total (si fourni) est
  // reparti proportionnellement en depenses individuelles pour rester coherent
  // avec le modele createExpense (related_animal_id).
  async bulkCreateOperations(input: BulkCreateAnimalOperationsDto, orgId: number) {
    if (!input.animal_ids?.length) throw new BadRequestException("animal_ids requis pour un acte de lot.");

    const animals = await this.db
      .select({ id: farmosAnimals.id, species: farmosAnimals.species, status: farmosAnimals.status })
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.organizationId, orgId), inArray(farmosAnimals.id, input.animal_ids)));
    const found = new Map(animals.map((a) => [Number(a.id), a]));
    const missing = input.animal_ids.filter((id) => !found.has(Number(id)));
    if (missing.length) throw new NotFoundException(`Animaux introuvables: ${missing.join(", ")}`);

    const operationType = await this.resolveOperationType(input.operation_code, orgId);
    for (const id of input.animal_ids) {
      const a = found.get(Number(id))!;
      await this.farmos.assertAnimalWritableByIdPublic(Number(id), orgId);
      this.assertSpeciesAllowed(operationType, a.species ?? null);
    }

    const perAnimalCost = input.cost != null && Number(input.cost) > 0 ? Number(input.cost) / input.animal_ids.length : null;
    const created: number[] = [];
    for (const id of input.animal_ids) {
      const a = found.get(Number(id))!;
      const [res] = await this.db.insert(farmosAnimalOperations).values({
        organizationId: orgId,
        operationTypeId: operationType?.id ?? null,
        operationCode: input.operation_code,
        animalId: Number(id),
        lot: input.lot ?? null,
        buildingId: input.building_id ?? null,
        boxId: input.box_id ?? null,
        species: a.species ?? null,
        animalCount: 1,
        operationDate: input.operation_date,
        performedBy: input.performed_by ?? null,
        performedByName: input.performed_by_name ?? null,
        result: input.result ?? null,
        quantity: input.quantity != null ? String(input.quantity) : null,
        unit: input.unit ?? operationType?.defaultUnit ?? null,
        cost: perAnimalCost != null ? String(perAnimalCost) : null,
        currencyId: input.currency_id ?? null,
        details: (input.details ?? null) as any,
        notes: input.notes ?? null,
      }).$returningId();

      const expenseId = await this.createSideEffects(res.id, {
        operationCode: input.operation_code,
        animalId: Number(id),
        species: a.species ?? null,
        cost: perAnimalCost,
        currencyId: input.currency_id ?? null,
        quantity: input.quantity ?? null,
        unit: input.unit ?? operationType?.defaultUnit ?? null,
        buildingId: input.building_id ?? null,
        operationDate: input.operation_date,
      }, orgId);
      if (expenseId != null) {
        await this.db.update(farmosAnimalOperations).set({ expenseId }).where(and(eq(farmosAnimalOperations.id, res.id), eq(farmosAnimalOperations.organizationId, orgId)));
      }
      created.push(res.id);
    }

    await this.farmos.publishFarmosUpdatePublic("bulkCreateOperations", ["operations", "expenses", "animals"], "created", created[0] ?? 0, orgId);
    return { created: created.length, ids: created };
  }

  async updateOperation(id: number, input: UpdateAnimalOperationDto, orgId: number) {
    const previous = await this.getOperation(id, orgId);
    if (previous.animalId != null) {
      await this.farmos.assertAnimalWritableByIdPublic(Number(previous.animalId), orgId);
    }
    if (input.animal_id !== undefined && Number(input.animal_id) !== Number(previous.animalId)) {
      await this.farmos.assertAnimalWritableByIdPublic(Number(input.animal_id), orgId);
    }
    const species = (previous as any).species ?? null;
    if (species) {
      const operationType = await this.resolveOperationType(previous.operationCode, orgId);
      this.assertSpeciesAllowed(operationType, species);
    }

    const patch: Record<string, unknown> = {};
    if (input.animal_id !== undefined) patch.animalId = input.animal_id;
    if (input.lot !== undefined) patch.lot = input.lot;
    if (input.building_id !== undefined) patch.buildingId = input.building_id;
    if (input.box_id !== undefined) patch.boxId = input.box_id;
    if (input.animal_count !== undefined) patch.animalCount = input.animal_count;
    if (input.operation_date !== undefined) patch.operationDate = input.operation_date;
    if (input.performed_by !== undefined) patch.performedBy = input.performed_by;
    if (input.performed_by_name !== undefined) patch.performedByName = input.performed_by_name;
    if (input.result !== undefined) patch.result = input.result;
    if (input.quantity !== undefined) patch.quantity = input.quantity != null ? String(input.quantity) : null;
    if (input.unit !== undefined) patch.unit = input.unit;
    if (input.cost !== undefined) patch.cost = input.cost != null ? String(input.cost) : null;
    if (input.currency_id !== undefined) patch.currencyId = input.currency_id;
    if (input.details !== undefined) patch.details = input.details as any;
    if (input.notes !== undefined) patch.notes = input.notes;

    if (Object.keys(patch).length) {
      await this.db.update(farmosAnimalOperations).set(patch).where(and(eq(farmosAnimalOperations.id, id), eq(farmosAnimalOperations.organizationId, orgId)));
    }
    await this.farmos.publishFarmosUpdatePublic("updateOperation", ["operations", "animals"], "updated", id, orgId);
    return this.getOperation(id, orgId);
  }

  async deleteOperation(id: number, orgId: number) {
    const previous = await this.getOperation(id, orgId);
    if (previous.animalId != null) {
      await this.farmos.assertAnimalWritableByIdPublic(Number(previous.animalId), orgId);
    }
    await this.db.update(farmosAnimalOperations).set({ isActive: 0 }).where(and(eq(farmosAnimalOperations.id, id), eq(farmosAnimalOperations.organizationId, orgId)));
    if (previous.expenseId) {
      await this.farmos.deleteExpense(Number(previous.expenseId), orgId).catch((e) =>
        console.warn("[FarmOS] delete linked expense on operation delete failed:", (e as Error).message));
    }
    await this.farmos.publishFarmosUpdatePublic("deleteOperation", ["operations", "expenses", "animals"], "deleted", id, orgId);
    return { message: "Opération supprimée." };
  }
}
