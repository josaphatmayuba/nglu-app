-- Idempotent. Liaisons du referentiel : antigenes, composition, especes cibles, homologations.
-- Resolution des FK par nom. Mapping vaccin->pathogene->especes en table temporaire logique. Sans apostrophe dans les commentaires.

-- 1) Un antigene par pathogene (forme generique) si absent.
INSERT IGNORE INTO `vx_antigens` (`pathogen_id`,`strain_name`,`antigen_form`)
SELECT p.id, NULL, CASE
    WHEN p.`pathogen_type` = 'virus' THEN 'live-attenuated'
    WHEN p.`pathogen_type` = 'bacteria' THEN 'inactivated'
    ELSE 'live-attenuated' END
FROM `vx_pathogens` p
WHERE NOT EXISTS (SELECT 1 FROM `vx_antigens` a WHERE a.`pathogen_id` = p.id);
--> statement-breakpoint

-- 2) Composition vaccin <-> antigene, via le mapping nom de vaccin -> nom de maladie.
INSERT IGNORE INTO `vx_vaccine_antigens` (`vaccine_id`,`antigen_id`)
SELECT v.id, a.id
FROM (
  SELECT 'Newcastle (ND) - souche La Sota' AS vn,'Maladie de Newcastle' AS dn
  UNION ALL SELECT 'Gumboro (IBD)','Maladie de Gumboro'
  UNION ALL SELECT 'Bronchite infectieuse (IB) - H120','Bronchite infectieuse aviaire'
  UNION ALL SELECT 'Variole aviaire (Fowl pox)','Variole aviaire'
  UNION ALL SELECT 'Mycoplasmose aviaire (MG)','Mycoplasmose aviaire'
  UNION ALL SELECT 'Coryza infectieux','Coryza infectieux'
  UNION ALL SELECT 'Maladie de Marek','Maladie de Marek'
  UNION ALL SELECT 'Fievre aphteuse (FMD)','Fievre aphteuse'
  UNION ALL SELECT 'Peste des petits ruminants (PPR)','Peste des petits ruminants'
  UNION ALL SELECT 'Charbon symptomatique (Blackleg)','Charbon symptomatique'
  UNION ALL SELECT 'Charbon bacteridien (Anthrax)','Charbon bacteridien'
  UNION ALL SELECT 'Brucellose bovine (RB51)','Brucellose bovine'
  UNION ALL SELECT 'Pasteurellose (septicemie hemorragique)','Pasteurellose'
  UNION ALL SELECT 'Rage','Rage'
  UNION ALL SELECT 'Dermatose nodulaire contagieuse (LSD)','Dermatose nodulaire contagieuse'
  UNION ALL SELECT 'Clavelee et variole caprine','Clavelee et variole caprine'
  UNION ALL SELECT 'Maladie de Carre (Distemper)','Maladie de Carre'
  UNION ALL SELECT 'Parvovirose canine','Parvovirose canine'
  UNION ALL SELECT 'Peste porcine classique (CSF)','Peste porcine classique'
  UNION ALL SELECT 'Rouget du porc','Rouget du porc'
  UNION ALL SELECT 'Parvovirose et rouget porcin','Parvovirose porcine'
  UNION ALL SELECT 'Colibacillose neonatale (E. coli)','Colibacillose neonatale'
  UNION ALL SELECT 'Salmonellose aviaire (S. Enteritidis)','Salmonellose aviaire'
  UNION ALL SELECT 'Coccidiose aviaire','Coccidiose aviaire'
  UNION ALL SELECT 'Enterotoxemie (Clostridium perfringens)','Enterotoxemie'
) AS map
JOIN `vx_vaccines` v ON v.`product_name` = map.vn
JOIN `vx_pathogens` p ON p.`disease_name_fr` = map.dn
JOIN `vx_antigens` a ON a.`pathogen_id` = p.id;
--> statement-breakpoint

