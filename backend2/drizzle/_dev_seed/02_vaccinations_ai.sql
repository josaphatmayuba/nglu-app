-- Seed vaccinations (ex-VACCINES dans data.jsx).
INSERT IGNORE INTO `farmos_vaccinations` (`organization_id`, `species`, `vaccine`, `target`, `animal_count`, `due_date`, `status`) VALUES
  (1, 'cow',     'IBR/BVD',            'Génisses 6-9 mois',     18,   '2026-06-02', 'scheduled'),
  (1, 'cow',     'Mammite (J5)',       'Vaches taries',          6,   '2026-05-30', 'scheduled'),
  (1, 'pig',     'Mycoplasme',         'Porcelets sevrés',     124,   '2026-05-27', 'scheduled'),
  (1, 'pig',     'Circovirus',         'Lot Engr. 77',         198,   '2026-05-26', 'today'),
  (1, 'chicken', 'Newcastle',          'Lot Chair 09',        4200,   '2026-05-26', 'today'),
  (1, 'chicken', 'Bronchite infect.',  'Lot Pondeuses 14',    3800,   '2026-06-08', 'scheduled'),
  (1, 'sheep',   'Clavelée',           'Lot Mérinos 211',      318,   '2026-05-22', 'overdue'),
  (1, 'duck',    'Grippe aviaire H5',  'Lot Pékin 05',         920,   '2026-06-14', 'scheduled'),
  (1, 'goat',    'Entérotoxémie',      'Cheptel complet',      142,   '2026-06-22', 'scheduled'),
  (1, 'rabbit',  'VHD',                'Reproductrices',        86,   '2026-06-05', 'scheduled');

-- Seed AI insights (ex-AI_INSIGHTS dans data.jsx). Sera remplacé par SCRUM-233 (Claude Haiku).
INSERT IGNORE INTO `farmos_ai_insights` (`organization_id`, `kind`, `icon`, `confidence`, `text_fr`, `text_en`, `action_label_fr`, `action_label_en`, `action_target`) VALUES
  (1, 'predict', 'sparkle', 87, 'Risque de mammite élevé sur 4 vaches Holstein la semaine prochaine — basé sur baisse rumination + conductivité lait.', 'High mastitis risk for 4 Holstein cows next week — based on rumination drop + milk conductivity.', 'Voir les vaches concernées', 'See affected cows', 'animals'),
  (1, 'feed',    'wheat',   92, 'Le stock d''aliment porc engraissement sera épuisé dans 3 jours au rythme actuel. Commande recommandée : 1 200 kg.', 'Pig finishing feed will run out in 3 days at current rate. Recommended order: 1,200 kg.', 'Lancer la commande', 'Place order', 'stock'),
  (1, 'repro',   'calendar', 81, '12 vaches en chaleur détectées entre le 27 et le 31 mai. Planifier l''inséminateur sur 2 jours consécutifs.', '12 cows in heat detected May 27–31. Schedule inseminator for 2 consecutive days.', 'Planifier', 'Plan', 'repro'),
  (1, 'anomaly', 'pulse',   76, 'Anomalie de ponte sur Lot Pondeuses 14 : –4 % vs prévision. Probable lien à la température +2 °C la nuit.', 'Lay anomaly on Layer Lot 14: −4% vs forecast. Likely linked to nighttime +2 °C.', 'Voir l''analyse', 'View analysis', 'alerts');
