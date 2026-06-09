-- Idempotent (rejouable à chaque boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Droits de congés paramétrables par pays + type (remplace le barème codé en dur).
-- country_code = '*' : barème par défaut appliqué quand le pays n'a pas de règle.

CREATE TABLE IF NOT EXISTS `hr_leave_entitlements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `country_code` varchar(10) NOT NULL DEFAULT '*',
  `leave_type` varchar(80) NOT NULL,
  `contract_type` varchar(80),
  `entitlement_days` double NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_leave_entitlement_lookup` (`country_code`, `leave_type`)
);
--> statement-breakpoint
INSERT INTO `hr_leave_entitlements` (`country_code`, `leave_type`, `entitlement_days`)
SELECT * FROM (
  SELECT '*' AS a, 'conge_annuel' AS b, 24 AS c UNION ALL
  SELECT '*', 'maladie', 10 UNION ALL
  SELECT '*', 'maternite', 98 UNION ALL
  SELECT '*', 'paternite', 3 UNION ALL
  SELECT '*', 'mission', 0
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM `hr_leave_entitlements` LIMIT 1);
