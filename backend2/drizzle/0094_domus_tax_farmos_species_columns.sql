-- Idempotent (rejouable à chaque boot via OPERATIONAL_REPAIR_MIGRATIONS, idx >= 70).
-- Régularise des colonnes ajoutées à la main en dev mais jamais migrées (drift dev->prod) :
--  * Domus : real_estate_leases.tax_* et real_estate_rent_payments.tax_* (taxe par bail)
--  * FarmOS : farmos_medicines.species (espèces ciblées par un médicament)
-- Sans ces colonnes, les dashboards Domus et FarmOS renvoient 500 (Unknown column).
-- Pattern SET/IF + PREPARE/EXECUTE compatible splitSqlStatements (1 instruction / breakpoint).

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='real_estate_leases' AND COLUMN_NAME='tax_name');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `tax_name` varchar(255) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='real_estate_leases' AND COLUMN_NAME='tax_type');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `tax_type` varchar(20) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='real_estate_leases' AND COLUMN_NAME='tax_value');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `tax_value` decimal(15,4) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='real_estate_leases' AND COLUMN_NAME='tax_apply_mode');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `tax_apply_mode` varchar(20) NOT NULL DEFAULT ''never''', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='real_estate_rent_payments' AND COLUMN_NAME='tax_amount');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `tax_amount` decimal(15,2) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='real_estate_rent_payments' AND COLUMN_NAME='tax_name');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `tax_name` varchar(255) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_medicines' AND COLUMN_NAME='species');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `farmos_medicines` ADD COLUMN `species` json NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
