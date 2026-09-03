CREATE TABLE `real_estate_lease_documents` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`organization_id` bigint NOT NULL DEFAULT 1,
	`lease_id` bigint NOT NULL,
	`bucket` varchar(255) NOT NULL,
	`object_key` varchar(500) NOT NULL,
	`original_name` varchar(255),
	`mime_type` varchar(100),
	`size_bytes` bigint,
	`notes` varchar(500),
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `real_estate_lease_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `real_estate_lease_documents_lease_id_idx` ON `real_estate_lease_documents` (`lease_id`);
--> statement-breakpoint
CREATE INDEX `real_estate_lease_documents_org_id_idx` ON `real_estate_lease_documents` (`organization_id`);
