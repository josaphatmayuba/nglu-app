-- Bug 20 Lot 3 retours, devis et produits CRM legacy : colonnes d argent passees de DOUBLE a DECIMAL exact.
-- Totaux, montants de ligne, remboursements immediats : DECIMAL(18,2). Prix unitaires et prix produit (vente, achat moyen pondere) : DECIMAL(18,4).
-- Le champ tax des retours est un MONTANT de taxe (somme des taxes proratisees des lignes retournees), pas un taux : DECIMAL(18,2).
-- Nullabilite et defaut conserves a l identique. Idempotent : ne modifie que si la colonne est encore en double.
-- Aucune donnee inseree. Quantites (productQuantity, reorderQuantity) restent en double. adjustInvoiceProduct sans colonne d argent : non touche.
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'returnSaleInvoice' AND COLUMN_NAME = 'totalAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `returnSaleInvoice` MODIFY COLUMN `totalAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'returnSaleInvoice' AND COLUMN_NAME = 'instantReturnAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `returnSaleInvoice` MODIFY COLUMN `instantReturnAmount` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'returnSaleInvoice' AND COLUMN_NAME = 'tax' AND DATA_TYPE = 'double'), 'ALTER TABLE `returnSaleInvoice` MODIFY COLUMN `tax` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'returnSaleInvoiceProduct' AND COLUMN_NAME = 'productUnitSalePrice' AND DATA_TYPE = 'double'), 'ALTER TABLE `returnSaleInvoiceProduct` MODIFY COLUMN `productUnitSalePrice` DECIMAL(18,4) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'returnSaleInvoiceProduct' AND COLUMN_NAME = 'productFinalAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `returnSaleInvoiceProduct` MODIFY COLUMN `productFinalAmount` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'returnPurchaseInvoice' AND COLUMN_NAME = 'totalAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `returnPurchaseInvoice` MODIFY COLUMN `totalAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'returnPurchaseInvoice' AND COLUMN_NAME = 'instantReturnAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `returnPurchaseInvoice` MODIFY COLUMN `instantReturnAmount` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'returnPurchaseInvoice' AND COLUMN_NAME = 'tax' AND DATA_TYPE = 'double'), 'ALTER TABLE `returnPurchaseInvoice` MODIFY COLUMN `tax` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'returnPurchaseInvoiceProduct' AND COLUMN_NAME = 'productUnitPurchasePrice' AND DATA_TYPE = 'double'), 'ALTER TABLE `returnPurchaseInvoiceProduct` MODIFY COLUMN `productUnitPurchasePrice` DECIMAL(18,4) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'returnPurchaseInvoiceProduct' AND COLUMN_NAME = 'productFinalAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `returnPurchaseInvoiceProduct` MODIFY COLUMN `productFinalAmount` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quote' AND COLUMN_NAME = 'totalAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `quote` MODIFY COLUMN `totalAmount` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quoteProduct' AND COLUMN_NAME = 'productUnitSalePrice' AND DATA_TYPE = 'double'), 'ALTER TABLE `quoteProduct` MODIFY COLUMN `productUnitSalePrice` DECIMAL(18,4) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quoteProduct' AND COLUMN_NAME = 'productFinalAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `quoteProduct` MODIFY COLUMN `productFinalAmount` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product' AND COLUMN_NAME = 'productSalePrice' AND DATA_TYPE = 'double'), 'ALTER TABLE `product` MODIFY COLUMN `productSalePrice` DECIMAL(18,4) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product' AND COLUMN_NAME = 'productPurchasePrice' AND DATA_TYPE = 'double'), 'ALTER TABLE `product` MODIFY COLUMN `productPurchasePrice` DECIMAL(18,4) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
