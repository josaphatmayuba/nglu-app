-- Idempotent (rejouable au boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Rôles fins FarmOS + permissions farmos (prompt design ferme/vét).
-- Les permissions *-farmos n'étaient pas seedées ; le système marchait via les
-- rôles isSystem (super-admin) qui bypassent le PermissionsGuard. On crée ici
-- les permissions, les 7 rôles métier et les liaisons rôle↔permission.
-- `name` est UNIQUE sur `permission` et `role` → INSERT IGNORE est sûr.

-- 1) Permissions farmos (create/readAll/readSingle/update/delete)
INSERT IGNORE INTO `permission` (`name`, `type`, `created_at`, `updated_at`) VALUES
  ('create-farmos', 'farmos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readAll-farmos', 'farmos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('readSingle-farmos', 'farmos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('update-farmos', 'farmos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('delete-farmos', 'farmos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint

-- 2) Rôles métier FarmOS (Admin/Gestionnaire peuvent déjà exister sous d'autres noms ; on crée les 7 explicitement)
INSERT IGNORE INTO `role` (`name`, `status`, `is_system`, `created_at`, `updated_at`) VALUES
  ('Admin Ferme', 'true', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Gestionnaire Ferme', 'true', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Éleveur', 'true', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Vétérinaire', 'true', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Superviseur Ferme', 'true', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Employé Ferme', 'true', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('Lecture Ferme', 'true', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
--> statement-breakpoint

-- 3) Liaisons rôle↔permission (pas de contrainte unique sur la paire → WHERE NOT EXISTS).
-- Admin Ferme + Gestionnaire Ferme : toutes les permissions farmos.
INSERT INTO `rolePermission` (`roleId`, `permissionId`, `created_at`, `updated_at`)
SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `role` r
JOIN `permission` p ON p.name IN ('create-farmos','readAll-farmos','readSingle-farmos','update-farmos','delete-farmos')
WHERE r.name IN ('Admin Ferme','Gestionnaire Ferme')
  AND NOT EXISTS (SELECT 1 FROM `rolePermission` rp WHERE rp.roleId = r.id AND rp.permissionId = p.id);
--> statement-breakpoint

-- Vétérinaire + Superviseur Ferme + Éleveur : read + create + update (pas de delete).
INSERT INTO `rolePermission` (`roleId`, `permissionId`, `created_at`, `updated_at`)
SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `role` r
JOIN `permission` p ON p.name IN ('create-farmos','readAll-farmos','readSingle-farmos','update-farmos')
WHERE r.name IN ('Vétérinaire','Superviseur Ferme','Éleveur')
  AND NOT EXISTS (SELECT 1 FROM `rolePermission` rp WHERE rp.roleId = r.id AND rp.permissionId = p.id);
--> statement-breakpoint

-- Employé Ferme : read + create.
INSERT INTO `rolePermission` (`roleId`, `permissionId`, `created_at`, `updated_at`)
SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `role` r
JOIN `permission` p ON p.name IN ('create-farmos','readAll-farmos','readSingle-farmos')
WHERE r.name = 'Employé Ferme'
  AND NOT EXISTS (SELECT 1 FROM `rolePermission` rp WHERE rp.roleId = r.id AND rp.permissionId = p.id);
--> statement-breakpoint

-- Lecture Ferme : lecture seule.
INSERT INTO `rolePermission` (`roleId`, `permissionId`, `created_at`, `updated_at`)
SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `role` r
JOIN `permission` p ON p.name IN ('readAll-farmos','readSingle-farmos')
WHERE r.name = 'Lecture Ferme'
  AND NOT EXISTS (SELECT 1 FROM `rolePermission` rp WHERE rp.roleId = r.id AND rp.permissionId = p.id);
