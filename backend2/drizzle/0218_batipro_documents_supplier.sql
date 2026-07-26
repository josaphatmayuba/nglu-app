-- BatiPro Phase 2 (bons de commande) : rattachement fournisseur sur un document
-- sortant (BC). Reutilise le referentiel central fournisseurs (meme colonne que
-- batipro_materials.supplier_id). subcontractor_id existe deja (Phase 0).
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'supplier_id');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `supplier_id` BIGINT DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
