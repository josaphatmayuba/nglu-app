-- Bug 20 Lot 1 RH : colonnes d argent passees de DOUBLE a DECIMAL(18,2) exact.
-- Nullabilite et defaut conserves a l identique. Idempotent : ne modifie que si la colonne est encore en double.
-- Aucune donnee inseree. Les taux, heures, jours et scores restent en double.
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_payrolls' AND COLUMN_NAME = 'baseSalary' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_payrolls` MODIFY COLUMN `baseSalary` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_payrolls' AND COLUMN_NAME = 'transportAllowance' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_payrolls` MODIFY COLUMN `transportAllowance` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_payrolls' AND COLUMN_NAME = 'housingAllowance' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_payrolls` MODIFY COLUMN `housingAllowance` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_payrolls' AND COLUMN_NAME = 'riskAllowance' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_payrolls` MODIFY COLUMN `riskAllowance` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_payrolls' AND COLUMN_NAME = 'otherAllowances' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_payrolls` MODIFY COLUMN `otherAllowances` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_payrolls' AND COLUMN_NAME = 'overtimeAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_payrolls` MODIFY COLUMN `overtimeAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_payrolls' AND COLUMN_NAME = 'unpaidAbsenceDeduction' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_payrolls` MODIFY COLUMN `unpaidAbsenceDeduction` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_payrolls' AND COLUMN_NAME = 'advanceDeduction' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_payrolls` MODIFY COLUMN `advanceDeduction` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_payrolls' AND COLUMN_NAME = 'taxAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_payrolls` MODIFY COLUMN `taxAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_payrolls' AND COLUMN_NAME = 'cnssAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_payrolls` MODIFY COLUMN `cnssAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_payrolls' AND COLUMN_NAME = 'otherDeductions' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_payrolls` MODIFY COLUMN `otherDeductions` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_payrolls' AND COLUMN_NAME = 'grossSalary' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_payrolls` MODIFY COLUMN `grossSalary` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_payrolls' AND COLUMN_NAME = 'netSalary' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_payrolls` MODIFY COLUMN `netSalary` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'baseSalary' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_contracts` MODIFY COLUMN `baseSalary` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'transportAllowance' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_contracts` MODIFY COLUMN `transportAllowance` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'housingAllowance' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_contracts` MODIFY COLUMN `housingAllowance` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'stipend' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_contracts` MODIFY COLUMN `stipend` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'contractAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_contracts` MODIFY COLUMN `contractAmount` DECIMAL(18,2) NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salary_histories' AND COLUMN_NAME = 'salary' AND DATA_TYPE = 'double'), 'ALTER TABLE `salary_histories` MODIFY COLUMN `salary` DECIMAL(18,2) NOT NULL', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_projects' AND COLUMN_NAME = 'hrBudget' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_projects` MODIFY COLUMN `hrBudget` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_project_assignments' AND COLUMN_NAME = 'monthlyCost' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_project_assignments` MODIFY COLUMN `monthlyCost` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_expense_requests' AND COLUMN_NAME = 'amount' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_expense_requests` MODIFY COLUMN `amount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_social_declarations' AND COLUMN_NAME = 'baseAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_social_declarations` MODIFY COLUMN `baseAmount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_social_declarations' AND COLUMN_NAME = 'amount' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_social_declarations` MODIFY COLUMN `amount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_training_sessions' AND COLUMN_NAME = 'budget' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_training_sessions` MODIFY COLUMN `budget` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_candidates' AND COLUMN_NAME = 'offerAmount' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_candidates` MODIFY COLUMN `offerAmount` DECIMAL(18,2) NULL', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_tax_rules' AND COLUMN_NAME = 'ipr_threshold' AND DATA_TYPE = 'double'), 'ALTER TABLE `hr_tax_rules` MODIFY COLUMN `ipr_threshold` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
