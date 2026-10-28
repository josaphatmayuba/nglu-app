-- Bug 20 Lot 2 ventes et achats CRM legacy : colonnes d argent passees de DOUBLE a DECIMAL exact.
-- Totaux, taxes, paiements, du, profit : DECIMAL(18,2). Prix unitaires : DECIMAL(18,4) pour garder les prix sous le centime.
-- Nullabilite et defaut conserves a l identique. Idempotent : ne modifie que si la colonne est encore en double.
-- Aucune donnee inseree. Quantites et taux (tax, productDiscount en pourcentage) restent en double.
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saleInvoice' AND COLUMN_NAME = 'totalAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `saleInvoice` MODIFY COLUMN `totalAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saleInvoice' AND COLUMN_NAME = 'totalTaxAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `saleInvoice` MODIFY COLUMN `totalTaxAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saleInvoice' AND COLUMN_NAME = 'totalDiscountAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `saleInvoice` MODIFY COLUMN `totalDiscountAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saleInvoice' AND COLUMN_NAME = 'paidAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `saleInvoice` MODIFY COLUMN `paidAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saleInvoice' AND COLUMN_NAME = 'dueAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `saleInvoice` MODIFY COLUMN `dueAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saleInvoice' AND COLUMN_NAME = 'profit' AND DATA_TYPE = 'double'), 'ALTER TABLE `saleInvoice` MODIFY COLUMN `profit` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saleInvoiceProduct' AND COLUMN_NAME = 'productUnitSalePrice' AND DATA_TYPE = 'double'), 'ALTER TABLE `saleInvoiceProduct` MODIFY COLUMN `productUnitSalePrice` DECIMAL(18,4) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saleInvoiceProduct' AND COLUMN_NAME = 'productFinalAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `saleInvoiceProduct` MODIFY COLUMN `productFinalAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saleInvoiceProduct' AND COLUMN_NAME = 'taxAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `saleInvoiceProduct` MODIFY COLUMN `taxAmount` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paymentSaleInvoice' AND COLUMN_NAME = 'amount' AND DATA_TYPE = 'double'), 'ALTER TABLE `paymentSaleInvoice` MODIFY COLUMN `amount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchaseInvoice' AND COLUMN_NAME = 'totalAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `purchaseInvoice` MODIFY COLUMN `totalAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchaseInvoice' AND COLUMN_NAME = 'totalTax' AND DATA_TYPE = 'double'), 'ALTER TABLE `purchaseInvoice` MODIFY COLUMN `totalTax` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchaseInvoice' AND COLUMN_NAME = 'paidAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `purchaseInvoice` MODIFY COLUMN `paidAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchaseInvoice' AND COLUMN_NAME = 'dueAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `purchaseInvoice` MODIFY COLUMN `dueAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchaseInvoiceProduct' AND COLUMN_NAME = 'productUnitPurchasePrice' AND DATA_TYPE = 'double'), 'ALTER TABLE `purchaseInvoiceProduct` MODIFY COLUMN `productUnitPurchasePrice` DECIMAL(18,4) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchaseInvoiceProduct' AND COLUMN_NAME = 'productFinalAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `purchaseInvoiceProduct` MODIFY COLUMN `productFinalAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchaseInvoiceProduct' AND COLUMN_NAME = 'taxAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `purchaseInvoiceProduct` MODIFY COLUMN `taxAmount` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paymentPurchaseInvoice' AND COLUMN_NAME = 'amount' AND DATA_TYPE = 'double'), 'ALTER TABLE `paymentPurchaseInvoice` MODIFY COLUMN `amount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
