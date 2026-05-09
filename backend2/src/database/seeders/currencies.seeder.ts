import { sql } from "drizzle-orm";
import { db } from "../seed.db";
import { currencies } from "../schema";

const CURRENCIES = [
  { currencyName: "DOLLAR", currencySymbol: "$" },
  { currencyName: "EURO", currencySymbol: "€" },
  { currencyName: "BDT", currencySymbol: "৳" },
  { currencyName: "POUND", currencySymbol: "£" },
  { currencyName: "RUPEE", currencySymbol: "₹" },
  { currencyName: "YEN", currencySymbol: "¥" },
  { currencyName: "WON", currencySymbol: "₩" },
  { currencyName: "YUAN", currencySymbol: "¥" },
  { currencyName: "PESO", currencySymbol: "₱" },
  { currencyName: "LIRA", currencySymbol: "₺" },
  { currencyName: "FRANC", currencySymbol: "₣" },
  { currencyName: "REAL", currencySymbol: "R$" },
  { currencyName: "RUBLE", currencySymbol: "₽" },
  { currencyName: "RINGGIT", currencySymbol: "RM" },
  { currencyName: "CAD", currencySymbol: "CA$" },
];

export async function seedCurrencies() {
  const existing = await db.select({ id: currencies.id }).from(currencies).limit(1);
  if (existing.length) {
    console.log("  [currencies] already seeded, skipping.");
    return;
  }

  await db.insert(currencies).values(
    CURRENCIES.map((c) => ({
      ...c,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })),
  );
  console.log(`  [currencies] ✔ ${CURRENCIES.length} records inserted.`);
}
