import { BadRequestException, GoneException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { and, desc, eq, getTableColumns, gte, inArray, lte, ne, notInArray, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { BatiproProjectScope } from "../auth/decorators/batipro-project-scope.decorator";
import {
  batiproBuildingLevels,
  batiproBuildingModels,
  appSettings,
  batiproAttendance,
  batiproChangeOrders,
  batiproCrews,
  batiproDocumentCounters,
  batiproDocumentLines,
  batiproDocumentTotals,
  batiproDocuments,
  batiproMaterials,
  batiproNotifications,
  batiproPhases,
  batiproProjectAssignments,
  batiproProjects,
  batiproSitePhotos,
  batiproSituations,
  batiproStockMovements,
  batiproSubcontractorLinks,
  batiproSubcontractors,
  batiproTasks,
  batiproWorkers,
  currencies,
  journalEntries,
  journalEntryLines,
  projects,
  subAccounts,
  suppliers,
} from "../database/schema";
import type { Database } from "../database/types";
import { readOrgAppSetting } from "../app-settings/org-app-setting";
import { LedgerService } from "../ledger/ledger.service";
import { ProjectsService } from "../projects/projects.service";
import { ObjectStorageService } from "../property-management/object-storage.service";
import { OcrService } from "./ocr.service";
import { parseSupplierDocument } from "./ocr-parser.util";
import { RealtimeDataPublisher } from "../realtime/realtime-data-publisher.service";
import type {
  BulkUpsertAttendanceDto,
  ConfirmBatiproDocumentDto,
  CreateBatiproBuildingLevelDto,
  CreateBatiproBuildingModelDto,
  CreateBatiproChangeOrderDto,
  CreateBatiproCrewDto,
  CreateBatiproDocumentDto,
  CreateBatiproMaterialDto,
  CreateBatiproPhaseDto,
  CreateBatiproProjectDto,
  CreateBatiproSituationDto,
  CreateBatiproSituationDocumentDto,
  CreateStockMovementDto,
  CreateBatiproSubcontractorDto,
  CreateBatiproTaskDto,
  CreateBatiproWorkerDto,
  CreateSubcontractorLinkDto,
  ReceiveBatiproDocumentDto,
  ReviewSubmissionDto,
  SubmitSubcontractorDocumentDto,
  UpdateBatiproAttendanceDto,
  UpdateBatiproBuildingLevelDto,
  UpdateBatiproBuildingModelDto,
  UpdateBatiproChangeOrderDto,
  UpdateBatiproCrewDto,
  UpdateBatiproDocumentDto,
  UpdateBatiproMaterialDto,
  UpdateBatiproPhaseDto,
  UpdateBatiproProjectDto,
  UpdateBatiproSituationDto,
  UpdateBatiproSitePhotoDto,
  UpdateBatiproSubcontractorDto,
  UpdateBatiproTaskDto,
  UpdateBatiproWorkerDto,
} from "./dto/batipro.dto";

@Injectable()
export class BatiproService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly realtime: RealtimeDataPublisher,
    private readonly objectStorage: ObjectStorageService,
    private readonly ledger: LedgerService,
    private readonly ocr: OcrService,
    private readonly projectsService: ProjectsService,
  ) {}

  // Resout le project_id du REGISTRE PARTAGE `projects` correspondant a un
  // chantier BatiPro (source_system='batipro', external_ref = id du chantier).
  // Best-effort : jamais bloquant pour la comptabilisation (null => pas de
  // dimension analytique sur les lignes). Sync prealable pour couvrir un
  // chantier tout juste cree (list()/ledgerReport() ne sont pas encore passes).
  private async resolveAnalyticProjectId(batiproProjectId: number | null | undefined, orgId: number) {
    if (!batiproProjectId) return undefined;
    try {
      await this.projectsService.ensureBatiproProjects(orgId);
      const [row] = await this.db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, orgId),
            eq(projects.sourceSystem, "batipro"),
            sql`${projects.externalRef} = cast(${batiproProjectId} as char) collate utf8mb4_0900_ai_ci`,
          ),
        )
        .limit(1);
      return row?.id ?? undefined;
    } catch {
      return undefined;
    }
  }

  // ── Helpers RBAC par chantier (BatiPro, Phase 2) ─────────────────────────
  // Filtre DIRECT sur l id du chantier (table batipro_projects). "all" => pas de
  // filtre ; liste vide => aucun resultat.
  private projectDirectFilter(column: any, scope: BatiproProjectScope) {
    if (scope === "all") return undefined;
    return scope.length ? inArray(column, scope) : sql`1 = 0`;
  }

  // Filtre VIA une colonne project_id (taches : project_id direct). Les lignes
  // sans project_id restent visibles (fail-open).
  private projectViaColumnFilter(projectIdColumn: any, scope: BatiproProjectScope) {
    if (scope === "all") return undefined;
    if (!scope.length) return sql`1 = 0`;
    return inArray(projectIdColumn, scope);
  }

  async dashboard(orgId: number, projectScope: BatiproProjectScope = "all") {
    const [projects, tasks, materials, crews] = await Promise.all([
      this.projects(orgId, projectScope),
      this.tasks(orgId, projectScope),
      this.materials(orgId),
      this.crews(orgId),
    ]);
    const totalBudget = projects.reduce((sum, project) => sum + Number(project.budget || 0), 0);
    const totalSpent = projects.reduce((sum, project) => sum + Number(project.spent || 0), 0);
    const averageProgress = projects.length
      ? Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / projects.length)
      : 0;
    return {
      metrics: {
        activeProjects: projects.filter((project) => project.status !== "Livre").length,
        totalBudget,
        totalSpent,
        averageProgress,
        blockedTasks: tasks.filter((task) => task.status === "Bloque").length,
      },
      projects,
      tasks,
      materials,
      crews,
    };
  }

  // Liste des chantiers pour les cartes/dashboard : renvoie les colonnes brutes
  // (budget/spent restent les valeurs saisies a la main, conservees telles quelles)
  // + cost_actual, calcule en batch (1 requete agregee, pas de N+1) de la meme
  // maniere que projectBudgetSummary (somme des paidAmount des bons de commande
  // actifs, hors annules), pour que la carte liste affiche le meme "decaisse reel"
  // que l'onglet Apercu du detail. reference_budget = contract_amount || budget,
  // meme regle que projectBudgetSummary.
  async projects(orgId: number, projectScope: BatiproProjectScope = "all") {
    const scopeFilter = this.projectDirectFilter(batiproProjects.id, projectScope);
    const rows = await this.db
      .select({
        ...getTableColumns(batiproProjects),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproProjects)
      .leftJoin(currencies, eq(currencies.id, batiproProjects.currencyId))
      .where(and(eq(batiproProjects.organizationId, orgId), eq(batiproProjects.isActive, 1), scopeFilter))
      .orderBy(desc(batiproProjects.id));

    if (!rows.length) return rows.map((r) => ({ ...r, cost_actual: 0, reference_budget: 0 }));

    const projectIds = rows.map((r) => r.id);
    // Meme filtre devise que projectBudgetSummary, mais applique par-projet via
    // une jointure sur batiproProjects pour rester en une seule requete batch.
    const costAgg = await this.db
      .select({
        projectId: batiproDocuments.projectId,
        paid: sql<string>`COALESCE(SUM(${batiproDocuments.paidAmount}), 0)`,
      })
      .from(batiproDocuments)
      .innerJoin(batiproProjects, eq(batiproProjects.id, batiproDocuments.projectId))
      .where(and(
        inArray(batiproDocuments.projectId, projectIds),
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.isActive, 1),
        eq(batiproDocuments.direction, "outbound"),
        eq(batiproDocuments.type, "purchase_order"),
        sql`${batiproDocuments.status} <> 'cancelled'`,
        sql`(${batiproDocuments.currencyId} = ${batiproProjects.currencyId} OR ${batiproDocuments.currencyId} IS NULL OR ${batiproProjects.currencyId} IS NULL)`,
      ))
      .groupBy(batiproDocuments.projectId);

    const costByProject = new Map<number, number>();
    for (const row of costAgg) {
      if (row.projectId != null) costByProject.set(row.projectId, Number(row.paid ?? 0));
    }

    return rows.map((r) => {
      const contractAmount = Number(r.contractAmount ?? 0);
      const budget = Number(r.budget ?? 0);
      return {
        ...r,
        cost_actual: costByProject.get(r.id) ?? 0,
        reference_budget: contractAmount || budget,
      };
    });
  }

  async getProject(id: number, orgId: number) {
    const [row] = await this.db
      .select({
        ...getTableColumns(batiproProjects),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproProjects)
      .leftJoin(currencies, eq(currencies.id, batiproProjects.currencyId))
      .where(and(eq(batiproProjects.id, id), eq(batiproProjects.organizationId, orgId), eq(batiproProjects.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Chantier introuvable.");
    // Si le marche n'a jamais ete saisi a la main sur le chantier, on retombe
    // sur le total du devis accepte (meme regle que projectBudgetSummary), pour
    // que l'onglet Avenants & sous-traitants n'affiche pas 0 par defaut.
    if (Number(row.contractAmount ?? 0) === 0) {
      const projectCurrencyId = row.currencyId ?? null;
      const sameCurrency = projectCurrencyId != null
        ? sql`(${batiproDocuments.currencyId} = ${projectCurrencyId} OR ${batiproDocuments.currencyId} IS NULL)`
        : sql`${batiproDocuments.currencyId} IS NULL`;
      const [quoteAgg] = await this.db
        .select({ total: sql<string>`COALESCE(SUM(${batiproDocuments.totalTtc}), 0)` })
        .from(batiproDocuments)
        .where(and(
          eq(batiproDocuments.projectId, id),
          eq(batiproDocuments.organizationId, orgId),
          eq(batiproDocuments.isActive, 1),
          eq(batiproDocuments.direction, "outbound"),
          eq(batiproDocuments.type, "quote"),
          eq(batiproDocuments.status, "accepted"),
          sameCurrency,
        ));
      const quoteAccepted = Number(quoteAgg?.total ?? 0);
      if (quoteAccepted > 0) row.contractAmount = String(quoteAccepted);
    }
    return row;
  }

  async createProject(input: CreateBatiproProjectDto, orgId: number) {
    const [result] = await this.db.insert(batiproProjects).values({
      organizationId: orgId,
      code: input.code,
      name: input.name,
      client: input.client ?? null,
      manager: input.manager ?? null,
      status: input.status ?? "Planifie",
      progress: input.progress ?? 0,
      budget: String(input.budget ?? 0),
      spent: String(input.spent ?? 0),
      currencyId: input.currency_id ?? null,
      contractAmount: String(input.contract_amount ?? 0),
      billedAmount: String(input.billed_amount ?? 0),
      startDate: input.start_date ?? null,
      dueDate: input.due_date ?? null,
      location: input.location ?? null,
      risk: input.risk ?? "Faible",
      notes: input.notes ?? null,
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createProject", ["projects"], "created", id, orgId);
    return this.getProject(id, orgId);
  }

  async updateProject(id: number, input: UpdateBatiproProjectDto, orgId: number) {
    await this.getProject(id, orgId);
    const patch: Partial<typeof batiproProjects.$inferInsert> = {};
    if (input.code !== undefined) patch.code = input.code;
    if (input.name !== undefined) patch.name = input.name;
    if (input.client !== undefined) patch.client = input.client || null;
    if (input.manager !== undefined) patch.manager = input.manager || null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.progress !== undefined) patch.progress = input.progress;
    if (input.budget !== undefined) patch.budget = String(input.budget);
    // spent/billed_amount ne sont plus editables a la main : calcules par projectBudgetSummary.
    if (input.currency_id !== undefined) patch.currencyId = input.currency_id ?? null;
    if (input.contract_amount !== undefined) patch.contractAmount = String(input.contract_amount);
    if (input.start_date !== undefined) patch.startDate = input.start_date || null;
    if (input.due_date !== undefined) patch.dueDate = input.due_date || null;
    if (input.location !== undefined) patch.location = input.location || null;
    if (input.risk !== undefined) patch.risk = input.risk;
    if (input.notes !== undefined) patch.notes = input.notes || null;
    if (Object.keys(patch).length) await this.db.update(batiproProjects).set(patch).where(eq(batiproProjects.id, id));
    await this.publish("updateProject", ["projects"], "updated", id, orgId);
    return this.getProject(id, orgId);
  }

  async deleteProject(id: number, orgId: number) {
    await this.getProject(id, orgId);
    await this.db.update(batiproProjects).set({ isActive: 0 }).where(and(eq(batiproProjects.id, id), eq(batiproProjects.organizationId, orgId)));
    await this.publish("deleteProject", ["projects"], "deleted", id, orgId);
    return { message: "Chantier supprime." };
  }

  tasks(orgId: number, projectScope: BatiproProjectScope = "all") {
    const scopeFilter = this.projectViaColumnFilter(batiproTasks.projectId, projectScope);
    return this.db
      .select()
      .from(batiproTasks)
      .where(and(eq(batiproTasks.organizationId, orgId), eq(batiproTasks.isActive, 1), scopeFilter))
      .orderBy(desc(batiproTasks.taskDate), desc(batiproTasks.id));
  }

  async getTask(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(batiproTasks)
      .where(and(eq(batiproTasks.id, id), eq(batiproTasks.organizationId, orgId), eq(batiproTasks.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Tache introuvable.");
    return row;
  }

  async createTask(input: CreateBatiproTaskDto, orgId: number) {
    const [result] = await this.db.insert(batiproTasks).values({
      organizationId: orgId,
      projectId: input.project_id ?? null,
      label: input.label,
      owner: input.owner ?? null,
      status: input.status ?? "Planifie",
      taskDate: input.task_date ?? null,
      priority: input.priority ?? "Normale",
      notes: input.notes ?? null,
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createTask", ["tasks"], "created", id, orgId);
    return this.getTask(id, orgId);
  }

  async updateTask(id: number, input: UpdateBatiproTaskDto, orgId: number) {
    await this.getTask(id, orgId);
    const patch: Partial<typeof batiproTasks.$inferInsert> = {};
    if (input.project_id !== undefined) patch.projectId = input.project_id || null;
    if (input.label !== undefined) patch.label = input.label;
    if (input.owner !== undefined) patch.owner = input.owner || null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.task_date !== undefined) patch.taskDate = input.task_date || null;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.notes !== undefined) patch.notes = input.notes || null;
    if (Object.keys(patch).length) await this.db.update(batiproTasks).set(patch).where(eq(batiproTasks.id, id));
    await this.publish("updateTask", ["tasks"], "updated", id, orgId);
    return this.getTask(id, orgId);
  }

  async deleteTask(id: number, orgId: number) {
    await this.getTask(id, orgId);
    await this.db.update(batiproTasks).set({ isActive: 0 }).where(and(eq(batiproTasks.id, id), eq(batiproTasks.organizationId, orgId)));
    await this.publish("deleteTask", ["tasks"], "deleted", id, orgId);
    return { message: "Tache supprimee." };
  }

  materials(orgId: number, projectId?: number) {
    if (projectId == null) {
      return this.db
        .select()
        .from(batiproMaterials)
        .where(and(eq(batiproMaterials.organizationId, orgId), eq(batiproMaterials.isActive, 1)))
        .orderBy(batiproMaterials.name);
    }
    return this.materialsWithProjectStock(orgId, projectId);
  }

  // Catalogue enrichi scope-projet : ne renvoie que les materiaux ayant au moins
  // un mouvement de stock sur ce chantier, avec recu/consomme/restant calcules
  // (SUM par movement_type ; adjustment inclus dans le restant).
  private async materialsWithProjectStock(orgId: number, projectId: number) {
    const rows = await this.db
      .select({
        ...getTableColumns(batiproMaterials),
        received: sql<string>`COALESCE(SUM(CASE WHEN ${batiproStockMovements.movementType} = 'reception' THEN ${batiproStockMovements.quantity} ELSE 0 END), 0)`,
        consumed: sql<string>`COALESCE(SUM(CASE WHEN ${batiproStockMovements.movementType} = 'consumption' THEN ${batiproStockMovements.quantity} ELSE 0 END), 0)`,
        adjusted: sql<string>`COALESCE(SUM(CASE WHEN ${batiproStockMovements.movementType} = 'adjustment' THEN ${batiproStockMovements.quantity} ELSE 0 END), 0)`,
      })
      .from(batiproMaterials)
      .innerJoin(batiproStockMovements, and(
        eq(batiproStockMovements.materialId, batiproMaterials.id),
        eq(batiproStockMovements.organizationId, orgId),
        eq(batiproStockMovements.projectId, projectId),
        eq(batiproStockMovements.isActive, 1),
      ))
      .where(and(eq(batiproMaterials.organizationId, orgId), eq(batiproMaterials.isActive, 1)))
      .groupBy(batiproMaterials.id)
      .orderBy(batiproMaterials.name);

    return rows.map((row) => {
      const received = Number(row.received);
      const consumed = Number(row.consumed);
      const adjusted = Number(row.adjusted);
      return {
        ...row,
        received,
        consumed,
        remaining: Math.round((received - consumed + adjusted) * 1000) / 1000,
      };
    });
  }

  async getMaterial(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(batiproMaterials)
      .where(and(eq(batiproMaterials.id, id), eq(batiproMaterials.organizationId, orgId), eq(batiproMaterials.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Materiau introuvable.");
    return row;
  }

  async createMaterial(input: CreateBatiproMaterialDto, orgId: number) {
    const [result] = await this.db.insert(batiproMaterials).values({
      organizationId: orgId,
      name: input.name,
      unit: input.unit ?? "unite",
      stock: String(input.stock ?? 0),
      minStock: String(input.min_stock ?? 0),
      reserved: String(input.reserved ?? 0),
      supplier: input.supplier ?? null,
      supplierId: input.supplier_id ?? null,
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createMaterial", ["materials"], "created", id, orgId);
    return this.getMaterial(id, orgId);
  }

  async updateMaterial(id: number, input: UpdateBatiproMaterialDto, orgId: number) {
    await this.getMaterial(id, orgId);
    const patch: Partial<typeof batiproMaterials.$inferInsert> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.unit !== undefined) patch.unit = input.unit;
    if (input.stock !== undefined) patch.stock = String(input.stock);
    if (input.min_stock !== undefined) patch.minStock = String(input.min_stock);
    if (input.reserved !== undefined) patch.reserved = String(input.reserved);
    if (input.supplier !== undefined) patch.supplier = input.supplier || null;
    if (input.supplier_id !== undefined) patch.supplierId = input.supplier_id || null;
    if (Object.keys(patch).length) await this.db.update(batiproMaterials).set(patch).where(eq(batiproMaterials.id, id));
    await this.publish("updateMaterial", ["materials"], "updated", id, orgId);
    return this.getMaterial(id, orgId);
  }

  async deleteMaterial(id: number, orgId: number) {
    await this.getMaterial(id, orgId);
    await this.db.update(batiproMaterials).set({ isActive: 0 }).where(and(eq(batiproMaterials.id, id), eq(batiproMaterials.organizationId, orgId)));
    await this.publish("deleteMaterial", ["materials"], "deleted", id, orgId);
    return { message: "Materiau supprime." };
  }

  // ── Mouvements de stock materiaux par chantier ──────────────────────────
  // Consommation manuelle uniquement (movement_type force serveur) : la
  // reception ne se cree QUE via receiveStockFromPurchaseOrder (emission BC).
  async createStockMovement(input: CreateStockMovementDto, orgId: number) {
    await this.getProject(input.project_id, orgId);
    await this.getMaterial(input.material_id, orgId);
    if (input.phase_id != null) await this.getPhase(input.phase_id, orgId);
    const [result] = await this.db.insert(batiproStockMovements).values({
      organizationId: orgId,
      projectId: input.project_id,
      materialId: input.material_id,
      phaseId: input.phase_id ?? null,
      movementType: "consumption",
      quantity: String(input.quantity),
      note: input.note ?? null,
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createStockMovement", ["stock_movements"], "created", id, orgId);
    return this.getStockMovement(id, orgId);
  }

  private async getStockMovement(id: number, orgId: number) {
    const [row] = await this.stockMovementsQuery(orgId).where(and(eq(batiproStockMovements.id, id), eq(batiproStockMovements.organizationId, orgId))).limit(1);
    if (!row) throw new NotFoundException("Mouvement de stock introuvable.");
    return row;
  }

  private stockMovementsQuery(orgId: number) {
    return this.db
      .select({
        ...getTableColumns(batiproStockMovements),
        materialName: batiproMaterials.name,
        materialUnit: batiproMaterials.unit,
        phaseLabel: batiproPhases.label,
      })
      .from(batiproStockMovements)
      .leftJoin(batiproMaterials, eq(batiproMaterials.id, batiproStockMovements.materialId))
      .leftJoin(batiproPhases, eq(batiproPhases.id, batiproStockMovements.phaseId));
  }

  // Historique des mouvements de stock d'un chantier, enrichi materiau/phase.
  stockMovements(orgId: number, projectId: number) {
    return this.stockMovementsQuery(orgId)
      .where(and(
        eq(batiproStockMovements.organizationId, orgId),
        eq(batiproStockMovements.projectId, projectId),
        eq(batiproStockMovements.isActive, 1),
      ))
      .orderBy(desc(batiproStockMovements.id));
  }

  crews(orgId: number) {
    return this.db
      .select()
      .from(batiproCrews)
      .where(and(eq(batiproCrews.organizationId, orgId), eq(batiproCrews.isActive, 1)))
      .orderBy(batiproCrews.name);
  }

  async getCrew(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(batiproCrews)
      .where(and(eq(batiproCrews.id, id), eq(batiproCrews.organizationId, orgId), eq(batiproCrews.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Equipe introuvable.");
    return row;
  }

  async createCrew(input: CreateBatiproCrewDto, orgId: number) {
    const [result] = await this.db.insert(batiproCrews).values({
      organizationId: orgId,
      name: input.name,
      people: input.people ?? 0,
      site: input.site ?? null,
      status: input.status ?? "Disponible",
      lead: input.lead ?? null,
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createCrew", ["crews"], "created", id, orgId);
    return this.getCrew(id, orgId);
  }

  async updateCrew(id: number, input: UpdateBatiproCrewDto, orgId: number) {
    await this.getCrew(id, orgId);
    const patch: Partial<typeof batiproCrews.$inferInsert> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.people !== undefined) patch.people = input.people;
    if (input.site !== undefined) patch.site = input.site || null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.lead !== undefined) patch.lead = input.lead || null;
    if (Object.keys(patch).length) await this.db.update(batiproCrews).set(patch).where(eq(batiproCrews.id, id));
    await this.publish("updateCrew", ["crews"], "updated", id, orgId);
    return this.getCrew(id, orgId);
  }

  async deleteCrew(id: number, orgId: number) {
    await this.getCrew(id, orgId);
    await this.db.update(batiproCrews).set({ isActive: 0 }).where(and(eq(batiproCrews.id, id), eq(batiproCrews.organizationId, orgId)));
    await this.publish("deleteCrew", ["crews"], "deleted", id, orgId);
    return { message: "Equipe supprimee." };
  }

  // ── Affectations chantier <-> utilisateur (RBAC par chantier, Phase 2) ────
  async listAllProjectAssignments(orgId: number) {
    const rows = await this.db
      .select({ userId: batiproProjectAssignments.userId, projectId: batiproProjectAssignments.projectId })
      .from(batiproProjectAssignments)
      .where(and(eq(batiproProjectAssignments.organizationId, orgId), eq(batiproProjectAssignments.isActive, 1)));
    const byUser: Record<number, number[]> = {};
    for (const r of rows) (byUser[r.userId] ??= []).push(r.projectId);
    return byUser;
  }

  async listProjectAssignments(userId: number, orgId: number) {
    return this.db
      .select({ id: batiproProjectAssignments.id, projectId: batiproProjectAssignments.projectId })
      .from(batiproProjectAssignments)
      .where(and(
        eq(batiproProjectAssignments.userId, userId),
        eq(batiproProjectAssignments.organizationId, orgId),
        eq(batiproProjectAssignments.isActive, 1),
      ));
  }

  // Remplace l ensemble des chantiers d un user (set complet). Soft-delete des
  // retires, reactivation/insert des nouveaux (idempotent).
  async setProjectAssignments(userId: number, projectIds: number[], orgId: number) {
    const wanted = Array.from(new Set(projectIds.filter((id) => Number.isInteger(id) && id > 0)));

    const existing = await this.db
      .select({ id: batiproProjectAssignments.id, projectId: batiproProjectAssignments.projectId, isActive: batiproProjectAssignments.isActive })
      .from(batiproProjectAssignments)
      .where(and(eq(batiproProjectAssignments.userId, userId), eq(batiproProjectAssignments.organizationId, orgId)));
    const byProject = new Map(existing.map((row) => [row.projectId, row]));

    for (const row of existing) {
      if (row.isActive === 1 && !wanted.includes(row.projectId)) {
        await this.db.update(batiproProjectAssignments).set({ isActive: 0 }).where(eq(batiproProjectAssignments.id, row.id));
      }
    }
    for (const pid of wanted) {
      const row = byProject.get(pid);
      if (row) {
        if (row.isActive !== 1) {
          await this.db.update(batiproProjectAssignments).set({ isActive: 1 }).where(eq(batiproProjectAssignments.id, row.id));
        }
      } else {
        await this.db.insert(batiproProjectAssignments).values({ userId, projectId: pid, organizationId: orgId, isActive: 1 });
      }
    }
    return this.listProjectAssignments(userId, orgId);
  }

  // ── Phases de chantier ─────────────────────────────────────────────────
  phases(orgId: number, projectId?: number) {
    return this.db
      .select()
      .from(batiproPhases)
      .where(and(eq(batiproPhases.organizationId, orgId), eq(batiproPhases.isActive, 1), projectId ? eq(batiproPhases.projectId, projectId) : undefined))
      .orderBy(batiproPhases.projectId, batiproPhases.position);
  }

  async getPhase(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(batiproPhases)
      .where(and(eq(batiproPhases.id, id), eq(batiproPhases.organizationId, orgId), eq(batiproPhases.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Phase introuvable.");
    return row;
  }

  async createPhase(input: CreateBatiproPhaseDto, orgId: number) {
    const [result] = await this.db.insert(batiproPhases).values({
      organizationId: orgId,
      projectId: input.project_id,
      label: input.label,
      position: input.position ?? 0,
      status: input.status ?? "A_venir",
      progress: input.progress ?? 0,
      startDate: input.start_date ?? null,
      endDate: input.end_date ?? null,
      plannedBudget: input.planned_budget != null ? String(input.planned_budget) : null,
      currencyId: input.currency_id ?? null,
      plannedDurationDays: input.planned_duration_days ?? null,
      capMode: input.cap_mode ?? "planning",
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createPhase", ["phases"], "created", id, orgId);
    return this.getPhase(id, orgId);
  }

  async updatePhase(id: number, input: UpdateBatiproPhaseDto, orgId: number) {
    await this.getPhase(id, orgId);
    const patch: Partial<typeof batiproPhases.$inferInsert> = {};
    if (input.project_id !== undefined) patch.projectId = input.project_id;
    if (input.label !== undefined) patch.label = input.label;
    if (input.position !== undefined) patch.position = input.position;
    if (input.status !== undefined) patch.status = input.status;
    if (input.progress !== undefined) patch.progress = input.progress;
    if (input.start_date !== undefined) patch.startDate = input.start_date || null;
    if (input.end_date !== undefined) patch.endDate = input.end_date || null;
    if (input.planned_budget !== undefined) patch.plannedBudget = input.planned_budget != null ? String(input.planned_budget) : null;
    if (input.currency_id !== undefined) patch.currencyId = input.currency_id ?? null;
    if (input.planned_duration_days !== undefined) patch.plannedDurationDays = input.planned_duration_days ?? null;
    if (input.cap_mode !== undefined) patch.capMode = input.cap_mode;
    if (Object.keys(patch).length) await this.db.update(batiproPhases).set(patch).where(eq(batiproPhases.id, id));
    await this.publish("updatePhase", ["phases"], "updated", id, orgId);
    return this.getPhase(id, orgId);
  }

  async deletePhase(id: number, orgId: number) {
    await this.getPhase(id, orgId);
    await this.db.update(batiproPhases).set({ isActive: 0 }).where(and(eq(batiproPhases.id, id), eq(batiproPhases.organizationId, orgId)));
    await this.publish("deletePhase", ["phases"], "deleted", id, orgId);
    return { message: "Phase supprimee." };
  }

  // ── Situations de facturation (LEGACY) ─────────────────────────────────
  // @deprecated Fusionne vers le socle documentaire (batipro_documents type=situation)
  // par la migration 0228. Les enregistrements legacy sont soft-deleted (is_active=0)
  // donc ces methodes renvoient vide en pratique. Conservees pour retro-compat mobile.
  situations(orgId: number, projectId?: number) {
    return this.db
      .select({
        ...getTableColumns(batiproSituations),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproSituations)
      .leftJoin(currencies, eq(currencies.id, batiproSituations.currencyId))
      .where(and(eq(batiproSituations.organizationId, orgId), eq(batiproSituations.isActive, 1), projectId ? eq(batiproSituations.projectId, projectId) : undefined))
      .orderBy(desc(batiproSituations.projectId), desc(batiproSituations.number));
  }

  async getSituation(id: number, orgId: number) {
    const [row] = await this.db
      .select({
        ...getTableColumns(batiproSituations),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproSituations)
      .leftJoin(currencies, eq(currencies.id, batiproSituations.currencyId))
      .where(and(eq(batiproSituations.id, id), eq(batiproSituations.organizationId, orgId), eq(batiproSituations.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Situation introuvable.");
    return row;
  }

  async createSituation(input: CreateBatiproSituationDto, orgId: number) {
    const [result] = await this.db.insert(batiproSituations).values({
      organizationId: orgId,
      projectId: input.project_id,
      number: input.number,
      period: input.period ?? null,
      progress: input.progress ?? 0,
      amount: String(input.amount ?? 0),
      currencyId: input.currency_id ?? null,
      status: input.status ?? "En_validation",
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createSituation", ["situations"], "created", id, orgId);
    return this.getSituation(id, orgId);
  }

  async updateSituation(id: number, input: UpdateBatiproSituationDto, orgId: number) {
    await this.getSituation(id, orgId);
    const patch: Partial<typeof batiproSituations.$inferInsert> = {};
    if (input.project_id !== undefined) patch.projectId = input.project_id;
    if (input.number !== undefined) patch.number = input.number;
    if (input.period !== undefined) patch.period = input.period || null;
    if (input.progress !== undefined) patch.progress = input.progress;
    if (input.amount !== undefined) patch.amount = String(input.amount);
    if (input.currency_id !== undefined) patch.currencyId = input.currency_id ?? null;
    if (input.status !== undefined) patch.status = input.status;
    if (Object.keys(patch).length) await this.db.update(batiproSituations).set(patch).where(eq(batiproSituations.id, id));
    await this.publish("updateSituation", ["situations"], "updated", id, orgId);
    return this.getSituation(id, orgId);
  }

  async deleteSituation(id: number, orgId: number) {
    await this.getSituation(id, orgId);
    await this.db.update(batiproSituations).set({ isActive: 0 }).where(and(eq(batiproSituations.id, id), eq(batiproSituations.organizationId, orgId)));
    await this.publish("deleteSituation", ["situations"], "deleted", id, orgId);
    return { message: "Situation supprimee." };
  }

  // ── Avenants / ordres de changement ────────────────────────────────────
  changeOrders(orgId: number, projectId?: number) {
    return this.db
      .select({
        ...getTableColumns(batiproChangeOrders),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproChangeOrders)
      .leftJoin(currencies, eq(currencies.id, batiproChangeOrders.currencyId))
      .where(and(eq(batiproChangeOrders.organizationId, orgId), eq(batiproChangeOrders.isActive, 1), projectId ? eq(batiproChangeOrders.projectId, projectId) : undefined))
      .orderBy(desc(batiproChangeOrders.id));
  }

  async getChangeOrder(id: number, orgId: number) {
    const [row] = await this.db
      .select({
        ...getTableColumns(batiproChangeOrders),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproChangeOrders)
      .leftJoin(currencies, eq(currencies.id, batiproChangeOrders.currencyId))
      .where(and(eq(batiproChangeOrders.id, id), eq(batiproChangeOrders.organizationId, orgId), eq(batiproChangeOrders.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Avenant introuvable.");
    return row;
  }

  async createChangeOrder(input: CreateBatiproChangeOrderDto, orgId: number) {
    const [result] = await this.db.insert(batiproChangeOrders).values({
      organizationId: orgId,
      projectId: input.project_id,
      reference: input.reference ?? null,
      title: input.title,
      amount: String(input.amount ?? 0),
      currencyId: input.currency_id ?? null,
      delayDays: input.delay_days ?? 0,
      status: input.status ?? "En_attente",
      notes: input.notes ?? null,
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createChangeOrder", ["change_orders"], "created", id, orgId);
    return this.getChangeOrder(id, orgId);
  }

  async updateChangeOrder(id: number, input: UpdateBatiproChangeOrderDto, orgId: number) {
    await this.getChangeOrder(id, orgId);
    const patch: Partial<typeof batiproChangeOrders.$inferInsert> = {};
    if (input.project_id !== undefined) patch.projectId = input.project_id;
    if (input.title !== undefined) patch.title = input.title;
    if (input.reference !== undefined) patch.reference = input.reference || null;
    if (input.amount !== undefined) patch.amount = String(input.amount);
    if (input.currency_id !== undefined) patch.currencyId = input.currency_id ?? null;
    if (input.delay_days !== undefined) patch.delayDays = input.delay_days;
    if (input.status !== undefined) patch.status = input.status;
    if (input.notes !== undefined) patch.notes = input.notes || null;
    if (Object.keys(patch).length) await this.db.update(batiproChangeOrders).set(patch).where(eq(batiproChangeOrders.id, id));
    await this.publish("updateChangeOrder", ["change_orders"], "updated", id, orgId);
    return this.getChangeOrder(id, orgId);
  }

  async deleteChangeOrder(id: number, orgId: number) {
    await this.getChangeOrder(id, orgId);
    await this.db.update(batiproChangeOrders).set({ isActive: 0 }).where(and(eq(batiproChangeOrders.id, id), eq(batiproChangeOrders.organizationId, orgId)));
    await this.publish("deleteChangeOrder", ["change_orders"], "deleted", id, orgId);
    return { message: "Avenant supprime." };
  }

  // ── Sous-traitants ──────────────────────────────────────────────────────
  subcontractors(orgId: number) {
    return this.db
      .select({
        ...getTableColumns(batiproSubcontractors),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproSubcontractors)
      .leftJoin(currencies, eq(currencies.id, batiproSubcontractors.currencyId))
      .where(and(eq(batiproSubcontractors.organizationId, orgId), eq(batiproSubcontractors.isActive, 1)))
      .orderBy(batiproSubcontractors.name);
  }

  async getSubcontractor(id: number, orgId: number) {
    const [row] = await this.db
      .select({
        ...getTableColumns(batiproSubcontractors),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproSubcontractors)
      .leftJoin(currencies, eq(currencies.id, batiproSubcontractors.currencyId))
      .where(and(eq(batiproSubcontractors.id, id), eq(batiproSubcontractors.organizationId, orgId), eq(batiproSubcontractors.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Sous-traitant introuvable.");
    return row;
  }

  async createSubcontractor(input: CreateBatiproSubcontractorDto, orgId: number) {
    const [result] = await this.db.insert(batiproSubcontractors).values({
      organizationId: orgId,
      projectId: input.project_id ?? null,
      supplierId: input.supplier_id ?? null,
      name: input.name,
      trade: input.trade ?? null,
      contractAmount: String(input.contract_amount ?? 0),
      currencyId: input.currency_id ?? null,
      status: input.status ?? "En_cours",
      rating: input.rating != null ? String(input.rating) : null,
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createSubcontractor", ["subcontractors"], "created", id, orgId);
    return this.getSubcontractor(id, orgId);
  }

  async updateSubcontractor(id: number, input: UpdateBatiproSubcontractorDto, orgId: number) {
    await this.getSubcontractor(id, orgId);
    const patch: Partial<typeof batiproSubcontractors.$inferInsert> = {};
    if (input.project_id !== undefined) patch.projectId = input.project_id ?? null;
    if (input.supplier_id !== undefined) patch.supplierId = input.supplier_id ?? null;
    if (input.name !== undefined) patch.name = input.name;
    if (input.trade !== undefined) patch.trade = input.trade || null;
    if (input.contract_amount !== undefined) patch.contractAmount = String(input.contract_amount);
    if (input.currency_id !== undefined) patch.currencyId = input.currency_id ?? null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.rating !== undefined) patch.rating = input.rating != null ? String(input.rating) : null;
    if (Object.keys(patch).length) await this.db.update(batiproSubcontractors).set(patch).where(eq(batiproSubcontractors.id, id));
    await this.publish("updateSubcontractor", ["subcontractors"], "updated", id, orgId);
    return this.getSubcontractor(id, orgId);
  }

  async deleteSubcontractor(id: number, orgId: number) {
    await this.getSubcontractor(id, orgId);
    await this.db.update(batiproSubcontractors).set({ isActive: 0 }).where(and(eq(batiproSubcontractors.id, id), eq(batiproSubcontractors.organizationId, orgId)));
    await this.publish("deleteSubcontractor", ["subcontractors"], "deleted", id, orgId);
    return { message: "Sous-traitant supprime." };
  }

  // ── Modele architectural 3D (Plan 3D par chantier) ──────────────────────
  // Renvoie le modele du chantier + ses niveaux actifs (ou null si aucun).
  async buildingModel(orgId: number, projectId: number) {
    const [model] = await this.db
      .select()
      .from(batiproBuildingModels)
      .where(and(eq(batiproBuildingModels.projectId, projectId), eq(batiproBuildingModels.organizationId, orgId), eq(batiproBuildingModels.isActive, 1)))
      .limit(1);
    if (!model) return null;
    const levels = await this.db
      .select()
      .from(batiproBuildingLevels)
      .where(and(eq(batiproBuildingLevels.modelId, model.id), eq(batiproBuildingLevels.organizationId, orgId), eq(batiproBuildingLevels.isActive, 1)))
      .orderBy(batiproBuildingLevels.levelIndex);
    return { ...model, levels };
  }

  private async getBuildingModel(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(batiproBuildingModels)
      .where(and(eq(batiproBuildingModels.id, id), eq(batiproBuildingModels.organizationId, orgId), eq(batiproBuildingModels.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Modele 3D introuvable.");
    return row;
  }

  async createBuildingModel(input: CreateBatiproBuildingModelDto, orgId: number) {
    // Garde-fou : un seul modele actif par chantier.
    const existing = await this.buildingModel(orgId, input.project_id);
    if (existing) return existing;
    const [result] = await this.db.insert(batiproBuildingModels).values({
      organizationId: orgId,
      projectId: input.project_id,
      sourceType: input.source_type ?? "parametric",
      name: input.name ?? null,
      unit: input.unit ?? "m",
      storeyHeight: String(input.storey_height ?? 2.8),
      roofType: input.roof_type ?? "flat",
      notes: input.notes ?? null,
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createBuildingModel", ["building_model"], "created", id, orgId);
    return this.buildingModel(orgId, input.project_id);
  }

  async updateBuildingModel(id: number, input: UpdateBatiproBuildingModelDto, orgId: number) {
    const model = await this.getBuildingModel(id, orgId);
    const patch: Partial<typeof batiproBuildingModels.$inferInsert> = {};
    if (input.source_type !== undefined) patch.sourceType = input.source_type;
    if (input.name !== undefined) patch.name = input.name || null;
    if (input.unit !== undefined) patch.unit = input.unit;
    if (input.storey_height !== undefined) patch.storeyHeight = String(input.storey_height);
    if (input.roof_type !== undefined) patch.roofType = input.roof_type;
    if (input.notes !== undefined) patch.notes = input.notes || null;
    if (Object.keys(patch).length) await this.db.update(batiproBuildingModels).set(patch).where(eq(batiproBuildingModels.id, id));
    await this.publish("updateBuildingModel", ["building_model"], "updated", id, orgId);
    return this.buildingModel(orgId, model.projectId);
  }

  async deleteBuildingModel(id: number, orgId: number) {
    await this.getBuildingModel(id, orgId);
    await this.db.update(batiproBuildingModels).set({ isActive: 0 }).where(and(eq(batiproBuildingModels.id, id), eq(batiproBuildingModels.organizationId, orgId)));
    // Soft-delete en cascade des niveaux.
    await this.db.update(batiproBuildingLevels).set({ isActive: 0 }).where(and(eq(batiproBuildingLevels.modelId, id), eq(batiproBuildingLevels.organizationId, orgId)));
    await this.publish("deleteBuildingModel", ["building_model", "building_levels"], "deleted", id, orgId);
    return { message: "Modele 3D supprime." };
  }

  // Import du plan de l'architecte (image/PDF) sur le modele du chantier.
  // Stocke le fichier tel quel dans MinIO ; le modele bascule source_type='imported'.
  async uploadModelPlan(id: number, file: any, orgId: number) {
    const model = await this.getBuildingModel(id, orgId);
    const stored = await this.objectStorage.putDocument(file, `batipro/plans/${orgId}/${model.projectId}`);
    // Remplace un ancien fichier eventuel.
    if (model.importedFileKey) {
      try { await this.objectStorage.deleteObject(model.importedFileKey); } catch { /* best-effort */ }
    }
    await this.db.update(batiproBuildingModels).set({
      sourceType: "imported",
      importedFileKey: stored.objectKey,
      importedFileFormat: stored.mimeType === "application/pdf" ? "pdf" : (stored.mimeType.split("/")[1] || null),
      importedFileSize: stored.sizeBytes,
    }).where(eq(batiproBuildingModels.id, id));
    await this.publish("uploadModelPlan", ["building_model"], "updated", id, orgId);
    return this.buildingModel(orgId, model.projectId);
  }

  async modelPlanFile(id: number, orgId: number) {
    const model = await this.getBuildingModel(id, orgId);
    if (!model.importedFileKey) throw new NotFoundException("Aucun plan importe.");
    const object = await this.objectStorage.getObject(model.importedFileKey);
    return { ...object, mimeType: object.contentType };
  }

  async deleteModelPlan(id: number, orgId: number) {
    const model = await this.getBuildingModel(id, orgId);
    if (model.importedFileKey) {
      try { await this.objectStorage.deleteObject(model.importedFileKey); } catch { /* best-effort */ }
    }
    await this.db.update(batiproBuildingModels).set({
      sourceType: "parametric",
      importedFileKey: null,
      importedFileFormat: null,
      importedFileSize: null,
    }).where(eq(batiproBuildingModels.id, id));
    await this.publish("deleteModelPlan", ["building_model"], "updated", id, orgId);
    return this.buildingModel(orgId, model.projectId);
  }

  // Import du plan de l'architecte (image/PDF) PROPRE A UN ETAGE. Le PDF du RDC
  // n'est pas celui du R+1 : chaque niveau a son propre fichier (contrairement a
  // uploadModelPlan ci-dessus, garde en fallback legacy pour les modeles migres).
  async uploadLevelPlan(levelId: number, file: any, orgId: number) {
    const level = await this.getBuildingLevel(levelId, orgId);
    const stored = await this.objectStorage.putDocument(file, `batipro/plans/${orgId}/${level.projectId}/levels/${levelId}`);
    if (level.importedFileKey) {
      try { await this.objectStorage.deleteObject(level.importedFileKey); } catch { /* best-effort */ }
    }
    await this.db.update(batiproBuildingLevels).set({
      importedFileKey: stored.objectKey,
      importedFileFormat: stored.mimeType === "application/pdf" ? "pdf" : (stored.mimeType.split("/")[1] || null),
      importedFileSize: stored.sizeBytes,
    }).where(eq(batiproBuildingLevels.id, levelId));
    await this.publish("uploadLevelPlan", ["building_levels"], "updated", levelId, orgId);
    return this.getBuildingLevel(levelId, orgId);
  }

  async levelPlanFile(levelId: number, orgId: number) {
    const level = await this.getBuildingLevel(levelId, orgId);
    if (!level.importedFileKey) throw new NotFoundException("Aucun plan importe pour cet etage.");
    const object = await this.objectStorage.getObject(level.importedFileKey);
    return { ...object, mimeType: object.contentType };
  }

  async deleteLevelPlan(levelId: number, orgId: number) {
    const level = await this.getBuildingLevel(levelId, orgId);
    if (level.importedFileKey) {
      try { await this.objectStorage.deleteObject(level.importedFileKey); } catch { /* best-effort */ }
    }
    await this.db.update(batiproBuildingLevels).set({
      importedFileKey: null,
      importedFileFormat: null,
      importedFileSize: null,
    }).where(eq(batiproBuildingLevels.id, levelId));
    await this.publish("deleteLevelPlan", ["building_levels"], "updated", levelId, orgId);
    return this.getBuildingLevel(levelId, orgId);
  }

  private async getBuildingLevel(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(batiproBuildingLevels)
      .where(and(eq(batiproBuildingLevels.id, id), eq(batiproBuildingLevels.organizationId, orgId), eq(batiproBuildingLevels.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Niveau introuvable.");
    return row;
  }

  async createBuildingLevel(input: CreateBatiproBuildingLevelDto, orgId: number) {
    // Verifie que le modele parent appartient bien a l'org.
    await this.getBuildingModel(input.model_id, orgId);
    const [result] = await this.db.insert(batiproBuildingLevels).values({
      organizationId: orgId,
      modelId: input.model_id,
      projectId: input.project_id,
      levelIndex: input.level_index ?? 0,
      label: input.label ?? null,
      elevation: String(input.elevation ?? 0),
      height: input.height != null ? String(input.height) : null,
      geometry: input.geometry ?? null,
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createBuildingLevel", ["building_levels"], "created", id, orgId);
    return this.getBuildingLevel(id, orgId);
  }

  async updateBuildingLevel(id: number, input: UpdateBatiproBuildingLevelDto, orgId: number) {
    await this.getBuildingLevel(id, orgId);
    const patch: Partial<typeof batiproBuildingLevels.$inferInsert> = {};
    if (input.level_index !== undefined) patch.levelIndex = input.level_index;
    if (input.label !== undefined) patch.label = input.label || null;
    if (input.elevation !== undefined) patch.elevation = String(input.elevation);
    if (input.height !== undefined) patch.height = input.height != null ? String(input.height) : null;
    if (input.geometry !== undefined) patch.geometry = input.geometry ?? null;
    if (Object.keys(patch).length) await this.db.update(batiproBuildingLevels).set(patch).where(eq(batiproBuildingLevels.id, id));
    await this.publish("updateBuildingLevel", ["building_levels"], "updated", id, orgId);
    return this.getBuildingLevel(id, orgId);
  }

  async deleteBuildingLevel(id: number, orgId: number) {
    await this.getBuildingLevel(id, orgId);
    await this.db.update(batiproBuildingLevels).set({ isActive: 0 }).where(and(eq(batiproBuildingLevels.id, id), eq(batiproBuildingLevels.organizationId, orgId)));
    await this.publish("deleteBuildingLevel", ["building_levels"], "deleted", id, orgId);
    return { message: "Niveau supprime." };
  }

  // ── Portail sous-traitant : liens a token opaque (Phase 0) ───────────────
  // Cree un lien partageable (token opaque multi-usage jusqu'a expiration).
  // subcontractor_id present = lien nominatif, sinon lien generique par chantier.
  async createSubcontractorLink(input: CreateSubcontractorLinkDto, orgId: number) {
    // Verifie que le chantier appartient bien a l'org (anti-fuite inter-org).
    await this.getProject(input.project_id, orgId);
    if (input.subcontractor_id != null) await this.getSubcontractor(input.subcontractor_id, orgId);
    const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 8);
    const days = input.expiry_days ?? 7;
    const [result] = await this.db.insert(batiproSubcontractorLinks).values({
      organizationId: orgId,
      projectId: input.project_id,
      subcontractorId: input.subcontractor_id ?? null,
      token,
      expiry: sql`DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ${days} DAY)` as any,
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createSubcontractorLink", ["subcontractor_links"], "created", id, orgId);
    return { id, token, projectId: input.project_id, subcontractorId: input.subcontractor_id ?? null };
  }

  // Resout un token public : lien actif + non expire. Ne renvoie QUE le contexte
  // strict necessaire au formulaire (aucune fuite de donnees chantier/org).
  private async resolveLink(token: string) {
    const [link] = await this.db
      .select()
      .from(batiproSubcontractorLinks)
      .where(and(eq(batiproSubcontractorLinks.token, token), eq(batiproSubcontractorLinks.isActive, 1)))
      .limit(1);
    if (!link) throw new NotFoundException("Lien introuvable ou revoque.");
    if (link.expiry && new Date(link.expiry).getTime() < Date.now()) {
      throw new GoneException("Ce lien a expire.");
    }
    return link;
  }

  async getSubcontractorLinkContext(token: string) {
    const link = await this.resolveLink(token);
    const [project] = await this.db
      .select({ id: batiproProjects.id, name: batiproProjects.name, currencyId: batiproProjects.currencyId, currencyCode: currencies.currencyCode, currencySymbol: currencies.currencySymbol })
      .from(batiproProjects)
      .leftJoin(currencies, eq(currencies.id, batiproProjects.currencyId))
      .where(and(eq(batiproProjects.id, link.projectId), eq(batiproProjects.organizationId, link.organizationId), eq(batiproProjects.isActive, 1)))
      .limit(1);
    if (!project) throw new NotFoundException("Chantier indisponible.");

    let subcontractor: { id: number; name: string } | null = null;
    if (link.subcontractorId != null) {
      const [sub] = await this.db
        .select({ id: batiproSubcontractors.id, name: batiproSubcontractors.name })
        .from(batiproSubcontractors)
        .where(and(eq(batiproSubcontractors.id, link.subcontractorId), eq(batiproSubcontractors.organizationId, link.organizationId), eq(batiproSubcontractors.isActive, 1)))
        .limit(1);
      subcontractor = sub ?? null;
    }

    const phases = await this.db
      .select({ id: batiproPhases.id, label: batiproPhases.label })
      .from(batiproPhases)
      .where(and(eq(batiproPhases.projectId, link.projectId), eq(batiproPhases.organizationId, link.organizationId), eq(batiproPhases.isActive, 1)))
      .orderBy(batiproPhases.position);

    return {
      project: { name: project.name, currencyId: project.currencyId, currencyCode: project.currencyCode, currencySymbol: project.currencySymbol },
      nominative: link.subcontractorId != null,
      subcontractor,
      phases,
    };
  }

  // Soumission d'un document par un sous-traitant (inbound). Cree le document +
  // ses lignes ; totaux calcules cote serveur (jamais de confiance au client).
  async submitSubcontractorDocument(token: string, payload: SubmitSubcontractorDocumentDto) {
    const link = await this.resolveLink(token);
    const orgId = link.organizationId;
    const hasLines = Array.isArray(payload.lines) && payload.lines.length > 0;
    const totalAmount = Number(payload.total_amount ?? 0);
    if (!hasLines && !(totalAmount > 0)) {
      throw new BadRequestException("Ajoutez le détail des prestations ou indiquez un montant total.");
    }
    if (link.subcontractorId == null && !payload.submitted_by_name && !payload.submitted_by_company) {
      throw new BadRequestException("Identifiez-vous (nom ou entreprise).");
    }

    const phaseIds = new Set(
      (await this.db
        .select({ id: batiproPhases.id })
        .from(batiproPhases)
        .where(and(eq(batiproPhases.projectId, link.projectId), eq(batiproPhases.organizationId, orgId), eq(batiproPhases.isActive, 1))))
        .map((p) => p.id),
    );

    const defaultCurrencyId = payload.currency_id ?? null;
    let totalHt = 0, totalVat = 0;
    const totalsByCurrencyMap = new Map<number, { totalHt: number; totalVat: number; totalTtc: number }>();
    const lines = (hasLines ? payload.lines! : []).map((line, index) => {
      const qty = Number(line.quantity ?? 0);
      const pu = Number(line.unit_price ?? 0);
      const vatRate = Number(line.vat_rate ?? 0);
      const lineHt = Math.round(qty * pu * 100) / 100;
      const lineVat = Math.round(lineHt * (vatRate / 100) * 100) / 100;
      totalHt += lineHt;
      totalVat += lineVat;
      const phaseId = line.phase_id != null && phaseIds.has(line.phase_id) ? line.phase_id : null;
      const effectiveCurrencyId = line.currency_id ?? defaultCurrencyId ?? null;
      if (effectiveCurrencyId != null) {
        const entry = totalsByCurrencyMap.get(effectiveCurrencyId) ?? { totalHt: 0, totalVat: 0, totalTtc: 0 };
        entry.totalHt += lineHt;
        entry.totalVat += lineVat;
        entry.totalTtc += lineHt + lineVat;
        totalsByCurrencyMap.set(effectiveCurrencyId, entry);
      }
      return {
        organizationId: orgId,
        documentId: 0,
        position: index,
        designation: line.designation,
        quantity: String(qty),
        unitPrice: String(pu),
        vatRate: String(vatRate),
        lineHt: String(lineHt),
        lineTtc: String(Math.round((lineHt + lineVat) * 100) / 100),
        phaseId,
        currencyId: line.currency_id ?? null,
      };
    });
    // Sans detail de lignes, le montant total saisi fait foi (pas de ventilation TVA).
    if (!hasLines) totalHt = Math.round(totalAmount * 100) / 100;
    const totalTtc = hasLines ? Math.round((totalHt + totalVat) * 100) / 100 : totalHt;

    const documentId = await this.db.transaction(async (tx) => {
      const [result] = await tx.insert(batiproDocuments).values({
        organizationId: orgId,
        projectId: link.projectId,
        type: payload.type ?? "quote",
        direction: "inbound",
        status: "submitted",
        currencyId: payload.currency_id ?? null,
        totalHt: String(Math.round(totalHt * 100) / 100),
        totalVat: String(Math.round(totalVat * 100) / 100),
        totalTtc: String(totalTtc),
        subcontractorId: link.subcontractorId ?? null,
        submittedByName: link.subcontractorId == null ? (payload.submitted_by_name ?? null) : null,
        submittedByCompany: link.subcontractorId == null ? (payload.submitted_by_company ?? null) : null,
        notes: payload.notes ?? null,
      }).$returningId();
      const id = Number(result.id);
      for (const line of lines) line.documentId = id;
      if (lines.length) await tx.insert(batiproDocumentLines).values(lines);
      if (hasLines && totalsByCurrencyMap.size) {
        const totalsByCurrency = Array.from(totalsByCurrencyMap.entries()).map(([currencyId, t]) => ({
          currencyId,
          totalHt: Math.round(t.totalHt * 100) / 100,
          totalVat: Math.round(t.totalVat * 100) / 100,
          totalTtc: Math.round(t.totalTtc * 100) / 100,
        }));
        await this.replaceDocumentTotals(tx, id, orgId, totalsByCurrency);
      }
      return id;
    });

    await this.publish("submitSubcontractorDocument", ["documents", "document_lines"], "created", documentId, orgId);
    return { id: documentId, message: "Soumission enregistree." };
  }

  // Attache le fichier (PDF/image) d'une soumission via le token public.
  async attachSubcontractorFile(token: string, documentId: number, file: any) {
    const link = await this.resolveLink(token);
    const orgId = link.organizationId;
    const [doc] = await this.db
      .select()
      .from(batiproDocuments)
      .where(and(
        eq(batiproDocuments.id, documentId),
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.projectId, link.projectId),
        eq(batiproDocuments.direction, "inbound"),
        eq(batiproDocuments.isActive, 1),
      ))
      .limit(1);
    if (!doc) throw new NotFoundException("Soumission introuvable.");
    const stored = await this.objectStorage.putDocument(file, `batipro/submissions/${orgId}/${link.projectId}`);
    if (doc.attachedFileKey) {
      try { await this.objectStorage.deleteObject(doc.attachedFileKey); } catch { /* best-effort */ }
    }
    await this.db.update(batiproDocuments).set({
      attachedFileKey: stored.objectKey,
      attachedFileFormat: stored.mimeType === "application/pdf" ? "pdf" : (stored.mimeType.split("/")[1] || null),
      attachedFileSize: stored.sizeBytes,
    }).where(eq(batiproDocuments.id, documentId));
    await this.publish("attachSubcontractorFile", ["documents"], "updated", documentId, orgId);
    return { id: documentId, message: "Fichier attache." };
  }

  // ── Revue des soumissions (cote gestionnaire, authentifie) ───────────────
  listInboundSubmissions(orgId: number, projectId?: number) {
    return this.db
      .select({
        ...getTableColumns(batiproDocuments),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
        subcontractorName: batiproSubcontractors.name,
      })
      .from(batiproDocuments)
      .leftJoin(currencies, eq(currencies.id, batiproDocuments.currencyId))
      .leftJoin(batiproSubcontractors, eq(batiproSubcontractors.id, batiproDocuments.subcontractorId))
      .where(and(
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.direction, "inbound"),
        eq(batiproDocuments.isActive, 1),
        projectId ? eq(batiproDocuments.projectId, projectId) : undefined,
      ))
      .orderBy(desc(batiproDocuments.id));
  }

  private async getInboundDocument(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(batiproDocuments)
      .where(and(
        eq(batiproDocuments.id, id),
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.direction, "inbound"),
        eq(batiproDocuments.isActive, 1),
      ))
      .limit(1);
    if (!row) throw new NotFoundException("Soumission introuvable.");
    return row;
  }

  async submissionLines(documentId: number, orgId: number) {
    const doc = await this.getInboundDocument(documentId, orgId);
    let docCurrencyCode: string | null = null, docCurrencySymbol: string | null = null;
    if (doc.currencyId != null) {
      const [docCurrency] = await this.db
        .select({ currencyCode: currencies.currencyCode, currencySymbol: currencies.currencySymbol })
        .from(currencies)
        .where(eq(currencies.id, doc.currencyId))
        .limit(1);
      docCurrencyCode = docCurrency?.currencyCode ?? null;
      docCurrencySymbol = docCurrency?.currencySymbol ?? null;
    }
    const lineRows = await this.db
      .select({
        ...getTableColumns(batiproDocumentLines),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproDocumentLines)
      .leftJoin(currencies, eq(currencies.id, batiproDocumentLines.currencyId))
      .where(and(eq(batiproDocumentLines.documentId, documentId), eq(batiproDocumentLines.organizationId, orgId), eq(batiproDocumentLines.isActive, 1)))
      .orderBy(batiproDocumentLines.position);
    return lineRows.map((l) => ({
      ...l,
      currencyCode: l.currencyCode ?? docCurrencyCode,
      currencySymbol: l.currencySymbol ?? docCurrencySymbol,
    }));
  }

  async reviewSubmission(documentId: number, input: ReviewSubmissionDto, orgId: number) {
    const doc = await this.getInboundDocument(documentId, orgId);
    if (doc.status === "validated") throw new GoneException("Cette soumission est deja validee.");
    const nextStatus = input.action === "validate" ? "validated" : "returned";
    const patch: Partial<typeof batiproDocuments.$inferInsert> = { status: nextStatus };
    if (input.action === "return" && input.motif) {
      patch.notes = doc.notes ? `${doc.notes}\n[Renvoi] ${input.motif}` : `[Renvoi] ${input.motif}`;
    }
    await this.db.update(batiproDocuments).set(patch).where(eq(batiproDocuments.id, documentId));
    await this.publish("reviewSubmission", ["documents"], "updated", documentId, orgId);
    return { id: documentId, status: nextStatus, message: input.action === "validate" ? "Soumission validee." : "Soumission renvoyee." };
  }

  async submissionFile(documentId: number, orgId: number) {
    const doc = await this.getInboundDocument(documentId, orgId);
    if (!doc.attachedFileKey) throw new NotFoundException("Aucun fichier attache.");
    const object = await this.objectStorage.getObject(doc.attachedFileKey);
    return { ...object, mimeType: object.contentType };
  }

  // ── Documents sortants : devis (Phase 1) ─────────────────────────────────

  // Prefixe legal par type de document.
  private static readonly DOC_PREFIX: Record<string, string> = {
    quote: "DEV",
    purchase_order: "BC",
    situation: "SIT",
    invoice: "FAC",
  };

  // Numerotation sequentielle par (org, type, annee), sans trou ni doublon.
  // Choix : table compteur dediee incrementee sous verrou (SELECT ... FOR UPDATE)
  // dans une transaction — plus robuste qu'un MAX+1 (pas de scan, pas de course).
  // Format : DEV-2026-0001. Renvoie { number, sequence }.
  private async nextDocumentNumber(tx: any, orgId: number, type: string, year: number) {
    const prefix = BatiproService.DOC_PREFIX[type] ?? "DOC";
    // Cree la ligne compteur si absente (idempotent), puis verrouille-la.
    await tx
      .insert(batiproDocumentCounters)
      .values({ organizationId: orgId, type, year, lastNumber: 0 })
      .onDuplicateKeyUpdate({ set: { organizationId: sql`organization_id` } });
    const [counter] = await tx
      .select({ id: batiproDocumentCounters.id, lastNumber: batiproDocumentCounters.lastNumber })
      .from(batiproDocumentCounters)
      .where(and(
        eq(batiproDocumentCounters.organizationId, orgId),
        eq(batiproDocumentCounters.type, type),
        eq(batiproDocumentCounters.year, year),
      ))
      .for("update")
      .limit(1);
    const sequence = Number(counter.lastNumber) + 1;
    await tx
      .update(batiproDocumentCounters)
      .set({ lastNumber: sequence })
      .where(eq(batiproDocumentCounters.id, counter.id));
    return { number: `${prefix}-${year}-${String(sequence).padStart(4, "0")}`, sequence };
  }

  // Recalcule les totaux HT/TVA/TTC depuis les lignes (jamais de confiance au
  // front). Renvoie les lignes normalisees + les totaux arrondis au centime.
  //
  // Multi-devise par ligne (migration 0232) : chaque ligne peut porter sa
  // propre currency_id (sinon elle herite de `defaultCurrencyId`, la devise du
  // document). Les totaux sont ventiles par devise dans `totalsByCurrency`.
  // IMPORTANT (retro-compatibilite) : les scalaires `totalHt/totalVat/totalTtc`
  // retournes restent le total de la SEULE `defaultCurrencyId` (pas la somme
  // toutes devises), car ils alimentent batipro_documents.total_ht/vat/ttc qui
  // n'a jamais ete pense pour agreger plusieurs devises. Pour un document
  // mono-devise (cas d'aujourd'hui, toutes lignes currency_id=NULL), ce sont
  // exactement les memes valeurs qu'avant ce changement.
  private computeDocumentTotals(
    rawLines: Array<{ designation: string; quantity?: number; unit_price?: number; vat_rate?: number; phase_id?: number; material_id?: number; currency_id?: number }>,
    orgId: number,
    validPhaseIds: Set<number>,
    defaultCurrencyId: number | null = null,
  ) {
    const totalsByCurrencyMap = new Map<number | null, { totalHt: number; totalVat: number; totalTtc: number }>();
    const addToCurrency = (currencyId: number | null, lineHt: number, lineVat: number) => {
      const entry = totalsByCurrencyMap.get(currencyId) ?? { totalHt: 0, totalVat: 0, totalTtc: 0 };
      entry.totalHt += lineHt;
      entry.totalVat += lineVat;
      entry.totalTtc += lineHt + lineVat;
      totalsByCurrencyMap.set(currencyId, entry);
    };

    const lines = rawLines.map((line, index) => {
      const qty = Number(line.quantity ?? 0);
      const pu = Number(line.unit_price ?? 0);
      const vatRate = Number(line.vat_rate ?? 0);
      const lineHt = Math.round(qty * pu * 100) / 100;
      const lineVat = Math.round(lineHt * (vatRate / 100) * 100) / 100;
      const phaseId = line.phase_id != null && validPhaseIds.has(line.phase_id) ? line.phase_id : null;
      const effectiveCurrencyId = line.currency_id ?? defaultCurrencyId ?? null;
      addToCurrency(effectiveCurrencyId, lineHt, lineVat);
      return {
        organizationId: orgId,
        documentId: 0,
        position: index,
        designation: line.designation,
        quantity: String(qty),
        unitPrice: String(pu),
        vatRate: String(vatRate),
        lineHt: String(lineHt),
        lineTtc: String(Math.round((lineHt + lineVat) * 100) / 100),
        phaseId,
        materialId: line.material_id ?? null,
        currencyId: line.currency_id ?? null,
      };
    });

    const totalsByCurrency = Array.from(totalsByCurrencyMap.entries())
      .filter(([currencyId]) => currencyId != null)
      .map(([currencyId, t]) => ({
        currencyId: currencyId as number,
        totalHt: Math.round(t.totalHt * 100) / 100,
        totalVat: Math.round(t.totalVat * 100) / 100,
        totalTtc: Math.round(t.totalTtc * 100) / 100,
      }));

    // Scalaires retro-compatibles : uniquement le total de la devise par defaut
    // du document (jamais une somme toutes devises confondues).
    const defaultTotals = totalsByCurrencyMap.get(defaultCurrencyId ?? null) ?? { totalHt: 0, totalVat: 0, totalTtc: 0 };

    return {
      lines,
      totalsByCurrency,
      totalHt: Math.round(defaultTotals.totalHt * 100) / 100,
      totalVat: Math.round(defaultTotals.totalVat * 100) / 100,
      totalTtc: Math.round(defaultTotals.totalTtc * 100) / 100,
    };
  }

  // Pour un bon de commande : si une ligne porte une designation mais aucun
  // material_id (saisie "texte libre"), rattache automatiquement un materiau
  // existant du meme nom (insensible a la casse) ou en cree un a la volee,
  // pour eviter la double saisie fournisseur/achat puis materiaux.
  private async resolveMaterialIdsForPurchaseOrder(
    lines: Array<{ designation: string; material_id?: number }>,
    orgId: number,
  ) {
    const existing = await this.db
      .select({ id: batiproMaterials.id, name: batiproMaterials.name })
      .from(batiproMaterials)
      .where(and(eq(batiproMaterials.organizationId, orgId), eq(batiproMaterials.isActive, 1)));
    const byName = new Map(existing.map((m) => [m.name.trim().toLowerCase(), m.id]));

    for (const line of lines) {
      if (line.material_id) continue;
      const name = (line.designation || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      let materialId = byName.get(key);
      if (!materialId) {
        const created = await this.createMaterial({ name, unit: "unite" } as CreateBatiproMaterialDto, orgId);
        materialId = created.id;
        byName.set(key, materialId);
      }
      line.material_id = materialId;
    }
  }

  private async validPhaseIds(orgId: number, projectId: number) {
    const rows = await this.db
      .select({ id: batiproPhases.id })
      .from(batiproPhases)
      .where(and(eq(batiproPhases.projectId, projectId), eq(batiproPhases.organizationId, orgId), eq(batiproPhases.isActive, 1)));
    return new Set(rows.map((p) => p.id));
  }

  // Liste les documents sortants (devis par defaut) d'un chantier.
  listDocuments(orgId: number, opts: { projectId?: number; type?: string; direction?: string } = {}) {
    return this.db
      .select({
        ...getTableColumns(batiproDocuments),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
        supplierName: suppliers.name,
        subcontractorName: batiproSubcontractors.name,
        projectName: batiproProjects.name,
      })
      .from(batiproDocuments)
      .leftJoin(currencies, eq(currencies.id, batiproDocuments.currencyId))
      .leftJoin(suppliers, eq(suppliers.id, batiproDocuments.supplierId))
      .leftJoin(batiproSubcontractors, eq(batiproSubcontractors.id, batiproDocuments.subcontractorId))
      .leftJoin(batiproProjects, eq(batiproProjects.id, batiproDocuments.projectId))
      .where(and(
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.isActive, 1),
        eq(batiproDocuments.direction, opts.direction ?? "outbound"),
        opts.type ? eq(batiproDocuments.type, opts.type) : undefined,
        opts.projectId ? eq(batiproDocuments.projectId, opts.projectId) : undefined,
      ))
      .orderBy(desc(batiproDocuments.id));
  }

  // Remplace (soft-delete + insert) les lignes de totaux ventiles par devise
  // d'un document (batipro_document_totals), dans la transaction fournie. Suit
  // exactement le meme pattern que le remplacement des lignes de document
  // (soft-delete des actives puis insert des nouvelles, jamais de DELETE).
  private async replaceDocumentTotals(
    tx: any,
    documentId: number,
    orgId: number,
    totalsByCurrency: Array<{ currencyId: number; totalHt: number; totalVat: number; totalTtc: number }>,
  ) {
    await tx.update(batiproDocumentTotals).set({ isActive: 0 })
      .where(and(eq(batiproDocumentTotals.documentId, documentId), eq(batiproDocumentTotals.organizationId, orgId)));
    if (!totalsByCurrency.length) return;
    // L'index unique (document_id, currency_id) n'inclut pas is_active : le
    // soft-delete ci-dessus laisse la ligne en place, donc un ré-insert du meme
    // couple doit passer par ON DUPLICATE KEY UPDATE (memes reactive isActive=1),
    // jamais un insert nu qui violerait l'unicite.
    await tx.insert(batiproDocumentTotals).values(
      totalsByCurrency.map((t) => ({
        organizationId: orgId,
        documentId,
        currencyId: t.currencyId,
        totalHt: String(t.totalHt),
        totalVat: String(t.totalVat),
        totalTtc: String(t.totalTtc),
        isActive: 1,
      })),
    ).onDuplicateKeyUpdate({
      set: {
        totalHt: sql`VALUES(total_ht)`,
        totalVat: sql`VALUES(total_vat)`,
        totalTtc: sql`VALUES(total_ttc)`,
        isActive: 1,
      },
    });
  }

  // Garde-fou comptabilisation : une ecriture ledger SIFA est mono-devise par
  // construction. Un document dont les lignes utilisent reellement PLUSIEURS
  // devises (batipro_document_totals.length > 1) ne peut pas encore etre
  // comptabilise automatiquement — bloque explicitement plutot que de
  // comptabiliser un montant errone. Documents mono-devise (cas normal
  // aujourd'hui) : aucun changement, ce garde-fou ne se declenche jamais.
  private assertSingleCurrencyForLedger(doc: { totalsByCurrency?: Array<{ currencyId: number }> }) {
    if ((doc.totalsByCurrency?.length ?? 0) > 1) {
      throw new BadRequestException(
        "Ce document contient plusieurs devises : la comptabilisation multi-devise n'est pas encore disponible, veuillez séparer les lignes par devise sur des documents distincts.",
      );
    }
  }

  async getDocument(id: number, orgId: number) {
    const [row] = await this.db
      .select({
        ...getTableColumns(batiproDocuments),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
        supplierName: suppliers.name,
        subcontractorName: batiproSubcontractors.name,
      })
      .from(batiproDocuments)
      .leftJoin(currencies, eq(currencies.id, batiproDocuments.currencyId))
      .leftJoin(suppliers, eq(suppliers.id, batiproDocuments.supplierId))
      .leftJoin(batiproSubcontractors, eq(batiproSubcontractors.id, batiproDocuments.subcontractorId))
      .where(and(eq(batiproDocuments.id, id), eq(batiproDocuments.organizationId, orgId), eq(batiproDocuments.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Document introuvable.");
    const lineRows = await this.db
      .select({
        ...getTableColumns(batiproDocumentLines),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproDocumentLines)
      .leftJoin(currencies, eq(currencies.id, batiproDocumentLines.currencyId))
      .where(and(eq(batiproDocumentLines.documentId, id), eq(batiproDocumentLines.organizationId, orgId), eq(batiproDocumentLines.isActive, 1)))
      .orderBy(batiproDocumentLines.position);
    // Ligne sans devise propre = herite de la devise du document (jamais de
    // NULL affiche cote front).
    const lines = lineRows.map((l) => ({
      ...l,
      currencyCode: l.currencyCode ?? row.currencyCode ?? null,
      currencySymbol: l.currencySymbol ?? row.currencySymbol ?? null,
    }));
    const totalsByCurrencyRows = await this.db
      .select({
        currencyId: batiproDocumentTotals.currencyId,
        totalHt: batiproDocumentTotals.totalHt,
        totalVat: batiproDocumentTotals.totalVat,
        totalTtc: batiproDocumentTotals.totalTtc,
        paidAmount: batiproDocumentTotals.paidAmount,
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproDocumentTotals)
      .leftJoin(currencies, eq(currencies.id, batiproDocumentTotals.currencyId))
      .where(and(eq(batiproDocumentTotals.documentId, id), eq(batiproDocumentTotals.organizationId, orgId), eq(batiproDocumentTotals.isActive, 1)))
      .orderBy(batiproDocumentTotals.currencyId);
    return { ...row, lines, totalsByCurrency: totalsByCurrencyRows };
  }

  // Charge un document sortant (BC/facture/devis...) par id+org, sans les
  // lignes/totaux — reutilise pour l'attachement de fichier (photo/scan facture
  // papier). Generique a tout type de batipro_documents (pas restreint a inbound).
  private async getDocumentRow(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(batiproDocuments)
      .where(and(eq(batiproDocuments.id, id), eq(batiproDocuments.organizationId, orgId), eq(batiproDocuments.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Document introuvable.");
    return row;
  }

  // Attache/remplace le fichier (photo/scan) d'un document — ex. photo de la
  // facture papier recue en magasin, rattachee a une facture fournisseur.
  async attachDocumentFile(documentId: number, file: any, orgId: number, userId?: number) {
    const doc = await this.getDocumentRow(documentId, orgId);
    const stored = await this.objectStorage.putDocument(file, `batipro/documents/${orgId}/${documentId}`);
    if (doc.attachedFileKey) {
      try { await this.objectStorage.deleteObject(doc.attachedFileKey); } catch { /* best-effort */ }
    }
    await this.db.update(batiproDocuments).set({
      attachedFileKey: stored.objectKey,
      attachedFileFormat: stored.mimeType === "application/pdf" ? "pdf" : (stored.mimeType.split("/")[1] || null),
      attachedFileSize: stored.sizeBytes,
    }).where(eq(batiproDocuments.id, documentId));
    await this.publish("attachDocumentFile", ["documents"], "updated", documentId, orgId);
    return { id: documentId, message: "Fichier attache." };
  }

  async documentAttachmentFile(documentId: number, orgId: number) {
    const doc = await this.getDocumentRow(documentId, orgId);
    if (!doc.attachedFileKey) throw new NotFoundException("Aucun fichier attache.");
    const object = await this.objectStorage.getObject(doc.attachedFileKey);
    return { ...object, mimeType: object.contentType };
  }

  async createDocument(input: CreateBatiproDocumentDto, orgId: number) {
    await this.getProject(input.project_id, orgId);
    if (!Array.isArray(input.lines) || !input.lines.length) throw new BadRequestException("Au moins une ligne est requise.");
    const type = input.type ?? "quote";
    if (type === "purchase_order") await this.resolveMaterialIdsForPurchaseOrder(input.lines, orgId);
    const phaseIds = await this.validPhaseIds(orgId, input.project_id);
    const defaultCurrencyId = input.currency_id ?? null;
    const { lines, totalHt, totalVat, totalTtc, totalsByCurrency } = this.computeDocumentTotals(input.lines, orgId, phaseIds, defaultCurrencyId);
    const year = input.issue_date ? new Date(input.issue_date).getFullYear() : new Date().getFullYear();

    const documentId = await this.db.transaction(async (tx) => {
      const { number } = await this.nextDocumentNumber(tx, orgId, type, year);
      const [result] = await tx.insert(batiproDocuments).values({
        organizationId: orgId,
        projectId: input.project_id,
        type,
        direction: "outbound",
        number,
        status: "draft",
        currencyId: input.currency_id ?? null,
        supplierId: input.supplier_id ?? null,
        subcontractorId: input.subcontractor_id ?? null,
        totalHt: String(totalHt),
        totalVat: String(totalVat),
        totalTtc: String(totalTtc),
        notes: input.notes ?? null,
        issueDate: input.issue_date ?? null,
        dueDate: input.due_date ?? null,
      }).$returningId();
      const id = Number(result.id);
      for (const line of lines) line.documentId = id;
      if (lines.length) await tx.insert(batiproDocumentLines).values(lines);
      await this.replaceDocumentTotals(tx, id, orgId, totalsByCurrency);
      return id;
    });

    // Lie le document cree a sa photo/scan source (OCR), si fournie et appartenant a la meme org.
    if (input.sourcePhotoId != null) {
      await this.db
        .update(batiproSitePhotos)
        .set({ linkedDocumentId: documentId })
        .where(and(
          eq(batiproSitePhotos.id, input.sourcePhotoId),
          eq(batiproSitePhotos.organizationId, orgId),
        ));
    }

    await this.publish("createDocument", ["documents", "document_lines"], "created", documentId, orgId);
    return this.getDocument(documentId, orgId);
  }

  async updateDocument(id: number, input: UpdateBatiproDocumentDto, orgId: number) {
    const doc = await this.getDocument(id, orgId);

    // Garde-fou : un BC dont du stock a deja ete receptionne ne peut plus etre
    // annule (le stock est physiquement entre, l'annulation le laisserait
    // fantome). Il faut d'abord contre-passer les receptions (endpoint /cancel
    // sur chaque mouvement) avant de pouvoir annuler le document.
    if (doc.type === "purchase_order" && input.status === "cancelled" && doc.status !== "cancelled") {
      const [movement] = await this.db
        .select({ id: batiproStockMovements.id })
        .from(batiproStockMovements)
        .where(and(
          eq(batiproStockMovements.documentId, id),
          eq(batiproStockMovements.organizationId, orgId),
          eq(batiproStockMovements.movementType, "reception"),
          eq(batiproStockMovements.isActive, 1),
        ))
        .limit(1);
      if (movement) {
        throw new BadRequestException("Impossible d'annuler ce bon de commande : du stock a deja ete receptionne. Annulez d'abord les receptions.");
      }
    }

    const patch: Partial<typeof batiproDocuments.$inferInsert> = {};
    if (input.currency_id !== undefined) patch.currencyId = input.currency_id ?? null;
    if (input.supplier_id !== undefined) patch.supplierId = input.supplier_id ?? null;
    if (input.subcontractor_id !== undefined) patch.subcontractorId = input.subcontractor_id ?? null;
    if (input.issue_date !== undefined) patch.issueDate = input.issue_date || null;
    if (input.due_date !== undefined) patch.dueDate = input.due_date || null;
    if (input.status !== undefined) patch.status = input.status;
    if (input.notes !== undefined) patch.notes = input.notes || null;

    if (input.lines !== undefined) {
      if (doc.type === "purchase_order") await this.resolveMaterialIdsForPurchaseOrder(input.lines, orgId);
      const phaseIds = await this.validPhaseIds(orgId, doc.projectId);
      // Devise par defaut = celle du patch si fournie, sinon celle deja sur le document.
      const defaultCurrencyId = input.currency_id !== undefined ? (input.currency_id ?? null) : (doc.currencyId ?? null);
      const { lines, totalHt, totalVat, totalTtc, totalsByCurrency } = this.computeDocumentTotals(input.lines, orgId, phaseIds, defaultCurrencyId);
      patch.totalHt = String(totalHt);
      patch.totalVat = String(totalVat);
      patch.totalTtc = String(totalTtc);
      await this.db.transaction(async (tx) => {
        // Remplace l'ensemble des lignes (soft-delete des anciennes, insert des nouvelles).
        await tx.update(batiproDocumentLines).set({ isActive: 0 })
          .where(and(eq(batiproDocumentLines.documentId, id), eq(batiproDocumentLines.organizationId, orgId)));
        for (const line of lines) line.documentId = id;
        if (lines.length) await tx.insert(batiproDocumentLines).values(lines);
        await this.replaceDocumentTotals(tx, id, orgId, totalsByCurrency);
        if (Object.keys(patch).length) await tx.update(batiproDocuments).set(patch).where(eq(batiproDocuments.id, id));
      });
    } else if (Object.keys(patch).length) {
      await this.db.update(batiproDocuments).set(patch).where(eq(batiproDocuments.id, id));
    }

    await this.publish("updateDocument", ["documents", "document_lines"], "updated", id, orgId);
    return this.getDocument(id, orgId);
  }

  // ── Bon de commande : confirmation fournisseur (migration 0231) ─────────
  // Accuse de reception du BC par le fournisseur : sent -> confirmed. Refuse
  // pour un devis/facture, un BC encore en brouillon (emettre d'abord) ou annule.
  async confirmPurchaseOrder(id: number, input: ConfirmBatiproDocumentDto, orgId: number, userId?: number) {
    const doc = await this.getDocument(id, orgId);
    if (doc.type !== "purchase_order") throw new BadRequestException("Seul un bon de commande peut etre confirme.");
    if (doc.status === "draft") throw new BadRequestException("Emettez d'abord le bon de commande avant de le confirmer.");
    if (doc.status === "cancelled") throw new BadRequestException("Bon de commande annule : confirmation impossible.");
    if (doc.status !== "sent") throw new BadRequestException(`Ce bon de commande est deja au statut "${doc.status}".`);

    await this.db.update(batiproDocuments).set({
      status: "confirmed",
      confirmedAt: sql`CURRENT_TIMESTAMP`,
      confirmedBy: userId ?? null,
      supplierReference: input.supplier_reference ?? null,
      expectedDeliveryDate: input.expected_delivery_date ?? null,
    }).where(and(eq(batiproDocuments.id, id), eq(batiproDocuments.organizationId, orgId)));

    await this.publish("confirmPurchaseOrder", ["documents"], "updated", id, orgId);
    return this.getDocument(id, orgId);
  }

  // Montant d'avance fournisseur DEJA VERSE et PAS ENCORE SOLDE pour ce BC :
  // somme des DEBIT sur le sous-compte "Supplier Advance" pour les ecritures
  // liees a ce document (sourceModule=batipro, relatedId=id, type=avance),
  // moins les CREDIT deja poses dessus (solde partiel eventuel a une reception
  // precedente). Une seule reception peut soit tout solder soit rien si aucune
  // avance n'a ete versee -> le calcul reste correct dans les deux cas.
  private async outstandingSupplierAdvance(documentId: number, orgId: number): Promise<number> {
    const [subAccount] = await this.db
      .select({ id: subAccounts.id })
      .from(subAccounts)
      .where(and(eq(subAccounts.organizationId, orgId), eq(subAccounts.name, "Supplier Advance")))
      .limit(1);
    if (!subAccount) return 0;

    const rows = await this.db
      .select({ side: journalEntryLines.side, amount: journalEntryLines.amount })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntries.id, journalEntryLines.entryId))
      .where(and(
        eq(journalEntryLines.organizationId, orgId),
        eq(journalEntryLines.accountId, subAccount.id),
        eq(journalEntries.sourceModule, "batipro"),
        eq(journalEntries.relatedId, String(documentId)),
        sql`${journalEntries.status} <> 'reversed'`,
      ));
    let outstanding = 0;
    for (const r of rows) {
      const amt = Number(r.amount ?? 0);
      outstanding += r.side === "DEBIT" ? amt : -amt;
    }
    return Math.round(outstanding * 100) / 100;
  }

  // ── Bon de commande : reception physique par ligne (migration 0231) ─────
  // Decouplee de l'emission. Cree un mouvement 'reception' par ligne receptionnee,
  // met a jour received_quantity (cache) et recalcule le statut du document.
  // Refuse : draft/cancelled, sur-reception (cumul > quantite commandee), ligne
  // hors document/org. Solde l'avance fournisseur deja versee si applicable.
  async receivePurchaseOrder(documentId: number, input: ReceiveBatiproDocumentDto, orgId: number, userId?: number) {
    const doc = await this.getDocument(documentId, orgId);
    if (doc.type !== "purchase_order") throw new BadRequestException("Seul un bon de commande peut etre receptionne.");
    if (doc.status === "draft") throw new BadRequestException("Emettez d'abord le bon de commande avant de le receptionner.");
    if (doc.status === "cancelled") throw new BadRequestException("Bon de commande annule : reception impossible.");
    if (doc.status === "received") throw new BadRequestException("Ce bon de commande est deja entierement receptionne.");
    if (!Array.isArray(input.lines) || !input.lines.length) throw new BadRequestException("Au moins une ligne receptionnee est requise.");

    const lineById = new Map(doc.lines.filter((l) => l.isActive === 1).map((l) => [l.id, l]));
    for (const entry of input.lines) {
      const line = lineById.get(entry.line_id);
      if (!line) throw new BadRequestException(`Ligne ${entry.line_id} introuvable sur ce document.`);
      const ordered = Number(line.quantity ?? 0);
      const alreadyReceived = Number(line.receivedQuantity ?? 0);
      const cumulative = Math.round((alreadyReceived + entry.quantity) * 100000) / 100000;
      if (cumulative > ordered + 0.0005) {
        throw new BadRequestException(`Quantite recue (${cumulative}) superieure a la quantite commandee (${ordered}) pour la ligne "${line.designation}".`);
      }
    }

    const receivedAt = input.received_date ? new Date(input.received_date) : undefined;
    const materialLines = doc.lines.filter((l) => l.isActive === 1 && l.materialId != null);

    await this.db.transaction(async (tx) => {
      for (const entry of input.lines) {
        const line = lineById.get(entry.line_id)!;
        await tx.insert(batiproStockMovements).values({
          organizationId: orgId,
          projectId: doc.projectId,
          materialId: (line.materialId as number) ?? 0,
          documentId,
          movementType: "reception",
          quantity: String(entry.quantity),
          note: input.note ?? null,
          createdBy: userId ?? null,
          ...(receivedAt ? { createdAt: receivedAt as any } : {}),
        });
        await tx.update(batiproDocumentLines)
          .set({ receivedQuantity: sql`${batiproDocumentLines.receivedQuantity} + ${entry.quantity}` })
          .where(and(eq(batiproDocumentLines.id, entry.line_id), eq(batiproDocumentLines.organizationId, orgId)));
      }

      // Recalcule le statut a partir des quantites a jour (lignes sans materialId
      // = main d'oeuvre/prestations, exclues du calcul et considerees satisfaites).
      const refreshed = await tx
        .select({ id: batiproDocumentLines.id, quantity: batiproDocumentLines.quantity, receivedQuantity: batiproDocumentLines.receivedQuantity })
        .from(batiproDocumentLines)
        .where(and(eq(batiproDocumentLines.documentId, documentId), eq(batiproDocumentLines.organizationId, orgId), eq(batiproDocumentLines.isActive, 1)));
      const trackedLines = refreshed.filter((l) => materialLines.some((m) => m.id === l.id));
      const anyReceived = trackedLines.some((l) => Number(l.receivedQuantity ?? 0) > 0.0005);
      const allReceived = trackedLines.length > 0 && trackedLines.every((l) => Number(l.receivedQuantity ?? 0) >= Number(l.quantity ?? 0) - 0.0005);
      const nextStatus = allReceived ? "received" : anyReceived ? "partially_received" : doc.status;

      const patch: Partial<typeof batiproDocuments.$inferInsert> = { status: nextStatus };
      if (nextStatus === "received") {
        patch.receivedAt = sql`CURRENT_TIMESTAMP` as any;
        patch.receivedBy = userId ?? null;
      }
      await tx.update(batiproDocuments).set(patch).where(eq(batiproDocuments.id, documentId));
    });

    // Solde de l'avance fournisseur eventuellement versee AVANT reception,
    // uniquement lorsque le BC devient entierement receptionne (une avance
    // partielle ne se solde pas au fil des receptions partielles : v1, simple).
    const refreshedDoc = await this.getDocument(documentId, orgId);
    let advanceOffsetLedgerEntryId: number | null = null;
    if (refreshedDoc.status === "received") {
      const outstanding = await this.outstandingSupplierAdvance(documentId, orgId);
      if (outstanding > 0.005) {
        const analyticProjectId = await this.resolveAnalyticProjectId(doc.projectId, orgId);
        const result = await this.ledger.postByRules(
          {
            type: "batipro_advance_offset",
            reference: doc.number ?? `BC-${documentId}`,
            particulars: `Solde avance fournisseur BC ${doc.number ?? documentId}`,
            sourceModule: "batipro",
            relatedId: String(documentId),
            idempotencyKey: `batipro:advance_offset:${documentId}:${Math.round(outstanding * 100)}`,
            currencyId: doc.currencyId ?? undefined,
            amountsByRole: {
              payable: outstanding,
              supplier_advance: outstanding,
            },
            dimensions: { projectId: analyticProjectId },
          },
          orgId,
          userId,
        );
        advanceOffsetLedgerEntryId = result.id > 0 ? result.id : null;
      }
    }

    await this.publish("receivePurchaseOrder", ["documents", "document_lines", "stock_movements"], "updated", documentId, orgId);
    return { ...refreshedDoc, advance_offset_ledger_entry_id: advanceOffsetLedgerEntryId };
  }

  // Annule (soft delete) un mouvement de reception errone et recalcule le statut
  // du document (peut redescendre de received/partially_received vers un statut
  // anterieur). N'annule PAS le solde d'avance deja comptabilise (contre-passation
  // manuelle via l'ecran ledger si necessaire : hors scope v1).
  async cancelReceipt(documentId: number, movementId: number, orgId: number) {
    const doc = await this.getDocument(documentId, orgId);
    if (doc.type !== "purchase_order") throw new BadRequestException("Seul un bon de commande peut avoir des receptions.");

    const [movement] = await this.db
      .select()
      .from(batiproStockMovements)
      .where(and(
        eq(batiproStockMovements.id, movementId),
        eq(batiproStockMovements.documentId, documentId),
        eq(batiproStockMovements.organizationId, orgId),
        eq(batiproStockMovements.movementType, "reception"),
        eq(batiproStockMovements.isActive, 1),
      ))
      .limit(1);
    if (!movement) throw new NotFoundException("Mouvement de reception introuvable.");

    await this.db.transaction(async (tx) => {
      await tx.update(batiproStockMovements).set({ isActive: 0 }).where(eq(batiproStockMovements.id, movementId));

      if (movement.materialId) {
        const [line] = await tx
          .select({ id: batiproDocumentLines.id })
          .from(batiproDocumentLines)
          .where(and(
            eq(batiproDocumentLines.documentId, documentId),
            eq(batiproDocumentLines.organizationId, orgId),
            eq(batiproDocumentLines.materialId, movement.materialId),
            eq(batiproDocumentLines.isActive, 1),
          ))
          .limit(1);
        if (line) {
          await tx.update(batiproDocumentLines)
            .set({ receivedQuantity: sql`GREATEST(${batiproDocumentLines.receivedQuantity} - ${movement.quantity}, 0)` })
            .where(eq(batiproDocumentLines.id, line.id));
        }
      }

      const refreshed = await tx
        .select({ id: batiproDocumentLines.id, quantity: batiproDocumentLines.quantity, receivedQuantity: batiproDocumentLines.receivedQuantity, materialId: batiproDocumentLines.materialId })
        .from(batiproDocumentLines)
        .where(and(eq(batiproDocumentLines.documentId, documentId), eq(batiproDocumentLines.organizationId, orgId), eq(batiproDocumentLines.isActive, 1)));
      const trackedLines = refreshed.filter((l) => l.materialId != null);
      const anyReceived = trackedLines.some((l) => Number(l.receivedQuantity ?? 0) > 0.0005);
      const allReceived = trackedLines.length > 0 && trackedLines.every((l) => Number(l.receivedQuantity ?? 0) >= Number(l.quantity ?? 0) - 0.0005);
      const nextStatus = allReceived ? "received" : anyReceived ? "partially_received" : "confirmed";

      const patch: Partial<typeof batiproDocuments.$inferInsert> = { status: nextStatus };
      if (nextStatus !== "received") {
        patch.receivedAt = null;
        patch.receivedBy = null;
      }
      await tx.update(batiproDocuments).set(patch).where(eq(batiproDocuments.id, documentId));
    });

    await this.publish("cancelReceipt", ["documents", "document_lines", "stock_movements"], "updated", documentId, orgId);
    return this.getDocument(documentId, orgId);
  }

  async deleteDocument(id: number, orgId: number) {
    await this.getDocument(id, orgId);
    await this.db.update(batiproDocuments).set({ isActive: 0 }).where(and(eq(batiproDocuments.id, id), eq(batiproDocuments.organizationId, orgId)));
    await this.publish("deleteDocument", ["documents"], "deleted", id, orgId);
    return { message: "Document supprime." };
  }

  // ── Phase 3 : situations de travaux (type=situation, direction=outbound) ──
  //
  // HYPOTHESES DE CALCUL (logique BTP standard, documentees) :
  //  - Une situation = decompte periodique. Chaque ligne reference une PHASE +
  //    un % d'avancement CUMULE (progress_pct) atteint a cette situation.
  //  - Montant de marche d'une phase : (1) si `contract_amount` est saisi sur la
  //    ligne, on l'utilise ; sinon (2) somme des line_ht des DEVIS sortants du
  //    chantier (parent si fourni, sinon tous devis actifs) dont les lignes sont
  //    rattachees a cette phase. Si aucune reference : montant de marche = 0.
  //  - Montant de la periode pour la ligne =
  //      montant_marche_phase * (progress_pct_courant - progress_pct_precedent) / 100
  //    ou progress_pct_precedent = max des progress_pct des situations ANTERIEURES
  //    actives du chantier sur la meme phase (0 si premiere situation).
  //  - Les totaux HT/TVA/TTC sont recalcules serveur. Chaque ligne stocke le
  //    montant de periode dans line_ht (quantity=1, unit_price=montant periode)
  //    pour rester compatible avec le rendu HTML/totaux generiques.

  // Montant de marche par phase, deduit des devis sortants du chantier, VENTILE
  // PAR DEVISE (une ligne peut porter sa propre devise, migration 0232 ; sinon
  // elle herite de la devise du document). Renvoie Map<phaseId, Map<currencyId
  // (0 = sans devise), montant_ht>>. parentDocumentId : si fourni, ne considere
  // que ce devis ; sinon tous les devis actifs du chantier.
  // IMPORTANT : ne JAMAIS sommer aveuglement toutes devises confondues — les
  // appelants doivent comparer un plafond dans la devise de la phase.
  private async phaseContractAmounts(orgId: number, projectId: number, parentDocumentId?: number | null) {
    const rows = await this.db
      .select({ phaseId: batiproDocumentLines.phaseId, lineHt: batiproDocumentLines.lineHt, lineCurrencyId: batiproDocumentLines.currencyId, phaseCurrencyId: batiproPhases.currencyId })
      .from(batiproDocumentLines)
      .innerJoin(batiproDocuments, eq(batiproDocuments.id, batiproDocumentLines.documentId))
      .leftJoin(batiproPhases, eq(batiproPhases.id, batiproDocumentLines.phaseId))
      .where(and(
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.projectId, projectId),
        eq(batiproDocuments.direction, "outbound"),
        eq(batiproDocuments.type, "quote"),
        eq(batiproDocuments.isActive, 1),
        eq(batiproDocumentLines.isActive, 1),
        parentDocumentId ? eq(batiproDocuments.id, parentDocumentId) : undefined,
      ));
    const byPhase = new Map<number, Map<number, number>>();
    for (const r of rows) {
      if (r.phaseId == null) continue;
      // Meme regle de fallback que phaseAmountInCurrency : la ligne herite de la
      // devise de la phase (jamais du document), pour que les deux cotes
      // (ecriture ici, lecture dans phaseAmountInCurrency) bucketisent pareil.
      const currencyId = r.lineCurrencyId ?? r.phaseCurrencyId ?? 0;
      const byCurrency = byPhase.get(r.phaseId) ?? new Map<number, number>();
      byCurrency.set(currencyId, (byCurrency.get(currencyId) ?? 0) + Number(r.lineHt ?? 0));
      byPhase.set(r.phaseId, byCurrency);
    }
    return byPhase;
  }

  // Avancement CUMULE deja acte par phase (situations ANTERIEURES actives du
  // chantier). Renvoie Map<phaseId, max_progress_pct>. Permet de pre-remplir une
  // nouvelle situation et de calculer le delta de la periode.
  private async priorProgressByPhase(orgId: number, projectId: number, excludeDocumentId?: number) {
    const rows = await this.db
      .select({ phaseId: batiproDocumentLines.phaseId, progressPct: batiproDocumentLines.progressPct })
      .from(batiproDocumentLines)
      .innerJoin(batiproDocuments, eq(batiproDocuments.id, batiproDocumentLines.documentId))
      .where(and(
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.projectId, projectId),
        eq(batiproDocuments.direction, "outbound"),
        eq(batiproDocuments.type, "situation"),
        eq(batiproDocuments.isActive, 1),
        eq(batiproDocumentLines.isActive, 1),
        excludeDocumentId ? sql`${batiproDocuments.id} <> ${excludeDocumentId}` : undefined,
      ));
    const byPhase = new Map<number, number>();
    for (const r of rows) {
      if (r.phaseId == null || r.progressPct == null) continue;
      const v = Number(r.progressPct);
      if (v > (byPhase.get(r.phaseId) ?? 0)) byPhase.set(r.phaseId, v);
    }
    return byPhase;
  }

  // Montant deja facture (cumul des situations ANTERIEURES actives) par phase,
  // VENTILE PAR DEVISE (meme logique que phaseContractAmounts, voir plus haut).
  // Renvoie Map<phaseId, Map<currencyId (0 = sans devise), montant_ht_cumule>>.
  // Sert au plafond de paiement (cap - deja_paye) pour ne jamais depasser le
  // budget planifie d'une phase, comparaison faite dans la devise de la phase.
  private async priorPaidAmountByPhase(orgId: number, projectId: number, excludeDocumentId?: number) {
    const rows = await this.db
      .select({ phaseId: batiproDocumentLines.phaseId, lineHt: batiproDocumentLines.lineHt, lineCurrencyId: batiproDocumentLines.currencyId, phaseCurrencyId: batiproPhases.currencyId })
      .from(batiproDocumentLines)
      .innerJoin(batiproDocuments, eq(batiproDocuments.id, batiproDocumentLines.documentId))
      .leftJoin(batiproPhases, eq(batiproPhases.id, batiproDocumentLines.phaseId))
      .where(and(
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.projectId, projectId),
        eq(batiproDocuments.direction, "outbound"),
        eq(batiproDocuments.type, "situation"),
        eq(batiproDocuments.isActive, 1),
        eq(batiproDocumentLines.isActive, 1),
        excludeDocumentId ? sql`${batiproDocuments.id} <> ${excludeDocumentId}` : undefined,
      ));
    const byPhase = new Map<number, Map<number, number>>();
    for (const r of rows) {
      if (r.phaseId == null) continue;
      // Meme regle de fallback que phaseAmountInCurrency (ligne -> phase, jamais document).
      const currencyId = r.lineCurrencyId ?? r.phaseCurrencyId ?? 0;
      const byCurrency = byPhase.get(r.phaseId) ?? new Map<number, number>();
      byCurrency.set(currencyId, (byCurrency.get(currencyId) ?? 0) + Number(r.lineHt ?? 0));
      byPhase.set(r.phaseId, byCurrency);
    }
    return byPhase;
  }

  // Plafond de paiement d'une phase a la date T (SCRUM-267).
  //  - cap_mode = 'off', ou plannedBudget absent → pas de plafond (null).
  //  - cap_mode = 'manual' → plafond = plannedBudget plein (pas de prorata).
  //  - cap_mode = 'planning' (defaut) → plafond = plannedBudget * ratio temps
  //    ecoule, ratio borne [0..1]. Duree = plannedDurationDays si renseignee,
  //    sinon (endDate - startDate) en jours. Sans aucune duree disponible en
  //    mode planning : pas de plafond (comportement 'off', pas de crash).
  private phasePaymentCap(
    phase: Pick<typeof batiproPhases.$inferSelect, "plannedBudget" | "plannedDurationDays" | "capMode" | "startDate" | "endDate">,
    dateT: Date = new Date(),
  ): number | null {
    const plannedBudget = phase.plannedBudget != null ? Number(phase.plannedBudget) : null;
    const capMode = phase.capMode ?? "planning";
    if (capMode === "off" || plannedBudget == null) return null;
    if (capMode === "manual") return plannedBudget;

    // capMode === "planning"
    let durationDays = phase.plannedDurationDays ?? null;
    if (durationDays == null && phase.startDate && phase.endDate) {
      const start = new Date(phase.startDate);
      const end = new Date(phase.endDate);
      const diffMs = end.getTime() - start.getTime();
      durationDays = Math.round(diffMs / 86400000);
    }
    if (!phase.startDate || !durationDays || durationDays <= 0) return null;

    const start = new Date(phase.startDate);
    const elapsedDays = (dateT.getTime() - start.getTime()) / 86400000;
    const ratio = Math.min(1, Math.max(0, elapsedDays / durationDays));
    return Math.round(plannedBudget * ratio * 100) / 100;
  }

  // Extrait, depuis une Map<phaseId, Map<currencyId, montant>> (voir
  // phaseContractAmounts/priorPaidAmountByPhase), le montant DANS LA DEVISE DE
  // LA PHASE uniquement (0 = sans devise). Ne mélange jamais plusieurs devises :
  // un montant dans une autre devise que celle de la phase est ignoré ici (le
  // plafond de paiement compare toujours des montants de meme devise).
  private phaseAmountInCurrency(
    byPhase: Map<number, Map<number, number>>,
    phaseId: number,
    phaseCurrencyId: number | null,
  ): number {
    const byCurrency = byPhase.get(phaseId);
    if (!byCurrency) return 0;
    return byCurrency.get(phaseCurrencyId ?? 0) ?? 0;
  }

  // Etat d'avancement cumule par phase (pour pre-remplir une nouvelle situation).
  // Renvoie, pour chaque phase active du chantier : montant de marche, %
  // deja acte (cumul precedent), et progression physique de la phase.
  async situationsAdvancement(projectId: number, orgId: number) {
    const project = await this.getProject(projectId, orgId);
    const phases = await this.phases(orgId, projectId);
    const contract = await this.phaseContractAmounts(orgId, projectId);
    const prior = await this.priorProgressByPhase(orgId, projectId);
    const priorPaid = await this.priorPaidAmountByPhase(orgId, projectId);
    const currencyRows = await this.db.select().from(currencies);
    const currencyById = new Map(currencyRows.map((c) => [c.id, c] as const));
    const now = new Date();
    return {
      project_id: projectId,
      currency_id: project.currencyId ?? null,
      currency_code: project.currencyCode ?? null,
      currency_symbol: project.currencySymbol ?? null,
      phases: phases.map((p) => {
        const contractAmount = Math.round(this.phaseAmountInCurrency(contract, p.id, p.currencyId ?? null) * 100) / 100;
        const previousProgressPct = prior.get(p.id) ?? 0;
        const alreadyPaid = this.phaseAmountInCurrency(priorPaid, p.id, p.currencyId ?? null);
        const cap = this.phasePaymentCap(p, now);
        // Montant que produirait l'avancement physique actuel de la phase,
        // avant plafonnement (pour signaler un depassement de plafond).
        const uncappedRemaining = Math.round((contractAmount * (Number(p.progress ?? 0) / 100) - alreadyPaid) * 100) / 100;
        const overCap = cap != null && uncappedRemaining > (cap - alreadyPaid);
        // Devise de la phase (migration 0230) : si absente, herite de la devise du chantier.
        const phaseCurrency = p.currencyId != null ? currencyById.get(p.currencyId) : null;
        return {
          phase_id: p.id,
          label: p.label,
          physical_progress: Number(p.progress ?? 0),
          contract_amount: contractAmount,
          previous_progress_pct: previousProgressPct,
          planned_budget: p.plannedBudget != null ? Number(p.plannedBudget) : null,
          planned_duration_days: p.plannedDurationDays ?? null,
          cap_mode: p.capMode,
          payment_cap: cap,
          over_cap: overCap,
          currency_id: p.currencyId ?? null,
          currency_code: phaseCurrency?.currencyCode ?? project.currencyCode ?? null,
        };
      }),
    };
  }

  // Cree une situation de travaux (type=situation). Calcule le montant de la
  // periode par phase a partir du delta d'avancement. Numerotation SIT-YYYY-XXXX.
  async createSituationDocument(input: CreateBatiproSituationDocumentDto, orgId: number) {
    await this.getProject(input.project_id, orgId);
    if (!Array.isArray(input.lines) || !input.lines.length) throw new BadRequestException("Au moins une phase est requise.");
    if (input.parent_document_id != null) {
      // Anti-fuite : le devis parent doit appartenir a l'org et au chantier.
      const parent = await this.getDocument(input.parent_document_id, orgId);
      if (parent.projectId !== input.project_id) throw new BadRequestException("Le devis de reference n'appartient pas a ce chantier.");
    }

    const validPhases = await this.validPhaseIds(orgId, input.project_id);
    const contract = await this.phaseContractAmounts(orgId, input.project_id, input.parent_document_id ?? null);
    const prior = await this.priorProgressByPhase(orgId, input.project_id);
    const priorPaid = await this.priorPaidAmountByPhase(orgId, input.project_id);
    const phasesById = new Map((await this.phases(orgId, input.project_id)).map((p) => [p.id, p] as const));
    const situationDate = input.issue_date ? new Date(input.issue_date) : new Date();

    const defaultCurrencyId = input.currency_id ?? null;
    let totalHt = 0, totalVat = 0;
    const totalsByCurrencyMap = new Map<number | null, { totalHt: number; totalVat: number; totalTtc: number }>();
    const lines = input.lines
      .filter((l) => validPhases.has(l.phase_id))
      .map((l, index) => {
        const phase = phasesById.get(l.phase_id);
        const phaseCurrencyId = phase?.currencyId ?? null;
        const contractAmount = l.contract_amount != null ? Number(l.contract_amount) : this.phaseAmountInCurrency(contract, l.phase_id, phaseCurrencyId);
        const current = Number(l.progress_pct);
        const previous = prior.get(l.phase_id) ?? 0;
        // Delta borne >= 0 (on ne facture jamais un avancement negatif).
        const deltaPct = Math.max(0, current - previous);
        const computedPeriodHt = Math.round(contractAmount * (deltaPct / 100) * 100) / 100;

        // Plafond de paiement par phase (SCRUM-267) : jamais depasser le
        // budget planifie de la phase (dans la devise de la phase), prorata
        // temps si cap_mode=planning.
        const alreadyPaid = this.phaseAmountInCurrency(priorPaid, l.phase_id, phaseCurrencyId);
        const cap = phase ? this.phasePaymentCap(phase, situationDate) : null;
        const remainingUnderCap = cap != null ? Math.max(0, cap - alreadyPaid) : null;
        const periodHt = remainingUnderCap != null ? Math.min(computedPeriodHt, remainingUnderCap) : computedPeriodHt;

        const vatRate = Number(l.vat_rate ?? 0);
        const lineVat = Math.round(periodHt * (vatRate / 100) * 100) / 100;
        totalHt += periodHt;
        totalVat += lineVat;
        const label = l.designation || phase?.label || `Phase ${l.phase_id}`;
        // Devise de la ligne : celle saisie sur la ligne, sinon celle de la phase, sinon celle du document.
        const effectiveCurrencyId = l.currency_id ?? phase?.currencyId ?? defaultCurrencyId ?? null;
        const entry = totalsByCurrencyMap.get(effectiveCurrencyId) ?? { totalHt: 0, totalVat: 0, totalTtc: 0 };
        entry.totalHt += periodHt;
        entry.totalVat += lineVat;
        entry.totalTtc += periodHt + lineVat;
        totalsByCurrencyMap.set(effectiveCurrencyId, entry);
        return {
          organizationId: orgId,
          documentId: 0,
          position: index,
          designation: `${label} — avancement ${current.toFixed(2)}% (période ${previous.toFixed(2)}% → ${current.toFixed(2)}%)`,
          quantity: "1",
          unitPrice: String(periodHt),
          vatRate: String(vatRate),
          lineHt: String(periodHt),
          lineTtc: String(Math.round((periodHt + lineVat) * 100) / 100),
          phaseId: l.phase_id,
          progressPct: String(current),
          currencyId: l.currency_id ?? null,
        };
      });
    if (!lines.length) throw new BadRequestException("Aucune phase valide pour ce chantier.");
    const totalTtc = Math.round((totalHt + totalVat) * 100) / 100;
    const year = input.issue_date ? new Date(input.issue_date).getFullYear() : new Date().getFullYear();
    const totalsByCurrency = Array.from(totalsByCurrencyMap.entries())
      .filter(([currencyId]) => currencyId != null)
      .map(([currencyId, t]) => ({
        currencyId: currencyId as number,
        totalHt: Math.round(t.totalHt * 100) / 100,
        totalVat: Math.round(t.totalVat * 100) / 100,
        totalTtc: Math.round(t.totalTtc * 100) / 100,
      }));

    const documentId = await this.db.transaction(async (tx) => {
      const { number } = await this.nextDocumentNumber(tx, orgId, "situation", year);
      const [result] = await tx.insert(batiproDocuments).values({
        organizationId: orgId,
        projectId: input.project_id,
        type: "situation",
        direction: "outbound",
        number,
        status: "draft",
        currencyId: input.currency_id ?? null,
        parentDocumentId: input.parent_document_id ?? null,
        totalHt: String(Math.round(totalHt * 100) / 100),
        totalVat: String(Math.round(totalVat * 100) / 100),
        totalTtc: String(totalTtc),
        notes: input.period ? `Période : ${input.period}${input.notes ? `\n${input.notes}` : ""}` : (input.notes ?? null),
        issueDate: input.issue_date ?? null,
        dueDate: input.due_date ?? null,
      }).$returningId();
      const id = Number(result.id);
      for (const line of lines) line.documentId = id;
      await tx.insert(batiproDocumentLines).values(lines);
      await this.replaceDocumentTotals(tx, id, orgId, totalsByCurrency);
      return id;
    });

    await this.publish("createSituationDocument", ["documents", "document_lines"], "created", documentId, orgId);
    return this.getDocument(documentId, orgId);
  }

  // ── Phase 2 : suivi budgetaire chantier (devis vs BC engages vs budget) ──
  // Montant devis = somme des devis outbound acceptes. BC engages = somme des
  // bons de commande outbound actifs (hors annules). Compare au budget/contrat
  // du chantier. Aucun montant en dur : totaux recalcules cote serveur/DB.
  async projectBudgetSummary(projectId: number, orgId: number) {
    const project = await this.getProject(projectId, orgId);
    const projectCurrencyId = project.currencyId ?? null;
    // Filtre devise Phase D : ne totalise que les documents dans la devise du
    // chantier (ou sans devise renseignee). Pas de conversion inter-devises.
    const sameCurrency = projectCurrencyId != null
      ? sql`(${batiproDocuments.currencyId} = ${projectCurrencyId} OR ${batiproDocuments.currencyId} IS NULL)`
      : sql`${batiproDocuments.currencyId} IS NULL`;

    const [quoteAgg] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${batiproDocuments.totalTtc}), 0)` })
      .from(batiproDocuments)
      .where(and(
        eq(batiproDocuments.projectId, projectId),
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.isActive, 1),
        eq(batiproDocuments.direction, "outbound"),
        eq(batiproDocuments.type, "quote"),
        eq(batiproDocuments.status, "accepted"),
        sameCurrency,
      ));

    const [poAgg] = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${batiproDocuments.totalTtc}), 0)`,
        paid: sql<string>`COALESCE(SUM(${batiproDocuments.paidAmount}), 0)`,
      })
      .from(batiproDocuments)
      .where(and(
        eq(batiproDocuments.projectId, projectId),
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.isActive, 1),
        eq(batiproDocuments.direction, "outbound"),
        eq(batiproDocuments.type, "purchase_order"),
        sql`${batiproDocuments.status} <> 'cancelled'`,
        sameCurrency,
      ));

    const [invoiceAgg] = await this.db
      .select({
        issued: sql<string>`COALESCE(SUM(${batiproDocuments.totalTtc}), 0)`,
        cashed: sql<string>`COALESCE(SUM(${batiproDocuments.paidAmount}), 0)`,
      })
      .from(batiproDocuments)
      .where(and(
        eq(batiproDocuments.projectId, projectId),
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.isActive, 1),
        eq(batiproDocuments.direction, "outbound"),
        eq(batiproDocuments.type, "invoice"),
        sql`${batiproDocuments.status} IN ('issued', 'paid')`,
        sameCurrency,
      ));

    // Statut "valide" d'un avenant : le formulaire front (ChangeOrderModal) n'ecrit
    // que "Valide", mais des donnees existantes portent l'accent "Validé" -> les deux acceptes.
    const [changeOrderAgg] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${batiproChangeOrders.amount}), 0)` })
      .from(batiproChangeOrders)
      .where(and(
        eq(batiproChangeOrders.projectId, projectId),
        eq(batiproChangeOrders.organizationId, orgId),
        eq(batiproChangeOrders.isActive, 1),
        sql`${batiproChangeOrders.status} IN ('Valide', 'Validé')`,
      ));

    // Montants ignores (autre devise que celle du chantier) : regroupes par
    // devise pour affichage, pas de conversion. Reste un simple SELECT groupe,
    // pas de sur-ingenierie (le nombre de devises differentes par chantier est faible).
    //
    // Deux sources combinees :
    //  (a) documents SANS aucune ligne batipro_document_totals (crees avant la
    //      migration 0232, ou entierement mono-devise NULL) : comportement
    //      HISTORIQUE inchange, lu depuis batipro_documents.currency_id/total_ttc.
    //  (b) documents AVEC des lignes batipro_document_totals (migration 0232) :
    //      ventilation reelle par devise, y compris un document dont les LIGNES
    //      melangent plusieurs devises differentes de celle du chantier.
    const docsWithTotalsRows = (await this.db
      .select({ documentId: batiproDocumentTotals.documentId })
      .from(batiproDocumentTotals)
      .innerJoin(batiproDocuments, eq(batiproDocuments.id, batiproDocumentTotals.documentId))
      .where(and(
        eq(batiproDocumentTotals.organizationId, orgId),
        eq(batiproDocumentTotals.isActive, 1),
        eq(batiproDocuments.projectId, projectId),
      )))
      .map((r) => r.documentId);

    const otherCurrencyAggLegacy = await this.db
      .select({
        currencyCode: currencies.currencyCode,
        total: sql<string>`COALESCE(SUM(${batiproDocuments.totalTtc}), 0)`,
      })
      .from(batiproDocuments)
      .leftJoin(currencies, eq(currencies.id, batiproDocuments.currencyId))
      .where(and(
        eq(batiproDocuments.projectId, projectId),
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.isActive, 1),
        sql`NOT ${sameCurrency}`,
        docsWithTotalsRows.length ? notInArray(batiproDocuments.id, docsWithTotalsRows) : undefined,
      ))
      .groupBy(currencies.currencyCode);

    const sameCurrencyTotals = projectCurrencyId != null
      ? eq(batiproDocumentTotals.currencyId, projectCurrencyId)
      : sql`1 = 0`;
    const otherCurrencyAggFromTotals = await this.db
      .select({
        currencyCode: currencies.currencyCode,
        total: sql<string>`COALESCE(SUM(${batiproDocumentTotals.totalTtc}), 0)`,
      })
      .from(batiproDocumentTotals)
      .innerJoin(batiproDocuments, eq(batiproDocuments.id, batiproDocumentTotals.documentId))
      .leftJoin(currencies, eq(currencies.id, batiproDocumentTotals.currencyId))
      .where(and(
        eq(batiproDocuments.projectId, projectId),
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.isActive, 1),
        eq(batiproDocumentTotals.organizationId, orgId),
        eq(batiproDocumentTotals.isActive, 1),
        sql`NOT (${sameCurrencyTotals})`,
      ))
      .groupBy(currencies.currencyCode);

    // Fusion JS des deux sources (par code devise) : pas de sur-ingenierie SQL,
    // le nombre de devises differentes par chantier reste faible.
    const otherCurrencyMerged = new Map<string | null, number>();
    for (const row of [...otherCurrencyAggLegacy, ...otherCurrencyAggFromTotals]) {
      const key = row.currencyCode ?? null;
      otherCurrencyMerged.set(key, (otherCurrencyMerged.get(key) ?? 0) + Number(row.total ?? 0));
    }
    const otherCurrencyAgg = Array.from(otherCurrencyMerged.entries()).map(([currencyCode, total]) => ({ currencyCode, total }));

    const quoteAccepted = Number(quoteAgg?.total ?? 0);
    const purchaseOrdersEngaged = Number(poAgg?.total ?? 0);
    const costActual = Number(poAgg?.paid ?? 0);
    const billedIssued = Number(invoiceAgg?.issued ?? 0);
    const billedCashed = Number(invoiceAgg?.cashed ?? 0);
    const changeOrdersValidated = Number(changeOrderAgg?.total ?? 0);
    const budget = Number(project.budget ?? 0);
    const contractAmount = Number(project.contractAmount ?? 0);
    // "spent" reflete le decaisse reel (paye sur BC actifs), pas la colonne figee
    // batipro_projects.spent (saisie manuelle historique, jamais recalculee).
    const spent = costActual;
    const referenceBudget = contractAmount || budget;
    const otherCurrencyAmounts = otherCurrencyAgg
      .map((row) => ({ currency_code: row.currencyCode ?? null, amount: Number(row.total ?? 0) }))
      .filter((row) => row.amount > 0);

    return {
      project_id: projectId,
      currency_id: project.currencyId ?? null,
      currency_code: project.currencyCode ?? null,
      currency_symbol: project.currencySymbol ?? null,
      budget,
      contract_amount: contractAmount,
      spent,
      quote_accepted: quoteAccepted,
      purchase_orders_engaged: purchaseOrdersEngaged,
      cost_committed: purchaseOrdersEngaged,
      cost_actual: costActual,
      billed_issued: billedIssued,
      billed_cashed: billedCashed,
      contract_with_change_orders: Math.round((contractAmount + changeOrdersValidated) * 100) / 100,
      has_other_currency: otherCurrencyAmounts.length > 0,
      // Montants non comptes ci-dessus car dans une autre devise que le chantier
      // (pas de taux de change invente, affichage separe uniquement).
      other_currency_amounts: otherCurrencyAmounts,
      other_currency_amount: otherCurrencyAmounts[0]?.amount ?? 0,
      other_currency_code: otherCurrencyAmounts[0]?.currency_code ?? null,
      remaining_vs_budget: Math.round((referenceBudget - purchaseOrdersEngaged) * 100) / 100,
      engagement_rate: referenceBudget > 0 ? Math.round((purchaseOrdersEngaged / referenceBudget) * 10000) / 100 : null,
    };
  }

  // Genere/renouvelle le token client d'un document et renvoie le token (le lien
  // partageable est construit cote front). Reutilise le pattern token opaque.
  async shareDocument(id: number, orgId: number, expiryDays = 30) {
    const doc = await this.getDocument(id, orgId);
    const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 8);
    await this.db.update(batiproDocuments).set({
      clientToken: token,
      clientTokenExpiry: sql`DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ${expiryDays} DAY)` as any,
      status: doc.status === "draft" ? "sent" : doc.status,
    }).where(eq(batiproDocuments.id, id));
    await this.publish("shareDocument", ["documents"], "updated", id, orgId);
    return { id, token };
  }

  // ── Phase 4 : factures (type=invoice) + comptabilisation ledger ──────────

  // Genere une facture depuis une situation VALIDEE : reprend les lignes/montants
  // de la situation, chaine parent_document_id, numerotation FAC-YYYY-XXXX, draft.
  async createInvoiceFromSituation(situationDocumentId: number, orgId: number) {
    const situation = await this.getDocument(situationDocumentId, orgId);
    if (situation.type !== "situation") throw new BadRequestException("Le document source n'est pas une situation.");
    if (situation.direction !== "outbound") throw new BadRequestException("Seule une situation sortante peut etre facturee.");
    if (situation.status !== "validated") {
      throw new BadRequestException("La situation doit etre validee avant d'etre facturee.");
    }
    if (!situation.lines.length) throw new BadRequestException("La situation ne contient aucune ligne a facturer.");

    const year = new Date().getFullYear();
    const documentId = await this.db.transaction(async (tx) => {
      const { number } = await this.nextDocumentNumber(tx, orgId, "invoice", year);
      const [result] = await tx.insert(batiproDocuments).values({
        organizationId: orgId,
        projectId: situation.projectId,
        type: "invoice",
        direction: "outbound",
        number,
        status: "draft",
        currencyId: situation.currencyId ?? null,
        parentDocumentId: situation.id,
        totalHt: String(situation.totalHt),
        totalVat: String(situation.totalVat),
        totalTtc: String(situation.totalTtc),
        notes: situation.notes ?? null,
        issueDate: sql`CURRENT_DATE` as any,
      }).$returningId();
      const id = Number(result.id);
      // Recopie les lignes de la situation (sans progressPct : c'est une facture).
      const lines = situation.lines.map((l, index) => ({
        organizationId: orgId,
        documentId: id,
        position: index,
        designation: l.designation,
        quantity: String(l.quantity),
        unitPrice: String(l.unitPrice),
        vatRate: String(l.vatRate),
        lineHt: String(l.lineHt),
        lineTtc: String(l.lineTtc),
        phaseId: l.phaseId ?? null,
      }));
      if (lines.length) await tx.insert(batiproDocumentLines).values(lines);
      // La situation passe a "invoiced" (fin de son cycle).
      await tx.update(batiproDocuments).set({ status: "invoiced" }).where(eq(batiproDocuments.id, situation.id));
      return id;
    });

    await this.publish("createInvoiceFromSituation", ["documents", "document_lines"], "created", documentId, orgId);
    return this.getDocument(documentId, orgId);
  }

  // Genere une facture FOURNISSEUR (type=invoice, direction=inbound) depuis un
  // bon de commande, chainee par parent_document_id. Un BC peut recevoir
  // PLUSIEURS factures fournisseur (livraisons/facturation partielles) : le
  // montant facturable restant = total_ttc du BC - somme(total_ttc des factures
  // inbound actives deja rattachees). Deux modes :
  //  - `lines` fourni : recopie des lignes choisies (permet une facturation
  //    ligne par ligne, ex. une partie des materiaux commandes).
  //  - sinon `amount_ht`/`amount_ttc` : une ligne unique "Facture partielle/totale
  //    BC <numero>" du montant demande (facturation echelonnee sans repartition
  //    par ligne, cas le plus courant fournisseur).
  // IMPORTANT (choix de design) : cette facture ne repasse PAS par
  // postPurchaseToLedger — la DEPENSE (charge + TVA deductible + dette
  // fournisseur) est deja comptabilisee UNE SEULE FOIS au niveau du BC
  // (postPurchaseToLedger). La facture fournisseur ne sert qu'au SUIVI
  // (rapprochement livraison/facturation, cumul facture) et au REGLEMENT
  // (recordPayment sur la facture elle-meme, cf. plus bas). Si le BC n'a pas
  // encore ete comptabilise, aucune ecriture n'est posee par cette methode.
  async createInvoiceFromPurchaseOrder(
    purchaseOrderId: number,
    orgId: number,
    input: { amount_ht?: number; amount_ttc?: number; lines?: Array<{ designation: string; quantity?: number; unit_price?: number; vat_rate?: number; phase_id?: number; material_id?: number; currency_id?: number }> } = {},
  ) {
    const po = await this.getDocument(purchaseOrderId, orgId);
    if (po.type !== "purchase_order") throw new BadRequestException("Le document source n'est pas un bon de commande.");
    if (po.direction !== "outbound") throw new BadRequestException("Bon de commande invalide : direction inattendue.");
    if (po.status === "draft") throw new BadRequestException("Emettez le bon de commande avant de le facturer.");
    if (po.status === "cancelled") throw new BadRequestException("Bon de commande annule : facturation impossible.");

    // Cumul deja facture par les factures fournisseur (inbound) rattachees.
    const existingInvoices = await this.db
      .select({ totalTtc: batiproDocuments.totalTtc })
      .from(batiproDocuments)
      .where(and(
        eq(batiproDocuments.parentDocumentId, purchaseOrderId),
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.type, "invoice"),
        eq(batiproDocuments.direction, "inbound"),
        eq(batiproDocuments.isActive, 1),
        sql`${batiproDocuments.status} <> 'cancelled'`,
      ));
    const alreadyInvoiced = existingInvoices.reduce((sum, r) => sum + Number(r.totalTtc ?? 0), 0);
    const poTotalTtc = Number(po.totalTtc ?? 0);
    const remainingTtc = Math.round((poTotalTtc - alreadyInvoiced) * 100) / 100;
    if (remainingTtc <= 0.001) {
      throw new BadRequestException("Ce bon de commande est deja entierement facture.");
    }

    const year = new Date().getFullYear();
    let lines: Array<Record<string, unknown>>;
    let totalHt: number;
    let totalVat: number;
    let totalTtc: number;

    if (Array.isArray(input.lines) && input.lines.length) {
      const phaseIds = await this.validPhaseIds(orgId, po.projectId);
      const computed = this.computeDocumentTotals(input.lines, orgId, phaseIds, po.currencyId ?? null);
      lines = computed.lines;
      totalHt = computed.totalHt;
      totalVat = computed.totalVat;
      totalTtc = computed.totalTtc;
    } else {
      // Facturation par montant global (pas de repartition par ligne). Si aucun
      // montant fourni, facture le solde restant (facturation totale en une fois).
      const requestedTtc = input.amount_ttc != null ? Number(input.amount_ttc) : (input.amount_ht != null ? null : remainingTtc);
      const poVatRate = poTotalTtc > 0 ? (Number(po.totalVat ?? 0) / (Number(po.totalHt ?? 0) || 1)) * 100 : 0;
      let lineHt: number;
      let lineVat: number;
      if (input.amount_ht != null) {
        lineHt = Math.round(Number(input.amount_ht) * 100) / 100;
        lineVat = Math.round(lineHt * (poVatRate / 100) * 100) / 100;
      } else {
        const ttc = requestedTtc ?? remainingTtc;
        lineHt = Math.round((ttc / (1 + poVatRate / 100)) * 100) / 100;
        lineVat = Math.round((ttc - lineHt) * 100) / 100;
      }
      totalHt = lineHt;
      totalVat = lineVat;
      totalTtc = Math.round((lineHt + lineVat) * 100) / 100;
      if (totalTtc > remainingTtc + 0.01) {
        throw new BadRequestException(`Le montant facture (${totalTtc}) depasse le solde restant a facturer (${remainingTtc}).`);
      }
      lines = [{
        organizationId: orgId,
        documentId: 0,
        position: 0,
        designation: `Facture fournisseur BC ${po.number ?? purchaseOrderId}`,
        quantity: "1",
        unitPrice: String(lineHt),
        vatRate: String(Math.round(poVatRate * 100) / 100),
        lineHt: String(lineHt),
        lineTtc: String(totalTtc),
        phaseId: null,
        materialId: null,
        currencyId: null,
      }];
    }

    if (totalTtc <= 0) throw new BadRequestException("Le montant de la facture doit etre strictement positif.");
    if (Math.round((alreadyInvoiced + totalTtc) * 100) / 100 > poTotalTtc + 0.01) {
      throw new BadRequestException(`Le total facture depasserait le montant du bon de commande (${poTotalTtc}).`);
    }

    const documentId = await this.db.transaction(async (tx) => {
      const { number } = await this.nextDocumentNumber(tx, orgId, "invoice", year);
      const [result] = await tx.insert(batiproDocuments).values({
        organizationId: orgId,
        projectId: po.projectId,
        type: "invoice",
        direction: "inbound",
        number,
        status: "issued",
        currencyId: po.currencyId ?? null,
        supplierId: po.supplierId ?? null,
        parentDocumentId: po.id,
        totalHt: String(totalHt),
        totalVat: String(totalVat),
        totalTtc: String(totalTtc),
        notes: po.notes ?? null,
        issueDate: sql`CURRENT_DATE` as any,
      }).$returningId();
      const id = Number(result.id);
      for (const line of lines) line.documentId = id;
      if (lines.length) await tx.insert(batiproDocumentLines).values(lines as any);
      return id;
    });

    await this.publish("createInvoiceFromPurchaseOrder", ["documents", "document_lines"], "created", documentId, orgId);
    return this.getDocument(documentId, orgId);
  }

  // Liste les factures fournisseur (type=invoice, direction=inbound) rattachees
  // a un bon de commande + le cumul facture/paye vs le total du BC, pour
  // affichage du solde restant a facturer/payer sur la fiche BC. Retro-
  // compatible : un BC sans facture rattachee renvoie une liste vide et son
  // propre paidAmount reste la seule source de suivi (paiement direct historique).
  async listPurchaseOrderInvoices(purchaseOrderId: number, orgId: number) {
    const po = await this.getDocument(purchaseOrderId, orgId);
    if (po.type !== "purchase_order") throw new BadRequestException("Le document n'est pas un bon de commande.");

    const invoices = await this.db
      .select({
        ...getTableColumns(batiproDocuments),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproDocuments)
      .leftJoin(currencies, eq(currencies.id, batiproDocuments.currencyId))
      .where(and(
        eq(batiproDocuments.parentDocumentId, purchaseOrderId),
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.type, "invoice"),
        eq(batiproDocuments.direction, "inbound"),
        eq(batiproDocuments.isActive, 1),
      ))
      .orderBy(desc(batiproDocuments.id));

    const activeInvoices = invoices.filter((i) => i.status !== "cancelled");
    const invoicedTtc = Math.round(activeInvoices.reduce((sum, i) => sum + Number(i.totalTtc ?? 0), 0) * 100) / 100;
    const paidTtc = Math.round(activeInvoices.reduce((sum, i) => sum + Number(i.paidAmount ?? 0), 0) * 100) / 100;
    const poTotalTtc = Number(po.totalTtc ?? 0);

    return {
      purchase_order_id: purchaseOrderId,
      po_total_ttc: poTotalTtc,
      invoiced_ttc: invoicedTtc,
      remaining_to_invoice_ttc: Math.round((poTotalTtc - invoicedTtc) * 100) / 100,
      paid_ttc: paidTtc,
      invoices,
    };
  }

  // Comptabilise une facture via le ledger (postByRules, ROLES metier — JAMAIS de
  // compte en dur). Idempotent par idempotencyKey (re-appel ne double pas
  // l'ecriture). Respecte gate d'approbation + periodes cloturees (gere par le
  // ledger). Stocke ledger_entry_id + incremente batipro_projects.billed_amount.
  async postInvoiceToLedger(invoiceDocumentId: number, orgId: number, userId?: number) {
    const invoice = await this.getDocument(invoiceDocumentId, orgId);
    if (invoice.type !== "invoice") throw new BadRequestException("Seule une facture peut etre comptabilisee.");
    if (invoice.direction !== "outbound") throw new BadRequestException("Seule une facture sortante peut etre comptabilisee.");
    if (invoice.status === "cancelled") throw new BadRequestException("Facture annulee : comptabilisation impossible.");
    this.assertSingleCurrencyForLedger(invoice);

    const totalHt = Number(invoice.totalHt ?? 0);
    const totalVat = Number(invoice.totalVat ?? 0);
    const totalTtc = Number(invoice.totalTtc ?? 0);
    if (!(totalTtc > 0)) throw new BadRequestException("Montant de facture nul : rien a comptabiliser.");

    // Roles metier (resolus en comptes via transaction_type_rules, type=batipro_invoice) :
    //  - receivable  = creance client        (DEBIT, TTC)
    //  - revenue     = produit / vente        (CREDIT, HT)
    //  - vat_output  = TVA collectee          (CREDIT, TVA)
    // Dimension analytique : projet du registre partage lie au chantier BatiPro.
    const analyticProjectId = await this.resolveAnalyticProjectId(invoice.projectId, orgId);
    const result = await this.ledger.postByRules(
      {
        type: "batipro_invoice",
        reference: invoice.number ?? `FAC-${invoiceDocumentId}`,
        particulars: `Facture BatiPro ${invoice.number ?? invoiceDocumentId}`,
        sourceModule: "batipro",
        relatedId: String(invoiceDocumentId),
        idempotencyKey: `batipro:invoice:${invoiceDocumentId}`,
        currencyId: invoice.currencyId ?? undefined,
        amountsByRole: {
          receivable: totalTtc,
          revenue: totalHt,
          vat_output: totalVat,
        },
        dimensions: { projectId: analyticProjectId },
      },
      orgId,
      userId,
    );

    // Ecriture differee (gate d'approbation) : on ne fige rien tant qu'elle n'est
    // pas comptabilisee. La facture reste emise, l'ecriture sera rejouee a l'approbation.
    const deferred = (result as { deferred?: boolean }).deferred === true;
    const ledgerEntryId = result.id > 0 ? result.id : null;

    await this.db.transaction(async (tx) => {
      const patch: Partial<typeof batiproDocuments.$inferInsert> = {
        status: invoice.status === "draft" ? "issued" : invoice.status,
      };
      if (ledgerEntryId) patch.ledgerEntryId = ledgerEntryId;
      await tx.update(batiproDocuments).set(patch).where(eq(batiproDocuments.id, invoiceDocumentId));

      // Suivi budgetaire : incremente billed_amount du chantier UNE SEULE FOIS
      // (seulement lors de la 1re comptabilisation, ledgerEntryId absent avant).
      if (ledgerEntryId && invoice.ledgerEntryId == null) {
        await tx.update(batiproProjects)
          .set({ billedAmount: sql`${batiproProjects.billedAmount} + ${totalTtc}` })
          .where(and(eq(batiproProjects.id, invoice.projectId), eq(batiproProjects.organizationId, orgId)));
      }
    });

    await this.publish("postInvoiceToLedger", ["documents", "projects"], "updated", invoiceDocumentId, orgId);
    return { id: invoiceDocumentId, ledger_entry_id: ledgerEntryId, deferred };
  }

  // Comptabilise un bon de commande fournisseur (DEPENSE) via le ledger (postByRules,
  // ROLES metier — JAMAIS de compte en dur). Idempotent par idempotencyKey.
  // Ne touche PAS billedAmount (c'est une depense, pas une facturation de vente).
  async postPurchaseToLedger(purchaseOrderId: number, orgId: number, userId?: number) {
    const purchase = await this.getDocument(purchaseOrderId, orgId);
    if (purchase.type !== "purchase_order") throw new BadRequestException("Seul un bon de commande peut etre comptabilise en depense.");
    if (purchase.direction !== "outbound") throw new BadRequestException("Bon de commande invalide : direction inattendue.");
    if (purchase.status === "cancelled") throw new BadRequestException("Bon de commande annule : comptabilisation impossible.");
    this.assertSingleCurrencyForLedger(purchase);

    const totalHt = Number(purchase.totalHt ?? 0);
    const totalVat = Number(purchase.totalVat ?? 0);
    const totalTtc = Number(purchase.totalTtc ?? 0);
    if (!(totalTtc > 0)) throw new BadRequestException("Montant du bon de commande nul : rien a comptabiliser.");

    // Roles metier (resolus en comptes via transaction_type_rules, type=batipro_purchase) :
    //  - expense    = charge / achat           (DEBIT, HT)
    //  - vat_input  = TVA deductible            (DEBIT, TVA)
    //  - payable    = dette fournisseur         (CREDIT, TTC)
    // Dimension analytique : projet du registre partage lie au chantier BatiPro.
    const analyticProjectId = await this.resolveAnalyticProjectId(purchase.projectId, orgId);
    const result = await this.ledger.postByRules(
      {
        type: "batipro_purchase",
        reference: purchase.number ?? `BC-${purchaseOrderId}`,
        particulars: `Bon de commande BatiPro ${purchase.number ?? purchaseOrderId}`,
        sourceModule: "batipro",
        relatedId: String(purchaseOrderId),
        idempotencyKey: `batipro:purchase:${purchaseOrderId}`,
        currencyId: purchase.currencyId ?? undefined,
        amountsByRole: {
          expense: totalHt,
          vat_input: totalVat,
          payable: totalTtc,
        },
        dimensions: { projectId: analyticProjectId },
      },
      orgId,
      userId,
    );

    const deferred = (result as { deferred?: boolean }).deferred === true;
    const ledgerEntryId = result.id > 0 ? result.id : null;

    if (ledgerEntryId) {
      await this.db.update(batiproDocuments)
        .set({ ledgerEntryId })
        .where(and(eq(batiproDocuments.id, purchaseOrderId), eq(batiproDocuments.organizationId, orgId)));
    }

    await this.publish("postPurchaseToLedger", ["documents"], "updated", purchaseOrderId, orgId);
    return { id: purchaseOrderId, ledger_entry_id: ledgerEntryId, deferred };
  }

  // Enregistre un reglement (partiel/total) d'une facture, d'un bon de commande
  // ou d'une facture FOURNISSEUR (type=invoice, direction=inbound, rattachee a
  // un BC via parent_document_id). Met a jour paid_amount et le statut
  // (issued -> paid). Pour une facture de VENTE (direction=outbound), la
  // comptabilisation de l'ENCAISSEMENT reste REPORTEE (moyen de paiement non
  // fixe). Pour un reglement fournisseur (achat) — BC direct (retro-
  // compatibilite, BC sans facture separee) OU facture fournisseur rattachee —
  // le DECAISSEMENT est comptabilise ici (v1 : Cash par defaut, pas de choix
  // banque/caisse) :
  //   - Si le BC associe n'est PAS encore entierement receptionne
  //     (status <> 'received') : le reglement est une AVANCE (acompte verse
  //     avant livraison) -> role batipro_supplier_advance (DEBIT supplier_advance
  //     / CREDIT cash). L'avance est une CREANCE sur le fournisseur (actif), pas
  //     encore une dette apuree.
  //   - Sinon (BC deja receptionne) : reglement classique batipro_supplier_payment
  //     (DEBIT payable / CREDIT cash), comme avant. Le solde de l'avance deja
  //     versee (le cas echeant) est gere a part, a la reception (receivePurchaseOrder).
  // NB design : une facture fournisseur ne comptabilise PAS sa propre charge/TVA
  // (deja fait une fois par postPurchaseToLedger sur le BC parent) — seul le
  // REGLEMENT (avance/paiement) passe par le ledger ici, exactement comme pour
  // un paiement direct sur BC.
  async recordPayment(invoiceDocumentId: number, amount: number, orgId: number, userId?: number) {
    const invoice = await this.getDocument(invoiceDocumentId, orgId);
    const isPurchaseOrder = invoice.type === "purchase_order";
    const isSupplierInvoice = invoice.type === "invoice" && invoice.direction === "inbound";
    if (!isPurchaseOrder && !isSupplierInvoice && invoice.type !== "invoice") {
      throw new BadRequestException("Seule une facture ou un bon de commande peut recevoir un paiement.");
    }
    // Le reglement suit la comptabilisation "achat" (avance/paiement fournisseur)
    // pour un BC direct OU une facture fournisseur inbound rattachee a un BC.
    const isSupplierSettlement = isPurchaseOrder || isSupplierInvoice;
    const docLabel = isPurchaseOrder ? "Bon de commande" : isSupplierInvoice ? "Facture fournisseur" : "Facture";
    if (invoice.status === "cancelled") throw new BadRequestException(`${docLabel} annule(e) : aucun paiement possible.`);
    if (invoice.status === "draft") throw new BadRequestException(`Emettez ${isPurchaseOrder ? "le bon de commande" : "la facture"} avant d'enregistrer un paiement.`);
    if (!(amount > 0)) throw new BadRequestException("Le montant du paiement doit etre strictement positif.");

    const totalTtc = Number(invoice.totalTtc ?? 0);
    const alreadyPaid = Number(invoice.paidAmount ?? 0);
    const newPaid = Math.round((alreadyPaid + amount) * 100) / 100;
    if (newPaid > totalTtc + 0.001) {
      throw new BadRequestException(`Le total regle (${newPaid}) depasse le montant du document (${totalTtc}).`);
    }
    const fullyPaid = newPaid >= totalTtc - 0.001;
    // Un BC n'a pas de statut "paid" dans son cycle (draft/sent/confirmed/
    // partially_received/received/cancelled) : paidAmount suit seul le reglement.
    // Une facture fournisseur (comme une facture de vente) suit issued -> paid.
    const nextStatus = fullyPaid && !isPurchaseOrder ? "paid" : invoice.status;

    // Garde-fou mono-devise AVANT toute ecriture : un document multi-devise ne
    // doit jamais etre marque paye sans ecriture comptable en face.
    if (isSupplierSettlement) this.assertSingleCurrencyForLedger(invoice);

    // Pour une facture fournisseur, l'etat "receptionne" se lit sur le BC PARENT
    // (parent_document_id), pas sur la facture elle-meme (qui n'a pas de cycle
    // de reception propre).
    let referenceDocumentStatus = invoice.status;
    if (isSupplierInvoice && invoice.parentDocumentId) {
      const [parentPo] = await this.db
        .select({ status: batiproDocuments.status })
        .from(batiproDocuments)
        .where(and(eq(batiproDocuments.id, invoice.parentDocumentId), eq(batiproDocuments.organizationId, orgId)))
        .limit(1);
      referenceDocumentStatus = parentPo?.status ?? invoice.status;
    }

    await this.db.update(batiproDocuments)
      .set({ paidAmount: String(newPaid), status: nextStatus })
      .where(and(eq(batiproDocuments.id, invoiceDocumentId), eq(batiproDocuments.organizationId, orgId)));

    let paymentLedgerEntryId: number | null = null;
    let paymentDeferred = false;
    if (isSupplierSettlement) {
      const isAdvance = referenceDocumentStatus !== "received";
      // Idempotence sur le CUMUL paye (centimes) pour ne pas avaler les reglements
      // partiels successifs (un idempotencyKey base sur l'id seul avalerait le 2e reglement).
      // Dimension analytique : projet du registre partage lie au chantier BatiPro.
      const analyticProjectId = await this.resolveAnalyticProjectId(invoice.projectId, orgId);
      const refLabel = isSupplierInvoice ? "Facture fournisseur" : "BC";
      const result = await this.ledger.postByRules(
        isAdvance
          ? {
              type: "batipro_supplier_advance",
              reference: invoice.number ?? `${refLabel}-${invoiceDocumentId}`,
              particulars: `Avance fournisseur ${refLabel} ${invoice.number ?? invoiceDocumentId}`,
              sourceModule: "batipro",
              relatedId: String(invoiceDocumentId),
              idempotencyKey: `batipro:supplier_advance:${invoiceDocumentId}:${Math.round(newPaid * 100)}`,
              currencyId: invoice.currencyId ?? undefined,
              amountsByRole: {
                supplier_advance: amount,
                cash: amount,
              },
              dimensions: { projectId: analyticProjectId },
            }
          : {
              type: "batipro_supplier_payment",
              reference: invoice.number ?? `${refLabel}-${invoiceDocumentId}`,
              particulars: `Reglement fournisseur ${refLabel} ${invoice.number ?? invoiceDocumentId}`,
              sourceModule: "batipro",
              relatedId: String(invoiceDocumentId),
              idempotencyKey: `batipro:supplier_payment:${invoiceDocumentId}:${Math.round(newPaid * 100)}`,
              currencyId: invoice.currencyId ?? undefined,
              amountsByRole: {
                payable: amount,
                cash: amount,
              },
              dimensions: { projectId: analyticProjectId },
            },
        orgId,
        userId,
      );
      paymentDeferred = (result as { deferred?: boolean }).deferred === true;
      paymentLedgerEntryId = result.id > 0 ? result.id : null;
      if (paymentLedgerEntryId) {
        await this.db.update(batiproDocuments)
          .set({ paymentLedgerEntryId })
          .where(and(eq(batiproDocuments.id, invoiceDocumentId), eq(batiproDocuments.organizationId, orgId)));
      }
    }

    await this.publish("recordPayment", ["documents"], "updated", invoiceDocumentId, orgId);
    return {
      id: invoiceDocumentId,
      paid_amount: newPaid,
      balance: Math.round((totalTtc - newPaid) * 100) / 100,
      status: nextStatus,
      ...(isSupplierSettlement ? { payment_ledger_entry_id: paymentLedgerEntryId, payment_deferred: paymentDeferred } : {}),
    };
  }

  // ── Rendu HTML imprimable (calque hr.service.ts payrollPdfHtml) ──────────
  // Sert l'apercu gestionnaire ET la page client publique. Devise via join DB.
  async documentHtml(id: number, orgId: number): Promise<string> {
    const doc = await this.getDocument(id, orgId);
    const [project] = await this.db
      .select({ name: batiproProjects.name, code: batiproProjects.code, client: batiproProjects.client, location: batiproProjects.location })
      .from(batiproProjects)
      .where(and(eq(batiproProjects.id, doc.projectId), eq(batiproProjects.organizationId, orgId)))
      .limit(1);
    const setting = await readOrgAppSetting(this.db, orgId, { companyName: appSettings.companyName });
    return this.renderDocumentHtml(doc, project ?? null, (setting?.companyName as string | null) || "Mon Organisation");
  }

  private renderDocumentHtml(doc: any, project: { name?: string | null; code?: string | null; client?: string | null; location?: string | null } | null, orgName: string): string {
    const cur = doc.currencyCode || "USD";
    const fmt = (v: any) => Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const typeLabels: Record<string, string> = { quote: "Devis", purchase_order: "Bon de commande", situation: "Situation de travaux", invoice: "Facture" };
    const statusLabels: Record<string, string> = {
      draft: "Brouillon", sent: "Envoyé", viewed: "Consulté", accepted: "Accepté", refused: "Refusé", expired: "Expiré",
      confirmed: "Confirmé", received: "Réceptionné", cancelled: "Annulé",
      submitted: "Soumise", validated: "Validée", invoiced: "Facturée",
    };
    const statusColors: Record<string, string> = {
      draft: "#f59e0b", sent: "#3b82f6", viewed: "#3b82f6", accepted: "#10b981", refused: "#ef4444", expired: "#6b7280",
      confirmed: "#10b981", received: "#0d9488", cancelled: "#ef4444",
      submitted: "#3b82f6", validated: "#10b981", invoiced: "#0d9488",
    };
    const isSituation = doc.type === "situation";
    const status = String(doc.status || "draft");
    const dateFr = (d: any) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
    const issued = dateFr(doc.issueDate || doc.createdAt);
    const docLines = doc.lines || [];
    // Multi-devise par ligne (migration 0232) : n'affiche une colonne/mention
    // devise par ligne QUE si le document en compte reellement plusieurs
    // (sinon rendu strictement identique a avant, pas de regression visuelle).
    const totalsByCurrency: Array<{ currencyId: number; totalHt: any; totalVat: any; totalTtc: any; currencyCode?: string | null }> = doc.totalsByCurrency || [];
    const isMultiCurrency = totalsByCurrency.length > 1;
    const lineCurrency = (l: any) => (l.currencyCode || cur);
    // Situation : colonnes metier (phase, % avancement cumule, montant periode).
    const situationRows = docLines.map((l: any) => `<tr>
        <td>${esc(l.designation)}</td>
        <td class="amount">${l.progressPct != null ? `${fmt(l.progressPct)} %` : "—"}</td>
        <td class="amount">${fmt(l.lineHt)}${isMultiCurrency ? ` ${esc(lineCurrency(l))}` : ""}</td>
      </tr>`).join("");
    const rows = docLines.map((l: any) => {
      const vat = Number(l.vatRate || 0);
      return `<tr>
        <td>${esc(l.designation)}</td>
        <td class="amount">${fmt(l.quantity)}</td>
        <td class="amount">${fmt(l.unitPrice)}${isMultiCurrency ? ` ${esc(lineCurrency(l))}` : ""}</td>
        <td class="amount">${vat ? `${fmt(vat)} %` : "—"}</td>
        <td class="amount">${fmt(l.lineHt)}${isMultiCurrency ? ` ${esc(lineCurrency(l))}` : ""}</td>
      </tr>`;
    }).join("");

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(typeLabels[doc.type] || "Document")} ${esc(doc.number || "")} — ${esc(project?.name || "")}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111;background:#fff;padding:40px 48px;max-width:820px;margin:0 auto}
@media print{body{padding:20px 24px}@page{margin:1cm}}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #d97706;padding-bottom:16px;margin-bottom:24px}
.org-name{font-size:18px;font-weight:700;color:#d97706;letter-spacing:1px}
.org-sub{font-size:11px;color:#666;margin-top:2px}
.doc-title{text-align:right}
.doc-title h1{font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
.doc-title .num{font-size:13px;color:#444;margin-top:2px}
.status-badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;color:#fff;background:${statusColors[status] || "#999"};margin-top:4px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
.info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px}
.info-box label{font-size:10px;text-transform:uppercase;color:#666;letter-spacing:.5px;display:block;margin-bottom:2px}
.info-box .v{font-size:13px;font-weight:600}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th{background:#f1f5f9;font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:.4px;padding:8px 12px;text-align:left;border-bottom:1px solid #e2e8f0}
td{padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}
.amount{text-align:right;font-variant-numeric:tabular-nums}
.totals{width:280px;margin-left:auto}
.totals td{padding:6px 12px}
.total-row td{font-weight:700;background:#f8fafc;border-top:2px solid #e2e8f0}
.ttc-row td{font-weight:700;font-size:15px;background:#d97706;color:#fff}
.notes{font-size:11px;color:#666;font-style:italic;margin-top:8px}
.mentions{font-size:11px;color:#666;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px}
.footer{display:flex;justify-content:space-between;margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:11px;color:#999}
.sig-line{margin-top:40px;border-top:1px solid #999;min-width:180px;padding-top:4px;font-size:11px;color:#666}
</style></head><body>
<div class="header">
  <div><div class="org-name">${esc(orgName)}</div><div class="org-sub">BâtiPro — Gestion de chantier</div></div>
  <div class="doc-title">
    <h1>${esc(typeLabels[doc.type] || "Document")}</h1>
    <div class="num">${esc(doc.number || "")}</div>
    <span class="status-badge">${esc(statusLabels[status] || status)}</span>
  </div>
</div>

<div class="info-grid">
  <div class="info-box"><label>Chantier</label><div class="v">${esc(project?.name || "—")}${project?.code ? ` (${esc(project.code)})` : ""}</div></div>
  <div class="info-box"><label>${doc.type === "purchase_order" ? "Fournisseur / sous-traitant" : "Client"}</label><div class="v">${esc(doc.type === "purchase_order" ? (doc.supplierName || doc.subcontractorName || "—") : (project?.client || "—"))}</div></div>
  <div class="info-box"><label>Date d'émission</label><div class="v">${issued}</div></div>
  <div class="info-box"><label>Échéance / validité</label><div class="v">${dateFr(doc.dueDate)}</div></div>
</div>

${isSituation
  ? `<table>
  <thead><tr><th>Phase / avancement</th><th class="amount">Avancement cumulé</th><th class="amount">Montant période (${esc(cur)})</th></tr></thead>
  <tbody>${situationRows || `<tr><td colspan="3" style="color:#999;text-align:center;font-style:italic">Aucune phase</td></tr>`}</tbody>
</table>`
  : `<table>
  <thead><tr><th>Désignation</th><th class="amount">Qté</th><th class="amount">P.U. (${esc(cur)})</th><th class="amount">TVA</th><th class="amount">Total HT (${esc(cur)})</th></tr></thead>
  <tbody>${rows || `<tr><td colspan="5" style="color:#999;text-align:center;font-style:italic">Aucune ligne</td></tr>`}</tbody>
</table>`}

${isMultiCurrency
  ? totalsByCurrency.map((t) => `<table class="totals">
  <tbody>
    <tr><td>Total HT (${esc(t.currencyCode || "")})</td><td class="amount">${fmt(t.totalHt)} ${esc(t.currencyCode || "")}</td></tr>
    <tr class="total-row"><td>TVA</td><td class="amount">${fmt(t.totalVat)} ${esc(t.currencyCode || "")}</td></tr>
    <tr class="ttc-row"><td>Total TTC</td><td class="amount">${fmt(t.totalTtc)} ${esc(t.currencyCode || "")}</td></tr>
  </tbody>
</table>`).join("")
  : `<table class="totals">
  <tbody>
    <tr><td>Total HT</td><td class="amount">${fmt(doc.totalHt)} ${esc(cur)}</td></tr>
    <tr class="total-row"><td>TVA</td><td class="amount">${fmt(doc.totalVat)} ${esc(cur)}</td></tr>
    <tr class="ttc-row"><td>Total TTC</td><td class="amount">${fmt(doc.totalTtc)} ${esc(cur)}</td></tr>
  </tbody>
</table>`}

${doc.notes ? `<div class="notes">Note : ${esc(doc.notes)}</div>` : ""}

<div class="mentions">
  ${doc.type === "purchase_order"
    ? `Bon de commande adressé au fournisseur/sous-traitant. Les prix sont exprimés en ${esc(cur)}. Merci de confirmer réception et délai de livraison.`
    : isSituation
    ? `Situation de travaux : décompte de l'avancement du chantier sur la période. Le montant à facturer correspond au delta d'avancement des phases par rapport à la situation précédente. Montants exprimés en ${esc(cur)}.`
    : `Devis valable jusqu'à la date d'échéance indiquée. Les prix sont exprimés en ${esc(cur)}. Bon pour accord : signature du client valant acceptation.`}
</div>

<div class="footer">
  <div>Réf. ${esc(doc.number || `#${doc.id}`)} · Émis le ${issued}</div>
  <div style="text-align:right"><div>Bon pour accord</div><div class="sig-line">Date et signature</div></div>
</div>
</body></html>`;
  }

  // ── Acces client public par token (devis) ────────────────────────────────
  private async resolveDocumentToken(token: string) {
    const [doc] = await this.db
      .select({
        ...getTableColumns(batiproDocuments),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproDocuments)
      .leftJoin(currencies, eq(currencies.id, batiproDocuments.currencyId))
      .where(and(eq(batiproDocuments.clientToken, token), eq(batiproDocuments.direction, "outbound"), eq(batiproDocuments.isActive, 1)))
      .limit(1);
    if (!doc) throw new NotFoundException("Document introuvable ou lien revoque.");
    if (doc.clientTokenExpiry && new Date(doc.clientTokenExpiry).getTime() < Date.now()) {
      throw new GoneException("Ce lien a expire.");
    }
    return doc;
  }

  // Rend le HTML du devis pour le client (public). Log "viewed" best-effort.
  async publicDocumentHtml(token: string): Promise<string> {
    const doc = await this.resolveDocumentToken(token);
    const orgId = doc.organizationId;
    const lineRows = await this.db
      .select({
        ...getTableColumns(batiproDocumentLines),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproDocumentLines)
      .leftJoin(currencies, eq(currencies.id, batiproDocumentLines.currencyId))
      .where(and(eq(batiproDocumentLines.documentId, doc.id), eq(batiproDocumentLines.organizationId, orgId), eq(batiproDocumentLines.isActive, 1)))
      .orderBy(batiproDocumentLines.position);
    const lines = lineRows.map((l) => ({
      ...l,
      currencyCode: l.currencyCode ?? doc.currencyCode ?? null,
      currencySymbol: l.currencySymbol ?? doc.currencySymbol ?? null,
    }));
    const totalsByCurrency = await this.db
      .select({
        currencyId: batiproDocumentTotals.currencyId,
        totalHt: batiproDocumentTotals.totalHt,
        totalVat: batiproDocumentTotals.totalVat,
        totalTtc: batiproDocumentTotals.totalTtc,
        currencyCode: currencies.currencyCode,
      })
      .from(batiproDocumentTotals)
      .leftJoin(currencies, eq(currencies.id, batiproDocumentTotals.currencyId))
      .where(and(eq(batiproDocumentTotals.documentId, doc.id), eq(batiproDocumentTotals.organizationId, orgId), eq(batiproDocumentTotals.isActive, 1)))
      .orderBy(batiproDocumentTotals.currencyId);
    const [project] = await this.db
      .select({ name: batiproProjects.name, code: batiproProjects.code, client: batiproProjects.client, location: batiproProjects.location })
      .from(batiproProjects)
      .where(and(eq(batiproProjects.id, doc.projectId), eq(batiproProjects.organizationId, orgId)))
      .limit(1);
    const setting = await readOrgAppSetting(this.db, orgId, { companyName: appSettings.companyName });
    if (doc.status === "sent") {
      try { await this.db.update(batiproDocuments).set({ status: "viewed" as any }).where(eq(batiproDocuments.id, doc.id)); } catch { /* best-effort */ }
    }
    return this.renderDocumentHtml({ ...doc, lines, totalsByCurrency }, project ?? null, (setting?.companyName as string | null) || "Mon Organisation");
  }

  // Le client accepte le devis (public). Un devis accepte une fois suffit.
  async acceptDocument(token: string, audit?: { ip?: string; ua?: string }) {
    const doc = await this.resolveDocumentToken(token);
    if (doc.status === "accepted") return { id: doc.id, status: "accepted", message: "Ce devis est deja accepte." };
    if (doc.type !== "quote") throw new BadRequestException("Seuls les devis peuvent etre acceptes.");
    const auditNote = audit ? `\n[Accepté] ${new Date().toISOString()} ip=${audit.ip ?? "?"} ua=${(audit.ua ?? "?").slice(0, 120)}` : "";
    await this.db.update(batiproDocuments).set({
      status: "accepted",
      notes: doc.notes ? `${doc.notes}${auditNote}` : (auditNote.trim() || null),
    }).where(eq(batiproDocuments.id, doc.id));
    await this.publish("acceptDocument", ["documents"], "updated", doc.id, doc.organizationId);
    return { id: doc.id, status: "accepted", message: "Devis accepte. Merci." };
  }

  // ── Galerie photo de chantier (site + documents sources) ────────────────
  // Verifie que le chantier appartient a l'org et reste dans le scope RBAC
  // courant (memes regles que projectDirectFilter : "all" = pas de filtre).
  private async assertProjectInScope(projectId: number, orgId: number, scope: BatiproProjectScope) {
    await this.getProject(projectId, orgId);
    if (scope !== "all" && !scope.includes(projectId)) {
      throw new NotFoundException("Chantier introuvable.");
    }
  }

  async uploadSitePhoto(projectId: number, file: any, orgId: number, userId: number | undefined, scope: BatiproProjectScope, opts?: { kind?: string; linkedDocumentId?: number }) {
    await this.assertProjectInScope(projectId, orgId, scope);
    const stored = await this.objectStorage.putDocument(file, `batipro/site-photos/${orgId}/${projectId}`);
    const [result] = await this.db.insert(batiproSitePhotos).values({
      organizationId: orgId,
      projectId,
      fileKey: stored.objectKey,
      fileFormat: stored.mimeType.split("/")[1] || null,
      fileSize: stored.sizeBytes,
      uploadedBy: userId ?? null,
      kind: opts?.kind || "site",
      linkedDocumentId: opts?.linkedDocumentId ?? null,
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createSitePhoto", ["photos"], "created", id, orgId);
    return this.getSitePhoto(id, orgId);
  }

  async sitePhotos(projectId: number, orgId: number, scope: BatiproProjectScope, filters: { from?: string; to?: string; taskId?: number; linkedDocumentId?: number }) {
    await this.assertProjectInScope(projectId, orgId, scope);
    const conditions = [
      eq(batiproSitePhotos.projectId, projectId),
      eq(batiproSitePhotos.organizationId, orgId),
      eq(batiproSitePhotos.isActive, 1),
    ];
    if (filters.from) conditions.push(gte(batiproSitePhotos.takenAt, new Date(filters.from)));
    if (filters.to) conditions.push(lte(batiproSitePhotos.takenAt, new Date(filters.to)));
    if (filters.taskId) conditions.push(eq(batiproSitePhotos.taskId, filters.taskId));
    if (filters.linkedDocumentId) conditions.push(eq(batiproSitePhotos.linkedDocumentId, filters.linkedDocumentId));
    return this.db
      .select()
      .from(batiproSitePhotos)
      .where(and(...conditions))
      .orderBy(desc(batiproSitePhotos.takenAt));
  }

  private async getSitePhoto(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(batiproSitePhotos)
      .where(and(eq(batiproSitePhotos.id, id), eq(batiproSitePhotos.organizationId, orgId), eq(batiproSitePhotos.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Photo introuvable.");
    return row;
  }

  async sitePhotoFile(id: number, orgId: number) {
    const photo = await this.getSitePhoto(id, orgId);
    const object = await this.objectStorage.getObject(photo.fileKey);
    return { ...object, mimeType: object.contentType };
  }

  async updateSitePhoto(id: number, input: UpdateBatiproSitePhotoDto, orgId: number) {
    await this.getSitePhoto(id, orgId);
    const patch: Partial<typeof batiproSitePhotos.$inferInsert> = {};
    if (input.caption !== undefined) patch.caption = input.caption || null;
    if (input.taken_at !== undefined) patch.takenAt = new Date(input.taken_at);
    if (input.task_id !== undefined) patch.taskId = input.task_id ?? null;
    if (Object.keys(patch).length) await this.db.update(batiproSitePhotos).set(patch).where(eq(batiproSitePhotos.id, id));
    await this.publish("updateSitePhoto", ["photos"], "updated", id, orgId);
    return this.getSitePhoto(id, orgId);
  }

  async deleteSitePhoto(id: number, orgId: number) {
    await this.getSitePhoto(id, orgId);
    // Soft delete uniquement : l'objet MinIO n'est jamais supprime ici.
    await this.db.update(batiproSitePhotos).set({ isActive: 0 }).where(and(eq(batiproSitePhotos.id, id), eq(batiproSitePhotos.organizationId, orgId)));
    await this.publish("deleteSitePhoto", ["photos"], "deleted", id, orgId);
    return { message: "Photo supprimee." };
  }

  // Rapport chronologique : liste des photos actives du chantier sur la
  // periode, avec l'URL de streaming du fichier. Pas de PDF cote backend,
  // le frontend genere la vue imprimable.
  async siteReport(projectId: number, orgId: number, scope: BatiproProjectScope, filters: { from?: string; to?: string }) {
    const project = await this.getProject(projectId, orgId);
    if (scope !== "all" && !scope.includes(projectId)) throw new NotFoundException("Chantier introuvable.");
    const photos = await this.sitePhotos(projectId, orgId, scope, filters);
    return {
      project: { id: project.id, code: project.code, name: project.name, client: project.client, location: project.location },
      from: filters.from ?? null,
      to: filters.to ?? null,
      photos: photos.map((p) => ({
        id: p.id,
        caption: p.caption,
        takenAt: p.takenAt,
        taskId: p.taskId,
        kind: p.kind,
        fileUrl: `/batipro/photos/${p.id}/file`,
      })),
    };
  }

  // ── Ouvriers nominatifs (pointage/presence) ──────────────────────────────
  async listWorkers(orgId: number, crewId?: number) {
    const conditions = [eq(batiproWorkers.organizationId, orgId), eq(batiproWorkers.isActive, 1)];
    if (crewId) conditions.push(eq(batiproWorkers.crewId, crewId));
    return this.db
      .select()
      .from(batiproWorkers)
      .where(and(...conditions))
      .orderBy(batiproWorkers.fullName);
  }

  async getWorker(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(batiproWorkers)
      .where(and(eq(batiproWorkers.id, id), eq(batiproWorkers.organizationId, orgId), eq(batiproWorkers.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Ouvrier introuvable.");
    return row;
  }

  async createWorker(input: CreateBatiproWorkerDto, orgId: number) {
    const [result] = await this.db.insert(batiproWorkers).values({
      organizationId: orgId,
      crewId: input.crew_id ?? null,
      fullName: input.full_name,
      role: input.role ?? null,
      phone: input.phone ?? null,
      dailyRate: input.daily_rate !== undefined ? String(input.daily_rate) : null,
      currencyId: input.currency_id ?? null,
    }).$returningId();
    const id = Number(result.id);
    await this.publish("createWorker", ["workers"], "created", id, orgId);
    return this.getWorker(id, orgId);
  }

  async updateWorker(id: number, input: UpdateBatiproWorkerDto, orgId: number) {
    await this.getWorker(id, orgId);
    const patch: Partial<typeof batiproWorkers.$inferInsert> = {};
    if (input.full_name !== undefined) patch.fullName = input.full_name;
    if (input.crew_id !== undefined) patch.crewId = input.crew_id ?? null;
    if (input.role !== undefined) patch.role = input.role || null;
    if (input.phone !== undefined) patch.phone = input.phone || null;
    if (input.daily_rate !== undefined) patch.dailyRate = input.daily_rate !== null ? String(input.daily_rate) : null;
    if (input.currency_id !== undefined) patch.currencyId = input.currency_id ?? null;
    if (Object.keys(patch).length) await this.db.update(batiproWorkers).set(patch).where(eq(batiproWorkers.id, id));
    await this.publish("updateWorker", ["workers"], "updated", id, orgId);
    return this.getWorker(id, orgId);
  }

  async deleteWorker(id: number, orgId: number) {
    await this.getWorker(id, orgId);
    await this.db.update(batiproWorkers).set({ isActive: 0 }).where(and(eq(batiproWorkers.id, id), eq(batiproWorkers.organizationId, orgId)));
    await this.publish("deleteWorker", ["workers"], "deleted", id, orgId);
    return { message: "Ouvrier supprime." };
  }

  // ── Pointage/presence journaliere sur chantier ───────────────────────────
  async listAttendance(projectId: number, orgId: number, scope: BatiproProjectScope, filters: { date?: string; from?: string; to?: string }) {
    await this.assertProjectInScope(projectId, orgId, scope);
    const conditions = [
      eq(batiproAttendance.projectId, projectId),
      eq(batiproAttendance.organizationId, orgId),
      eq(batiproAttendance.isActive, 1),
    ];
    if (filters.date) conditions.push(eq(batiproAttendance.attendanceDate, filters.date));
    if (filters.from) conditions.push(gte(batiproAttendance.attendanceDate, filters.from));
    if (filters.to) conditions.push(lte(batiproAttendance.attendanceDate, filters.to));
    return this.db
      .select()
      .from(batiproAttendance)
      .where(and(...conditions))
      .orderBy(desc(batiproAttendance.attendanceDate));
  }

  async getAttendance(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(batiproAttendance)
      .where(and(eq(batiproAttendance.id, id), eq(batiproAttendance.organizationId, orgId), eq(batiproAttendance.isActive, 1)))
      .limit(1);
    if (!row) throw new NotFoundException("Pointage introuvable.");
    return row;
  }

  // Upsert applicatif en lot : une ligne par ouvrier+date+chantier. Si une
  // ligne active existe deja pour ce triplet, on la met a jour plutot que
  // d'en creer une nouvelle (pas de contrainte unique DB stricte).
  async bulkUpsertAttendance(projectId: number, input: BulkUpsertAttendanceDto, orgId: number, userId: number | undefined, scope: BatiproProjectScope) {
    await this.assertProjectInScope(projectId, orgId, scope);
    const results: number[] = [];
    for (const entry of input.entries ?? []) {
      const [existing] = await this.db
        .select({ id: batiproAttendance.id })
        .from(batiproAttendance)
        .where(and(
          eq(batiproAttendance.projectId, projectId),
          eq(batiproAttendance.workerId, entry.worker_id),
          eq(batiproAttendance.attendanceDate, input.attendance_date),
          eq(batiproAttendance.organizationId, orgId),
          eq(batiproAttendance.isActive, 1),
        ))
        .limit(1);
      if (existing) {
        const patch: Partial<typeof batiproAttendance.$inferInsert> = {};
        if (entry.status !== undefined) patch.status = entry.status;
        if (entry.hours !== undefined) patch.hours = entry.hours !== null ? String(entry.hours) : null;
        if (entry.notes !== undefined) patch.notes = entry.notes || null;
        patch.recordedBy = userId ?? null;
        if (Object.keys(patch).length) await this.db.update(batiproAttendance).set(patch).where(eq(batiproAttendance.id, existing.id));
        results.push(existing.id);
        await this.publish("updateAttendance", ["attendance"], "updated", existing.id, orgId);
      } else {
        const [result] = await this.db.insert(batiproAttendance).values({
          organizationId: orgId,
          projectId,
          workerId: entry.worker_id,
          crewId: input.crew_id ?? null,
          attendanceDate: input.attendance_date,
          status: entry.status ?? "present",
          hours: entry.hours !== undefined && entry.hours !== null ? String(entry.hours) : null,
          notes: entry.notes ?? null,
          recordedBy: userId ?? null,
        }).$returningId();
        const id = Number(result.id);
        results.push(id);
        await this.publish("createAttendance", ["attendance"], "created", id, orgId);
      }
    }
    return this.listAttendance(projectId, orgId, scope, { date: input.attendance_date });
  }

  async updateAttendance(id: number, input: UpdateBatiproAttendanceDto, orgId: number) {
    await this.getAttendance(id, orgId);
    const patch: Partial<typeof batiproAttendance.$inferInsert> = {};
    if (input.status !== undefined) patch.status = input.status;
    if (input.hours !== undefined) patch.hours = input.hours !== null ? String(input.hours) : null;
    if (input.notes !== undefined) patch.notes = input.notes || null;
    if (Object.keys(patch).length) await this.db.update(batiproAttendance).set(patch).where(eq(batiproAttendance.id, id));
    await this.publish("updateAttendance", ["attendance"], "updated", id, orgId);
    return this.getAttendance(id, orgId);
  }

  async deleteAttendance(id: number, orgId: number) {
    await this.getAttendance(id, orgId);
    await this.db.update(batiproAttendance).set({ isActive: 0 }).where(and(eq(batiproAttendance.id, id), eq(batiproAttendance.organizationId, orgId)));
    await this.publish("deleteAttendance", ["attendance"], "deleted", id, orgId);
    return { message: "Pointage supprime." };
  }

  // ── Scan OCR devis/BC fournisseur (pre-remplissage du formulaire de creation) ──
  // Upload le fichier (image ou PDF) comme photo source_document, tente l'OCR
  // si c'est une image, puis parse le texte en best-effort. N'ecrit JAMAIS dans
  // batipro_documents : c'est une simple extraction, la creation reste un appel
  // separe (POST documents) avec sourcePhotoId optionnel pour relier les deux.
  async scanSupplierDocument(projectId: number, file: any, orgId: number, userId: number | undefined, scope: BatiproProjectScope) {
    await this.assertProjectInScope(projectId, orgId, scope);
    const stored = await this.objectStorage.putDocument(file, `batipro/ocr-scans/${orgId}/${projectId}`);
    const [result] = await this.db.insert(batiproSitePhotos).values({
      organizationId: orgId,
      projectId,
      fileKey: stored.objectKey,
      fileFormat: stored.mimeType.split("/")[1] || null,
      fileSize: stored.sizeBytes,
      uploadedBy: userId ?? null,
      kind: "source_document",
      isActive: 1,
    }).$returningId();
    const photoId = Number(result.id);
    await this.publish("createSitePhoto", ["photos"], "created", photoId, orgId);

    const isImage = ["image/jpeg", "image/png", "image/webp"].includes(stored.mimeType);
    if (!isImage) {
      return {
        photoId,
        rawText: "",
        message: "PDF non supporté en v1, utilisez une image",
        parsed: { supplierName: undefined, documentNumber: undefined, date: undefined, totalHt: undefined, totalTtc: undefined, lines: [] },
      };
    }

    const rawText = await this.ocr.extractText(file.buffer, stored.mimeType);
    const parsed = parseSupplierDocument(rawText);
    return { photoId, rawText, parsed };
  }

  // ── Notifications in-app (recalculees a la lecture, pas de cron) ─────────
  // evaluateNotifications recalcule 3 conditions a partir des donnees existantes
  // (lecture seule metier) et synchronise la table batipro_notifications :
  //   - condition vraie sans notif active du meme (type, entityType, entityId) => cree
  //   - condition vraie avec notif active existante => laisse telle quelle (pas de doublon)
  //   - condition plus vraie mais notif active existante => soft dismiss (isActive=0)
  async evaluateNotifications(orgId: number) {
    const today = sql`CURDATE()`;

    // 1) Taches en retard : date prevue < aujourd hui ET statut != termine.
    const overdueTasks = await this.db
      .select()
      .from(batiproTasks)
      .where(
        and(
          eq(batiproTasks.organizationId, orgId),
          eq(batiproTasks.isActive, 1),
          sql`${batiproTasks.taskDate} IS NOT NULL`,
          sql`${batiproTasks.taskDate} < ${today}`,
          ne(batiproTasks.status, "Termine"),
          ne(batiproTasks.status, "Terminé"),
        ),
      );

    // 2) Factures en attente : type=invoice, statut=sent (emise, non reglee/validee).
    const pendingInvoices = await this.db
      .select()
      .from(batiproDocuments)
      .where(
        and(
          eq(batiproDocuments.organizationId, orgId),
          eq(batiproDocuments.isActive, 1),
          eq(batiproDocuments.type, "invoice"),
          eq(batiproDocuments.status, "sent"),
        ),
      );

    // 3) Depassement budget chantier : spent > budget (montants > 0).
    const overspentProjects = await this.db
      .select()
      .from(batiproProjects)
      .where(
        and(
          eq(batiproProjects.organizationId, orgId),
          eq(batiproProjects.isActive, 1),
          sql`${batiproProjects.budget} > 0`,
          sql`${batiproProjects.spent} > ${batiproProjects.budget}`,
        ),
      );

    type Desired = {
      type: string;
      severity: string;
      title: string;
      message: string;
      entityType: string;
      entityId: number;
      projectId: number | null;
    };
    const desired: Desired[] = [];

    for (const task of overdueTasks) {
      desired.push({
        type: "task_overdue",
        severity: "warning",
        title: "Tache en retard",
        message: `La tache "${task.label}" a depasse sa date prevue.`.slice(0, 500),
        entityType: "task",
        entityId: Number(task.id),
        projectId: task.projectId != null ? Number(task.projectId) : null,
      });
    }
    for (const doc of pendingInvoices) {
      desired.push({
        type: "invoice_pending",
        severity: "info",
        title: "Facture en attente",
        message: `La facture ${doc.number ?? doc.id} est en attente de validation.`.slice(0, 500),
        entityType: "document",
        entityId: Number(doc.id),
        projectId: doc.projectId != null ? Number(doc.projectId) : null,
      });
    }
    for (const project of overspentProjects) {
      desired.push({
        type: "budget_exceeded",
        severity: "critical",
        title: "Budget depasse",
        message: `Le chantier "${project.name}" a depasse son budget.`.slice(0, 500),
        entityType: "project",
        entityId: Number(project.id),
        projectId: Number(project.id),
      });
    }

    // Notifications actuellement actives pour l org (toutes des 3 types geres).
    const existing = await this.db
      .select()
      .from(batiproNotifications)
      .where(
        and(
          eq(batiproNotifications.organizationId, orgId),
          eq(batiproNotifications.isActive, 1),
          inArray(batiproNotifications.type, ["task_overdue", "invoice_pending", "budget_exceeded"]),
        ),
      );

    const keyOf = (type: string, entityType: string | null, entityId: number | null) =>
      `${type}::${entityType ?? ""}::${entityId ?? ""}`;
    const desiredKeys = new Set(desired.map((d) => keyOf(d.type, d.entityType, d.entityId)));
    const existingKeys = new Set(
      existing.map((e) => keyOf(e.type, e.entityType, e.entityId != null ? Number(e.entityId) : null)),
    );

    // Creations : condition vraie sans notif active existante.
    const toCreate = desired.filter((d) => !existingKeys.has(keyOf(d.type, d.entityType, d.entityId)));
    if (toCreate.length) {
      await this.db.insert(batiproNotifications).values(
        toCreate.map((d) => ({
          organizationId: orgId,
          projectId: d.projectId,
          type: d.type,
          severity: d.severity,
          title: d.title,
          message: d.message,
          entityType: d.entityType,
          entityId: d.entityId,
        })),
      );
    }

    // Soft dismiss auto : notif active dont la condition n est plus vraie.
    const toDismiss = existing.filter(
      (e) => !desiredKeys.has(keyOf(e.type, e.entityType, e.entityId != null ? Number(e.entityId) : null)),
    );
    if (toDismiss.length) {
      await this.db
        .update(batiproNotifications)
        .set({ isActive: 0 })
        .where(
          and(
            eq(batiproNotifications.organizationId, orgId),
            inArray(
              batiproNotifications.id,
              toDismiss.map((e) => Number(e.id)),
            ),
          ),
        );
    }
  }

  async listNotifications(orgId: number, unreadOnly = false) {
    await this.evaluateNotifications(orgId);
    const filters = [eq(batiproNotifications.organizationId, orgId), eq(batiproNotifications.isActive, 1)];
    if (unreadOnly) filters.push(eq(batiproNotifications.isRead, 0));
    return this.db
      .select()
      .from(batiproNotifications)
      .where(and(...filters))
      .orderBy(desc(batiproNotifications.createdAt), desc(batiproNotifications.id));
  }

  private async getNotification(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(batiproNotifications)
      .where(
        and(
          eq(batiproNotifications.id, id),
          eq(batiproNotifications.organizationId, orgId),
          eq(batiproNotifications.isActive, 1),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Notification introuvable.");
    return row;
  }

  async markNotificationRead(id: number, orgId: number) {
    await this.getNotification(id, orgId);
    await this.db
      .update(batiproNotifications)
      .set({ isRead: 1, readAt: new Date() })
      .where(and(eq(batiproNotifications.id, id), eq(batiproNotifications.organizationId, orgId)));
    await this.publish("notification", ["notifications"], "updated", id, orgId);
    return this.getNotification(id, orgId);
  }

  async markAllNotificationsRead(orgId: number) {
    await this.db
      .update(batiproNotifications)
      .set({ isRead: 1, readAt: new Date() })
      .where(
        and(
          eq(batiproNotifications.organizationId, orgId),
          eq(batiproNotifications.isActive, 1),
          eq(batiproNotifications.isRead, 0),
        ),
      );
    await this.publish("notification", ["notifications"], "updated", "all", orgId);
    return { message: "Notifications marquees comme lues." };
  }

  async dismissNotification(id: number, orgId: number) {
    await this.getNotification(id, orgId);
    await this.db
      .update(batiproNotifications)
      .set({ isActive: 0 })
      .where(and(eq(batiproNotifications.id, id), eq(batiproNotifications.organizationId, orgId)));
    await this.publish("notification", ["notifications"], "deleted", id, orgId);
    return { message: "Notification supprimee." };
  }

  private async publish(kind: string, tables: string[], action: "created" | "updated" | "deleted", entityId: number | string, orgId: number) {
    try {
      await this.realtime.publishDataUpdated({
        entity: "batipro",
        action,
        entityId,
        scope: { module: "batipro", tenantId: orgId },
        permissions: ["readAll-batipro"],
        tags: ["batipro", kind, ...tables],
      });
    } catch (error) {
      console.warn("[BatiPro] realtime publish failed:", error instanceof Error ? error.message : String(error));
    }
  }
}
