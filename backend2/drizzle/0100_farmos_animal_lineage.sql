-- Idempotent (rejouable au boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Fiche animal : filiation (mère / père) + valeur estimée (prompt design ferme/vét).

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_animals' AND COLUMN_NAME='mother_id'),
  'ALTER TABLE `farmos_animals` ADD COLUMN `mother_id` varchar(100) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_animals' AND COLUMN_NAME='father_id'),
  'ALTER TABLE `farmos_animals` ADD COLUMN `father_id` varchar(100) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_animals' AND COLUMN_NAME='estimated_value'),
  'ALTER TABLE `farmos_animals` ADD COLUMN `estimated_value` decimal(12,2) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
