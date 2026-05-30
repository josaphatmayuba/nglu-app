-- SCRUM-193 — FarmOS tables (idempotent: CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS `farmos_animals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `external_id` varchar(100) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `species` varchar(50) NOT NULL,
  `race` varchar(100) DEFAULT NULL,
  `sex` varchar(10) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `weight` decimal(10,2) DEFAULT NULL,
  `weight_unit` varchar(10) DEFAULT 'kg',
  `lot` varchar(100) DEFAULT NULL,
  `barn` varchar(100) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'healthy',
  `withdrawal_until` date DEFAULT NULL,
  `withdrawal_kind` varchar(20) DEFAULT NULL,
  `last_event` varchar(255) DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_animals_org_species` (`organization_id`, `species`),
  KEY `idx_farmos_animals_status` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `farmos_medicines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `kind` varchar(20) NOT NULL DEFAULT 'med',
  `quantity` decimal(12,2) NOT NULL DEFAULT '0',
  `unit` varchar(30) DEFAULT NULL,
  `min_quantity` decimal(12,2) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_medicines_org_kind` (`organization_id`, `kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `farmos_treatments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `animal_id` bigint NOT NULL,
  `medicine_id` bigint DEFAULT NULL,
  `disease` varchar(255) DEFAULT NULL,
  `medicine_name` varchar(255) DEFAULT NULL,
  `dosage` varchar(255) DEFAULT NULL,
  `route` varchar(50) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `vet` varchar(255) DEFAULT NULL,
  `withdrawal_meat_days` int DEFAULT NULL,
  `withdrawal_milk_hours` int DEFAULT NULL,
  `withdrawal_eggs_days` int DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'running',
  `notes` text DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_treatments_org_animal` (`organization_id`, `animal_id`),
  KEY `idx_farmos_treatments_status` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `farmos_sales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `animal_id` bigint DEFAULT NULL,
  `species` varchar(50) DEFAULT NULL,
  `product_type` varchar(50) DEFAULT NULL,
  `quantity` decimal(12,2) NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `unit_price` decimal(15,2) DEFAULT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `currency_id` bigint DEFAULT NULL,
  `buyer` varchar(255) DEFAULT NULL,
  `sale_date` date NOT NULL,
  `transaction_id` bigint DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_sales_org_date` (`organization_id`, `sale_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `farmos_expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `category` varchar(50) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `quantity` decimal(12,2) DEFAULT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `currency_id` bigint DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `expense_date` date NOT NULL,
  `transaction_id` bigint DEFAULT NULL,
  `related_animal_id` bigint DEFAULT NULL,
  `related_medicine_id` bigint DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_expenses_org_date` (`organization_id`, `expense_date`),
  KEY `idx_farmos_expenses_category` (`organization_id`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `farmos_reproduction_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `animal_id` bigint NOT NULL,
  `event_type` varchar(50) NOT NULL,
  `event_date` date NOT NULL,
  `partner_external_id` varchar(100) DEFAULT NULL,
  `expected_due_date` date DEFAULT NULL,
  `offspring_count` int DEFAULT NULL,
  `outcome` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_repro_org_animal` (`organization_id`, `animal_id`),
  KEY `idx_farmos_repro_type` (`organization_id`, `event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
