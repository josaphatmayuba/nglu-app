import "dotenv/config";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { db, connection } from "./seed.db";

async function main() {
  console.log("▶ Running Drizzle migrations from ./drizzle …");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✔ Migrations complete.");
  await connection.end()  // pool.end() drains all connections
}

main().catch((err) => {
  console.error("✖ Migration failed:", err);
  process.exit(1);
});
