-- Idempotent. Referentiel mondial de vaccins animaux (phase 1: socle A+B).
-- Normalise farmos_vaccines vers un modele multi-source / multi-region.
-- Prefixe vx_. Commentaires sans apostrophe (piege splitSqlStatements).
CREATE TABLE IF NOT EXISTS `vx_species` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `scientific_name` varchar(150) NULL,
  `common_name_en` varchar(100) NULL,
  `common_name_fr` varchar(100) NULL,
  `animal_category` varchar(30) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_species_common_fr` (`common_name_fr`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vx_pathogens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `pathogen_type` varchar(20) NULL,
  `disease_name_en` varchar(150) NULL,
  `disease_name_fr` varchar(150) NULL,
  `is_zoonotic` tinyint NOT NULL DEFAULT 0,
  `omsa_code` varchar(40) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pathogen_name` (`name`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vx_regions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `iso_code` char(2) NULL,
  `name` varchar(100) NOT NULL,
  `regulatory_body` varchar(120) NULL,
  `parent_region_id` bigint unsigned NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_region_name` (`name`),
  KEY `idx_region_parent` (`parent_region_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vx_manufacturers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `hq_region_id` bigint unsigned NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_manufacturer_name` (`name`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vx_antigens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pathogen_id` bigint unsigned NOT NULL,
  `strain_name` varchar(100) NULL,
  `antigen_form` varchar(30) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_antigen_pathogen` (`pathogen_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vx_vaccines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_name` varchar(200) NOT NULL,
  `manufacturer_id` bigint unsigned NULL,
  `vaccine_nature` varchar(30) NULL,
  `physical_form` varchar(60) NULL,
  `storage_min_c` decimal(4,1) NULL,
  `storage_max_c` decimal(4,1) NULL,
  `source_system` varchar(40) NULL,
  `source_url` varchar(400) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vaccine_product` (`product_name`),
  KEY `idx_vaccine_manufacturer` (`manufacturer_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vx_vaccine_antigens` (
  `vaccine_id` bigint unsigned NOT NULL,
  `antigen_id` bigint unsigned NOT NULL,
  `titer_or_potency` varchar(60) NULL,
  PRIMARY KEY (`vaccine_id`, `antigen_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vx_vaccine_species` (
  `vaccine_id` bigint unsigned NOT NULL,
  `species_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`vaccine_id`, `species_id`)
);
