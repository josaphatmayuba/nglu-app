-- Domus : lien portail locataire (acces public sans login, token opaque en URL).
-- Un lien = un token oppose au tenant (customers.id, role Locataire), resolu
-- publiquement via son hash (token_hash). Colonne token en clair ajoutee en
-- 0283 pour pouvoir reutiliser le meme lien sans le regenerer a chaque appel
-- (meme pattern que tenant_onboardings.token/tokenHash).
-- expires_at nullable : un lien permanent est accepte (reutilise tant que non
-- revoque), pas de raison forte de forcer une expiration pour ce cas d'usage.
-- revoked_at nullable = invalidation douce (soft delete), jamais de DELETE
-- physique, conforme a la regle projet.
-- Toutes les FK sont logiques (pas de contrainte physique), comme le reste des
-- tables real_estate_*.
CREATE TABLE IF NOT EXISTS `real_estate_tenant_portal_links` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `tenant_id` bigint NOT NULL,
  `token_hash` varchar(128) NOT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_portal_links_token_hash` (`token_hash`),
  KEY `idx_tenant_portal_links_org_tenant` (`organization_id`, `tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
