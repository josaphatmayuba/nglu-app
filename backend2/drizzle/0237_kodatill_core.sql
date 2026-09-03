-- KodaTill (SCRUM-279 / epic SCRUM-278) : fondation du systeme de caisse POS
-- multi-activite (restaurant, supermarche, pharmacie, quincaillerie, boutique).
-- Prefixe kt_ pour isoler le domaine des tables produit/stock historiques.
--
-- Conventions projet respectees :
--   organization_id BIGINT NOT NULL DEFAULT 1 sur toutes les tables,
--   soft delete via status (jamais de DELETE physique),
--   created_at / updated_at systematiques,
--   un seul statement par breakpoint (sinon ER_PARSE_ERROR au boot),
--   aucune apostrophe dans les commentaires (le splitter suit les quotes),
--   aucune donnee de demonstration inseree (regle projet : pas de seed).
--
-- Choix documente sur kt_products.barcode : MySQL 8 ne supporte pas les index
-- uniques partiels (WHERE barcode IS NOT NULL). Un UNIQUE simple sur
-- (organization_id, barcode) serait acceptable car MySQL autorise plusieurs
-- NULL dans un index unique, MAIS le catalogue POS accepte des produits sans
-- code-barres ET des re-saisies temporaires, donc on retient un index NON
-- unique (recherche par scan, critere de volumetrie demande par l architecte)
-- et l unicite est controlee au niveau applicatif (service catalogue) avec un
-- message utilisateur explicite. Cela evite un echec de migration sur une base
-- existante contenant des doublons et laisse la porte ouverte a un passage en
-- UNIQUE plus tard, apres nettoyage.
CREATE TABLE IF NOT EXISTS `kt_business_profiles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `activity_type` ENUM('restaurant','supermarket','pharmacy','hardware','shop') NOT NULL DEFAULT 'shop',
  `enabled_modules` JSON NULL,
  `default_currency_code` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `tax_mode` VARCHAR(20) NOT NULL DEFAULT 'exclusive',
  `receipt_footer` TEXT NULL,
  `service_charge_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_business_profiles_org` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_branches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `name` VARCHAR(160) NOT NULL,
  `address` VARCHAR(255) NULL,
  `phone` VARCHAR(40) NULL,
  `timezone` VARCHAR(64) NOT NULL DEFAULT 'Africa/Kinshasa',
  `is_default` TINYINT NOT NULL DEFAULT 0,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_branches_org` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_registers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `device_label` VARCHAR(160) NULL,
  `pairing_code` VARCHAR(6) NULL,
  `paired_until` DATETIME NULL,
  `last_seen_at` DATETIME NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_registers_org` (`organization_id`, `status`),
  KEY `idx_kt_registers_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `name` VARCHAR(160) NOT NULL,
  `icon` VARCHAR(80) NULL,
  `color_class` VARCHAR(80) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `parent_id` BIGINT UNSIGNED NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_categories_org` (`organization_id`, `status`),
  KEY `idx_kt_categories_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `category_id` BIGINT UNSIGNED NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `sku` VARCHAR(80) NULL,
  `barcode` VARCHAR(64) NULL,
  `photo_url` TEXT NULL,
  `emoji_fallback` VARCHAR(16) NULL,
  `sale_price` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `purchase_cost` DECIMAL(14,2) NULL,
  `currency_code` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `cost_mode` ENUM('manual','recipe') NOT NULL DEFAULT 'manual',
  `tax_rate_id` BIGINT NULL,
  `is_available` TINYINT NOT NULL DEFAULT 1,
  `track_stock` TINYINT NOT NULL DEFAULT 0,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_products_org` (`organization_id`, `status`),
  KEY `idx_kt_products_category` (`category_id`),
  KEY `idx_kt_products_barcode` (`organization_id`, `barcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_staff_profiles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `user_id` BIGINT NOT NULL,
  `branch_id` BIGINT UNSIGNED NULL,
  `pos_role` ENUM('admin','manager','cashier','waiter','chef') NOT NULL DEFAULT 'cashier',
  `pin_hash` VARCHAR(255) NULL,
  `pin_updated_at` DATETIME NULL,
  `can_discount` TINYINT NOT NULL DEFAULT 0,
  `max_discount_pct` DECIMAL(5,2) NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kt_staff_org_user` (`organization_id`, `user_id`),
  KEY `idx_kt_staff_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
