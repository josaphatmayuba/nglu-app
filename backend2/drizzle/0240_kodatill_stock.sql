-- KodaTill Phase 2 (SCRUM-286 / epic SCRUM-278) : stock par succursale, mouvements
-- de stock et depenses. Suite de 0237_kodatill_core / 0238_kodatill_orders /
-- 0239_kodatill_cash.
--
-- kt_stock_items porte le stock reel dun produit dans une succursale donnee : la
-- cle unique (organization_id, branch_id, product_id) garantit une seule ligne de
-- stock par couple produit/succursale et permet un UPSERT atomique lors des
-- ventes. purchase_price / sale_price sont nullables : quand ils restent NULL le
-- service retombe sur les prix du catalogue kt_products.
--
-- kt_stock_movements est le journal append-only des variations. qty_after stocke
-- le solde apres application du mouvement afin de pouvoir auditer un ecart sans
-- rejouer tout lhistorique. ref_type / ref_id sont un lien polymorphe volontaire
-- vers lorigine du mouvement (order, expense, transfert) sans contrainte FK, pour
-- ne pas coupler le journal a des tables qui pourront evoluer.
--
-- kt_expenses.ledger_entry_id reste NULL tant que le branchement comptable
-- ERP/SIFA de la Phase 5 nest pas fait : la colonne est posee des maintenant pour
-- eviter un ALTER sur une table deja volumineuse plus tard, comme sur
-- kt_cash_sessions.
--
-- Aucune de ces tables na detat metier : status reste donc le soft delete projet
-- et aucune colonne detat concurrent nest introduite.
--
-- Conventions projet : un seul statement par breakpoint, aucune apostrophe dans
-- les commentaires, aucune donnee de demonstration inseree.
CREATE TABLE IF NOT EXISTS `kt_stock_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `qty` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `reorder_threshold` DECIMAL(14,3) NULL,
  `purchase_price` DECIMAL(14,2) NULL,
  `sale_price` DECIMAL(14,2) NULL,
  `currency_code` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kt_stock_items_org_branch_product` (`organization_id`, `branch_id`, `product_id`),
  KEY `idx_kt_stock_items_org_branch` (`organization_id`, `branch_id`),
  KEY `idx_kt_stock_items_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_stock_movements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `stock_item_id` BIGINT UNSIGNED NOT NULL,
  `type` ENUM('in','out','sale','adjust','loss','transfer') NOT NULL DEFAULT 'in',
  `qty` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `qty_after` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `reason` VARCHAR(255) NULL,
  `supplier_name` VARCHAR(160) NULL,
  `ref_type` VARCHAR(40) NULL,
  `ref_id` BIGINT NULL,
  `user_id` BIGINT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_stock_movements_item_created` (`stock_item_id`, `created_at`),
  KEY `idx_kt_stock_movements_org_type` (`organization_id`, `type`),
  KEY `idx_kt_stock_movements_ref` (`ref_type`, `ref_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_expense_categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `name` VARCHAR(160) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_expense_categories_org` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_expenses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `branch_id` BIGINT UNSIGNED NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `currency_code` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `expense_date` DATE NOT NULL,
  `note` TEXT NULL,
  `attachment_url` TEXT NULL,
  `user_id` BIGINT NULL,
  `ledger_entry_id` BIGINT NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_expenses_org_branch_date` (`organization_id`, `branch_id`, `expense_date`),
  KEY `idx_kt_expenses_category` (`category_id`),
  KEY `idx_kt_expenses_org_status` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
