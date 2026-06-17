-- FarmOS egg sales: add building_id to production_logs for per-henhouse tracking.
ALTER TABLE `farmos_production_logs`
  ADD COLUMN IF NOT EXISTS `building_id` bigint DEFAULT NULL AFTER `animal_id`;
--> statement-breakpoint
