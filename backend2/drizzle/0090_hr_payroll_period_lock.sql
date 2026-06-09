-- Idempotent (rejouable à chaque boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Verrou paie par période: intervalle réel du bulletin (periodStart/periodEnd,
-- s'adapte à toute fréquence) + réglage du statut déclencheur (validated|paid).

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_payrolls' AND COLUMN_NAME='periodStart');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_payrolls` ADD COLUMN `periodStart` date NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_payrolls' AND COLUMN_NAME='periodEnd');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_payrolls` ADD COLUMN `periodEnd` date NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='appSetting' AND COLUMN_NAME='payrollLockStage');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `appSetting` ADD COLUMN `payrollLockStage` varchar(20) NOT NULL DEFAULT ''paid''', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
