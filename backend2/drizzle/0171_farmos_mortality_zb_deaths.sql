-- FarmOS: 6 animaux Zone B decedes (diarrhee, 13 juin 2026) + 3 evenements de mortalite.
-- Source: migration-data/cleaned_csv/farmos_mortality_events.csv (3 lignes agregees, count 2/1/6 = 9 tetes).
-- Reproduit le comportement de FarmosService.createMortalityEvent: animal passe en statut deceased.
-- Idempotent: external_id unique + ON DUPLICATE KEY + flag data_migration_flags (rejeu au boot >=0070).

CREATE TABLE IF NOT EXISTS `data_migration_flags` (
  `migration_key` varchar(128) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`migration_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint

-- 9 animaux crees directement en statut deceased (sortis du cheptel vivant), is_active=1 = tracables.
INSERT INTO `farmos_animals` (
  `organization_id`, `external_id`, `name`, `species`, `race`, `sex`, `date_of_birth`,
  `weight`, `weight_unit`, `count`, `lot`, `barn`, `room`, `building_id`, `zone_id`,
  `type`, `status`, `withdrawal_until`, `withdrawal_kind`, `mother_id`, `father_id`,
  `estimated_value`, `last_event`, `is_active`
)
SELECT
  1 AS `organization_id`,
  src.`external_id`,
  src.`name`,
  src.`species`,
  src.`race`,
  src.`sex`,
  src.`date_of_birth`,
  src.`weight`,
  COALESCE(src.`weight_unit`, 'kg') AS `weight_unit`,
  src.`count`,
  src.`lot`,
  src.`barn`,
  src.`room`,
  (SELECT b.`id` FROM `farmos_buildings` b WHERE b.`organization_id` = 1 AND b.`name` = src.`barn` AND b.`is_active` = 1 ORDER BY b.`id` LIMIT 1) AS `building_id`,
  (SELECT z.`id` FROM `farmos_zones` z WHERE z.`organization_id` = 1 AND z.`name` = src.`room` AND z.`is_active` = 1 ORDER BY z.`id` LIMIT 1) AS `zone_id`,
  src.`type`,
  src.`status`,
  src.`withdrawal_until`,
  src.`withdrawal_kind`,
  src.`mother_id`,
  src.`father_id`,
  src.`estimated_value`,
  src.`last_event`,
  1 AS `is_active`
FROM (
  SELECT 'ZB-PORCELET-MORT-F-01' AS `external_id`, 'Porcelet femelle decede 1' AS `name`, 'pig' AS `species`, NULL AS `race`, 'F' AS `sex`, '2026-06-02' AS `date_of_birth`, NULL AS `weight`, 'kg' AS `weight_unit`, 1 AS `count`, 'Cheptel Zone B' AS `lot`, 'Batiment Porcs Kasangulu' AS `barn`, 'Zone Kasangulu' AS `room`, 'Porcelet' AS `type`, 'deceased' AS `status`, 'Decede le 13 juin 2026 (diarrhee presumee)' AS `last_event`, 30 AS `estimated_value`, NULL AS `withdrawal_until`, NULL AS `withdrawal_kind`, NULL AS `mother_id`, NULL AS `father_id`
  UNION ALL SELECT 'ZB-PORCELET-MORT-F-02', 'Porcelet femelle decede 2', 'pig', NULL, 'F', '2026-06-02', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Porcelet', 'deceased', 'Decede le 13 juin 2026 (diarrhee presumee)', 30, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZB-PORCELET-MORT-M-01', 'Porcelet male decede 1', 'pig', NULL, 'M', '2026-06-02', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Porcs Kasangulu', 'Zone Kasangulu', 'Porcelet', 'deceased', 'Decede le 13 juin 2026 (diarrhee presumee)', 30, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZB-CHEVREAU-MORT-01', 'Chevreau decede 1', 'goat', NULL, NULL, '2026-05-02', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Caprins Kasangulu', 'Zone Kasangulu', 'Chevreau', 'deceased', 'Decede le 13 juin 2026 (diarrhee presumee)', 40, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZB-CHEVREAU-MORT-02', 'Chevreau decede 2', 'goat', NULL, NULL, '2026-05-02', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Caprins Kasangulu', 'Zone Kasangulu', 'Chevreau', 'deceased', 'Decede le 13 juin 2026 (diarrhee presumee)', 40, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZB-CHEVREAU-MORT-03', 'Chevreau decede 3', 'goat', NULL, NULL, '2026-05-02', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Caprins Kasangulu', 'Zone Kasangulu', 'Chevreau', 'deceased', 'Decede le 13 juin 2026 (diarrhee presumee)', 40, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZB-CHEVREAU-MORT-04', 'Chevreau decede 4', 'goat', NULL, NULL, '2026-05-02', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Caprins Kasangulu', 'Zone Kasangulu', 'Chevreau', 'deceased', 'Decede le 13 juin 2026 (diarrhee presumee)', 40, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZB-CHEVREAU-MORT-05', 'Chevreau decede 5', 'goat', NULL, NULL, '2026-05-02', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Caprins Kasangulu', 'Zone Kasangulu', 'Chevreau', 'deceased', 'Decede le 13 juin 2026 (diarrhee presumee)', 40, NULL, NULL, NULL, NULL
  UNION ALL SELECT 'ZB-CHEVREAU-MORT-06', 'Chevreau decede 6', 'goat', NULL, NULL, '2026-05-02', NULL, 'kg', 1, 'Cheptel Zone B', 'Batiment Caprins Kasangulu', 'Zone Kasangulu', 'Chevreau', 'deceased', 'Decede le 13 juin 2026 (diarrhee presumee)', 40, NULL, NULL, NULL, NULL
) AS src
WHERE NOT EXISTS (
  SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0171_farmos_mortality_zb_deaths'
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `species` = VALUES(`species`),
  `sex` = VALUES(`sex`),
  `date_of_birth` = VALUES(`date_of_birth`),
  `count` = VALUES(`count`),
  `lot` = VALUES(`lot`),
  `barn` = VALUES(`barn`),
  `room` = VALUES(`room`),
  `building_id` = VALUES(`building_id`),
  `zone_id` = VALUES(`zone_id`),
  `type` = VALUES(`type`),
  `status` = VALUES(`status`),
  `estimated_value` = VALUES(`estimated_value`),
  `last_event` = VALUES(`last_event`),
  `is_active` = VALUES(`is_active`);
--> statement-breakpoint

-- 3 evenements de mortalite (agreges, count 2/1/3). animal_id NULL car chaque ligne couvre plusieurs betes.
INSERT INTO `farmos_mortality_events` (
  `organization_id`, `animal_id`, `species`, `event_date`, `count`, `cause`,
  `necropsy_requested`, `necropsy_done`, `confirmed_cause`, `event_time`, `barn`, `lot`,
  `pre_death_symptoms`, `vet_consulted`, `estimated_loss`, `notes`, `is_active`
)
SELECT
  1, NULL, src.`species`, src.`event_date`, src.`count`, src.`cause`,
  0, 0, NULL, NULL, src.`barn`, src.`lot`,
  src.`pre_death_symptoms`, NULL, src.`estimated_loss`, src.`notes`, 1
FROM (
  SELECT 'pig' AS `species`, '2026-06-13' AS `event_date`, 2 AS `count`, 'Diarrhee (presumee, non confirmee)' AS `cause`, 'Batiment Porcs Kasangulu' AS `barn`, 'Cheptel Zone B' AS `lot`, 'Diarrhee' AS `pre_death_symptoms`, 60 AS `estimated_loss`, '2 porcelets femelles nes le 2 juin 2026 (~11 jours), decedes le 13 juin 2026 de diarrhee selon l eleveur. AUCUN examen/necropsie realise: les carcasses ont ete jetees a la riviere sans aucun examen. Non comptabilises dans le cheptel recense (zone B Kasangulu)' AS `notes`
  UNION ALL SELECT 'pig', '2026-06-13', 1, 'Diarrhee (presumee, non confirmee)', 'Batiment Porcs Kasangulu', 'Cheptel Zone B', 'Diarrhee', 30, '1 porcelet male ne le 2 juin 2026 (~11 jours), decede le 13 juin 2026 de diarrhee selon l eleveur. AUCUN examen/necropsie realise: la carcasse a ete jetee a la riviere sans aucun examen. Non comptabilise dans le cheptel recense (zone B Kasangulu)'
  UNION ALL SELECT 'goat', '2026-06-13', 6, 'Diarrhee (presumee, non confirmee)', 'Batiment Caprins Kasangulu', 'Cheptel Zone B', 'Diarrhee', 240, '6 chevreaux (jeunes chevres) decedes le 13 juin 2026 de diarrhee selon l eleveur. AUCUN examen/necropsie realise: les carcasses ont ete jetees a la riviere sans aucun examen. Non comptabilises dans le cheptel recense (zone B Kasangulu)'
) AS src
WHERE NOT EXISTS (
  SELECT 1 FROM `data_migration_flags` WHERE `migration_key` = '0171_farmos_mortality_zb_deaths'
)
-- Garde anti-doublon: pas de cle unique sur farmos_mortality_events, on evite de reinserer
-- un evenement deja present (meme espece + date + lot) si la migration est rejouee avant le flag.
AND NOT EXISTS (
  SELECT 1 FROM `farmos_mortality_events` e
  WHERE e.`organization_id` = 1 AND e.`event_date` = src.`event_date`
    AND e.`species` = src.`species` AND e.`lot` = src.`lot` AND e.`count` = src.`count`
);
--> statement-breakpoint

INSERT IGNORE INTO `data_migration_flags` (`migration_key`) VALUES ('0171_farmos_mortality_zb_deaths');
