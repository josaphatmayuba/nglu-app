SET @defaultCurrencyId := (SELECT currencyId FROM appSetting ORDER BY id LIMIT 1);

SET @c1 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_expense_requests' AND COLUMN_NAME = 'currencyId');
SET @q1 := IF(@c1 = 0, 'ALTER TABLE `hr_expense_requests` ADD COLUMN `currencyId` BIGINT NULL AFTER `amount`', 'SELECT 1');
PREPARE p1 FROM @q1; EXECUTE p1; DEALLOCATE PREPARE p1;
--> statement-breakpoint
UPDATE `hr_expense_requests` SET `currencyId` = @defaultCurrencyId WHERE `currencyId` IS NULL AND @defaultCurrencyId IS NOT NULL;
--> statement-breakpoint

SET @c2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_social_declarations' AND COLUMN_NAME = 'currencyId');
SET @q2 := IF(@c2 = 0, 'ALTER TABLE `hr_social_declarations` ADD COLUMN `currencyId` BIGINT NULL AFTER `amount`', 'SELECT 1');
PREPARE p2 FROM @q2; EXECUTE p2; DEALLOCATE PREPARE p2;
--> statement-breakpoint
UPDATE `hr_social_declarations` SET `currencyId` = @defaultCurrencyId WHERE `currencyId` IS NULL AND @defaultCurrencyId IS NOT NULL;
--> statement-breakpoint

SET @c3 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_training_sessions' AND COLUMN_NAME = 'currencyId');
SET @q3 := IF(@c3 = 0, 'ALTER TABLE `hr_training_sessions` ADD COLUMN `currencyId` BIGINT NULL AFTER `budget`', 'SELECT 1');
PREPARE p3 FROM @q3; EXECUTE p3; DEALLOCATE PREPARE p3;
--> statement-breakpoint
UPDATE `hr_training_sessions` SET `currencyId` = @defaultCurrencyId WHERE `currencyId` IS NULL AND @defaultCurrencyId IS NOT NULL;
--> statement-breakpoint
