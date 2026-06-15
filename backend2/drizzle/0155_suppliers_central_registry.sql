-- Enrichit le referentiel central fournisseurs (table supplier) avec les champs metier
-- et relie BatiPro Materiaux au fournisseur central via supplier_id (fin du texte libre).
ALTER TABLE `supplier` ADD COLUMN `supplier_type` varchar(50) NOT NULL DEFAULT 'general';
--> statement-breakpoint
ALTER TABLE `supplier` ADD COLUMN `contact_person` varchar(255) NULL;
--> statement-breakpoint
ALTER TABLE `supplier` ADD COLUMN `rccm` varchar(100) NULL;
--> statement-breakpoint
ALTER TABLE `supplier` ADD COLUMN `national_id` varchar(100) NULL;
--> statement-breakpoint
ALTER TABLE `supplier` ADD COLUMN `tax_id` varchar(100) NULL;
--> statement-breakpoint
ALTER TABLE `supplier` ADD COLUMN `payment_terms` varchar(100) NULL;
--> statement-breakpoint
ALTER TABLE `supplier` ADD COLUMN `notes` text NULL;
--> statement-breakpoint
ALTER TABLE `batipro_materials` ADD COLUMN `supplier_id` bigint NULL;
--> statement-breakpoint
CREATE INDEX `idx_batipro_materials_supplier_id` ON `batipro_materials` (`supplier_id`);
--> statement-breakpoint
ALTER TABLE `real_estate_maintenance_costs` ADD COLUMN `supplier_id` bigint NULL;
--> statement-breakpoint
CREATE INDEX `idx_re_maintenance_costs_supplier_id` ON `real_estate_maintenance_costs` (`supplier_id`);
--> statement-breakpoint
ALTER TABLE `farmos_medicines` ADD COLUMN `supplier_id` bigint NULL;
--> statement-breakpoint
CREATE INDEX `idx_farmos_medicines_supplier_id` ON `farmos_medicines` (`supplier_id`);
