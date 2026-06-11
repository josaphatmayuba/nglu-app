-- Idempotent. Module Procurement + Stock ERP/SIFA (le A de SIFA = Approvisionnement).
-- Chaine : bon de commande -> reception -> mouvement de stock -> facture (existante).
-- Commentaires sans apostrophe (cf splitSqlStatements / piege apostrophe).
CREATE TABLE IF NOT EXISTS `warehouses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `code` varchar(32) NULL,
  `site_id` bigint NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wh_org` (`organization_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `warehouse_id` bigint unsigned NOT NULL,
  `product_id` bigint NOT NULL,
  `movement_type` varchar(16) NOT NULL,
  `quantity` decimal(18,3) NOT NULL,
  `unit_cost` decimal(18,2) NULL,
  `reference` varchar(64) NULL,
  `source_module` varchar(64) NULL,
  `related_id` varchar(64) NULL,
  `note` varchar(255) NULL,
  `created_by` bigint NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sm_org` (`organization_id`),
  KEY `idx_sm_wh_product` (`warehouse_id`, `product_id`),
  KEY `idx_sm_related` (`source_module`, `related_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `reference` varchar(64) NULL,
  `supplier_id` bigint NULL,
  `warehouse_id` bigint unsigned NULL,
  `status` varchar(16) NOT NULL DEFAULT 'draft',
  `currency_id` bigint NULL,
  `total_amount` decimal(18,2) NOT NULL DEFAULT 0,
  `expected_date` date NULL,
  `note` varchar(255) NULL,
  `created_by` bigint NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_po_org` (`organization_id`),
  KEY `idx_po_status` (`organization_id`, `status`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `purchase_order_lines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `purchase_order_id` bigint unsigned NOT NULL,
  `product_id` bigint NOT NULL,
  `quantity` decimal(18,3) NOT NULL,
  `unit_price` decimal(18,2) NOT NULL DEFAULT 0,
  `received_quantity` decimal(18,3) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pol_po` (`purchase_order_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `goods_receipts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `purchase_order_id` bigint unsigned NOT NULL,
  `warehouse_id` bigint unsigned NOT NULL,
  `reference` varchar(64) NULL,
  `received_by` bigint NULL,
  `received_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gr_po` (`purchase_order_id`),
  KEY `idx_gr_org` (`organization_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `goods_receipt_lines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `goods_receipt_id` bigint unsigned NOT NULL,
  `purchase_order_line_id` bigint unsigned NULL,
  `product_id` bigint NOT NULL,
  `quantity` decimal(18,3) NOT NULL,
  `unit_cost` decimal(18,2) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_grl_gr` (`goods_receipt_id`)
);
