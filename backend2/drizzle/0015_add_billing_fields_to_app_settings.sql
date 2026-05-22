CREATE TABLE `adjustInvoiceProduct` (
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
CREATE TABLE `adjustInvoice` (
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
CREATE TABLE `announcement` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(255),
	`description` text,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `announcement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attachment` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`emailId` bigint NOT NULL,
	`name` varchar(255),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `attachment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`action` varchar(100) NOT NULL,
	`target` varchar(255),
	`ip` varchar(45),
	`user_agent` varchar(512),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `award_histories` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint NOT NULL,
	`awardId` bigint NOT NULL,
	`awardedDate` date NOT NULL,
	`comment` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `award_histories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `awards` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `awards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `colors` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`colorCode` varchar(255) NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `colors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `department` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `department_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `designation_histories` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint NOT NULL,
	`designationId` bigint NOT NULL,
	`startDate` date,
	`endDate` date,
	`comment` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `designation_histories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `designations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `designations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dimensionUnit` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `dimensionUnit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `education` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint NOT NULL,
	`degree` varchar(255) NOT NULL,
	`institution` varchar(255) NOT NULL,
	`fieldOfStudy` varchar(255) NOT NULL,
	`result` varchar(255) NOT NULL,
	`studyStartDate` datetime NOT NULL,
	`studyEndDate` datetime,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `education_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailConfig` (
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
CREATE TABLE `email` (
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
CREATE TABLE `employmentStatus` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`colourValue` varchar(255) NOT NULL,
	`description` varchar(255),
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `employmentStatus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manualPayment` (
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
CREATE TABLE `mfa_recovery_codes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint NOT NULL,
	`code_hash` varchar(128) NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp,
	CONSTRAINT `mfa_recovery_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pageSize` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`pageSizeName` varchar(255) NOT NULL,
	`width` double NOT NULL,
	`height` double NOT NULL,
	`unit` varchar(255) NOT NULL DEFAULT 'inches',
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `pageSize_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`identity_id` int NOT NULL,
	`identity_type` varchar(20) NOT NULL DEFAULT 'user',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `productAttributeValue` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`productAttributeId` bigint,
	`name` varchar(255),
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `productAttributeValue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productAttribute` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `productAttribute_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productProductAttributeValue` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`productId` bigint,
	`productAttributeValueId` bigint,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `productProductAttributeValue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseReorderInvoice` (
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
CREATE TABLE `quoteProduct` (
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
CREATE TABLE `quote` (
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
CREATE TABLE `real_estate_contract_templates` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'residential',
	`body` text NOT NULL,
	`description` varchar(500),
	`is_active` boolean NOT NULL DEFAULT false,
	`is_deleted` tinyint NOT NULL DEFAULT 0,
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint,
	`updated_by` bigint,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `real_estate_contract_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `real_estate_maintenance_costs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`ticket_id` bigint NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'service',
	`description` varchar(500) NOT NULL,
	`amount` decimal(15,2) NOT NULL DEFAULT '0',
	`currency_id` bigint,
	`vendor_name` varchar(255),
	`payment_method` varchar(50) NOT NULL DEFAULT 'cash',
	`payment_date` date,
	`notes` text,
	`receipt_url` varchar(500),
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `real_estate_maintenance_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `returnPurchaseInvoiceProduct` (
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
CREATE TABLE `returnSaleInvoiceProduct` (
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
CREATE TABLE `salary_histories` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint NOT NULL,
	`salary` double NOT NULL,
	`startDate` date,
	`endDate` date,
	`comment` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `salary_histories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`jti` varchar(36) NOT NULL,
	`user_id` bigint NOT NULL,
	`role_id` bigint NOT NULL,
	`ip` varchar(100),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`revoked` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `sessions_jti` PRIMARY KEY(`jti`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`startTime` varchar(20) NOT NULL,
	`endTime` varchar(20) NOT NULL,
	`workHour` double NOT NULL DEFAULT 0,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_details` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`customer_id` bigint NOT NULL,
	`birth_date` date NOT NULL,
	`sex` varchar(10) NOT NULL,
	`nationality` varchar(255) NOT NULL,
	`marital_status` varchar(255) NOT NULL,
	`origin_province` varchar(255) NOT NULL,
	`phone2` varchar(255),
	`contacted_person` varchar(255) NOT NULL,
	`contacted_person_phone_number` varchar(255) NOT NULL,
	`prossional_status` varchar(255) NOT NULL,
	`main_activity` varchar(255) NOT NULL,
	`entity_name` varchar(255) NOT NULL,
	`entity_address` varchar(255) NOT NULL,
	`hiring_date` date NOT NULL,
	`contract_type` varchar(255) NOT NULL,
	`monthly_pay` decimal(15,2) NOT NULL,
	`other_monthly_income` decimal(15,2),
	`old_address` varchar(255) NOT NULL,
	`old_lessor` varchar(255) NOT NULL,
	`moving_reason` varchar(255) NOT NULL,
	`occupant_number` int NOT NULL,
	`partenair_name` varchar(255),
	`partenair_number` varchar(255),
	`child_number` int NOT NULL DEFAULT 0,
	`child_ages` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `tenant_details_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_details_customer_id_unique` UNIQUE(`customer_id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_onboardings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`phone` varchar(255) NOT NULL,
	`token_hash` varchar(128) NOT NULL,
	`token` varchar(128),
	`status` varchar(50) NOT NULL DEFAULT 'sent',
	`data` text,
	`expires_at` timestamp NOT NULL,
	`submitted_at` timestamp,
	`validated_at` timestamp,
	`customer_id` bigint,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `tenant_onboardings_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_onboardings_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `termsAndCondition` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`subject` text NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `termsAndCondition_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weightUnit` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `weightUnit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `role` MODIFY COLUMN `status` varchar(255) NOT NULL DEFAULT 'true';--> statement-breakpoint
ALTER TABLE `appSetting` ADD `landlord_signature` text;--> statement-breakpoint
ALTER TABLE `appSetting` ADD `invoicePrefix` varchar(50) DEFAULT 'INV-';--> statement-breakpoint
ALTER TABLE `appSetting` ADD `leasePrefix` varchar(50) DEFAULT 'LEASE-';--> statement-breakpoint
ALTER TABLE `appSetting` ADD `defaultVatRate` int DEFAULT 16;--> statement-breakpoint
ALTER TABLE `appSetting` ADD `defaultPaymentTermDays` int DEFAULT 14;--> statement-breakpoint
ALTER TABLE `currency` ADD `currencyCode` varchar(3);--> statement-breakpoint
ALTER TABLE `currency` ADD `decimalPlaces` int DEFAULT 2;--> statement-breakpoint
ALTER TABLE `customer` ADD `googleId` varchar(255);--> statement-breakpoint
ALTER TABLE `purchaseInvoice` ADD `currencyId` bigint;--> statement-breakpoint
ALTER TABLE `real_estate_contracts` ADD `created_by` bigint;--> statement-breakpoint
ALTER TABLE `real_estate_leases` ADD `currency_id` bigint;--> statement-breakpoint
ALTER TABLE `real_estate_maintenance_requests` ADD `is_active` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `real_estate_properties` ADD `currency_id` bigint;--> statement-breakpoint
ALTER TABLE `real_estate_properties` ADD `is_active` tinyint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `real_estate_rent_payments` ADD `currency_id` bigint;--> statement-breakpoint
ALTER TABLE `real_estate_units` ADD `currency_id` bigint;--> statement-breakpoint
ALTER TABLE `real_estate_units` ADD `is_active` tinyint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `role` ADD `is_system` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `saleInvoice` ADD `currencyId` bigint;--> statement-breakpoint
ALTER TABLE `transaction` ADD `currencyId` bigint;--> statement-breakpoint
ALTER TABLE `users` ADD `totp_secret` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `totp_enabled` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `product` DROP COLUMN `productPurchaseVatId`;