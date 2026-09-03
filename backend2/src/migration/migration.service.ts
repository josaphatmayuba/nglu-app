import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { Database } from "../database/types";
import { findDomain, MIGRATION_DOMAINS, MigrationDomain } from "./migration.domains";
import { exportAvailable, previewCsv, sourceRowCount, tableMeta } from "./migration.source";

// Migration Cockpit — service LECTURE SEULE.
//
// Aucune écriture : on lit l'état des tables legacy_*_map (avancement idempotent),
// les comptages source (manifest de l'export) et on produit des rapports de
// validation. Le RUN reste un script Python lancé à la main (approche hybride).

@Injectable()
export class MigrationService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // ── Lot 1 : état des domaines ────────────────────────────────────────────
  async domains() {
    const exportPresent = exportAvailable();
    const result = [];
    for (const domain of MIGRATION_DOMAINS) {
      const sourceRows = domain.sourceTables.reduce((acc, t) => acc + (sourceRowCount(t) ?? 0), 0);
      const mapped = await this.mappedCount(domain);
      result.push({
        key: domain.key,
        label: domain.label,
        status: domain.status,
        script: domain.script,
        sourceTables: domain.sourceTables,
        mapTables: domain.mapTables,
        sourceRows: exportPresent ? sourceRows : null,
        mappedRows: mapped,
      });
    }
    return { exportPresent, domains: result };
  }

  // Somme des lignes présentes dans les tables de correspondance du domaine.
  private async mappedCount(domain: MigrationDomain): Promise<number | null> {
    if (!domain.mapTables.length) return null;
    let total = 0;
    for (const table of domain.mapTables) {
      if (!(await this.tableExists(table))) continue;
      total += await this.countRows(table);
    }
    return total;
  }

  // ── Lot 1 : aperçu d'une table source ────────────────────────────────────
  sourcePreview(table: string, limit: number) {
    const meta = tableMeta(table);
    if (!meta) {
      throw new NotFoundException(
        `Table source « ${table} » introuvable dans l'export (manifest absent ou table inconnue).`,
      );
    }
    return { table, ...previewCsv(table, limit) };
  }

  // ── Lot 2 : validation / dry-run d'un domaine ────────────────────────────
  async validate(domainKey: string) {
    const domain = findDomain(domainKey);
    if (!domain) throw new NotFoundException(`Domaine « ${domainKey} » inconnu.`);

    const checks: ValidationCheck[] = [];

    // 1) Comptage source vs mappé (par table de map).
    const sourceRows = domain.sourceTables.reduce((acc, t) => acc + (sourceRowCount(t) ?? 0), 0);
    const mapped = (await this.mappedCount(domain)) ?? 0;
    checks.push({
      id: "count",
      label: "Comptage source vs mappé",
      level: domain.mapTables.length === 0 ? "info" : mapped >= sourceRows ? "ok" : "warn",
      detail:
        domain.mapTables.length === 0
          ? "Aucune table de correspondance — domaine pas encore migré."
          : `${mapped} ligne(s) mappée(s) pour ${sourceRows || "?"} ligne(s) source.`,
    });

    // 2) Contrôles d'intégrité spécifiques au domaine (best-effort).
    if (domain.key === "compta") {
      checks.push(...(await this.comptaIntegrityChecks()));
    }

    const hasError = checks.some((c) => c.level === "error");
    const hasWarn = checks.some((c) => c.level === "warn");
    return {
      domain: domain.key,
      label: domain.label,
      overall: hasError ? "error" : hasWarn ? "warn" : "ok",
      checks,
    };
  }

  // Contrôles compta connus : doublon devise (currencyCode NULL/'' = bug 0148)
  // et sous-comptes orphelins (accountId sans account).
  private async comptaIntegrityChecks(): Promise<ValidationCheck[]> {
    const out: ValidationCheck[] = [];

    if (await this.tableExists("currency")) {
      const nullCode = await this.scalar(
        sql`SELECT COUNT(*) AS c FROM currency WHERE currencyCode IS NULL OR currencyCode = ''`,
      );
      out.push({
        id: "currency-null-code",
        label: "Devises sans code (doublon USD fantôme)",
        level: nullCode > 0 ? "warn" : "ok",
        detail:
          nullCode > 0
            ? `${nullCode} devise(s) avec currencyCode NULL/'' — risque de 2e groupe devise dans les KPI (cf. migration 0148).`
            : "Aucune devise sans code.",
      });
    }

    if ((await this.tableExists("subAccount")) && (await this.tableExists("account"))) {
      const orphans = await this.scalar(
        sql`SELECT COUNT(*) AS c FROM subAccount sa LEFT JOIN account a ON a.id = sa.accountId WHERE a.id IS NULL`,
      );
      out.push({
        id: "subaccount-orphans",
        label: "Sous-comptes orphelins",
        level: orphans > 0 ? "error" : "ok",
        detail:
          orphans > 0
            ? `${orphans} sous-compte(s) sans compte parent — FK cassée.`
            : "Tous les sous-comptes ont un compte parent.",
      });
    }

    return out;
  }

  // ── Lot 3 : génère la commande Python (n'exécute PAS) ────────────────────
  runCommand(domainKey: string) {
    const domain = findDomain(domainKey);
    if (!domain) throw new NotFoundException(`Domaine « ${domainKey} » inconnu.`);
    return {
      domain: domain.key,
      label: domain.label,
      // L'app NE lance rien : elle affiche la commande à copier/coller. Le RUN
      // compta reste manuel et contrôlé (cf. approche hybride).
      command: `py ${domain.script}`,
      note:
        "Approche hybride : copiez cette commande dans un terminal, vérifiez le SQL généré, " +
        "puis appliquez-le. L'app ne modifie aucune base.",
    };
  }

  // ── Helpers SQL bas niveau (lecture seule) ───────────────────────────────
  // Les noms de tables proviennent d'un allowlist statique (migration.domains.ts),
  // jamais d'entrées utilisateur → pas d'injection.
  private async tableExists(table: string): Promise<boolean> {
    const c = await this.scalar(
      sql`SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ${table}`,
    );
    return c > 0;
  }

  private async countRows(table: string): Promise<number> {
    return this.scalar(sql.raw(`SELECT COUNT(*) AS c FROM \`${table}\``));
  }

  private async scalar(query: ReturnType<typeof sql>): Promise<number> {
    const res = await this.db.execute(query);
    const rows = Array.isArray(res) ? res[0] : res;
    const first = (rows as unknown as Array<Record<string, unknown>>)[0];
    return first ? Number(Object.values(first)[0]) : 0;
  }
}

export interface ValidationCheck {
  id: string;
  label: string;
  level: "ok" | "info" | "warn" | "error";
  detail: string;
}
