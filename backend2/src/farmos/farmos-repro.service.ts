import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { Database } from "../database/types";
import { farmosAnimals, farmosReproCycles, farmosReproductionEvents } from "../database/schema";
import { RealtimeDataPublisher } from "../realtime/realtime-data-publisher.service";
import type { CreateReproCycleDto, UpdateReproCycleDto } from "./dto/repro-cycle.dto";

// ─── Registre de reproduction porcine — Etape 1 (COMP-P?-repro) ──────────
// Fichier separe de farmos.service.ts (pattern deja etabli par
// farmos-feed.service.ts / farmos-operations.service.ts / farmos-profitability.service.ts).
//
// Un cycle = une truie, de la saillie au sevrage (farmos_repro_cycles).
// Chaque transition significative (saillie/diagnostic/mise bas/sevrage) est
// miroitee dans farmos_reproduction_events (table historique deja existante,
// cycleId permet de relier les deux). Jamais de DELETE physique, jamais
// d'ecrasement d'un cycle : updateCycle ne fait qu'ajouter des dates/resultats
// sur le cycle en cours.

const DAY_MS = 24 * 60 * 60 * 1000;
const DIAGNOSIS_DELAY_DAYS = 28;
const FARROWING_DELAY_DAYS = 114;
const WEANING_DELAY_DAYS = 28;

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromStr: string, toStr: string): number {
  const from = new Date(`${fromStr}T00:00:00Z`).getTime();
  const to = new Date(`${toStr}T00:00:00Z`).getTime();
  return Math.floor((to - from) / DAY_MS);
}

export interface SowWatchlistFilters {
  site?: string;
  status?: string;
  minDays?: number;
}

export interface SowWatchlistRow {
  animalId: number;
  externalId: string | null;
  name: string | null;
  site: string | null;
  reproStatus: string | null;
  lastEventDate: string | null;
  daysNonProductive: number | null;
  nextAction: string;
  nextActionDate: string | null;
  bodyConditionScore: string | null;
  parity: number | null;
}

