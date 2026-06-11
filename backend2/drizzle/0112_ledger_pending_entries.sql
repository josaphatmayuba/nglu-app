-- Idempotent. Ecritures comptables en attente d approbation : si un module est
-- gate (ledger_approval_requirements) et sans approbation validee, post() persiste
-- l ecriture ici au lieu de comptabiliser. approveAndPost la rejoue a l approbation.
CREATE TABLE IF NOT EXISTS `ledger_pending_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `source_module` varchar(64) NOT NULL,
  `related_id` varchar(64) NOT NULL,
  `payload` json NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'pending',
  `journal_entry_id` bigint unsigned NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pending_entity` (`organization_id`, `source_module`, `related_id`),
  KEY `idx_pending_status` (`organization_id`, `status`)
);
