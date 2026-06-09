-- Idempotent (rejouable à chaque boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Pattern SET/IF + PREPARE/EXECUTE compatible avec splitSqlStatements (pas de
-- procédure stockée : le splitter coupe sur chaque `;`).

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_payrolls' AND COLUMN_NAME='submittedAt');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_payrolls` ADD COLUMN `submittedAt` timestamp NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_payrolls' AND COLUMN_NAME='submittedBy');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_payrolls` ADD COLUMN `submittedBy` bigint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_payrolls' AND COLUMN_NAME='approvedBy');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_payrolls` ADD COLUMN `approvedBy` bigint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_payrolls' AND COLUMN_NAME='approvedAt');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_payrolls` ADD COLUMN `approvedAt` timestamp NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_payrolls' AND COLUMN_NAME='approvalComment');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_payrolls` ADD COLUMN `approvalComment` text NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_payrolls' AND COLUMN_NAME='rejectedBy');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_payrolls` ADD COLUMN `rejectedBy` bigint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_payrolls' AND COLUMN_NAME='rejectedAt');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_payrolls` ADD COLUMN `rejectedAt` timestamp NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_payrolls' AND COLUMN_NAME='rejectionComment');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_payrolls` ADD COLUMN `rejectionComment` text NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_payrolls' AND COLUMN_NAME='paidAt');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_payrolls` ADD COLUMN `paidAt` timestamp NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_payrolls' AND COLUMN_NAME='paidBy');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_payrolls` ADD COLUMN `paidBy` bigint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
