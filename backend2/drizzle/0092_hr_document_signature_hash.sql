-- Idempotent (rejouable à chaque boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Signature électronique niveau 1 : empreinte d'intégrité du document signé.

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='contentHash');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `contentHash` varchar(64) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='signatureToken');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `signatureToken` varchar(64) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_documents' AND COLUMN_NAME='signatureAlgorithm');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_documents` ADD COLUMN `signatureAlgorithm` varchar(40) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
