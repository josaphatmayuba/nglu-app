ALTER TABLE `role` ADD COLUMN `is_system` tinyint(1) NOT NULL DEFAULT 0;
-- statement-breakpoint
UPDATE `role` SET `is_system` = 1 WHERE `name` = 'super-admin';
