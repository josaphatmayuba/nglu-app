-- BatiPro : notifications in-app recalculees a la lecture (pas de cron).
-- type : task_overdue / invoice_pending / budget_exceeded.
-- severity : info / warning / critical. entity_type : task / document / project.
-- is_read pour le badge, is_active pour le soft dismiss.
-- Pas de contrainte FK stricte (meme pattern que les autres tables batipro), seulement des index.
CREATE TABLE IF NOT EXISTS `batipro_notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `project_id` BIGINT,
  `type` VARCHAR(40) NOT NULL,
  `severity` VARCHAR(20) NOT NULL DEFAULT 'info',
  `title` VARCHAR(255) NOT NULL,
  `message` VARCHAR(500) NOT NULL,
  `entity_type` VARCHAR(40),
  `entity_id` BIGINT,
  `is_read` TINYINT NOT NULL DEFAULT 0,
  `read_at` TIMESTAMP NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_notifications_org_active` (`organization_id`, `is_active`),
  KEY `idx_batipro_notifications_org_read` (`organization_id`, `is_read`),
  KEY `idx_batipro_notifications_org_entity` (`organization_id`, `entity_type`, `entity_id`),
  KEY `idx_batipro_notifications_org_project` (`organization_id`, `project_id`)
);
