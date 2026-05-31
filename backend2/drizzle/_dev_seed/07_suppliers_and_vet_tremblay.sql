-- Dev only — promeut les noms de fournisseurs/vétos jusque-là présents en
-- texte libre (champs `farmos_medicines.supplier`, `farmos_expenses.supplier`,
-- traitements avec `vet = 'Dr. Tremblay'`) vers les vraies tables CRM:
--   * `supplier`  : 9 fournisseurs (Coop Agri-Pro, Meunerie Tremblay, …)
--   * `users`     : Dr. Tremblay rajouté à l'équipe FarmOS (Vétérinaire)
-- Idempotent: INSERT ... WHERE NOT EXISTS sur le nom / username.

-- ─── 1) Fournisseurs ────────────────────────────────────────────────────
INSERT INTO `supplier` (name, phone, email, status, created_at, updated_at)
SELECT * FROM (
  SELECT 'Coop Agri-Pro'         AS name, '+1 450 555 0110' AS phone, 'contact@coopagripro.demo'  AS email, 'true' AS status, NOW() AS c, NOW() AS u UNION ALL
  SELECT 'Meunerie Tremblay',         '+1 450 555 0120', 'ventes@meunerietremblay.demo',  'true', NOW(), NOW() UNION ALL
  SELECT 'Skretting',                 '+1 418 555 0130', 'qc@skretting.demo',             'true', NOW(), NOW() UNION ALL
  SELECT 'Ferme Lapierre',            '+1 819 555 0140', 'info@fermelapierre.demo',       'true', NOW(), NOW() UNION ALL
  SELECT 'Vétoquinol',                '+1 514 555 0150', 'commandes@vetoquinol.demo',     'true', NOW(), NOW() UNION ALL
  SELECT 'Elanco',                    '+1 514 555 0160', 'orders@elanco.demo',            'true', NOW(), NOW() UNION ALL
  SELECT 'Boehringer Ingelheim',      '+1 514 555 0170', 'ca-orders@boehringer.demo',     'true', NOW(), NOW() UNION ALL
  SELECT 'MSD Santé Animale',         '+1 514 555 0180', 'ca-vet@msd.demo',               'true', NOW(), NOW() UNION ALL
  SELECT 'Aquatech',                  '+1 418 555 0190', 'info@aquatech.demo',            'true', NOW(), NOW()
) src
WHERE NOT EXISTS (SELECT 1 FROM `supplier` s WHERE s.name = src.name);

-- ─── 2) Dr. Tremblay — vétérinaire FarmOS ───────────────────────────────
-- Les autres vétos (Dr. Boucher, Dr. Lavoie) sont déjà créés par 05_farmos_staff.sql.
SET @dept_farmos = (SELECT id FROM `department` WHERE LOWER(name) IN ('farmos', 'ferme') ORDER BY id LIMIT 1);
SET @des_vet      = (SELECT id FROM `designations` WHERE name = 'Vétérinaire' LIMIT 1);
SET @role_default = (SELECT id FROM `role` ORDER BY id LIMIT 1);

INSERT INTO `users` (organization_id, firstName, lastName, username, password, roleId, email, phone, joinDate, designationId, departmentId, status, isLogin, created_at, updated_at)
SELECT 1, 'Anne', 'Tremblay', 'a.tremblay@farm.demo',
       '$2a$10$abcdefghijklmnopqrstuv',
       @role_default, 'anne.tremblay@farm.demo', '+1 514 555 0103',
       '2023-04-10', @des_vet, @dept_farmos, 'true', 'false', NOW(), NOW()
WHERE @dept_farmos IS NOT NULL
  AND @des_vet IS NOT NULL
  AND @role_default IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `users` u WHERE u.username = 'a.tremblay@farm.demo');
