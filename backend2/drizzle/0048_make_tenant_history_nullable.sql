-- Allow primo-renters: history fields become optional.
ALTER TABLE `tenant_details` MODIFY `old_address` varchar(255) NULL;
--> statement-breakpoint
ALTER TABLE `tenant_details` MODIFY `old_lessor` varchar(255) NULL;
--> statement-breakpoint
ALTER TABLE `tenant_details` MODIFY `moving_reason` varchar(255) NULL;
