-- KodaTill : kt_expenses.expense_date passe de DATE a DATETIME.
-- Le reste du module horodate deja a la seconde (kt_orders, kt_payments,
-- kt_cash_sessions), seules les depenses ne retenaient que le jour. Decision
-- explicite du proprietaire du projet : on veut l heure de saisie de la depense.
-- Perte d info retroactive assumee : les lignes existantes basculent a 00:00:00
-- pour la date deja stockee, aucune heure n ayant jamais ete saisie avant ce fix.
-- Idempotent : le MODIFY n est emis que si la colonne est encore de type date,
-- via INFORMATION_SCHEMA (MySQL 8 ne supporte pas MODIFY COLUMN IF ...).
-- Pas de procedure stockee, un seul statement par breakpoint, aucune apostrophe
-- dans les commentaires.
SET @kt_expense_date_type := (
  SELECT `DATA_TYPE` FROM `INFORMATION_SCHEMA`.`COLUMNS`
  WHERE `TABLE_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'kt_expenses'
    AND `COLUMN_NAME` = 'expense_date'
);
--> statement-breakpoint
SET @sql := IF(
  @kt_expense_date_type = 'date',
  'ALTER TABLE `kt_expenses` MODIFY COLUMN `expense_date` DATETIME NOT NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
