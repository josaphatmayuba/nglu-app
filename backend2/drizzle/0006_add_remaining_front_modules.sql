CREATE TABLE IF NOT EXISTS `department` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `department_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `employmentStatus` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `colourValue` varchar(255) NOT NULL,
  `description` varchar(255),
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `employmentStatus_id` PRIMARY KEY(`id`),
  CONSTRAINT `employmentStatus_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `education` (
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
CREATE TABLE IF NOT EXISTS `colors` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `colorCode` varchar(255) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `colors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `productAttribute` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `productAttribute_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `productAttributeValue` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `productAttributeId` bigint,
  `name` varchar(255),
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `productAttributeValue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `termsAndCondition` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `title` varchar(255) NOT NULL,
  `subject` longtext NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `termsAndCondition_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `pageSize` (
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
