-- ============================================================
-- Backfill: any journal_entries still missing a currency default to USD.
-- 0144 only covered legacy_migration / legacy-tx-% rows; remaining NULL
-- currency entries (e.g. early dual-write / pre-currency entries) showed as
-- "—" in Trésorerie. Idempotent data repair: no amount changed, only the
-- missing currency reference is set.
-- ============================================================
UPDATE journal_entries
SET currency_id = COALESCE((SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true'), 2)
WHERE currency_id IS NULL;
