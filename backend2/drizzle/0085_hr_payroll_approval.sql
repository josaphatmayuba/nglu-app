ALTER TABLE `hr_payrolls` ADD COLUMN `submittedAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `hr_payrolls` ADD COLUMN `submittedBy` bigint NULL;
--> statement-breakpoint
ALTER TABLE `hr_payrolls` ADD COLUMN `approvedBy` bigint NULL;
--> statement-breakpoint
ALTER TABLE `hr_payrolls` ADD COLUMN `approvedAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `hr_payrolls` ADD COLUMN `approvalComment` text NULL;
--> statement-breakpoint
ALTER TABLE `hr_payrolls` ADD COLUMN `rejectedBy` bigint NULL;
--> statement-breakpoint
ALTER TABLE `hr_payrolls` ADD COLUMN `rejectedAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `hr_payrolls` ADD COLUMN `rejectionComment` text NULL;
--> statement-breakpoint
ALTER TABLE `hr_payrolls` ADD COLUMN `paidAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `hr_payrolls` ADD COLUMN `paidBy` bigint NULL;
