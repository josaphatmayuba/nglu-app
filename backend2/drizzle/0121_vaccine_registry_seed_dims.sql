-- Idempotent (INSERT IGNORE + UNIQUE). Seed des dimensions du referentiel vaccins.
-- Regions reglementaires, especes, pathogenes. Sans apostrophe dans les commentaires.
INSERT IGNORE INTO `vx_regions` (`iso_code`,`name`,`regulatory_body`) VALUES
  ('CA','Canada','CFIA/ACIA'),
  ('US','Etats-Unis','USDA APHIS'),
  ('FR','France','ANSES-ANMV'),
  (NULL,'Union Europeenne','EMA-UPD'),
  ('CD','RD Congo','Ministere Peche et Elevage'),
  (NULL,'International','WOAH/OMSA'),
  (NULL,'Mondial (compagnie)','WSAVA');
--> statement-breakpoint
INSERT IGNORE INTO `vx_species` (`scientific_name`,`common_name_en`,`common_name_fr`,`animal_category`) VALUES
  ('Gallus gallus domesticus','Chicken','Volaille','poultry'),
  ('Bos taurus','Cattle','Bovin','livestock'),
  ('Ovis aries','Sheep','Ovin','livestock'),
  ('Capra hircus','Goat','Caprin','livestock'),
  ('Sus scrofa domesticus','Pig','Porc','livestock'),
  ('Canis lupus familiaris','Dog','Chien','companion'),
  ('Felis catus','Cat','Chat','companion'),
  ('Equus caballus','Horse','Cheval','equine'),
  ('Bubalus bubalis','Buffalo','Buffle','livestock');
--> statement-breakpoint
INSERT IGNORE INTO `vx_pathogens` (`name`,`pathogen_type`,`disease_name_fr`,`is_zoonotic`,`omsa_code`) VALUES
  ('Newcastle Disease Virus','virus','Maladie de Newcastle',0,'ND'),
  ('Infectious Bursal Disease Virus','virus','Maladie de Gumboro',0,NULL),
  ('Avian Infectious Bronchitis Virus','virus','Bronchite infectieuse aviaire',0,NULL),
  ('Fowlpox Virus','virus','Variole aviaire',0,NULL),
  ('Mycoplasma gallisepticum','bacteria','Mycoplasmose aviaire',0,NULL),
  ('Avibacterium paragallinarum','bacteria','Coryza infectieux',0,NULL),
  ('Mareks Disease Virus','virus','Maladie de Marek',0,NULL),
  ('Foot-and-Mouth Disease Virus','virus','Fievre aphteuse',0,'FMD'),
  ('Peste des Petits Ruminants Virus','virus','Peste des petits ruminants',0,'PPR'),
  ('Clostridium chauvoei','bacteria','Charbon symptomatique',0,NULL),
  ('Bacillus anthracis','bacteria','Charbon bacteridien',1,NULL),
  ('Brucella abortus','bacteria','Brucellose bovine',1,NULL),
  ('Pasteurella multocida','bacteria','Pasteurellose',0,NULL),
  ('Rabies Virus','virus','Rage',1,'RABV'),
  ('Lumpy Skin Disease Virus','virus','Dermatose nodulaire contagieuse',0,'LSD'),
  ('Sheeppox Virus','virus','Clavelee et variole caprine',0,NULL),
  ('Canine Distemper Virus','virus','Maladie de Carre',0,NULL),
  ('Canine Parvovirus','virus','Parvovirose canine',0,NULL),
  ('Classical Swine Fever Virus','virus','Peste porcine classique',0,'CSF'),
  ('Erysipelothrix rhusiopathiae','bacteria','Rouget du porc',1,NULL),
  ('Porcine Parvovirus','virus','Parvovirose porcine',0,NULL),
  ('Escherichia coli','bacteria','Colibacillose neonatale',0,NULL),
  ('Salmonella enterica','bacteria','Salmonellose aviaire',1,NULL),
  ('Eimeria spp','parasite','Coccidiose aviaire',0,NULL),
  ('Clostridium perfringens','bacteria','Enterotoxemie',0,NULL);
