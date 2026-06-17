-- FarmOS production animal inventory.
-- Source: farmos_inventaire_animaux.csv (126 inventory rows, 1937 heads via count).
-- Maps CSV code -> farmos_animals.external_id.
-- Guarded because migrations >=0070 are replayed at boot by backend2/src/database/migrate.ts.

CREATE TABLE IF NOT EXISTS `data_migration_flags` (
  `migration_key` varchar(128) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`migration_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint

INSERT INTO `farmos_farms`
  (`organization_id`, `name`, `location`, `hectares`, `status`, `description`, `is_active`)
SELECT 1, 'Ferme Kasangulu', 'Kongo Central', 12, 'active', 'Elevage porcs, vaches, chevres et poulaillers.', 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_farms`
  WHERE `organization_id` = 1 AND `name` = 'Ferme Kasangulu'
)
AND NOT EXISTS (
  SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0166_farmos_animals_inventory_prod'
);
--> statement-breakpoint

INSERT INTO `farmos_zones`
  (`organization_id`, `farm_id`, `name`, `description`, `is_active`)
SELECT 1,
  (SELECT f.`id` FROM `farmos_farms` f WHERE f.`organization_id` = 1 AND f.`name` = 'Ferme Kasangulu' ORDER BY f.`id` LIMIT 1),
  'Zone Kiselele',
  'Site principal - bovins et porcs',
  1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_zones`
  WHERE `organization_id` = 1 AND `name` = 'Zone Kiselele'
)
AND NOT EXISTS (
  SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0166_farmos_animals_inventory_prod'
);
--> statement-breakpoint

INSERT INTO `farmos_zones`
  (`organization_id`, `farm_id`, `name`, `description`, `is_active`)
SELECT 1,
  (SELECT f.`id` FROM `farmos_farms` f WHERE f.`organization_id` = 1 AND f.`name` = 'Ferme Kasangulu' ORDER BY f.`id` LIMIT 1),
  'Zone Kasangulu',
  'Site secondaire - caprins, porcs et poulaillers',
  1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_zones`
  WHERE `organization_id` = 1 AND `name` = 'Zone Kasangulu'
)
AND NOT EXISTS (
  SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0166_farmos_animals_inventory_prod'
);
--> statement-breakpoint

UPDATE `farmos_zones` z
SET z.`farm_id` = COALESCE(
  z.`farm_id`,
  (SELECT f.`id` FROM `farmos_farms` f WHERE f.`organization_id` = 1 AND f.`name` = 'Ferme Kasangulu' ORDER BY f.`id` LIMIT 1)
),
  z.`is_active` = 1
WHERE z.`organization_id` = 1
  AND z.`name` IN ('Zone Kiselele', 'Zone Kasangulu')
  AND NOT EXISTS (
    SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0166_farmos_animals_inventory_prod'
  );
--> statement-breakpoint

INSERT INTO `farmos_buildings`
  (`organization_id`, `zone_id`, `name`, `species`, `type`, `capacity`, `notes`, `is_active`)
SELECT 1,
  (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = 'Zone Kiselele' ORDER BY z.`id` LIMIT 1),
  'Batiment Bovins Kiselele',
  'cow',
  'enclos',
  30,
  'Bovins - Zone Kiselele',
  1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_buildings`
  WHERE `organization_id` = 1 AND `name` = 'Batiment Bovins Kiselele'
)
AND NOT EXISTS (
  SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0166_farmos_animals_inventory_prod'
);
--> statement-breakpoint

INSERT INTO `farmos_buildings`
  (`organization_id`, `zone_id`, `name`, `species`, `type`, `capacity`, `notes`, `is_active`)
SELECT 1,
  (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = 'Zone Kiselele' ORDER BY z.`id` LIMIT 1),
  'Batiment Porcs Kiselele',
  'pig',
  'porcherie',
  80,
  'Porcs - Zone Kiselele',
  1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_buildings`
  WHERE `organization_id` = 1 AND `name` = 'Batiment Porcs Kiselele'
)
AND NOT EXISTS (
  SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0166_farmos_animals_inventory_prod'
);
--> statement-breakpoint

INSERT INTO `farmos_buildings`
  (`organization_id`, `zone_id`, `name`, `species`, `type`, `capacity`, `notes`, `is_active`)
