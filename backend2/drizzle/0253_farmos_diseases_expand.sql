-- SCRUM-192 — Extension du catalogue global de maladies FarmOS (organization_id NULL).
-- INSERT IGNORE : idempotent (unique sur species+name_fr non garanti par contrainte,
-- donc on vérifie via NOT EXISTS pour éviter les doublons au réapplique).

INSERT INTO `farmos_diseases` (`organization_id`, `species`, `name_fr`, `name_en`, `contagious`)
SELECT * FROM (SELECT
  NULL AS organization_id, 'cow' AS species, 'Fièvre aphteuse' AS name_fr, 'Foot-and-mouth disease' AS name_en, 1 AS contagious
  UNION ALL SELECT NULL, 'cow', 'Diarrhée virale bovine (BVD)', 'Bovine viral diarrhea', 1
  UNION ALL SELECT NULL, 'cow', 'Tuberculose bovine', 'Bovine tuberculosis', 1
  UNION ALL SELECT NULL, 'cow', 'Brucellose', 'Brucellosis', 1
  UNION ALL SELECT NULL, 'cow', 'Kératoconjonctivite infectieuse', 'Infectious bovine keratoconjunctivitis', 1
  UNION ALL SELECT NULL, 'cow', 'Fièvre de lait (hypocalcémie)', 'Milk fever', 0
  UNION ALL SELECT NULL, 'cow', 'Cétose', 'Ketosis', 0
  UNION ALL SELECT NULL, 'cow', 'Charbon bactéridien', 'Anthrax', 1
  UNION ALL SELECT NULL, 'cow', 'Dermatose nodulaire contagieuse', 'Lumpy skin disease', 1
  UNION ALL SELECT NULL, 'cow', 'Trypanosomiase', 'Trypanosomiasis', 1

  UNION ALL SELECT NULL, 'pig', 'Peste porcine africaine', 'African swine fever', 1
  UNION ALL SELECT NULL, 'pig', 'Peste porcine classique', 'Classical swine fever', 1
  UNION ALL SELECT NULL, 'pig', 'Maladie de Teschen', 'Teschen disease', 1
  UNION ALL SELECT NULL, 'pig', 'Rouget du porc', 'Swine erysipelas', 1
  UNION ALL SELECT NULL, 'pig', 'Gastro-entérite transmissible (TGE)', 'Transmissible gastroenteritis', 1
  UNION ALL SELECT NULL, 'pig', 'Circovirose porcine', 'Porcine circovirus disease', 1
  UNION ALL SELECT NULL, 'pig', 'Pneumonie enzootique', 'Enzootic pneumonia', 1
  UNION ALL SELECT NULL, 'pig', 'Hernie ombilicale', 'Umbilical hernia', 0

  UNION ALL SELECT NULL, 'chicken', 'Maladie de Newcastle', 'Newcastle disease', 1
  UNION ALL SELECT NULL, 'chicken', 'Maladie de Gumboro', 'Infectious bursal disease', 1
  UNION ALL SELECT NULL, 'chicken', 'Maladie de Marek', 'Marek''s disease', 1
  UNION ALL SELECT NULL, 'chicken', 'Bronchite infectieuse', 'Infectious bronchitis', 1
  UNION ALL SELECT NULL, 'chicken', 'Variole aviaire', 'Fowl pox', 1
  UNION ALL SELECT NULL, 'chicken', 'Salmonellose', 'Salmonellosis', 1
  UNION ALL SELECT NULL, 'chicken', 'Choléra aviaire', 'Fowl cholera', 1
  UNION ALL SELECT NULL, 'chicken', 'Ascite (syndrome hypertension pulmonaire)', 'Ascites syndrome', 0

  UNION ALL SELECT NULL, 'fish', 'Saprolegniose', 'Saprolegniasis', 1
  UNION ALL SELECT NULL, 'fish', 'Septicémie hémorragique virale', 'Viral hemorrhagic septicemia', 1
  UNION ALL SELECT NULL, 'fish', 'Points blancs (Ich)', 'White spot disease (Ich)', 1
  UNION ALL SELECT NULL, 'fish', 'Pourriture des nageoires', 'Fin rot', 0
  UNION ALL SELECT NULL, 'fish', 'Infection branchiale', 'Gill disease', 1

  UNION ALL SELECT NULL, 'goat', 'Peste des petits ruminants', 'Peste des petits ruminants', 1
  UNION ALL SELECT NULL, 'goat', 'Fièvre de la vallée du Rift', 'Rift Valley fever', 1
  UNION ALL SELECT NULL, 'goat', 'Ecthyma contagieux (orf)', 'Contagious ecthyma (orf)', 1
  UNION ALL SELECT NULL, 'goat', 'Mammite', 'Mastitis', 0
  UNION ALL SELECT NULL, 'goat', 'Entérotoxémie', 'Enterotoxemia', 0

  UNION ALL SELECT NULL, 'sheep', 'Clavelée (variole ovine)', 'Sheep pox', 1
  UNION ALL SELECT NULL, 'sheep', 'Fièvre catarrhale ovine', 'Bluetongue', 1
  UNION ALL SELECT NULL, 'sheep', 'Piétin', 'Foot rot', 1
  UNION ALL SELECT NULL, 'sheep', 'Entérotoxémie', 'Enterotoxemia', 0
  UNION ALL SELECT NULL, 'sheep', 'Mammite', 'Mastitis', 0

  UNION ALL SELECT NULL, 'rabbit', 'Myxomatose', 'Myxomatosis', 1
  UNION ALL SELECT NULL, 'rabbit', 'Maladie hémorragique virale', 'Rabbit hemorrhagic disease', 1
  UNION ALL SELECT NULL, 'rabbit', 'Coccidiose', 'Coccidiosis', 1
  UNION ALL SELECT NULL, 'rabbit', 'Gale des oreilles', 'Ear mange', 1

  UNION ALL SELECT NULL, 'duck', 'Peste du canard', 'Duck plague', 1
  UNION ALL SELECT NULL, 'duck', 'Hépatite virale du canard', 'Duck viral hepatitis', 1
  UNION ALL SELECT NULL, 'duck', 'Coccidiose', 'Coccidiosis', 1

  UNION ALL SELECT NULL, 'turkey', 'Coryza infectieux', 'Infectious coryza', 1
  UNION ALL SELECT NULL, 'turkey', 'Histomonose (tête noire)', 'Blackhead disease', 1
  UNION ALL SELECT NULL, 'turkey', 'Choléra aviaire', 'Fowl cholera', 1
) AS candidate
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_diseases` d
  WHERE d.organization_id IS NULL
    AND d.species = candidate.species
    AND d.name_fr = candidate.name_fr
);
