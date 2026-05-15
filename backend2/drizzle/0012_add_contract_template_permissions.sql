-- Insert the 5 standard permissions for contractTemplate (idempotent thanks to INSERT IGNORE).
INSERT IGNORE INTO `permission` (`name`, `type`, `created_at`, `updated_at`) VALUES
  ('create-contractTemplate',     'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readAll-contractTemplate',    'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readSingle-contractTemplate', 'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('update-contractTemplate',     'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('delete-contractTemplate',     'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
-- Grant these permissions to super-admin, admin and manager (idempotent via NOT EXISTS).
INSERT INTO `rolePermission` (`roleId`, `permissionId`, `created_at`, `updated_at`)
SELECT r.`id`, p.`id`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `role` r
JOIN `permission` p
  ON p.`name` IN (
    'create-contractTemplate',
    'readAll-contractTemplate',
    'readSingle-contractTemplate',
    'update-contractTemplate',
    'delete-contractTemplate'
  )
WHERE r.`name` IN ('super-admin', 'admin', 'manager')
  AND NOT EXISTS (
    SELECT 1
    FROM `rolePermission` rp
    WHERE rp.`roleId` = r.`id`
      AND rp.`permissionId` = p.`id`
  );
