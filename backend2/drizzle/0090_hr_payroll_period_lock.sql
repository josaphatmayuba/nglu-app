ALTER TABLE `hr_payrolls` ADD COLUMN `periodStart` date NULL;
--> statement-breakpoint
ALTER TABLE `hr_payrolls` ADD COLUMN `periodEnd` date NULL;
--> statement-breakpoint
ALTER TABLE `appSetting` ADD COLUMN `payrollLockStage` varchar(20) NOT NULL DEFAULT 'paid';
