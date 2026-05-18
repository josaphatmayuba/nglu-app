CREATE TABLE IF NOT EXISTS `real_estate_contract_templates` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'residential',
	`body` text NOT NULL,
	`description` varchar(500),
	`is_active` boolean NOT NULL DEFAULT false,
	`version` int NOT NULL DEFAULT 1,
	`created_by` bigint,
	`updated_by` bigint,
	`created_at` timestamp,
	`updated_at` timestamp,
	CONSTRAINT `real_estate_contract_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT IGNORE INTO `real_estate_contract_templates`
  (`name`, `type`, `body`, `description`, `is_active`, `version`, `created_at`, `updated_at`)
VALUES (
  'Bail résidentiel standard (RDC)',
  'residential',
  'CONTRAT DE BAIL À LOYER\n\nARTICLE 1 : DÉSIGNATION DES PARTIES\nLE BAILLEUR : [NOM COMPLET DU BAILLEUR], résidant au [ADRESSE DU BAILLEUR]\n\nLE PRENEUR (Locataire) : [NOM COMPLET DU PRENEUR], titulaire de la pièce d''identité n° [NUMÉRO DE PIÈCE D''IDENTITÉ], résidant au [ADRESSE DU PRENEUR]\n\nARTICLE 2 : OBJET ET DESTINATION DES LIEUX\nLe Bailleur donne en location au Preneur un local situé à l''adresse suivante :\nAdresse : [ADRESSE COMPLÈTE DU LOGEMENT DE LOCATION], Destination des lieux : [TYPE DE LOGEMENT].\n\nARTICLE 3 : DURÉE ET PRÉAVIS\nLe présent bail est conclu pour une durée de [NUMÉRO DE MOIS] mois, commençant le [DATE DE DÉBUT DE BAIL] au [DATE DE FIN DE BAIL].\n\nLe délai de préavis est fixé à TROIS (3) MOIS pour un usage résidentiel ou SIX (6) MOIS pour un usage professionnel. Toute notification de préavis doit être faite par écrit avec accusé de réception.\n\nARTICLE 4 : LOYER ET GARANTIE LOCATIVE\n4.1. Loyer : Le loyer mensuel est fixé à [MONTANT DU LOYER] $ (USD). Conformément à la réglementation, le paiement s''effectue en Francs Congolais (CDF) au taux officiel de la Banque Centrale du Congo.\n4.2. Garantie Locative : Le Preneur verse ce jour une garantie de [MONTANT GARANTIE] $, correspondant à [NUMÉRO DE MOIS DE GARANTIE] mois de loyer (Maximum 3 mois pour le résidentiel). Cette somme est restituée en fin de bail après déduction des éventuels arriérés ou réparations locatives.\n\nARTICLE 5 : ÉTAT DES LIEUX\nUn état des lieux contradictoire est obligatoirement annexé au présent contrat lors de la remise des clés. À défaut d''état des lieux, le locataire est présumé avoir reçu le bien en bon état de réparations locatives.\n\nARTICLE 6 : CHARGES ET ENTRETIEN\nLe Preneur prend à sa charge les consommations d''eau (REGIDESO), d''électricité (SNEL) et l''entretien courant des équipements. Le Bailleur reste responsable des grosses réparations (toiture, murs, étanchéité) et de l''Impôt sur le Revenu Locatif (IRL).\n\nARTICLE 7 : REMISE EN ÉTAT\nÀ l''expiration du bail et lors de la libération du bâtiment, le Preneur a l''obligation de rendre la maison dans l''état exact où elle se trouvait lors de la remise des clés, tel que décrit dans l''état des lieux initial, à l''exception de l''usure normale due au temps.\n\nARTICLE 8 : RÉPARATION ET FACTURATION\nToute destruction, dégradation, ou modification non autorisée constatée lors de la sortie sera intégralement facturée au Preneur. Les frais de remise en état seront déduits de la garantie locative. Si le montant des dégâts excède la garantie locative, le Preneur s''engage à payer le reliquat sur présentation des factures de réparation.\n\nARTICLE 9 : CLAUSE RÉSOLUTOIRE\nÀ défaut de paiement d''un seul terme de loyer à l''échéance, le bail sera résilié de plein droit UN MOIS après une mise en demeure restée infructueuse.\n\nFait à [VILLE] le [DATE DE SIGNATURE DE BAIL].\n\nLE BAILLEUR\n(Signature légalisée electronique ou manuelle)\n\nLE PRENEUR\n(Signature légalisée electronique ou manuelle)',
  'Modèle initial RDC, conforme à la pratique courante (REGIDESO, SNEL, IRL).',
  true,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT IGNORE INTO `real_estate_contract_templates`
  (`name`, `type`, `body`, `description`, `is_active`, `version`, `created_at`, `updated_at`)
VALUES (
  'Bail commercial / bureau',
  'commercial',
  'CONTRAT DE BAIL COMMERCIAL\n\nARTICLE 1 : DÉSIGNATION DES PARTIES\nLE BAILLEUR : [NOM COMPLET DU BAILLEUR], résidant au [ADRESSE DU BAILLEUR]\n\nLE PRENEUR : [NOM COMPLET DU PRENEUR], titulaire du RCCM n° [NUMÉRO DE PIÈCE D''IDENTITÉ], dont le siège est situé au [ADRESSE DU PRENEUR]\n\nARTICLE 2 : OBJET\nLe Bailleur donne en location au Preneur un local situé au [ADRESSE COMPLÈTE DU LOGEMENT DE LOCATION] destiné à l''usage de [TYPE DE LOGEMENT].\n\nARTICLE 3 : DURÉE\nLe présent bail est conclu pour une durée de [NUMÉRO DE MOIS] mois, du [DATE DE DÉBUT DE BAIL] au [DATE DE FIN DE BAIL]. Préavis de SIX (6) MOIS pour un usage professionnel.\n\nARTICLE 4 : LOYER ET GARANTIE\nLoyer mensuel : [MONTANT DU LOYER] $ (USD), payable en CDF au taux BCC.\nGarantie : [MONTANT GARANTIE] $ ([NUMÉRO DE MOIS DE GARANTIE] mois de loyer).\n\nARTICLE 5 : USAGE DES LIEUX\nLe Preneur ne pourra utiliser les locaux que pour l''activité déclarée. Tout changement d''affectation est soumis à l''accord écrit du Bailleur.\n\nARTICLE 6 : CHARGES\nLe Preneur prend à sa charge l''eau (REGIDESO), l''électricité (SNEL), les taxes liées à l''exploitation et l''entretien courant.\n\nARTICLE 7 : RÉSILIATION\nÀ défaut de paiement d''un terme de loyer, le bail sera résilié de plein droit UN MOIS après mise en demeure infructueuse.\n\nFait à [VILLE] le [DATE DE SIGNATURE DE BAIL].\n\nLE BAILLEUR\n(Signature)\n\nLE PRENEUR\n(Signature)',
  'Modèle pour locations professionnelles (bureau, commerce).',
  true,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT IGNORE INTO `real_estate_contract_templates`
  (`name`, `type`, `body`, `description`, `is_active`, `version`, `created_at`, `updated_at`)
VALUES (
  'Bail court terme / saisonnier',
  'short_term',
  'CONTRAT DE BAIL DE COURTE DURÉE\n\nARTICLE 1 : PARTIES\nBAILLEUR : [NOM COMPLET DU BAILLEUR], [ADRESSE DU BAILLEUR]\nPRENEUR : [NOM COMPLET DU PRENEUR], [ADRESSE DU PRENEUR]\n\nARTICLE 2 : LIEUX\nBien loué : [ADRESSE COMPLÈTE DU LOGEMENT DE LOCATION] — [TYPE DE LOGEMENT].\n\nARTICLE 3 : DURÉE\nDu [DATE DE DÉBUT DE BAIL] au [DATE DE FIN DE BAIL] ([NUMÉRO DE MOIS] mois). Non reconductible tacitement.\n\nARTICLE 4 : LOYER\nLoyer total : [MONTANT DU LOYER] $. Garantie : [MONTANT GARANTIE] $.\n\nARTICLE 5 : ÉTAT DES LIEUX\nUn inventaire contradictoire est dressé à l''entrée et à la sortie.\n\nARTICLE 6 : RESTITUTION\nÀ l''échéance, le Preneur restitue le bien dans l''état initial. La garantie est restituée sous 7 jours après constat.\n\nFait à [VILLE] le [DATE DE SIGNATURE DE BAIL].\n\nLE BAILLEUR\n(Signature)\n\nLE PRENEUR\n(Signature)',
  'Pour locations saisonnières ou meublées de courte durée.',
  true,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
