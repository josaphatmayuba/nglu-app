-- Idempotent (rejouable à chaque boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Jours fériés par pays + demi-journée sur les demandes de congés.

CREATE TABLE IF NOT EXISTS `hr_public_holidays` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `country_code` varchar(10) NOT NULL,
  `date` date NOT NULL,
  `name` varchar(180) NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_hr_holiday_country_date` (`country_code`, `date`),
  INDEX `idx_hr_holiday_date` (`date`)
);
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND COLUMN_NAME='halfDay');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_leave_requests` ADD COLUMN `halfDay` tinyint NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
