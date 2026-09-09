-- Preuve de paiement (photo/scan recu, capture mobile money) pour un paiement
-- de loyer. Optionnelle, stockee en URL/chemin (meme convention que
-- real_estate_maintenance_costs.receipt_url).
-- Idempotent MySQL 8: INFORMATION_SCHEMA + PREPARE, 1 statement par breakpoint.

SET @rent_payments_table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_rent_payments'
);
--> statement-breakpoint
SET @rent_payments_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_rent_payments'
    AND COLUMN_NAME = 'proof_url'
);
--> statement-breakpoint
SET @rent_payments_sql := IF(
  @rent_payments_table_exists = 1 AND @rent_payments_col_exists = 0,
  'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `proof_url` varchar(500) NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE rent_payments_stmt FROM @rent_payments_sql;
--> statement-breakpoint
EXECUTE rent_payments_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE rent_payments_stmt;
