SET @c1 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'gender');
--> statement-breakpoint
SET @q1 := IF(@c1 = 0, 'ALTER TABLE `users` ADD COLUMN `gender` VARCHAR(40) NULL AFTER `phone`', 'SELECT 1');
--> statement-breakpoint
PREPARE p1 FROM @q1;
--> statement-breakpoint
EXECUTE p1;
--> statement-breakpoint
DEALLOCATE PREPARE p1;
--> statement-breakpoint
SET @c2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'birthDate');
--> statement-breakpoint
SET @q2 := IF(@c2 = 0, 'ALTER TABLE `users` ADD COLUMN `birthDate` DATE NULL AFTER `gender`', 'SELECT 1');
--> statement-breakpoint
PREPARE p2 FROM @q2;
--> statement-breakpoint
EXECUTE p2;
--> statement-breakpoint
DEALLOCATE PREPARE p2;
--> statement-breakpoint
SET @c3 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'maritalStatus');
--> statement-breakpoint
SET @q3 := IF(@c3 = 0, 'ALTER TABLE `users` ADD COLUMN `maritalStatus` VARCHAR(80) NULL AFTER `birthDate`', 'SELECT 1');
--> statement-breakpoint
PREPARE p3 FROM @q3;
--> statement-breakpoint
EXECUTE p3;
--> statement-breakpoint
DEALLOCATE PREPARE p3;
--> statement-breakpoint
SET @c4 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'childrenCount');
--> statement-breakpoint
SET @q4 := IF(@c4 = 0, 'ALTER TABLE `users` ADD COLUMN `childrenCount` INT NULL DEFAULT 0 AFTER `maritalStatus`', 'SELECT 1');
--> statement-breakpoint
PREPARE p4 FROM @q4;
--> statement-breakpoint
EXECUTE p4;
--> statement-breakpoint
DEALLOCATE PREPARE p4;
--> statement-breakpoint
SET @c5 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'nationality');
--> statement-breakpoint
SET @q5 := IF(@c5 = 0, 'ALTER TABLE `users` ADD COLUMN `nationality` VARCHAR(120) NULL AFTER `childrenCount`', 'SELECT 1');
--> statement-breakpoint
PREPARE p5 FROM @q5;
--> statement-breakpoint
EXECUTE p5;
--> statement-breakpoint
DEALLOCATE PREPARE p5;
--> statement-breakpoint
SET @c6 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'emergencyContactName');
--> statement-breakpoint
SET @q6 := IF(@c6 = 0, 'ALTER TABLE `users` ADD COLUMN `emergencyContactName` VARCHAR(255) NULL AFTER `nationality`', 'SELECT 1');
--> statement-breakpoint
PREPARE p6 FROM @q6;
--> statement-breakpoint
EXECUTE p6;
--> statement-breakpoint
DEALLOCATE PREPARE p6;
--> statement-breakpoint
SET @c7 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'emergencyContactPhone');
--> statement-breakpoint
SET @q7 := IF(@c7 = 0, 'ALTER TABLE `users` ADD COLUMN `emergencyContactPhone` VARCHAR(255) NULL AFTER `emergencyContactName`', 'SELECT 1');
--> statement-breakpoint
PREPARE p7 FROM @q7;
--> statement-breakpoint
EXECUTE p7;
--> statement-breakpoint
DEALLOCATE PREPARE p7;
--> statement-breakpoint
SET @c8 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'emergencyContactRelationship');
--> statement-breakpoint
SET @q8 := IF(@c8 = 0, 'ALTER TABLE `users` ADD COLUMN `emergencyContactRelationship` VARCHAR(120) NULL AFTER `emergencyContactPhone`', 'SELECT 1');
--> statement-breakpoint
PREPARE p8 FROM @q8;
--> statement-breakpoint
EXECUTE p8;
--> statement-breakpoint
DEALLOCATE PREPARE p8;
--> statement-breakpoint
SET @c9 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'personalDocumentsUrl');
--> statement-breakpoint
SET @q9 := IF(@c9 = 0, 'ALTER TABLE `users` ADD COLUMN `personalDocumentsUrl` TEXT NULL AFTER `emergencyContactRelationship`', 'SELECT 1');
--> statement-breakpoint
PREPARE p9 FROM @q9;
--> statement-breakpoint
EXECUTE p9;
--> statement-breakpoint
DEALLOCATE PREPARE p9;
--> statement-breakpoint
UPDATE `users`
SET `employeeId` = CONCAT('EMP-', YEAR(COALESCE(`joinDate`, `created_at`, CURRENT_DATE)), '-', LPAD(`id`, 4, '0'))
WHERE `employeeId` IS NULL OR `employeeId` = '';
