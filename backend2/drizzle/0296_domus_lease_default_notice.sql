-- Domus : trace du PREAVIS pour defaut de paiement notifie au locataire.
-- Le gestionnaire declenche ce message a la main depuis la page Loyers, pour un
-- locataire qui doit plus de 1 mois de loyer. On garde la date envoi (valeur
-- juridique : preuve que le locataire a ete averti) et le nombre de mois dus au
-- moment de la notification, pour retrouver la situation exacte a cette date.
-- Forme idempotente (INFORMATION_SCHEMA + PREPARE) : MySQL 8 refuse
-- ADD COLUMN IF NOT EXISTS, et la migration doit pouvoir etre rejouee.
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_leases' AND COLUMN_NAME = 'default_notice_sent_at');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `default_notice_sent_at` timestamp NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_leases' AND COLUMN_NAME = 'default_notice_months_behind');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `default_notice_months_behind` int NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
