-- Coupons de reduction pour reservations temporaires Domus (type hotel). Un
-- coupon = code reutilisable, remise en pourcentage OU montant fixe, avec plage
-- de validite et quota d usage optionnels. Applique a une reservation, il baisse
-- le total NET comptabilise au check-out.

CREATE TABLE IF NOT EXISTS `real_estate_coupons` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `code` varchar(64) NOT NULL,
  `description` varchar(255),
  `discount_type` varchar(16) NOT NULL DEFAULT 'percentage',
  `discount_value` decimal(15,2) NOT NULL DEFAULT '0',
  `currency_id` bigint,
  `valid_from` date,
  `valid_to` date,
  `max_uses` int,
  `used_count` int NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp DEFAULT (now()),
  `updated_at` timestamp DEFAULT (now()) ON UPDATE now(),
  UNIQUE KEY `uq_real_estate_coupons_code` (`organization_id`, `code`),
  INDEX `idx_real_estate_coupons_org` (`organization_id`, `is_active`)
);
--> statement-breakpoint
ALTER TABLE `real_estate_reservations` ADD COLUMN `coupon_id` bigint;
--> statement-breakpoint
ALTER TABLE `real_estate_reservations` ADD COLUMN `discount_amount` decimal(15,2) NOT NULL DEFAULT '0';
