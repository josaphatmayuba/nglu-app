-- Idempotent (rejouable à chaque boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Pattern SET/IF + PREPARE/EXECUTE compatible avec splitSqlStatements.

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='templateType');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `templateType` varchar(80) DEFAULT NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='version');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `version` int NOT NULL DEFAULT 1', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='generatedAt');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `generatedAt` timestamp NULL DEFAULT NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='generatedBy');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `generatedBy` bigint DEFAULT NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='content');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `content` text NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='signedAt');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `signedAt` timestamp NULL DEFAULT NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='signedBy');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `signedBy` varchar(255) DEFAULT NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
