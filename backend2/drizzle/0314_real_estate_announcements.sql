-- Domus : communiques SMS envoyes aux locataires.
-- audience = property (tous les locataires actifs du bien property_id) ou selection (liste libre, property_id NULL).
-- status = queued, sending ou done. Compteurs recipients, sent, failed, skipped mis a jour par l envoi.
-- FK logiques sans contrainte physique. Suppression logique via is_active.
-- Idempotent : CREATE TABLE IF NOT EXISTS et index via INFORMATION_SCHEMA puis PREPARE. Aucun seed.
CREATE TABLE IF NOT EXISTS `real_estate_announcements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `property_id` bigint DEFAULT NULL,
  `message` text NOT NULL,
  `audience` varchar(20) NOT NULL DEFAULT 'property',
  `recipients_count` int NOT NULL DEFAULT 0,
  `sent_count` int NOT NULL DEFAULT 0,
  `failed_count` int NOT NULL DEFAULT 0,
  `skipped_count` int NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'queued',
  `created_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
SET @idx_chk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_announcements' AND INDEX_NAME = 'idx_re_announcements_org_property');
--> statement-breakpoint
SET @sql := IF(@idx_chk = 0, 'CREATE INDEX `idx_re_announcements_org_property` ON `real_estate_announcements` (`organization_id`, `property_id`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
