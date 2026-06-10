-- Idempotent (rejouable au boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Dossier vétérinaire — champs cliniques avancés (anamnèse, diff, labo, suivi).
-- ALTER simples idempotents : on ajoute la colonne seulement si absente.

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='reason'),
  'ALTER TABLE `farmos_vet_exams` ADD COLUMN `reason` varchar(500) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='anamnesis'),
  'ALTER TABLE `farmos_vet_exams` ADD COLUMN `anamnesis` text NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='differential_diagnosis'),
  'ALTER TABLE `farmos_vet_exams` ADD COLUMN `differential_diagnosis` text NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='lab_tests'),
  'ALTER TABLE `farmos_vet_exams` ADD COLUMN `lab_tests` text NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='lab_results'),
  'ALTER TABLE `farmos_vet_exams` ADD COLUMN `lab_results` text NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='recommendation'),
  'ALTER TABLE `farmos_vet_exams` ADD COLUMN `recommendation` text NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_vet_exams' AND COLUMN_NAME='followup'),
  'ALTER TABLE `farmos_vet_exams` ADD COLUMN `followup` text NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
