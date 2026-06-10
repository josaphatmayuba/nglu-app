-- Idempotent (rejouable au boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Bibliothèque maladies : causes possibles + examens recommandés (prompt design).

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_diseases' AND COLUMN_NAME='possible_causes'),
  'ALTER TABLE `farmos_diseases` ADD COLUMN `possible_causes` text NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_diseases' AND COLUMN_NAME='recommended_exams'),
  'ALTER TABLE `farmos_diseases` ADD COLUMN `recommended_exams` text NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
