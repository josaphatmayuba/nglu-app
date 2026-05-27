-- SCRUM-224: permission to create Stalwart mailboxes from the CRM.
INSERT IGNORE INTO permission (name, type, createdAt, updatedAt) VALUES
  ('create-mailAccount', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readAll-mailAccount', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
INSERT IGNORE INTO rolePermission (roleId, permissionId, createdAt, updatedAt)
SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM role r
JOIN permission p ON p.name IN ('create-mailAccount', 'readAll-mailAccount')
LEFT JOIN rolePermission rp ON rp.roleId = r.id AND rp.permissionId = p.id
WHERE r.is_system = 1 AND rp.id IS NULL;
