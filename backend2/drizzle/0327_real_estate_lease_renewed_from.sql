-- Domus : un bail renouvele garde le lien vers le bail precedent (renewed_from_lease_id).
-- Forme idempotente (MySQL 8, pas de ADD COLUMN IF NOT EXISTS).
-- Rattrapage des renouvellements deja faits (reference = <ref parent>-R + 4 chiffres, meme org,
-- locataire et unite) puis report de la caution detenue (held) du bail parent vers le renouvellement
-- quand celui-ci n en a pas. Aucune ecriture comptable : le passif Tenant Deposits ne change pas.
-- Report execute deux fois pour suivre une chaine de deux renouvellements.
SET @col_renewed_from := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_leases' AND COLUMN_NAME = 'renewed_from_lease_id');
--> statement-breakpoint
SET @sql := IF(@col_renewed_from = 0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `renewed_from_lease_id` bigint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
UPDATE `real_estate_leases` c JOIN `real_estate_leases` p ON p.organization_id = c.organization_id AND p.tenant_id = c.tenant_id AND p.unit_id = c.unit_id AND p.id <> c.id AND CHAR_LENGTH(c.reference) = CHAR_LENGTH(p.reference) + 6 AND LEFT(c.reference, CHAR_LENGTH(p.reference) + 2) = CONCAT(p.reference, '-R') SET c.renewed_from_lease_id = p.id WHERE c.renewed_from_lease_id IS NULL;
--> statement-breakpoint
UPDATE `real_estate_security_deposits` d JOIN `real_estate_leases` c ON c.renewed_from_lease_id = d.lease_id AND c.organization_id = d.organization_id AND c.status <> 'cancelled' LEFT JOIN (SELECT DISTINCT lease_id FROM `real_estate_security_deposits` WHERE status = 'held' AND is_active = 1) h ON h.lease_id = c.id SET d.lease_id = c.id, d.updated_at = CURRENT_TIMESTAMP WHERE d.status = 'held' AND d.is_active = 1 AND h.lease_id IS NULL;
--> statement-breakpoint
UPDATE `real_estate_security_deposits` d JOIN `real_estate_leases` c ON c.renewed_from_lease_id = d.lease_id AND c.organization_id = d.organization_id AND c.status <> 'cancelled' LEFT JOIN (SELECT DISTINCT lease_id FROM `real_estate_security_deposits` WHERE status = 'held' AND is_active = 1) h ON h.lease_id = c.id SET d.lease_id = c.id, d.updated_at = CURRENT_TIMESTAMP WHERE d.status = 'held' AND d.is_active = 1 AND h.lease_id IS NULL;
