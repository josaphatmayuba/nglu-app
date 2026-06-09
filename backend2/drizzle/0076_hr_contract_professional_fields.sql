SET @c1 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'designationId');
--> statement-breakpoint
SET @q1 := IF(@c1 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `designationId` BIGINT NULL AFTER `userId`', 'SELECT 1');
--> statement-breakpoint
PREPARE p1 FROM @q1;
--> statement-breakpoint
EXECUTE p1;
--> statement-breakpoint
DEALLOCATE PREPARE p1;
--> statement-breakpoint
SET @c2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'departmentId');
--> statement-breakpoint
SET @q2 := IF(@c2 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `departmentId` BIGINT NULL AFTER `designationId`', 'SELECT 1');
--> statement-breakpoint
PREPARE p2 FROM @q2;
--> statement-breakpoint
EXECUTE p2;
--> statement-breakpoint
DEALLOCATE PREPARE p2;
--> statement-breakpoint
SET @c3 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'managerId');
--> statement-breakpoint
SET @q3 := IF(@c3 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `managerId` BIGINT NULL AFTER `departmentId`', 'SELECT 1');
--> statement-breakpoint
PREPARE p3 FROM @q3;
--> statement-breakpoint
EXECUTE p3;
--> statement-breakpoint
DEALLOCATE PREPARE p3;
--> statement-breakpoint
SET @c4 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'hrResponsibleId');
--> statement-breakpoint
SET @q4 := IF(@c4 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `hrResponsibleId` BIGINT NULL AFTER `managerId`', 'SELECT 1');
--> statement-breakpoint
PREPARE p4 FROM @q4;
--> statement-breakpoint
EXECUTE p4;
--> statement-breakpoint
DEALLOCATE PREPARE p4;
--> statement-breakpoint
SET @c5 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'workLocation');
--> statement-breakpoint
SET @q5 := IF(@c5 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `workLocation` VARCHAR(180) NULL AFTER `reference`', 'SELECT 1');
--> statement-breakpoint
PREPARE p5 FROM @q5;
--> statement-breakpoint
EXECUTE p5;
--> statement-breakpoint
DEALLOCATE PREPARE p5;
--> statement-breakpoint
SET @c6 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'currencyId');
--> statement-breakpoint
SET @q6 := IF(@c6 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `currencyId` BIGINT NULL AFTER `workLocation`', 'SELECT 1');
--> statement-breakpoint
PREPARE p6 FROM @q6;
--> statement-breakpoint
EXECUTE p6;
--> statement-breakpoint
DEALLOCATE PREPARE p6;
--> statement-breakpoint
SET @c7 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'baseSalary');
--> statement-breakpoint
SET @q7 := IF(@c7 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `baseSalary` DOUBLE NULL DEFAULT 0 AFTER `currencyId`', 'SELECT 1');
--> statement-breakpoint
PREPARE p7 FROM @q7;
--> statement-breakpoint
EXECUTE p7;
--> statement-breakpoint
DEALLOCATE PREPARE p7;
--> statement-breakpoint
SET @c8 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'transportAllowance');
--> statement-breakpoint
SET @q8 := IF(@c8 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `transportAllowance` DOUBLE NULL DEFAULT 0 AFTER `baseSalary`', 'SELECT 1');
--> statement-breakpoint
PREPARE p8 FROM @q8;
--> statement-breakpoint
EXECUTE p8;
--> statement-breakpoint
DEALLOCATE PREPARE p8;
--> statement-breakpoint
SET @c9 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'housingAllowance');
--> statement-breakpoint
SET @q9 := IF(@c9 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `housingAllowance` DOUBLE NULL DEFAULT 0 AFTER `transportAllowance`', 'SELECT 1');
--> statement-breakpoint
PREPARE p9 FROM @q9;
--> statement-breakpoint
EXECUTE p9;
--> statement-breakpoint
DEALLOCATE PREPARE p9;
--> statement-breakpoint
SET @c10 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'payFrequency');
--> statement-breakpoint
SET @q10 := IF(@c10 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `payFrequency` VARCHAR(40) NULL AFTER `housingAllowance`', 'SELECT 1');
--> statement-breakpoint
PREPARE p10 FROM @q10;
--> statement-breakpoint
EXECUTE p10;
--> statement-breakpoint
DEALLOCATE PREPARE p10;
--> statement-breakpoint
SET @c11 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'probationMonths');
--> statement-breakpoint
SET @q11 := IF(@c11 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `probationMonths` DOUBLE NULL AFTER `payFrequency`', 'SELECT 1');
--> statement-breakpoint
PREPARE p11 FROM @q11;
--> statement-breakpoint
EXECUTE p11;
--> statement-breakpoint
DEALLOCATE PREPARE p11;
--> statement-breakpoint
SET @c12 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'probationEndDate');
--> statement-breakpoint
SET @q12 := IF(@c12 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `probationEndDate` DATE NULL AFTER `probationMonths`', 'SELECT 1');
--> statement-breakpoint
PREPARE p12 FROM @q12;
--> statement-breakpoint
EXECUTE p12;
--> statement-breakpoint
DEALLOCATE PREPARE p12;
--> statement-breakpoint
SET @c13 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'workSchedule');
--> statement-breakpoint
SET @q13 := IF(@c13 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `workSchedule` VARCHAR(160) NULL AFTER `probationEndDate`', 'SELECT 1');
--> statement-breakpoint
PREPARE p13 FROM @q13;
--> statement-breakpoint
EXECUTE p13;
--> statement-breakpoint
DEALLOCATE PREPARE p13;
--> statement-breakpoint
SET @c14 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'school');
--> statement-breakpoint
SET @q14 := IF(@c14 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `school` VARCHAR(180) NULL AFTER `workSchedule`', 'SELECT 1');
--> statement-breakpoint
PREPARE p14 FROM @q14;
--> statement-breakpoint
EXECUTE p14;
--> statement-breakpoint
DEALLOCATE PREPARE p14;
--> statement-breakpoint
SET @c15 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'supervisor');
--> statement-breakpoint
SET @q15 := IF(@c15 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `supervisor` VARCHAR(180) NULL AFTER `school`', 'SELECT 1');
--> statement-breakpoint
PREPARE p15 FROM @q15;
--> statement-breakpoint
EXECUTE p15;
--> statement-breakpoint
DEALLOCATE PREPARE p15;
--> statement-breakpoint
SET @c16 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'stipend');
--> statement-breakpoint
SET @q16 := IF(@c16 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `stipend` DOUBLE NULL DEFAULT 0 AFTER `supervisor`', 'SELECT 1');
--> statement-breakpoint
PREPARE p16 FROM @q16;
--> statement-breakpoint
EXECUTE p16;
--> statement-breakpoint
DEALLOCATE PREPARE p16;
--> statement-breakpoint
SET @c17 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'contractAmount');
--> statement-breakpoint
SET @q17 := IF(@c17 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `contractAmount` DOUBLE NULL DEFAULT 0 AFTER `stipend`', 'SELECT 1');
--> statement-breakpoint
PREPARE p17 FROM @q17;
--> statement-breakpoint
EXECUTE p17;
--> statement-breakpoint
DEALLOCATE PREPARE p17;
--> statement-breakpoint
SET @c18 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'deliverables');
--> statement-breakpoint
SET @q18 := IF(@c18 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `deliverables` TEXT NULL AFTER `contractAmount`', 'SELECT 1');
--> statement-breakpoint
PREPARE p18 FROM @q18;
--> statement-breakpoint
EXECUTE p18;
--> statement-breakpoint
DEALLOCATE PREPARE p18;
--> statement-breakpoint
SET @c19 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'generatedDocumentUrl');
--> statement-breakpoint
SET @q19 := IF(@c19 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `generatedDocumentUrl` VARCHAR(500) NULL AFTER `deliverables`', 'SELECT 1');
--> statement-breakpoint
PREPARE p19 FROM @q19;
--> statement-breakpoint
EXECUTE p19;
--> statement-breakpoint
DEALLOCATE PREPARE p19;
--> statement-breakpoint
SET @c20 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'signedDocumentUrl');
--> statement-breakpoint
SET @q20 := IF(@c20 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `signedDocumentUrl` VARCHAR(500) NULL AFTER `generatedDocumentUrl`', 'SELECT 1');
--> statement-breakpoint
PREPARE p20 FROM @q20;
--> statement-breakpoint
EXECUTE p20;
--> statement-breakpoint
DEALLOCATE PREPARE p20;
--> statement-breakpoint
SET @c21 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'amendmentsUrl');
--> statement-breakpoint
SET @q21 := IF(@c21 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `amendmentsUrl` VARCHAR(500) NULL AFTER `signedDocumentUrl`', 'SELECT 1');
--> statement-breakpoint
PREPARE p21 FROM @q21;
--> statement-breakpoint
EXECUTE p21;
--> statement-breakpoint
DEALLOCATE PREPARE p21;
--> statement-breakpoint
SET @c22 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'identityDocumentUrl');
--> statement-breakpoint
SET @q22 := IF(@c22 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `identityDocumentUrl` VARCHAR(500) NULL AFTER `amendmentsUrl`', 'SELECT 1');
--> statement-breakpoint
PREPARE p22 FROM @q22;
--> statement-breakpoint
EXECUTE p22;
--> statement-breakpoint
DEALLOCATE PREPARE p22;
--> statement-breakpoint
SET @c23 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_contracts' AND COLUMN_NAME = 'diplomasUrl');
--> statement-breakpoint
SET @q23 := IF(@c23 = 0, 'ALTER TABLE `hr_contracts` ADD COLUMN `diplomasUrl` VARCHAR(500) NULL AFTER `identityDocumentUrl`', 'SELECT 1');
--> statement-breakpoint
PREPARE p23 FROM @q23;
--> statement-breakpoint
EXECUTE p23;
--> statement-breakpoint
DEALLOCATE PREPARE p23;
--> statement-breakpoint
ALTER TABLE `hr_contracts` MODIFY COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'draft';
--> statement-breakpoint
UPDATE `hr_contracts`
SET `reference` = CONCAT('CTR-', YEAR(COALESCE(`startDate`, CURRENT_DATE)), '-', LPAD(`id`, 4, '0'))
WHERE `reference` IS NULL OR `reference` = '';
