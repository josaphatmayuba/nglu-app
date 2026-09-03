-- KodaTill Phase 2 (SCRUM-286 / epic SCRUM-278) : ingredients, fiches recettes et
-- lignes de recette. Permet de calculer le cout de revient dun produit vendu
-- (kt_products.cost_mode = recipe, pose en 0237).
--
-- kt_ingredients distingue lunite dachat (purchase_unit : kg, L, piece) de
-- lunite de consommation (base_unit : g, ml, piece). unit_factor est le facteur de
-- conversion purchase_unit vers base_unit, par exemple 1000 pour kg vers g ou 1
-- pour piece vers piece. purchase_price est le prix pour UNE unite dachat, donc
-- le cout unitaire en base_unit vaut purchase_price / unit_factor.
--
-- kt_recipes porte une recette par produit : la cle unique
-- (organization_id, product_id) interdit les doublons. waste_pct couvre les
-- pertes de preparation, consumable_pct les consommables non traces
-- (emballage, gaz). computed_cost est un simple cache du dernier calcul, il peut
-- etre NULL et doit toujours pouvoir etre recalcule depuis les lignes.
--
-- kt_recipe_lines exprime les quantites en base_unit de lingredient (qty_base)
-- pour eviter toute conversion au moment du calcul de cout. La table na pas
-- detat metier ni de soft delete propre : une ligne retiree dune recette est
-- physiquement supprimee et remplacee, la recette parente restant lentite
-- soft deletee.
--
-- Conventions projet : un seul statement par breakpoint, aucune apostrophe dans
-- les commentaires, aucune donnee de demonstration inseree.
CREATE TABLE IF NOT EXISTS `kt_ingredients` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `name` VARCHAR(160) NOT NULL,
  `purchase_unit` ENUM('kg','L','piece') NOT NULL DEFAULT 'kg',
  `base_unit` ENUM('g','ml','piece') NOT NULL DEFAULT 'g',
  `unit_factor` DECIMAL(14,4) NOT NULL DEFAULT 1.0000,
  `purchase_price` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `currency_code` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `current_qty` DECIMAL(14,3) NOT NULL DEFAULT 0.000,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_ingredients_org` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_recipes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `waste_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `consumable_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `computed_cost` DECIMAL(14,2) NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kt_recipes_org_product` (`organization_id`, `product_id`),
  KEY `idx_kt_recipes_org` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_recipe_lines` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `recipe_id` BIGINT UNSIGNED NOT NULL,
  `ingredient_id` BIGINT UNSIGNED NOT NULL,
  `qty_base` DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_recipe_lines_recipe` (`recipe_id`),
  KEY `idx_kt_recipe_lines_ingredient` (`ingredient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
