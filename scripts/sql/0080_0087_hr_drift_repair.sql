-- ============================================================================
-- Réparation drift migrations HR 0080 -> 0087 (dev ET prod)
-- ----------------------------------------------------------------------------
-- Contexte: les timestamps `when` du journal Drizzle pour 0080->0087 sont en
-- désordre (0085/0086/0087 < 0084), donc Drizzle saute ces migrations au boot.
-- Résultat: tables hr_attendances / hr_candidates / hr_personal_documents
-- absentes, colonnes payroll-approval / leave-workflow / user.photo absentes.
-- En plus 0084 et 0087 étaient écrites en syntaxe PostgreSQL (`serial`,
-- `text DEFAULT NULL`) -> invalides sur MySQL.
--
-- Ce script est 100% idempotent (IF NOT EXISTS + colonnes gardées par
-- INFORMATION_SCHEMA) : il peut être rejoué sans risque.
-- ============================================================================

-- ─── 0081 : hr_attendances ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `hr_attendances` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `userId` bigint NOT NULL,
  `workDate` date NOT NULL,
  `shiftId` bigint,
  `clockIn` varchar(20),
  `pauseOut` varchar(20),
  `pauseIn` varchar(20),
  `clockOut` varchar(20),
  `leaveRequestId` bigint NULL,
  `workedHours` double NOT NULL DEFAULT 0,
  `lateMinutes` int NOT NULL DEFAULT 0,
  `overtimeHours` double NOT NULL DEFAULT 0,
  `absenceHours` double NOT NULL DEFAULT 0,
  `source` varchar(30) NOT NULL DEFAULT 'manual',
  `status` varchar(30) NOT NULL DEFAULT 'present',
  `note` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_attendances_user_date` (`userId`, `workDate`),
  INDEX `idx_hr_attendances_shift` (`shiftId`),
  INDEX `idx_hr_attendances_status` (`status`),
  INDEX `idx_hr_attendances_leave_request` (`leaveRequestId`)
);

-- ─── 0084 : hr_candidates (réécrit en MySQL ; `serial` -> AUTO_INCREMENT) ────
CREATE TABLE IF NOT EXISTS `hr_candidates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `offerId` bigint DEFAULT NULL,
  `firstName` varchar(180) NOT NULL,
  `lastName` varchar(180) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(80) DEFAULT NULL,
  `nationality` varchar(120) DEFAULT NULL,
  `gender` varchar(40) DEFAULT NULL,
  `birthDate` date DEFAULT NULL,
  `currentTitle` varchar(180) DEFAULT NULL,
  `currentEmployer` varchar(180) DEFAULT NULL,
  `yearsExperience` double DEFAULT NULL,
  `educationLevel` varchar(120) DEFAULT NULL,
  `skills` text,
  `languages` varchar(500) DEFAULT NULL,
  `source` varchar(120) DEFAULT NULL,
  `cvUrl` varchar(500) DEFAULT NULL,
  `portfolioUrl` varchar(500) DEFAULT NULL,
  `linkedinUrl` varchar(500) DEFAULT NULL,
  `coverLetterUrl` varchar(500) DEFAULT NULL,
  `stage` varchar(50) NOT NULL DEFAULT 'nouveau',
  `rating` double DEFAULT NULL,
  `interviewDate` date DEFAULT NULL,
  `testDate` date DEFAULT NULL,
  `offerDate` date DEFAULT NULL,
  `offerAmount` double DEFAULT NULL,
  `offerCurrencyId` bigint DEFAULT NULL,
  `convertedUserId` bigint DEFAULT NULL,
  `convertedAt` timestamp NULL DEFAULT NULL,
  `assignedTo` bigint DEFAULT NULL,
  `decisionComment` text,
  `status` varchar(30) NOT NULL DEFAULT 'active',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_candidates_offer` (`offerId`),
  INDEX `idx_hr_candidates_stage` (`stage`)
);

-- ─── 0086 : hr_personal_documents ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `hr_personal_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `documentType` varchar(100) NOT NULL,
  `fileName` varchar(255) NOT NULL,
  `filePath` varchar(500) NOT NULL,
  `fileSize` int NULL,
  `mimeType` varchar(100) NULL,
  `version` int NOT NULL DEFAULT 1,
  `notes` text NULL,
  `uploadedBy` bigint NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_personal_documents_user` (`userId`)
);

-- ─── 0087 : hr_tax_rules (réécrit en MySQL ; `serial` -> AUTO_INCREMENT) ─────
CREATE TABLE IF NOT EXISTS `hr_tax_rules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `country_code` varchar(10) NOT NULL,
  `country_name` varchar(100) NOT NULL,
  `cnss_employee_rate` double NOT NULL DEFAULT 0,
  `cnss_employer_rate` double NOT NULL DEFAULT 0,
  `ipr_rate` double NOT NULL DEFAULT 0,
  `ipr_threshold` double NOT NULL DEFAULT 0,
  `ipr_brackets` json,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_tax_rules_country` (`country_code`)
);

INSERT INTO `hr_tax_rules` (`country_code`, `country_name`, `cnss_employee_rate`, `cnss_employer_rate`, `ipr_rate`, `ipr_threshold`, `notes`)
SELECT * FROM (
  SELECT 'CD' AS a, 'Congo (RDC)' AS b, 0.035 AS c, 0.0659 AS d, 0 AS e, 0 AS f, 'CNSS: 3.5% salarie / 6.59% patronal; IPR: bareme progressif' AS g UNION ALL
  SELECT 'CG', 'Congo (Brazzaville)', 0.04, 0.12, 0.01, 0, 'CNSS: 4% salarie / 12% patronal; IPR: 1% forfait' UNION ALL
  SELECT 'CM', 'Cameroun', 0.042, 0.11, 0.015, 0, 'CNSS: 4.2% salarie / 11% patronal; IRPP: ~1.5%' UNION ALL
  SELECT 'CI', 'Cote d''Ivoire', 0.032, 0.016, 0.015, 0, 'CNSS: 3.2% salarie / 1.6% patronal; ITS: ~1.5%' UNION ALL
  SELECT 'SN', 'Senegal', 0.056, 0.087, 0.02, 0, 'IPRES: 5.6% salarie / 8.7% patronal; IRPP: ~2%' UNION ALL
  SELECT 'GA', 'Gabon', 0.025, 0.20, 0.05, 0, 'CNSS: 2.5% salarie / 20% patronal; IRPP: 5%' UNION ALL
  SELECT 'FR', 'France', 0.22, 0.42, 0.0, 0, 'Cotisations salariales ~22%; bareme IPR progressif' UNION ALL
  SELECT 'BE', 'Belgique', 0.1307, 0.27, 0.0, 0, 'Cotisations: 13.07% salarie; Precompte progressif'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM `hr_tax_rules` LIMIT 1);

-- ─── Procédure helper: ajoute une colonne seulement si absente ──────────────
DROP PROCEDURE IF EXISTS `__hr_add_col`;
DELIMITER //
CREATE PROCEDURE `__hr_add_col`(IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END //
DELIMITER ;

-- ─── 0082 : leave workflow + colonne attendances ───────────────────────────
CALL __hr_add_col('hr_leave_requests', 'requestedDays',     '`requestedDays` double NOT NULL DEFAULT 0');
CALL __hr_add_col('hr_leave_requests', 'leaveYear',         '`leaveYear` int NULL');
CALL __hr_add_col('hr_leave_requests', 'entitlementDays',   '`entitlementDays` double NOT NULL DEFAULT 0');
CALL __hr_add_col('hr_leave_requests', 'balanceBefore',     '`balanceBefore` double NOT NULL DEFAULT 0');
CALL __hr_add_col('hr_leave_requests', 'balanceAfter',      '`balanceAfter` double NOT NULL DEFAULT 0');
CALL __hr_add_col('hr_leave_requests', 'isPaid',            '`isPaid` tinyint NOT NULL DEFAULT 1');
CALL __hr_add_col('hr_leave_requests', 'managerId',         '`managerId` bigint NULL');
CALL __hr_add_col('hr_leave_requests', 'managerComment',    '`managerComment` text NULL');
CALL __hr_add_col('hr_leave_requests', 'managerDecisionAt', '`managerDecisionAt` timestamp NULL');
CALL __hr_add_col('hr_leave_requests', 'hrDecisionAt',      '`hrDecisionAt` timestamp NULL');
CALL __hr_add_col('hr_leave_requests', 'hrComment',         '`hrComment` text NULL');

-- ─── 0083 : document generation ────────────────────────────────────────────
CALL __hr_add_col('hr_documents', 'templateType', '`templateType` varchar(80) DEFAULT NULL');
CALL __hr_add_col('hr_documents', 'version',      '`version` int NOT NULL DEFAULT 1');
CALL __hr_add_col('hr_documents', 'generatedAt',  '`generatedAt` timestamp NULL DEFAULT NULL');
CALL __hr_add_col('hr_documents', 'generatedBy',  '`generatedBy` bigint DEFAULT NULL');
CALL __hr_add_col('hr_documents', 'content',      '`content` text NULL');
CALL __hr_add_col('hr_documents', 'signedAt',     '`signedAt` timestamp NULL DEFAULT NULL');
CALL __hr_add_col('hr_documents', 'signedBy',     '`signedBy` varchar(255) DEFAULT NULL');

-- ─── 0085 : payroll approval workflow ──────────────────────────────────────
CALL __hr_add_col('hr_payrolls', 'submittedAt',       '`submittedAt` timestamp NULL');
CALL __hr_add_col('hr_payrolls', 'submittedBy',       '`submittedBy` bigint NULL');
CALL __hr_add_col('hr_payrolls', 'approvedBy',        '`approvedBy` bigint NULL');
CALL __hr_add_col('hr_payrolls', 'approvedAt',        '`approvedAt` timestamp NULL');
CALL __hr_add_col('hr_payrolls', 'approvalComment',   '`approvalComment` text NULL');
CALL __hr_add_col('hr_payrolls', 'rejectedBy',        '`rejectedBy` bigint NULL');
CALL __hr_add_col('hr_payrolls', 'rejectedAt',        '`rejectedAt` timestamp NULL');
CALL __hr_add_col('hr_payrolls', 'rejectionComment',  '`rejectionComment` text NULL');
CALL __hr_add_col('hr_payrolls', 'paidAt',            '`paidAt` timestamp NULL');
CALL __hr_add_col('hr_payrolls', 'paidBy',            '`paidBy` bigint NULL');
-- Note: la photo employé est stockée dans `user`.`image` (colonne existante),
-- 0086 ne crée donc PAS de colonne `photo`; rien à ajouter ici.

DROP PROCEDURE IF EXISTS `__hr_add_col`;
