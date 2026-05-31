-- SCRUM-236 — Table générique de listes éditables par l'utilisateur (races, types,
-- vétérinaires, voies d'administration, causes de mortalité, etc.) au lieu de hardcoder.

CREATE TABLE IF NOT EXISTS `farmos_lookups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `category` varchar(50) NOT NULL,
  `scope_key` varchar(50) DEFAULT NULL,
  `value_fr` varchar(255) NOT NULL,
  `value_en` varchar(255) DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_lookups_org_cat` (`organization_id`, `category`, `is_active`),
  KEY `idx_farmos_lookups_org_cat_scope` (`organization_id`, `category`, `scope_key`, `is_active`),
  UNIQUE KEY `uniq_farmos_lookups` (`organization_id`, `category`, `scope_key`, `value_fr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
