-- Distingue entreprise (company) vs personne (individual) sur le referentiel central fournisseurs.
ALTER TABLE `supplier` ADD COLUMN `party_type` varchar(20) NOT NULL DEFAULT 'company';
