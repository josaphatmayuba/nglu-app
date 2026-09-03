-- farmos_farms : exploitation/ferme, niveau au-dessus des zones.
-- Hierarchie : farmos_farms -> farmos_zones (farm_id) -> farmos_buildings (zone_id) -> farmos_animals.
-- Types de batiments etendus (habitation, stock, sante) : species peut etre NULL pour ceux-la.
-- Idempotent (safe au re-jeu).

CREATE TABLE IF NOT EXISTS `farmos_farms` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `location` varchar(255) NULL,
  `hectares` decimal(8,2) NULL,
  `status` varchar(30) NOT NULL DEFAULT 'active',
  `description` text NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now()
);
--> statement-breakpoint
ALTER TABLE `farmos_zones`
  ADD COLUMN IF NOT EXISTS `farm_id` bigint NULL;
--> statement-breakpoint
ALTER TABLE `farmos_buildings`
  ADD COLUMN IF NOT EXISTS `building_kind` varchar(50) NULL;
