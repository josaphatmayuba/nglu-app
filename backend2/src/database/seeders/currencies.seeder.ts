import { sql } from "drizzle-orm";
import { db } from "../seed.db";
import { currencies } from "../schema";

const worldCurrencies = require("world-currencies");

export async function seedCurrencies() {
  // Populate from world-currencies library with fallback for localized DRC currency
  const existing = await db.select({ currencyCode: currencies.currencyCode }).from(currencies);
  const existingCodes = new Set(existing.map((c) => c.currencyCode));

  const currenciesToInsert = Object.entries(worldCurrencies).map(([code, data]: [string, any]) => ({
    currencyCode: code,
    currencyName: data.name || code,
    currencySymbol: data.units?.major?.symbol || code,
    decimalPlaces: 2,
    status: "true",
    createdAt: sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  })).filter((c) => !existingCodes.has(c.currencyCode));

  if (!currenciesToInsert.length) {
    console.log("  [currencies] already seeded with all world currencies.");
    return;
  }

  await db.insert(currencies).values(currenciesToInsert);
  console.log(`  [currencies] inserted ${currenciesToInsert.length} world currency(ies).`);
}
