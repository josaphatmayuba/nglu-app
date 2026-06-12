import { createHash } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { and, eq, sql } from "drizzle-orm";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  vxManufacturers,
  vxRegions,
  vxRegistrations,
  vxStagingProducts,
  vxSyncRuns,
  vxSynonymMap,
  vxVaccines,
} from "../database/schema";
import type { Database } from "../database/types";

/** Une ligne source normalisee, prete a etre stagee. */
interface RawProduct {
  sourceRef?: string;
  productName: string;
  manufacturer?: string;
  species?: string;
  status?: string;
  payload?: Record<string, unknown>;
}

const SOURCE_ACIA = "ACIA";

/**
 * Fouillage periodique des sources mondiales de vaccins animaux.
 * Pilote : ACIA/CFIA (CSV des biologiques veterinaires licencies au Canada, maj mensuelle).
 * Pipeline : fetch -> staging (idempotent par hash) -> upsert CORE via synonymes.
 * Desactive par defaut (env.vaccineSync.enabled) : aucun appel reseau sortant tant que non active.
 */
@Injectable()
export class VaccineSyncService {
  private readonly logger = new Logger(VaccineSyncService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Cron(env.vaccineSync.cron)
  async scheduledRun() {
    if (!env.vaccineSync.enabled) return;
    try {
      const result = await this.syncAcia("cron");
      this.logger.log(`Vaccine sync (ACIA): ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(
        `Vaccine sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Declenchement (cron ou manuel via endpoint). Cree un run, stage, puis upsert. */
  async syncAcia(triggerMode: "cron" | "manual") {
    const [run] = await this.db
      .insert(vxSyncRuns)
      .values({ sourceSystem: SOURCE_ACIA, status: "running", triggerMode });
    const runId = run.insertId as number;

    try {
      const rows = await this.fetchAcia();
      const staged = await this.stageRows(runId, SOURCE_ACIA, rows);
      const { upserted, unmapped } = await this.upsertFromStaging(runId);

      await this.db
        .update(vxSyncRuns)
        .set({
          status: "success",
          rowsFetched: rows.length,
          rowsStaged: staged,
          rowsUpserted: upserted,
          rowsUnmapped: unmapped,
          finishedAt: new Date(),
        })
        .where(eq(vxSyncRuns.id, runId));

      return { runId, fetched: rows.length, staged, upserted, unmapped };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.db
        .update(vxSyncRuns)
        .set({ status: "error", errorMessage: message, finishedAt: new Date() })
        .where(eq(vxSyncRuns.id, runId));
      throw error;
    }
  }

  /** Telecharge et parse le CSV ACIA en lignes normalisees. */
  private async fetchAcia(): Promise<RawProduct[]> {
    const res = await fetch(env.vaccineSync.aciaCsvUrl, {
      headers: { Accept: "text/csv" },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`ACIA HTTP ${res.status}`);
    const csv = await res.text();
    return this.parseAciaCsv(csv);
  }

  /**
   * Parse CSV ACIA. Mapping defensif : on cherche les colonnes par mots-cles
   * (le format peut varier) ; produit + fabricant + especes + statut.
   */
  private parseAciaCsv(csv: string): RawProduct[] {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];
    const header = this.splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

    const idx = (...keys: string[]) =>
      header.findIndex((h) => keys.some((k) => h.includes(k)));
    const iProduct = idx("product", "tradename", "trade name", "produit", "nom");
    const iMaker = idx("manufacturer", "company", "licensee", "fabricant", "titulaire");
    const iSpecies = idx("species", "espece", "espèce");
    const iStatus = idx("status", "statut");

    const out: RawProduct[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = this.splitCsvLine(lines[i]);
      const productName = (iProduct >= 0 ? cols[iProduct] : cols[0])?.trim();
      if (!productName) continue;
      out.push({
        sourceRef: productName.slice(0, 120),
        productName,
        manufacturer: iMaker >= 0 ? cols[iMaker]?.trim() : undefined,
        species: iSpecies >= 0 ? cols[iSpecies]?.trim() : undefined,
        status: iStatus >= 0 ? cols[iStatus]?.trim() : undefined,
        payload: Object.fromEntries(header.map((h, j) => [h, cols[j] ?? ""])),
      });
    }
    return out;
  }

  /** Decoupe une ligne CSV en respectant les guillemets. */
  private splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  }

  /** Insere les lignes en staging (idempotent par hash : UNIQUE source+row_hash). */
  private async stageRows(runId: number, source: string, rows: RawProduct[]): Promise<number> {
    let staged = 0;
    for (const r of rows) {
      const rowHash = createHash("sha256")
        .update(`${r.productName}|${r.manufacturer ?? ""}|${r.species ?? ""}|${r.status ?? ""}`)
        .digest("hex");
      try {
        await this.db.insert(vxStagingProducts).values({
          syncRunId: runId,
          sourceSystem: source,
          sourceRef: r.sourceRef,
          rawProductName: r.productName.slice(0, 300),
          rawManufacturer: r.manufacturer?.slice(0, 200),
          rawSpecies: r.species?.slice(0, 300),
          rawStatus: r.status?.slice(0, 60),
          rawPayload: r.payload ?? null,
          rowHash,
        });
        staged++;
      } catch {
        // Doublon (hash deja vu) : ignore, idempotence assuree.
      }
    }
    return staged;
  }

  /**
   * Promotion staging -> CORE. Un produit n'est upserte que si son fabricant est
   * resolu via vx_synonym_map (entity_type='manufacturer') OU deja present. Sinon,
   * la ligne reste en attente de validation humaine (jamais poussee auto sans mapping).
   */
  private async upsertFromStaging(runId: number) {
    const region = await this.ensureCanadaRegion();
    const staging = await this.db
      .select()
      .from(vxStagingProducts)
      .where(and(eq(vxStagingProducts.syncRunId, runId), eq(vxStagingProducts.processed, 0)));

    let upserted = 0;
    let unmapped = 0;

    for (const s of staging) {
      const manufacturerId = await this.resolveManufacturer(s.rawManufacturer);
      if (s.rawManufacturer && manufacturerId == null) {
        unmapped++; // fabricant inconnu et non mappe : on laisse en attente.
        continue;
      }

      // Upsert du vaccin (cle naturelle : product_name).
      const [existing] = await this.db
        .select({ id: vxVaccines.id })
        .from(vxVaccines)
        .where(eq(vxVaccines.productName, s.rawProductName!))
        .limit(1);

      let vaccineId: number;
      if (existing) {
        vaccineId = existing.id;
        if (manufacturerId != null) {
          await this.db
            .update(vxVaccines)
            .set({ manufacturerId, sourceSystem: SOURCE_ACIA })
            .where(eq(vxVaccines.id, vaccineId));
        }
      } else {
        const [ins] = await this.db.insert(vxVaccines).values({
          productName: s.rawProductName!,
          manufacturerId: manufacturerId ?? null,
          sourceSystem: SOURCE_ACIA,
          sourceUrl: env.vaccineSync.aciaCsvUrl,
        });
        vaccineId = ins.insertId as number;
      }

      // Homologation Canada (idempotent : pas de cle unique sur (vaccine,region),
      // donc on verifie l'existence a la main avant d'inserer).
      const status = this.mapStatus(s.rawStatus);
      const [dupReg] = await this.db
        .select({ id: vxRegistrations.id })
        .from(vxRegistrations)
        .where(and(eq(vxRegistrations.vaccineId, vaccineId), eq(vxRegistrations.regionId, region)))
        .limit(1);
      if (dupReg) {
        await this.db.update(vxRegistrations).set({ status }).where(eq(vxRegistrations.id, dupReg.id));
      } else {
        await this.db.insert(vxRegistrations).values({
          vaccineId,
          regionId: region,
          registrationNumber: s.sourceRef ?? null,
          status,
          sourceSystem: SOURCE_ACIA,
          sourceDocumentUrl: env.vaccineSync.aciaCsvUrl,
        });
      }

      await this.db
        .update(vxStagingProducts)
        .set({ processed: 1 })
        .where(eq(vxStagingProducts.id, s.id));
      upserted++;
    }
    return { upserted, unmapped };
  }

  /** Resout un fabricant via synonym_map, sinon par nom exact. null si inconnu. */
  private async resolveManufacturer(raw?: string | null): Promise<number | null> {
    if (!raw) return null;
    const value = raw.trim();
    const [syn] = await this.db
      .select({ id: vxSynonymMap.canonicalId })
      .from(vxSynonymMap)
      .where(and(eq(vxSynonymMap.entityType, "manufacturer"), eq(vxSynonymMap.rawValue, value)))
      .limit(1);
    if (syn) return syn.id;
    const [exact] = await this.db
      .select({ id: vxManufacturers.id })
      .from(vxManufacturers)
      .where(eq(vxManufacturers.name, value))
      .limit(1);
    return exact ? exact.id : null;
  }

  /** Region Canada (cree si absente). */
  private async ensureCanadaRegion(): Promise<number> {
    const [r] = await this.db
      .select({ id: vxRegions.id })
      .from(vxRegions)
      .where(eq(vxRegions.name, "Canada"))
      .limit(1);
    if (r) return r.id;
    const [ins] = await this.db
      .insert(vxRegions)
      .values({ name: "Canada", isoCode: "CA", regulatoryBody: "ACIA/CFIA" });
    return ins.insertId as number;
  }

  private mapStatus(raw?: string | null): string {
    const s = (raw ?? "").toLowerCase();
    if (s.includes("cancel") || s.includes("annul") || s.includes("withdraw")) return "withdrawn";
    if (s.includes("suspend")) return "suspended";
    return "authorized";
  }

  /** Historique des executions (pour l'UI / diagnostic). */
  listRuns(limit = 20) {
    return this.db
      .select()
      .from(vxSyncRuns)
      .orderBy(sql`${vxSyncRuns.startedAt} DESC`)
      .limit(limit);
  }
}
