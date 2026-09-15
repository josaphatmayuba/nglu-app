-- Domus : drapeaux echeancier sur real_estate_property_expenses.
-- payment_plan = mode de reglement de la depense : single, installments, partial.
-- settled_amount = cache denormalise, somme des paid_amount des installments
-- actifs rattaches a la depense.
-- Les colonnes is_recurring / recurrence_months existantes restent purement
-- descriptives et ne sont pas modifiees ici.
-- Idempotent MySQL 8: INFORMATION_SCHEMA + PREPARE, 1 statement par breakpoint.

SET @expenses_table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_property_expenses'
);
--> statement-breakpoint
SET @expenses_payment_plan_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_property_expenses'
    AND COLUMN_NAME = 'payment_plan'
);
--> statement-breakpoint
SET @expenses_payment_plan_sql := IF(
  @expenses_table_exists = 1 AND @expenses_payment_plan_exists = 0,
  'ALTER TABLE `real_estate_property_expenses` ADD COLUMN `payment_plan` varchar(20) NOT NULL DEFAULT ''single''',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE expenses_payment_plan_stmt FROM @expenses_payment_plan_sql;
--> statement-breakpoint
EXECUTE expenses_payment_plan_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE expenses_payment_plan_stmt;
--> statement-breakpoint
SET @expenses_settled_amount_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_property_expenses'
    AND COLUMN_NAME = 'settled_amount'
);
--> statement-breakpoint
SET @expenses_settled_amount_sql := IF(
  @expenses_table_exists = 1 AND @expenses_settled_amount_exists = 0,
  'ALTER TABLE `real_estate_property_expenses` ADD COLUMN `settled_amount` decimal(15,2) NOT NULL DEFAULT 0.00',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE expenses_settled_amount_stmt FROM @expenses_settled_amount_sql;
--> statement-breakpoint
EXECUTE expenses_settled_amount_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE expenses_settled_amount_stmt;