SELECT 1,
  (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = 'Zone Kasangulu' ORDER BY z.`id` LIMIT 1),
  'Batiment Caprins Kasangulu',
  'goat',
  'enclos',
  50,
  'Caprins - Zone Kasangulu',
  1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_buildings`
  WHERE `organization_id` = 1 AND `name` = 'Batiment Caprins Kasangulu'
)
AND NOT EXISTS (
  SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0166_farmos_animals_inventory_prod'
);
--> statement-breakpoint

INSERT INTO `farmos_buildings`
  (`organization_id`, `zone_id`, `name`, `species`, `type`, `capacity`, `notes`, `is_active`)
SELECT 1,
  (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = 'Zone Kasangulu' ORDER BY z.`id` LIMIT 1),
  'Batiment Porcs Kasangulu',
  'pig',
  'porcherie',
  80,
  'Porcs - Zone Kasangulu',
  1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_buildings`
  WHERE `organization_id` = 1 AND `name` = 'Batiment Porcs Kasangulu'
)
AND NOT EXISTS (
  SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0166_farmos_animals_inventory_prod'
);
--> statement-breakpoint

INSERT INTO `farmos_buildings`
  (`organization_id`, `zone_id`, `name`, `species`, `type`, `capacity`, `notes`, `is_active`)
SELECT 1,
  (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = 'Zone Kasangulu' ORDER BY z.`id` LIMIT 1),
  'Poulailler 1',
  'chicken',
  'poulailler',
  1700,
  'Poulailler principal - Zone Kasangulu',
  1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_buildings`
  WHERE `organization_id` = 1 AND `name` = 'Poulailler 1'
)
AND NOT EXISTS (
  SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0166_farmos_animals_inventory_prod'
);
--> statement-breakpoint

INSERT INTO `farmos_buildings`
  (`organization_id`, `zone_id`, `name`, `species`, `type`, `capacity`, `notes`, `is_active`)
SELECT 1,
  (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = 'Zone Kasangulu' ORDER BY z.`id` LIMIT 1),
  'Poulailler 2',
  'chicken',
  'poulailler',
  20,
  'Poulailler secondaire - Zone Kasangulu',
  1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_buildings`
  WHERE `organization_id` = 1 AND `name` = 'Poulailler 2'
)
AND NOT EXISTS (
  SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0166_farmos_animals_inventory_prod'
);
--> statement-breakpoint

UPDATE `farmos_buildings` b
SET b.`zone_id` = CASE b.`name`
    WHEN 'Batiment Bovins Kiselele' THEN (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = 'Zone Kiselele' ORDER BY z.`id` LIMIT 1)
    WHEN 'Batiment Porcs Kiselele' THEN (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = 'Zone Kiselele' ORDER BY z.`id` LIMIT 1)
    WHEN 'Batiment Caprins Kasangulu' THEN (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = 'Zone Kasangulu' ORDER BY z.`id` LIMIT 1)
    WHEN 'Batiment Porcs Kasangulu' THEN (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = 'Zone Kasangulu' ORDER BY z.`id` LIMIT 1)
    WHEN 'Poulailler 1' THEN (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = 'Zone Kasangulu' ORDER BY z.`id` LIMIT 1)
    WHEN 'Poulailler 2' THEN (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = 'Zone Kasangulu' ORDER BY z.`id` LIMIT 1)
    ELSE b.`zone_id`
  END,
  b.`is_active` = 1
WHERE b.`organization_id` = 1
  AND b.`name` IN (
    'Batiment Bovins Kiselele',
    'Batiment Porcs Kiselele',
    'Batiment Caprins Kasangulu',
    'Batiment Porcs Kasangulu',
    'Poulailler 1',
    'Poulailler 2'
  )
  AND NOT EXISTS (
    SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0166_farmos_animals_inventory_prod'
  );
--> statement-breakpoint

