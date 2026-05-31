-- Dev only — seed CRM HR avec une équipe FarmOS de démonstration.
-- Crée: département "FarmOS", 4 désignations (Vétérinaire, Gérant ferme,
-- Technicien agricole, Éleveur), et 5 employés rattachés au département FarmOS.

-- 1) Département
INSERT INTO `department` (name, status, created_at, updated_at)
SELECT 'FarmOS', 'true', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `department` WHERE LOWER(name) IN ('farmos', 'ferme'));

-- 2) Désignations
INSERT INTO `designations` (name, status, created_at, updated_at)
SELECT * FROM (
  SELECT 'Vétérinaire' AS name, 'true' AS status, NOW() AS c, NOW() AS u UNION ALL
  SELECT 'Gérant ferme',         'true',          NOW(),       NOW()      UNION ALL
  SELECT 'Technicien agricole',  'true',          NOW(),       NOW()      UNION ALL
  SELECT 'Éleveur',              'true',          NOW(),       NOW()
) src
WHERE NOT EXISTS (SELECT 1 FROM `designations` d WHERE d.name = src.name);

-- 3) Récup ids
SET @dept_farmos = (SELECT id FROM `department` WHERE LOWER(name) IN ('farmos', 'ferme') ORDER BY id LIMIT 1);
SET @des_vet     = (SELECT id FROM `designations` WHERE name = 'Vétérinaire');
SET @des_gerant  = (SELECT id FROM `designations` WHERE name = 'Gérant ferme');
SET @des_tech    = (SELECT id FROM `designations` WHERE name = 'Technicien agricole');
SET @des_eleveur = (SELECT id FROM `designations` WHERE name = 'Éleveur');
SET @role_default = (SELECT id FROM `role` ORDER BY id LIMIT 1);

-- 4) Employés démo (mot de passe = bcrypt placeholder ; ils ne se connectent pas)
-- bcrypt('demo1234', 10) ≈ une chaîne valide. On utilise un hash inerte.
INSERT INTO `users` (organization_id, firstName, lastName, username, password, roleId, email, phone, joinDate, designationId, departmentId, status, isLogin, created_at, updated_at)
SELECT * FROM (
  SELECT 1 AS organization_id, 'Émilie' AS firstName, 'Boucher' AS lastName, 'e.boucher@farm.demo' AS username, '$2a$10$abcdefghijklmnopqrstuv' AS password, @role_default AS roleId, 'emilie.boucher@farm.demo' AS email, '+1 514 555 0101' AS phone, '2024-03-15' AS joinDate, @des_vet AS designationId, @dept_farmos AS departmentId, 'true' AS status, 'false' AS isLogin, NOW() AS c, NOW() AS u UNION ALL
  SELECT 1, 'Marc',     'Lavoie',     'm.lavoie@farm.demo',   '$2a$10$abcdefghijklmnopqrstuv', @role_default, 'marc.lavoie@farm.demo',   '+1 514 555 0102', '2023-09-01', @des_vet,     @dept_farmos, 'true', 'false', NOW(), NOW() UNION ALL
  SELECT 1, 'Sophie',   'Lapointe',   's.lapointe@farm.demo', '$2a$10$abcdefghijklmnopqrstuv', @role_default, 'sophie.lapointe@farm.demo', '+1 514 555 0201', '2022-05-20', @des_gerant,  @dept_farmos, 'true', 'false', NOW(), NOW() UNION ALL
  SELECT 1, 'Pierre',   'Côté',       'p.cote@farm.demo',     '$2a$10$abcdefghijklmnopqrstuv', @role_default, 'pierre.cote@farm.demo',     '+1 514 555 0301', '2025-01-10', @des_tech,    @dept_farmos, 'true', 'false', NOW(), NOW() UNION ALL
  SELECT 1, 'Léa',      'Tremblay',   'l.tremblay@farm.demo', '$2a$10$abcdefghijklmnopqrstuv', @role_default, 'lea.tremblay@farm.demo',    '+1 514 555 0401', '2024-08-12', @des_eleveur, @dept_farmos, 'true', 'false', NOW(), NOW()
) src
WHERE NOT EXISTS (SELECT 1 FROM `users` u WHERE u.username = src.username);
