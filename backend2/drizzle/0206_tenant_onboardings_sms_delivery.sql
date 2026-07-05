ALTER TABLE `tenant_onboardings` ADD `sms_sid` varchar(64);
--> statement-breakpoint
ALTER TABLE `tenant_onboardings` ADD `sms_status` varchar(32);
--> statement-breakpoint
ALTER TABLE `tenant_onboardings` ADD `sms_delivered_at` timestamp;
