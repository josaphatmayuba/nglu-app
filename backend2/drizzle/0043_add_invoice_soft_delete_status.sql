-- Add explicit soft-delete status to sale and purchase invoices.
-- Kept idempotent because some legacy/prod databases may already have the column.

SET @sale_invoice_status_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'saleInvoice'
    AND COLUMN_NAME = 'status'
);
--> statement-breakpoint
SET @sale_invoice_status_sql := IF(
  @sale_invoice_status_exists = 0,
  'ALTER TABLE `saleInvoice` ADD COLUMN `status` varchar(10) NOT NULL DEFAULT ''true'' AFTER `orderStatus`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sale_invoice_status_stmt FROM @sale_invoice_status_sql;
--> statement-breakpoint
EXECUTE sale_invoice_status_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sale_invoice_status_stmt;
--> statement-breakpoint
SET @purchase_invoice_status_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'purchaseInvoice'
    AND COLUMN_NAME = 'status'
);
--> statement-breakpoint
SET @purchase_invoice_status_sql := IF(
  @purchase_invoice_status_exists = 0,
  'ALTER TABLE `purchaseInvoice` ADD COLUMN `status` varchar(10) NOT NULL DEFAULT ''true'' AFTER `note`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE purchase_invoice_status_stmt FROM @purchase_invoice_status_sql;
--> statement-breakpoint
EXECUTE purchase_invoice_status_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE purchase_invoice_status_stmt;
--> statement-breakpoint
UPDATE `transaction` t
INNER JOIN `saleInvoice` si ON si.`id` = t.`relatedId`
SET t.`status` = 'false', t.`updated_at` = CURRENT_TIMESTAMP
WHERE si.`status` = 'false' AND t.`status` <> 'false';
--> statement-breakpoint
UPDATE `transaction` t
INNER JOIN `purchaseInvoice` pi ON pi.`id` = t.`relatedId`
SET t.`status` = 'false', t.`updated_at` = CURRENT_TIMESTAMP
WHERE pi.`status` = 'false' AND t.`status` <> 'false';
