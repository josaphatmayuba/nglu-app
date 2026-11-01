-- Domus : imputation de la caution sur les loyers impayes a la sortie.
-- real_estate_security_deposits.rent_applied_amount = part de la caution imputee sur des loyers.
-- real_estate_rent_payments.security_deposit_id = caution source d un paiement de loyer impute.
-- Type aligne sur real_estate_security_deposits.id (bigint unsigned).
-- La table des cautions a ete creee hors journal en prod : chaque ALTER verifie la table.
-- Idempotent MySQL 8: INFORMATION_SCHEMA + PREPARE, 1 statement par breakpoint. Aucun seed.

SET @deposits_table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_security_deposits'
);
--> statement-breakpoint
SET @deposits_rent_applied_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_security_deposits'
    AND COLUMN_NAME = 'rent_applied_amount'
);
--> statement-breakpoint
SET @deposits_rent_applied_sql := IF(
  @deposits_table_exists = 1 AND @deposits_rent_applied_exists = 0,
  'ALTER TABLE `real_estate_security_deposits` ADD COLUMN `rent_applied_amount` decimal(15,2) NOT NULL DEFAULT 0',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE deposits_rent_applied_stmt FROM @deposits_rent_applied_sql;
--> statement-breakpoint
EXECUTE deposits_rent_applied_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE deposits_rent_applied_stmt;
--> statement-breakpoint
SET @rent_payments_table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_rent_payments'
);
--> statement-breakpoint
SET @rent_payments_deposit_id_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_rent_payments'
    AND COLUMN_NAME = 'security_deposit_id'
);
--> statement-breakpoint
SET @rent_payments_deposit_id_sql := IF(
  @rent_payments_table_exists = 1 AND @rent_payments_deposit_id_exists = 0,
  'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `security_deposit_id` bigint unsigned NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE rent_payments_deposit_id_stmt FROM @rent_payments_deposit_id_sql;
--> statement-breakpoint
EXECUTE rent_payments_deposit_id_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE rent_payments_deposit_id_stmt;
--> statement-breakpoint
SET @rent_payments_deposit_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_rent_payments'
    AND INDEX_NAME = 'idx_rent_payments_security_deposit'
);
--> statement-breakpoint
SET @rent_payments_deposit_col_now := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_rent_payments'
    AND COLUMN_NAME = 'security_deposit_id'
);
--> statement-breakpoint
SET @rent_payments_deposit_idx_sql := IF(
  @rent_payments_deposit_col_now = 1 AND @rent_payments_deposit_idx_exists = 0,
  'CREATE INDEX `idx_rent_payments_security_deposit` ON `real_estate_rent_payments` (`security_deposit_id`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE rent_payments_deposit_idx_stmt FROM @rent_payments_deposit_idx_sql;
--> statement-breakpoint
EXECUTE rent_payments_deposit_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE rent_payments_deposit_idx_stmt;