@Injectable()
export class FarmosReproService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly realtime: RealtimeDataPublisher,
  ) {}

  private readonly logger = new Logger(FarmosReproService.name);

  private async publish(kind: string, tables: string[], action: "created" | "updated" | "deleted", entityId: number | string, orgId: number) {
    try {
      await this.realtime.publishDataUpdated({
        entity: "farmos",
        action,
        entityId,
        scope: { module: "farmos", tenantId: orgId },
        permissions: ["readAll-farmos"],
        tags: ["farmos", kind, ...tables],
      });
    } catch (error) {
      this.logger.warn(`realtime publish failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Calcule prochaine action + date attendue selon le statut reproductif courant.
  computeNextAction(reproStatus: string | null | undefined, activeCycle: typeof farmosReproCycles.$inferSelect | null | undefined): { nextAction: string; nextActionDate: string | null } {
    switch (reproStatus) {
      case "mated": {
        const matingDate = activeCycle?.matingDate;
        return {
          nextAction: "Diagnostic de gestation",
          nextActionDate: matingDate ? addDays(matingDate, DIAGNOSIS_DELAY_DAYS) : null,
        };
      }
      case "pregnant": {
        const matingDate = activeCycle?.matingDate;
        return {
          nextAction: "Mise bas attendue",
          nextActionDate: matingDate ? addDays(matingDate, FARROWING_DELAY_DAYS) : null,
        };
      }
      case "lactating": {
        const farrowingDate = activeCycle?.farrowingDate;
        return {
          nextAction: "Sevrage",
          nextActionDate: farrowingDate ? addDays(farrowingDate, WEANING_DELAY_DAYS) : null,
        };
      }
      case "empty":
      case "nulliparous":
        return { nextAction: "Saillie à planifier", nextActionDate: null };
      case "culled":
        return { nextAction: "Réformée", nextActionDate: null };
      default:
        return { nextAction: "Saillie à planifier", nextActionDate: null };
    }
  }

  // Liste des truies actives + indicateurs repro, triee par jours non productifs desc.
  async getSowWatchlist(organizationId: number, filters: SowWatchlistFilters = {}): Promise<SowWatchlistRow[]> {
    const sows = await this.db
      .select()
      .from(farmosAnimals)
      .where(
        and(
          eq(farmosAnimals.organizationId, organizationId),
          eq(farmosAnimals.species, "pig"),
          eq(farmosAnimals.sex, "F"),
          eq(farmosAnimals.isActive, 1),
        ),
      );

    const today = new Date().toISOString().slice(0, 10);
    const rows: SowWatchlistRow[] = [];

    for (const sow of sows) {
      if (filters.status && sow.reproStatus !== filters.status) continue;
      const site = sow.buildingId != null ? String(sow.buildingId) : sow.barn ?? null;
      if (filters.site && site !== filters.site) continue;

      // Cycle actif = dernier cycle non conclu (outcome=in_progress), sinon le plus recent.
      const cycles = await this.db
        .select()
        .from(farmosReproCycles)
        .where(and(eq(farmosReproCycles.organizationId, organizationId), eq(farmosReproCycles.sowId, sow.id), eq(farmosReproCycles.isActive, 1)))
        .orderBy(desc(farmosReproCycles.id));
      const activeCycle = cycles.find((c) => c.outcome === "in_progress") ?? cycles[0] ?? null;

      const candidateDates = [activeCycle?.matingDate, activeCycle?.farrowingDate, activeCycle?.weaningDate].filter(
        (d): d is string => Boolean(d),
      );
      let lastEventDate: string | null = null;
      if (candidateDates.length) {
        lastEventDate = candidateDates.reduce((max, d) => (d > max ? d : max));
      } else if (sow.reproStatusSince) {
        lastEventDate = sow.reproStatusSince;
      } else if (sow.dateOfBirth) {
        lastEventDate = sow.dateOfBirth;
      }

      const daysNonProductive = lastEventDate ? daysBetween(lastEventDate, today) : null;
      if (filters.minDays != null && (daysNonProductive == null || daysNonProductive < filters.minDays)) continue;

      const { nextAction, nextActionDate } = this.computeNextAction(sow.reproStatus, activeCycle);

      rows.push({
        animalId: sow.id,
        externalId: sow.externalId ?? null,
        name: sow.name ?? null,
        site,
        reproStatus: sow.reproStatus ?? null,
        lastEventDate,
        daysNonProductive,
        nextAction,
        nextActionDate,
        bodyConditionScore: sow.bodyConditionScore ?? null,
        parity: sow.parity ?? null,
      });
    }

    rows.sort((a, b) => (b.daysNonProductive ?? -1) - (a.daysNonProductive ?? -1));
    return rows;
  }

  async listCycles(organizationId: number, sowId: number) {
    return this.db
      .select()
      .from(farmosReproCycles)
      .where(and(eq(farmosReproCycles.organizationId, organizationId), eq(farmosReproCycles.sowId, sowId), eq(farmosReproCycles.isActive, 1)))
      .orderBy(desc(farmosReproCycles.id));
  }

  private async getSow(sowId: number, organizationId: number) {
    const [sow] = await this.db
      .select()
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.id, sowId), eq(farmosAnimals.organizationId, organizationId)))
      .limit(1);
    if (!sow) throw new NotFoundException("Truie introuvable dans cette organisation.");
    if (sow.species !== "pig" || sow.sex !== "F") {
      throw new BadRequestException("Le registre de reproduction porcine ne s'applique qu'aux femelles porcines (species=pig, sex=F).");
    }
    return sow;
  }

  private async getCycle(cycleId: number, organizationId: number) {
    const [cycle] = await this.db
      .select()
      .from(farmosReproCycles)
      .where(and(eq(farmosReproCycles.id, cycleId), eq(farmosReproCycles.organizationId, organizationId), eq(farmosReproCycles.isActive, 1)))
      .limit(1);
    if (!cycle) throw new NotFoundException("Cycle de reproduction introuvable.");
    return cycle;
  }

  // Crée un cycle (saillie initiale) + met à jour l'animal + miroir dans reproduction_events.
  async createCycle(organizationId: number, dto: CreateReproCycleDto) {
    const sow = await this.getSow(dto.sow_id, organizationId);

    const expectedDiagnosisDate = addDays(dto.mating_date, DIAGNOSIS_DELAY_DAYS);
    const expectedFarrowingDate = addDays(dto.mating_date, FARROWING_DELAY_DAYS);

    const existingCycles = await this.db
      .select()
      .from(farmosReproCycles)
      .where(and(eq(farmosReproCycles.organizationId, organizationId), eq(farmosReproCycles.sowId, sow.id)));
    const cycleNumber = existingCycles.length + 1;

    const [res] = await this.db.insert(farmosReproCycles).values({
      organizationId,
      sowId: sow.id,
      cycleNumber,
      matingDate: dto.mating_date,
      sireAnimalId: dto.sire_animal_id ?? null,
      sireStrawId: dto.sire_straw_id ?? null,
      breedingType: dto.breeding_type ?? null,
      expectedDiagnosisDate,
      expectedFarrowingDate,
      outcome: "in_progress",
      notes: dto.notes ?? null,
    });
    const cycleId = Number(res.insertId);

    await this.db
      .update(farmosAnimals)
      .set({ reproStatus: "mated", reproStatusSince: dto.mating_date })
      .where(and(eq(farmosAnimals.id, sow.id), eq(farmosAnimals.organizationId, organizationId)));

    await this.db.insert(farmosReproductionEvents).values({
      organizationId,
      animalId: sow.id,
      eventType: "mating",
      eventDate: dto.mating_date,
      expectedDueDate: expectedFarrowingDate,
      breedingType: dto.breeding_type === "insemination" ? "ai" : dto.breeding_type === "natural" ? "natural" : "unknown",
      sireStrawId: dto.sire_straw_id ?? null,
      sireAnimalId: dto.sire_animal_id ?? null,
      notes: dto.notes ?? null,
      cycleId,
    });

    await this.publish("createReproCycle", ["reproCycles", "reproductionEvents", "animals"], "created", cycleId, organizationId);

    return this.getCycle(cycleId, organizationId);
  }

  // Met à jour un cycle existant (diagnostic / mise bas / sevrage) — n'écrase jamais
  // un cycle précédent, seulement le cycle en cours désigné par cycleId.
  async updateCycle(organizationId: number, cycleId: number, dto: UpdateReproCycleDto) {
    const cycle = await this.getCycle(cycleId, organizationId);
    const sow = await this.getSow(Number(cycle.sowId), organizationId);

    const cyclePatch: Record<string, unknown> = {};
    const animalPatch: Record<string, unknown> = {};
    const mirroredEvents: Array<{ eventType: string; eventDate: string; extra?: Record<string, unknown> }> = [];

    if (dto.diagnosis_date !== undefined) cyclePatch.diagnosisDate = dto.diagnosis_date;
    if (dto.diagnosis_result !== undefined) {
      cyclePatch.diagnosisResult = dto.diagnosis_result;
      if (dto.diagnosis_result === "pregnant") {
        animalPatch.reproStatus = "pregnant";
        animalPatch.reproStatusSince = dto.diagnosis_date ?? cycle.diagnosisDate ?? new Date().toISOString().slice(0, 10);
      } else if (dto.diagnosis_result === "empty") {
        animalPatch.reproStatus = "empty";
        animalPatch.reproStatusSince = dto.diagnosis_date ?? cycle.diagnosisDate ?? new Date().toISOString().slice(0, 10);
        cyclePatch.outcome = "not_pregnant";
      }
      if (dto.diagnosis_date) {
        mirroredEvents.push({
          eventType: "diagnosis",
          eventDate: dto.diagnosis_date,
          extra: { outcome: dto.diagnosis_result },
        });
      }
    }

    if (dto.farrowing_date !== undefined && dto.farrowing_date) {
      cyclePatch.farrowingDate = dto.farrowing_date;
      cyclePatch.outcome = "farrowed";
      cyclePatch.expectedWeaningDate = addDays(dto.farrowing_date, WEANING_DELAY_DAYS);
      animalPatch.reproStatus = "lactating";
      animalPatch.reproStatusSince = dto.farrowing_date;
      mirroredEvents.push({
        eventType: "farrowing",
        eventDate: dto.farrowing_date,
        extra: { offspringCount: dto.offspring_count ?? null },
      });
    }

    if (dto.weaning_date !== undefined && dto.weaning_date) {
      cyclePatch.weaningDate = dto.weaning_date;
      cyclePatch.outcome = "weaned";
      animalPatch.reproStatus = "empty";
      animalPatch.reproStatusSince = dto.weaning_date;
      animalPatch.parity = (sow.parity ?? 0) + 1;
      mirroredEvents.push({
        eventType: "weaning",
        eventDate: dto.weaning_date,
        extra: { weanedCount: dto.weaned_count ?? null },
      });
    }

    if (dto.outcome !== undefined) cyclePatch.outcome = dto.outcome;
    if (dto.notes !== undefined) cyclePatch.notes = dto.notes;

    if (Object.keys(cyclePatch).length > 0) {
      await this.db.update(farmosReproCycles).set(cyclePatch).where(and(eq(farmosReproCycles.id, cycleId), eq(farmosReproCycles.organizationId, organizationId)));
    }
    if (Object.keys(animalPatch).length > 0) {
      await this.db.update(farmosAnimals).set(animalPatch).where(and(eq(farmosAnimals.id, sow.id), eq(farmosAnimals.organizationId, organizationId)));
    }

    for (const ev of mirroredEvents) {
      await this.db.insert(farmosReproductionEvents).values({
        organizationId,
        animalId: sow.id,
        eventType: ev.eventType,
        eventDate: ev.eventDate,
        outcome: (ev.extra?.outcome as string | undefined) ?? null,
        offspringCount: (ev.extra?.offspringCount as number | undefined) ?? null,
        weanedCount: (ev.extra?.weanedCount as number | undefined) ?? null,
        weaningDate: ev.eventType === "weaning" ? ev.eventDate : null,
        cycleId,
      });
    }

    await this.publish("updateReproCycle", ["reproCycles", "reproductionEvents", "animals"], "updated", cycleId, organizationId);

    return this.getCycle(cycleId, organizationId);
  }
}
