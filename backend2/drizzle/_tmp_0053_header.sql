-- SCRUM-193 — Seed démo FarmOS (organisation 1).
-- Source : mockup/FarmOS Pro/src/data.jsx (ANIMALS, STOCK, TREATMENTS, VACCINES, ALERTS).
-- Idempotent : INSERT IGNORE basé sur uniq (organization_id, external_id).

-- 1) Unicité sur external_id par organisation (permet INSERT IGNORE).
SET @uniq_animals := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animals'
    AND INDEX_NAME = 'uniq_farmos_animals_org_external'
);
--> statement-breakpoint
SET @add_uniq := IF(
  @uniq_animals = 0,
  'ALTER TABLE `farmos_animals` ADD UNIQUE KEY `uniq_farmos_animals_org_external` (`organization_id`, `external_id`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE st FROM @add_uniq;
--> statement-breakpoint
EXECUTE st;
--> statement-breakpoint
DEALLOCATE PREPARE st;
--> statement-breakpoint

