-- BatiPro Phase 4 (factures + compta). Deux volets, idempotents (rejouables au boot) :
--  1. Colonne `paid_amount` sur batipro_documents (suivi du reglement des factures).
--  2. Regles comptables `transaction_type_rules` pour le type 'batipro_invoice' :
--     facture de TRAVAUX (service), sans stock/marchandise. 3 roles simples :
--       - receivable  : creance client (DEBIT)   -> meme compte que 'sale' (4)
--       - revenue     : produit / vente (CREDIT)  -> meme compte que 'sale' (8)
--       - vat_output  : TVA collectee (CREDIT)    -> compte TVA collectee (8 dans le
--                       modele existant ; la ligne TVA est portee au credit du meme
--                       compte produit-TVA que 'sale.vat_output_credit'). On garde la
--                       coherence avec les regles 'sale' deja seedees (0106/0107).
-- Comptes = sous-comptes existants observes dans le code (jamais en dur cote service :
-- le service passe des ROLES, ces regles resolvent role -> compte + sens).
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'paid_amount');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `paid_amount` DECIMAL(14,2) NOT NULL DEFAULT 0', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`) VALUES
  (1, 'batipro_invoice', 'receivable', 4, 'DEBIT', 1),
  (1, 'batipro_invoice', 'revenue', 8, 'CREDIT', 2),
  (1, 'batipro_invoice', 'vat_output', 8, 'CREDIT', 3)
ON DUPLICATE KEY UPDATE
  `account_id` = VALUES(`account_id`),
  `side` = VALUES(`side`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = 1;
