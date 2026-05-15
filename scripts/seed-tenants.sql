-- ============================================================
-- Seed 8 new tenants with full tenant_details profile
-- Idempotent: INSERT IGNORE on customer.username (unique-ish)
-- Run via: docker exec -i <mysql_container> mysql -u<user> -p<pw> <db> < this.sql
-- ============================================================

-- ─── 1. CUSTOMER (base identity) ────────────────────────────
INSERT IGNORE INTO customer (firstName, lastName, username, email, phone, address, password, roleId, status, created_at, updated_at) VALUES
('Joseph',  'Mukendi',   'joseph.mukendi',   'joseph.mukendi@email.cd',   '+243 815 111 222', '12 Av. Kasavubu, Kalamu',            '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW()),
('Sarah',   'Mwamba',    'sarah.mwamba',     'sarah.mwamba@email.cd',     '+243 821 333 444', '34 Av. Kabasele, Lingwala',          '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW()),
('David',   'Ilunga',    'david.ilunga',     'david.ilunga@email.cd',     '+243 999 555 666', '7 Av. Croix-Rouge, Barumbu',         '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW()),
('Esther',  'Mbuyi',     'esther.mbuyi',     'esther.mbuyi@email.cd',     '+243 818 777 888', '21 Av. de la Justice, Gombe',        '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW()),
('Patrick', 'Mutombo',   'patrick.mutombo',  'patrick.mutombo@email.cd',  '+243 815 999 000', '5 Bd Triomphal, Kasa-Vubu',          '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW()),
('Aimee',   'Nzuzi',     'aimee.nzuzi',      'aimee.nzuzi@email.cd',      '+243 821 222 333', '18 Av. Nyangwe, Bandalungwa',        '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW()),
('Eric',    'Kasongo',   'eric.kasongo',     'eric.kasongo@email.cd',     '+243 999 444 555', '9 Av. Kabambare, Limete',            '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW()),
('Grace',   'Tshibanda', 'grace.tshibanda',  'grace.tshibanda@email.cd',  '+243 818 666 777', '27 Av. Université, Lemba',           '$2b$10$mockpasswordhashforseedingxxxxxxxxxxxxxxxxxxxxxxxxxx', 3, 'true', NOW(), NOW());

-- ─── 2. TENANT_DETAILS (full tenant profile) ────────────────
INSERT IGNORE INTO tenant_details
  (customer_id, birth_date, sex, nationality, marital_status, origin_province,
   contacted_person, contacted_person_phone_number,
   prossional_status, main_activity, entity_name, entity_address,
   hiring_date, contract_type, monthly_pay, other_monthly_income,
   old_address, old_lessor, moving_reason, occupant_number, child_number,
   created_at, updated_at)
SELECT id, '1985-04-12', 'M', 'Congolaise', 'marié', 'Kasaï Oriental',
       'Mama Joséphine Mukendi', '+243 812 100 200',
       'Salarié', 'Ingénieur Réseaux', 'Vodacom Congo', 'Bd du 30 Juin, Gombe',
       '2019-06-01', 'CDI', 1850000, 350000,
       'Quartier Selembao, Av. de l''Avenir', 'M. Kazadi', 'Rapprochement travail', 4, 2,
       NOW(), NOW()
FROM customer WHERE username = 'joseph.mukendi'
  AND NOT EXISTS (SELECT 1 FROM tenant_details td WHERE td.customer_id = customer.id);

INSERT IGNORE INTO tenant_details
  (customer_id, birth_date, sex, nationality, marital_status, origin_province,
   contacted_person, contacted_person_phone_number,
   prossional_status, main_activity, entity_name, entity_address,
   hiring_date, contract_type, monthly_pay, other_monthly_income,
   old_address, old_lessor, moving_reason, occupant_number, child_number,
   created_at, updated_at)
SELECT id, '1990-09-25', 'F', 'Congolaise', 'célibataire', 'Kinshasa',
       'Dr. Patrick Mwamba', '+243 815 250 350',
       'Salariée', 'Médecin généraliste', 'Hôpital Général de Kinshasa', 'Av. de l''Hôpital, Lingwala',
       '2018-03-15', 'CDI', 2200000, 0,
       'Av. Kasangulu, Limete', 'Mme. Tshibola', 'Loyer plus abordable', 2, 0,
       NOW(), NOW()
FROM customer WHERE username = 'sarah.mwamba'
  AND NOT EXISTS (SELECT 1 FROM tenant_details td WHERE td.customer_id = customer.id);

INSERT IGNORE INTO tenant_details
  (customer_id, birth_date, sex, nationality, marital_status, origin_province,
   contacted_person, contacted_person_phone_number,
   prossional_status, main_activity, entity_name, entity_address,
   hiring_date, contract_type, monthly_pay, other_monthly_income,
   old_address, old_lessor, moving_reason, occupant_number, child_number,
   created_at, updated_at)
SELECT id, '1982-11-08', 'M', 'Congolaise', 'marié', 'Haut-Katanga',
       'Mme. Marthe Ilunga', '+243 818 400 500',
       'Salarié', 'Comptable senior', 'Banque Commerciale du Congo (BCDC)', 'Av. Loma, Gombe',
       '2015-08-20', 'CDI', 1750000, 200000,
       'Quartier Salongo Nord', 'M. Kabasele', 'Logement trop petit', 5, 3,
       NOW(), NOW()
FROM customer WHERE username = 'david.ilunga'
  AND NOT EXISTS (SELECT 1 FROM tenant_details td WHERE td.customer_id = customer.id);

INSERT IGNORE INTO tenant_details
  (customer_id, birth_date, sex, nationality, marital_status, origin_province,
   contacted_person, contacted_person_phone_number,
   prossional_status, main_activity, entity_name, entity_address,
   hiring_date, contract_type, monthly_pay, other_monthly_income,
   old_address, old_lessor, moving_reason, occupant_number, child_number,
   created_at, updated_at)
SELECT id, '1988-02-18', 'F', 'Congolaise', 'divorcé', 'Nord-Kivu',
       'M. Bernard Mbuyi', '+243 999 600 700',
       'Salariée', 'Professeure secondaire', 'Lycée Bosangani', 'Av. de l''Université, Lemba',
       '2014-09-01', 'CDI', 1100000, 150000,
       'Av. du Commerce, Kintambo', 'M. Lukoji', 'Sécurité du quartier', 3, 2,
       NOW(), NOW()
FROM customer WHERE username = 'esther.mbuyi'
  AND NOT EXISTS (SELECT 1 FROM tenant_details td WHERE td.customer_id = customer.id);

INSERT IGNORE INTO tenant_details
  (customer_id, birth_date, sex, nationality, marital_status, origin_province,
   contacted_person, contacted_person_phone_number,
   prossional_status, main_activity, entity_name, entity_address,
   hiring_date, contract_type, monthly_pay, other_monthly_income,
   old_address, old_lessor, moving_reason, occupant_number, child_number,
   created_at, updated_at)
SELECT id, '1979-07-30', 'M', 'Congolaise', 'marié', 'Sud-Kivu',
       'Mme. Christine Mutombo', '+243 821 800 900',
       'Indépendant', 'Commerçant import-export', 'Mutombo Trading SARL', 'Marché central, Kinshasa',
       '2010-01-15', 'Autoentreprise', 3500000, 800000,
       'Quartier Matete', 'M. Bahizire', 'Agrandissement famille', 6, 4,
       NOW(), NOW()
FROM customer WHERE username = 'patrick.mutombo'
  AND NOT EXISTS (SELECT 1 FROM tenant_details td WHERE td.customer_id = customer.id);

INSERT IGNORE INTO tenant_details
  (customer_id, birth_date, sex, nationality, marital_status, origin_province,
   contacted_person, contacted_person_phone_number,
   prossional_status, main_activity, entity_name, entity_address,
   hiring_date, contract_type, monthly_pay, other_monthly_income,
   old_address, old_lessor, moving_reason, occupant_number, child_number,
   created_at, updated_at)
SELECT id, '1992-12-05', 'F', 'Congolaise', 'célibataire', 'Kongo Central',
       'Mme. Béatrice Nzuzi', '+243 815 010 020',
       'Salariée', 'Infirmière diplômée', 'Clinique Ngaliema', 'Av. des Cliniques, Ngaliema',
       '2017-04-10', 'CDI', 950000, 100000,
       'Quartier Mfumu Vata', 'M. Mavoungou', 'Premier logement indépendant', 1, 0,
       NOW(), NOW()
FROM customer WHERE username = 'aimee.nzuzi'
  AND NOT EXISTS (SELECT 1 FROM tenant_details td WHERE td.customer_id = customer.id);

INSERT IGNORE INTO tenant_details
  (customer_id, birth_date, sex, nationality, marital_status, origin_province,
   contacted_person, contacted_person_phone_number,
   prossional_status, main_activity, entity_name, entity_address,
   hiring_date, contract_type, monthly_pay, other_monthly_income,
   old_address, old_lessor, moving_reason, occupant_number, child_number,
   created_at, updated_at)
SELECT id, '1986-05-22', 'M', 'Congolaise', 'conjoint de fait', 'Kasaï Central',
       'Mlle. Nathalie Mwadi', '+243 818 030 040',
       'Salarié', 'Électricien industriel', 'SNEL', 'Av. Wagenia, Gombe',
       '2016-11-01', 'CDI', 1300000, 250000,
       'Quartier Yolo Nord', 'Mme. Kalonji', 'Plus proche du travail', 3, 1,
       NOW(), NOW()
FROM customer WHERE username = 'eric.kasongo'
  AND NOT EXISTS (SELECT 1 FROM tenant_details td WHERE td.customer_id = customer.id);

INSERT IGNORE INTO tenant_details
  (customer_id, birth_date, sex, nationality, marital_status, origin_province,
   contacted_person, contacted_person_phone_number,
   prossional_status, main_activity, entity_name, entity_address,
   hiring_date, contract_type, monthly_pay, other_monthly_income,
   old_address, old_lessor, moving_reason, occupant_number, child_number,
   created_at, updated_at)
SELECT id, '1984-08-14', 'F', 'Congolaise', 'marié', 'Lualaba',
       'M. Jean-Claude Tshibanda', '+243 999 050 060',
       'Indépendante', 'Avocate au Barreau', 'Cabinet Tshibanda & Associés', 'Av. de la Justice, Gombe',
       '2013-02-01', 'Profession libérale', 2800000, 500000,
       'Av. Bandundu, Lemba', 'M. Mokonzi', 'Quartier plus calme', 4, 2,
       NOW(), NOW()
FROM customer WHERE username = 'grace.tshibanda'
  AND NOT EXISTS (SELECT 1 FROM tenant_details td WHERE td.customer_id = customer.id);

-- ─── Verification ─────────────────────────────────────────
SELECT
  c.id, c.firstName, c.lastName, c.username, c.phone,
  td.prossional_status, td.main_activity, td.monthly_pay
FROM customer c
LEFT JOIN tenant_details td ON td.customer_id = c.id
WHERE c.username IN (
  'joseph.mukendi','sarah.mwamba','david.ilunga','esther.mbuyi',
  'patrick.mutombo','aimee.nzuzi','eric.kasongo','grace.tshibanda'
)
ORDER BY c.id;
