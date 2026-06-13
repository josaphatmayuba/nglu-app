-- ============================================================
-- Migration immobilier legacy -> Domus real_estate_* (GENERE)
-- Cible : nglu_db / conteneur nglu_mysql (DEV LOCAL).
-- Statements AUTONOMES (--> statement-breakpoint, pas de @var) : compatible pipeline.
-- Recablage par cle naturelle : property.code='LEG-<id>', lease.reference, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS legacy_property_map (legacy_id INT PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS legacy_customer_map (legacy_id INT PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS legacy_lease_map (legacy_id INT PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS legacy_unit_map (legacy_property_id INT PRIMARY KEY, new_unit_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
-- === real_estate_properties (19 biens, status legacy=non loue -> available) ===
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'marinel 7', 'LEG-16', 'building', 'available', 'marinel 7', 'kinshasa', 'République démocratique du Congo', 450000, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-16');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 16, id FROM real_estate_properties WHERE code='LEG-16' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=16), 'Principal', 'apartment', 'vacant', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=16);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 16, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=16) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'Betito 17', 'LEG-13', 'building', 'available', 'Betito 17', 'kinshasa', 'République démocratique du Congo', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-13');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 13, id FROM real_estate_properties WHERE code='LEG-13' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=13), 'Principal', 'apartment', 'vacant', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=13);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 13, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=13) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'Betito 17', 'LEG-11', 'building', 'available', 'Betito 17', 'kinshasa', 'République démocratique du Congo', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-11');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 11, id FROM real_estate_properties WHERE code='LEG-11' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=11), 'Principal', 'apartment', 'vacant', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=11);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 11, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=11) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'baboma AP 5', 'LEG-19', 'building', 'occupied', 'baboma AP 5', 'kinshasa', 'République démocratique du Congo', 649999, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-19');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 19, id FROM real_estate_properties WHERE code='LEG-19' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=19), 'Principal', 'apartment', 'occupied', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=19);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 19, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=19) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'mayenge 17', 'LEG-4', 'building', 'occupied', 'mayenge 17', 'kinshasa', 'République démocratique du Congo', 50000, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-4');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 4, id FROM real_estate_properties WHERE code='LEG-4' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=4), 'Principal', 'apartment', 'occupied', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=4);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 4, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=4) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'bateke II 18A', 'LEG-3', 'building', 'occupied', 'bateke II 18A', 'kinshasa', 'République démocratique du Congo', 50000, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-3');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 3, id FROM real_estate_properties WHERE code='LEG-3' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=3), 'Principal', 'apartment', 'occupied', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=3);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 3, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=3) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'Baboma 30D', 'LEG-8', 'building', 'occupied', 'Baboma 30D', 'kinshasa', 'République démocratique du Congo', 350000, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-8');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 8, id FROM real_estate_properties WHERE code='LEG-8' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=8), 'Principal', 'apartment', 'occupied', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=8);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 8, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=8) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'baboma 30/D', 'LEG-9', 'building', 'occupied', 'baboma 30/D', 'kinshasa', 'République démocratique du Congo', 150000, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-9');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 9, id FROM real_estate_properties WHERE code='LEG-9' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=9), 'Principal', 'apartment', 'occupied', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=9);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 9, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=9) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'Baboma 30D', 'LEG-5', 'building', 'occupied', 'Baboma 30D', 'kinshasa', 'République démocratique du Congo', 100, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-5');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 5, id FROM real_estate_properties WHERE code='LEG-5' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=5), 'Principal', 'apartment', 'occupied', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=5);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 5, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=5) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'bateke II 18 A', 'LEG-7', 'building', 'available', 'bateke II 18 A', 'kinshasa', 'République démocratique du Congo', 300000, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-7');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 7, id FROM real_estate_properties WHERE code='LEG-7' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=7), 'Principal', 'apartment', 'vacant', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=7);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 7, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=7) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'Baboma 30 D AP 4', 'LEG-15', 'building', 'available', 'Baboma 30 D AP 4', 'kinshasa', 'République démocratique du Congo', 420000, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-15');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 15, id FROM real_estate_properties WHERE code='LEG-15' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=15), 'Principal', 'apartment', 'vacant', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=15);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 15, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=15) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'Betito 17 AP 3', 'LEG-18', 'building', 'available', 'Betito 17 AP 3', 'kinshasa', 'République démocratique du Congo', 450000, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-18');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 18, id FROM real_estate_properties WHERE code='LEG-18' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=18), 'Principal', 'apartment', 'vacant', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=18);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 18, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=18) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'avenue muenga  5', 'LEG-6', 'building', 'available', 'avenue muenga  5', 'kinshasa', 'République démocratique du Congo', 30000, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-6');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 6, id FROM real_estate_properties WHERE code='LEG-6' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=6), 'Principal', 'apartment', 'vacant', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=6);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 6, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=6) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'kinkole 13/Muengue', 'LEG-17', 'house', 'available', 'kinkole 13/Muengue', 'kinshasa', 'République démocratique du Congo', 650000, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-17');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 17, id FROM real_estate_properties WHERE code='LEG-17' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=17), 'Principal', 'house', 'vacant', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=17);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 17, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=17) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'Betito 17', 'LEG-10', 'building', 'available', 'Betito 17', 'kinshasa', 'République démocratique du Congo', 340000, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-10');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 10, id FROM real_estate_properties WHERE code='LEG-10' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=10), 'Principal', 'apartment', 'vacant', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=10);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 10, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=10) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'Baboma 30D/7', 'LEG-20', 'building', 'available', 'Baboma 30D/7', 'kinshasa', 'République démocratique du Congo', 44999, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-20');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 20, id FROM real_estate_properties WHERE code='LEG-20' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=20), 'Principal', 'apartment', 'vacant', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=20);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 20, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=20) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'avenue betito 17', 'LEG-2', 'building', 'available', 'avenue betito 17', 'kinshasa', 'République démocratique du Congo', 50000, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-2');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 2, id FROM real_estate_properties WHERE code='LEG-2' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=2), 'Principal', 'apartment', 'vacant', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=2);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 2, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=2) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'Betito 17', 'LEG-12', 'building', 'available', 'Betito 17', 'kinshasa', 'République démocratique du Congo', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-12');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 12, id FROM real_estate_properties WHERE code='LEG-12' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=12), 'Principal', 'apartment', 'vacant', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=12);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 12, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=12) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint
INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) SELECT 1, 'Betito 17', 'LEG-14', 'building', 'available', 'Betito 17', 'kinshasa', 'République démocratique du Congo', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code='LEG-14');
--> statement-breakpoint
INSERT INTO legacy_property_map (legacy_id, new_id) SELECT 14, id FROM real_estate_properties WHERE code='LEG-14' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id=14), 'Principal', 'apartment', 'vacant', 0, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 1, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id=14);
--> statement-breakpoint
INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) SELECT 14, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id=14) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);
--> statement-breakpoint

