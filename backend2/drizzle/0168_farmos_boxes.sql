-- FarmOS boxes (loges/emplacements) : box = vraie entite rattachee a un batiment,
-- avec capacite max par box. L'animal pointe vers un box (box_id), sans contrainte de lot
-- (box libre : N animaux de n'importe quel lot, ou sans lot).
-- Idempotent (INFORMATION_SCHEMA + PREPARE) car hors auto-create initial fiable sous MySQL 8.
CREATE TABLE IF NOT EXISTS `farmos_boxes` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `building_id` bigint NOT NULL,
  `name` varchar(100) NOT NULL,
  `section` varchar(30),
  `capacity` int,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
SET @fb_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_boxes'
    AND INDEX_NAME = 'idx_farmos_boxes_building'
);
--> statement-breakpoint
SET @fb_idx_sql := IF(
  @fb_idx_exists = 0,
  'CREATE INDEX `idx_farmos_boxes_building` ON `farmos_boxes` (`building_id`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE fb_idx_stmt FROM @fb_idx_sql;
--> statement-breakpoint
EXECUTE fb_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE fb_idx_stmt;
--> statement-breakpoint
SET @animal_box_id_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animals'
    AND COLUMN_NAME = 'box_id'
);
--> statement-breakpoint
SET @animal_box_id_sql := IF(
  @animal_box_id_exists = 0,
  'ALTER TABLE `farmos_animals` ADD COLUMN `box_id` bigint DEFAULT NULL AFTER `building_id`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE animal_box_id_stmt FROM @animal_box_id_sql;
--> statement-breakpoint
EXECUTE animal_box_id_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE animal_box_id_stmt;
--> statement-breakpoint
