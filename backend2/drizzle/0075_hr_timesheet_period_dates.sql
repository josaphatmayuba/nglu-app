SET @c1 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_timesheets' AND COLUMN_NAME = 'periodStartDate');
--> statement-breakpoint
SET @q1 := IF(@c1 = 0, 'ALTER TABLE `hr_timesheets` ADD COLUMN `periodStartDate` DATE NULL AFTER `period`', 'SELECT 1');
--> statement-breakpoint
PREPARE p1 FROM @q1;
--> statement-breakpoint
EXECUTE p1;
--> statement-breakpoint
DEALLOCATE PREPARE p1;
--> statement-breakpoint
SET @c2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hr_timesheets' AND COLUMN_NAME = 'periodEndDate');
--> statement-breakpoint
SET @q2 := IF(@c2 = 0, 'ALTER TABLE `hr_timesheets` ADD COLUMN `periodEndDate` DATE NULL AFTER `periodStartDate`', 'SELECT 1');
--> statement-breakpoint
PREPARE p2 FROM @q2;
--> statement-breakpoint
EXECUTE p2;
--> statement-breakpoint
DEALLOCATE PREPARE p2;
--> statement-breakpoint
UPDATE `hr_timesheets`
SET `periodStartDate` = COALESCE(`periodStartDate`, `workDate`),
    `periodEndDate` = COALESCE(`periodEndDate`, `workDate`)
WHERE `workDate` IS NOT NULL;
