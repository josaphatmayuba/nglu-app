-- Idempotent (INSERT IGNORE + UNIQUE). Seed des fabricants et vaccins normalises.
-- Les liaisons (antigenes/especes/homologations) sont resolues par nom. Sans apostrophe dans les commentaires.
INSERT IGNORE INTO `vx_manufacturers` (`name`) VALUES
  ('MSD Animal Health'),('Ceva Sante Animale'),('Boehringer Ingelheim'),
  ('Zoetis'),('Hipra'),('Elanco'),('Virbac'),('Divers / generique');
--> statement-breakpoint
INSERT IGNORE INTO `vx_vaccines` (`product_name`,`manufacturer_id`,`vaccine_nature`,`physical_form`,`storage_min_c`,`storage_max_c`,`source_system`,`source_url`)
SELECT s.pn, m.id, s.nat, s.form, 2.0, 8.0, 'WOAH', s.url FROM (
  SELECT 'Newcastle (ND) - souche La Sota' AS pn,'MSD Animal Health' AS mf,'monovalent' AS nat,'lyophilise' AS form,'https://www.woah.org/fr/maladie/maladie-de-newcastle/' AS url
  UNION ALL SELECT 'Gumboro (IBD)','MSD Animal Health','monovalent','lyophilise','https://www.woah.org/fr/maladie/bursite-infectieuse-aviaire/'
  UNION ALL SELECT 'Bronchite infectieuse (IB) - H120','MSD Animal Health','monovalent','lyophilise','https://www.woah.org/fr/maladie/bronchite-infectieuse-aviaire/'
  UNION ALL SELECT 'Variole aviaire (Fowl pox)','Ceva Sante Animale','monovalent','lyophilise','https://www.woah.org/fr/maladie/variole-aviaire/'
  UNION ALL SELECT 'Mycoplasmose aviaire (MG)','MSD Animal Health','monovalent','lyophilise','https://www.woah.org/fr/maladie/mycoplasmose-aviaire/'
  UNION ALL SELECT 'Coryza infectieux','MSD Animal Health','monovalent','suspension injectable','https://www.woah.org/fr/'
  UNION ALL SELECT 'Maladie de Marek','Boehringer Ingelheim','monovalent','suspension injectable','https://www.woah.org/fr/maladie/maladie-de-marek/'
  UNION ALL SELECT 'Fievre aphteuse (FMD)','Boehringer Ingelheim','polyvalent','suspension injectable','https://www.woah.org/fr/maladie/fievre-aphteuse/'
  UNION ALL SELECT 'Peste des petits ruminants (PPR)','Divers / generique','monovalent','lyophilise','https://www.woah.org/fr/maladie/peste-des-petits-ruminants/'
  UNION ALL SELECT 'Charbon symptomatique (Blackleg)','MSD Animal Health','polyvalent','suspension injectable','https://www.woah.org/fr/'
  UNION ALL SELECT 'Charbon bacteridien (Anthrax)','Divers / generique','monovalent','suspension injectable','https://www.woah.org/fr/maladie/fievre-charbonneuse/'
  UNION ALL SELECT 'Brucellose bovine (RB51)','Divers / generique','monovalent','lyophilise','https://www.woah.org/fr/maladie/brucellose/'
  UNION ALL SELECT 'Pasteurellose (septicemie hemorragique)','Divers / generique','monovalent','suspension injectable','https://www.woah.org/fr/'
  UNION ALL SELECT 'Rage','Boehringer Ingelheim','monovalent','suspension injectable','https://www.woah.org/fr/maladie/rage/'
  UNION ALL SELECT 'Dermatose nodulaire contagieuse (LSD)','MSD Animal Health','monovalent','lyophilise','https://www.woah.org/fr/maladie/dermatose-nodulaire-contagieuse/'
  UNION ALL SELECT 'Clavelee et variole caprine','Divers / generique','monovalent','lyophilise','https://www.woah.org/fr/maladie/clavelee-et-variole-caprine/'
  UNION ALL SELECT 'Maladie de Carre (Distemper)','MSD Animal Health','polyvalent','lyophilise','https://wsava.org/global-guidelines/vaccination-guidelines/'
  UNION ALL SELECT 'Parvovirose canine','MSD Animal Health','monovalent','lyophilise','https://wsava.org/global-guidelines/vaccination-guidelines/'
  UNION ALL SELECT 'Peste porcine classique (CSF)','Boehringer Ingelheim','monovalent','lyophilise','https://www.woah.org/fr/maladie/peste-porcine-classique/'
  UNION ALL SELECT 'Rouget du porc','Hipra','monovalent','suspension injectable','https://www.woah.org/fr/'
  UNION ALL SELECT 'Parvovirose et rouget porcin','Hipra','polyvalent','suspension injectable','https://www.woah.org/fr/'
  UNION ALL SELECT 'Colibacillose neonatale (E. coli)','Elanco','monovalent','suspension injectable','https://www.woah.org/fr/'
  UNION ALL SELECT 'Salmonellose aviaire (S. Enteritidis)','MSD Animal Health','monovalent','suspension injectable','https://www.woah.org/fr/'
  UNION ALL SELECT 'Coccidiose aviaire','MSD Animal Health','polyvalent','suspension orale','https://www.woah.org/fr/'
  UNION ALL SELECT 'Enterotoxemie (Clostridium perfringens)','MSD Animal Health','polyvalent','suspension injectable','https://www.woah.org/fr/'
) AS s
LEFT JOIN `vx_manufacturers` m ON m.`name` = s.mf;
