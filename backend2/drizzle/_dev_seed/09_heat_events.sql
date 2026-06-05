-- Dev only - heat detection events used by the FarmOS Reproduction screen.
-- These rows feed the "Heat detection - 14 days" chart from the backend
-- instead of frontend hardcoded bar values.

INSERT INTO `farmos_reproduction_events`
  (`organization_id`, `animal_id`, `event_type`, `event_date`, `outcome`, `notes`, `created_at`, `updated_at`)
SELECT
  src.organization_id,
  src.animal_id,
  src.event_type,
  src.event_date,
  src.outcome,
  src.notes,
  src.created_at,
  src.updated_at
FROM (
  SELECT 1 AS organization_id, a.id AS animal_id, 'heat' AS event_type, DATE_SUB(CURDATE(), INTERVAL 13 DAY) AS event_date, 'detected' AS outcome, 'Chaleur detectee - observation equipe' AS notes, NOW() AS created_at, NOW() AS updated_at
  FROM `farmos_animals` a WHERE a.organization_id = 1 AND a.external_id = 'BQ-2024-0119'
  UNION ALL
  SELECT 1, a.id, 'heat', DATE_SUB(CURDATE(), INTERVAL 12 DAY), 'detected', 'Chaleur detectee - comportement', NOW(), NOW()
  FROM `farmos_animals` a WHERE a.organization_id = 1 AND a.external_id IN ('BQ-2024-0120', 'CP-2024-066')
  UNION ALL
  SELECT 1, a.id, 'heat', DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'detected', 'Chaleur detectee - suivi repro', NOW(), NOW()
  FROM `farmos_animals` a WHERE a.organization_id = 1 AND a.external_id IN ('BQ-2024-0119', 'BQ-2024-0121')
  UNION ALL
  SELECT 1, a.id, 'heat', DATE_SUB(CURDATE(), INTERVAL 9 DAY), 'detected', 'Chaleur detectee - observation equipe', NOW(), NOW()
  FROM `farmos_animals` a WHERE a.organization_id = 1 AND a.external_id IN ('BQ-2024-0120', 'CP-2024-066')
  UNION ALL
  SELECT 1, a.id, 'heat', DATE_SUB(CURDATE(), INTERVAL 7 DAY), 'detected', 'Chaleur detectee - suivi repro', NOW(), NOW()
  FROM `farmos_animals` a WHERE a.organization_id = 1 AND a.external_id IN ('BQ-2024-0119', 'BQ-2024-0121')
  UNION ALL
  SELECT 1, a.id, 'heat', DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'detected', 'Chaleur detectee - observation equipe', NOW(), NOW()
  FROM `farmos_animals` a WHERE a.organization_id = 1 AND a.external_id IN ('BQ-2024-0120', 'CP-2024-066', 'PR-2026-A032')
  UNION ALL
  SELECT 1, a.id, 'heat', DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'detected', 'Chaleur detectee - comportement', NOW(), NOW()
  FROM `farmos_animals` a WHERE a.organization_id = 1 AND a.external_id IN ('BQ-2024-0119', 'BQ-2024-0121')
  UNION ALL
  SELECT 1, a.id, 'heat', DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'detected', 'Chaleur detectee - suivi repro', NOW(), NOW()
  FROM `farmos_animals` a WHERE a.organization_id = 1 AND a.external_id IN ('BQ-2024-0119', 'BQ-2024-0120', 'CP-2024-066')
  UNION ALL
  SELECT 1, a.id, 'heat', DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'detected', 'Chaleur detectee - observation equipe', NOW(), NOW()
  FROM `farmos_animals` a WHERE a.organization_id = 1 AND a.external_id IN ('BQ-2024-0119', 'BQ-2024-0120', 'BQ-2024-0121')
  UNION ALL
  SELECT 1, a.id, 'heat', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'detected', 'Chaleur detectee - comportement', NOW(), NOW()
  FROM `farmos_animals` a WHERE a.organization_id = 1 AND a.external_id IN ('BQ-2024-0119', 'CP-2024-066')
  UNION ALL
  SELECT 1, a.id, 'heat', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'detected', 'Chaleur detectee - suivi repro', NOW(), NOW()
  FROM `farmos_animals` a WHERE a.organization_id = 1 AND a.external_id IN ('BQ-2024-0120', 'BQ-2024-0121')
  UNION ALL
  SELECT 1, a.id, 'heat', CURDATE(), 'detected', 'Chaleur detectee - observation equipe', NOW(), NOW()
  FROM `farmos_animals` a WHERE a.organization_id = 1 AND a.external_id = 'BQ-2024-0119'
) src
LEFT JOIN `farmos_reproduction_events` r
  ON r.organization_id = src.organization_id
 AND r.animal_id = src.animal_id
 AND r.event_type = src.event_type
 AND r.event_date = src.event_date
WHERE r.id IS NULL;
