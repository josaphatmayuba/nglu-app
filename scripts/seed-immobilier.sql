-- ==========================================================
-- Seed data for Immobilier (Property Management) module
-- Idempotent: uses INSERT IGNORE + unique codes/usernames
-- Safe to run multiple times — duplicates are silently skipped
-- Data matches the design-mockup.html Immobilier panel
-- ==========================================================

-- ============= 1. CUSTOMERS (tenants) =============
INSERT IGNORE INTO customer (firstName, lastName, username, email, phone, address, password, roleId, status, created_at, updated_at) VALUES
('Marie',     'Kabongo',     'marie.kabongo',     'marie.kabongo@email.cd', '+243 999 123 456', '15 Av. Tombalbaye, Gombe',     '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW()),
('Paul',      'Lumumba',     'paul.lumumba',      'paul.l@gmail.com',       '+243 815 678 901', '42 Av. Bandundu, Lemba',       '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW()),
('Sysconnect','SARL',        'sysconnect.sarl',   'contact@sysconnect.cd',  '+243 821 234 567', '25 Av. Wagenia, Gombe',        '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW()),
('Christine', 'Tshisekedi',  'christine.tshisekedi','c.tshisekedi@email.com','+243 818 345 678', '3 Bd du 30 juin, Gombe',       '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW()),
('Jean',      'Bemba',       'jean.bemba',        'jean.bemba@yahoo.fr',    '+243 812 456 789', '8 Bd Lumumba, Limete',         '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW()),
('Antoine',   'Kalala',      'antoine.kalala',    'antoine.k@email.com',    '+243 999 567 890', '14 Av. de la Paix, Ngaliema',  '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW());

-- ============= 2. PROPERTIES =============
INSERT IGNORE INTO real_estate_properties (name, code, property_type, status, address, city, country, floors, parking_spaces, market_value, default_rent, description, created_at, updated_at) VALUES
('Résidence Tombalbaye', 'MOCK-PROP-TOMB', 'building', 'occupied',  '15 Av. Tombalbaye',     'Kinshasa', 'RDC', 6, 10, 480000000, 850000,  'Résidence sécurisée de 12 appartements à Gombe', NOW(), NOW()),
('Villa Lemba Salongo',  'MOCK-PROP-LEMB', 'house',    'occupied',  '42 Av. Bandundu',       'Kinshasa', 'RDC', 2, 2,  280000000, 1200000, 'Maison familiale 4 chambres avec jardin',         NOW(), NOW()),
('Tour Wagenia',         'MOCK-PROP-WAGE', 'building', 'occupied',  '25 Av. Wagenia',        'Kinshasa', 'RDC', 8, 20, 950000000, 2400000, 'Immeuble de bureaux Plateau Gombe',                NOW(), NOW()),
('Résidence Limete Plaza','MOCK-PROP-LIME','building', 'available', '8 Bd Lumumba',          'Kinshasa', 'RDC', 4, 8,  220000000, 620000,  'Résidence moderne 8 appartements',                 NOW(), NOW()),
('Galerie Présidentielle','MOCK-PROP-GALE','building', 'occupied',  '3 Bd du 30 juin',       'Kinshasa', 'RDC', 1, 5,  340000000, 1800000, 'Galerie commerciale front rue',                    NOW(), NOW()),
('Villa Bandalungwa Sud','MOCK-PROP-BAND', 'house',    'maintenance','17 Av. de la Paix',    'Kinshasa', 'RDC', 1, 2,  180000000, 0,       'Villa en travaux — toiture + électricité',         NOW(), NOW()),
('Villa Ngaliema',       'MOCK-PROP-NGAL', 'house',    'occupied',  '14 Av. de la Paix',     'Kinshasa', 'RDC', 1, 1,  210000000, 950000,  'Villa coloniale rénovée',                          NOW(), NOW());

-- ============= 3. UNITS =============
-- Use property codes to lookup property_id
INSERT IGNORE INTO real_estate_units (property_id, name, unit_type, status, floor, bedrooms, bathrooms, area, monthly_rent, security_deposit, description, created_at, updated_at)
SELECT p.id, 'A-203', 'apartment', 'occupied', '2',  3, 2, 120, 850000,  1700000, 'Appartement T4 vue jardin', NOW(), NOW()
FROM real_estate_properties p WHERE p.code = 'MOCK-PROP-TOMB';

INSERT IGNORE INTO real_estate_units (property_id, name, unit_type, status, floor, bedrooms, bathrooms, area, monthly_rent, security_deposit, description, created_at, updated_at)
SELECT p.id, 'M-12', 'house', 'occupied', 'RDC', 4, 3, 240, 1200000, 2400000, 'Maison entière 4 chambres', NOW(), NOW()
FROM real_estate_properties p WHERE p.code = 'MOCK-PROP-LEMB';

INSERT IGNORE INTO real_estate_units (property_id, name, unit_type, status, floor, bedrooms, bathrooms, area, monthly_rent, security_deposit, description, created_at, updated_at)
SELECT p.id, '4ème étage', 'office', 'occupied', '4', 0, 2, 180, 2400000, 4800000, 'Bureau open-space 15 postes', NOW(), NOW()
FROM real_estate_properties p WHERE p.code = 'MOCK-PROP-WAGE';

INSERT IGNORE INTO real_estate_units (property_id, name, unit_type, status, floor, bedrooms, bathrooms, area, monthly_rent, security_deposit, description, created_at, updated_at)
SELECT p.id, 'B-105', 'apartment', 'vacant', '1', 2, 1, 85, 620000, 1240000, 'Appartement T3 lumineux', NOW(), NOW()
FROM real_estate_properties p WHERE p.code = 'MOCK-PROP-LIME';

INSERT IGNORE INTO real_estate_units (property_id, name, unit_type, status, floor, bedrooms, bathrooms, area, monthly_rent, security_deposit, description, created_at, updated_at)
SELECT p.id, 'B-301', 'apartment', 'occupied', '3', 2, 1, 95, 720000, 1440000, 'Appartement T3 angle', NOW(), NOW()
FROM real_estate_properties p WHERE p.code = 'MOCK-PROP-LIME';

INSERT IGNORE INTO real_estate_units (property_id, name, unit_type, status, floor, bedrooms, bathrooms, area, monthly_rent, security_deposit, description, created_at, updated_at)
SELECT p.id, 'RDC', 'commercial', 'occupied', 'RDC', 0, 1, 45, 1800000, 3600000, 'Local commercial front rue', NOW(), NOW()
FROM real_estate_properties p WHERE p.code = 'MOCK-PROP-GALE';

INSERT IGNORE INTO real_estate_units (property_id, name, unit_type, status, floor, bedrooms, bathrooms, area, monthly_rent, security_deposit, description, created_at, updated_at)
SELECT p.id, 'M-07', 'house', 'maintenance', 'RDC', 3, 2, 160, 0, 0, 'En travaux jusqu''à fin mai', NOW(), NOW()
FROM real_estate_properties p WHERE p.code = 'MOCK-PROP-BAND';

INSERT IGNORE INTO real_estate_units (property_id, name, unit_type, status, floor, bedrooms, bathrooms, area, monthly_rent, security_deposit, description, created_at, updated_at)
SELECT p.id, 'M-04', 'house', 'occupied', 'RDC', 3, 2, 150, 950000, 1900000, 'Villa coloniale rénovée', NOW(), NOW()
FROM real_estate_properties p WHERE p.code = 'MOCK-PROP-NGAL';

-- ============= 4. LEASES =============
-- Marie Kabongo · Tombalbaye A-203 · SIGNÉ · actif depuis 01/03/2024
INSERT IGNORE INTO real_estate_leases (reference, property_id, unit_id, tenant_id, start_date, end_date, next_invoice_date, billing_cycle, rent_amount, security_deposit, terms, status, created_at, updated_at)
SELECT 'MOCK-BAIL-2024-018',
  (SELECT id FROM real_estate_properties WHERE code='MOCK-PROP-TOMB' LIMIT 1),
  (SELECT u.id FROM real_estate_units u JOIN real_estate_properties p ON u.property_id=p.id WHERE p.code='MOCK-PROP-TOMB' AND u.name='A-203' LIMIT 1),
  (SELECT id FROM customer WHERE username='marie.kabongo' LIMIT 1),
  '2024-03-01', '2027-02-28', '2026-06-05', 'monthly', 850000, 1700000, 'Bail résidentiel standard 3 ans', 'active', NOW(), NOW();

-- Paul Lumumba · Villa Lemba · SANS CONTRAT · en retard 12j
INSERT IGNORE INTO real_estate_leases (reference, property_id, unit_id, tenant_id, start_date, end_date, next_invoice_date, billing_cycle, rent_amount, security_deposit, terms, status, created_at, updated_at)
SELECT 'MOCK-BAIL-2023-014',
  (SELECT id FROM real_estate_properties WHERE code='MOCK-PROP-LEMB' LIMIT 1),
  (SELECT u.id FROM real_estate_units u JOIN real_estate_properties p ON u.property_id=p.id WHERE p.code='MOCK-PROP-LEMB' AND u.name='M-12' LIMIT 1),
  (SELECT id FROM customer WHERE username='paul.lumumba' LIMIT 1),
  '2023-01-15', '2026-01-14', '2026-05-03', 'monthly', 1200000, 2400000, 'Bail résidentiel 3 ans', 'active', NOW(), NOW();

-- Sysconnect · Tour Wagenia · ATTENTE SIGNATURE · expire dans 17j
INSERT IGNORE INTO real_estate_leases (reference, property_id, unit_id, tenant_id, start_date, end_date, next_invoice_date, billing_cycle, rent_amount, security_deposit, terms, status, created_at, updated_at)
SELECT 'MOCK-BAIL-2022-009',
  (SELECT id FROM real_estate_properties WHERE code='MOCK-PROP-WAGE' LIMIT 1),
  (SELECT u.id FROM real_estate_units u JOIN real_estate_properties p ON u.property_id=p.id WHERE p.code='MOCK-PROP-WAGE' AND u.name='4ème étage' LIMIT 1),
  (SELECT id FROM customer WHERE username='sysconnect.sarl' LIMIT 1),
  '2022-06-01', '2026-05-31', '2026-06-10', 'monthly', 2400000, 4800000, 'Bail commercial 4 ans', 'active', NOW(), NOW();

-- Christine Tshisekedi · Galerie · SIGNÉ · nouveau bail
INSERT IGNORE INTO real_estate_leases (reference, property_id, unit_id, tenant_id, start_date, end_date, next_invoice_date, billing_cycle, rent_amount, security_deposit, terms, status, created_at, updated_at)
SELECT 'MOCK-BAIL-2025-007',
  (SELECT id FROM real_estate_properties WHERE code='MOCK-PROP-GALE' LIMIT 1),
  (SELECT u.id FROM real_estate_units u JOIN real_estate_properties p ON u.property_id=p.id WHERE p.code='MOCK-PROP-GALE' AND u.name='RDC' LIMIT 1),
  (SELECT id FROM customer WHERE username='christine.tshisekedi' LIMIT 1),
  '2025-05-10', '2028-05-09', '2026-05-15', 'monthly', 1800000, 3600000, 'Bail commercial 3 ans', 'active', NOW(), NOW();

-- Jean Bemba · Limete B-301 · SANS CONTRAT
INSERT IGNORE INTO real_estate_leases (reference, property_id, unit_id, tenant_id, start_date, end_date, next_invoice_date, billing_cycle, rent_amount, security_deposit, terms, status, created_at, updated_at)
SELECT 'MOCK-BAIL-2024-022',
  (SELECT id FROM real_estate_properties WHERE code='MOCK-PROP-LIME' LIMIT 1),
  (SELECT u.id FROM real_estate_units u JOIN real_estate_properties p ON u.property_id=p.id WHERE p.code='MOCK-PROP-LIME' AND u.name='B-301' LIMIT 1),
  (SELECT id FROM customer WHERE username='jean.bemba' LIMIT 1),
  '2024-05-01', '2027-04-30', '2026-05-30', 'monthly', 720000, 1440000, 'Bail résidentiel 3 ans', 'active', NOW(), NOW();

-- Antoine Kalala · Ngaliema · À RENOUVELER · expire 32j
INSERT IGNORE INTO real_estate_leases (reference, property_id, unit_id, tenant_id, start_date, end_date, next_invoice_date, billing_cycle, rent_amount, security_deposit, terms, status, created_at, updated_at)
SELECT 'MOCK-BAIL-2023-011',
  (SELECT id FROM real_estate_properties WHERE code='MOCK-PROP-NGAL' LIMIT 1),
  (SELECT u.id FROM real_estate_units u JOIN real_estate_properties p ON u.property_id=p.id WHERE p.code='MOCK-PROP-NGAL' AND u.name='M-04' LIMIT 1),
  (SELECT id FROM customer WHERE username='antoine.kalala' LIMIT 1),
  '2023-06-15', '2026-06-14', '2026-06-20', 'monthly', 950000, 1900000, 'Bail résidentiel 3 ans', 'active', NOW(), NOW();

-- ============= 5. RENT PAYMENTS =============
-- Marie Kabongo · mai 2026 PAYÉ
INSERT IGNORE INTO real_estate_rent_payments (lease_id, payment_date, amount, method, reference, notes, created_at, updated_at)
SELECT (SELECT id FROM real_estate_leases WHERE reference='MOCK-BAIL-2024-018' LIMIT 1),
  '2026-05-05', 850000, 'transfer', 'QUIT-2026-0143', 'Loyer mai 2026', NOW(), NOW();

-- Marie Kabongo · avril 2026 PAYÉ
INSERT IGNORE INTO real_estate_rent_payments (lease_id, payment_date, amount, method, reference, notes, created_at, updated_at)
SELECT (SELECT id FROM real_estate_leases WHERE reference='MOCK-BAIL-2024-018' LIMIT 1),
  '2026-04-05', 850000, 'transfer', 'QUIT-2026-0137', 'Loyer avril 2026', NOW(), NOW();

-- Sysconnect · mai 2026 PAYÉ (chèque)
INSERT IGNORE INTO real_estate_rent_payments (lease_id, payment_date, amount, method, reference, notes, created_at, updated_at)
SELECT (SELECT id FROM real_estate_leases WHERE reference='MOCK-BAIL-2022-009' LIMIT 1),
  '2026-05-10', 2400000, 'check', 'QUIT-2026-0141', 'Loyer mai 2026 (chèque)', NOW(), NOW();

-- Jean Bemba · avril 2026 PAYÉ (mobile money)
INSERT IGNORE INTO real_estate_rent_payments (lease_id, payment_date, amount, method, reference, notes, created_at, updated_at)
SELECT (SELECT id FROM real_estate_leases WHERE reference='MOCK-BAIL-2024-022' LIMIT 1),
  '2026-04-30', 720000, 'mobile_money', 'QUIT-2026-0139', 'Loyer avril 2026 — Mpesa', NOW(), NOW();

-- Antoine Kalala · avril 2026
INSERT IGNORE INTO real_estate_rent_payments (lease_id, payment_date, amount, method, reference, notes, created_at, updated_at)
SELECT (SELECT id FROM real_estate_leases WHERE reference='MOCK-BAIL-2023-011' LIMIT 1),
  '2026-04-20', 950000, 'transfer', 'QUIT-2026-0136', 'Loyer avril 2026', NOW(), NOW();

-- Christine Tshisekedi · avril 2026
INSERT IGNORE INTO real_estate_rent_payments (lease_id, payment_date, amount, method, reference, notes, created_at, updated_at)
SELECT (SELECT id FROM real_estate_leases WHERE reference='MOCK-BAIL-2025-007' LIMIT 1),
  '2026-04-15', 1800000, 'transfer', 'QUIT-2026-0135', 'Loyer avril 2026', NOW(), NOW();

-- ============= 6. MAINTENANCE REQUESTS =============
-- Fuite d'eau urgent (Villa Bandalungwa)
INSERT IGNORE INTO real_estate_maintenance_requests (property_id, unit_id, title, priority, status, scheduled_date, estimated_cost, description, created_at, updated_at)
SELECT (SELECT id FROM real_estate_properties WHERE code='MOCK-PROP-BAND' LIMIT 1),
  (SELECT u.id FROM real_estate_units u JOIN real_estate_properties p ON u.property_id=p.id WHERE p.code='MOCK-PROP-BAND' AND u.name='M-07' LIMIT 1),
  'Fuite d''eau plafond chambre principale', 'urgent', 'in_progress', '2026-05-15', 250000,
  'Locataire signale fuite importante depuis hier soir. Eau s''accumule au plafond. Plombier Joseph mobilisé. Risque effondrement plâtre.',
  NOW(), NOW();

-- Panne électrique urgent (Villa Bandalungwa)
INSERT IGNORE INTO real_estate_maintenance_requests (property_id, unit_id, title, priority, status, scheduled_date, estimated_cost, description, created_at, updated_at)
SELECT (SELECT id FROM real_estate_properties WHERE code='MOCK-PROP-BAND' LIMIT 1),
  (SELECT u.id FROM real_estate_units u JOIN real_estate_properties p ON u.property_id=p.id WHERE p.code='MOCK-PROP-BAND' AND u.name='M-07' LIMIT 1),
  'Coupures électriques fréquentes', 'urgent', 'open', NULL, 180000,
  'Coupures électriques toutes les 30 min depuis 3 jours. Disjoncteur saute. Investigation cause à effectuer. Électricien non encore assigné.',
  NOW(), NOW();

-- Peinture salon humidité (Limete)
INSERT IGNORE INTO real_estate_maintenance_requests (property_id, unit_id, title, priority, status, scheduled_date, estimated_cost, description, created_at, updated_at)
SELECT (SELECT id FROM real_estate_properties WHERE code='MOCK-PROP-LIME' LIMIT 1),
  (SELECT u.id FROM real_estate_units u JOIN real_estate_properties p ON u.property_id=p.id WHERE p.code='MOCK-PROP-LIME' AND u.name='B-301' LIMIT 1),
  'Réfection peinture salon — humidité', 'medium', 'in_progress', '2026-05-20', 120000,
  'Traces d''humidité visibles sur le mur sud du salon. Repeindre après séchage. Étanchéité à vérifier. Peintre Manu assigné.',
  NOW(), NOW();

-- Changement serrure (Tour Wagenia)
INSERT IGNORE INTO real_estate_maintenance_requests (property_id, unit_id, title, priority, status, scheduled_date, estimated_cost, description, created_at, updated_at)
SELECT (SELECT id FROM real_estate_properties WHERE code='MOCK-PROP-WAGE' LIMIT 1),
  (SELECT u.id FROM real_estate_units u JOIN real_estate_properties p ON u.property_id=p.id WHERE p.code='MOCK-PROP-WAGE' AND u.name='4ème étage' LIMIT 1),
  'Changement serrure porte d''entrée', 'low', 'open', NULL, 85000,
  'Nouvelle locataire demande changement de serrure pour sécurité. Standard, pas urgent.',
  NOW(), NOW();

-- Remplacement clim (résolu - Tombalbaye)
INSERT IGNORE INTO real_estate_maintenance_requests (property_id, unit_id, title, priority, status, scheduled_date, estimated_cost, description, created_at, updated_at)
SELECT (SELECT id FROM real_estate_properties WHERE code='MOCK-PROP-TOMB' LIMIT 1),
  (SELECT u.id FROM real_estate_units u JOIN real_estate_properties p ON u.property_id=p.id WHERE p.code='MOCK-PROP-TOMB' AND u.name='A-203' LIMIT 1),
  'Remplacement climatiseur salon', 'medium', 'resolved', '2026-05-06', 380000,
  'Clim Samsung 18000 BTU installée le 06/05. Coût total CDF 380,000. Locataire satisfaite.',
  NOW(), NOW();

-- ============= 7. CONTRACTS =============
-- Contrat SIGNÉ - Marie Kabongo
INSERT IGNORE INTO real_estate_contracts (lease_id, status, contract_content, signed_at, tenant_email, tenant_name, sent_at, created_at, updated_at)
SELECT (SELECT id FROM real_estate_leases WHERE reference='MOCK-BAIL-2024-018' LIMIT 1),
  'signed', 'Contrat de bail résidentiel — Résidence Tombalbaye A-203\nDurée : 3 ans (01/03/2024 → 28/02/2027)\nLoyer mensuel : CDF 850,000\nCaution : CDF 1,700,000',
  '2024-03-18 14:32:00', 'marie.kabongo@email.cd', 'Marie Kabongo', '2024-03-15 09:00:00', NOW(), NOW();

-- Contrat SIGNÉ - Christine Tshisekedi
INSERT IGNORE INTO real_estate_contracts (lease_id, status, contract_content, signed_at, tenant_email, tenant_name, sent_at, created_at, updated_at)
SELECT (SELECT id FROM real_estate_leases WHERE reference='MOCK-BAIL-2025-007' LIMIT 1),
  'signed', 'Contrat de bail commercial — Galerie Présidentielle RDC\nDurée : 3 ans\nLoyer : CDF 1,800,000/mois',
  '2025-05-12 10:15:00', 'c.tshisekedi@email.com', 'Christine Tshisekedi', '2025-05-10 16:00:00', NOW(), NOW();

-- Contrat EN ATTENTE SIGNATURE - Sysconnect
INSERT IGNORE INTO real_estate_contracts (lease_id, status, contract_content, signer_token, signer_token_expiry, tenant_email, tenant_name, sent_at, created_at, updated_at)
SELECT (SELECT id FROM real_estate_leases WHERE reference='MOCK-BAIL-2022-009' LIMIT 1),
  'sent', 'Contrat de bail commercial — Tour Wagenia 4ème étage\nRenouvellement 4 ans\nLoyer : CDF 2,400,000/mois',
  'mock-token-sysconnect-renewal-2026', '2026-05-22 23:59:59', 'contact@sysconnect.cd', 'Sysconnect SARL', '2026-05-13 11:30:00', NOW(), NOW();

-- Contrat lien renvoyé - Antoine Kalala
INSERT IGNORE INTO real_estate_contracts (lease_id, status, contract_content, signer_token, signer_token_expiry, tenant_email, tenant_name, sent_at, created_at, updated_at)
SELECT (SELECT id FROM real_estate_leases WHERE reference='MOCK-BAIL-2023-011' LIMIT 1),
  'sent', 'Contrat de bail résidentiel — Villa Ngaliema M-04\nRenouvellement 3 ans à compter du 15/06/2026',
  'mock-token-antoine-renewal-2026', '2026-05-21 23:59:59', 'antoine.k@email.com', 'Antoine Kalala', '2026-05-12 14:00:00', NOW(), NOW();

-- ============= SUMMARY =============
SELECT '=== Seed complete ===' AS status;
SELECT 'customers' AS table_name, COUNT(*) AS total FROM customer WHERE username IN ('marie.kabongo','paul.lumumba','sysconnect.sarl','christine.tshisekedi','jean.bemba','antoine.kalala')
UNION SELECT 'properties', COUNT(*) FROM real_estate_properties WHERE code LIKE 'MOCK-PROP-%'
UNION SELECT 'units', COUNT(*) FROM real_estate_units u JOIN real_estate_properties p ON u.property_id=p.id WHERE p.code LIKE 'MOCK-PROP-%'
UNION SELECT 'leases', COUNT(*) FROM real_estate_leases WHERE reference LIKE 'MOCK-BAIL-%'
UNION SELECT 'rent_payments (mock leases)', COUNT(*) FROM real_estate_rent_payments rp JOIN real_estate_leases l ON rp.lease_id=l.id WHERE l.reference LIKE 'MOCK-BAIL-%'
UNION SELECT 'maintenance (mock props)', COUNT(*) FROM real_estate_maintenance_requests mr JOIN real_estate_properties p ON mr.property_id=p.id WHERE p.code LIKE 'MOCK-PROP-%'
UNION SELECT 'contracts (mock leases)', COUNT(*) FROM real_estate_contracts c JOIN real_estate_leases l ON c.lease_id=l.id WHERE l.reference LIKE 'MOCK-BAIL-%';
