SET @c1 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'gender');
SET @q1 := IF(@c1 = 0, 'ALTER TABLE `users` ADD COLUMN `gender` VARCHAR(40) NULL AFTER `phone`', 'SELECT 1');
PREPARE p1 FROM @q1; EXECUTE p1; DEALLOCATE PREPARE p1;
--> statement-breakpoint

SET @c2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'birthDate');
SET @q2 := IF(@c2 = 0, 'ALTER TABLE `users` ADD COLUMN `birthDate` DATE NULL AFTER `gender`', 'SELECT 1');
PREPARE p2 FROM @q2; EXECUTE p2; DEALLOCATE PREPARE p2;
--> statement-breakpoint

SET @c3 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'maritalStatus');
SET @q3 := IF(@c3 = 0, 'ALTER TABLE `users` ADD COLUMN `maritalStatus` VARCHAR(80) NULL AFTER `birthDate`', 'SELECT 1');
PREPARE p3 FROM @q3; EXECUTE p3; DEALLOCATE PREPARE p3;
--> statement-breakpoint

SET @c4 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'childrenCount');
SET @q4 := IF(@c4 = 0, 'ALTER TABLE `users` ADD COLUMN `childrenCount` INT NULL DEFAULT 0 AFTER `maritalStatus`', 'SELECT 1');
PREPARE p4 FROM @q4; EXECUTE p4; DEALLOCATE PREPARE p4;
--> statement-breakpoint

SET @c5 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'nationality');
SET @q5 := IF(@c5 = 0, 'ALTER TABLE `users` ADD COLUMN `nationality` VARCHAR(120) NULL AFTER `childrenCount`', 'SELECT 1');
PREPARE p5 FROM @q5; EXECUTE p5; DEALLOCATE PREPARE p5;
--> statement-breakpoint

SET @c6 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'emergencyContactName');
SET @q6 := IF(@c6 = 0, 'ALTER TABLE `users` ADD COLUMN `emergencyContactName` VARCHAR(255) NULL AFTER `nationality`', 'SELECT 1');
PREPARE p6 FROM @q6; EXECUTE p6; DEALLOCATE PREPARE p6;
--> statement-breakpoint

SET @c7 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'emergencyContactPhone');
SET @q7 := IF(@c7 = 0, 'ALTER TABLE `users` ADD COLUMN `emergencyContactPhone` VARCHAR(255) NULL AFTER `emergencyContactName`', 'SELECT 1');
PREPARE p7 FROM @q7; EXECUTE p7; DEALLOCATE PREPARE p7;
--> statement-breakpoint

SET @c8 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'emergencyContactRelationship');
SET @q8 := IF(@c8 = 0, 'ALTER TABLE `users` ADD COLUMN `emergencyContactRelationship` VARCHAR(120) NULL AFTER `emergencyContactPhone`', 'SELECT 1');
PREPARE p8 FROM @q8; EXECUTE p8; DEALLOCATE PREPARE p8;
--> statement-breakpoint

SET @c9 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'personalDocumentsUrl');
SET @q9 := IF(@c9 = 0, 'ALTER TABLE `users` ADD COLUMN `personalDocumentsUrl` TEXT NULL AFTER `emergencyContactRelationship`', 'SELECT 1');
PREPARE p9 FROM @q9; EXECUTE p9; DEALLOCATE PREPARE p9;
--> statement-breakpoint

UPDATE `users`
SET `employeeId` = CONCAT('EMP-', YEAR(COALESCE(`joinDate`, `created_at`, CURRENT_DATE)), '-', LPAD(`id`, 4, '0'))
WHERE `employeeId` IS NULL OR `employeeId` = '';
--> statement-breakpoint
