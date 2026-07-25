import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { BatiproProjectScope } from "../auth/decorators/batipro-project-scope.decorator";
import {
  batiproChangeOrders,
  batiproCrews,
  batiproMaterials,
  batiproPhases,
  batiproProjectAssignments,
  batiproProjects,
  batiproSituations,
  batiproSubcontractors,
  batiproTasks,
  currencies,
} from "../database/schema";
import type { Database } from "../database/types";
import { RealtimeDataPublisher } from "../realtime/realtime-data-publisher.service";
import type {
  CreateBatiproChangeOrderDto,
  CreateBatiproCrewDto,
  CreateBatiproMaterialDto,
  CreateBatiproPhaseDto,
  CreateBatiproProjectDto,
  CreateBatiproSituationDto,
  CreateBatiproSubcontractorDto,
  CreateBatiproTaskDto,
  UpdateBatiproChangeOrderDto,
  UpdateBatiproCrewDto,
  UpdateBatiproMaterialDto,
  UpdateBatiproPhaseDto,
  UpdateBatiproProjectDto,
  UpdateBatiproSituationDto,
  UpdateBatiproSubcontractorDto,
  UpdateBatiproTaskDto,
} from "./dto/batipro.dto";

@Injectable()
export class BatiproService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly realtime: RealtimeDataPublisher,
  ) {}

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

  projects(orgId: number, projectScope: BatiproProjectScope = "all") {
    const scopeFilter = this.projectDirectFilter(batiproProjects.id, projectScope);
    return this.db
      .select({
        ...getTableColumns(batiproProjects),
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproProjects)
      .leftJoin(currencies, eq(currencies.id, batiproProjects.currencyId))
      .where(and(eq(batiproProjects.organizationId, orgId), eq(batiproProjects.isActive, 1), scopeFilter))
      .orderBy(desc(batiproProjects.id));
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
    if (input.spent !== undefined) patch.spent = String(input.spent);
    if (input.currency_id !== undefined) patch.currencyId = input.currency_id ?? null;
    if (input.contract_amount !== undefined) patch.contractAmount = String(input.contract_amount);
    if (input.billed_amount !== undefined) patch.billedAmount = String(input.billed_amount);
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

  materials(orgId: number) {
    return this.db
      .select()
      .from(batiproMaterials)
      .where(and(eq(batiproMaterials.organizationId, orgId), eq(batiproMaterials.isActive, 1)))
      .orderBy(batiproMaterials.name);
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

  // ── Situations de facturation ──────────────────────────────────────────
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
