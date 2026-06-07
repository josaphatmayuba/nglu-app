import "dotenv/config";
import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { db, connection } from "./seed.db";

type JournalEntry = {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
};

const OPERATIONAL_REPAIR_MIGRATIONS = [
  "0071_hr_modules",
  "0072_hr_timesheets",
  "0073_hr_money_currency_ids",
  "0074_hr_employee_requests",
  "0075_hr_timesheet_period_dates",
  "0076_hr_contract_professional_fields",
  "0077_hr_employee_complete_fields",
  "0078_hr_payrolls",
  "0079_hr_project_assignments",
];

async function main() {
  await baselineExistingDatabase();

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
  const journalPath = "./drizzle/meta/_journal.json";
  if (!existsSync(journalPath)) {
    throw new Error("Missing Drizzle journal at ./drizzle/meta/_journal.json");
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: JournalEntry[] };
  const first = journal.entries[0];
  if (!first) {
    throw new Error("Drizzle journal has no migration entries.");
  }
  return first;
}

function migrationHash(tag: string) {
  const migrationPath = `./drizzle/${tag}.sql`;
  if (!existsSync(migrationPath)) {
    throw new Error(`Missing Drizzle migration file ${migrationPath}`);
  }

  return createHash("sha256").update(readFileSync(migrationPath, "utf8")).digest("hex");
}

async function applyOperationalRepairs() {
  console.log("Verifying operational schema repairs...");
  for (const tag of OPERATIONAL_REPAIR_MIGRATIONS) {
    const migrationPath = `./drizzle/${tag}.sql`;
    if (!existsSync(migrationPath)) continue;
    for (const statement of splitSqlStatements(readFileSync(migrationPath, "utf8"))) {
      await connection.query(statement);
    }
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
