CREATE TABLE `account` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appSetting` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`companyName` varchar(255),
	`dashboardType` varchar(255),
	`tagLine` varchar(255),
	`address` varchar(255),
	`phone` varchar(255),
	`email` varchar(255),
	`website` varchar(255),
	`footer` text,
	`logo` varchar(255),
	`currencyId` bigint,
	`isPos` varchar(10) DEFAULT 'false',
	`isDiscount` varchar(10) DEFAULT 'false',
	`isTax` varchar(10) DEFAULT 'false',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `appSetting_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `currency` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`currencyName` varchar(255) NOT NULL,
	`currencySymbol` varchar(255) NOT NULL,
	`status` varchar(255) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `currency_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`profileImage` varchar(255),
	`firstName` varchar(255),
	`lastName` varchar(255),
	`username` varchar(255),
	`email` varchar(255),
	`phone` varchar(255),
	`address` varchar(255),
	`password` varchar(255) NOT NULL,
	`roleId` bigint NOT NULL DEFAULT 3,
	`isLogin` varchar(255) NOT NULL DEFAULT 'false',
	`status` varchar(255) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `customer_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discount` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`value` varchar(255) NOT NULL,
	`type` enum('percentage','flat','flashSale') NOT NULL,
	`status` varchar(255) NOT NULL DEFAULT 'true',
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `discount_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manufacturer` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `manufacturer_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentMethod` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`subAccountId` bigint NOT NULL,
	`methodName` varchar(255) NOT NULL,
	`logo` varchar(255),
	`ownerAccount` varchar(255),
	`instruction` text,
	`isActive` varchar(255) NOT NULL DEFAULT 'true',
	`status` varchar(255) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `paymentMethod_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentPurchaseInvoice` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`date` datetime NOT NULL,
	`amount` double NOT NULL DEFAULT 0,
	`purchaseInvoiceId` varchar(50) NOT NULL,
	`note` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `paymentPurchaseInvoice_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentSaleInvoice` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`date` datetime NOT NULL,
	`amount` double NOT NULL DEFAULT 0,
	`saleInvoiceId` varchar(50) NOT NULL,
	`note` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `paymentSaleInvoice_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permission` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `permission_id` PRIMARY KEY(`id`),
	CONSTRAINT `permission_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `productBrand` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `productBrand_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productCategory` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `productCategory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productSubCategory` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`productCategoryId` bigint NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `productSubCategory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productVat` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`percentage` double NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `productVat_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`productThumbnailImage` varchar(255),
	`productSubCategoryId` bigint,
	`productBrandId` bigint,
	`description` text,
	`sku` varchar(255),
	`productQuantity` double NOT NULL DEFAULT 0,
	`productSalePrice` double NOT NULL DEFAULT 0,
	`productPurchasePrice` double NOT NULL DEFAULT 0,
	`uomId` bigint,
	`uomValue` varchar(255),
	`reorderQuantity` double DEFAULT 0,
	`productVatId` bigint,
	`productPurchaseVatId` bigint,
	`discountId` bigint,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `product_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseInvoiceProduct` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`invoiceId` varchar(50) NOT NULL,
	`productId` bigint NOT NULL,
	`productQuantity` double NOT NULL DEFAULT 0,
	`productUnitPurchasePrice` double NOT NULL DEFAULT 0,
	`productFinalAmount` double NOT NULL DEFAULT 0,
	`tax` double DEFAULT 0,
	`taxAmount` double DEFAULT 0,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `purchaseInvoiceProduct_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseInvoice` (
	`id` varchar(50) NOT NULL,
	`date` datetime NOT NULL,
	`invoiceMemoNo` varchar(255),
	`supplierMemoNo` varchar(255),
	`totalAmount` double NOT NULL DEFAULT 0,
	`totalTax` double NOT NULL DEFAULT 0,
	`paidAmount` double NOT NULL DEFAULT 0,
	`dueAmount` double NOT NULL DEFAULT 0,
	`supplierId` bigint,
	`note` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `purchaseInvoice_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `real_estate_contract_audit_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`contract_id` bigint NOT NULL,
	`event` varchar(100) NOT NULL,
	`ip` varchar(100),
	`user_agent` varchar(500),
	`details` text,
	`created_at` timestamp,
	CONSTRAINT `real_estate_contract_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `real_estate_contracts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`lease_id` bigint NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'draft',
	`contract_content` text,
	`signature_data` text,
	`signer_token` varchar(255),
	`signer_token_expiry` timestamp,
	`signed_at` timestamp,
	`signer_ip` varchar(100),
	`signer_user_agent` varchar(500),
	`sent_at` timestamp,
	`tenant_email` varchar(255),
	`tenant_name` varchar(255),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `real_estate_contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `real_estate_leases` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`reference` varchar(255) NOT NULL,
	`property_id` bigint NOT NULL,
	`unit_id` bigint NOT NULL,
	`tenant_id` bigint NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date,
	`next_invoice_date` date,
	`billing_cycle` varchar(255) NOT NULL DEFAULT 'monthly',
	`rent_amount` decimal(15,2) NOT NULL,
	`security_deposit` decimal(15,2) NOT NULL DEFAULT '0',
	`move_in_meter_reading` decimal(12,2),
	`move_in_notes` text,
	`terms` text,
	`status` varchar(255) NOT NULL DEFAULT 'draft',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `real_estate_leases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `real_estate_maintenance_requests` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`property_id` bigint NOT NULL,
	`unit_id` bigint,
	`title` varchar(255) NOT NULL,
	`priority` varchar(255) NOT NULL DEFAULT 'medium',
	`status` varchar(255) NOT NULL DEFAULT 'open',
	`scheduled_date` date,
	`estimated_cost` decimal(15,2) NOT NULL DEFAULT '0',
	`description` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `real_estate_maintenance_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `real_estate_properties` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(255),
	`property_type` varchar(255) NOT NULL DEFAULT 'building',
	`status` varchar(255) NOT NULL DEFAULT 'available',
	`address` varchar(255),
	`city` varchar(255),
	`country` varchar(255),
	`floors` int NOT NULL DEFAULT 1,
	`parking_spaces` int NOT NULL DEFAULT 0,
	`market_value` decimal(15,2) NOT NULL DEFAULT '0',
	`default_rent` decimal(15,2) NOT NULL DEFAULT '0',
	`description` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `real_estate_properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `real_estate_rent_payments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`lease_id` bigint NOT NULL,
	`transaction_id` bigint,
	`payment_date` date NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`method` varchar(255) NOT NULL DEFAULT 'cash',
	`reference` varchar(255),
	`notes` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `real_estate_rent_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `real_estate_units` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`property_id` bigint NOT NULL,
	`name` varchar(255) NOT NULL,
	`unit_type` varchar(255) NOT NULL DEFAULT 'apartment',
	`status` varchar(255) NOT NULL DEFAULT 'vacant',
	`floor` varchar(255),
	`bedrooms` int NOT NULL DEFAULT 0,
	`bathrooms` int NOT NULL DEFAULT 0,
	`area` decimal(12,2) NOT NULL DEFAULT '0',
	`monthly_rent` decimal(15,2) NOT NULL DEFAULT '0',
	`security_deposit` decimal(15,2) NOT NULL DEFAULT '0',
	`amenities` text,
	`description` text,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `real_estate_units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `returnPurchaseInvoice` (
	`id` varchar(50) NOT NULL,
	`date` datetime NOT NULL,
	`totalAmount` double NOT NULL DEFAULT 0,
	`instantReturnAmount` double DEFAULT 0,
	`tax` double DEFAULT 0,
	`note` text,
	`purchaseInvoiceId` varchar(50),
	`invoiceMemoNo` varchar(255),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `returnPurchaseInvoice_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `returnSaleInvoice` (
	`id` varchar(50) NOT NULL,
	`date` datetime NOT NULL,
	`totalAmount` double NOT NULL DEFAULT 0,
	`instantReturnAmount` double DEFAULT 0,
	`tax` double DEFAULT 0,
	`note` text,
	`saleInvoiceId` varchar(50),
	`invoiceMemoNo` varchar(255),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `returnSaleInvoice_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rolePermission` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`roleId` bigint NOT NULL,
	`permissionId` bigint NOT NULL,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `rolePermission_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(255) NOT NULL DEFAULT 'active',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `role_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `saleInvoiceProduct` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`invoiceId` varchar(50) NOT NULL,
	`productId` bigint NOT NULL,
	`productQuantity` double NOT NULL DEFAULT 0,
	`productUnitSalePrice` double NOT NULL DEFAULT 0,
	`productDiscount` double NOT NULL DEFAULT 0,
	`productFinalAmount` double NOT NULL DEFAULT 0,
	`tax` double DEFAULT 0,
	`taxAmount` double DEFAULT 0,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `saleInvoiceProduct_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saleInvoice` (
	`id` varchar(50) NOT NULL,
	`date` datetime NOT NULL,
	`invoiceMemoNo` varchar(255),
	`totalAmount` double NOT NULL DEFAULT 0,
	`totalTaxAmount` double NOT NULL DEFAULT 0,
	`totalDiscountAmount` double NOT NULL DEFAULT 0,
	`paidAmount` double NOT NULL DEFAULT 0,
	`dueAmount` double NOT NULL DEFAULT 0,
	`profit` double NOT NULL DEFAULT 0,
	`customerId` bigint,
	`userId` bigint,
	`note` text,
	`dueDate` datetime,
	`isHold` varchar(10) DEFAULT 'false',
	`orderStatus` varchar(50),
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `saleInvoice_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subAccount` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`accountId` bigint NOT NULL,
	`status` varchar(255) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `subAccount_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(255) NOT NULL,
	`address` varchar(255),
	`email` varchar(255),
	`status` varchar(255) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `supplier_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transaction_types` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`debit_account_id` bigint NOT NULL,
	`credit_account_id` bigint NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `transaction_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transaction` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`date` datetime NOT NULL,
	`debitId` bigint NOT NULL,
	`creditId` bigint NOT NULL,
	`particulars` varchar(255) NOT NULL,
	`amount` double NOT NULL,
	`type` varchar(255),
	`relatedId` varchar(255),
	`status` varchar(255) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `transaction_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uom` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `uom_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`firstName` varchar(255),
	`lastName` varchar(255),
	`username` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`roleId` bigint NOT NULL,
	`email` varchar(255),
	`phone` varchar(255),
	`street` varchar(255),
	`city` varchar(255),
	`state` varchar(255),
	`zipCode` varchar(255),
	`country` varchar(255),
	`joinDate` datetime,
	`leaveDate` datetime,
	`employeeId` varchar(255),
	`bloodGroup` varchar(255),
	`image` varchar(255),
	`designationId` bigint,
	`employmentStatusId` bigint,
	`departmentId` bigint,
	`shiftId` bigint,
	`refreshToken` varchar(512),
	`isLogin` varchar(10) NOT NULL DEFAULT 'false',
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
