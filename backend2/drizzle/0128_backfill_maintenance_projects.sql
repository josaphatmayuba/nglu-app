-- Cree les projets analytiques manquants pour les tickets maintenance existants.
-- Idempotent grace a source_system + external_ref.

INSERT INTO `projects` (
  `organization_id`,
  `code`,
  `name`,
  `budget_amount`,
  `currency_id`,
  `source_system`,
  `external_ref`
)
SELECT
  m.`organization_id`,
  CONCAT('MNT-', m.`id`),
  CONCAT('Travaux: ', m.`title`),
  IF(COALESCE(m.`estimated_cost`, 0) > 0, m.`estimated_cost`, NULL),
  m.`currency_id`,
  'maintenance',
  CAST(m.`id` AS CHAR)
FROM `real_estate_maintenance_requests` m
WHERE COALESCE(m.`is_active`, 1) = 1
  AND NOT EXISTS (
    SELECT 1
    FROM `projects` p
    WHERE p.`organization_id` = m.`organization_id`
      AND p.`source_system` = 'maintenance'
      AND p.`external_ref` = CAST(m.`id` AS CHAR)
  );
--> statement-breakpoint

UPDATE `real_estate_maintenance_requests` m
JOIN `projects` p
  ON p.`organization_id` = m.`organization_id`
 AND p.`source_system` = 'maintenance'
 AND p.`external_ref` = CAST(m.`id` AS CHAR)
SET m.`project_id` = p.`id`
WHERE m.`project_id` IS NULL;
--> statement-breakpoint

UPDATE `real_estate_maintenance_costs` c
JOIN `real_estate_maintenance_requests` m
  ON m.`id` = c.`ticket_id`
 AND m.`organization_id` = c.`organization_id`
SET c.`project_id` = m.`project_id`
WHERE c.`project_id` IS NULL
  AND m.`project_id` IS NOT NULL;
