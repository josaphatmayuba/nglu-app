-- KodaTill Phase 4 (SCRUM-300 / epic SCRUM-278) : couche plateforme, soit les
-- plans commerciaux, les souscriptions par organisation et le journal des
-- commissions prelevees sur les commandes.
--
-- kt_plans est la seule table kt_ SANS organization_id : un plan est un objet
-- global de la plateforme, partage par toutes les organisations, et non une
-- donnee cloisonnee par locataire. Lui donner un organization_id laisserait
-- croire quun plan appartient a une organisation et casserait la lecture du
-- catalogue depuis une autre organisation. code est la cle fonctionnelle
-- stable (free, standard, premium) referencee par kt_subscriptions.plan_code,
-- do la contrainte UNIQUE qui garantit lunicite du referentiel.
-- commission_rate est exprime en pourcentage et non en fraction : 1.00 vaut
-- 1 pour cent. DECIMAL(5,2) autorise donc jusqua 999.99 pour cent, largement
-- suffisant, et evite les erreurs darrondi du flottant sur un calcul monetaire.
-- limits est un JSON nullable qui porte les quotas variables selon les plans
-- (nombre de succursales, de terminaux, de produits) sans imposer une migration
-- a chaque nouveau quota. is_active distingue un plan retire du catalogue
-- commercial dun plan supprime : is_active a 0 masque le plan a la vente mais
-- laisse vivre les souscriptions en cours, tandis que status porte le soft
-- delete technique habituel.
--
-- kt_subscriptions.organization_id nest PAS le scope multi-locataire habituel
-- des tables kt_ : ici lorganisation est le sujet meme de la ligne, la cle
-- metier qui designe qui est abonne. Son type suit donc exactement celui de
-- organizations.id, declare en serial cote Drizzle, ce qui produit un
-- BIGINT UNSIGNED. Cest volontairement different du BIGINT signe DEFAULT 1
-- utilise comme colonne de cloisonnement ailleurs, et cet ecart est necessaire
-- pour que la reference reste alignee sur la cle primaire visee.
-- La cle UNIQUE sur organization_id impose une seule souscription par
-- organisation : un changement de formule met a jour la ligne existante plutot
-- que dempiler des souscriptions concurrentes, ce qui rend impossible letat
-- ambigu de deux abonnements actifs simultanes.
-- sub_status porte letat metier du cycle de vie de labonnement. Il ne
-- sappelle deliberement PAS status : dans ce projet la colonne status est
-- reservee exclusivement au soft delete avec les valeurs true et false, et
-- reutiliser ce nom pour un etat metier a deja provoque un incident en Phase 1
-- sur kt_orders, ou letat de commande a du etre renomme order_status.
-- Les quatre horodatages couvrent le cycle complet : started_at est le debut
-- effectif, trial_ends_at borne la periode dessai, renews_at porte la prochaine
-- echeance de facturation et cancelled_at trace la resiliation. Les trois
-- derniers sont nullables car ils ne concernent pas tous les etats.
--
-- kt_commission_entries est le journal detaille des commissions, a forte
-- volumetrie puisquil recoit une ligne par commande commissionnee. base_amount
-- et rate sont des snapshots figes au moment du calcul : si le plan change de
-- taux ensuite, les commissions deja calculees restent justes et auditables,
-- ce qui est indispensable pour un module comptable. commission_amount est
-- stocke plutot que recalcule a la lecture, pour que le montant historique
-- resiste a toute evolution de la regle darrondi.
-- period_month au format 2026-08 sur VARCHAR(7) sert de cle de regroupement
-- pour la facturation mensuelle et se prete au tri lexicographique, qui suit
-- lordre chronologique avec ce format. settled_at nul signifie commission due
-- et non encore reglee, renseigne il marque le versement effectif.
-- payment_id est nullable car une commission peut etre rattachee a la commande
-- avant quun paiement precis lui soit associe.
--
-- Index de volumetrie demandes : kt_subscriptions(organization_id) est deja
-- couvert par la contrainte UNIQUE, qui cree un index utilisable pour la
-- recherche, aucun index supplementaire nest donc ajoute sur cette colonne
-- pour ne pas dupliquer inutilement une structure identique.
-- kt_commission_entries(organization_id, period_month) sert le releve mensuel
-- par organisation et kt_commission_entries(order_id) sert la remontee depuis
-- une commande.
--
-- Conventions projet : soft delete via status, created_at / updated_at
-- systematiques, un seul statement par breakpoint, aucune apostrophe dans les
-- commentaires, aucune donnee de demonstration inseree. Comme les autres tables
-- kt_, aucune contrainte FOREIGN KEY physique nest posee : les relations vers
-- organizations, kt_orders et kt_payments sont portees par des colonnes typees
-- a lidentique des cles primaires visees et par des index, lintegrite etant
-- assuree au niveau applicatif.
CREATE TABLE IF NOT EXISTS `kt_plans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `monthly_price` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `currency_code` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `limits` JSON NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kt_plans_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_subscriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `plan_code` VARCHAR(40) NOT NULL,
  `sub_status` ENUM('trial','active','past_due','suspended','cancelled') NOT NULL DEFAULT 'trial',
  `started_at` DATETIME NOT NULL,
  `trial_ends_at` DATETIME NULL,
  `renews_at` DATETIME NULL,
  `cancelled_at` DATETIME NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kt_subscriptions_org` (`organization_id`),
  KEY `idx_kt_subscriptions_plan_code` (`plan_code`),
  KEY `idx_kt_subscriptions_sub_status` (`sub_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_commission_entries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `payment_id` BIGINT UNSIGNED NULL,
  `base_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `commission_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `currency_code` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `period_month` VARCHAR(7) NOT NULL,
  `settled_at` DATETIME NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_commission_entries_org_period` (`organization_id`, `period_month`),
  KEY `idx_kt_commission_entries_order` (`order_id`),
  KEY `idx_kt_commission_entries_payment` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
