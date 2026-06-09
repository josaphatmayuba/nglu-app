CREATE TABLE `hr_tax_rules` (
  `id` serial PRIMARY KEY NOT NULL,
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
  `created_at` timestamp DEFAULT (now()),
  `updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT INTO `hr_tax_rules` (`country_code`, `country_name`, `cnss_employee_rate`, `cnss_employer_rate`, `ipr_rate`, `ipr_threshold`, `notes`) VALUES
  ('CD', 'Congo (RDC)', 0.035, 0.0659, 0, 0, 'CNSS: 3.5% salarié / 6.59% patronal; IPR: barème progressif (configurer ipr_brackets)'),
  ('CG', 'Congo (Brazzaville)', 0.04, 0.12, 0.01, 0, 'CNSS: 4% salarié / 12% patronal; IPR: 1% forfait'),
  ('CM', 'Cameroun', 0.042, 0.11, 0.015, 0, 'CNSS: 4.2% salarié / 11% patronal; IRPP: ~1.5% bas de grille'),
  ('CI', 'Côte d''Ivoire', 0.032, 0.016, 0.015, 0, 'CNSS: 3.2% salarié / 1.6% patronal; ITS: ~1.5%'),
  ('SN', 'Sénégal', 0.056, 0.087, 0.02, 0, 'IPRES: 5.6% salarié / 8.7% patronal; IRPP: ~2%'),
  ('GA', 'Gabon', 0.025, 0.20, 0.05, 0, 'CNSS: 2.5% salarié / 20% patronal; IRPP: 5%'),
  ('FR', 'France', 0.22, 0.42, 0.0, 0, 'Cotisations salariales ~22%; barème IPR progressif (configurer ipr_brackets)'),
  ('BE', 'Belgique', 0.1307, 0.27, 0.0, 0, 'Cotisations: 13.07% salarié; Précompte progressif (configurer ipr_brackets)');
