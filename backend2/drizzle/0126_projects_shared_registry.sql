-- Prepare la table projects comme registre partage (principe SIFA : source autoritaire externe).
-- La future app de gestion de projet alimentera ces colonnes ; les modules referencent par project_id.
-- Idempotent (PREPARE conditionnel sur information_schema). Sans apostrophe dans les commentaires.

SET @col_src := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'source_system');
SET @sql_src := IF(@col_src = 0,
  'ALTER TABLE `projects` ADD COLUMN `source_system` VARCHAR(40) NOT NULL DEFAULT ''comptabilite''',
  'SELECT 1');
PREPARE st FROM @sql_src; EXECUTE st; DEALLOCATE PREPARE st;
--> statement-breakpoint

SET @col_ext := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'external_ref');
SET @sql_ext := IF(@col_ext = 0,
  'ALTER TABLE `projects` ADD COLUMN `external_ref` VARCHAR(120) NULL',
  'SELECT 1');
PREPARE st FROM @sql_ext; EXECUTE st; DEALLOCATE PREPARE st;
--> statement-breakpoint

-- Index unique sur (source_system, external_ref) pour eviter les doublons de projets importes.
SET @idx_ext := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND INDEX_NAME = 'uq_projects_source_ref');
SET @sql_idx := IF(@idx_ext = 0,
  'ALTER TABLE `projects` ADD UNIQUE KEY `uq_projects_source_ref` (`source_system`, `external_ref`)',
  'SELECT 1');
PREPARE st FROM @sql_idx; EXECUTE st; DEALLOCATE PREPARE st;
