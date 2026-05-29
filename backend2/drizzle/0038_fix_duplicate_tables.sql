-- Fix for duplicate table creation attempts
-- This migration ensures tables exist without erroring if they already exist
DROP TABLE IF EXISTS `adjustInvoiceProduct_backup`;
--> statement-breakpoint
-- Verify table structure is correct
CREATE TABLE IF NOT EXISTS `adjustInvoiceProduct` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `invoiceId` bigint NOT NULL,
  `productId` bigint,
  `productQuantity` double DEFAULT 0,
  `type` varchar(50),
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `adjustInvoiceProduct_id` PRIMARY KEY(`id`)
);
