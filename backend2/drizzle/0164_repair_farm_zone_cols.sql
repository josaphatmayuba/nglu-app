-- Reparation drift : les ALTER ADD COLUMN des migrations 0160/0161/0163 ont ete
-- marquees appliquees mais non executees (zone_id, building_kind, pos_x/pos_y sur
-- farmos_buildings ; farm_id sur farmos_zones). On les rajoute de facon idempotente
-- via information_schema (IF NOT EXISTS d'ADD COLUMN non fiable selon version MySQL).
-- Pattern SET/IF/PREPARE : 1 statement par breakpoint, pas de ';' interne parasite.

SET @add_zone_id := (SELECT IF(COUNT(*)=0,
  'ALTER TABLE farmos_buildings ADD COLUMN zone_id bigint NULL',
  'SELECT 1') FROM information_schema.columns
  WHERE table_schema=DATABASE() AND table_name='farmos_buildings' AND column_name='zone_id');
--> statement-breakpoint
PREPARE s1 FROM @add_zone_id;
--> statement-breakpoint
EXECUTE s1;
--> statement-breakpoint
DEALLOCATE PREPARE s1;
--> statement-breakpoint
SET @add_kind := (SELECT IF(COUNT(*)=0,
  'ALTER TABLE farmos_buildings ADD COLUMN building_kind varchar(50) NULL',
  'SELECT 1') FROM information_schema.columns
  WHERE table_schema=DATABASE() AND table_name='farmos_buildings' AND column_name='building_kind');
--> statement-breakpoint
PREPARE s2 FROM @add_kind;
--> statement-breakpoint
EXECUTE s2;
--> statement-breakpoint
DEALLOCATE PREPARE s2;
--> statement-breakpoint
SET @add_px := (SELECT IF(COUNT(*)=0,
  'ALTER TABLE farmos_buildings ADD COLUMN pos_x decimal(6,2) NULL',
  'SELECT 1') FROM information_schema.columns
  WHERE table_schema=DATABASE() AND table_name='farmos_buildings' AND column_name='pos_x');
--> statement-breakpoint
PREPARE s3 FROM @add_px;
--> statement-breakpoint
EXECUTE s3;
--> statement-breakpoint
DEALLOCATE PREPARE s3;
--> statement-breakpoint
SET @add_py := (SELECT IF(COUNT(*)=0,
  'ALTER TABLE farmos_buildings ADD COLUMN pos_y decimal(6,2) NULL',
  'SELECT 1') FROM information_schema.columns
  WHERE table_schema=DATABASE() AND table_name='farmos_buildings' AND column_name='pos_y');
--> statement-breakpoint
PREPARE s4 FROM @add_py;
--> statement-breakpoint
EXECUTE s4;
--> statement-breakpoint
DEALLOCATE PREPARE s4;
--> statement-breakpoint
SET @add_farm := (SELECT IF(COUNT(*)=0,
  'ALTER TABLE farmos_zones ADD COLUMN farm_id bigint NULL',
  'SELECT 1') FROM information_schema.columns
  WHERE table_schema=DATABASE() AND table_name='farmos_zones' AND column_name='farm_id');
--> statement-breakpoint
PREPARE s5 FROM @add_farm;
--> statement-breakpoint
EXECUTE s5;
--> statement-breakpoint
DEALLOCATE PREPARE s5;
--> statement-breakpoint
SET @add_aid := (SELECT IF(COUNT(*)=0,
  'ALTER TABLE farmos_animals ADD COLUMN building_id bigint NULL',
  'SELECT 1') FROM information_schema.columns
  WHERE table_schema=DATABASE() AND table_name='farmos_animals' AND column_name='building_id');
--> statement-breakpoint
PREPARE s6 FROM @add_aid;
--> statement-breakpoint
EXECUTE s6;
--> statement-breakpoint
DEALLOCATE PREPARE s6;
--> statement-breakpoint
SET @add_azid := (SELECT IF(COUNT(*)=0,
  'ALTER TABLE farmos_animals ADD COLUMN zone_id bigint NULL',
  'SELECT 1') FROM information_schema.columns
  WHERE table_schema=DATABASE() AND table_name='farmos_animals' AND column_name='zone_id');
--> statement-breakpoint
PREPARE s7 FROM @add_azid;
--> statement-breakpoint
EXECUTE s7;
--> statement-breakpoint
DEALLOCATE PREPARE s7;