-- 3) Especes cibles, via mapping vaccin -> espece (common_name_fr).
INSERT IGNORE INTO `vx_vaccine_species` (`vaccine_id`,`species_id`)
SELECT v.id, sp.id
FROM (
  SELECT 'Newcastle (ND) - souche La Sota' AS vn,'Volaille' AS spn
  UNION ALL SELECT 'Gumboro (IBD)','Volaille'
  UNION ALL SELECT 'Bronchite infectieuse (IB) - H120','Volaille'
  UNION ALL SELECT 'Variole aviaire (Fowl pox)','Volaille'
  UNION ALL SELECT 'Mycoplasmose aviaire (MG)','Volaille'
  UNION ALL SELECT 'Coryza infectieux','Volaille'
  UNION ALL SELECT 'Maladie de Marek','Volaille'
  UNION ALL SELECT 'Salmonellose aviaire (S. Enteritidis)','Volaille'
  UNION ALL SELECT 'Coccidiose aviaire','Volaille'
  UNION ALL SELECT 'Fievre aphteuse (FMD)','Bovin'
  UNION ALL SELECT 'Fievre aphteuse (FMD)','Ovin'
  UNION ALL SELECT 'Fievre aphteuse (FMD)','Caprin'
  UNION ALL SELECT 'Fievre aphteuse (FMD)','Porc'
  UNION ALL SELECT 'Peste des petits ruminants (PPR)','Ovin'
  UNION ALL SELECT 'Peste des petits ruminants (PPR)','Caprin'
  UNION ALL SELECT 'Charbon symptomatique (Blackleg)','Bovin'
  UNION ALL SELECT 'Charbon symptomatique (Blackleg)','Ovin'
  UNION ALL SELECT 'Charbon bacteridien (Anthrax)','Bovin'
  UNION ALL SELECT 'Charbon bacteridien (Anthrax)','Ovin'
  UNION ALL SELECT 'Charbon bacteridien (Anthrax)','Caprin'
  UNION ALL SELECT 'Brucellose bovine (RB51)','Bovin'
  UNION ALL SELECT 'Pasteurellose (septicemie hemorragique)','Bovin'
  UNION ALL SELECT 'Pasteurellose (septicemie hemorragique)','Buffle'
  UNION ALL SELECT 'Rage','Chien'
  UNION ALL SELECT 'Rage','Chat'
  UNION ALL SELECT 'Rage','Bovin'
  UNION ALL SELECT 'Dermatose nodulaire contagieuse (LSD)','Bovin'
  UNION ALL SELECT 'Clavelee et variole caprine','Ovin'
  UNION ALL SELECT 'Clavelee et variole caprine','Caprin'
  UNION ALL SELECT 'Maladie de Carre (Distemper)','Chien'
  UNION ALL SELECT 'Parvovirose canine','Chien'
  UNION ALL SELECT 'Peste porcine classique (CSF)','Porc'
  UNION ALL SELECT 'Rouget du porc','Porc'
  UNION ALL SELECT 'Parvovirose et rouget porcin','Porc'
  UNION ALL SELECT 'Colibacillose neonatale (E. coli)','Porc'
  UNION ALL SELECT 'Colibacillose neonatale (E. coli)','Bovin'
  UNION ALL SELECT 'Enterotoxemie (Clostridium perfringens)','Ovin'
  UNION ALL SELECT 'Enterotoxemie (Clostridium perfringens)','Caprin'
  UNION ALL SELECT 'Enterotoxemie (Clostridium perfringens)','Bovin'
) AS map
JOIN `vx_vaccines` v ON v.`product_name` = map.vn
JOIN `vx_species` sp ON sp.`common_name_fr` = map.spn;
--> statement-breakpoint

-- 4) Une homologation internationale (WOAH) par vaccin si absente.
INSERT IGNORE INTO `vx_registrations` (`vaccine_id`,`region_id`,`registration_number`,`status`,`source_system`,`source_document_url`)
SELECT v.id, r.id, CONCAT('WOAH-REF-', v.id), 'authorized', 'WOAH', v.`source_url`
FROM `vx_vaccines` v
CROSS JOIN `vx_regions` r
WHERE r.`name` = 'International'
  AND NOT EXISTS (
    SELECT 1 FROM `vx_registrations` rg WHERE rg.`vaccine_id` = v.id AND rg.`region_id` = r.id
  );
