-- P2 (finalisation) : organization_id sur supplier et paymentMethod.
-- Referentiels propres a chaque organisation (fournisseurs + moyens de paiement).
-- Existant -> org 1 par defaut. Idempotent (INFORMATION_SCHEMA + PREPARE,
-- MySQL 8 sans IF NOT EXISTS natif sur ADD COLUMN / CREATE INDEX).

-- 1) supplier
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='supplier' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `supplier` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint

-- 2) paymentMethod
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='paymentMethod' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `paymentMethod` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint

-- Index par org (lectures filtrees)
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='supplier' AND INDEX_NAME='idx_supplier_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_supplier_org` ON `supplier` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='paymentMethod' AND INDEX_NAME='idx_payment_method_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_payment_method_org` ON `paymentMethod` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
