-- Echange de devise (modele bancaire). Une operation enregistre les VRAIS montants
-- des deux cotes (devise source sortie, devise cible recue) + le taux reel et des
-- frais optionnels. Les ecritures comptables liees sont posees par le ledger via un
-- sous-compte Compte de change par devise. Table hors flux normal : idempotent.
CREATE TABLE IF NOT EXISTS `currency_exchanges` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `date` datetime NOT NULL,
  `reference` varchar(64) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `from_currency_id` bigint NOT NULL,
  `from_account_id` bigint NOT NULL,
  `from_amount` decimal(18,2) NOT NULL,
  `to_currency_id` bigint NOT NULL,
  `to_account_id` bigint NOT NULL,
  `to_amount` decimal(18,2) NOT NULL,
  `rate` decimal(18,6) NOT NULL,
  `fee_amount` decimal(18,2) NOT NULL DEFAULT 0,
  `fee_currency_id` bigint DEFAULT NULL,
  `fee_account_id` bigint DEFAULT NULL,
  `from_entry_id` bigint unsigned DEFAULT NULL,
  `to_entry_id` bigint unsigned DEFAULT NULL,
  `fee_entry_id` bigint unsigned DEFAULT NULL,
  `idempotency_key` varchar(128) DEFAULT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'posted',
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_currency_exchanges_idem` (`organization_id`, `idempotency_key`),
  KEY `idx_currency_exchanges_org_date` (`organization_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
