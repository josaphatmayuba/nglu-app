-- Idempotent (rejouable au boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Module Bâtiments FarmOS : capacité, environnement (T°/humidité), responsable.
-- L'occupation est calculée à la volée depuis farmos_animals.barn (pas stockée).

CREATE TABLE IF NOT EXISTS `farmos_buildings` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `species` varchar(50) NULL,
  `type` varchar(50) NULL,
  `capacity` int NULL,
  `temperature` decimal(5,2) NULL,
  `humidity` decimal(5,2) NULL,
  `manager` varchar(255) NULL,
  `hygiene_status` varchar(30) NULL,
  `notes` text NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now()
);
