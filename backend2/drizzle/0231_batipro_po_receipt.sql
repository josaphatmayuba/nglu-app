-- BatiPro : concretise deux statuts de Bon de Commande jusque la fantomes cote UI.
--  1. CONFIRMATION fournisseur (accuse de reception du BC) : confirmed_at /
--     confirmed_by / supplier_reference (no de commande chez le fournisseur) /
--     expected_delivery_date (date de livraison annoncee).
--  2. RECEPTION physique, decouplee de l emission : received_at / received_by sur
--     l entete, et received_quantity sur la ligne.
-- Nouveau cycle de vie de batipro_documents.status pour type=purchase_order :
--   draft -> sent -> confirmed -> partially_received -> received
--   cancelled possible depuis tout etat sauf received.
-- status reste VARCHAR(40) : aucune contrainte enum a modifier, seules les valeurs
-- admises changent (validees cote service).
-- received_quantity est un CACHE denormalise ; la source de verite reste
-- SUM(batipro_stock_movements.quantity) filtre sur movement_type = reception.
--  3. Role comptable supplier_advance (AVANCE FOURNISSEUR) pour les acomptes payes
--     avant reception : creance sur le fournisseur, donc compte d ACTIF, et non une
--     charge. Sous-compte Supplier Advance rattache au compte racine Asset, cree
--     pour CHAQUE organisation (ids auto-increment differents par org, donc resolus
--     par nom et jamais codes en dur). Regles transaction_type_rules :
--       batipro_supplier_advance : supplier_advance DEBIT / cash CREDIT (acompte verse)
--       batipro_advance_offset   : payable DEBIT / supplier_advance CREDIT (solde a la facture)
-- transaction_type_rules est une table de reference systeme deja alimentee par
-- migration (voir 0106 et 0229) : meme pattern INSERT ... SELECT ... WHERE NOT EXISTS.
-- Idempotent (rejouable au boot) : INFORMATION_SCHEMA + PREPARE/EXECUTE, MySQL 8
-- ne supportant pas ADD COLUMN IF NOT EXISTS. Un seul statement par breakpoint.
-- Aucune apostrophe dans les commentaires (le splitter suit les quotes).
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'confirmed_at');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `confirmed_at` TIMESTAMP NULL DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'confirmed_by');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `confirmed_by` BIGINT NULL DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'supplier_reference');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `supplier_reference` VARCHAR(120) NULL DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'expected_delivery_date');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `expected_delivery_date` DATE NULL DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'received_at');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `received_at` TIMESTAMP NULL DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'received_by');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `received_by` BIGINT NULL DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_document_lines' AND COLUMN_NAME = 'received_quantity');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_document_lines` ADD COLUMN `received_quantity` DECIMAL(14,3) NOT NULL DEFAULT 0', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND INDEX_NAME = 'idx_batipro_documents_org_type_status');
--> statement-breakpoint
SET @sql := IF(@idx = 0, 'CREATE INDEX `idx_batipro_documents_org_type_status` ON `batipro_documents` (`organization_id`, `type`, `status`)', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
INSERT INTO `subAccount` (`organization_id`, `name`, `accountId`, `status`, `created_at`, `updated_at`)
SELECT `a`.`organization_id`, 'Supplier Advance', `a`.`id`, 'true', NOW(), NOW()
FROM `account` `a`
WHERE `a`.`name` = 'Asset'
  AND NOT EXISTS (SELECT 1 FROM `subAccount` `s` WHERE `s`.`organization_id` = `a`.`organization_id` AND `s`.`name` = 'Supplier Advance');
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT `s`.`organization_id`, 'batipro_supplier_advance', 'supplier_advance', `s`.`id`, 'DEBIT', 1
FROM `subAccount` `s`
WHERE `s`.`name` = 'Supplier Advance'
  AND NOT EXISTS (SELECT 1 FROM `transaction_type_rules` `r` WHERE `r`.`organization_id` = `s`.`organization_id` AND `r`.`type` = 'batipro_supplier_advance' AND `r`.`role` = 'supplier_advance');
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT `s`.`organization_id`, 'batipro_supplier_advance', 'cash', `s`.`id`, 'CREDIT', 2
FROM `subAccount` `s`
WHERE `s`.`name` = 'Cash'
  AND NOT EXISTS (SELECT 1 FROM `transaction_type_rules` `r` WHERE `r`.`organization_id` = `s`.`organization_id` AND `r`.`type` = 'batipro_supplier_advance' AND `r`.`role` = 'cash');
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT `s`.`organization_id`, 'batipro_advance_offset', 'payable', `s`.`id`, 'DEBIT', 1
FROM `subAccount` `s`
WHERE `s`.`name` = 'Accounts Payable'
  AND NOT EXISTS (SELECT 1 FROM `transaction_type_rules` `r` WHERE `r`.`organization_id` = `s`.`organization_id` AND `r`.`type` = 'batipro_advance_offset' AND `r`.`role` = 'payable');
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT `s`.`organization_id`, 'batipro_advance_offset', 'supplier_advance', `s`.`id`, 'CREDIT', 2
FROM `subAccount` `s`
WHERE `s`.`name` = 'Supplier Advance'
  AND NOT EXISTS (SELECT 1 FROM `transaction_type_rules` `r` WHERE `r`.`organization_id` = `s`.`organization_id` AND `r`.`type` = 'batipro_advance_offset' AND `r`.`role` = 'supplier_advance');
