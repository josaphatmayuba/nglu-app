-- farmos_saved_reports : rapports personnalises sauvegardes (COMP-P2-017).
-- base_type = jeu de donnees (inventory | mortality | reproduction | lot_performance).
-- config JSON = { columns:[], filters:{ species, period, lot, ... } }.
-- Scope par organisation + createur. Soft-delete via is_active.
-- Idempotent (CREATE IF NOT EXISTS, index dans le CREATE).

CREATE TABLE IF NOT EXISTS `farmos_saved_reports` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `base_type` varchar(40) NOT NULL,
  `config` json NULL,
  `created_by` bigint NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  INDEX `idx_saved_reports_org` (`organization_id`, `is_active`)
);
