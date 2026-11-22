-- Domus : champ intervenant (worker_name) sur les couts de maintenance.
-- Option 1 (texte libre). Colonne hors journal auto-applique : idempotent via INFORMATION_SCHEMA
-- (MySQL 8 ne supporte pas ADD COLUMN IF NOT EXISTS). A repliquer sur dev ET prod.
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_maintenance_costs' AND COLUMN_NAME = 'worker_name');
SET @ddl := IF(@col = 0, 'ALTER TABLE real_estate_maintenance_costs ADD COLUMN worker_name VARCHAR(255) NULL AFTER supplier_id', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
