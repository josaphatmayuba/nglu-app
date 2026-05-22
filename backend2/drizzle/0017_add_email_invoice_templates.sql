CREATE TABLE `email_templates` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`body` text NOT NULL,
	`eventType` varchar(100),
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_templates` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`headerText` text,
	`footerText` text,
	`showLogo` tinyint DEFAULT 1,
	`showSignature` tinyint DEFAULT 0,
	`colorScheme` varchar(50) DEFAULT 'brand',
	`status` varchar(10) NOT NULL DEFAULT 'true',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `invoice_templates_id` PRIMARY KEY(`id`)
);
