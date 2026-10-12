-- Domus : etats des lieux (entree / sortie) rattaches a un bail.
-- real_estate_inspections = en-tete (type entry ou exit, status draft ou signed,
-- releves compteurs et cles remises en JSON, double signature bailleur et locataire).
-- entry_inspection_id = lien logique de la sortie vers son etat des lieux entree.
-- real_estate_inspection_items = lignes piece / element / etat
-- (condition = new, good, fair, poor, damaged, na), entry_item_id = ligne entree comparee.
-- real_estate_inspection_photos = photos MinIO, meme style que real_estate_maintenance_photos.
-- FK logiques sans contrainte physique. Suppression logique via is_deleted ou is_active.
-- Idempotent via CREATE TABLE IF NOT EXISTS, un statement par breakpoint, aucun seed.
CREATE TABLE IF NOT EXISTS `real_estate_inspections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `lease_id` bigint NOT NULL,
  `property_id` bigint NOT NULL,
  `unit_id` bigint DEFAULT NULL,
  `type` varchar(10) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `inspection_date` date DEFAULT NULL,
  `general_notes` text DEFAULT NULL,
  `meters` json DEFAULT NULL,
  `keys_handed` json DEFAULT NULL,
  `entry_inspection_id` bigint DEFAULT NULL,
  `landlord_signature_data` mediumtext DEFAULT NULL,
  `landlord_signer_name` varchar(255) DEFAULT NULL,
  `landlord_signed_at` datetime DEFAULT NULL,
  `tenant_signature_data` mediumtext DEFAULT NULL,
  `tenant_signer_name` varchar(255) DEFAULT NULL,
  `tenant_signed_at` datetime DEFAULT NULL,
  `tenant_signer_ip` varchar(64) DEFAULT NULL,
  `tenant_signer_ua` varchar(512) DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `is_deleted` tinyint NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_re_inspections_org_lease_type` (`organization_id`, `lease_id`, `type`),
  KEY `idx_re_inspections_entry` (`entry_inspection_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `real_estate_inspection_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `inspection_id` bigint NOT NULL,
  `room` varchar(100) NOT NULL,
  `element` varchar(150) NOT NULL,
  `condition` varchar(20) NOT NULL DEFAULT 'good',
  `remarks` text DEFAULT NULL,
  `entry_item_id` bigint DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_deleted` tinyint NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_re_inspection_items_inspection` (`inspection_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `real_estate_inspection_photos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `inspection_id` bigint NOT NULL,
  `item_id` bigint DEFAULT NULL,
  `bucket` varchar(255) NOT NULL,
  `object_key` varchar(512) NOT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(100) NOT NULL,
  `size_bytes` bigint NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_re_inspection_photos_inspection` (`inspection_id`, `is_active`),
  KEY `idx_re_inspection_photos_item` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
