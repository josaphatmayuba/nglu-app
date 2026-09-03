-- BatiPro : ouvriers nominatifs pour le pointage/presence.
-- crew_id rattache un ouvrier a une equipe (batipro_crews).
-- currency_id reference la table currency (devise du taux journalier).
-- Pas de contrainte FK stricte (meme pattern que les autres tables batipro), seulement des index.
CREATE TABLE IF NOT EXISTS `batipro_workers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `crew_id` BIGINT,
  `full_name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(120),
  `phone` VARCHAR(40),
  `daily_rate` DECIMAL(14,2),
  `currency_id` BIGINT,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_workers_org_crew` (`organization_id`, `crew_id`),
  KEY `idx_batipro_workers_org_active` (`organization_id`, `is_active`)
);
