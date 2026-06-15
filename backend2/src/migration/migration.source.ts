// Migration Cockpit — lecture de l'export legacy (manifest.json + CSV).
//
// L'export vit hors du repo (dossier fourni à la migration). On le localise via
// l'env MIGRATION_EXPORT_DIR, avec repli sur un dossier repo-local migration-data/.
// Tout est tolérant à l'absence : si l'export n'est pas monté, l'app fonctionne
// en mode "DB only" (l'état des legacy_*_map reste lisible).

import * as fs from "fs";
import * as path from "path";

const EXPORT_DIR =
  process.env.MIGRATION_EXPORT_DIR ||
  path.resolve(process.cwd(), "migration-data", "export_tables_csv_schema");

export interface ManifestTable {
  row_count: number;
  csv_file: string;
  columns: string[];
}

interface Manifest {
  source?: string;
  table_count?: number;
  tables: Record<string, ManifestTable>;
}

let cachedManifest: Manifest | null = null;
let manifestTried = false;

export function exportAvailable(): boolean {
  return fs.existsSync(path.join(EXPORT_DIR, "manifest.json"));
}

export function loadManifest(): Manifest | null {
  if (manifestTried) return cachedManifest;
  manifestTried = true;
  const file = path.join(EXPORT_DIR, "manifest.json");
  try {
    cachedManifest = JSON.parse(fs.readFileSync(file, "utf-8")) as Manifest;
  } catch {
    cachedManifest = null;
  }
  return cachedManifest;
}

export function tableMeta(table: string): ManifestTable | null {
  const m = loadManifest();
  return m?.tables?.[table] ?? null;
}

export function sourceRowCount(table: string): number | null {
  return tableMeta(table)?.row_count ?? null;
}

/**
 * Aperçu des premières lignes d'un CSV de l'export. Parse minimal mais correct :
 * gère les champs entre guillemets, les "" échappés et les retours ligne internes.
 * Lecture seule, limité à `limit` lignes.
 */
export function previewCsv(
  table: string,
  limit = 25,
): { columns: string[]; rows: string[][]; rowCount: number | null; truncated: boolean } | null {
  const meta = tableMeta(table);
  if (!meta) return null;
  const csvPath = path.join(EXPORT_DIR, meta.csv_file);
  let raw: string;
  try {
    raw = fs.readFileSync(csvPath, "utf-8");
  } catch {
    return { columns: meta.columns, rows: [], rowCount: meta.row_count, truncated: false };
  }
  const records = parseCsv(raw, limit + 1); // +1 pour l'en-tête
  const header = records.length ? records[0] : meta.columns;
  const dataRows = records.slice(1, limit + 1);
  return {
    columns: header,
    rows: dataRows,
    rowCount: meta.row_count,
    truncated: meta.row_count != null && meta.row_count > dataRows.length,
  };
}

// Parseur CSV minimal (RFC 4180) avec arrêt anticipé après maxRecords lignes.
function parseCsv(text: string, maxRecords: number): string[][] {
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      records.push(row);
      field = "";
      row = [];
      if (records.length >= maxRecords) return records;
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }
  return records;
}
