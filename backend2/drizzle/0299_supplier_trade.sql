-- Metier du tiers : la PROFESSION de l artisan (plomberie, electricite, ...).
--
-- Jusqu ici la specialite d un sous-traitant n etait nulle part : on la tapait
-- dans `notes`, un champ libre que personne ne remplit de la meme facon. On ne
-- pouvait donc ni filtrer "les electriciens", ni pre-remplir le metier quand le
-- meme artisan est inscrit au carnet de chantier BatiPro, ou `trade` existe
-- deja sur batipro_subcontractors.
--
-- Colonne libre (varchar) et non une table de reference : la liste proposee a
-- l ecran sert de guide, mais un metier hors liste doit rester saisissable sans
-- migration. Nullable : les tiers deja enregistres n ont pas de metier connu et
-- on ne devine rien a leur place.
--
-- Forme idempotente : la migration doit pouvoir etre rejouee sur dev et prod.
-- MySQL 8 n accepte pas ADD COLUMN IF NOT EXISTS, d ou INFORMATION_SCHEMA.
SET @col_chk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier' AND COLUMN_NAME = 'trade');
--> statement-breakpoint
SET @sql := IF(@col_chk = 0, 'ALTER TABLE `supplier` ADD COLUMN `trade` varchar(255) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
