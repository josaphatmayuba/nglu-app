-- BatiPro permissions (standard CRUD).
INSERT IGNORE INTO `permission` (`name`, `type`, `created_at`, `updated_at`) VALUES
  ('create-batipro',     'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readAll-batipro',    'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readSingle-batipro', 'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('update-batipro',     'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('delete-batipro',     'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
-- Grant to super-admin, admin and manager.
INSERT INTO `rolePermission` (`roleId`, `permissionId`, `created_at`, `updated_at`)
SELECT r.`id`, p.`id`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `role` r
JOIN `permission` p
  ON p.`name` IN (
    'create-batipro',
    'readAll-batipro',
    'readSingle-batipro',
    'update-batipro',
    'delete-batipro'
  )
WHERE r.`name` IN ('super-admin', 'admin', 'manager')
  AND NOT EXISTS (
    SELECT 1
    FROM `rolePermission` rp
    WHERE rp.`roleId` = r.`id`
      AND rp.`permissionId` = p.`id`
  );
