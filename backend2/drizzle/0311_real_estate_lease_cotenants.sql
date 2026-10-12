-- Domus : locataires supplementaires du bail (1..N personnes par bail).
-- Le locataire principal reste dans real_estate_leases.tenant_id (inchange) ;
-- cette table ne porte que les autres locataires (customer_id = customers.id).
-- FK logiques sans contrainte physique. Suppression logique via is_active.
-- Idempotent via CREATE TABLE IF NOT EXISTS, aucun seed.
CREATE TABLE IF NOT EXISTS `real_estate_lease_cotenants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL,
  `lease_id` bigint NOT NULL,
  `customer_id` bigint NOT NULL,
  `position` int NOT NULL DEFAULT 1,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lease_cotenant` (`lease_id`, `customer_id`),
  KEY `idx_cotenant_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