INSERT INTO `farmos_animals` (
  `organization_id`, `external_id`, `name`, `species`, `race`, `sex`, `date_of_birth`,
  `weight`, `weight_unit`, `count`, `lot`, `barn`, `room`, `building_id`, `zone_id`,
  `type`, `status`, `withdrawal_until`, `withdrawal_kind`, `mother_id`, `father_id`,
  `estimated_value`, `last_event`, `is_active`
)
SELECT
  1 AS `organization_id`,
  src.`external_id`,
  src.`name`,
  src.`species`,
  src.`race`,
  src.`sex`,
  src.`date_of_birth`,
  src.`weight`,
  COALESCE(src.`weight_unit`, 'kg') AS `weight_unit`,
  src.`count`,
  src.`lot`,
  src.`barn`,
  src.`room`,
  (SELECT b.`id` FROM `farmos_buildings` b WHERE b.`organization_id` = 1 AND b.`name` = src.`barn` AND b.`is_active` = 1 ORDER BY b.`id` LIMIT 1) AS `building_id`,
  (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = src.`room` AND z.`is_active` = 1 ORDER BY z.`id` LIMIT 1) AS `zone_id`,
  src.`type`,
  src.`status`,
  src.`withdrawal_until`,
  src.`withdrawal_kind`,
  src.`mother_id`,
  src.`father_id`,
  src.`estimated_value`,
  src.`last_event`,
  1 AS `is_active`
