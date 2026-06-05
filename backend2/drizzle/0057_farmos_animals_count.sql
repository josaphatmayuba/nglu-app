-- SCRUM-236 — Colonne `count` sur farmos_animals pour les lots (poulets,
-- canards, dindes, poissons) afin de pouvoir calculer le taux de ponte auto.

ALTER TABLE `farmos_animals`
  ADD COLUMN `count` INT NULL AFTER `weight_unit`;
