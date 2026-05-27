-- Add message permissions if they don't already exist
INSERT IGNORE INTO permissions (name, type, createdAt, updatedAt) VALUES
  ('create-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readAll-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readSingle-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('update-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('delete-message', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Assign message permissions to admin role (roleId = 1)
INSERT IGNORE INTO rolePermissions (roleId, permissionId, createdAt, updatedAt)
SELECT 1, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM permissions
WHERE name IN ('create-message', 'readAll-message', 'readSingle-message', 'update-message', 'delete-message');
