SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'customer'
    AND COLUMN_NAME = 'googleId'
);
--> statement-breakpoint
SET @ddl := IF(@column_exists = 0, 'ALTER TABLE `customer` ADD COLUMN `googleId` varchar(255)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
