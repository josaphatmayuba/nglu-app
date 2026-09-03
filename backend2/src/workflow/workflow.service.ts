import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { workflowApprovals, workflowInstances, workflows } from "../database/schema";
import type { Database } from "../database/types";
import { LedgerService } from "../ledger/ledger.service";

/** Une etape de circuit : ordre + role/permission requis pour approuver. */
export interface WorkflowStep {
  name: string;
  /** permission requise pour approuver cette etape (optionnel, informatif cote service). */
  permission?: string;
}

@Injectable()
export class WorkflowService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly ledger: LedgerService,
  ) {}

  // ─── Definitions ────────────────────────────────────────────────────────────

  async listWorkflows(orgId: number) {
    return this.db
      .select()
      .from(workflows)
      .where(eq(workflows.organizationId, orgId))
      .orderBy(desc(workflows.id));
  }

  /** Cree/définit un circuit (cle unique par organisation). */
  async createWorkflow(
    input: { key: string; name: string; steps: WorkflowStep[] },
    orgId: number,
  ) {
    if (!input.steps?.length) {
      throw new BadRequestException("Un workflow exige au moins une etape.");
    }
    const existing = await this.db
      .select({ id: workflows.id })
      .from(workflows)
      .where(and(eq(workflows.organizationId, orgId), eq(workflows.key, input.key)))
      .limit(1);
    if (existing.length) {
      throw new ConflictException(`Un workflow avec la cle "${input.key}" existe deja.`);
    }
    const [row] = await this.db
      .insert(workflows)
      .values({
        organizationId: orgId,
        key: input.key,
        name: input.name,
        steps: input.steps,
      })
      .$returningId();
    return { id: row.id };
  }

  // ─── Instances ───────────────────────────────────────────────────────────────

  /** Soumet une entite metier dans un circuit (par cle de workflow). */
  async submit(
    input: { workflowKey: string; entityType: string; entityId: string },
    orgId: number,
    userId?: number,
  ) {
    const wf = await this.getWorkflowByKey(input.workflowKey, orgId);
    const [row] = await this.db
      .insert(workflowInstances)
      .values({
        organizationId: orgId,
        workflowId: wf.id,
        entityType: input.entityType,
        entityId: input.entityId,
        currentStep: 0,
        status: "pending",
        submittedBy: userId,
      })
      .$returningId();
    return { id: row.id, status: "pending", currentStep: 0 };
  }

  /** Approuve l'etape courante : avance ou clot l'instance si derniere etape. */
  async approve(instanceId: number, comment: string | undefined, orgId: number, userId?: number) {
    return this.decide(instanceId, "approved", comment, orgId, userId);
  }

  /** Rejette l'instance (statut rejected, fin du circuit). */
  async reject(instanceId: number, comment: string | undefined, orgId: number, userId?: number) {
    return this.decide(instanceId, "rejected", comment, orgId, userId);
  }

  private async decide(
    instanceId: number,
    decision: "approved" | "rejected",
    comment: string | undefined,
    orgId: number,
    userId?: number,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const [inst] = await tx
        .select()
        .from(workflowInstances)
        .where(
          and(
            eq(workflowInstances.id, instanceId),
            eq(workflowInstances.organizationId, orgId),
          ),
        )
        .limit(1);
      if (!inst) throw new NotFoundException(`Instance #${instanceId} introuvable.`);
      if (inst.status !== "pending") {
        throw new ConflictException(`Instance deja ${inst.status}.`);
      }

      const [wf] = await tx
        .select()
        .from(workflows)
        .where(eq(workflows.id, inst.workflowId))
        .limit(1);
      const steps = (wf?.steps as WorkflowStep[]) ?? [];

      // Trace la decision sur l'etape courante.
      await tx.insert(workflowApprovals).values({
        organizationId: orgId,
        instanceId,
        step: inst.currentStep,
        approverId: userId,
        decision,
        comment,
      });

      if (decision === "rejected") {
        await tx
          .update(workflowInstances)
          .set({ status: "rejected" })
          .where(eq(workflowInstances.id, instanceId));
        return { id: instanceId, status: "rejected", currentStep: inst.currentStep };
      }

      // Approuve : derniere etape -> approved, sinon avance.
      const nextStep = inst.currentStep + 1;
      const isLast = nextStep >= steps.length;
      await tx
        .update(workflowInstances)
        .set({ status: isLast ? "approved" : "pending", currentStep: isLast ? inst.currentStep : nextStep })
        .where(eq(workflowInstances.id, instanceId));
      return {
        id: instanceId,
        status: isLast ? "approved" : "pending",
        currentStep: isLast ? inst.currentStep : nextStep,
        // Pour declencher la comptabilisation differee une fois la transaction commitee.
        entityType: inst.entityType,
        entityId: inst.entityId,
      };
    });

    // Une fois le circuit entierement approuve, comptabilise l'ecriture differee
    // (ledger_pending_entries -> journal). Hors transaction workflow ; no-op si rien en attente.
    if (result.status === "approved" && result.entityType && result.entityId) {
      await this.ledger.approveAndPost(result.entityType, String(result.entityId), orgId, userId);
    }
    return {
      id: result.id,
      status: result.status,
      currentStep: result.currentStep,
    };
  }

  /** Detail d'une instance + historique des approbations. */
  async getInstance(instanceId: number, orgId: number) {
    const [inst] = await this.db
      .select()
      .from(workflowInstances)
      .where(
        and(eq(workflowInstances.id, instanceId), eq(workflowInstances.organizationId, orgId)),
      )
      .limit(1);
    if (!inst) throw new NotFoundException(`Instance #${instanceId} introuvable.`);
    const approvals = await this.db
      .select()
      .from(workflowApprovals)
      .where(eq(workflowApprovals.instanceId, instanceId))
      .orderBy(workflowApprovals.id);
    return { instance: inst, approvals };
  }

  /** Instances filtrables par statut (ex. file d'attente "pending"). */
  async listInstances(orgId: number, status?: string) {
    const conds = [eq(workflowInstances.organizationId, orgId)];
    if (status) conds.push(eq(workflowInstances.status, status));
    return this.db
      .select()
      .from(workflowInstances)
      .where(and(...conds))
      .orderBy(desc(workflowInstances.id));
  }

  private async getWorkflowByKey(key: string, orgId: number) {
    const [wf] = await this.db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.organizationId, orgId),
          eq(workflows.key, key),
          eq(workflows.isActive, 1),
        ),
      )
      .limit(1);
    if (!wf) throw new NotFoundException(`Workflow "${key}" introuvable.`);
    return wf;
  }
}
