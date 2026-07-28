-- BatiPro : backfill de batipro_document_totals depuis les documents existants.
-- Chaque document mono devise devient une seule ligne de totaux dans sa devise.
-- PAS de backfill de batipro_document_lines.currency_id : les lignes existantes
-- restent NULL et heritent de la devise du document (comportement voulu).
-- Idempotent : ON DUPLICATE KEY UPDATE sur l index unique (document_id, currency_id).
INSERT INTO `batipro_document_totals` (`organization_id`, `document_id`, `currency_id`, `total_ht`, `total_vat`, `total_ttc`, `paid_amount`, `ledger_entry_id`, `is_active`)
SELECT `organization_id`, `id`, `currency_id`, `total_ht`, `total_vat`, `total_ttc`, `paid_amount`, `ledger_entry_id`, 1
FROM `batipro_documents`
WHERE `currency_id` IS NOT NULL
ON DUPLICATE KEY UPDATE
  `total_ht` = VALUES(`total_ht`),
  `total_vat` = VALUES(`total_vat`),
  `total_ttc` = VALUES(`total_ttc`),
  `paid_amount` = VALUES(`paid_amount`),
  `ledger_entry_id` = VALUES(`ledger_entry_id`),
  `is_active` = 1;
