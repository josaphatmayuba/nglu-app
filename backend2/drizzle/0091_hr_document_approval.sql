-- Idempotent (rejouable à chaque boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Workflow de validation des documents RH avant signature.
-- Pattern SET/IF + PREPARE/EXECUTE compatible splitSqlStatements.

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='submittedAt');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `submittedAt` timestamp NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='submittedBy');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `submittedBy` bigint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='approvedBy');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `approvedBy` bigint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='approvedAt');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `approvedAt` timestamp NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='approvalComment');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `approvalComment` text NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='rejectedBy');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `rejectedBy` bigint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='rejectedAt');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `rejectedAt` timestamp NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='rejectionComment');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `rejectionComment` text NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
