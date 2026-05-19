-- 0025_add_maintenance_costs.sql
-- Table for recording actual maintenance costs per ticket.
-- Idempotent (MySQL 8.0 compatible).

CREATE TABLE IF NOT EXISTS `real_estate_maintenance_costs` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ticket_id`      BIGINT          NOT NULL,
  `type`           VARCHAR(50)     NOT NULL DEFAULT 'service',
  `description`    VARCHAR(500)    NOT NULL,
  `amount`         DECIMAL(15,2)   NOT NULL DEFAULT 0,
  `currency_id`    BIGINT          NULL,
  `vendor_name`    VARCHAR(255)    NULL,
  `payment_method` VARCHAR(50)     NOT NULL DEFAULT 'cash',
  `payment_date`   DATE            NULL,
  `notes`          TEXT            NULL,
  `created_at`     TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_maint_costs_ticket` (`ticket_id`)
);
--> statement-breakpoint

INSERT IGNORE INTO `permission` (name, type) VALUES
  ('create-maintenance-cost',  'propertyManagement'),
  ('readAll-maintenance-cost', 'propertyManagement'),
  ('delete-maintenance-cost',  'propertyManagement');
--> statement-breakpoint

INSERT INTO `rolePermission` (roleId, permissionId)
SELECT r.id, p.id FROM `permission` p, `role` r
WHERE p.name IN ('create-maintenance-cost','readAll-maintenance-cost','delete-maintenance-cost')
AND r.id IN (1,2,3)
AND NOT EXISTS (
  SELECT 1 FROM `rolePermission` rp WHERE rp.roleId = r.id AND rp.permissionId = p.id
);
