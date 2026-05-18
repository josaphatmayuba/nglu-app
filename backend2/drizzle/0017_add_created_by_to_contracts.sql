-- 0017_add_created_by_to_contracts.sql
-- Track which user generated a contract. Idempotent.

SET @addCreatedBySql := IF(
  (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'real_estate_contracts'
      AND COLUMN_NAME = 'created_by'
  ) = 0,
  'ALTER TABLE `real_estate_contracts` ADD COLUMN `created_by` BIGINT NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE addCreatedByStmt FROM @addCreatedBySql;
--> statement-breakpoint
EXECUTE addCreatedByStmt;
--> statement-breakpoint
DEALLOCATE PREPARE addCreatedByStmt;
