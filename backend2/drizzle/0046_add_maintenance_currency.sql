-- Store the currency of a maintenance ticket's estimated cost.
-- Idempotent: some databases may already have the column.

SET @maint_cur_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_maintenance_requests'
    AND COLUMN_NAME = 'currency_id'
);
--> statement-breakpoint
SET @maint_cur_sql := IF(
  @maint_cur_exists = 0,
  'ALTER TABLE `real_estate_maintenance_requests` ADD COLUMN `currency_id` bigint NULL AFTER `estimated_cost`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE maint_cur_stmt FROM @maint_cur_sql;
--> statement-breakpoint
EXECUTE maint_cur_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE maint_cur_stmt;
