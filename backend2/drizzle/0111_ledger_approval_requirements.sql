-- Idempotent. Gate d approbation centralise : un module liste ici exige une
-- instance workflow approuvee avant comptabilisation de ses ecritures.
-- Table VIDE par defaut = aucun blocage (activation progressive, zero regression).
CREATE TABLE IF NOT EXISTS `ledger_approval_requirements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `source_module` varchar(64) NOT NULL,
  `workflow_key` varchar(64) NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lar_org_module` (`organization_id`, `source_module`),
  KEY `idx_lar_org` (`organization_id`)
);
