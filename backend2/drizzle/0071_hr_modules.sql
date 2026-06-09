CREATE TABLE IF NOT EXISTS `hr_leave_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `userId` BIGINT NOT NULL,
  `type` VARCHAR(80) NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `reason` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `decisionComment` TEXT NULL,
  `decidedBy` BIGINT NULL,
  `decidedAt` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_leave_requests_user` (`userId`),
  INDEX `idx_hr_leave_requests_status` (`status`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `hr_contracts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `userId` BIGINT NOT NULL,
  `contractType` VARCHAR(80) NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NULL,
  `reference` VARCHAR(120) NULL,
  `notes` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_contracts_user` (`userId`),
  INDEX `idx_hr_contracts_status` (`status`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `hr_documents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `userId` BIGINT NOT NULL,
  `documentType` VARCHAR(120) NOT NULL,
  `reference` VARCHAR(160) NULL,
  `fileUrl` VARCHAR(500) NULL,
  `note` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'received',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_documents_user` (`userId`),
  INDEX `idx_hr_documents_type` (`documentType`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `hr_expense_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `userId` BIGINT NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `amount` DOUBLE NOT NULL DEFAULT 0,
  `requestDate` DATE NOT NULL,
  `description` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `decisionComment` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_expense_requests_user` (`userId`),
  INDEX `idx_hr_expense_requests_status` (`status`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `hr_social_declarations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `period` VARCHAR(30) NOT NULL,
  `organism` VARCHAR(120) NOT NULL,
  `baseAmount` DOUBLE NOT NULL DEFAULT 0,
  `rate` VARCHAR(30) NULL,
  `amount` DOUBLE NOT NULL DEFAULT 0,
  `dueDate` DATE NULL,
  `note` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'prepared',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_social_declarations_period` (`period`),
  INDEX `idx_hr_social_declarations_status` (`status`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `hr_performance_reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `userId` BIGINT NOT NULL,
  `managerId` BIGINT NULL,
  `cycle` VARCHAR(80) NOT NULL,
  `score` DOUBLE NULL,
  `objectives` TEXT NULL,
  `comments` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'draft',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_performance_reviews_user` (`userId`),
  INDEX `idx_hr_performance_reviews_cycle` (`cycle`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `hr_training_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `title` VARCHAR(180) NOT NULL,
  `audience` VARCHAR(180) NULL,
  `sessionDate` DATE NULL,
  `budget` DOUBLE NOT NULL DEFAULT 0,
  `note` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'planned',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_training_sessions_status` (`status`),
  INDEX `idx_hr_training_sessions_date` (`sessionDate`)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `hr_recruitment_offers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `role` VARCHAR(180) NOT NULL,
  `departmentId` BIGINT NULL,
  `deadline` DATE NULL,
  `description` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'open',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_recruitment_offers_status` (`status`),
  INDEX `idx_hr_recruitment_offers_department` (`departmentId`)
);
