-- KodaTill (SCRUM-279) : commandes, lignes, paiements et historique de statut.
--
-- Points de conception :
--   kt_order_counters porte la numerotation quotidienne par succursale. La cle
--   unique (organization_id, branch_id, day) permet un UPSERT atomique du
--   compteur sans table de sequence globale, et remet le numero a 1 chaque jour.
--   kt_orders.public_ref est un token opaque (non devinable) expose dans les
--   liens QR et les tickets, distinct du numero de commande lisible.
--   kt_orders.client_uuid + cle unique (organization_id, client_uuid) rendent la
--   creation de commande idempotente : le futur mode hors ligne peut rejouer sa
--   file de synchro sans creer de doublons.
--   Les lignes stockent un snapshot du nom, du prix et du cout unitaire : le
--   ticket et la marge historique restent exacts meme si le catalogue change.
--   kt_payment_methods.kind = card couvre aussi bien la carte bancaire physique
--   que le sans-contact NFC (PayPass, tap-to-pay, Google Pay, Apple Pay) : c est
--   une transaction EMV contactless du point de vue du terminal, que le support
--   soit une carte ou le portefeuille du telephone. gateway_code precise le
--   detail (ex: contactless, googlepay, applepay) sans ajouter de colonne.
--
-- Conventions projet : organization_id par defaut 1, soft delete via status,
-- created_at / updated_at, un seul statement par breakpoint, aucune apostrophe
-- dans les commentaires, aucune donnee de demonstration.
CREATE TABLE IF NOT EXISTS `kt_order_counters` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `day` DATE NOT NULL,
  `last_number` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kt_order_counters_day` (`organization_id`, `branch_id`, `day`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `register_id` BIGINT UNSIGNED NULL,
  `order_number` INT NOT NULL DEFAULT 0,
  `public_ref` VARCHAR(64) NOT NULL,
  `channel` ENUM('pos','qr','mobile','kitchen') NOT NULL DEFAULT 'pos',
  `table_id` BIGINT NULL,
  `customer_name` VARCHAR(160) NULL,
  `customer_phone` VARCHAR(40) NULL,
  `order_status` ENUM('draft','received','preparing','ready','served','completed','cancelled') NOT NULL DEFAULT 'draft',
  `subtotal` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `discount_total` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `tax_total` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `service_total` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `currency_code` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `paid_total` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `due_total` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `opened_by_user_id` BIGINT NULL,
  `closed_at` DATETIME NULL,
  `client_uuid` VARCHAR(36) NOT NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kt_orders_public_ref` (`public_ref`),
  UNIQUE KEY `uq_kt_orders_client_uuid` (`organization_id`, `client_uuid`),
  KEY `idx_kt_orders_org_branch_created` (`organization_id`, `branch_id`, `created_at`),
  KEY `idx_kt_orders_org_status` (`organization_id`, `order_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_order_lines` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NULL,
  `variant_id` BIGINT NULL,
  `name` VARCHAR(255) NOT NULL,
  `qty` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `unit_price` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `line_discount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `line_total` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `currency_code` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `unit_cost` DECIMAL(14,2) NULL,
  `note` TEXT NULL,
  `kitchen_status` ENUM('pending','preparing','ready','served') NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_order_lines_order` (`order_id`),
  KEY `idx_kt_order_lines_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_payment_methods` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `name` VARCHAR(120) NOT NULL,
  `kind` ENUM('cash','card','mobile','voucher','credit') NOT NULL DEFAULT 'cash',
  `gateway_code` VARCHAR(60) NULL,
  `requires_reference` TINYINT NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_payment_methods_org` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `method_id` BIGINT UNSIGNED NULL,
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `currency_code` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `reference` VARCHAR(160) NULL,
  `gateway_status` VARCHAR(60) NULL,
  `gateway_payload` JSON NULL,
  `received_at` DATETIME NULL,
  `user_id` BIGINT NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_payments_order` (`order_id`),
  KEY `idx_kt_payments_org` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_order_status_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `from_status` VARCHAR(40) NULL,
  `to_status` VARCHAR(40) NOT NULL,
  `user_id` BIGINT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_order_status_history_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