-- === customer + tenant_details (19) ===
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'benel', 'muke', 'legacy-cust-3', '243824704604', 'muke1@gmail.com', '0', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-3');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 3, id FROM customer WHERE username='legacy-cust-3' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=3), '1996-12-18', 'M', 'congolaise', 'celibataire', 'kuilu', 'aurore babaya 0829119292', '243824704604', 'employé', 'informaticien', 'ministère du numérique ', 'boulevard tsatsi numéro 7 et 8', '2021-07-01', 'CDI', 748.614, '0', '0', 'non mentionné', 4, 0, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=3) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=3));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'desire', 'kabeya', 'legacy-cust-4', '243818994066', 'desirekama@gmail.com', '5av; l''école :q/jolie parc; c: ngaliema', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-4');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 4, id FROM customer WHERE username='legacy-cust-4' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=4), '1969-09-09', 'M', 'congolaise ', 'divorcé', 'sud-kivu', 'Mr christian mahamba 0854883500', '243819162287', 'employé', 'departement de transport ', 'monusco', '12 av des aviateurs /com:gombe', '2002-07-01', 'CDD', 1200, '5av; l''école :q/jolie parc; c: ngaliema', 'mr misenga', 'petite espace ,une longue distance a l''école des enfants ', 9, 6, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=4) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=4));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'bokili', 'boka', 'legacy-cust-5', '243895183341', 'bakaboli@gmail.com', 'boboli 49/bis/com: ngaliema', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-5');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 5, id FROM customer WHERE username='legacy-cust-5' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=5), '1989-04-19', 'M', 'congolaise ', 'divorcé', 'kongo central', 'non mentionné ', '243897243619', 'employé', 'medecin', 'hopital de refence vijama', 'bukama 280', '2018-04-05', 'CDI', 1428, 'boboli 49/bis/com: ngaliema', 'ombala oleko', 'personnels ', 3, 1, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=5) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=5));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'jessica', 'Ikombola', 'legacy-cust-6', '243895629442', 'jessicaikombola2017@gmail.com', 'non mentionné ', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-6');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 6, id FROM customer WHERE username='legacy-cust-6' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=6), '1991-10-17', 'F', 'congolaise ', 'celibataire', 'equateur/tshuapa', 'fanny 0906649923', '243819688886', 'employeur', 'shop', 'Exoucia', 'baboma 30d/com: matete', '2018-07-04', 'Indépendant', 0, 'non mentionné ', 'non mentionné ', 'non mentionné ', 0, 0, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=6) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=6));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'papy', 'kalonda', 'legacy-cust-7', '243815296708', 'papyfundji@gmail.com', 'non mentionné ', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-7');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 7, id FROM customer WHERE username='legacy-cust-7' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=7), '1982-07-07', 'M', 'congolaise ', 'divorcé', 'sankuru', 'josiane kabambi misengabo 0998115521', '243815296708', 'employeur', 'tout travaux ', 'privé ', 'kimbanseke', '2015-07-15', 'Indépendant', 0, 'non mentionné ', 'non mentionné ', 'non mentionné ', 6, 4, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=7) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=7));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'syntiche', 'Lendo', 'legacy-cust-8', '243855349746', 'syntichechrist@gmail', 'non mentionné ', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-8');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 8, id FROM customer WHERE username='legacy-cust-8' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=8), '1986-06-15', 'F', 'congolaise ', 'divorcé', 'kongo central ', 'non mentionné ', '243858221112', 'employeur', 'menagère', 'non mentionné ', 'non mentionné ', '2014-08-05', 'Indépendant', 0, 'non mentionné ', 'non mentionné ', 'non mentionné ', 5, 2, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=8) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=8));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'papy', 'Nganga', 'legacy-cust-9', '243859261891', 'non mentionné ', 'non mentionné ', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-9');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 9, id FROM customer WHERE username='legacy-cust-9' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=9), '1977-09-07', 'M', 'congolaise ', 'divorcé', 'kongo central ', 'jurus', '243904209442', 'employé', 'agent collaborateur', 'Fonction publique ', 'non mentionné ', '2021-08-10', 'CDI', 200.000, 'non mentionné ', 'non mentionné ', 'non mentionné ', 6, 5, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=9) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=9));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'carine', 'Ndenge', 'legacy-cust-14', '243998162016', 'ndenge1@gmail.com', 'non mentionné ', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-14');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 14, id FROM customer WHERE username='legacy-cust-14' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=14), '1980-06-03', 'F', 'congolaise ', 'divorcé', 'luvangao', 'makenda irene 0897214114', '243819930767', 'employeur', 'restaurant ', 'maman la grace', 'baboma 30/D/C: commune', '2018-08-01', 'Indépendant', 0, 'non mentionné ', 'non mentionné ', 'non mentionné ', 3, 2, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=14) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=14));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'egide', 'Limbila', 'legacy-cust-15', '243900011547', 'limbila1a@gmail.com', 'pas d''adresse', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-15');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 15, id FROM customer WHERE username='legacy-cust-15' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=15), '1970-09-05', 'M', 'congolaise', 'divorcé', 'equateur', 'Mr arlico limbila 0823087599', '243903432746', 'employé', 'service interieur', 'service interieur', 'parquet kalamu', '1990-08-08', 'CDI', 250, 'pas d''adresse', 'pas d''adresse', 'Personnel', 4, 2, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=15) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=15));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'ines', 'Nsieme', 'legacy-cust-16', '243829813204', 'inesieme@gmail.com', 'non mentionné', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-16');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 16, id FROM customer WHERE username='legacy-cust-16' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=16), '2022-09-06', 'M', 'congolaise ', 'divorcé', 'kongo central ', 'non mentionné', '243822477112', 'employeur', 'carrelaire', 'construction', 'terrain', '2010-08-01', 'Indépendant', 0, 'non mentionné', 'non mentionné', 'personnel', 4, 1, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=16) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=16));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'marceline', 'ekoya', 'legacy-cust-17', '243904675763', 'ekoya1@gmail.com', 'Non mentionné', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-17');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 17, id FROM customer WHERE username='legacy-cust-17' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=17), '1955-09-19', 'F', 'congolaise', 'celibataire', 'Maii-ndombe', 'mpungusu ben-j/0904189922', '243666666666', 'employé', 'non mentionné', 'pas d''emploi', 'pas d''emploi', '2022-05-01', 'Indépendant', 0, 'Non mentionné', 'non existant', 'personnels', 4, 0, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=17) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=17));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'horty', 'MUNGU', 'legacy-cust-18', '243823910095097', 'horly1@gmail.com', 'limeté 17 eme rue industrielle ', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-18');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 18, id FROM customer WHERE username='legacy-cust-18' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=18), '1977-06-06', 'F', 'congolaise ', 'divorcé', 'Ituri', 'sephora pliantourasse', '243823910095', 'employé', 'commerce ', 'boutique horty', 'non déterminé', '2012-08-05', 'Indépendant', 250, 'limeté 17 eme rue industrielle ', 'cité de triomphe ', 'raison de confidentialité', 3, 0, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=18) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=18));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'prisca', 'Bitota', 'legacy-cust-19', '243823339194', 'ngoieprisca@gmail.com', '7 eme rue limeté industriel num 3: av; mont carmel', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-19');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 19, id FROM customer WHERE username='legacy-cust-19' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=19), '1995-10-13', 'F', 'congolaise ', 'marié', 'lomami', 'glodie bavueza 0814820622', '243815104869', 'employé', 'assistante technique', 'CENI', 'boulevard /gombe', '2022-12-01', 'CDD', 2000, '7 eme rue limeté industriel num 3: av; mont carmel', 'non mentionné ', 'manque d''electricité', 4, 1, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=19) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=19));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, '', 'ONGD NGOLU', 'legacy-cust-21', '+243895266381', 'infos@ongdngolu.org', NULL, '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-21');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 21, id FROM customer WHERE username='legacy-cust-21' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=21), '1970-01-01', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', '+243895266381', 'N/A', 'N/A', 'N/A', 'N/A', '1970-01-01', 'N/A', 0, 'N/A', 'N/A', 'N/A', 1, 0, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=21) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=21));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'rody', 'bikindu', 'legacy-cust-2', '243812256157', 'bikindu1@gmail.com', 'av:de l''école,q:musey/c; ngaliema/brikin', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-2');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 2, id FROM customer WHERE username='legacy-cust-2' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=2), '1988-07-29', 'M', 'congolais', 'marié', 'kongo centrale', 'mr bikindu', '243821146984', 'employé', 'fonctionnaire', 'onatra', 'port bith ngobila, gombe', '2020-11-05', 'CDD', 1, 'av:de l''école,q:musey/c; ngaliema/brikin', 'aimee fika', 'difficulté de transport, distance, pénurie d''eau, coupure électricité.', 6, 3, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=2) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=2));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'Franck', 'MANWANA', 'legacy-cust-20', '243899619190', 'franckmanwana089@gmail.com', 'selembao/ngafani /av: kasa-vubu ', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-20');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 20, id FROM customer WHERE username='legacy-cust-20' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=20), '1979-01-08', 'M', 'congolaise', 'marié', 'kwilu', 'Patrick manwana 0818743400', '243810628860', 'employeur', 'informatiques ', 'HTSC', 'kitambo:av boboliko 1', '2021-08-01', 'Indépendant', 3000, 'selembao/ngafani /av: kasa-vubu ', 'Ida', 'personnels', 6, 4, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=20) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=20));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, '', 'ONGD NGOLU ASBL', 'legacy-cust-26', '+895266381', 'info@ongdngolu.com', NULL, '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-26');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 26, id FROM customer WHERE username='legacy-cust-26' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=26), '1970-01-01', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', '+895266381', 'N/A', 'N/A', 'N/A', 'N/A', '1970-01-01', 'N/A', 0, 'N/A', 'N/A', 'N/A', 1, 0, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=26) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=26));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'Jovitha', 'Nzita makolwa', 'legacy-cust-28', '243907567551', 'jovithamakolwa@gmail.com', 'Avenue Awel /GB', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-28');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 28, id FROM customer WHERE username='legacy-cust-28' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=28), '1985-01-12', 'F', 'Congolaise', 'marié', 'Bakongo', 'Tonayi makolwa 0822628208', '243815260888', 'employeur', 'commerce ', 'jovitha boutique ', 'bandal/ Betito', '2021-08-01', 'Indépendant', 0, 'Avenue Awel /GB', 'Odette', 'confidentiel', 6, 4, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=28) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=28));
--> statement-breakpoint
INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) SELECT 1, 'Belise ', 'OKONDA', 'legacy-cust-27', '+243810000377', 'beliseokonda@gmail.com', 'non confirmer', '!migrated-no-login!', 3, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username='legacy-cust-27');
--> statement-breakpoint
INSERT INTO legacy_customer_map (legacy_id, new_id) SELECT 27, id FROM customer WHERE username='legacy-cust-27' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) SELECT (SELECT new_id FROM legacy_customer_map WHERE legacy_id=27), '1970-01-01', 'F', 'congolaise', 'celibataire', 'N/A', 'parrent', '+undefined', 'employé', 'non confirmer', 'hotel de ville', 'hotel de ville de kinshasa', '1970-01-01', 'CDD', 0, 'non confirmer', 'non confirmer', 'location', 1, 0, NOW() FROM DUAL WHERE (SELECT new_id FROM legacy_customer_map WHERE legacy_id=27) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id=(SELECT new_id FROM legacy_customer_map WHERE legacy_id=27));
--> statement-breakpoint

