ALTER TABLE `hr_leave_requests`
  ADD COLUMN `requestedDays` double NOT NULL DEFAULT 0 AFTER `endDate`,
  ADD COLUMN `leaveYear` int NULL AFTER `requestedDays`,
  ADD COLUMN `entitlementDays` double NOT NULL DEFAULT 0 AFTER `leaveYear`,
  ADD COLUMN `balanceBefore` double NOT NULL DEFAULT 0 AFTER `entitlementDays`,
  ADD COLUMN `balanceAfter` double NOT NULL DEFAULT 0 AFTER `balanceBefore`,
  ADD COLUMN `isPaid` tinyint NOT NULL DEFAULT 1 AFTER `balanceAfter`,
  ADD COLUMN `managerId` bigint NULL AFTER `status`,
  ADD COLUMN `managerComment` text NULL AFTER `managerId`,
  ADD COLUMN `managerDecisionAt` timestamp NULL AFTER `managerComment`,
  ADD COLUMN `hrDecisionAt` timestamp NULL AFTER `managerDecisionAt`,
  ADD COLUMN `hrComment` text NULL AFTER `hrDecisionAt`;
--> statement-breakpoint
ALTER TABLE `hr_attendances`
  ADD COLUMN `leaveRequestId` bigint NULL AFTER `clockOut`;
--> statement-breakpoint
CREATE INDEX `idx_hr_leave_requests_year` ON `hr_leave_requests` (`leaveYear`);
--> statement-breakpoint
CREATE INDEX `idx_hr_leave_requests_manager` ON `hr_leave_requests` (`managerId`);
--> statement-breakpoint
CREATE INDEX `idx_hr_attendances_leave_request` ON `hr_attendances` (`leaveRequestId`);
