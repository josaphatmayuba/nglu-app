-- Store the assignee (user.id) of a maintenance ticket.
-- Idempotent: some databases may already have the column.

SET @maint_assignee_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_maintenance_requests'
    AND COLUMN_NAME = 'assignee_id'
);
--> statement-breakpoint
SET @maint_assignee_sql := IF(
  @maint_assignee_exists = 0,
  'ALTER TABLE `real_estate_maintenance_requests` ADD COLUMN `assignee_id` bigint NULL AFTER `currency_id`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE maint_assignee_stmt FROM @maint_assignee_sql;
--> statement-breakpoint
EXECUTE maint_assignee_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE maint_assignee_stmt;
