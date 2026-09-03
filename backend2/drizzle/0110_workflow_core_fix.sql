-- Re-creation des tables Workflow (0108 a echoue au repair: une apostrophe dans
-- un commentaire cassait splitSqlStatements qui suit les quotes). Commentaires sans apostrophe.
-- Module Workflow ERP/SIFA : moteur d approbation generique transverse.
CREATE TABLE IF NOT EXISTS `workflows` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `key` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `steps` json NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_workflow_org_key` (`organization_id`, `key`),
  KEY `idx_workflow_org` (`organization_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workflow_instances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `workflow_id` bigint unsigned NOT NULL,
  `entity_type` varchar(64) NOT NULL,
  `entity_id` varchar(64) NOT NULL,
  `current_step` int NOT NULL DEFAULT 0,
  `status` varchar(16) NOT NULL DEFAULT 'pending',
  `submitted_by` bigint NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wfi_org` (`organization_id`),
  KEY `idx_wfi_entity` (`entity_type`, `entity_id`),
  KEY `idx_wfi_status` (`organization_id`, `status`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workflow_approvals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `instance_id` bigint unsigned NOT NULL,
  `step` int NOT NULL,
  `approver_id` bigint NULL,
  `decision` varchar(16) NOT NULL,
  `comment` varchar(255) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wfa_instance` (`instance_id`),
  KEY `idx_wfa_org` (`organization_id`)
);
