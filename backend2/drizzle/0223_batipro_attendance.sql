-- BatiPro : pointage/presence journalier des ouvriers sur un chantier.
-- project_id reference batipro_projects, worker_id reference batipro_workers.
-- crew_id est denormalise (batipro_crews) pour filtrer par equipe sans jointure.
-- status : present / absent / partiel / conge.
-- Pas de contrainte FK stricte (meme pattern que les autres tables batipro), seulement des index.
CREATE TABLE IF NOT EXISTS `batipro_attendance` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `project_id` BIGINT NOT NULL,
  `worker_id` BIGINT NOT NULL,
  `crew_id` BIGINT,
  `attendance_date` DATE NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'present',
  `hours` DECIMAL(5,2),
  `notes` VARCHAR(255),
  `recorded_by` BIGINT,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_attendance_org_project` (`organization_id`, `project_id`),
  KEY `idx_batipro_attendance_org_worker` (`organization_id`, `worker_id`),
  KEY `idx_batipro_attendance_org_date` (`organization_id`, `attendance_date`),
  KEY `idx_batipro_attendance_org_active` (`organization_id`, `is_active`)
);
