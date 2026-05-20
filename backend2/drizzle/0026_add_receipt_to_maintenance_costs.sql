-- 0026_add_receipt_to_maintenance_costs.sql
-- Add receipt_url column to maintenance costs for invoice/photo attachment.
-- Idempotent (MySQL 8.0 compatible).

ALTER TABLE `real_estate_maintenance_costs`
  ADD COLUMN IF NOT EXISTS `receipt_url` VARCHAR(500) NULL;
