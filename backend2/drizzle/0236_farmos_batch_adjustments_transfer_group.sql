-- Ajoute transfer_group_id a farmos_batch_adjustments : lie les 2 lignes
-- (transfer_out sur le lot source, transfer_in sur le lot destination)
-- generees par un transfert atomique entre lots (POST /farmos/batch-transfers).
-- Colonne dediee plutot que du texte structure dans notes : notes reste un
-- champ libre editable par l utilisateur (non fiable pour retrouver la paire),
-- alors qu un identifiant dedie est indexable et stable dans le temps.
-- Idempotent : ADD COLUMN via INFORMATION_SCHEMA + PREPARE/EXECUTE (MySQL 8
-- ne supporte pas ADD COLUMN IF NOT EXISTS). Un seul statement par breakpoint.
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_batch_adjustments'
    AND COLUMN_NAME = 'transfer_group_id'
);
--> statement-breakpoint
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `farmos_batch_adjustments` ADD COLUMN `transfer_group_id` VARCHAR(64) NULL AFTER `reason`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_batch_adjustments'
    AND INDEX_NAME = 'idx_farmos_batch_adjustments_transfer_group'
);
--> statement-breakpoint
SET @sql2 = IF(@idx_exists = 0,
  'CREATE INDEX `idx_farmos_batch_adjustments_transfer_group` ON `farmos_batch_adjustments` (`transfer_group_id`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt2 FROM @sql2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
