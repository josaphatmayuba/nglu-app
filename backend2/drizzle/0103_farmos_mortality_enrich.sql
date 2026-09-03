-- Idempotent (rejouable au boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Module mortalité enrichi (prompt design ferme/vét) : heure, localisation,
-- cause confirmée, maladie liée, symptômes, vét consulté, perte financière, autopsie.

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_mortality_events' AND COLUMN_NAME='event_time'),
  'ALTER TABLE `farmos_mortality_events` ADD COLUMN `event_time` varchar(8) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_mortality_events' AND COLUMN_NAME='barn'),
  'ALTER TABLE `farmos_mortality_events` ADD COLUMN `barn` varchar(100) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_mortality_events' AND COLUMN_NAME='lot'),
  'ALTER TABLE `farmos_mortality_events` ADD COLUMN `lot` varchar(100) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_mortality_events' AND COLUMN_NAME='confirmed_cause'),
  'ALTER TABLE `farmos_mortality_events` ADD COLUMN `confirmed_cause` varchar(255) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_mortality_events' AND COLUMN_NAME='related_disease_id'),
  'ALTER TABLE `farmos_mortality_events` ADD COLUMN `related_disease_id` bigint NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_mortality_events' AND COLUMN_NAME='pre_death_symptoms'),
  'ALTER TABLE `farmos_mortality_events` ADD COLUMN `pre_death_symptoms` text NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_mortality_events' AND COLUMN_NAME='vet_consulted'),
  'ALTER TABLE `farmos_mortality_events` ADD COLUMN `vet_consulted` varchar(255) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_mortality_events' AND COLUMN_NAME='estimated_loss'),
  'ALTER TABLE `farmos_mortality_events` ADD COLUMN `estimated_loss` decimal(12,2) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_mortality_events' AND COLUMN_NAME='necropsy_done'),
  'ALTER TABLE `farmos_mortality_events` ADD COLUMN `necropsy_done` tinyint NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
