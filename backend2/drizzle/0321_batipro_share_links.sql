-- BatiPro : liens publics de suivi financier d un chantier (lecture seule, sans compte).
-- Seul le hash SHA-256 du jeton est stocke : le jeton en clair n est montre qu a la creation.
-- recipient_type vaut owner (Lot 1) ; la valeur subcontractor est reservee au Lot 2.
-- Revocation douce via revoked_at, jamais de DELETE. Forme idempotente, aucune donnee inseree.
CREATE TABLE IF NOT EXISTS `batipro_share_links` (
  `id` bigint unsigned AUTO_INCREMENT NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `project_id` bigint NOT NULL,
  `recipient_type` varchar(20) NOT NULL DEFAULT 'owner',
  `recipient_name` varchar(255),
  `recipient_phone` varchar(32),
  `token_hash` varchar(128) NOT NULL,
  `expires_at` timestamp NULL,
  `revoked_at` timestamp NULL,
  `last_viewed_at` timestamp NULL,
  `created_by` bigint,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `batipro_share_links_id` PRIMARY KEY(`id`),
  CONSTRAINT `batipro_share_links_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_share_links' AND INDEX_NAME = 'idx_batipro_share_links_project');
--> statement-breakpoint
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `idx_batipro_share_links_project` ON `batipro_share_links` (`organization_id`, `project_id`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
