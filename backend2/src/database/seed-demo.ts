// Demo data seeder entrypoint — runs ONLY the demo seeders (rich data
// for the property management UI). Distinct from `seed.ts` which handles
// system/RBAC data and is safe to run in production.
//
// Use this on the dev environment (dev.ongdngolu.org) so the UI feels
// alive. Idempotent — skips if data is already present.

import "dotenv/config";
import { connection } from "./seed.db";
import { seedDemoRealEstate } from "./seeders/demo-real-estate.seeder";

async function main() {
  console.log("🎭 NgluERP — Demo Data Seeding\n");

  console.log("── Real Estate (properties / tenants / leases / payments / maintenance) ──");
  await seedDemoRealEstate();

  console.log("\n✅ Demo seeding complete!\n");
  await connection.end();
}

main().catch(async (err) => {
  console.error("\n❌ Demo seeding failed:", err);
  await connection.end().catch(() => undefined);
  process.exit(1);
});
