-- Permission view-reversed-entries: gate l affichage des ecritures contre-passees.
-- Sans cette permission (et hors role systeme), la liste et le grand livre masquent
-- l originale reversed ET sa contre-passation. Idempotent.
INSERT INTO `permission` (`name`, `type`, `created_at`, `updated_at`)
SELECT 'view-reversed-entries', 'account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM `permission` WHERE `name` = 'view-reversed-entries');
