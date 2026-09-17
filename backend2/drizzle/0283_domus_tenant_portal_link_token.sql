-- Domus : ajoute le token en clair sur real_estate_tenant_portal_links.
-- Necessaire pour pouvoir RE-RETOURNER le meme lien actif au gestionnaire
-- (ou dans les envois automatiques de bienvenue/rappel) sans le regenerer a
-- chaque appel de generateTenantPortalLink (sinon chaque appel invalidait le
-- lien precedent deja envoye au locataire). token_hash reste la source de
-- verite pour la resolution publique (index unique inchange).
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_tenant_portal_links'
    AND COLUMN_NAME = 'token'
);
--> statement-breakpoint
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `real_estate_tenant_portal_links` ADD COLUMN `token` varchar(64) NULL AFTER `tenant_id`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
