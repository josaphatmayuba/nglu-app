-- Idempotent (rejouable au boot). Regles comptables par defaut (org 1) pour
-- transaction_type_rules : remplace progressivement les comptes en dur des modules.
-- Roles fixes seulement ; les paiements (compte = moyen de paiement) restent ligne a ligne.
-- side: DEBIT|CREDIT. account_id = sous-comptes existants observes dans le code.
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT 1, 'sale', 'cost_of_sales', 9, 'DEBIT', 1
WHERE NOT EXISTS (SELECT 1 FROM `transaction_type_rules` WHERE `organization_id`=1 AND `type`='sale' AND `role`='cost_of_sales');
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT 1, 'sale', 'inventory_out', 3, 'CREDIT', 2
WHERE NOT EXISTS (SELECT 1 FROM `transaction_type_rules` WHERE `organization_id`=1 AND `type`='sale' AND `role`='inventory_out');
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT 1, 'sale', 'receivable', 4, 'DEBIT', 3
WHERE NOT EXISTS (SELECT 1 FROM `transaction_type_rules` WHERE `organization_id`=1 AND `type`='sale' AND `role`='receivable');
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT 1, 'sale', 'revenue', 8, 'CREDIT', 4
WHERE NOT EXISTS (SELECT 1 FROM `transaction_type_rules` WHERE `organization_id`=1 AND `type`='sale' AND `role`='revenue');
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT 1, 'sale', 'vat_output', 16, 'DEBIT', 5
WHERE NOT EXISTS (SELECT 1 FROM `transaction_type_rules` WHERE `organization_id`=1 AND `type`='sale' AND `role`='vat_output');
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT 1, 'sale', 'vat_output_credit', 8, 'CREDIT', 6
WHERE NOT EXISTS (SELECT 1 FROM `transaction_type_rules` WHERE `organization_id`=1 AND `type`='sale' AND `role`='vat_output_credit');
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT 1, 'purchase', 'inventory_in', 3, 'DEBIT', 1
WHERE NOT EXISTS (SELECT 1 FROM `transaction_type_rules` WHERE `organization_id`=1 AND `type`='purchase' AND `role`='inventory_in');
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT 1, 'purchase', 'payable', 5, 'CREDIT', 2
WHERE NOT EXISTS (SELECT 1 FROM `transaction_type_rules` WHERE `organization_id`=1 AND `type`='purchase' AND `role`='payable');
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT 1, 'purchase', 'vat_input', 15, 'DEBIT', 3
WHERE NOT EXISTS (SELECT 1 FROM `transaction_type_rules` WHERE `organization_id`=1 AND `type`='purchase' AND `role`='vat_input');
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT 1, 'purchase', 'vat_input_credit', 5, 'CREDIT', 4
WHERE NOT EXISTS (SELECT 1 FROM `transaction_type_rules` WHERE `organization_id`=1 AND `type`='purchase' AND `role`='vat_input_credit');
