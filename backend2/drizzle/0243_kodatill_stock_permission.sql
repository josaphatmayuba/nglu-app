-- KodaTill (SCRUM-288 / epic SCRUM-278) : permission dediee a la gestion du
-- stock (restock/adjust), distincte de kodatill_catalog_manage qui porte sur
-- les produits/categories et de kodatill_view qui reste lecture seule.
--
-- Conventions projet : un seul statement par breakpoint, aucune apostrophe
-- dans les commentaires, aucune donnee de demonstration inseree, meme motif
-- que 0239_kodatill_cash.sql (organization_id generique, INSERT IGNORE
-- idempotent car name est UNIQUE sur permission).
INSERT IGNORE INTO `permission` (`name`, `type`, `created_at`, `updated_at`) VALUES
  ('kodatill_stock_manage', 'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint
-- Attribution au role admin (et super-admin) de chaque organisation. Le NOT EXISTS
-- rend le rejeu sans effet. organization_id est denormalise depuis le role parent.
INSERT INTO `rolePermission` (`organization_id`, `roleId`, `permissionId`, `created_at`, `updated_at`)
SELECT r.`organization_id`, r.`id`, p.`id`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `role` r
JOIN `permission` p
  ON p.`name` = 'kodatill_stock_manage'
WHERE r.`name` IN ('super-admin', 'admin')
  AND NOT EXISTS (
    SELECT 1
    FROM `rolePermission` rp
    WHERE rp.`roleId` = r.`id`
      AND rp.`permissionId` = p.`id`
  );
