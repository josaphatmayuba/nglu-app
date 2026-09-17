-- Domus : journal des SMS envoyes (Twilio), miroir de system_email_logs pour
-- les emails. Permet d afficher l historique des communications (email + SMS)
-- envoyees a un locataire (onglet Communications).
-- organization_id est inclus des le depart (contrairement a system_email_logs
-- qui ne l a pas) pour garantir le scope multi-tenant strict des le debut.
-- related_type / related_id : mêmes conventions que system_email_logs
-- ("real-estate-lease" + leaseId, ou "tenant" + tenantId selon le contexte).
-- Aucune FK physique (coherent avec le reste des tables real_estate_*).
-- Table de log uniquement : pas de suppression prevue, pas de donnee de demo.
CREATE TABLE IF NOT EXISTS `sms_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `sms_type` varchar(100) NOT NULL,
  `recipient` varchar(50) NOT NULL,
  `body` text,
  `status` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
  `related_type` varchar(100) DEFAULT NULL,
  `related_id` varchar(100) DEFAULT NULL,
  `provider_message_id` varchar(255) DEFAULT NULL,
  `error_message` varchar(1000) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sms_logs_org` (`organization_id`),
  KEY `idx_sms_logs_related` (`related_type`, `related_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
