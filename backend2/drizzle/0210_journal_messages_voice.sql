SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'journal_messages' AND COLUMN_NAME = 'attachment_type');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `journal_messages` ADD COLUMN `attachment_type` varchar(24) DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'journal_messages' AND COLUMN_NAME = 'attachment_duration_sec');
--> statement-breakpoint
SET @sql2 := IF(@col2 = 0, 'ALTER TABLE `journal_messages` ADD COLUMN `attachment_duration_sec` int DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt2 FROM @sql2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