FROM (
  SELECT 'ZA-VACHE-MA-01' AS `external_id`, 'Ferdinand' AS `name`, 'cow' AS `species`, NULL AS `race`, 'M' AS `sex`, '2025-12-16' AS `date_of_birth`, NULL AS `weight`, 'kg' AS `weight_unit`, 1 AS `count`, 'Cheptel Zone A' AS `lot`, 'Batiment Bovins Kiselele' AS `barn`, 'Zone Kiselele' AS `room`, 'adulte' AS `type`, 'healthy' AS `status`, 'Etat de sante bon' AS `last_event`, 600 AS `estimated_value`, NULL AS `withdrawal_until`, NULL AS `withdrawal_kind`, NULL AS `mother_id`, NULL AS `father_id`
  UNION ALL SELECT 'ZA-VACHE-MA-02', 'Taurus', 'cow', NULL, 'M', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-MA-03', 'Romeo', 'cow', NULL, 'M', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-MA-04', 'Bouvier', 'cow', NULL, 'M', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-01', 'Bella', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-02', 'Daisy', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-03', 'Marguerite', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-04', 'Etoile', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-05', 'Princesse', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-06', 'Fleur', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-07', 'Caramel', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-08', 'Noiraude', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-09', 'Blanchette', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-10', 'Lola', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-11', 'Mimosa', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-12', 'Pivoine', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-13', 'Reinette', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-14', 'Sultane', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-15', 'Venus', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-16', 'Aurore', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-17', 'Gazelle', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-FA-18', 'Joconde', 'cow', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'adulte', 'healthy', 'Etat de sante bon', 600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VACHE-JM-01', 'Veau Eclair', 'cow', NULL, 'M', '2026-06-02', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Bovins Kiselele', 'Zone Kiselele', 'jeune', 'healthy', 'Etat de sante bon', 200, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-AD-01', 'Rosie', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-AD-02', 'Pinky', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-AD-03', 'Babette', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-AD-04', 'Truffe', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-AD-05', 'Saucisse', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-AD-06', 'Coquine', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-AD-07', 'Praline', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-AD-08', 'Boudine', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-AD-09', 'Rilette', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-AD-10', 'Margot', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-AD-11', 'Choupette', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-AD-12', 'Berthe', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-AD-13', 'Gertrude', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-01', 'Henriette', 'pig', NULL, 'F', '2026-06-04', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-02', 'Josette', 'pig', NULL, 'F', '2026-06-06', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-03', 'Lucette', 'pig', NULL, 'F', '2026-06-08', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-04', 'Ninon', 'pig', NULL, 'F', '2026-06-10', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-05', 'Odette', 'pig', NULL, 'F', '2026-06-12', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-06', 'Paulette', 'pig', NULL, 'F', '2026-06-14', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-07', 'Quiche', 'pig', NULL, 'F', '2026-06-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-08', 'Roberte', 'pig', NULL, 'F', '2026-06-02', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-09', 'Suzon', 'pig', NULL, 'F', '2026-06-04', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-10', 'Toinette', 'pig', NULL, 'F', '2026-06-06', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-11', 'Ursule', 'pig', NULL, 'F', '2026-06-08', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-12', 'Violette', 'pig', NULL, 'F', '2026-06-10', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-13', 'Wanda', 'pig', NULL, 'F', '2026-06-12', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-14', 'Yvette', 'pig', NULL, 'F', '2026-06-14', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-15', 'Zoe', 'pig', NULL, 'F', '2026-06-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-16', 'Adele', 'pig', NULL, 'F', '2026-06-02', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-17', 'Brigitte', 'pig', NULL, 'F', '2026-06-04', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-18', 'Colette', 'pig', NULL, 'F', '2026-06-06', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-19', 'Denise', 'pig', NULL, 'F', '2026-06-08', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-20', 'Eugenie', 'pig', NULL, 'F', '2026-06-10', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-21', 'Fanny', 'pig', NULL, 'F', '2026-06-12', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-22', 'Ginette', 'pig', NULL, 'F', '2026-06-14', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-23', 'Huguette', 'pig', NULL, 'F', '2026-06-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-24', 'Irene', 'pig', NULL, 'F', '2026-06-02', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-25', 'Jeanne', 'pig', NULL, 'F', '2026-06-04', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-26', 'Karine', 'pig', NULL, 'F', '2026-06-06', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-27', 'Louise', 'pig', NULL, 'F', '2026-06-08', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-28', 'Manon', 'pig', NULL, 'F', '2026-06-10', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-29', 'Nadine', 'pig', NULL, 'F', '2026-06-12', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-30', 'Ophelie', 'pig', NULL, 'F', '2026-06-14', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-31', 'Pierrette', 'pig', NULL, 'F', '2026-06-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-JE-32', 'Rachel', 'pig', NULL, 'F', '2026-06-02', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Cochette', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-MO-01', 'Sylvie', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-MO-02', 'Therese', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-MO-03', 'Valerie', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-MO-04', 'Yolande', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-MO-05', 'Anais', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-MO-06', 'Beatrice', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-TRUIE-MO-07', 'Celine', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Truie', 'healthy', 'Truie', 250, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VERRAT-01', 'Hercule', 'pig', NULL, 'M', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Verrat', 'healthy', 'Verrat reproducteur', 300, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VERRAT-02', 'Atlas', 'pig', NULL, 'M', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Verrat', 'healthy', 'Verrat reproducteur', 300, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VERRAT-03', 'Goliath', 'pig', NULL, 'M', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Verrat', 'healthy', 'Verrat reproducteur', 300, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-VERRAT-04', 'Tonnerre', 'pig', NULL, 'M', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Verrat', 'healthy', 'Verrat reproducteur', 300, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-PORC-LOT-MOY-M', 'Lot porcs males moyens ZA', 'pig', NULL, 'M', '2026-03-16', NULL, 'kg', 8, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Engraissement', 'healthy', 'Porcs males moyens (lot)', 1200, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZA-PORC-LOT-JE-M', 'Lot porcs males jeunes ZA', 'pig', NULL, 'M', '2026-06-04', NULL, 'kg', 15, 'Cheptel Zone A', 'Batiment Porcs Kiselele', 'Zone Kiselele', 'Porcelet', 'healthy', 'Porcs males jeunes (lot)', 900, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-AD-01', 'Diane', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-AD-02', 'Estelle', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-AD-03', 'Fabienne', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-AD-04', 'Gisele', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-AD-05', 'Helene', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-AD-06', 'Inge', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-AD-07', 'Jade', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-AD-08', 'Katia', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-AD-09', 'Lea', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-AD-10', 'Maud', 'pig', NULL, 'F', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-01', 'Nora', 'pig', NULL, 'F', '2026-06-06', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-02', 'Oceane', 'pig', NULL, 'F', '2026-06-08', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-03', 'Paule', 'pig', NULL, 'F', '2026-06-10', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-04', 'Rosine', 'pig', NULL, 'F', '2026-06-12', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-05', 'Sara', 'pig', NULL, 'F', '2026-06-14', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-06', 'Tess', 'pig', NULL, 'F', '2026-06-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-07', 'Ulla', 'pig', NULL, 'F', '2026-06-02', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-08', 'Vera', 'pig', NULL, 'F', '2026-06-04', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-09', 'Wilma', 'pig', NULL, 'F', '2026-06-06', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-10', 'Xena', 'pig', NULL, 'F', '2026-06-08', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-11', 'Ysoline', 'pig', NULL, 'F', '2026-06-10', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-12', 'Zita', 'pig', NULL, 'F', '2026-06-12', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-13', 'Amelie', 'pig', NULL, 'F', '2026-06-14', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-14', 'Blanche', 'pig', NULL, 'F', '2026-06-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-JE-15', 'Cerise', 'pig', NULL, 'F', '2026-06-02', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Cochette', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-MO-01', 'Dora', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-MO-02', 'Eliane', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-MO-03', 'Fauvette', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-MO-04', 'Gaby', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-MO-05', 'Hilda', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-MO-06', 'Iris', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-MO-07', 'Juliette', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-MO-08', 'Kenza', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-MO-09', 'Lila', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-MO-10', 'Mona', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-TRUIE-MO-11', 'Nelly', 'pig', NULL, 'F', '2026-03-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Truie', 'sick', 'Truie - infection (plaies)', 250, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-VERRAT-01', 'Caesar', 'pig', NULL, 'M', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Verrat', 'sick', 'Verrat reproducteur', 300, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-VERRAT-02', 'Brutus', 'pig', NULL, 'M', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Verrat', 'sick', 'Verrat reproducteur', 300, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-VERRAT-03', 'Zeus', 'pig', NULL, 'M', '2025-12-16', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Verrat', 'sick', 'Verrat reproducteur', 300, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-PORC-LOT-MOY-M', 'Lot porcs males moyens ZB', 'pig', NULL, 'M', '2026-03-16', NULL, 'kg', 20, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Engraissement', 'sick', 'Porcs males moyens (lot)', 3000, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-PORC-LOT-JE-M', 'Lot porcs males jeunes ZB', 'pig', NULL, 'M', '2026-06-04', NULL, 'kg', 11, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Porcelet', 'sick', 'Porcs males jeunes (lot)', 660, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'ZB-CHEVRE-TOTAL', 'Lot caprins ZB', 'goat', NULL, NULL, NULL, NULL, 'kg', 45, 'Cheptel Zone B', 'Batiment Caprins Kasangulu', 'Zone Kasangulu', 'total', 'sick', 'Etat de sante pas tres bon', 3600, '2026-07-07', 'sale', NULL, NULL
  UNION ALL SELECT 'POULE-BAT1', 'Lot pondeuses Bat 1', 'chicken', NULL, 'F', NULL, NULL, 'kg', 1700, 'Poulailler 1', 'Poulailler 1', 'Zone Kasangulu', 'pondeuse', 'healthy', '1700 poules - batiment 1', 13600, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'POULE-BAT2-M', 'Lot coqs Bat 2', 'chicken', NULL, 'M', NULL, NULL, 'kg', 7, 'Poulailler 2', 'Poulailler 2', 'Zone Kasangulu', 'pondeuse', 'healthy', 'Batiment 2: 7 males', 56, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'POULE-BAT2-F', 'Lot poules Bat 2', 'chicken', NULL, 'F', NULL, NULL, 'kg', 13, 'Poulailler 2', 'Poulailler 2', 'Zone Kasangulu', 'pondeuse', 'healthy', 'Batiment 2: 13 femelles', 104, NULL, NULL, NULL, NULL
) AS src
WHERE NOT EXISTS (
  SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0166_farmos_animals_inventory_prod'
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `species` = VALUES(`species`),
  `race` = VALUES(`race`),
  `sex` = VALUES(`sex`),
  `date_of_birth` = VALUES(`date_of_birth`),
  `weight` = VALUES(`weight`),
  `weight_unit` = VALUES(`weight_unit`),
  `count` = VALUES(`count`),
  `lot` = VALUES(`lot`),
  `barn` = VALUES(`barn`),
  `room` = VALUES(`room`),
  `building_id` = VALUES(`building_id`),
  `zone_id` = VALUES(`zone_id`),
  `type` = VALUES(`type`),
  `status` = VALUES(`status`),
  `withdrawal_until` = VALUES(`withdrawal_until`),
  `withdrawal_kind` = VALUES(`withdrawal_kind`),
  `mother_id` = VALUES(`mother_id`),
  `father_id` = VALUES(`father_id`),
  `estimated_value` = VALUES(`estimated_value`),
  `last_event` = VALUES(`last_event`),
  `is_active` = VALUES(`is_active`);
--> statement-breakpoint

INSERT IGNORE INTO `data_migration_flags` (`migration_key`) VALUES ('0166_farmos_animals_inventory_prod');
