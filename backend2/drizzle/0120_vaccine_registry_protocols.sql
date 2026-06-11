-- Idempotent. Referentiel vaccins (phase: homologations regionales + protocoles + regles).
-- Le numero d'homologation et le delai de retrait dependent de la REGION (registration).
-- Prefixe vx_. Commentaires sans apostrophe.
CREATE TABLE IF NOT EXISTS `vx_registrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `vaccine_id` bigint unsigned NOT NULL,
  `region_id` bigint unsigned NOT NULL,
  `registration_number` varchar(80) NULL,
  `status` varchar(20) NOT NULL DEFAULT 'authorized',
  `authorization_date` date NULL,
  `expiry_date` date NULL,
  `source_system` varchar(40) NULL,
  `source_document_url` varchar(400) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_registration` (`vaccine_id`, `region_id`, `registration_number`),
  KEY `idx_reg_region` (`region_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vx_withdrawal_periods` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `registration_id` bigint unsigned NOT NULL,
  `produce_type` varchar(20) NOT NULL,
  `withdrawal_days` int NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_withdrawal` (`registration_id`, `produce_type`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vx_protocols` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `vaccine_id` bigint unsigned NOT NULL,
  `species_id` bigint unsigned NOT NULL,
  `source_guideline` varchar(40) NULL,
  `protocol_category` varchar(20) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_protocol_vaccine` (`vaccine_id`),
  KEY `idx_protocol_species` (`species_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vx_protocol_steps` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `protocol_id` bigint unsigned NOT NULL,
  `step_order` int NOT NULL DEFAULT 1,
  `age_min_days` int NULL,
  `age_max_days` int NULL,
  `interval_from_prev_days` int NULL,
  `dose_amount` decimal(6,3) NULL,
  `dose_unit` varchar(20) NULL,
  `route` varchar(40) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_step_protocol` (`protocol_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vx_conditions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `condition_type` varchar(30) NOT NULL,
  `operator` varchar(10) NOT NULL,
  `expected_value` varchar(200) NULL,
  PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vx_protocol_step_conditions` (
  `protocol_step_id` bigint unsigned NOT NULL,
  `condition_id` bigint unsigned NOT NULL,
  `is_mandatory` tinyint NOT NULL DEFAULT 1,
  `logic_group` int NULL,
  PRIMARY KEY (`protocol_step_id`, `condition_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vx_synonym_map` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(20) NOT NULL,
  `raw_value` varchar(200) NOT NULL,
  `source_system` varchar(40) NULL,
  `canonical_id` bigint unsigned NOT NULL,
  `confidence` decimal(3,2) NOT NULL DEFAULT 1.00,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_synonym` (`entity_type`, `raw_value`, `source_system`)
);
