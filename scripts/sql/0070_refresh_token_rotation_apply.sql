-- SCRUM-121 — Apply manuel (dev + PROD) : rotation refresh token + sessions par appareil.
-- Idempotent : sûr à rejouer. Cibler la bonne base (nglu_dev_mysql en dev, nglu_mysql en prod).
--
-- Contexte : la table refresh_tokens et la colonne sessions.family_id ne sont
-- pas garanties auto-créées en prod (cf. drift migrations Drizzle). Ce script
-- les crée à la main. Voir aussi drizzle/0070_refresh_token_rotation.sql.

-- 1) Colonne family_id sur sessions (ADD COLUMN n'est pas IF NOT EXISTS partout → garde via information_schema).
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'sessions' AND column_name = 'family_id'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE `sessions` ADD COLUMN `family_id` VARCHAR(36) NULL',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Table refresh_tokens.
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
