-- Permet d'attacher une photo Domus a une unite precise au lieu du bien entier.

ALTER TABLE `real_estate_property_photos`
  ADD COLUMN `unit_id` bigint NULL AFTER `property_id`;
--> statement-breakpoint
CREATE INDEX `idx_real_estate_property_photos_unit`
  ON `real_estate_property_photos` (`unit_id`, `is_active`, `is_primary`);
