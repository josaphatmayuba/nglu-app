-- SCRUM-76: logs for automatic CRM emails sent through the system mailbox.
CREATE TABLE IF NOT EXISTS `system_email_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email_type` varchar(100) NOT NULL,
  `recipient` varchar(255) NOT NULL,
  `sender` varchar(255) NOT NULL,
  `subject` varchar(500) NOT NULL,
  `status` enum('pending', 'sent', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  `related_type` varchar(100),
  `related_id` varchar(100),
  `provider_message_id` varchar(255),
  `error_message` varchar(1000),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `system_email_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_system_email_logs_type` ON `system_email_logs` (`email_type`);
--> statement-breakpoint
CREATE INDEX `idx_system_email_logs_status` ON `system_email_logs` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_system_email_logs_related` ON `system_email_logs` (`related_type`, `related_id`);
