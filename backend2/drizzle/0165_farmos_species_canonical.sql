-- Canonicalise FarmOS species values after a bad import used French labels.
-- UI/DTOs expect: cow, pig, chicken, fish, goat, sheep, rabbit, duck, turkey.

UPDATE `farmos_animals`
SET `species` = CASE LOWER(`species`)
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `species`
END
WHERE LOWER(`species`) IN ('bovin','bovins','vache','vaches','porc','porcs','caprin','caprins','chevre','chevres','poule','poules','poulet','poulets');
--> statement-breakpoint
UPDATE `farmos_buildings`
SET `species` = CASE LOWER(`species`)
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `species`
END
WHERE `species` IS NOT NULL
  AND LOWER(`species`) IN ('bovin','bovins','vache','vaches','porc','porcs','caprin','caprins','chevre','chevres','poule','poules','poulet','poulets');
--> statement-breakpoint
UPDATE `farmos_diseases`
SET `species` = CASE LOWER(`species`)
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `species`
END
WHERE LOWER(`species`) IN ('bovin','bovins','vache','vaches','porc','porcs','caprin','caprins','chevre','chevres','poule','poules','poulet','poulets');
--> statement-breakpoint
UPDATE `farmos_production_logs`
SET `species` = CASE LOWER(`species`)
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `species`
END
WHERE LOWER(`species`) IN ('bovin','bovins','vache','vaches','porc','porcs','caprin','caprins','chevre','chevres','poule','poules','poulet','poulets');
--> statement-breakpoint
UPDATE `farmos_vaccinations`
SET `species` = CASE LOWER(`species`)
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `species`
END
WHERE LOWER(`species`) IN ('bovin','bovins','vache','vaches','porc','porcs','caprin','caprins','chevre','chevres','poule','poules','poulet','poulets');
--> statement-breakpoint
UPDATE `farmos_vaccines`
SET `species` = REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(`species`,
    'bovins', 'cow'),
    'bovin', 'cow'),
    'vaches', 'cow'),
    'vache', 'cow'),
    'porcs', 'pig'),
    'porc', 'pig'),
    'caprins', 'goat'),
    'caprin', 'goat'),
    'chevres', 'goat'),
    'chevre', 'goat'),
    'poules', 'chicken'),
    'poule', 'chicken'),
    'poulets', 'chicken'),
    'poulet', 'chicken')
WHERE `species` IS NOT NULL
  AND LOWER(`species`) REGEXP 'bovin|vache|porc|caprin|chevre|poule|poulet';
--> statement-breakpoint
UPDATE `farmos_medicines`
SET `species` = REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(
  REPLACE(CAST(`species` AS CHAR),
    '"bovins"', '"cow"'),
    '"bovin"', '"cow"'),
    '"vaches"', '"cow"'),
    '"vache"', '"cow"'),
    '"porcs"', '"pig"'),
    '"porc"', '"pig"'),
    '"caprins"', '"goat"'),
    '"caprin"', '"goat"'),
    '"chevres"', '"goat"'),
    '"chevre"', '"goat"'),
    '"poules"', '"chicken"'),
    '"poule"', '"chicken"'),
    '"poulets"', '"chicken"'),
    '"poulet"', '"chicken"')
WHERE `species` IS NOT NULL
  AND LOWER(CAST(`species` AS CHAR)) REGEXP '"(bovin|vache|porc|caprin|chevre|poule|poulet)s?"';
--> statement-breakpoint
UPDATE `farmos_sales`
SET `species` = CASE LOWER(`species`)
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `species`
END
WHERE `species` IS NOT NULL
  AND LOWER(`species`) IN ('bovin','bovins','vache','vaches','porc','porcs','caprin','caprins','chevre','chevres','poule','poules','poulet','poulets');
--> statement-breakpoint
UPDATE `farmos_price_list`
SET `species` = CASE LOWER(`species`)
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `species`
END
WHERE `species` IS NOT NULL
  AND LOWER(`species`) IN ('bovin','bovins','vache','vaches','porc','porcs','caprin','caprins','chevre','chevres','poule','poules','poulet','poulets');
--> statement-breakpoint
UPDATE `farmos_feed_forecasts`
SET `species` = CASE LOWER(`species`)
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `species`
END
WHERE LOWER(`species`) IN ('bovin','bovins','vache','vaches','porc','porcs','caprin','caprins','chevre','chevres','poule','poules','poulet','poulets');
--> statement-breakpoint
UPDATE `farmos_vet_exams`
SET `species` = CASE LOWER(`species`)
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `species`
END
WHERE `species` IS NOT NULL
  AND LOWER(`species`) IN ('bovin','bovins','vache','vaches','porc','porcs','caprin','caprins','chevre','chevres','poule','poules','poulet','poulets');
--> statement-breakpoint
UPDATE `farmos_mortality_events`
SET `species` = CASE LOWER(`species`)
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `species`
END
WHERE LOWER(`species`) IN ('bovin','bovins','vache','vaches','porc','porcs','caprin','caprins','chevre','chevres','poule','poules','poulet','poulets');
--> statement-breakpoint
UPDATE `farmos_semen_straws`
SET `species` = CASE LOWER(`species`)
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `species`
END
WHERE LOWER(`species`) IN ('bovin','bovins','vache','vaches','porc','porcs','caprin','caprins','chevre','chevres','poule','poules','poulet','poulets');
--> statement-breakpoint
UPDATE `farmos_lookups`
SET `scope_key` = CASE LOWER(`scope_key`)
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `scope_key`
END
WHERE `scope_key` IS NOT NULL
  AND LOWER(`scope_key`) IN ('bovin','bovins','vache','vaches','porc','porcs','caprin','caprins','chevre','chevres','poule','poules','poulet','poulets');
--> statement-breakpoint
UPDATE `farmos_lookups`
SET `value_fr` = CASE LOWER(`value_fr`)
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `value_fr`
END,
`value_en` = CASE LOWER(COALESCE(`value_en`, `value_fr`))
  WHEN 'bovin' THEN 'cow'
  WHEN 'bovins' THEN 'cow'
  WHEN 'vache' THEN 'cow'
  WHEN 'vaches' THEN 'cow'
  WHEN 'porc' THEN 'pig'
  WHEN 'porcs' THEN 'pig'
  WHEN 'caprin' THEN 'goat'
  WHEN 'caprins' THEN 'goat'
  WHEN 'chevre' THEN 'goat'
  WHEN 'chevres' THEN 'goat'
  WHEN 'poule' THEN 'chicken'
  WHEN 'poules' THEN 'chicken'
  WHEN 'poulet' THEN 'chicken'
  WHEN 'poulets' THEN 'chicken'
  ELSE `value_en`
END
WHERE `category` = 'enabled_species'
  AND LOWER(`value_fr`) IN ('bovin','bovins','vache','vaches','porc','porcs','caprin','caprins','chevre','chevres','poule','poules','poulet','poulets');
