-- FarmOS egg sales: add building_id to production_logs for per-henhouse tracking.
-- MySQL 8 does not consistently support ADD COLUMN IF NOT EXISTS, so use the
-- same INFORMATION_SCHEMA + PREPARE pattern as the other operational repairs.
SET @prodlog_building_id_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_production_logs'
    AND COLUMN_NAME = 'building_id'
);
--> statement-breakpoint
SET @prodlog_building_id_sql := IF(
  @prodlog_building_id_exists = 0,
  'ALTER TABLE `farmos_production_logs` ADD COLUMN `building_id` bigint DEFAULT NULL AFTER `animal_id`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE prodlog_building_id_stmt FROM @prodlog_building_id_sql;
--> statement-breakpoint
EXECUTE prodlog_building_id_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE prodlog_building_id_stmt;
--> statement-breakpoint
