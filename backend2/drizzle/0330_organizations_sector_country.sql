-- Inscription Avelomi : secteur d activite et pays (ISO 3166-1 alpha-2) de l organisation.
-- Le secteur oriente le client vers la bonne app ; le pays sert au telephone par defaut.
-- Forme idempotente (MySQL 8, pas de ADD COLUMN IF NOT EXISTS). Aucune donnee inseree.
SET @col_sector := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'sector');
--> statement-breakpoint
SET @sql := IF(@col_sector = 0, 'ALTER TABLE `organizations` ADD COLUMN `sector` varchar(30) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_country := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'country');
--> statement-breakpoint
SET @sql := IF(@col_country = 0, 'ALTER TABLE `organizations` ADD COLUMN `country` varchar(2) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
