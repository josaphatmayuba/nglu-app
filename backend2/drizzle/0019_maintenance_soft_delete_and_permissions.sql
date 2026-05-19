-- SCRUM-73: Maintenance soft-delete + permissions
-- Adds is_active flag (soft-delete) and seeds maintenance permissions.
-- permission table uses columns: name, type (not permission_name)
-- junction table is: rolePermission (roleId, permissionId)

-- 1. Add is_active column
ALTER TABLE real_estate_maintenance_requests
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1;
--> statement-breakpoint

-- 2. Backfill existing rows (no-op since DEFAULT 1 handles new rows)
UPDATE real_estate_maintenance_requests SET is_active = 1 WHERE is_active IS NULL;
--> statement-breakpoint

-- 3. Seed maintenance permissions (INSERT IGNORE = idempotent)
INSERT IGNORE INTO permission (name, type)
VALUES
  ('readAll-maintenance',    'propertyManagement'),
  ('readSingle-maintenance', 'propertyManagement'),
  ('create-maintenance',     'propertyManagement'),
  ('update-maintenance',     'propertyManagement'),
  ('delete-maintenance',     'propertyManagement');
--> statement-breakpoint

-- 4. Grant to super-admin (roleId=1), admin (roleId=2), manager (roleId=3)
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
