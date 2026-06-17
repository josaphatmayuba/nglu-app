-- Éléments de décor du terrain FarmOS (champ, point d'eau, route, pâturage…).
-- Rattachés à une zone (farmos_zones.id). pos_x/pos_y/width/height = % du terrain.
-- Soft-delete via is_active. Idempotent (safe au re-jeu).

CREATE TABLE IF NOT EXISTS `farmos_land_features` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `zone_id` bigint NULL,
  `type` varchar(30) NOT NULL,
  `label` varchar(255) NULL,
  `pos_x` decimal(6,2) NOT NULL DEFAULT 0,
  `pos_y` decimal(6,2) NOT NULL DEFAULT 0,
  `width` decimal(6,2) NULL,
  `height` decimal(6,2) NULL,
  `meta` json NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now()
);
