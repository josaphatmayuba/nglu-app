-- Idempotent. Module Documents ERP/SIFA : hub central de pieces justificatives.
-- Un document (fichier + hash) rattachable a N entites metier (document_links).
-- Commentaires sans apostrophe (piege splitSqlStatements).
CREATE TABLE IF NOT EXISTS `documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `type` varchar(64) NULL,
  `name` varchar(255) NOT NULL,
  `file_url` varchar(512) NULL,
  `mime_type` varchar(128) NULL,
  `content_hash` varchar(128) NULL,
  `size_bytes` bigint NULL,
  `uploaded_by` bigint NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_doc_org` (`organization_id`),
  KEY `idx_doc_hash` (`content_hash`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `document_links` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `document_id` bigint unsigned NOT NULL,
  `entity_type` varchar(64) NOT NULL,
  `entity_id` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_doclink` (`document_id`, `entity_type`, `entity_id`),
  KEY `idx_doclink_entity` (`entity_type`, `entity_id`),
  KEY `idx_doclink_org` (`organization_id`)
);
