-- Positions des bâtiments sur le plan du terrain (par zone).
-- pos_x / pos_y = pourcentage du terrain (0–100), relatif à la zone du bâtiment.
-- NULL = pas encore placé → le front retombe sur la grille auto.
-- Idempotent (safe au re-jeu).

ALTER TABLE `farmos_buildings`
  ADD COLUMN IF NOT EXISTS `pos_x` decimal(6,2) NULL;
--> statement-breakpoint
ALTER TABLE `farmos_buildings`
  ADD COLUMN IF NOT EXISTS `pos_y` decimal(6,2) NULL;
