import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { Database } from "../database/types";
import { notificationPreferences } from "../database/schema";

const DEFAULT_EVENTS = [
  { eventKey: "payment", emailEnabled: 1, inappEnabled: 1 },
  { eventKey: "overdue", emailEnabled: 1, inappEnabled: 1 },
  { eventKey: "renewal", emailEnabled: 0, inappEnabled: 1 },
  { eventKey: "maintenance", emailEnabled: 1, inappEnabled: 1 },
  { eventKey: "report", emailEnabled: 1, inappEnabled: 0 },
];

@Injectable()
export class NotificationPreferencesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getForUser(userId: number) {
    const rows = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    if (rows.length === 0) return DEFAULT_EVENTS.map((e) => ({ ...e, userId }));

    const map = new Map(rows.map((r) => [r.eventKey, r]));
    return DEFAULT_EVENTS.map((e) => map.get(e.eventKey) ?? { ...e, userId });
  }

  async upsertForUser(userId: number, prefs: Array<{ eventKey: string; emailEnabled: boolean; inappEnabled: boolean }>) {
    for (const p of prefs) {
      const existing = await this.db
        .select({ id: notificationPreferences.id })
        .from(notificationPreferences)
        .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.eventKey, p.eventKey)))
        .limit(1);

      const emailEnabled = p.emailEnabled ? 1 : 0;
      const inappEnabled = p.inappEnabled ? 1 : 0;

      if (existing.length > 0) {
        await this.db
          .update(notificationPreferences)
          .set({ emailEnabled, inappEnabled })
          .where(eq(notificationPreferences.id, existing[0].id));
      } else {
        await this.db.insert(notificationPreferences).values({ userId, eventKey: p.eventKey, emailEnabled, inappEnabled });
      }
    }
    return this.getForUser(userId);
  }
}
