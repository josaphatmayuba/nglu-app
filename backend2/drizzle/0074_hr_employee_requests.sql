CREATE TABLE IF NOT EXISTS `hr_employee_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `userId` BIGINT NOT NULL,
  `requestType` VARCHAR(120) NOT NULL,
  `subject` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `requestedDate` DATE NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `decisionComment` TEXT NULL,
  `decidedBy` BIGINT NULL,
  `decidedAt` TIMESTAMP NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_employee_requests_user` (`userId`),
  INDEX `idx_hr_employee_requests_type` (`requestType`),
  INDEX `idx_hr_employee_requests_status` (`status`)
);
