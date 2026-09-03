-- BatiPro : photos et rapports de chantier.
-- kind=site pour les photos terrain, kind=source_document pour un scan OCR
-- rattache plus tard a un document (devis/BC) via linked_document_id.
-- Fichiers stockes sur MinIO (file_key / thumbnail_key). Pas de contrainte FK
-- stricte (meme pattern que les autres tables batipro), seulement des index.
CREATE TABLE IF NOT EXISTS `batipro_site_photos` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `project_id` BIGINT NOT NULL,
  `task_id` BIGINT,
  `file_key` VARCHAR(512) NOT NULL,
  `file_format` VARCHAR(10),
  `file_size` BIGINT,
  `thumbnail_key` VARCHAR(512),
  `caption` VARCHAR(255),
  `taken_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `uploaded_by` BIGINT,
  `kind` VARCHAR(20) NOT NULL DEFAULT 'site',
  `linked_document_id` BIGINT,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_site_photos_org_project` (`organization_id`, `project_id`),
  KEY `idx_batipro_site_photos_org_task` (`organization_id`, `task_id`),
  KEY `idx_batipro_site_photos_org_kind` (`organization_id`, `kind`),
  KEY `idx_batipro_site_photos_org_active` (`organization_id`, `is_active`)
);
