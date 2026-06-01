-- Repair dev/prod databases where farmos_production_logs existed before 0054.
-- 0054 uses CREATE TABLE IF NOT EXISTS, so a partial pre-existing table would
-- not receive the columns that createProductionLog inserts.

CREATE TABLE IF NOT EXISTS `farmos_production_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `animal_id` bigint DEFAULT NULL,
  `species` varchar(50) NOT NULL,
  `product_type` varchar(20) NOT NULL,
  `log_date` date NOT NULL,
  `period` varchar(10) DEFAULT NULL,
  `quantity` decimal(12,2) NOT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `quality` json DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_prodlog_org_date` (`organization_id`, `log_date`),
  KEY `idx_farmos_prodlog_org_species` (`organization_id`, `species`, `product_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint

SET @prodlog_quality_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_production_logs'
    AND COLUMN_NAME = 'quality'
);
--> statement-breakpoint
SET @prodlog_quality_sql := IF(
  @prodlog_quality_exists = 0,
  'ALTER TABLE `farmos_production_logs` ADD COLUMN `quality` json DEFAULT NULL AFTER `unit`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE prodlog_quality_stmt FROM @prodlog_quality_sql;
--> statement-breakpoint
EXECUTE prodlog_quality_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE prodlog_quality_stmt;
--> statement-breakpoint

SET @prodlog_notes_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_production_logs'
    AND COLUMN_NAME = 'notes'
);
--> statement-breakpoint
SET @prodlog_notes_sql := IF(
  @prodlog_notes_exists = 0,
  'ALTER TABLE `farmos_production_logs` ADD COLUMN `notes` text DEFAULT NULL AFTER `quality`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE prodlog_notes_stmt FROM @prodlog_notes_sql;
--> statement-breakpoint
EXECUTE prodlog_notes_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE prodlog_notes_stmt;
--> statement-breakpoint

SET @prodlog_is_active_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_production_logs'
    AND COLUMN_NAME = 'is_active'
);
--> statement-breakpoint
SET @prodlog_is_active_sql := IF(
  @prodlog_is_active_exists = 0,
  'ALTER TABLE `farmos_production_logs` ADD COLUMN `is_active` tinyint NOT NULL DEFAULT 1 AFTER `notes`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE prodlog_is_active_stmt FROM @prodlog_is_active_sql;
--> statement-breakpoint
EXECUTE prodlog_is_active_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE prodlog_is_active_stmt;
