-- Idempotent. Ajoute project_id aux depenses FarmOS (axe analytique / bailleur).
-- Pattern PREPARE (ADD COLUMN IF NOT EXISTS non supporte partout). Pas d'apostrophe.
SET @col := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'farmos_expenses' AND column_name = 'project_id');
--> statement-breakpoint
SET @ddl := IF(@col = 0, 'ALTER TABLE `farmos_expenses` ADD COLUMN `project_id` bigint NULL AFTER `related_medicine_id`', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
