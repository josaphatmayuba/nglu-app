-- Idempotent (rejouable à chaque boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Pattern SET/IF + PREPARE/EXECUTE compatible avec splitSqlStatements.

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND COLUMN_NAME='requestedDays');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_leave_requests` ADD COLUMN `requestedDays` double NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND COLUMN_NAME='leaveYear');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_leave_requests` ADD COLUMN `leaveYear` int NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND COLUMN_NAME='entitlementDays');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_leave_requests` ADD COLUMN `entitlementDays` double NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND COLUMN_NAME='balanceBefore');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_leave_requests` ADD COLUMN `balanceBefore` double NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND COLUMN_NAME='balanceAfter');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_leave_requests` ADD COLUMN `balanceAfter` double NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND COLUMN_NAME='isPaid');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_leave_requests` ADD COLUMN `isPaid` tinyint NOT NULL DEFAULT 1', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND COLUMN_NAME='managerId');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_leave_requests` ADD COLUMN `managerId` bigint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND COLUMN_NAME='managerComment');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_leave_requests` ADD COLUMN `managerComment` text NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND COLUMN_NAME='managerDecisionAt');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_leave_requests` ADD COLUMN `managerDecisionAt` timestamp NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND COLUMN_NAME='hrDecisionAt');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_leave_requests` ADD COLUMN `hrDecisionAt` timestamp NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND COLUMN_NAME='hrComment');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_leave_requests` ADD COLUMN `hrComment` text NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_attendances' AND COLUMN_NAME='leaveRequestId');
--> statement-breakpoint
SET @s := IF(@c=0, 'ALTER TABLE `hr_attendances` ADD COLUMN `leaveRequestId` bigint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND INDEX_NAME='idx_hr_leave_requests_year');
--> statement-breakpoint
SET @s := IF(@c=0, 'CREATE INDEX `idx_hr_leave_requests_year` ON `hr_leave_requests` (`leaveYear`)', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_leave_requests' AND INDEX_NAME='idx_hr_leave_requests_manager');
--> statement-breakpoint
SET @s := IF(@c=0, 'CREATE INDEX `idx_hr_leave_requests_manager` ON `hr_leave_requests` (`managerId`)', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='hr_attendances' AND INDEX_NAME='idx_hr_attendances_leave_request');
--> statement-breakpoint
SET @s := IF(@c=0, 'CREATE INDEX `idx_hr_attendances_leave_request` ON `hr_attendances` (`leaveRequestId`)', 'SELECT 1');
--> statement-breakpoint
PREPARE st FROM @s;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
