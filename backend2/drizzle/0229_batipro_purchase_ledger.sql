-- BatiPro depenses -> compta. Deux volets, idempotents (rejouables au boot) :
--  1. Colonne `payment_ledger_entry_id` sur batipro_documents (id de l ecriture de
--     DECAISSEMENT, distincte de ledger_entry_id qui porte l ecriture d achat).
--  2. Regles comptables `transaction_type_rules` pour org 1 :
--     - 'batipro_purchase' : ecriture ACHAT (expense HT + vat_input TVA = payable TTC).
--       expense    -> Cost of Sales (9) DEBIT ; vat_input -> Tax (15) DEBIT ;
--       payable    -> Accounts Payable (5) CREDIT.
--     - 'batipro_supplier_payment' : DECAISSEMENT (payable DEBIT = cash CREDIT).
--       payable    -> Accounts Payable (5) DEBIT ; cash -> Cash (1) CREDIT.
-- Comptes = sous-comptes existants ; le service passe des ROLES, ces regles resolvent
-- role -> compte + sens (calque sur le type 'purchase' existant).
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'payment_ledger_entry_id');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `payment_ledger_entry_id` BIGINT UNSIGNED NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`) VALUES
  (1, 'batipro_purchase', 'expense', 9, 'DEBIT', 1),
  (1, 'batipro_purchase', 'vat_input', 15, 'DEBIT', 2),
  (1, 'batipro_purchase', 'payable', 5, 'CREDIT', 3),
  (1, 'batipro_supplier_payment', 'payable', 5, 'DEBIT', 1),
  (1, 'batipro_supplier_payment', 'cash', 1, 'CREDIT', 2)
ON DUPLICATE KEY UPDATE
  `account_id` = VALUES(`account_id`),
  `side` = VALUES(`side`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = 1;
