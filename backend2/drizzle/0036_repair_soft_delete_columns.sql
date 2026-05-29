-- Repair production databases that missed the unjournaled 0033 soft-delete migration.
-- Keep this idempotent so deploys are safe across dev/prod and fresh databases.

SET @contract_templates_is_deleted_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_contract_templates'
    AND COLUMN_NAME = 'is_deleted'
);
--> statement-breakpoint
SET @contract_templates_is_deleted_sql := IF(
  @contract_templates_is_deleted_exists = 0,
  'ALTER TABLE `real_estate_contract_templates` ADD COLUMN `is_deleted` tinyint(1) NOT NULL DEFAULT 0',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE contract_templates_is_deleted_stmt FROM @contract_templates_is_deleted_sql;
--> statement-breakpoint
EXECUTE contract_templates_is_deleted_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE contract_templates_is_deleted_stmt;
--> statement-breakpoint
SET @maintenance_costs_is_active_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_maintenance_costs'
    AND COLUMN_NAME = 'is_active'
);
--> statement-breakpoint
SET @maintenance_costs_is_active_sql := IF(
  @maintenance_costs_is_active_exists = 0,
  'ALTER TABLE `real_estate_maintenance_costs` ADD COLUMN `is_active` tinyint(1) NOT NULL DEFAULT 1',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE maintenance_costs_is_active_stmt FROM @maintenance_costs_is_active_sql;
--> statement-breakpoint
EXECUTE maintenance_costs_is_active_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE maintenance_costs_is_active_stmt;
