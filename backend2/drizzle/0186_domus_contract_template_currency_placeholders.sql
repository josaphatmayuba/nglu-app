-- 0186_domus_contract_template_currency_placeholders.sql
-- Domus contracts: replace hardcoded USD suffixes in seeded templates with
-- currency-aware placeholders resolved from the lease currency.

UPDATE real_estate_contract_templates
SET
  body = REPLACE(
    REPLACE(
      REPLACE(body,
        '[MONTANT DU LOYER] $ (USD)',
        '[MONTANT DU LOYER AVEC DEVISE]'
      ),
      '[MONTANT DU LOYER] $',
      '[MONTANT DU LOYER AVEC DEVISE]'
    ),
    '[MONTANT GARANTIE] $',
    '[MONTANT GARANTIE AVEC DEVISE]'
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE body LIKE '%[MONTANT DU LOYER] $%'
   OR body LIKE '%[MONTANT GARANTIE] $%';
--> statement-breakpoint
