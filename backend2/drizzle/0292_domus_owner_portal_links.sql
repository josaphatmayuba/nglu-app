-- Domus : liens portail PROPRIETAIRE (acces public sans login, token opaque).
-- Meme mecanique que real_estate_tenant_portal_links : seul le hash SHA-256
-- sert a resoudre le token cote public, le token en clair est conserve pour
-- pouvoir reafficher/renvoyer le meme lien sans invalider les SMS deja partis.
-- Le lien est scope a UN couple (proprietaire, locataire) : le proprietaire ne
-- voit que la fiche du locataire annonce dans le SMS, jamais tout le portefeuille.
-- Forme idempotente : la migration doit pouvoir etre rejouee sur dev et prod.
CREATE TABLE IF NOT EXISTS `real_estate_owner_portal_links` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL,
  `owner_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `property_id` int,
  `token` varchar(64),
  `token_hash` varchar(128) NOT NULL,
  `expires_at` timestamp NULL,
  `revoked_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `real_estate_owner_portal_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
SET @uniq_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_owner_portal_links' AND INDEX_NAME = 'real_estate_owner_portal_links_token_hash_unique');
--> statement-breakpoint
SET @sql := IF(@uniq_exists = 0, 'CREATE UNIQUE INDEX `real_estate_owner_portal_links_token_hash_unique` ON `real_estate_owner_portal_links` (`token_hash`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_owner_portal_links' AND INDEX_NAME = 'idx_owner_portal_links_owner_tenant');
--> statement-breakpoint
SET @sql2 := IF(@idx_exists = 0, 'CREATE INDEX `idx_owner_portal_links_owner_tenant` ON `real_estate_owner_portal_links` (`organization_id`, `owner_id`, `tenant_id`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt2 FROM @sql2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
