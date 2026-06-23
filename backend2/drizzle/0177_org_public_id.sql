-- Identifiant PUBLIC opaque hexa pour les organisations (decision owner : pas de
-- numero simple expose). La PK organizations.id reste un entier interne ; on
-- ajoute public_id = prefixe org_ suivi de 12 caracteres hexa, expose dans API.
-- Idempotent (INFORMATION_SCHEMA + PREPARE, MySQL 8 sans IF NOT EXISTS natif).

-- 1) Colonne public_id
SET @org_pid_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'public_id'
);
--> statement-breakpoint
SET @org_pid_sql := IF(@org_pid_exists = 0,
  'ALTER TABLE `organizations` ADD COLUMN `public_id` VARCHAR(24) NULL AFTER `id`',
  'SELECT 1');
--> statement-breakpoint
PREPARE org_pid_stmt FROM @org_pid_sql;
--> statement-breakpoint
EXECUTE org_pid_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE org_pid_stmt;
--> statement-breakpoint

-- 2) Backfill : genere un hexa pour les orgs sans public_id (rejouable : ne touche
-- que les NULL). 12 hex tires de UUID (sans tirets), prefixe org_.
UPDATE `organizations`
SET `public_id` = CONCAT('org_', SUBSTRING(REPLACE(UUID(), '-', ''), 1, 12))
WHERE `public_id` IS NULL OR `public_id` = '';
--> statement-breakpoint

-- 3) Index unique sur public_id
SET @org_pid_idx := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND INDEX_NAME = 'uq_organizations_public_id'
);
--> statement-breakpoint
SET @org_pid_idx_sql := IF(@org_pid_idx = 0,
  'CREATE UNIQUE INDEX `uq_organizations_public_id` ON `organizations` (`public_id`)',
  'SELECT 1');
--> statement-breakpoint
PREPARE org_pid_idx_stmt FROM @org_pid_idx_sql;
--> statement-breakpoint
EXECUTE org_pid_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE org_pid_idx_stmt;
--> statement-breakpoint
