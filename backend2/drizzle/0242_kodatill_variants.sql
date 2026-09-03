-- KodaTill Phase 2 (SCRUM-286 / epic SCRUM-278) : variantes de produit,
-- groupes de modificateurs et prix par succursale.
--
-- kt_product_variants declinaisons dun meme produit (taille, format, couleur).
-- price_delta est un ecart signe applique au prix de base du produit, ce qui
-- evite de dupliquer un prix complet par variante et garde une seule source de
-- verite tarifaire. kt_order_lines.variant_id, pose des 0238, pointe ici.
--
-- kt_modifier_groups et kt_modifiers portent les options de vente (supplements,
-- cuisson, sauces). min_select et max_select encadrent le nombre de choix
-- autorises dans un groupe, la validation reste applicative.
--
-- kt_product_modifier_groups est une simple table de jointure produit vers
-- groupe. Elle na ni organization_id ni soft delete : lorganisation est portee
-- par les deux cotes de la relation et un rattachement retire est reellement
-- supprime, la desactivation durable se faisant sur le groupe lui meme.
--
-- kt_product_branch_prices permet un prix de vente different par succursale.
-- La cle unique (organization_id, product_id, branch_id) garantit un seul prix
-- actif par couple et permet un UPSERT atomique. En labsence de ligne, le prix
-- du catalogue kt_products sapplique.
--
-- Aucune de ces tables na detat metier : status reste le soft delete projet.
--
-- Conventions projet : un seul statement par breakpoint, aucune apostrophe dans
-- les commentaires, aucune donnee de demonstration inseree.
CREATE TABLE IF NOT EXISTS `kt_product_variants` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `price_delta` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `sku` VARCHAR(80) NULL,
  `barcode` VARCHAR(64) NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_product_variants_product` (`product_id`, `status`),
  KEY `idx_kt_product_variants_org` (`organization_id`, `status`),
  KEY `idx_kt_product_variants_barcode` (`organization_id`, `barcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_modifier_groups` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `name` VARCHAR(160) NOT NULL,
  `min_select` INT NOT NULL DEFAULT 0,
  `max_select` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_modifier_groups_org` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_modifiers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `group_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `price_delta` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_modifiers_group` (`group_id`, `status`),
  KEY `idx_kt_modifiers_org` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_product_modifier_groups` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `group_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kt_product_modifier_groups` (`product_id`, `group_id`),
  KEY `idx_kt_product_modifier_groups_group` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_product_branch_prices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `sale_price` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `currency_code` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kt_product_branch_prices` (`organization_id`, `product_id`, `branch_id`),
  KEY `idx_kt_product_branch_prices_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
