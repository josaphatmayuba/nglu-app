-- farmos_zones : lieu géographique (Zone Kiselele, Zone Kasangulu…)
-- farmos_buildings.zone_id → farmos_zones.id
-- farmos_animals.building_id → farmos_buildings.id  +  zone_id (dénormalisé lecture rapide)
-- Idempotent (safe au re-jeu).

CREATE TABLE IF NOT EXISTS `farmos_zones` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `description` text NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now()
);
--> statement-breakpoint
ALTER TABLE `farmos_buildings`
  ADD COLUMN IF NOT EXISTS `zone_id` bigint NULL;
--> statement-breakpoint
ALTER TABLE `farmos_animals`
  ADD COLUMN IF NOT EXISTS `building_id` bigint NULL,
  ADD COLUMN IF NOT EXISTS `zone_id` bigint NULL;
