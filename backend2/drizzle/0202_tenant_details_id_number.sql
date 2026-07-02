ALTER TABLE `tenant_details` ADD COLUMN `id_document_type` varchar(100);
--> statement-breakpoint
ALTER TABLE `tenant_details` ADD COLUMN `id_number` varchar(100);
--> statement-breakpoint
ALTER TABLE `tenant_details` ADD COLUMN `id_document_bucket` varchar(255);
--> statement-breakpoint
ALTER TABLE `tenant_details` ADD COLUMN `id_document_key` varchar(500);
--> statement-breakpoint
ALTER TABLE `tenant_details` ADD COLUMN `id_document_mime` varchar(100);
--> statement-breakpoint
ALTER TABLE `tenant_details` ADD COLUMN `id_document_name` varchar(255);
