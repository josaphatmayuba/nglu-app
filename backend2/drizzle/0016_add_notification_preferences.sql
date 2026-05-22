CREATE TABLE `notification_preferences` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint NOT NULL,
	`eventKey` varchar(50) NOT NULL,
	`emailEnabled` tinyint DEFAULT 1,
	`inappEnabled` tinyint DEFAULT 1,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
