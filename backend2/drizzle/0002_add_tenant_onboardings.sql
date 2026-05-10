CREATE TABLE IF NOT EXISTS `tenant_onboardings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`phone` varchar(255) NOT NULL,
	`token_hash` varchar(128) NOT NULL,
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
