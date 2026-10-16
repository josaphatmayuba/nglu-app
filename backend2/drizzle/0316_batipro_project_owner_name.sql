-- BatiPro : nom du proprietaire du chantier (affichage et formule d accueil des SMS proprietaire).
-- Forme idempotente (MySQL 8, pas de ADD COLUMN IF NOT EXISTS). Aucune donnee inseree.
SET @col_owner_name := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_projects' AND COLUMN_NAME = 'owner_name');
--> statement-breakpoint
SET @sql := IF(@col_owner_name = 0, 'ALTER TABLE `batipro_projects` ADD COLUMN `owner_name` varchar(255) NULL AFTER `client`', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
