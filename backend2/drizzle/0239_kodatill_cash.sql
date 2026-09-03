-- KodaTill (SCRUM-279) : sessions de caisse, mouvements d espece et permissions.
--
-- kt_cash_sessions materialise le fond de caisse ouvert par un caissier sur une
-- succursale (et eventuellement un poste). expected_cash est calcule par le
-- backend a la cloture (fond initial + encaissements espece + entrees - sorties),
-- counted_cash est saisi par le caissier, variance est la difference conservee
-- comme trace d ecart. ledger_entry_id reste NULL tant que le branchement vers
-- le module comptable ERP/SIFA n est pas fait : la colonne est posee des la
-- fondation pour eviter un ALTER sur une table deja volumineuse plus tard.
--
-- cash_status porte l etat metier (open/closed) et status reste le soft delete
-- projet, comme pour kt_orders.
--
-- Conventions projet : un seul statement par breakpoint, aucune apostrophe dans
-- les commentaires, aucune donnee de demonstration inseree.
CREATE TABLE IF NOT EXISTS `kt_cash_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `register_id` BIGINT UNSIGNED NULL,
  `user_id` BIGINT NOT NULL,
  `opened_at` DATETIME NULL,
  `opening_float` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `closed_at` DATETIME NULL,
  `expected_cash` DECIMAL(14,2) NULL,
  `counted_cash` DECIMAL(14,2) NULL,
  `variance` DECIMAL(14,2) NULL,
  `currency_code` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `cash_status` ENUM('open','closed') NOT NULL DEFAULT 'open',
  `ledger_entry_id` BIGINT NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_cash_sessions_org_status` (`organization_id`, `cash_status`),
  KEY `idx_kt_cash_sessions_branch` (`branch_id`, `opened_at`),
  KEY `idx_kt_cash_sessions_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_cash_movements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `session_id` BIGINT UNSIGNED NOT NULL,
  `type` ENUM('in','out') NOT NULL DEFAULT 'in',
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `reason` VARCHAR(255) NULL,
  `user_id` BIGINT NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_cash_movements_session` (`session_id`),
  KEY `idx_kt_cash_movements_org` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
-- Permissions KodaTill. INSERT IGNORE = idempotent (name est UNIQUE sur permission).
INSERT IGNORE INTO `permission` (`name`, `type`, `created_at`, `updated_at`) VALUES
  ('kodatill_view',            'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kodatill_pos_operate',     'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kodatill_catalog_manage',  'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kodatill_cash_close',      'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kodatill_reports_view',    'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kodatill_settings_manage', 'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
-- Attribution au role admin (et super-admin) de chaque organisation. Le NOT EXISTS
-- rend le rejeu sans effet. organization_id est denormalise depuis le role parent.
INSERT INTO `rolePermission` (`organization_id`, `roleId`, `permissionId`, `created_at`, `updated_at`)
SELECT r.`organization_id`, r.`id`, p.`id`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `role` r
JOIN `permission` p
  ON p.`name` IN (
    'kodatill_view',
    'kodatill_pos_operate',
    'kodatill_catalog_manage',
    'kodatill_cash_close',
    'kodatill_reports_view',
    'kodatill_settings_manage'
  )
WHERE r.`name` IN ('super-admin', 'admin')
  AND NOT EXISTS (
    SELECT 1
    FROM `rolePermission` rp
    WHERE rp.`roleId` = r.`id`
      AND rp.`permissionId` = p.`id`
  );
