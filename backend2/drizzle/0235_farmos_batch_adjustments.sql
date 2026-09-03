-- Ajustement manuel d un lot existant (farmosAnimals.count > 1) : achat de
-- porcelets externes integres a un lot deja en cheptel, transfert entre lots,
-- correction d inventaire. Complete les mecanismes de sortie deja existants
-- (createMortalityEvent decremente count, createSale idem) avec un historique
-- trace des ajustements manuels, jusque la non traces (juste le count brut
-- modifiable sans motif ni date).
--
-- delta positif = ajout, negatif = retrait. count_before/count_after = snapshot
-- d audit au moment de l ajustement.
-- Soft delete via is_active (regle projet : jamais de DELETE physique).
-- Idempotent (rejouable au boot) : CREATE TABLE IF NOT EXISTS suffit, aucune
-- colonne ajoutee a une table existante. Un seul statement par breakpoint.
CREATE TABLE IF NOT EXISTS `farmos_batch_adjustments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `animal_id` BIGINT NOT NULL,
  `adjustment_date` DATE NOT NULL,
  `delta` INT NOT NULL,
  `reason` VARCHAR(100) NOT NULL,
  `notes` TEXT NULL,
  `count_before` INT NOT NULL,
  `count_after` INT NOT NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_batch_adjustments_org` (`organization_id`, `is_active`),
  KEY `idx_farmos_batch_adjustments_animal` (`animal_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
