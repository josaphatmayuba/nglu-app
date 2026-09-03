-- Reparation des donnees de mortalite Zone B creees par 0171.
-- Supprime les evenements de mortalite en doublon: une version intermediaire (count chevre = 3, et
-- un 1er jeu porcs) avait ete inseree avant correction; on garde la version finale (count 2/1/6).
-- AGIT UNIQUEMENT sur farmos_mortality_events Zone B au 2026-06-13: aucun autre animal/evenement touche.
-- Idempotent: ne supprime que la 1re fois (flag) et ne cible que les ids non-MAX de chaque groupe.

CREATE TABLE IF NOT EXISTS `data_migration_flags` (
  `migration_key` varchar(128) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`migration_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint

-- Etat constate en dev: porc count2 (x2), porc count1 (x2), chevre count3 (x1), chevre count6 (x1).
-- Cible finale = 3 evenements: porc count2, porc count1, chevre count6 (la version corrigee).
-- 1) Porcs: doublons a count egal -> garde id MAX par (species/count), supprime les plus anciens.
DELETE e FROM `farmos_mortality_events` e
JOIN (
  SELECT `species`, `count`, MAX(`id`) AS `keep_id`
  FROM `farmos_mortality_events`
  WHERE `organization_id` = 1 AND `event_date` = '2026-06-13' AND `lot` = 'Cheptel Zone B' AND `species` = 'pig'
  GROUP BY `species`, `count`
) k ON e.`species` = k.`species` AND e.`count` = k.`count`
WHERE e.`organization_id` = 1 AND e.`event_date` = '2026-06-13' AND e.`lot` = 'Cheptel Zone B' AND e.`species` = 'pig'
  AND e.`id` < k.`keep_id`
  AND NOT EXISTS (SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0172_farmos_mortality_zb_repair');
--> statement-breakpoint

-- 2) Chevres: garde uniquement le count MAX (6), supprime la version intermediaire (count 3).
DELETE FROM `farmos_mortality_events`
WHERE `organization_id` = 1 AND `event_date` = '2026-06-13' AND `lot` = 'Cheptel Zone B' AND `species` = 'goat'
  AND `count` < (
    SELECT mx FROM (
      SELECT MAX(`count`) AS mx FROM `farmos_mortality_events`
      WHERE `organization_id` = 1 AND `event_date` = '2026-06-13' AND `lot` = 'Cheptel Zone B' AND `species` = 'goat'
    ) t
  )
  AND NOT EXISTS (SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0172_farmos_mortality_zb_repair');
--> statement-breakpoint

INSERT IGNORE INTO `data_migration_flags` (`migration_key`) VALUES ('0172_farmos_mortality_zb_repair');
