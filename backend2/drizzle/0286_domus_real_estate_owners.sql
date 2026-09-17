-- Domus : proprietaires legaux des biens immobiliers.
-- Distinction importante : le PROPRIETAIRE legal (signataire du bail, cette
-- table) nest pas le GESTIONNAIRE mandate, qui reste porte par appSettings
-- (landlord_name / landlord_phone / landlord_signature), INCHANGE.
-- owner_type : individual ou company. Pour une societe, company_name et
-- representative_name sont utilises ; pour un particulier, first_name/last_name.
-- display_name reste le libelle affiche dans tous les cas.
-- signature : data-URL base64, meme format que appSetting.landlord_signature.
-- is_active = soft delete (jamais de DELETE physique), conforme a la regle projet.
-- Toutes les FK sont logiques (pas de contrainte physique), comme le reste des
-- tables real_estate_*.
-- Aucune donnee de demo inseree ici (regle projet stricte).
CREATE TABLE IF NOT EXISTS `real_estate_owners` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `display_name` varchar(255) NOT NULL,
  `owner_type` varchar(20) NOT NULL DEFAULT 'individual',
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `representative_name` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `phone2` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `id_document_type` varchar(100) DEFAULT NULL,
  `id_number` varchar(100) DEFAULT NULL,
  `tax_id` varchar(100) DEFAULT NULL,
  `signature` text,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_re_owners_org_active` (`organization_id`, `is_active`),
  KEY `idx_re_owners_org_name` (`organization_id`, `display_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
