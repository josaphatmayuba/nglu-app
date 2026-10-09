-- Domus : delai de grace (jours) avant qu un loyer soit considere en retard, par organisation.
-- NULL = valeur par defaut du code (5 jours). Forme idempotente.
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appSetting' AND COLUMN_NAME = 'rent_overdue_grace_days');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `appSetting` ADD COLUMN `rent_overdue_grace_days` int NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
