-- Domus : demandes de modification des donnees personnelles soumises par le
-- locataire depuis son portail public (lien sans login).
-- Rien nest applique automatiquement : la demande est stockee ici en 'pending'
-- et un gestionnaire doit lapprouver pour que les colonnes customers /
-- tenant_details soient reellement modifiees. Sans ce garde-fou, quiconque
-- possede le lien pourrait changer le telephone ou lemail du dossier.
-- Forme idempotente (CREATE TABLE IF NOT EXISTS) : la table est nouvelle mais
-- la migration doit pouvoir etre rejouee sur dev et prod sans casser le boot.
CREATE TABLE IF NOT EXISTS `real_estate_tenant_change_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL,
  `tenant_id` int NOT NULL,
  `changes` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `reviewed_by` int,
  `reviewed_at` timestamp NULL,
  `review_note` varchar(500),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `real_estate_tenant_change_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_tenant_change_requests' AND INDEX_NAME = 'idx_tenant_change_requests_tenant');
--> statement-breakpoint
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX `idx_tenant_change_requests_tenant` ON `real_estate_tenant_change_requests` (`organization_id`, `tenant_id`, `status`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
