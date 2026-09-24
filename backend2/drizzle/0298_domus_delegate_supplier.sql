-- Domus : rattacher un DELEGUE a la personne qui existe deja.
--
-- Un delegue n est pas une troisieme categorie de personne : c est soit un
-- EMPLOYE de l organisation, soit un SOUS-TRAITANT du registre des tiers, a qui
-- on confie en plus le suivi d un portefeuille. Or l ecran demandait de
-- ressaisir son nom et son telephone a la main, ce qui creait un troisieme
-- exemplaire de la meme personne : corriger un numero de telephone obligeait a
-- le faire dans deux ou trois fiches, et rien ne disait que le delegue Patrick
-- etait le meme homme que le sous-traitant Patrick.
--
-- user_id existait deja pour le cas employe (la table a ete concue pour ca) ;
-- il manquait l equivalent pour le sous-traitant, d ou supplier_id, qui pointe
-- vers `supplier` (le registre central partage avec BatiPro et la compta).
--
-- Les DEUX colonnes restent nullables et un delegue n en porte qu une au plus :
--   user_id renseigne     -> employe interne
--   supplier_id renseigne -> sous-traitant / prestataire
--   aucune des deux       -> delegues deja saisis a la main avant ce changement,
--                            qui restent valides (aucune reprise forcee).
--
-- display_name / phone restent la valeur qui PART dans le SMS : on les conserve
-- au moment de la designation plutot que de les lire a chaque envoi, pour qu un
-- tiers renomme ou desactive dans le registre ne fasse pas silencieusement
-- changer le destinataire d une relance de loyer deja en cours.
--
-- Pas de contrainte FK stricte, comme le reste des tables real_estate_* :
-- seulement un index de lecture.
-- Forme idempotente : la migration doit pouvoir etre rejouee sur dev et prod.
-- MySQL 8 n accepte pas ADD COLUMN IF NOT EXISTS, d ou INFORMATION_SCHEMA.
SET @col_chk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_delegates' AND COLUMN_NAME = 'supplier_id');
--> statement-breakpoint
SET @sql := IF(@col_chk = 0, 'ALTER TABLE `real_estate_delegates` ADD COLUMN `supplier_id` int NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
-- Sens de lecture : retrouver le delegue d un tiers donne, et signaler dans le
-- selecteur les personnes deja designees.
SET @idx_chk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_delegates' AND INDEX_NAME = 'idx_delegates_supplier');
--> statement-breakpoint
SET @sql2 := IF(@idx_chk = 0, 'CREATE INDEX `idx_delegates_supplier` ON `real_estate_delegates` (`organization_id`, `supplier_id`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt2 FROM @sql2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
