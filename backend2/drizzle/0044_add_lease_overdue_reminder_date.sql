-- Track the rent period (next_invoice_date value) we last sent an overdue
-- reminder for, so the automatic reminder is sent once per overdue period.
-- Idempotent: some databases may already have the column.

SET @lease_reminder_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_leases'
    AND COLUMN_NAME = 'last_overdue_reminder_date'
);
--> statement-breakpoint
SET @lease_reminder_col_sql := IF(
  @lease_reminder_col_exists = 0,
  'ALTER TABLE `real_estate_leases` ADD COLUMN `last_overdue_reminder_date` date NULL AFTER `status`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE lease_reminder_stmt FROM @lease_reminder_col_sql;
--> statement-breakpoint
EXECUTE lease_reminder_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE lease_reminder_stmt;
