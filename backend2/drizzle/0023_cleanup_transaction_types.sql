-- 0023_cleanup_transaction_types.sql
--
-- Removes duplicate/incorrect transaction types and aligns mappings
-- with the actual application modules (sale-invoices, purchase-invoices,
-- property-management). All changes are idempotent and non-destructive
-- (soft-delete via is_active=0, not physical DELETE).

-- ─── 1. Soft-delete duplicates and incorrect types ────────────────────────────
-- Sale Invoice  → duplicate of VTE - Sales Journal     (same AR → Sales)
-- Sale Payment  → duplicate of CAI - Cash Journal      (same Cash → AR)
-- Purchase Invoice → duplicate of ACH - Purchase Journal (same Inv → AP)
-- Purchase Payment → duplicate of CAI - Supplier Cash Payment (same AP → Cash)
-- Security Deposit → wrong accounts (Cash → Inventory); replaced by CAI/BNQ variants
-- Maintenance Expense → replaced by BNQM - Maintenance Journal

UPDATE `transaction_types`
SET    `is_active` = 0, `updated_at` = NOW()
WHERE  `name` IN (
  'Sale Invoice',
  'Sale Payment',
  'Purchase Invoice',
  'Purchase Payment',
  'Security Deposit',
  'Maintenance Expense'
);

-- ─── 2. Fix / create Rent Payment with correct accounting mapping ─────────────
-- Correct: debit Cash (money received), credit Rental Revenue (income recognized)
-- Soft-delete the old wrong version (Cash → Bank = internal transfer)
UPDATE `transaction_types`
SET    `is_active` = 0, `updated_at` = NOW()
WHERE  `name` = 'Rent Payment'
  AND  `credit_account_id` = (SELECT id FROM subAccount WHERE name = 'Bank' LIMIT 1);

-- Insert correct Rent Payment if not already present
INSERT INTO `transaction_types`
  (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT
  'Rent Payment',
  (SELECT id FROM subAccount WHERE name = 'Cash'           LIMIT 1),
  (SELECT id FROM subAccount WHERE name = 'Rental Revenue' LIMIT 1),
  'Cash rent received from tenant — debits Cash, credits Rental Revenue',
  1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `transaction_types`
  WHERE  name = 'Rent Payment' AND is_active = 1
);
