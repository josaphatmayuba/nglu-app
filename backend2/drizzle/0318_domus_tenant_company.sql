-- Domus : locataire personne morale (entreprise) sur tenant_details.
-- tenant_type = individual | company. Colonnes entreprise et representant legal en NULL.
-- Champs personne physique rendus NULL (validation applicative selon tenant_type).
-- Idempotent, rejoue a chaque boot, aucune donnee inseree ni modifiee.
SET @c_tenant_type := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'tenant_type');
--> statement-breakpoint
SET @sql := IF(@c_tenant_type = 0, 'ALTER TABLE `tenant_details` ADD COLUMN `tenant_type` varchar(20) NOT NULL DEFAULT ''individual'' AFTER `customer_id`', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @c_company_name := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'company_name');
--> statement-breakpoint
SET @sql := IF(@c_company_name = 0, 'ALTER TABLE `tenant_details` ADD COLUMN `company_name` varchar(255) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @c_legal_form := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'legal_form');
--> statement-breakpoint
SET @sql := IF(@c_legal_form = 0, 'ALTER TABLE `tenant_details` ADD COLUMN `legal_form` varchar(100) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @c_rccm := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'rccm');
--> statement-breakpoint
SET @sql := IF(@c_rccm = 0, 'ALTER TABLE `tenant_details` ADD COLUMN `rccm` varchar(100) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @c_company_national_id := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'company_national_id');
--> statement-breakpoint
SET @sql := IF(@c_company_national_id = 0, 'ALTER TABLE `tenant_details` ADD COLUMN `company_national_id` varchar(100) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @c_tax_id := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'tax_id');
--> statement-breakpoint
SET @sql := IF(@c_tax_id = 0, 'ALTER TABLE `tenant_details` ADD COLUMN `tax_id` varchar(100) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @c_company_address := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'company_address');
--> statement-breakpoint
SET @sql := IF(@c_company_address = 0, 'ALTER TABLE `tenant_details` ADD COLUMN `company_address` varchar(500) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @c_representative_name := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'representative_name');
--> statement-breakpoint
SET @sql := IF(@c_representative_name = 0, 'ALTER TABLE `tenant_details` ADD COLUMN `representative_name` varchar(255) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @c_representative_title := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'representative_title');
--> statement-breakpoint
SET @sql := IF(@c_representative_title = 0, 'ALTER TABLE `tenant_details` ADD COLUMN `representative_title` varchar(255) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @c_representative_phone := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'representative_phone');
--> statement-breakpoint
SET @sql := IF(@c_representative_phone = 0, 'ALTER TABLE `tenant_details` ADD COLUMN `representative_phone` varchar(50) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @c_representative_email := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'representative_email');
--> statement-breakpoint
SET @sql := IF(@c_representative_email = 0, 'ALTER TABLE `tenant_details` ADD COLUMN `representative_email` varchar(255) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @c_representative_id_number := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'representative_id_number');
--> statement-breakpoint
SET @sql := IF(@c_representative_id_number = 0, 'ALTER TABLE `tenant_details` ADD COLUMN `representative_id_number` varchar(100) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
-- Champs personne physique : passage en NULL en reprenant le type, la collation et un eventuel DEFAULT reels.
SET @n_birth_date := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'birth_date' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_birth_date > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `birth_date` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'birth_date' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @n_sex := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'sex' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_sex > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `sex` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'sex' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @n_nationality := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'nationality' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_nationality > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `nationality` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'nationality' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @n_marital_status := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'marital_status' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_marital_status > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `marital_status` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'marital_status' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @n_origin_province := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'origin_province' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_origin_province > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `origin_province` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'origin_province' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @n_contacted_person := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'contacted_person' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_contacted_person > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `contacted_person` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'contacted_person' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @n_contacted_person_phone_number := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'contacted_person_phone_number' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_contacted_person_phone_number > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `contacted_person_phone_number` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'contacted_person_phone_number' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @n_prossional_status := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'prossional_status' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_prossional_status > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `prossional_status` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'prossional_status' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @n_main_activity := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'main_activity' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_main_activity > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `main_activity` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'main_activity' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @n_entity_name := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'entity_name' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_entity_name > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `entity_name` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'entity_name' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @n_entity_address := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'entity_address' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_entity_address > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `entity_address` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'entity_address' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @n_contract_type := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'contract_type' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_contract_type > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `contract_type` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'contract_type' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @n_monthly_pay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'monthly_pay' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_monthly_pay > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `monthly_pay` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'monthly_pay' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @n_occupant_number := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'occupant_number' AND IS_NULLABLE = 'NO');
--> statement-breakpoint
SET @sql := IF(@n_occupant_number > 0, COALESCE((SELECT CONCAT('ALTER TABLE `tenant_details` MODIFY COLUMN `occupant_number` ', COLUMN_TYPE, IF(COLLATION_NAME IS NULL, '', CONCAT(' COLLATE ', COLLATION_NAME)), ' NULL', IF(COLUMN_DEFAULT IS NULL, '', IF(EXTRA LIKE '%DEFAULT_GENERATED%', CONCAT(' DEFAULT (', COLUMN_DEFAULT, ')'), CONCAT(' DEFAULT ', QUOTE(COLUMN_DEFAULT))))) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND COLUMN_NAME = 'occupant_number' LIMIT 1), 'SELECT 1'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
-- Index de recherche entreprise (non uniques).
SET @i_rccm := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND INDEX_NAME = 'idx_tenant_details_rccm');
--> statement-breakpoint
SET @sql := IF(@i_rccm = 0, 'CREATE INDEX `idx_tenant_details_rccm` ON `tenant_details` (`rccm`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @i_tax_id := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_details' AND INDEX_NAME = 'idx_tenant_details_tax_id');
--> statement-breakpoint
SET @sql := IF(@i_tax_id = 0, 'CREATE INDEX `idx_tenant_details_tax_id` ON `tenant_details` (`tax_id`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
