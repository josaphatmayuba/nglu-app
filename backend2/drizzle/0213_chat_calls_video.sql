SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_calls' AND COLUMN_NAME = 'has_video');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `chat_calls` ADD COLUMN `has_video` tinyint NOT NULL DEFAULT 0', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
