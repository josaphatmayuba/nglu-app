-- Flux etat de sante FarmOS : transforme une ligne de changement de statut
-- sante (field_name NULL, new_status sick/quarantine) en EPISODE de sante
-- ouvert/ferme.
-- disease_id = FK logique vers farmos_diseases (pas de contrainte physique,
-- coherent avec le reste du schema farmos).
-- resolved_at NULL = episode encore ouvert. resolved_by = utilisateur ayant
-- cloture l episode.
-- Idempotent : ADD COLUMN / CREATE INDEX via INFORMATION_SCHEMA +
-- PREPARE/EXECUTE (MySQL 8 ne supporte pas ADD COLUMN IF NOT EXISTS).
-- Un seul statement par breakpoint.
SET @col_disease = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animal_status_history'
    AND COLUMN_NAME = 'disease_id'
);
--> statement-breakpoint
SET @sql = IF(@col_disease = 0,
  'ALTER TABLE `farmos_animal_status_history` ADD COLUMN `disease_id` BIGINT NULL AFTER `cause`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_resolved_at = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animal_status_history'
    AND COLUMN_NAME = 'resolved_at'
);
--> statement-breakpoint
SET @sql2 = IF(@col_resolved_at = 0,
  'ALTER TABLE `farmos_animal_status_history` ADD COLUMN `resolved_at` TIMESTAMP NULL DEFAULT NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt2 FROM @sql2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
--> statement-breakpoint
SET @col_resolved_by = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animal_status_history'
    AND COLUMN_NAME = 'resolved_by'
);
--> statement-breakpoint
SET @sql3 = IF(@col_resolved_by = 0,
  'ALTER TABLE `farmos_animal_status_history` ADD COLUMN `resolved_by` BIGINT NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt3 FROM @sql3;
--> statement-breakpoint
EXECUTE stmt3;
--> statement-breakpoint
DEALLOCATE PREPARE stmt3;
--> statement-breakpoint
SET @idx_open_episode = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animal_status_history'
    AND INDEX_NAME = 'idx_farmos_ash_open_episode'
);
--> statement-breakpoint
SET @sql4 = IF(@idx_open_episode = 0,
  'CREATE INDEX `idx_farmos_ash_open_episode` ON `farmos_animal_status_history` (`animal_id`, `new_status`, `resolved_at`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt4 FROM @sql4;
--> statement-breakpoint
EXECUTE stmt4;
--> statement-breakpoint
DEALLOCATE PREPARE stmt4;
--> statement-breakpoint
UPDATE `farmos_animal_status_history` h
JOIN (
  SELECT `animal_id`, MAX(`id`) AS last_id
  FROM `farmos_animal_status_history`
  WHERE `field_name` IS NULL
  GROUP BY `animal_id`
) x ON x.`animal_id` = h.`animal_id`
SET h.`resolved_at` = h.`updated_at`
WHERE h.`field_name` IS NULL
  AND h.`resolved_at` IS NULL
  AND h.`new_status` IN ('sick', 'quarantine')
  AND h.`id` < x.last_id;
