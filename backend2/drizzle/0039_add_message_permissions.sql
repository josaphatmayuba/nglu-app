-- Add message permissions if they don't already exist
INSERT IGNORE INTO permission (name, type, createdAt, updatedAt) VALUES
  ('create-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readAll-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readSingle-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('update-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('delete-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
-- Assign message permissions to admin role (roleId = 1)
INSERT IGNORE INTO rolePermission (roleId, permissionId, createdAt, updatedAt)
SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM role r
JOIN permission p ON p.name IN ('create-message', 'readAll-message', 'readSingle-message', 'update-message', 'delete-message')
LEFT JOIN rolePermission rp ON rp.roleId = r.id AND rp.permissionId = p.id
WHERE r.is_system = 1 AND rp.id IS NULL;
