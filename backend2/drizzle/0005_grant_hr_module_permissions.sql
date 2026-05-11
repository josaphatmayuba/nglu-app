INSERT INTO `rolePermission` (`roleId`, `permissionId`, `created_at`, `updated_at`)
SELECT r.`id`, p.`id`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `role` r
JOIN `permission` p
  ON p.`name` IN (
    'create-designation',
    'readAll-designation',
    'readSingle-designation',
    'update-designation',
    'delete-designation',
    'create-shift',
    'readAll-shift',
    'readSingle-shift',
    'update-shift',
    'delete-shift',
    'create-award',
    'readAll-award',
    'readSingle-award',
    'update-award',
    'delete-award',
    'create-awardHistory',
    'readAll-awardHistory',
    'readSingle-awardHistory',
    'update-awardHistory',
    'delete-awardHistory',
    'create-designationHistory',
    'readAll-designationHistory',
    'readSingle-designationHistory',
    'update-designationHistory',
    'delete-designationHistory',
    'create-salaryHistory',
    'readAll-salaryHistory',
    'readSingle-salaryHistory',
    'update-salaryHistory',
    'delete-salaryHistory'
  )
WHERE r.`name` IN ('super-admin', 'admin', 'manager')
  AND NOT EXISTS (
    SELECT 1
    FROM `rolePermission` rp
    WHERE rp.`roleId` = r.`id`
      AND rp.`permissionId` = p.`id`
  );
