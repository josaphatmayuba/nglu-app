-- Reservation temporaire type hotel dans Domus : un client occupe un bien entier
-- OU une unite sur une plage de dates, au tarif par jour. Independant du bail
-- longue duree (real_estate_leases). Recette comptabilisee au check-out.

CREATE TABLE IF NOT EXISTS `real_estate_reservations` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `reference` varchar(255) NOT NULL,
  `property_id` bigint NOT NULL,
  `unit_id` bigint,
  `guest_name` varchar(255) NOT NULL,
  `guest_phone` varchar(50),
  `guest_email` varchar(255),
  `tenant_id` bigint,
  `check_in` date NOT NULL,
  `check_out` date NOT NULL,
  `days` int NOT NULL DEFAULT 1,
  `daily_rate` decimal(15,2) NOT NULL DEFAULT '0',
  `total_amount` decimal(15,2) NOT NULL DEFAULT '0',
  `currency_id` bigint,
  `deposit_amount` decimal(15,2) NOT NULL DEFAULT '0',
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `transaction_id` bigint,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp DEFAULT (now()),
  `updated_at` timestamp DEFAULT (now()) ON UPDATE now(),
  INDEX `idx_real_estate_reservations_property` (`property_id`, `unit_id`, `is_active`),
  INDEX `idx_real_estate_reservations_status` (`status`, `is_active`),
  INDEX `idx_real_estate_reservations_dates` (`property_id`, `check_in`, `check_out`),
  INDEX `idx_real_estate_reservations_org` (`organization_id`, `is_active`)
);