-- === real_estate_leases (6 baux actifs, tous expires) ===
INSERT INTO real_estate_leases (organization_id, reference, property_id, unit_id, tenant_id, start_date, end_date, billing_cycle, rent_amount, currency_id, status, created_at) SELECT 1, 'LEG-BAIL-8', (SELECT new_id FROM legacy_property_map WHERE legacy_id=4), (SELECT new_unit_id FROM legacy_unit_map WHERE legacy_property_id=4), (SELECT new_id FROM legacy_customer_map WHERE legacy_id=8), '2023-01-01', '2024-01-02', 'monthly', 350, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 'expired', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_leases WHERE reference='LEG-BAIL-8');
--> statement-breakpoint
INSERT INTO legacy_lease_map (legacy_id, new_id) SELECT 8, id FROM real_estate_leases WHERE reference='LEG-BAIL-8' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_leases (organization_id, reference, property_id, unit_id, tenant_id, start_date, end_date, billing_cycle, rent_amount, currency_id, status, created_at) SELECT 1, 'LEG-BAIL-9', (SELECT new_id FROM legacy_property_map WHERE legacy_id=5), (SELECT new_unit_id FROM legacy_unit_map WHERE legacy_property_id=5), (SELECT new_id FROM legacy_customer_map WHERE legacy_id=9), '2023-01-01', '2024-07-30', 'monthly', 120, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 'expired', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_leases WHERE reference='LEG-BAIL-9');
--> statement-breakpoint
INSERT INTO legacy_lease_map (legacy_id, new_id) SELECT 9, id FROM real_estate_leases WHERE reference='LEG-BAIL-9' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_leases (organization_id, reference, property_id, unit_id, tenant_id, start_date, end_date, billing_cycle, rent_amount, currency_id, status, created_at) SELECT 1, 'LEG-BAIL-11', (SELECT new_id FROM legacy_property_map WHERE legacy_id=3), (SELECT new_unit_id FROM legacy_unit_map WHERE legacy_property_id=3), (SELECT new_id FROM legacy_customer_map WHERE legacy_id=16), '2023-01-05', '2024-11-01', 'monthly', 100, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 'expired', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_leases WHERE reference='LEG-BAIL-11');
--> statement-breakpoint
INSERT INTO legacy_lease_map (legacy_id, new_id) SELECT 11, id FROM real_estate_leases WHERE reference='LEG-BAIL-11' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_leases (organization_id, reference, property_id, unit_id, tenant_id, start_date, end_date, billing_cycle, rent_amount, currency_id, status, created_at) SELECT 1, 'LEG-BAIL-12', (SELECT new_id FROM legacy_property_map WHERE legacy_id=8), (SELECT new_unit_id FROM legacy_unit_map WHERE legacy_property_id=8), (SELECT new_id FROM legacy_customer_map WHERE legacy_id=14), '2022-01-01', '2024-08-01', 'monthly', 80, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 'expired', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_leases WHERE reference='LEG-BAIL-12');
--> statement-breakpoint
INSERT INTO legacy_lease_map (legacy_id, new_id) SELECT 12, id FROM real_estate_leases WHERE reference='LEG-BAIL-12' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_leases (organization_id, reference, property_id, unit_id, tenant_id, start_date, end_date, billing_cycle, rent_amount, currency_id, status, created_at) SELECT 1, 'LEG-BAIL-19', (SELECT new_id FROM legacy_property_map WHERE legacy_id=9), (SELECT new_unit_id FROM legacy_unit_map WHERE legacy_property_id=9), (SELECT new_id FROM legacy_customer_map WHERE legacy_id=6), '2023-08-15', '2024-08-13', 'monthly', 120, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 'expired', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_leases WHERE reference='LEG-BAIL-19');
--> statement-breakpoint
INSERT INTO legacy_lease_map (legacy_id, new_id) SELECT 19, id FROM real_estate_leases WHERE reference='LEG-BAIL-19' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO real_estate_leases (organization_id, reference, property_id, unit_id, tenant_id, start_date, end_date, billing_cycle, rent_amount, currency_id, status, created_at) SELECT 1, 'LEG-BAIL-23', (SELECT new_id FROM legacy_property_map WHERE legacy_id=19), (SELECT new_unit_id FROM legacy_unit_map WHERE legacy_property_id=19), (SELECT new_id FROM legacy_customer_map WHERE legacy_id=7), '2022-01-01', '2023-12-31', 'monthly', 160, (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), 'expired', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_leases WHERE reference='LEG-BAIL-23');
--> statement-breakpoint
INSERT INTO legacy_lease_map (legacy_id, new_id) SELECT 23, id FROM real_estate_leases WHERE reference='LEG-BAIL-23' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint

