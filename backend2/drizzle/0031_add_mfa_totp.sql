-- SCRUM-32: MFA TOTP — users columns + recovery codes table
ALTER TABLE `users`
  ADD COLUMN `totp_secret` varchar(128) NULL,
  ADD COLUMN `totp_enabled` tinyint(1) NOT NULL DEFAULT 0;

CREATE TABLE `mfa_recovery_codes` (
  `id`         bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id`    bigint unsigned NOT NULL,
  `code_hash`  varchar(128) NOT NULL,
  `used_at`    timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_mfa_code_hash` (`code_hash`),
  KEY `idx_mfa_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
