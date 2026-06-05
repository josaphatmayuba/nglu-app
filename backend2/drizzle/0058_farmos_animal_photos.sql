-- SCRUM-236 — Photos d'animaux stockées en base64 (data URL) pour simplifier
-- le dev. En prod, à migrer vers un stockage objet (S3 / Lightsail buckets).

CREATE TABLE IF NOT EXISTS `farmos_animal_photos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `animal_id` bigint NOT NULL,
  `filename` varchar(255) DEFAULT NULL,
  `content_type` varchar(100) DEFAULT NULL,
  `size_bytes` int DEFAULT NULL,
  `data_url` longtext NOT NULL,
  `uploaded_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_photos_animal` (`animal_id`, `is_active`),
  KEY `idx_farmos_photos_org` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
