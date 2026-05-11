CREATE TABLE IF NOT EXISTS `designations` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `designations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `shifts` (
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

CREATE TABLE IF NOT EXISTS `awards` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `awards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `designation_histories` (
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

CREATE TABLE IF NOT EXISTS `salary_histories` (
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

CREATE TABLE IF NOT EXISTS `award_histories` (
  `id` serial AUTO_INCREMENT NOT NULL,
  `userId` bigint NOT NULL,
  `awardId` bigint NOT NULL,
  `awardedDate` date NOT NULL,
  `comment` text,
  `created_at` timestamp,
  `updated_at` timestamp,
  CONSTRAINT `award_histories_id` PRIMARY KEY(`id`)
);
