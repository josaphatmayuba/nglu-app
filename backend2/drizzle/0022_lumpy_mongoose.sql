CREATE TABLE `messages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`from_email` varchar(255) NOT NULL,
	`to_email` varchar(255) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`body` text,
	`html_body` text,
	`status` enum('draft','sent','received','read','unread','archived','trash') NOT NULL DEFAULT 'received',
	`is_read` boolean NOT NULL DEFAULT false,
	`message_type` enum('email','internal','system') NOT NULL DEFAULT 'email',
	`related_type` varchar(50),
	`related_id` int,
	`attachment_count` int DEFAULT 0,
	`external_message_id` varchar(255),
	`mailbox` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `salary_histories` ADD `currency_id` bigint;--> statement-breakpoint
ALTER TABLE `users` ADD `leaveReason` varchar(500);