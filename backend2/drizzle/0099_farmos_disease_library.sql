-- Idempotent (rejouable au boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Bibliothèque maladies enrichie : urgence, symptômes, prévention, vaccin,
-- risque de mortalité, protocole recommandé (prompt design ferme/vét).

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_diseases' AND COLUMN_NAME='urgency_level'),
  'ALTER TABLE `farmos_diseases` ADD COLUMN `urgency_level` varchar(20) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_diseases' AND COLUMN_NAME='symptoms'),
  'ALTER TABLE `farmos_diseases` ADD COLUMN `symptoms` text NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_diseases' AND COLUMN_NAME='prevention'),
  'ALTER TABLE `farmos_diseases` ADD COLUMN `prevention` text NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_diseases' AND COLUMN_NAME='vaccine_available'),
  'ALTER TABLE `farmos_diseases` ADD COLUMN `vaccine_available` tinyint NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_diseases' AND COLUMN_NAME='mortality_risk'),
  'ALTER TABLE `farmos_diseases` ADD COLUMN `mortality_risk` varchar(20) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_diseases' AND COLUMN_NAME='recommended_protocol'),
  'ALTER TABLE `farmos_diseases` ADD COLUMN `recommended_protocol` text NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
