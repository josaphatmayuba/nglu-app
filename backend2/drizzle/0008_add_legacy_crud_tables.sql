CREATE TABLE IF NOT EXISTS `announcement` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `title` varchar(255),
  `description` text,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `announcement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `emailConfig` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `emailConfigName` varchar(255),
  `emailHost` varchar(255),
  `emailPort` int,
  `emailUser` varchar(255),
  `emailPass` varchar(255),
  `emailFrom` varchar(255),
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `emailConfig_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `email` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `emailConfigName` varchar(255),
  `to` varchar(255),
  `subject` varchar(255),
  `body` text,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `email_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `manualPayment` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `date` datetime,
  `amount` double NOT NULL DEFAULT 0,
  `paymentMethodId` bigint,
  `customerId` bigint,
  `transactionId` bigint,
  `note` text,
  `paymentStatus` varchar(50) DEFAULT 'pending',
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `manualPayment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `adjustInvoice` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `date` datetime,
  `note` text,
  `userId` bigint,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `adjustInvoice_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `quote` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `quoteName` varchar(255),
  `quoteDate` datetime,
  `quoteOwnerId` bigint,
  `customerId` bigint,
  `totalAmount` double DEFAULT 0,
  `note` text,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `quote_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `quoteProduct` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `quoteId` bigint NOT NULL,
  `productId` bigint,
  `productQuantity` double DEFAULT 0,
  `productUnitSalePrice` double DEFAULT 0,
  `productFinalAmount` double DEFAULT 0,
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `quoteProduct_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `purchaseReorderInvoice` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `reorderInvoiceId` varchar(50),
  `productId` bigint,
  `quantity` double DEFAULT 0,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `purchaseReorderInvoice_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `returnPurchaseInvoiceProduct` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `invoiceId` varchar(50) NOT NULL,
  `productId` bigint,
  `productQuantity` double DEFAULT 0,
  `productUnitPurchasePrice` double DEFAULT 0,
  `productFinalAmount` double DEFAULT 0,
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `returnPurchaseInvoiceProduct_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `returnSaleInvoiceProduct` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `invoiceId` varchar(50) NOT NULL,
  `productId` bigint,
  `productQuantity` double DEFAULT 0,
  `productUnitSalePrice` double DEFAULT 0,
  `productFinalAmount` double DEFAULT 0,
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `returnSaleInvoiceProduct_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `productProductAttributeValue` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `productId` bigint,
  `productAttributeValueId` bigint,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `productProductAttributeValue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `dimensionUnit` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `dimensionUnit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `weightUnit` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `weightUnit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attachment` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `emailId` bigint unsigned NOT NULL,
  `name` varchar(255),
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `attachment_id` PRIMARY KEY(`id`)
);
