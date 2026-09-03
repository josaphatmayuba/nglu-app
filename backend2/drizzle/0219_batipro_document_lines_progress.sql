-- BatiPro Phase 3 (situations de travaux) : % d'avancement CUMULE par ligne de
-- situation. Une ligne de situation reference une phase (phase_id existe deja) et
-- porte le % d'avancement cumule atteint a cette situation. Le montant de la
-- periode = montant_marche_phase * (progress_pct_courant - progress_pct_precedent).
-- Nullable, defaut NULL (n'impacte pas devis/BC/factures existants).
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_document_lines' AND COLUMN_NAME = 'progress_pct');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_document_lines` ADD COLUMN `progress_pct` DECIMAL(6,2) DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
