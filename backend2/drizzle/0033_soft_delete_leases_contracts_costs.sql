-- SCRUM-61: soft-delete for leases, contracts, contract templates and maintenance costs
-- All user-facing delete actions must be logical (DEVELOPMENT_RULES.md)
ALTER TABLE `real_estate_maintenance_costs` ADD COLUMN `is_active` tinyint(1) NOT NULL DEFAULT 1;
ALTER TABLE `real_estate_contract_templates` ADD COLUMN `is_deleted` tinyint(1) NOT NULL DEFAULT 0;
