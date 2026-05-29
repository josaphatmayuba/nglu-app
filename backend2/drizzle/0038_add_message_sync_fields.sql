-- Add IMAP sync metadata to avoid importing the same mailbox message twice.
ALTER TABLE `messages`
  ADD COLUMN `external_message_id` varchar(255),
  ADD COLUMN `mailbox` varchar(100);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_messages_external_message_id` ON `messages` (`external_message_id`);
