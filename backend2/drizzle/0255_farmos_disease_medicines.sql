-- SCRUM-192 (suite) -- Lien maladie -> medicament/vaccin en stock, pour que
-- la fiche maladie recommande directement ce que la ferme a deja en stock.
-- Table org-scopee (comme farmos_medicines) : le lien depend du stock reel
-- de chaque organisation, pas du catalogue global de maladies.

CREATE TABLE IF NOT EXISTS `farmos_disease_medicines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL,
  `disease_id` bigint unsigned NOT NULL,
  `medicine_id` bigint unsigned NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'treatment',
  `notes` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_disease_medicine` (`organization_id`, `disease_id`, `medicine_id`),
  KEY `idx_disease_medicines_disease` (`disease_id`),
  KEY `idx_disease_medicines_medicine` (`medicine_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
