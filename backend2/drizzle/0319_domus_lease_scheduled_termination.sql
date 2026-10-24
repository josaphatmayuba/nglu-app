-- Domus : resiliation programmee de bail (date effective future, max 6 mois).
-- status = scheduled | cancelled | executed | obsolete. Le bail reste actif jusqu a son execution.
-- Idempotent, aucune donnee inseree ni modifiee.
CREATE TABLE IF NOT EXISTS `real_estate_lease_scheduled_terminations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL,
  `lease_id` bigint NOT NULL,
  `effective_date` date NOT NULL,
  `reason` text NULL,
  `notify_tenant` tinyint NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'scheduled',
  `created_by` bigint NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `cancelled_by` bigint NULL,
  `cancelled_at` timestamp NULL,
  `cancel_reason` text NULL,
  `executed_at` timestamp NULL,
  `last_error` text NULL,
  `attempts` int NOT NULL DEFAULT 0,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
--> statement-breakpoint
SET @i_idx_re_lst_org_lease_status := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_lease_scheduled_terminations' AND INDEX_NAME = 'idx_re_lst_org_lease_status');
--> statement-breakpoint
SET @sql := IF(@i_idx_re_lst_org_lease_status = 0, 'ALTER TABLE `real_estate_lease_scheduled_terminations` ADD INDEX `idx_re_lst_org_lease_status` (`organization_id`, `lease_id`, `status`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @i_idx_re_lst_status_date := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_lease_scheduled_terminations' AND INDEX_NAME = 'idx_re_lst_status_date');
--> statement-breakpoint
SET @sql := IF(@i_idx_re_lst_status_date = 0, 'ALTER TABLE `real_estate_lease_scheduled_terminations` ADD INDEX `idx_re_lst_status_date` (`status`, `effective_date`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
