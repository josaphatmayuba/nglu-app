ALTER TABLE `hr_documents` ADD COLUMN `contentHash` varchar(64) NULL;
--> statement-breakpoint
ALTER TABLE `hr_documents` ADD COLUMN `signatureToken` varchar(64) NULL;
--> statement-breakpoint
ALTER TABLE `hr_documents` ADD COLUMN `signatureAlgorithm` varchar(40) NULL;
