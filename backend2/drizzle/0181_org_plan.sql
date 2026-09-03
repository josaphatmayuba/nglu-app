-- Organizations billing plan column.
-- Idempotent for MySQL 8: native IF NOT EXISTS on ALTER TABLE is not portable.

SET @org_plan_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'organizations'
    AND COLUMN_NAME = 'plan'
);
--> statement-breakpoint
SET @org_plan_sql := IF(
  @org_plan_exists = 0,
  'ALTER TABLE `organizations` ADD COLUMN `plan` varchar(30) NOT NULL DEFAULT ''free''',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE org_plan_stmt FROM @org_plan_sql;
--> statement-breakpoint
EXECUTE org_plan_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE org_plan_stmt;
