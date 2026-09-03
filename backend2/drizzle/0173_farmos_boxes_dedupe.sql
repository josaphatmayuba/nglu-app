-- Nettoyage des box en double (bug: le bouton "+ Box" relancait la numerotation a 1,
-- recreant 1..N a chaque clic). On garde, par (building_id, name), le box au plus petit id
-- et on soft-delete les autres. Les animaux affectes a un doublon sont reaffectes au box garde.
-- Idempotent : une fois les doublons desactives (is_active=0), les re-executions sont sans effet.

-- 1) Reaffecter les animaux d'un box doublon vers le box garde (meme building_id + name).
UPDATE `farmos_animals` a
JOIN `farmos_boxes` dup ON a.`box_id` = dup.`id`
JOIN (
  SELECT `building_id`, `name`, MIN(`id`) AS keep_id
  FROM `farmos_boxes`
  WHERE `is_active` = 1
  GROUP BY `building_id`, `name`
) k ON k.`building_id` = dup.`building_id` AND k.`name` = dup.`name`
SET a.`box_id` = k.keep_id
WHERE dup.`is_active` = 1
  AND dup.`id` <> k.keep_id;
--> statement-breakpoint

-- 2) Soft-delete des box doublons (tout sauf le plus petit id par building_id + name).
UPDATE `farmos_boxes` b
JOIN (
  SELECT `building_id`, `name`, MIN(`id`) AS keep_id
  FROM `farmos_boxes`
  WHERE `is_active` = 1
  GROUP BY `building_id`, `name`
) k ON k.`building_id` = b.`building_id` AND k.`name` = b.`name`
SET b.`is_active` = 0
WHERE b.`is_active` = 1
  AND b.`id` <> k.keep_id;
--> statement-breakpoint
