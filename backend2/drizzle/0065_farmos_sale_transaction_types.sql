-- Detailed FarmOS sale transaction types for CRM ledger/POS traceability.
-- All FarmOS direct sales debit Cash and credit Sales.

INSERT INTO `transaction_types`
  (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT src.name, src.debit_id, src.credit_id, src.description, 1, NOW(), NOW()
FROM (
  SELECT 'FarmOS Sale' AS name,
         (SELECT id FROM `subAccount` WHERE name = 'Cash' LIMIT 1) AS debit_id,
         (SELECT id FROM `subAccount` WHERE name = 'Sales' LIMIT 1) AS credit_id,
         'Generic FarmOS sale - debit Cash, credit Sales' AS description
  UNION ALL SELECT 'FarmOS Animal Sale',
         (SELECT id FROM `subAccount` WHERE name = 'Cash' LIMIT 1),
         (SELECT id FROM `subAccount` WHERE name = 'Sales' LIMIT 1),
         'FarmOS animal or batch sale - debit Cash, credit Sales'
  UNION ALL SELECT 'FarmOS Egg Sale',
         (SELECT id FROM `subAccount` WHERE name = 'Cash' LIMIT 1),
         (SELECT id FROM `subAccount` WHERE name = 'Sales' LIMIT 1),
         'FarmOS egg sale - debit Cash, credit Sales'
  UNION ALL SELECT 'FarmOS Milk Sale',
         (SELECT id FROM `subAccount` WHERE name = 'Cash' LIMIT 1),
         (SELECT id FROM `subAccount` WHERE name = 'Sales' LIMIT 1),
         'FarmOS milk sale - debit Cash, credit Sales'
  UNION ALL SELECT 'FarmOS Meat Sale',
         (SELECT id FROM `subAccount` WHERE name = 'Cash' LIMIT 1),
         (SELECT id FROM `subAccount` WHERE name = 'Sales' LIMIT 1),
         'FarmOS meat sale - debit Cash, credit Sales'
  UNION ALL SELECT 'FarmOS Wool Sale',
         (SELECT id FROM `subAccount` WHERE name = 'Cash' LIMIT 1),
         (SELECT id FROM `subAccount` WHERE name = 'Sales' LIMIT 1),
         'FarmOS wool sale - debit Cash, credit Sales'
  UNION ALL SELECT 'FarmOS Fish Sale',
         (SELECT id FROM `subAccount` WHERE name = 'Cash' LIMIT 1),
         (SELECT id FROM `subAccount` WHERE name = 'Sales' LIMIT 1),
         'FarmOS fish sale - debit Cash, credit Sales'
  UNION ALL SELECT 'FarmOS Production Sale',
         (SELECT id FROM `subAccount` WHERE name = 'Cash' LIMIT 1),
         (SELECT id FROM `subAccount` WHERE name = 'Sales' LIMIT 1),
         'FarmOS production sale - debit Cash, credit Sales'
) src
WHERE src.debit_id IS NOT NULL
  AND src.credit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `transaction_types` t
    WHERE t.name = src.name AND t.is_active = 1
  );
