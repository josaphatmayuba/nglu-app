-- Add created_by to real_estate_contracts to track which user generated the contract.
-- Idempotent: only adds the column if it doesn't already exist.

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_contracts'
    AND COLUMN_NAME = 'created_by'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `real_estate_contracts` ADD COLUMN `created_by` BIGINT NULL',
  'SELECT 1');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
