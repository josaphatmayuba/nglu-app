-- Generalise farmos_animal_status_history pour tracer TOUT changement de
-- champ important sur un animal (nom, race, lot, batiment, valeur estimee,
-- poids saisi manuellement, etc.), pas seulement le statut sante.
-- field_name NULL = comportement historique (changement de statut, previous/new_status
-- portent le statut). field_name renseigne = changement de champ generique,
-- previous_status/new_status reutilisees comme previous/new value texte libre
-- (elargies en VARCHAR(255) pour porter des valeurs quelconques, pas seulement
-- un code de statut court).
-- Idempotent : ADD COLUMN / MODIFY COLUMN / index via INFORMATION_SCHEMA +
-- PREPARE/EXECUTE (MySQL 8 ne supporte pas ADD COLUMN IF NOT EXISTS). Un seul
-- statement par breakpoint.
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animal_status_history'
    AND COLUMN_NAME = 'field_name'
);
--> statement-breakpoint
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `farmos_animal_status_history` ADD COLUMN `field_name` VARCHAR(40) NULL AFTER `animal_id`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @prev_status_len = (
  SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animal_status_history'
    AND COLUMN_NAME = 'previous_status'
);
--> statement-breakpoint
SET @sql2 = IF(@prev_status_len < 255,
  'ALTER TABLE `farmos_animal_status_history` MODIFY COLUMN `previous_status` VARCHAR(255) NULL, MODIFY COLUMN `new_status` VARCHAR(255) NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt2 FROM @sql2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
--> statement-breakpoint
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animal_status_history'
    AND INDEX_NAME = 'idx_farmos_animal_field_history_field'
);
--> statement-breakpoint
SET @sql3 = IF(@idx_exists = 0,
  'CREATE INDEX `idx_farmos_animal_field_history_field` ON `farmos_animal_status_history` (`animal_id`, `field_name`, `created_at`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt3 FROM @sql3;
--> statement-breakpoint
EXECUTE stmt3;
--> statement-breakpoint
DEALLOCATE PREPARE stmt3;