-- === real_estate_rent_payments (15 paiements reels sur 122 echeances des baux actifs) ===
-- Seuls les payment>0 (encaissements reels). Les echeances vides = regenerees par l'app.
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=8), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-09-11', 350, 'cash', 'legacy-rp-31', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-31');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=12), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-09-07', 80, 'cash', 'legacy-rp-117', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-117');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=23), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-08-18', 160, 'cash', 'legacy-rp-338', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-338');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=19), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-10-23', 120, 'cash', 'legacy-rp-264', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-264');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=9), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-10-12', 120, 'cash', 'legacy-rp-45', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-45');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=8), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-10-12', 350, 'cash', 'legacy-rp-32', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-32');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=8), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-08-15', 350, 'cash', 'legacy-rp-30', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-30');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=12), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-10-12', 80, 'cash', 'legacy-rp-118', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-118');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=12), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-08-15', 80, 'cash', 'legacy-rp-116', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-116');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=19), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-08-16', 120, 'cash', 'legacy-rp-262', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-262');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=19), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-09-07', 120, 'cash', 'legacy-rp-263', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-263');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=23), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-09-15', 160, 'cash', 'legacy-rp-339', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-339');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=9), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-09-07', 120, 'cash', 'legacy-rp-44', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-44');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=11), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-09-11', 100, 'cash', 'legacy-rp-83', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-83');
--> statement-breakpoint
INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id=23), (SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1), '2023-10-23', 160, 'cash', 'legacy-rp-340', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference='legacy-rp-340');
--> statement-breakpoint

