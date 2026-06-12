-- Rend l unicite du registre projets compatible multi-organisation.
-- Chaque organisation peut avoir son propre projet maintenance MNT-<ticket_id>.

SET @idx_old := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND INDEX_NAME = 'uq_projects_source_ref');
SET @sql_old := IF(@idx_old > 0,
  'ALTER TABLE `projects` DROP INDEX `uq_projects_source_ref`',
  'SELECT 1');
PREPARE st FROM @sql_old; EXECUTE st; DEALLOCATE PREPARE st;
--> statement-breakpoint

SET @idx_new := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND INDEX_NAME = 'uq_projects_org_source_ref');
SET @sql_new := IF(@idx_new = 0,
  'ALTER TABLE `projects` ADD UNIQUE KEY `uq_projects_org_source_ref` (`organization_id`, `source_system`, `external_ref`)',
  'SELECT 1');
PREPARE st FROM @sql_new; EXECUTE st; DEALLOCATE PREPARE st;
