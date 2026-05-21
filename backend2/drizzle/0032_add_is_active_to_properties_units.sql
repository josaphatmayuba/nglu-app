-- SCRUM-108: soft-delete for real_estate_properties and real_estate_units
-- is_active=false replaces physical DELETE (DEVELOPMENT_RULES.md: suppression logique uniquement)
ALTER TABLE `real_estate_properties` ADD COLUMN `is_active` tinyint(1) NOT NULL DEFAULT 1;
ALTER TABLE `real_estate_units`      ADD COLUMN `is_active` tinyint(1) NOT NULL DEFAULT 1;
