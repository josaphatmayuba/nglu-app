-- Domus / maintenance : photos jointes a un ticket de maintenance (avant/apres
-- intervention, facture/recu), miroir de real_estate_property_photos mais
-- liees a ticket_id au lieu de property_id/unit_id. Envoyees en WhatsApp
-- (image + legende) a la resolution du ticket quand une photo "after" (ou a
-- defaut la plus recente) est disponible.
-- photo_type = texte libre (before/after/invoice), meme style que les autres
-- colonnes "status" du projet : pas d'ENUM MySQL pour rester extensible.
-- Suppression logique via is_active, conforme a la regle soft delete du projet.
-- ticket_id = FK logique vers real_estate_maintenance_requests, sans contrainte
-- physique (meme style que real_estate_property_photos.property_id).
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `real_estate_maintenance_photos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `ticket_id` bigint NOT NULL,
  `photo_type` varchar(20) NOT NULL DEFAULT 'before',
  `bucket` varchar(255) NOT NULL,
  `object_key` varchar(512) NOT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(100) NOT NULL,
  `size_bytes` bigint NOT NULL DEFAULT 0,
  `is_primary` tinyint NOT NULL DEFAULT 0,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_maintenance_photos_ticket` (`ticket_id`, `is_active`),
  KEY `idx_maintenance_photos_type` (`ticket_id`, `photo_type`, `is_active`),
  KEY `idx_maintenance_photos_org` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
