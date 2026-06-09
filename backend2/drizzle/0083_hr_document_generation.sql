ALTER TABLE `hr_documents` ADD COLUMN `templateType` varchar(80) DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `hr_documents` ADD COLUMN `version` int DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `hr_documents` ADD COLUMN `generatedAt` timestamp DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `hr_documents` ADD COLUMN `generatedBy` bigint DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `hr_documents` ADD COLUMN `content` text DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `hr_documents` ADD COLUMN `signedAt` timestamp DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `hr_documents` ADD COLUMN `signedBy` varchar(255) DEFAULT NULL;
