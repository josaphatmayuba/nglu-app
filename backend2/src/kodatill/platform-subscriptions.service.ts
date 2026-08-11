import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktSubscriptions } from "../database/schema";
import type { Database } from "../database/types";
import {
  UpdatePlatformSubscriptionDto,
  UpsertPlatformSubscriptionDto,
} from "./dto/platform-subscriptions.dto";

@Injectable()
export class PlatformSubscriptionsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Abonnement courant d'une organisation, ou null si aucun n'existe encore (pas d'auto-seed). */
  async findByOrg(orgId: number) {
    const rows = await this.db
      .select()
      .from(ktSubscriptions)
      .where(eq(ktSubscriptions.organizationId, orgId))
      .limit(1);
    return rows[0] ?? null;
  }

  async getMySubscription(orgId: number) {
    const subscription = await this.findByOrg(orgId);
    if (!subscription) {
      throw new NotFoundException("Aucun abonnement pour cette organisation.");
    }
    return subscription;
  }

  /**
   * Upsert manuel plutot que onDuplicateKeyUpdate : la contrainte UNIQUE porte
   * sur organizationId, on doit donc verifier l'existence avant d'inserer pour
   * decider update vs insert et fixer startedAt uniquement a la creation.
   */
  async upsert(input: UpsertPlatformSubscriptionDto) {
    const existing = await this.findByOrg(input.organizationId);
    const trialEndsAt = input.trialEndsAt ? new Date(input.trialEndsAt) : undefined;

    if (existing) {
      await this.db
        .update(ktSubscriptions)
        .set({
          planCode: input.planCode,
          ...(trialEndsAt !== undefined ? { trialEndsAt } : {}),
          status: "true",
        })
        .where(eq(ktSubscriptions.organizationId, input.organizationId));
      return this.findByOrg(input.organizationId);
    }

    await this.db.insert(ktSubscriptions).values({
      organizationId: input.organizationId,
      planCode: input.planCode,
      subStatus: "trial",
      startedAt: new Date(),
      trialEndsAt,
    });
    return this.findByOrg(input.organizationId);
  }

  async update(orgId: number, input: UpdatePlatformSubscriptionDto) {
    const existing = await this.findByOrg(orgId);
    if (!existing) throw new NotFoundException("Aucun abonnement pour cette organisation.");

    await this.db
      .update(ktSubscriptions)
      .set({
        ...(input.planCode !== undefined ? { planCode: input.planCode } : {}),
        ...(input.subStatus !== undefined ? { subStatus: input.subStatus } : {}),
        ...(input.trialEndsAt !== undefined ? { trialEndsAt: new Date(input.trialEndsAt) } : {}),
        ...(input.renewsAt !== undefined ? { renewsAt: new Date(input.renewsAt) } : {}),
        ...(input.cancelledAt !== undefined ? { cancelledAt: new Date(input.cancelledAt) } : {}),
      })
      .where(eq(ktSubscriptions.organizationId, orgId));

    return this.findByOrg(orgId);
  }
}
