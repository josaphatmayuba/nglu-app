-- Boucle d oreille numerotee par animal (avatar SVG farmos-app).
--
-- Un numero entier simple (1, 2, 3...) unique PAR BATIMENT : quand l animal
-- change de batiment il recoit le plus petit numero libre du nouveau
-- batiment ; un animal inactif (soft delete) ou sorti (mort/vendu) libere son
-- numero, reattribue au plus petit disponible parmi les animaux actifs. Sans
-- batiment => pas de numero (NULL), l avatar affiche la boucle vide.
--
-- Forme idempotente (colonne + index) : MySQL 8 n accepte pas ADD COLUMN IF
-- NOT EXISTS / CREATE INDEX IF NOT EXISTS, d ou INFORMATION_SCHEMA + PREPARE.
SET @col_chk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'farmos_animals' AND COLUMN_NAME = 'tag_number');
--> statement-breakpoint
SET @sql := IF(@col_chk = 0, 'ALTER TABLE `farmos_animals` ADD COLUMN `tag_number` int NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @idx_chk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'farmos_animals' AND INDEX_NAME = 'farmos_animals_building_tag_idx');
--> statement-breakpoint
SET @sql := IF(@idx_chk = 0, 'CREATE INDEX `farmos_animals_building_tag_idx` ON `farmos_animals` (`building_id`, `tag_number`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
-- Backfill idempotent : ne numerote que les animaux actifs, ayant un
-- batiment, et pas deja numerotes (rejouable sans ecraser un futur etat).
-- Numerotation 1..N par batiment, ordre de creation (id croissant).
UPDATE farmos_animals a
JOIN (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY building_id ORDER BY id ASC) AS rn
  FROM farmos_animals
  WHERE is_active = 1
    AND building_id IS NOT NULL
    AND status NOT IN ('available_sale', 'for_sale', 'a_vendre', 'sold', 'vendu', 'deceased', 'dead', 'decede', 'décédé', 'mort')
) ranked ON ranked.id = a.id
SET a.tag_number = ranked.rn
WHERE a.tag_number IS NULL;
