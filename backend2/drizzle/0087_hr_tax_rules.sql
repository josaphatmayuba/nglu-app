CREATE TABLE IF NOT EXISTS `hr_tax_rules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `country_code` varchar(10) NOT NULL,
  `country_name` varchar(100) NOT NULL,
  `cnss_employee_rate` double NOT NULL DEFAULT 0,
  `cnss_employer_rate` double NOT NULL DEFAULT 0,
  `ipr_rate` double NOT NULL DEFAULT 0,
  `ipr_threshold` double NOT NULL DEFAULT 0,
  `ipr_brackets` json,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_tax_rules_country` (`country_code`)
);
--> statement-breakpoint
INSERT INTO `hr_tax_rules` (`country_code`, `country_name`, `cnss_employee_rate`, `cnss_employer_rate`, `ipr_rate`, `ipr_threshold`, `notes`)
SELECT * FROM (
  SELECT 'CD' AS a, 'Congo (RDC)' AS b, 0.035 AS c, 0.0659 AS d, 0 AS e, 0 AS f, 'CNSS: 3.5% salarié / 6.59% patronal; IPR: barème progressif (configurer ipr_brackets)' AS g UNION ALL
  SELECT 'CG', 'Congo (Brazzaville)', 0.04, 0.12, 0.01, 0, 'CNSS: 4% salarié / 12% patronal; IPR: 1% forfait' UNION ALL
  SELECT 'CM', 'Cameroun', 0.042, 0.11, 0.015, 0, 'CNSS: 4.2% salarié / 11% patronal; IRPP: ~1.5% bas de grille' UNION ALL
  SELECT 'CI', 'Côte d''Ivoire', 0.032, 0.016, 0.015, 0, 'CNSS: 3.2% salarié / 1.6% patronal; ITS: ~1.5%' UNION ALL
  SELECT 'SN', 'Sénégal', 0.056, 0.087, 0.02, 0, 'IPRES: 5.6% salarié / 8.7% patronal; IRPP: ~2%' UNION ALL
  SELECT 'GA', 'Gabon', 0.025, 0.20, 0.05, 0, 'CNSS: 2.5% salarié / 20% patronal; IRPP: 5%' UNION ALL
  SELECT 'FR', 'France', 0.22, 0.42, 0.0, 0, 'Cotisations salariales ~22%; barème IPR progressif (configurer ipr_brackets)' UNION ALL
  SELECT 'BE', 'Belgique', 0.1307, 0.27, 0.0, 0, 'Cotisations: 13.07% salarié; Précompte progressif (configurer ipr_brackets)'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM `hr_tax_rules` LIMIT 1);
