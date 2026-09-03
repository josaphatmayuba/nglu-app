--> statement-breakpoint
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'journal_discussions' AND COLUMN_NAME = 'entity_key');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `journal_discussions` ADD COLUMN `entity_key` varchar(64) DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'journal_discussions' AND INDEX_NAME = 'uq_discussion_entity_key');
--> statement-breakpoint
SET @sql := IF(@idx_exists = 0, 'ALTER TABLE `journal_discussions` ADD UNIQUE KEY `uq_discussion_entity_key` (`entity_key`)', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
