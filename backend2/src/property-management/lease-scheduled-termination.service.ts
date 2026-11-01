import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { and, eq, lte, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { realEstateLeaseScheduledTerminations, realEstateLeases } from "../database/schema";
import type { Database } from "../database/types";
import { PropertyManagementService } from "./property-management.service";

export type ScheduledTerminationRunResult = { due: number; executed: number; obsolete: number; skipped: number; failed: number };

/**
 * Execute les resiliations programmees arrivees a echeance (effective_date <= aujourd'hui, UTC).
 * Idempotent : la ligne est verrouillee et revalidee ('scheduled') dans la transaction d'execution.
 * Aucun 2e SMS : le locataire a deja ete prevenu a la programmation.
 */
@Injectable()
export class LeaseScheduledTerminationService {
  private readonly logger = new Logger(LeaseScheduledTerminationService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly properties: PropertyManagementService,
  ) {}

  @Cron("30 0 * * *")
  async scheduledRun() {
    try {
      const result = await this.runDue();
      if (result.due) this.logger.log(`Scheduled lease terminations: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`Scheduled lease terminations failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** orgId omis = toutes les organisations. */
  async runDue(orgId?: number): Promise<ScheduledTerminationRunResult> {
    const today = new Date().toISOString().slice(0, 10);
    const out: ScheduledTerminationRunResult = { due: 0, executed: 0, obsolete: 0, skipped: 0, failed: 0 };
    const rows = await this.db
      .select()
      .from(realEstateLeaseScheduledTerminations)
      .where(and(
        eq(realEstateLeaseScheduledTerminations.status, "scheduled"),
        lte(realEstateLeaseScheduledTerminations.effectiveDate, today),
        orgId ? eq(realEstateLeaseScheduledTerminations.organizationId, orgId) : undefined,
      ));
    out.due = rows.length;

    for (const row of rows) {
      const scheduleId = Number(row.id);
      const rowOrg = Number(row.organizationId);
      try {
        const [lease] = await this.db
          .select()
          .from(realEstateLeases)
          .where(and(eq(realEstateLeases.id, Number(row.leaseId)), eq(realEstateLeases.organizationId, rowOrg)))
          .limit(1);
        if (!lease || lease.status !== "active") {
          await this.db
            .update(realEstateLeaseScheduledTerminations)
            .set({ status: "obsolete", cancelReason: "lease_not_active", updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(and(eq(realEstateLeaseScheduledTerminations.id, scheduleId), eq(realEstateLeaseScheduledTerminations.status, "scheduled")));
          out.obsolete += 1;
          continue;
        }
        const res = await this.properties.executeTermination({
          lease,
          day: String(row.effectiveDate).slice(0, 10),
          reason: String(row.reason ?? "").trim() || "Resiliation programmee",
          orgId: rowOrg,
          userId: row.createdBy != null ? Number(row.createdBy) : undefined,
          notifyTenant: false,
          fullPeriod: Number(row.fullPeriod ?? 1) === 1,
          scheduleId,
        });
        if (res?.skipped) out.skipped += 1;
        else out.executed += 1;
      } catch (error) {
        out.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        const attempts = Number(row.attempts ?? 0) + 1;
        if (attempts >= 3) this.logger.error(`Scheduled termination ${scheduleId} (lease ${row.leaseId}) failed ${attempts} times: ${message}`);
        else this.logger.warn(`Scheduled termination ${scheduleId} failed: ${message}`);
        try {
          await this.db
            .update(realEstateLeaseScheduledTerminations)
            .set({
              attempts: sql`${realEstateLeaseScheduledTerminations.attempts} + 1`,
              lastError: message.slice(0, 2000),
              updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(realEstateLeaseScheduledTerminations.id, scheduleId));
        } catch (inner) {
          this.logger.warn(`Scheduled termination ${scheduleId} error not recorded: ${inner instanceof Error ? inner.message : String(inner)}`);
        }
      }
    }
    return out;
  }
}
