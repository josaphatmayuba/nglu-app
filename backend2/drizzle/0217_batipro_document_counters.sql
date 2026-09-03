-- BatiPro : compteur de numerotation sequentielle par (org, type, annee).
-- Sert a generer des numeros legaux sans trou ni doublon (DEV-2026-0001, etc.).
-- La sequence est incrementee sous verrou (SELECT ... FOR UPDATE) en transaction.
CREATE TABLE IF NOT EXISTS `batipro_document_counters` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `type` VARCHAR(20) NOT NULL,
  `year` INT NOT NULL,
  `last_number` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_batipro_document_counters_org_type_year` (`organization_id`, `type`, `year`)
);
