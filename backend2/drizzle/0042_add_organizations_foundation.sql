CREATE TABLE IF NOT EXISTS `organizations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `organizations_slug_unique` (`slug`)
);

INSERT INTO `organizations` (`id`, `name`, `slug`, `status`, `created_at`, `updated_at`)
VALUES (1, 'Default Organization', 'default', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `status` = VALUES(`status`),
  `updated_at` = CURRENT_TIMESTAMP;

ALTER TABLE `sessions` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `role_id`;
ALTER TABLE `users` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `customer` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `transaction` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `product` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `saleInvoice` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `purchaseInvoice` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `real_estate_properties` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `real_estate_units` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `real_estate_leases` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `real_estate_rent_payments` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `real_estate_maintenance_requests` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `real_estate_maintenance_costs` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `real_estate_contracts` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;
ALTER TABLE `real_estate_contract_templates` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1 AFTER `id`;

CREATE INDEX `sessions_organization_id_idx` ON `sessions` (`organization_id`);
CREATE INDEX `users_organization_id_idx` ON `users` (`organization_id`);
CREATE INDEX `customer_organization_id_idx` ON `customer` (`organization_id`);
CREATE INDEX `transaction_organization_id_idx` ON `transaction` (`organization_id`);
CREATE INDEX `product_organization_id_idx` ON `product` (`organization_id`);
CREATE INDEX `saleInvoice_organization_id_idx` ON `saleInvoice` (`organization_id`);
CREATE INDEX `purchaseInvoice_organization_id_idx` ON `purchaseInvoice` (`organization_id`);
CREATE INDEX `real_estate_properties_organization_id_idx` ON `real_estate_properties` (`organization_id`);
CREATE INDEX `real_estate_units_organization_id_idx` ON `real_estate_units` (`organization_id`);
CREATE INDEX `real_estate_leases_organization_id_idx` ON `real_estate_leases` (`organization_id`);
CREATE INDEX `real_estate_rent_payments_organization_id_idx` ON `real_estate_rent_payments` (`organization_id`);
CREATE INDEX `real_estate_maintenance_requests_organization_id_idx` ON `real_estate_maintenance_requests` (`organization_id`);
CREATE INDEX `real_estate_maintenance_costs_organization_id_idx` ON `real_estate_maintenance_costs` (`organization_id`);
CREATE INDEX `real_estate_contracts_organization_id_idx` ON `real_estate_contracts` (`organization_id`);
CREATE INDEX `real_estate_contract_templates_organization_id_idx` ON `real_estate_contract_templates` (`organization_id`);
