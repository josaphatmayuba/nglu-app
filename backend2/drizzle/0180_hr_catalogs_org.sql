-- P2 (finalisation HR) : organization_id sur les 11 dernieres tables HR /
-- contrat sans isolation. Catalogues (department, employmentStatus, designations,
-- shifts, awards) -> org 1. Historiques + docs perso -> org du user parent.
-- audit logs contrat -> org du contrat parent. Idempotent (INFORMATION_SCHEMA +
-- PREPARE, MySQL 8 sans IF NOT EXISTS natif).

-- ============ 1) ADD COLUMN (org 1 par defaut) ============
SET @t := 'department';
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `department` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employmentStatus' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `employmentStatus` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='education' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `education` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='designations' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `designations` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shifts' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `shifts` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='awards' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `awards` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='designation_histories' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `designation_histories` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_histories' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `salary_histories` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='award_histories' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `award_histories` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_personal_documents' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `hr_personal_documents` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='real_estate_contract_audit_logs' AND COLUMN_NAME='organization_id');
--> statement-breakpoint
SET @s := IF(@c=0,'ALTER TABLE `real_estate_contract_audit_logs` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint

-- ============ 2) BACKFILL depuis le parent ============
-- Historiques + docs perso -> org du user parent.
UPDATE `designation_histories` h JOIN `users` u ON u.`id` = h.`userId` SET h.`organization_id` = u.`organization_id` WHERE u.`organization_id` IS NOT NULL AND h.`organization_id` <> u.`organization_id`;
--> statement-breakpoint
UPDATE `salary_histories` h JOIN `users` u ON u.`id` = h.`userId` SET h.`organization_id` = u.`organization_id` WHERE u.`organization_id` IS NOT NULL AND h.`organization_id` <> u.`organization_id`;
--> statement-breakpoint
UPDATE `award_histories` h JOIN `users` u ON u.`id` = h.`userId` SET h.`organization_id` = u.`organization_id` WHERE u.`organization_id` IS NOT NULL AND h.`organization_id` <> u.`organization_id`;
--> statement-breakpoint
UPDATE `education` e JOIN `users` u ON u.`id` = e.`userId` SET e.`organization_id` = u.`organization_id` WHERE u.`organization_id` IS NOT NULL AND e.`organization_id` <> u.`organization_id`;
--> statement-breakpoint
UPDATE `hr_personal_documents` d JOIN `users` u ON u.`id` = d.`userId` SET d.`organization_id` = u.`organization_id` WHERE u.`organization_id` IS NOT NULL AND d.`organization_id` <> u.`organization_id`;
--> statement-breakpoint
-- audit logs contrat -> org du contrat parent.
UPDATE `real_estate_contract_audit_logs` a JOIN `real_estate_contracts` c ON c.`id` = a.`contract_id` SET a.`organization_id` = c.`organization_id` WHERE a.`organization_id` <> c.`organization_id`;
--> statement-breakpoint

-- ============ 3) INDEX par org ============
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department' AND INDEX_NAME='idx_department_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_department_org` ON `department` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='designations' AND INDEX_NAME='idx_designations_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_designations_org` ON `designations` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shifts' AND INDEX_NAME='idx_shifts_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_shifts_org` ON `shifts` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='awards' AND INDEX_NAME='idx_awards_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_awards_org` ON `awards` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employmentStatus' AND INDEX_NAME='idx_employment_status_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_employment_status_org` ON `employmentStatus` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='education' AND INDEX_NAME='idx_education_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_education_org` ON `education` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_personal_documents' AND INDEX_NAME='idx_hr_personal_docs_org');
--> statement-breakpoint
SET @s := IF(@c=0,'CREATE INDEX `idx_hr_personal_docs_org` ON `hr_personal_documents` (`organization_id`)','SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
