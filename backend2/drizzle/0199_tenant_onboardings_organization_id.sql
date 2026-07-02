-- Isolation multi-tenant : ajoute organization_id a tenant_onboardings.
-- MySQL 8 ne supporte pas ADD COLUMN IF NOT EXISTS : on teste via
-- INFORMATION_SCHEMA puis PREPARE/EXECUTE (idempotent).
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tenant_onboardings'
    AND COLUMN_NAME = 'organization_id'
);
--> statement-breakpoint
SET @ddl = IF(
  @col_exists = 0,
  'ALTER TABLE `tenant_onboardings` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
