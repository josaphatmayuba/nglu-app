-- Photos des biens Domus stockees dans MinIO (ou tout stockage objet compatible
-- S3). La BD garde uniquement les metadonnees et la cle objet.

CREATE TABLE IF NOT EXISTS `real_estate_property_photos` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `property_id` bigint NOT NULL,
  `bucket` varchar(255) NOT NULL,
  `object_key` varchar(512) NOT NULL,
  `original_name` varchar(255),
  `mime_type` varchar(100) NOT NULL,
  `size_bytes` bigint NOT NULL DEFAULT 0,
  `is_primary` tinyint NOT NULL DEFAULT 0,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  INDEX `idx_real_estate_property_photos_property` (`property_id`, `is_active`, `is_primary`),
  INDEX `idx_real_estate_property_photos_org` (`organization_id`, `is_active`)
);
