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

const OPERATIONAL_REPAIR_MIGRATIONS = [
  "0070_refresh_token_rotation",
  "0071_hr_modules",
  "0072_hr_timesheets",
  "0073_hr_money_currency_ids",
  "0074_hr_employee_requests",
  "0075_hr_timesheet_period_dates",
  "0076_hr_contract_professional_fields",
  "0077_hr_employee_complete_fields",
  "0078_hr_payrolls",
  "0079_hr_project_assignments",
  // 0080-0087: les timestamps `when` du journal Drizzle sont en désordre
  // (0085-0087 < 0084), donc Drizzle saute ces migrations au boot. On les
  // rejoue ici. Tous ces fichiers ont été rendus idempotents (IF NOT EXISTS /
  // SET+IF+PREPARE) pour pouvoir être réexécutés à chaque démarrage.
  "0080_hr_timesheets_project_id",
  "0081_hr_attendances",
  "0082_hr_leave_workflow",
  "0083_hr_document_generation",
  "0084_hr_candidates",
  "0085_hr_payroll_approval",
  "0086_hr_personal_documents",
  "0087_hr_tax_rules",
  "0088_hr_public_holidays",
  "0089_hr_leave_entitlements",
  "0090_hr_payroll_period_lock",
  "0091_hr_document_approval",
  "0092_hr_document_signature_hash",
  "0093_hr_candidate_evaluations",
];

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
  const firstTag = OPERATIONAL_REPAIR_MIGRATIONS[0];
  const lastTag = OPERATIONAL_REPAIR_MIGRATIONS[OPERATIONAL_REPAIR_MIGRATIONS.length - 1];
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
  for (const tag of OPERATIONAL_REPAIR_MIGRATIONS) {
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
    for (const tag of OPERATIONAL_REPAIR_MIGRATIONS) {
      const migrationPath = `./drizzle/${tag}.sql`;
      if (!existsSync(migrationPath)) continue;
      for (const statement of splitSqlStatements(readFileSync(migrationPath, "utf8"))) {
        await repairConnection.query(statement);
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
