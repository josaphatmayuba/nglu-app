-- Domus : DELEGUES (mandataires charges du suivi de loyer).
-- Un delegue est une personne a qui le gestionnaire confie le suivi du
-- portefeuille : il recoit les memes annonces que le proprietaire (bail cree,
-- fin de bail, loyer en retard) sans etre le bailleur legal du bien.
--
-- Deux natures cohabitent, donc user_id nullable :
--   * contact externe  -> user_id NULL, il existe seulement par son telephone
--   * employe interne  -> user_id renseigne, il a deja un compte nglu
-- Dans les deux cas le telephone porte la notification : le SMS fait
-- foi, pas le login.
--
-- Soft delete (is_active) conformement a la regle projet : un delegue retire
-- garde son historique des envois dans sms_logs.
-- Forme idempotente : la migration doit pouvoir etre rejouee sur dev et prod.
CREATE TABLE IF NOT EXISTS `real_estate_delegates` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `phone` varchar(50),
  `phone2` varchar(50),
  `email` varchar(255),
  `user_id` int,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `real_estate_delegates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
SET @idx_deleg := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_delegates' AND INDEX_NAME = 'idx_delegates_org_active');
--> statement-breakpoint
SET @sql := IF(@idx_deleg = 0, 'CREATE INDEX `idx_delegates_org_active` ON `real_estate_delegates` (`organization_id`, `is_active`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
-- Affectations : ce que le delegue suit, et ce quil doit recevoir.
-- scope_type = owner    -> scope_id = real_estate_owners.id
--                            (tout le portefeuille de ce proprietaire, y
--                             compris les biens acquis plus tard)
-- scope_type = property -> scope_id = real_estate_properties.id
--                            (ce bien precis)
-- Les deux portees coexistent : un delegue peut suivre un portefeuille entier
-- ET un immeuble supplementaire dun autre proprietaire.
--
-- Les trois drapeaux sont des abonnements par evenement : on evite d inonder un
-- delegue engage seulement sur les retards avec les creations de bail.
CREATE TABLE IF NOT EXISTS `real_estate_delegate_assignments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL,
  `delegate_id` int NOT NULL,
  `scope_type` varchar(20) NOT NULL DEFAULT 'property',
  `scope_id` int NOT NULL,
  `notify_lease` tinyint NOT NULL DEFAULT 1,
  `notify_overdue` tinyint NOT NULL DEFAULT 1,
  `notify_payment` tinyint NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `real_estate_delegate_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
SET @idx_assign := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_delegate_assignments' AND INDEX_NAME = 'idx_delegate_assignments_scope');
--> statement-breakpoint
SET @sql2 := IF(@idx_assign = 0, 'CREATE INDEX `idx_delegate_assignments_scope` ON `real_estate_delegate_assignments` (`organization_id`, `scope_type`, `scope_id`, `is_active`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt2 FROM @sql2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
--> statement-breakpoint
SET @idx_assign2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_delegate_assignments' AND INDEX_NAME = 'idx_delegate_assignments_delegate');
--> statement-breakpoint
SET @sql3 := IF(@idx_assign2 = 0, 'CREATE INDEX `idx_delegate_assignments_delegate` ON `real_estate_delegate_assignments` (`organization_id`, `delegate_id`, `is_active`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt3 FROM @sql3;
--> statement-breakpoint
EXECUTE stmt3;
--> statement-breakpoint
DEALLOCATE PREPARE stmt3;
