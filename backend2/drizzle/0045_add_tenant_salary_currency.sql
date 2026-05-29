-- Store the currency of a tenant's declared monthly salary.
-- Idempotent: some databases may already have the column.

SET @tenant_salary_cur_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tenant_details'
    AND COLUMN_NAME = 'salary_currency_id'
);
--> statement-breakpoint
SET @tenant_salary_cur_sql := IF(
  @tenant_salary_cur_exists = 0,
  'ALTER TABLE `tenant_details` ADD COLUMN `salary_currency_id` bigint NULL AFTER `monthly_pay`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE tenant_salary_cur_stmt FROM @tenant_salary_cur_sql;
--> statement-breakpoint
EXECUTE tenant_salary_cur_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE tenant_salary_cur_stmt;
