-- Indicateurs de mise bas / sevrage pour farmos_reproduction_events (COMP-P2-007).
-- Champs utiles surtout pour le porc (portees) mais valables toutes especes.
-- offspring_count = nes vivants (existant). Ces colonnes completent: mort-nes,
-- momifies, poids moyen a la naissance, difficulte, sevres + date de sevrage.
-- Idempotent (ADD COLUMN IF NOT EXISTS), 1 statement par breakpoint.

ALTER TABLE `farmos_reproduction_events` ADD COLUMN IF NOT EXISTS `stillborn_count` int NULL;
--> statement-breakpoint
ALTER TABLE `farmos_reproduction_events` ADD COLUMN IF NOT EXISTS `mummified_count` int NULL;
--> statement-breakpoint
ALTER TABLE `farmos_reproduction_events` ADD COLUMN IF NOT EXISTS `avg_birth_weight` decimal(7,2) NULL;
--> statement-breakpoint
ALTER TABLE `farmos_reproduction_events` ADD COLUMN IF NOT EXISTS `birth_difficulty` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `farmos_reproduction_events` ADD COLUMN IF NOT EXISTS `weaned_count` int NULL;
--> statement-breakpoint
ALTER TABLE `farmos_reproduction_events` ADD COLUMN IF NOT EXISTS `weaning_date` date NULL;
