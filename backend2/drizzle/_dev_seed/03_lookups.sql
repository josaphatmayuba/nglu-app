-- Dev only — pré-remplit `farmos_lookups` avec les valeurs précédemment hardcodées
-- dans le SPA (quickentry.jsx). En prod la table reste vide; les utilisateurs
-- ajoutent leurs propres valeurs via le bouton "+ Ajouter" du dropdown.

-- ─── Races (breed) — scope_key = species ──────────────────────────────────
INSERT IGNORE INTO `farmos_lookups` (organization_id, category, scope_key, value_fr, value_en) VALUES
(1, 'breed', 'cow', 'Holstein', 'Holstein'),
(1, 'breed', 'cow', 'Jersey', 'Jersey'),
(1, 'breed', 'cow', 'Ayrshire', 'Ayrshire'),
(1, 'breed', 'cow', 'Brown Swiss', 'Brown Swiss'),
(1, 'breed', 'pig', 'Large White', 'Large White'),
(1, 'breed', 'pig', 'Landrace', 'Landrace'),
(1, 'breed', 'pig', 'Duroc', 'Duroc'),
(1, 'breed', 'pig', 'Duroc × LW', 'Duroc × LW'),
(1, 'breed', 'chicken', 'Lohmann Brown', 'Lohmann Brown'),
(1, 'breed', 'chicken', 'Ross 308', 'Ross 308'),
(1, 'breed', 'chicken', 'Cobb 500', 'Cobb 500'),
(1, 'breed', 'fish', 'Truite arc-en-ciel', 'Rainbow trout'),
(1, 'breed', 'fish', 'Tilapia du Nil', 'Nile tilapia'),
(1, 'breed', 'fish', 'Saumon atlantique', 'Atlantic salmon'),
(1, 'breed', 'goat', 'Saanen', 'Saanen'),
(1, 'breed', 'goat', 'Alpine', 'Alpine'),
(1, 'breed', 'goat', 'Toggenburg', 'Toggenburg'),
(1, 'breed', 'sheep', 'Mérinos', 'Merino'),
(1, 'breed', 'sheep', 'Suffolk', 'Suffolk'),
(1, 'breed', 'sheep', 'Dorset', 'Dorset'),
(1, 'breed', 'rabbit', 'Néo-Zélandais', 'New Zealand'),
(1, 'breed', 'rabbit', 'Californien', 'Californian'),
(1, 'breed', 'duck', 'Canard de Pékin', 'Pekin duck'),
(1, 'breed', 'duck', 'Canard de Barbarie', 'Muscovy duck'),
(1, 'breed', 'turkey', 'Bronze des Prés', 'Broad Breasted Bronze'),
(1, 'breed', 'turkey', 'Blanc de Beltsville', 'Beltsville Small White');

-- ─── Type porcin (pig_type) ───────────────────────────────────────────────
INSERT IGNORE INTO `farmos_lookups` (organization_id, category, scope_key, value_fr, value_en) VALUES
(1, 'pig_type', NULL, 'Verrat', 'Boar'),
(1, 'pig_type', NULL, 'Truie', 'Sow'),
(1, 'pig_type', NULL, 'Cochette', 'Gilt'),
(1, 'pig_type', NULL, 'Porcelet', 'Piglet'),
(1, 'pig_type', NULL, 'Sevré', 'Weaned'),
(1, 'pig_type', NULL, 'Engraissement', 'Finishing');

-- ─── Vétérinaires (vet) ───────────────────────────────────────────────────
INSERT IGNORE INTO `farmos_lookups` (organization_id, category, scope_key, value_fr, value_en) VALUES
(1, 'vet', NULL, 'Dr. Émilie Boucher', 'Dr. Émilie Boucher'),
(1, 'vet', NULL, 'Dr. Marc Lavoie', 'Dr. Marc Lavoie'),
(1, 'vet', NULL, 'Dr. Anne Tremblay', 'Dr. Anne Tremblay');

-- ─── Voies d'administration (route) ───────────────────────────────────────
INSERT IGNORE INTO `farmos_lookups` (organization_id, category, scope_key, value_fr, value_en) VALUES
(1, 'route', NULL, 'Injection', 'Injection'),
(1, 'route', NULL, 'Voie orale', 'Oral'),
(1, 'route', NULL, 'Eau de boisson', 'Drinking water'),
(1, 'route', NULL, 'Alimentation', 'Feed'),
(1, 'route', NULL, 'Bassin', 'Pond'),
(1, 'route', NULL, 'Aérosol', 'Spray');

-- ─── Causes de mortalité (death_cause) ────────────────────────────────────
INSERT IGNORE INTO `farmos_lookups` (organization_id, category, scope_key, value_fr, value_en) VALUES
(1, 'death_cause', NULL, 'Maladie', 'Disease'),
(1, 'death_cause', NULL, 'Accident', 'Accident'),
(1, 'death_cause', NULL, 'Vêlage / mise bas', 'Birthing'),
(1, 'death_cause', NULL, 'Stress thermique', 'Heat stress'),
(1, 'death_cause', NULL, 'Prédation', 'Predation'),
(1, 'death_cause', NULL, 'Inconnu', 'Unknown'),
(1, 'death_cause', NULL, 'Abattage sanitaire', 'Sanitary cull');
