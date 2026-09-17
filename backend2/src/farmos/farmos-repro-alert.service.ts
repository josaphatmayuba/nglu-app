import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { and, eq } from "drizzle-orm";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import { farmosAnimals } from "../database/schema";
import type { Database } from "../database/types";
import { WhatsappClientService } from "../whatsapp-client/whatsapp-client.service";
import { FarmosReproService, type SowWatchlistRow } from "./farmos-repro.service";

const MAX_LINES = 20;

/**
 * Alerte quotidienne WhatsApp au regisseur : truies avec N jours non productifs
 * ou plus (seuil parametrable, env.reproWatchlistAlert.thresholdDays).
 * Desactive par defaut (env.reproWatchlistAlert.enabled) : aucun appel reseau
 * (DB compris n'est interroge que si active) tant que non active — meme pattern
 * que VaccineSyncService.
 */
@Injectable()
export class FarmosReproAlertService {
  private readonly logger = new Logger(FarmosReproAlertService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly reproService: FarmosReproService,
    private readonly whatsapp: WhatsappClientService,
  ) {}

  @Cron(env.reproWatchlistAlert.cron)
  async scheduledRun() {
    if (!env.reproWatchlistAlert.enabled) return;
    try {
      await this.runForAllOrganizations();
    } catch (error) {
      this.logger.error(
        `Repro watchlist alert failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Parcourt chaque organisation ayant des truies actives et envoie le recap si besoin. */
  async runForAllOrganizations(): Promise<void> {
    const orgIds = await this.listOrganizationsWithActiveSows();
    if (orgIds.length === 0) {
      this.logger.log("Repro watchlist alert: aucune organisation avec des truies actives, rien a envoyer.");
      return;
    }

    for (const organizationId of orgIds) {
      await this.runForOrganization(organizationId);
    }
  }

  /** Envoie le recap pour une organisation donnee (si la watchlist n'est pas vide). */
  async runForOrganization(organizationId: number): Promise<void> {
    const threshold = env.reproWatchlistAlert.thresholdDays;
    const watchlist = await this.reproService.getSowWatchlist(organizationId, { minDays: threshold });

    if (watchlist.length === 0) {
      this.logger.log(`Repro watchlist alert: org ${organizationId} — aucune truie >= ${threshold}j, rien a envoyer.`);
      return;
    }

    if (!env.reproWatchlistAlert.recipientJid) {
      this.logger.warn(
        `Repro watchlist alert: org ${organizationId} — ${watchlist.length} truie(s) a signaler mais REPRO_WATCHLIST_ALERT_JID non configure, envoi ignore.`,
      );
      return;
    }

    const message = this.formatMessage(watchlist, threshold);
    try {
      await this.whatsapp.sendMessage(env.reproWatchlistAlert.recipientJid, message);
      this.logger.log(`Repro watchlist alert: org ${organizationId} — ${watchlist.length} truie(s) envoyees a ${env.reproWatchlistAlert.recipientJid}.`);
    } catch (error) {
      this.logger.warn(
        `Repro watchlist alert: org ${organizationId} — envoi WhatsApp echoue: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Formate le message WhatsApp (identifiant + jours non productifs + statut), plafonne a MAX_LINES truies. */
  formatMessage(watchlist: SowWatchlistRow[], threshold: number): string {
    const header = `Truies >= ${threshold}j non productives (${watchlist.length}) :`;
    const shown = watchlist.slice(0, MAX_LINES);
    const lines = shown.map((row) => {
      const label = row.externalId || row.name || `#${row.animalId}`;
      const status = row.reproStatus ?? "inconnu";
      return `- ${label} : ${row.daysNonProductive}j (${status})`;
    });
    if (watchlist.length > MAX_LINES) {
      lines.push(`... et ${watchlist.length - MAX_LINES} autre(s).`);
    }
    return [header, ...lines].join("\n");
  }

  /** Organisations ayant au moins une truie active (species=pig, sex=F, isActive=1). */
  private async listOrganizationsWithActiveSows(): Promise<number[]> {
    const rows = await this.db
      .selectDistinct({ organizationId: farmosAnimals.organizationId })
      .from(farmosAnimals)
      .where(
        and(
          eq(farmosAnimals.species, "pig"),
          eq(farmosAnimals.sex, "F"),
          eq(farmosAnimals.isActive, 1),
        ),
      );
    return rows.map((r) => r.organizationId);
  }
}
