-- P2 (finalisation) : organization_id sur les dernieres tables compta non isolees.
-- returnSaleInvoice / returnPurchaseInvoice / paymentSaleInvoice /
-- paymentPurchaseInvoice : backfill depuis la facture parente (qui porte deja org).
-- appSetting : parametres par organisation (backfill existant -> org 1).
-- Idempotent (INFORMATION_SCHEMA + PREPARE, MySQL 8 sans IF NOT EXISTS natif).

-- helper repete : ajoute la colonne si absente, puis backfill, puis index.

-- 1) returnSaleInvoice
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='returnSaleInvoice' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `returnSaleInvoice` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
UPDATE `returnSaleInvoice` r JOIN `saleInvoice` i ON i.`id` = r.`saleInvoiceId` SET r.`organization_id` = i.`organization_id` WHERE r.`organization_id` <> i.`organization_id`;
--> statement-breakpoint

-- 2) returnPurchaseInvoice
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='returnPurchaseInvoice' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `returnPurchaseInvoice` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
UPDATE `returnPurchaseInvoice` r JOIN `purchaseInvoice` i ON i.`id` = r.`purchaseInvoiceId` SET r.`organization_id` = i.`organization_id` WHERE r.`organization_id` <> i.`organization_id`;
--> statement-breakpoint

-- 3) paymentSaleInvoice
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='paymentSaleInvoice' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `paymentSaleInvoice` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
UPDATE `paymentSaleInvoice` p JOIN `saleInvoice` i ON i.`id` = p.`saleInvoiceId` SET p.`organization_id` = i.`organization_id` WHERE p.`organization_id` <> i.`organization_id`;
--> statement-breakpoint

-- 4) paymentPurchaseInvoice
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='paymentPurchaseInvoice' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `paymentPurchaseInvoice` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
UPDATE `paymentPurchaseInvoice` p JOIN `purchaseInvoice` i ON i.`id` = p.`purchaseInvoiceId` SET p.`organization_id` = i.`organization_id` WHERE p.`organization_id` <> i.`organization_id`;
--> statement-breakpoint

-- 5) appSetting (parametres par organisation ; existant -> org 1 par defaut)
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='appSetting' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `appSetting` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint

-- Index par org (lectures filtrees)
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='returnSaleInvoice' AND INDEX_NAME='idx_return_sale_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_return_sale_org` ON `returnSaleInvoice` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='returnPurchaseInvoice' AND INDEX_NAME='idx_return_purchase_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_return_purchase_org` ON `returnPurchaseInvoice` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='paymentSaleInvoice' AND INDEX_NAME='idx_payment_sale_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_payment_sale_org` ON `paymentSaleInvoice` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='paymentPurchaseInvoice' AND INDEX_NAME='idx_payment_purchase_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_payment_purchase_org` ON `paymentPurchaseInvoice` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='appSetting' AND INDEX_NAME='idx_appsetting_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_appsetting_org` ON `appSetting` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
