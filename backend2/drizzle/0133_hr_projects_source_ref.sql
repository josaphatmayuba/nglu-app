-- Permet a HR de refleter les projets du registre partage `projects`.
-- Ajoute source_system / external_ref a hr_projects + unicite par (org, source, ref)
-- pour une synchro idempotente (pattern ensureMaintenanceProjects cote compta).

SET @col_src := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_projects' AND COLUMN_NAME = 'source_system');
SET @sql_src := IF(@col_src = 0,
  'ALTER TABLE `hr_projects` ADD COLUMN `source_system` VARCHAR(40) NOT NULL DEFAULT ''hr''',
  'SELECT 1');
PREPARE st FROM @sql_src; EXECUTE st; DEALLOCATE PREPARE st;
--> statement-breakpoint

SET @col_ref := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_projects' AND COLUMN_NAME = 'external_ref');
SET @sql_ref := IF(@col_ref = 0,
  'ALTER TABLE `hr_projects` ADD COLUMN `external_ref` VARCHAR(120) NULL',
  'SELECT 1');
PREPARE st FROM @sql_ref; EXECUTE st; DEALLOCATE PREPARE st;
--> statement-breakpoint

SET @idx_hr := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_projects' AND INDEX_NAME = 'uq_hr_projects_org_source_ref');
SET @sql_idx := IF(@idx_hr = 0,
  'ALTER TABLE `hr_projects` ADD UNIQUE KEY `uq_hr_projects_org_source_ref` (`organization_id`, `source_system`, `external_ref`)',
  'SELECT 1');
PREPARE st FROM @sql_idx; EXECUTE st; DEALLOCATE PREPARE st;
