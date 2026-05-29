-- SCRUM-75: interactive messaging module for ongdngolu.org emails.
CREATE TABLE IF NOT EXISTS `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `from_email` varchar(255) NOT NULL,
  `to_email` varchar(255) NOT NULL,
  `subject` varchar(500) NOT NULL,
  `body` longtext,
  `html_body` longtext,
  `status` enum('draft', 'sent', 'received', 'read', 'unread', 'archived', 'trash') NOT NULL DEFAULT 'received',
  `is_read` boolean NOT NULL DEFAULT false,
  `message_type` enum('email', 'internal', 'system') NOT NULL DEFAULT 'email',
  `related_type` varchar(50),
  `related_id` int,
  `attachment_count` int DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_messages_user_id` ON `messages` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_messages_status` ON `messages` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_messages_created_at` ON `messages` (`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_messages_user_status` ON `messages` (`user_id`, `status`);
--> statement-breakpoint
INSERT IGNORE INTO `permission` (`name`, `type`, `created_at`, `updated_at`) VALUES
  ('create-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readAll-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readSingle-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('update-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('delete-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
INSERT INTO `rolePermission` (`roleId`, `permissionId`, `created_at`, `updated_at`)
SELECT r.`id`, p.`id`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `role` r
JOIN `permission` p ON p.`name` IN (
  'create-message',
  'readAll-message',
  'readSingle-message',
  'update-message',
  'delete-message'
)
LEFT JOIN `rolePermission` rp ON rp.`roleId` = r.`id` AND rp.`permissionId` = p.`id`
WHERE r.`is_system` = 1 AND rp.`id` IS NULL;
