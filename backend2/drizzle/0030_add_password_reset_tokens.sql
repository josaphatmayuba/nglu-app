CREATE TABLE `password_reset_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `token_hash` varchar(64) NOT NULL,
  `identity_id` int unsigned NOT NULL,
  `identity_type` varchar(20) NOT NULL DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash_unique` (`token_hash`),
  INDEX `prt_identity_idx` (`identity_id`, `identity_type`),
  INDEX `prt_expires_at_idx` (`expires_at`)
);
