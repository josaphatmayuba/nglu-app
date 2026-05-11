INSERT INTO `rolePermission` (`roleId`, `permissionId`, `created_at`, `updated_at`)
SELECT r.`id`, p.`id`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `role` r
JOIN `permission` p
  ON p.`name` REGEXP '(adjust|announcement|email|emailConfig|manualPayment|purchaseReorderInvoice|quote|returnPurchaseInvoice|returnSaleInvoice|reorderQuantity|dimensionUnit|wightUnit|productProductAttributeValue)'
WHERE r.`name` IN ('super-admin', 'admin', 'manager')
  AND NOT EXISTS (
    SELECT 1
    FROM `rolePermission` rp
    WHERE rp.`roleId` = r.`id`
      AND rp.`permissionId` = p.`id`
  );
