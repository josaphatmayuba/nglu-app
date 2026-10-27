-- Domus : opt-out du SMS proprietaire a l enregistrement d une depense sur son bien.
-- 1 = le proprietaire recoit le SMS (defaut), 0 = desactive. Forme idempotente, aucune donnee inseree.
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_owners' AND COLUMN_NAME = 'notify_expense_sms');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_owners` ADD COLUMN `notify_expense_sms` tinyint NOT NULL DEFAULT 1', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
