INSERT INTO `rolePermission` (`roleId`, `permissionId`, `created_at`, `updated_at`)
SELECT r.`id`, p.`id`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `role` r
JOIN `permission` p
  ON p.`name` IN (
    'create-department',
    'readAll-department',
    'readSingle-department',
    'update-department',
    'delete-department',
    'create-education',
    'readAll-education',
    'readSingle-education',
    'update-education',
    'delete-education',
    'create-employmentStatus',
    'readAll-employmentStatus',
    'readSingle-employmentStatus',
    'update-employmentStatus',
    'delete-employmentStatus',
    'create-color',
    'readAll-color',
    'readSingle-color',
    'update-color',
    'delete-color',
    'create-productAttribute',
    'readAll-productAttribute',
    'readSingle-productAttribute',
    'update-productAttribute',
    'delete-productAttribute',
    'create-productAttributeValue',
    'readAll-productAttributeValue',
    'readSingle-productAttributeValue',
    'update-productAttributeValue',
    'delete-productAttributeValue',
    'create-termsAndCondition',
    'readAll-termsAndCondition',
    'readSingle-termsAndCondition',
    'update-termsAndCondition',
    'delete-termsAndCondition',
    'create-pageSize',
    'readAll-pageSize',
    'readSingle-pageSize',
    'update-pageSize',
    'delete-pageSize'
  )
WHERE r.`name` IN ('super-admin', 'admin', 'manager')
  AND NOT EXISTS (
    SELECT 1
    FROM `rolePermission` rp
    WHERE rp.`roleId` = r.`id`
      AND rp.`permissionId` = p.`id`
  );
