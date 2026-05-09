import { sql } from "drizzle-orm";
import { db } from "../seed.db";
import { appSettings } from "../schema";

export async function seedAppSettings() {
  const existing = await db.select({ id: appSettings.id }).from(appSettings).limit(1);
  if (existing.length) {
    console.log("  [app-settings] already seeded, skipping.");
    return;
  }

  await db.insert(appSettings).values({
    companyName: "NgluERP",
    dashboardType: "inventory",
    tagLine: "Gestion simplifiée",
    address: "Votre adresse ici",
    phone: "+1 000 000 0000",
    email: "contact@nglu.app",
    website: "https://nglu.app",
    footer: "NgluERP © 2024",
    currencyId: 1, // DOLLAR — adjust to match your preferred currency id
    isPos: "false",
    isDiscount: "false",
    isTax: "false",
    createdAt: sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  });
  console.log("  [app-settings] ✔ 1 record inserted.");
}
