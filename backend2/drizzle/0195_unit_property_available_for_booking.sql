ALTER TABLE `real_estate_units` ADD COLUMN `available_for_booking` tinyint(1) NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `real_estate_properties` ADD COLUMN `available_for_booking` tinyint(1) NOT NULL DEFAULT 0;
