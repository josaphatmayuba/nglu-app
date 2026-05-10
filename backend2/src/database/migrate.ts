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

async function main() {
  await baselineExistingDatabase();

  console.log("▶ Running Drizzle migrations from ./drizzle …");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✔ Migrations complete.");
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

main().catch((err) => {
  console.error("✖ Migration failed:", err);
  process.exit(1);
});
