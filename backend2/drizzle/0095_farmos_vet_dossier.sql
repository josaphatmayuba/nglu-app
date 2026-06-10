-- Idempotent (rejouable à chaque boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Dossier vétérinaire complet : examen clinique, protocole, signature vét + ordonnance.
-- Pattern SET/IF + PREPARE/EXECUTE compatible splitSqlStatements (1 statement/breakpoint).

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='exam_type');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `farmos_vet_exams` ADD COLUMN `exam_type` varchar(50) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='clinical_exam');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `farmos_vet_exams` ADD COLUMN `clinical_exam` text NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='protocol');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `farmos_vet_exams` ADD COLUMN `protocol` text NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='temperature');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `farmos_vet_exams` ADD COLUMN `temperature` decimal(5,2) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='weight');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `farmos_vet_exams` ADD COLUMN `weight` decimal(10,2) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='signature');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `farmos_vet_exams` ADD COLUMN `signature` mediumtext NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='signed_at');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `farmos_vet_exams` ADD COLUMN `signed_at` timestamp NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='signed_by');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `farmos_vet_exams` ADD COLUMN `signed_by` varchar(255) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `farmos_vet_prescriptions` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `exam_id` bigint NOT NULL,
  `medicine_id` bigint NULL,
  `medicine_name` varchar(255) NULL,
  `dosage` varchar(255) NULL,
  `frequency` varchar(255) NULL,
  `duration` varchar(255) NULL,
  `route` varchar(50) NULL,
  `withdrawal_meat_days` int NULL,
  `withdrawal_milk_hours` int NULL,
  `withdrawal_eggs_days` int NULL,
  `notes` text NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now())
);
