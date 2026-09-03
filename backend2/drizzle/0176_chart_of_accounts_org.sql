-- P2 multi-tenant : isolation du plan comptable par organisation.
-- account / subAccount / transaction_types n avaient pas organization_id (fuite
-- inter-org : un client voyait les comptes d un autre). On ajoute la colonne
-- (NOT NULL DEFAULT 1 => les lignes existantes basculent sur l org 1 = base
-- historique). subAccount : colonne denormalisee (decision owner), backfillee
-- depuis le compte parent. Les ecritures (transaction, journal_entries) ont
-- DEJA organization_id : seul le referentiel de comptes manquait.
-- Idempotent (INFORMATION_SCHEMA + PREPARE) car ALTER/INDEX hors auto-create
-- fiable sous MySQL 8 (pas de IF NOT EXISTS natif sur ADD COLUMN / CREATE INDEX).

-- 1) account.organization_id
SET @acc_org_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'account' AND COLUMN_NAME = 'organization_id'
);
--> statement-breakpoint
SET @acc_org_sql := IF(@acc_org_exists = 0,
  'ALTER TABLE `account` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1',
  'SELECT 1');
--> statement-breakpoint
PREPARE acc_org_stmt FROM @acc_org_sql;
--> statement-breakpoint
EXECUTE acc_org_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE acc_org_stmt;
--> statement-breakpoint

-- 2) transaction_types.organization_id
SET @tt_org_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transaction_types' AND COLUMN_NAME = 'organization_id'
);
--> statement-breakpoint
SET @tt_org_sql := IF(@tt_org_exists = 0,
  'ALTER TABLE `transaction_types` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1',
  'SELECT 1');
--> statement-breakpoint
PREPARE tt_org_stmt FROM @tt_org_sql;
--> statement-breakpoint
EXECUTE tt_org_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE tt_org_stmt;
--> statement-breakpoint

-- 3) subAccount.organization_id
SET @sub_org_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subAccount' AND COLUMN_NAME = 'organization_id'
);
--> statement-breakpoint
SET @sub_org_sql := IF(@sub_org_exists = 0,
  'ALTER TABLE `subAccount` ADD COLUMN `organization_id` BIGINT NOT NULL DEFAULT 1',
  'SELECT 1');
--> statement-breakpoint
PREPARE sub_org_stmt FROM @sub_org_sql;
--> statement-breakpoint
EXECUTE sub_org_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sub_org_stmt;
--> statement-breakpoint

-- 4) Backfill : subAccount herite de l org de son compte parent (rejouable).
UPDATE `subAccount` s
JOIN `account` a ON a.`id` = s.`accountId`
SET s.`organization_id` = a.`organization_id`
WHERE s.`organization_id` <> a.`organization_id`;
--> statement-breakpoint

-- 5) Index par org (filtres de lecture du plan comptable).
SET @acc_idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'account' AND INDEX_NAME = 'idx_account_org'
);
--> statement-breakpoint
SET @acc_idx_sql := IF(@acc_idx_exists = 0,
  'CREATE INDEX `idx_account_org` ON `account` (`organization_id`)',
  'SELECT 1');
--> statement-breakpoint
PREPARE acc_idx_stmt FROM @acc_idx_sql;
--> statement-breakpoint
EXECUTE acc_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE acc_idx_stmt;
--> statement-breakpoint

SET @sub_idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subAccount' AND INDEX_NAME = 'idx_subaccount_org'
);
--> statement-breakpoint
SET @sub_idx_sql := IF(@sub_idx_exists = 0,
  'CREATE INDEX `idx_subaccount_org` ON `subAccount` (`organization_id`)',
  'SELECT 1');
--> statement-breakpoint
PREPARE sub_idx_stmt FROM @sub_idx_sql;
--> statement-breakpoint
EXECUTE sub_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sub_idx_stmt;
--> statement-breakpoint

SET @tt_idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transaction_types' AND INDEX_NAME = 'idx_transaction_types_org'
);
--> statement-breakpoint
SET @tt_idx_sql := IF(@tt_idx_exists = 0,
  'CREATE INDEX `idx_transaction_types_org` ON `transaction_types` (`organization_id`)',
  'SELECT 1');
--> statement-breakpoint
PREPARE tt_idx_stmt FROM @tt_idx_sql;
--> statement-breakpoint
EXECUTE tt_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE tt_idx_stmt;
--> statement-breakpoint
