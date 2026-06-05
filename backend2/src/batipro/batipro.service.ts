import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { batiproCrews, batiproMaterials, batiproProjects, batiproTasks } from "../database/schema";
import type { Database } from "../database/types";
import { RealtimeDataPublisher } from "../realtime/realtime-data-publisher.service";
import type {
  CreateBatiproCrewDto,
  CreateBatiproMaterialDto,
  CreateBatiproProjectDto,
  CreateBatiproTaskDto,
  UpdateBatiproCrewDto,
  UpdateBatiproMaterialDto,
  UpdateBatiproProjectDto,
  UpdateBatiproTaskDto,
} from "./dto/batipro.dto";

@Injectable()
export class BatiproService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly realtime: RealtimeDataPublisher,
  ) {}

  async dashboard(orgId: number) {
    const [projects, tasks, materials, crews] = await Promise.all([
      this.projects(orgId),
      this.tasks(orgId),
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

  projects(orgId: number) {
    return this.db
      .select()
      .from(batiproProjects)
      .where(and(eq(batiproProjects.organizationId, orgId), eq(batiproProjects.isActive, 1)))
      .orderBy(desc(batiproProjects.id));
  }

  async getProject(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(batiproProjects)
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

  tasks(orgId: number) {
    return this.db
      .select()
      .from(batiproTasks)
      .where(and(eq(batiproTasks.organizationId, orgId), eq(batiproTasks.isActive, 1)))
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
