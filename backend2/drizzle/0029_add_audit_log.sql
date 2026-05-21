CREATE TABLE `audit_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NULL,
  `action` varchar(100) NOT NULL,
  `target` varchar(255) NULL,
  `ip` varchar(45) NULL,
  `user_agent` varchar(512) NULL,
  `metadata` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `audit_log_user_id_idx` (`user_id`),
  INDEX `audit_log_action_idx` (`action`),
  INDEX `audit_log_created_at_idx` (`created_at`)
);
