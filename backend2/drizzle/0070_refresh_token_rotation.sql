-- SCRUM-121: refresh-token rotation + reuse detection + per-device sessions.
ALTER TABLE `sessions` ADD COLUMN `family_id` VARCHAR(36) NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `jti` VARCHAR(36) NOT NULL,
  `family_id` VARCHAR(36) NOT NULL,
  `user_id` BIGINT NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `user_agent` TEXT,
  `ip` VARCHAR(100),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  `rotated_at` TIMESTAMP NULL DEFAULT NULL,
  `replaced_by_jti` VARCHAR(36) NULL DEFAULT NULL,
  `revoked_at` TIMESTAMP NULL DEFAULT NULL,
  `revoked_reason` VARCHAR(100) NULL DEFAULT NULL,
  PRIMARY KEY (`jti`),
  KEY `idx_refresh_tokens_family` (`family_id`),
  KEY `idx_refresh_tokens_user` (`user_id`)
);
