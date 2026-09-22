-- Domus : trace du rappel de FIN DE BAIL envoye au locataire et au proprietaire.
-- Sans cette colonne, le cron quotidien renverrait le meme SMS chaque jour
-- pendant les 90 jours precedant la date de fin (meme principe que
-- last_overdue_reminder_date pour les loyers en retard).
-- On stocke la date de fin couverte par le rappel : si le bail est prolonge,
-- la nouvelle end_date differe et un nouveau rappel peut partir.
-- Forme idempotente (INFORMATION_SCHEMA + PREPARE) : MySQL 8 refuse
-- ADD COLUMN IF NOT EXISTS, et la migration doit pouvoir etre rejouee.
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_leases' AND COLUMN_NAME = 'last_expiry_reminder_date');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `last_expiry_reminder_date` date NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
