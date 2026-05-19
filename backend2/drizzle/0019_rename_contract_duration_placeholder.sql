-- 0019_rename_contract_duration_placeholder.sql
-- Adds is_active (soft-delete) to maintenance requests + seeds permissions.
-- MySQL 8.0 compatible: PREPARE/EXECUTE for idempotent ADD COLUMN.

-- 1. Add is_active column (idempotent)
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_maintenance_requests' AND COLUMN_NAME = 'is_active');
SET @sql := IF(@col = 0,
  'ALTER TABLE real_estate_maintenance_requests ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- 2. Backfill
UPDATE real_estate_maintenance_requests SET is_active = 1 WHERE is_active IS NULL;
--> statement-breakpoint

-- 3. Seed maintenance permissions
INSERT IGNORE INTO permission (name, type) VALUES
  ('readAll-maintenance',    'propertyManagement'),
  ('readSingle-maintenance', 'propertyManagement'),
  ('create-maintenance',     'propertyManagement'),
  ('update-maintenance',     'propertyManagement'),
  ('delete-maintenance',     'propertyManagement');
--> statement-breakpoint

-- 4. Grant to super-admin (1), admin (2), manager (3)
INSERT INTO rolePermission (roleId, permissionId)
SELECT r.id, p.id FROM permission p, role r
WHERE p.name IN (
  'readAll-maintenance','readSingle-maintenance',
  'create-maintenance','update-maintenance','delete-maintenance'
)
AND r.id IN (1,2,3)
AND NOT EXISTS (
  SELECT 1 FROM rolePermission rp
  WHERE rp.roleId = r.id AND rp.permissionId = p.id
);
