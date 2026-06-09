import "dotenv/config";
import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { migrate } from "drizzle-orm/mysql2/migrator";
import type { RowDataPacket } from "mysql2/promise";
import { db, connection } from "./seed.db";

type JournalEntry = {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
};

// Seuil d'auto-découverte : toute migration dont le numéro est >= à ce seuil est
// considérée idempotente (CREATE TABLE IF NOT EXISTS / pattern SET+IF+PREPARE) et
// rejouée au boot. Évite la liste codée en dur : une nouvelle migration >=0070
// est donc appliquée automatiquement, même si le `when` du journal est en
// désordre (drift connu 0080-0087) — plus aucun oubli possible.
const OPERATIONAL_REPAIR_MIN_INDEX = 70;

// Numéro de migration extrait du tag (ex. "0088_hr_public_holidays" -> 88).
function migrationIndex(tag: string): number {
  const m = /^(\d+)/.exec(tag);
  return m ? Number(m[1]) : NaN;
}

// Liste calculée (et non codée en dur) des migrations à rejouer au boot :
// toutes celles du journal Drizzle dont l'index >= OPERATIONAL_REPAIR_MIN_INDEX,
// triées par index croissant.
function operationalRepairMigrations(): string[] {
  return journalEntries()
    .map((entry) => entry.tag)
    .filter((tag) => {
      const idx = migrationIndex(tag);
      return Number.isFinite(idx) && idx >= OPERATIONAL_REPAIR_MIN_INDEX;
    })
    .sort((a, b) => migrationIndex(a) - migrationIndex(b));
}

type CountRow = RowDataPacket & { count: number };
type MigrationStateRow = RowDataPacket & { created_at: number };

async function main() {
  await baselineExistingDatabase();
  await applyPendingOperationalRepairs();

  console.log("▶ Running Drizzle migrations from ./drizzle …");
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✔ Migrations complete.");
  } catch (err: any) {
    // Ignore "table already exists" errors - these can occur in certain edge cases
    // and don't prevent the application from running
    if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.errno === 1050) {
      console.log("✔ Migrations complete (some tables already exist).");
    } else {
      throw err;
    }
  }
  await applyOperationalRepairs();
  await connection.end(); // pool.end() drains all connections
}

async function baselineExistingDatabase() {
  const [accountTables] = await connection.execute(
    "select table_name from information_schema.tables where table_schema = database() and table_name = 'account'",
  );
  const hasLegacySchema = Array.isArray(accountTables) && accountTables.length > 0;
  if (!hasLegacySchema) return;

  await connection.execute(`
    create table if not exists __drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);

  const [rows] = await connection.execute("select id from __drizzle_migrations limit 1");
  if (Array.isArray(rows) && rows.length > 0) return;

  const firstMigration = firstJournalEntry();
  const hash = migrationHash(firstMigration.tag);
  await connection.execute("insert into __drizzle_migrations (`hash`, `created_at`) values (?, ?)", [
    hash,
    firstMigration.when,
  ]);
  console.log(`✔ Baseline detected existing database; marked ${firstMigration.tag} as applied.`);
}

function firstJournalEntry() {
  const journal = journalEntries();
  const first = journal[0];
  if (!first) {
    throw new Error("Drizzle journal has no migration entries.");
  }
  return first;
}

function journalEntries() {
  const journalPath = "./drizzle/meta/_journal.json";
  if (!existsSync(journalPath)) {
    throw new Error("Missing Drizzle journal at ./drizzle/meta/_journal.json");
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: JournalEntry[] };
  return journal.entries;
}

function journalEntry(tag: string) {
  const entry = journalEntries().find((item) => item.tag === tag);
  if (!entry) {
    throw new Error(`Missing Drizzle journal entry for ${tag}`);
  }
  return entry;
}

function migrationHash(tag: string) {
  const migrationPath = `./drizzle/${tag}.sql`;
  if (!existsSync(migrationPath)) {
    throw new Error(`Missing Drizzle migration file ${migrationPath}`);
  }

  return createHash("sha256").update(readFileSync(migrationPath, "utf8")).digest("hex");
}

async function applyPendingOperationalRepairs() {
  const entries = journalEntries();
  const repairTags = operationalRepairMigrations();
  if (repairTags.length === 0) return;
  const firstTag = repairTags[0];
  const lastTag = repairTags[repairTags.length - 1];
  const firstIndex = entries.findIndex((entry) => entry.tag === firstTag);
  const firstEntry = entries[firstIndex];
  const lastEntry = journalEntry(lastTag);
  const previousEntry = entries[firstIndex - 1];

  if (!firstEntry || !previousEntry) {
    throw new Error("Operational repair migration list is not aligned with the Drizzle journal.");
  }

  const lastApplied = await lastAppliedMigrationMillis();
  if (lastApplied === null) return;
  if (lastApplied >= lastEntry.when) return;
  if (lastApplied < previousEntry.when) return;

  console.log(
    `Applying pending operational migrations ${firstEntry.tag} through ${lastEntry.tag} before Drizzle migrate.`,
  );
  await applyOperationalRepairs();
  await markOperationalRepairsApplied();
}

async function lastAppliedMigrationMillis() {
  if (!(await migrationTableExists())) return null;
  const [rows] = await connection.execute<MigrationStateRow[]>(
    "select created_at from __drizzle_migrations order by created_at desc limit 1",
  );
  return rows[0]?.created_at ?? null;
}

async function migrationTableExists() {
  const [rows] = await connection.execute<CountRow[]>(
    "select count(*) as count from information_schema.tables where table_schema = database() and table_name = '__drizzle_migrations'",
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function markOperationalRepairsApplied() {
  for (const tag of operationalRepairMigrations()) {
    const entry = journalEntry(tag);
    const [rows] = await connection.execute<CountRow[]>(
      "select count(*) as count from __drizzle_migrations where created_at = ?",
      [entry.when],
    );
    if (Number(rows[0]?.count ?? 0) > 0) continue;

    await connection.execute("insert into __drizzle_migrations (`hash`, `created_at`) values (?, ?)", [
      migrationHash(tag),
      entry.when,
    ]);
    console.log(`âœ” Marked ${tag} as applied after operational repair.`);
  }
}

async function applyOperationalRepairs() {
  console.log("Verifying operational schema repairs...");
  const repairConnection = await connection.getConnection();
  try {
    for (const tag of operationalRepairMigrations()) {
      const migrationPath = `./drizzle/${tag}.sql`;
      if (!existsSync(migrationPath)) continue;
      // Tolérant aux erreurs : une migration non idempotente (ex. colonne déjà
      // existante) ne doit pas crash-looper le conteneur — on logge et on continue.
      try {
        for (const statement of splitSqlStatements(readFileSync(migrationPath, "utf8"))) {
          await repairConnection.query(statement);
        }
      } catch (err: any) {
        const code = err?.code || err?.errno || "unknown";
        console.warn(`⚠ Operational repair skipped for ${tag} (${code}): ${err?.message ?? err}`);
      }
    }
  } finally {
    repairConnection.release();
  }
  console.log("Operational schema repairs complete.");
}

function splitSqlStatements(sqlText: string) {
  const source = sqlText
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--> statement-breakpoint"))
    .join("\n");
  const statements: string[] = [];
  let current = "";
  let quote: "'" | '"' | "`" | null = null;
  let escaped = false;

  for (const char of source) {
    current += char;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (char === ";") {
      const statement = current.slice(0, -1).trim();
      if (statement) statements.push(statement);
      current = "";
    }
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

main().catch((err) => {
  console.error("✖ Migration failed:", err);
  process.exit(1);
});
