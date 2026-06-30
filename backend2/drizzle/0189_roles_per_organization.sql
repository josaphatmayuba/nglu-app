-- RBAC multi-tenant (Phase 0) : isole les roles par organisation.
-- 1) ajoute organization_id sur role et rolePermission (defaut 1 = historique)
-- 2) remplace l unique global role.name par un unique composite (org_id, name)
-- Idempotent (INFORMATION_SCHEMA + PREPARE) : MySQL 8 ne gere pas
-- ADD COLUMN IF NOT EXISTS ni DROP INDEX IF EXISTS. Pas d apostrophe dans les
-- commentaires (le splitter de reparation coupe sur les quotes).

-- role.organization_id
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role' AND COLUMN_NAME = 'organization_id');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `role` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint

-- rolePermission.organization_id
SET @col2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rolePermission' AND COLUMN_NAME = 'organization_id');
--> statement-breakpoint
SET @sql2 := IF(@col2 = 0, 'ALTER TABLE `rolePermission` ADD COLUMN `organization_id` bigint NOT NULL DEFAULT 1', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt2 FROM @sql2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
--> statement-breakpoint

-- rolePermission.organization_id aligne sur le role parent (au cas ou des lignes
-- existaient avant le defaut ; sans effet si deja a 1).
UPDATE `rolePermission` rp JOIN `role` r ON r.id = rp.roleId SET rp.organization_id = r.organization_id WHERE rp.organization_id <> r.organization_id;
--> statement-breakpoint

-- Supprime l ancien unique global sur role.name (nom d index inconnu : on le
-- retrouve via INFORMATION_SCHEMA, en excluant le futur unique composite).
SET @idx := (SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role' AND COLUMN_NAME = 'name' AND NON_UNIQUE = 0 AND INDEX_NAME <> 'uq_role_org_name' LIMIT 1);
--> statement-breakpoint
SET @sqlDrop := IF(@idx IS NOT NULL, CONCAT('ALTER TABLE `role` DROP INDEX `', @idx, '`'), 'SELECT 1');
--> statement-breakpoint
PREPARE stmtDrop FROM @sqlDrop;
--> statement-breakpoint
EXECUTE stmtDrop;
--> statement-breakpoint
DEALLOCATE PREPARE stmtDrop;
--> statement-breakpoint

-- Ajoute l unique composite (organization_id, name) si absent.
SET @uq := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role' AND INDEX_NAME = 'uq_role_org_name');
--> statement-breakpoint
SET @sqlUq := IF(@uq = 0, 'ALTER TABLE `role` ADD CONSTRAINT `uq_role_org_name` UNIQUE (`organization_id`, `name`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmtUq FROM @sqlUq;
--> statement-breakpoint
EXECUTE stmtUq;
--> statement-breakpoint
DEALLOCATE PREPARE stmtUq;
