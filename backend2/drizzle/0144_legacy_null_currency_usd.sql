-- ============================================================
-- Legacy currency fallback: migrated amounts with no recorded devise are USD.
-- Idempotent data repair. No amount is changed, only missing currency refs.
-- ============================================================
UPDATE journal_entries
SET currency_id = COALESCE((SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true'), 2)
WHERE currency_id IS NULL
  AND (source_module = 'legacy_migration' OR idempotency_key LIKE 'legacy-tx-%');
--> statement-breakpoint
UPDATE transaction
SET currencyId = COALESCE((SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true'), 2)
WHERE currencyId IS NULL;
--> statement-breakpoint
UPDATE saleInvoice
SET currencyId = COALESCE((SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true'), 2)
WHERE currencyId IS NULL
  AND id LIKE 'LEG-%';
--> statement-breakpoint
UPDATE purchaseInvoice
SET currencyId = COALESCE((SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true'), 2)
WHERE currencyId IS NULL
  AND id LIKE 'LEG-%';
--> statement-breakpoint
UPDATE real_estate_properties
SET currency_id = COALESCE((SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true'), 2)
WHERE currency_id IS NULL
  AND code LIKE 'LEG-%';
--> statement-breakpoint
UPDATE real_estate_units u
JOIN legacy_unit_map m ON m.new_unit_id = u.id
SET u.currency_id = COALESCE((SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true'), 2)
WHERE u.currency_id IS NULL;
--> statement-breakpoint
UPDATE real_estate_leases
SET currency_id = COALESCE((SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true'), 2)
WHERE currency_id IS NULL
  AND reference LIKE 'LEG-BAIL-%';
--> statement-breakpoint
UPDATE real_estate_rent_payments
SET currency_id = COALESCE((SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true'), 2)
WHERE currency_id IS NULL
  AND reference LIKE 'legacy-rp-%';
--> statement-breakpoint
UPDATE salary_histories
SET currency_id = COALESCE((SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true'), 2),
    updated_at = NOW()
WHERE currency_id IS NULL
  AND comment LIKE '[LEG-USER-%';
