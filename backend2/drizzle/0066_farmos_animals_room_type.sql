-- FarmOS: persist animal Salle (room) and pig Type, previously collected in the
-- form but never stored. `room` is scoped to a building; `type` classifies the
-- animal (truie/verrat/porcelet/engraissement…). Both are nullable text.

ALTER TABLE `farmos_animals` ADD COLUMN `room` varchar(100) AFTER `barn`;
--> statement-breakpoint
ALTER TABLE `farmos_animals` ADD COLUMN `type` varchar(50) AFTER `room`;
