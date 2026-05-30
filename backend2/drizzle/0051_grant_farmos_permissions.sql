-- SCRUM-193 — FarmOS permissions (5 standard CRUD + cost-like nothing yet).
INSERT IGNORE INTO `permission` (`name`, `type`, `created_at`, `updated_at`) VALUES
  ('create-farmos',     'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readAll-farmos',    'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readSingle-farmos', 'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('update-farmos',     'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('delete-farmos',     'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
-- Grant to super-admin, admin and manager (idempotent via NOT EXISTS).
INSERT INTO `rolePermission` (`roleId`, `permissionId`, `created_at`, `updated_at`)
SELECT r.`id`, p.`id`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `role` r
JOIN `permission` p
  ON p.`name` IN (
    'create-farmos',
    'readAll-farmos',
    'readSingle-farmos',
    'update-farmos',
    'delete-farmos'
  )
WHERE r.`name` IN ('super-admin', 'admin', 'manager')
  AND NOT EXISTS (
    SELECT 1
    FROM `rolePermission` rp
    WHERE rp.`roleId` = r.`id`
      AND rp.`permissionId` = p.`id`
  );
