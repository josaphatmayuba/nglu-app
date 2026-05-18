import { sql } from "drizzle-orm";
import { db } from "../seed.db";
import { currencies } from "../schema";

const CURRENCIES = [
  { currencyName: "FRANC CONGOLAIS", currencySymbol: "FC" }, // CDF — devise principale (frontend la reconnaît par ce nom exact)
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
  // Idempotent per-name : on n'insère que les devises absentes par nom.
  // Permet d'ajouter de nouvelles entrées (ex. FRANC CONGOLAIS) à une DB
  // déjà peuplée sans skipper le seeder entièrement.
  const existing = await db.select({ currencyName: currencies.currencyName }).from(currencies);
  const existingNames = new Set(existing.map((c) => c.currencyName));
  const missing = CURRENCIES.filter((c) => !existingNames.has(c.currencyName));

  if (!missing.length) {
    console.log("  [currencies] already seeded, all required currencies present.");
    return;
  }

  await db.insert(currencies).values(
    missing.map((c) => ({
      ...c,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })),
  );
  console.log(`  [currencies] inserted ${missing.length} missing currency(ies): ${missing.map((c) => c.currencyName).join(", ")}.`);
}
