CREATE TABLE `real_estate_security_deposits` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`organization_id` bigint NOT NULL DEFAULT 1,
	`lease_id` bigint NOT NULL,
	`currency_id` bigint,
	`transaction_id` bigint,
	`return_transaction_id` bigint,
	`amount` decimal(15,2) NOT NULL,
	`method` varchar(255) NOT NULL DEFAULT 'cash',
	`payment_date` date NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'held',
	`deduction_amount` decimal(15,2),
	`deduction_reason` varchar(500),
	`returned_amount` decimal(15,2),
	`return_method` varchar(255),
	`return_date` date,
	`reference` varchar(255),
	`notes` text,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `real_estate_security_deposits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `resd_lease_idx` ON `real_estate_security_deposits` (`lease_id`);
