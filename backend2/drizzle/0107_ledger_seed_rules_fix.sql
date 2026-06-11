-- Idempotent et insensible a l'ordre de boot. Re-seed robuste des regles comptables
-- (transaction_type_rules) apres echec silencieux de 0106 sur dev.
-- Strategie : contrainte UNIQUE (organization_id, type, role) + INSERT ... ON DUPLICATE
-- KEY UPDATE. Rejoue a chaque boot (index >= 70) sans effet de bord ni dependance d'ordre.
-- L'ALTER est tolere s'il existe deja (repair tolerant de migrate.ts).
ALTER TABLE `transaction_type_rules`
  ADD UNIQUE KEY `uq_ttr_org_type_role` (`organization_id`, `type`, `role`);
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`) VALUES
  (1, 'sale', 'cost_of_sales', 9, 'DEBIT', 1),
  (1, 'sale', 'inventory_out', 3, 'CREDIT', 2),
  (1, 'sale', 'receivable', 4, 'DEBIT', 3),
  (1, 'sale', 'revenue', 8, 'CREDIT', 4),
  (1, 'sale', 'vat_output', 16, 'DEBIT', 5),
  (1, 'sale', 'vat_output_credit', 8, 'CREDIT', 6),
  (1, 'purchase', 'inventory_in', 3, 'DEBIT', 1),
  (1, 'purchase', 'payable', 5, 'CREDIT', 2),
  (1, 'purchase', 'vat_input', 15, 'DEBIT', 3),
  (1, 'purchase', 'vat_input_credit', 5, 'CREDIT', 4)
ON DUPLICATE KEY UPDATE
  `account_id` = VALUES(`account_id`),
  `side` = VALUES(`side`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = 1;
