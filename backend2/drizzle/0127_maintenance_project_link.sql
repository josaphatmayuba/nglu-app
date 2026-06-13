-- Relie la maintenance immobiliere a un projet (chantier de travaux = projet analytique).
-- project_id sur le ticket et sur la depense, pour ventiler les couts au grand livre.
-- Idempotent (PREPARE conditionnel). Sans apostrophe dans les commentaires.

SET @c1 := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_maintenance_requests' AND COLUMN_NAME = 'project_id');
SET @s1 := IF(@c1 = 0,
  'ALTER TABLE `real_estate_maintenance_requests` ADD COLUMN `project_id` BIGINT NULL',
  'SELECT 1');
PREPARE st FROM @s1; EXECUTE st; DEALLOCATE PREPARE st;
--> statement-breakpoint

SET @c2 := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_maintenance_costs' AND COLUMN_NAME = 'project_id');
SET @s2 := IF(@c2 = 0,
  'ALTER TABLE `real_estate_maintenance_costs` ADD COLUMN `project_id` BIGINT NULL',
  'SELECT 1');
PREPARE st FROM @s2; EXECUTE st; DEALLOCATE PREPARE st;
