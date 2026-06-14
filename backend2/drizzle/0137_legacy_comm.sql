-- ============================================================
-- Migration commercial legacy -> nglu-app (GENERE)
-- Statements AUTONOMES (--> statement-breakpoint, pas de @var). Recablage par cle
-- naturelle : product.sku='LEG-PROD-<id>', category/supplier par nom. Idempotent.
-- ============================================================
CREATE TABLE IF NOT EXISTS legacy_category_map (legacy_id INT PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS legacy_subcategory_map (legacy_id INT PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS legacy_product_map (legacy_id INT PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS legacy_supplier_map (legacy_id INT PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
-- === productCategory + 1 productSubCategory par categorie (5) ===
INSERT INTO productCategory (name, created_at) SELECT 'construction', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM productCategory WHERE name='construction');
--> statement-breakpoint
INSERT INTO legacy_category_map (legacy_id, new_id) SELECT 1, id FROM productCategory WHERE name='construction' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO productSubCategory (name, productCategoryId, status, created_at) SELECT 'construction', (SELECT new_id FROM legacy_category_map WHERE legacy_id=1), 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_subcategory_map WHERE legacy_id=1);
--> statement-breakpoint
INSERT INTO legacy_subcategory_map (legacy_id, new_id) SELECT 1, id FROM productSubCategory WHERE productCategoryId=(SELECT new_id FROM legacy_category_map WHERE legacy_id=1) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO productCategory (name, created_at) SELECT 'plantes sacles et en vie', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM productCategory WHERE name='plantes sacles et en vie');
--> statement-breakpoint
INSERT INTO legacy_category_map (legacy_id, new_id) SELECT 2, id FROM productCategory WHERE name='plantes sacles et en vie' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO productSubCategory (name, productCategoryId, status, created_at) SELECT 'plantes sacles et en vie', (SELECT new_id FROM legacy_category_map WHERE legacy_id=2), 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_subcategory_map WHERE legacy_id=2);
--> statement-breakpoint
INSERT INTO legacy_subcategory_map (legacy_id, new_id) SELECT 2, id FROM productSubCategory WHERE productCategoryId=(SELECT new_id FROM legacy_category_map WHERE legacy_id=2) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO productCategory (name, created_at) SELECT 'alimentaire', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM productCategory WHERE name='alimentaire');
--> statement-breakpoint
INSERT INTO legacy_category_map (legacy_id, new_id) SELECT 3, id FROM productCategory WHERE name='alimentaire' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO productSubCategory (name, productCategoryId, status, created_at) SELECT 'alimentaire', (SELECT new_id FROM legacy_category_map WHERE legacy_id=3), 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_subcategory_map WHERE legacy_id=3);
--> statement-breakpoint
INSERT INTO legacy_subcategory_map (legacy_id, new_id) SELECT 3, id FROM productSubCategory WHERE productCategoryId=(SELECT new_id FROM legacy_category_map WHERE legacy_id=3) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO productCategory (name, created_at) SELECT 'Camion poids lourd', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM productCategory WHERE name='Camion poids lourd');
--> statement-breakpoint
INSERT INTO legacy_category_map (legacy_id, new_id) SELECT 4, id FROM productCategory WHERE name='Camion poids lourd' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO productSubCategory (name, productCategoryId, status, created_at) SELECT 'Camion poids lourd', (SELECT new_id FROM legacy_category_map WHERE legacy_id=4), 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_subcategory_map WHERE legacy_id=4);
--> statement-breakpoint
INSERT INTO legacy_subcategory_map (legacy_id, new_id) SELECT 4, id FROM productSubCategory WHERE productCategoryId=(SELECT new_id FROM legacy_category_map WHERE legacy_id=4) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO productCategory (name, created_at) SELECT 'Animal', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM productCategory WHERE name='Animal');
--> statement-breakpoint
INSERT INTO legacy_category_map (legacy_id, new_id) SELECT 5, id FROM productCategory WHERE name='Animal' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO productSubCategory (name, productCategoryId, status, created_at) SELECT 'Animal', (SELECT new_id FROM legacy_category_map WHERE legacy_id=5), 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_subcategory_map WHERE legacy_id=5);
--> statement-breakpoint
INSERT INTO legacy_subcategory_map (legacy_id, new_id) SELECT 5, id FROM productSubCategory WHERE productCategoryId=(SELECT new_id FROM legacy_category_map WHERE legacy_id=5) ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint

-- === product (24 actifs) ===
-- sku force a 'LEG-PROD-<id>' : cle naturelle unique pour le recablage (les sku
-- legacy sont peu fiables/absents). Idempotent par ce sku.
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'bloc pleins', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-1', 2786, 3.2, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-1');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 1, id FROM product WHERE sku='LEG-PROD-1' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'bloc creux', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=1), 'LEG-PROD-2', 10929, 1.1, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-2');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 2, id FROM product WHERE sku='LEG-PROD-2' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'agrumes', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-3', 701, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-3');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 3, id FROM product WHERE sku='LEG-PROD-3' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'safoutiers', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-5', 286, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-5');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 5, id FROM product WHERE sku='LEG-PROD-5' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'coeur de beoufs', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-6', 199, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-6');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 6, id FROM product WHERE sku='LEG-PROD-6' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'mangoustants', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-8', 63, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-8');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 8, id FROM product WHERE sku='LEG-PROD-8' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'bananiers anviens rejets', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-9', 48, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-9');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 9, id FROM product WHERE sku='LEG-PROD-9' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'bananiers nauveaux rejets', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-10', 13, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-10');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 10, id FROM product WHERE sku='LEG-PROD-10' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'avocatiers', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-11', 3, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-11');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 11, id FROM product WHERE sku='LEG-PROD-11' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'manguiers', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-12', 9, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-12');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 12, id FROM product WHERE sku='LEG-PROD-12' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'papayers', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-7', 107, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-7');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 7, id FROM product WHERE sku='LEG-PROD-7' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'pomme rouge', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-13', 0, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-13');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 13, id FROM product WHERE sku='LEG-PROD-13' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'pamplemousse', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-14', 0, -1, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-14');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 14, id FROM product WHERE sku='LEG-PROD-14' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'arbres des safoutiers', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-15', 1, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-15');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 15, id FROM product WHERE sku='LEG-PROD-15' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'machine a emballer les viandes', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-16', 1, 0, 35, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-16');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 16, id FROM product WHERE sku='LEG-PROD-16' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'machine a coudre les sacs', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=2), 'LEG-PROD-17', 1, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-17');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 17, id FROM product WHERE sku='LEG-PROD-17' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'manioc', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=3), 'LEG-PROD-18', 1, 600, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-18');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 18, id FROM product WHERE sku='LEG-PROD-18' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'Paire LED CLIGNOTANT ', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=4), 'LEG-PROD-19', 1, 0, 30, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-19');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 19, id FROM product WHERE sku='LEG-PROD-19' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'Porc mâle (Verrat)', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=5), 'LEG-PROD-20', 18, 0, 0, -1, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-20');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 20, id FROM product WHERE sku='LEG-PROD-20' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'Déchet de manioc ', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=3), 'LEG-PROD-23', -2, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-23');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 23, id FROM product WHERE sku='LEG-PROD-23' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'FUFU Kasangulu', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=3), 'LEG-PROD-25', 0, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-25');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 25, id FROM product WHERE sku='LEG-PROD-25' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'porc pourrit', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=3), 'LEG-PROD-26', -12, 15000, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-26');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 26, id FROM product WHERE sku='LEG-PROD-26' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'manioc par piquet', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=3), 'LEG-PROD-22', -297, 55000, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-22');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 22, id FROM product WHERE sku='LEG-PROD-22' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) SELECT 1, 'Porc femelle (Truie)', (SELECT new_id FROM legacy_subcategory_map WHERE legacy_id=5), 'LEG-PROD-21', 20, 0, 0, 0, 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku='LEG-PROD-21');
--> statement-breakpoint
INSERT INTO legacy_product_map (legacy_id, new_id) SELECT 21, id FROM product WHERE sku='LEG-PROD-21' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint

-- === supplier (4) ===
INSERT INTO supplier (name, phone, address, status, created_at) SELECT 'Kin mag acram pneus grand car', '+243890018810', 'Colonel ebeya proche assemblée provinciale', 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM supplier WHERE name='Kin mag acram pneus grand car');
--> statement-breakpoint
INSERT INTO legacy_supplier_map (legacy_id, new_id) SELECT 1, id FROM supplier WHERE name='Kin mag acram pneus grand car' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO supplier (name, phone, address, status, created_at) SELECT 'CYCO MOTORS INTERNATIONAL ', '+243851505555', 'N’20 av. kasavubu commerce en face de syndic CSC', 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM supplier WHERE name='CYCO MOTORS INTERNATIONAL ');
--> statement-breakpoint
INSERT INTO legacy_supplier_map (legacy_id, new_id) SELECT 2, id FROM supplier WHERE name='CYCO MOTORS INTERNATIONAL ' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO supplier (name, phone, address, status, created_at) SELECT 'ONYI-GOD DÉPÔT PNEUS NEUF ET OCCASION', '+243997866730', '38 av banalia, gambela-banalia, kasa-vubu', 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM supplier WHERE name='ONYI-GOD DÉPÔT PNEUS NEUF ET OCCASION');
--> statement-breakpoint
INSERT INTO legacy_supplier_map (legacy_id, new_id) SELECT 3, id FROM supplier WHERE name='ONYI-GOD DÉPÔT PNEUS NEUF ET OCCASION' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint
INSERT INTO supplier (name, phone, address, status, created_at) SELECT 'ONYI-GOD DÉPÔT PNEUS NEUF ET OCCASION', '+243896522444', '36 av banalia gambela kasavubu', 'true', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM supplier WHERE name='ONYI-GOD DÉPÔT PNEUS NEUF ET OCCASION');
--> statement-breakpoint
INSERT INTO legacy_supplier_map (legacy_id, new_id) SELECT 4, id FROM supplier WHERE name='ONYI-GOD DÉPÔT PNEUS NEUF ET OCCASION' ORDER BY id LIMIT 1 ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);
--> statement-breakpoint

-- === saleInvoice (11) + saleInvoiceProduct. id cible varchar -> 'LEG-S<id>'. ===
-- customer_id recable via legacy_customer_map. user_id=NULL (mapping users plus tard).
INSERT INTO saleInvoice (id, organization_id, date, totalAmount, totalDiscountAmount, paidAmount, dueAmount, profit, customerId, currencyId, userId, note, created_at) SELECT 'LEG-S1', 1, '2023-08-18 00:00:00', 1098000, 0, 1098000, 0, 1098000, (SELECT new_id FROM legacy_customer_map WHERE legacy_id=26), (SELECT MIN(id) FROM currency WHERE currencyName = 'FRANC CONGOLAIS' AND status = 'true'), NULL, 'porc de 61 kilo', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoice WHERE id='LEG-S1');
--> statement-breakpoint
INSERT INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productFinalAmount, created_at) SELECT 'LEG-S1', (SELECT new_id FROM legacy_product_map WHERE legacy_id=21), 1, 1098000, 1098000.0, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoiceProduct WHERE invoiceId='LEG-S1' AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id=21));
--> statement-breakpoint
INSERT INTO saleInvoice (id, organization_id, date, totalAmount, totalDiscountAmount, paidAmount, dueAmount, profit, customerId, currencyId, userId, note, created_at) SELECT 'LEG-S2', 1, '2023-08-22 00:00:00', 7975000, 0, 7975000, 0, 7975000, (SELECT new_id FROM legacy_customer_map WHERE legacy_id=26), (SELECT MIN(id) FROM currency WHERE currencyName = 'FRANC CONGOLAIS' AND status = 'true'), NULL, 'vente manioc par piquet au plateau Batéké ', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoice WHERE id='LEG-S2');
--> statement-breakpoint
INSERT INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productFinalAmount, created_at) SELECT 'LEG-S2', (SELECT new_id FROM legacy_product_map WHERE legacy_id=22), 145, 55000, 7975000.0, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoiceProduct WHERE invoiceId='LEG-S2' AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id=22));
--> statement-breakpoint
INSERT INTO saleInvoice (id, organization_id, date, totalAmount, totalDiscountAmount, paidAmount, dueAmount, profit, customerId, currencyId, userId, note, created_at) SELECT 'LEG-S6', 1, '2023-08-22 00:00:00', 45000, 0, 45000, 0, 45000, (SELECT new_id FROM legacy_customer_map WHERE legacy_id=26), (SELECT MIN(id) FROM currency WHERE currencyName = 'FRANC CONGOLAIS' AND status = 'true'), NULL, 'Déchet manioc vendu au plateau et qui comptabilisé dans le rapport donné par Fatima et Prisca', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoice WHERE id='LEG-S6');
--> statement-breakpoint
INSERT INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productFinalAmount, created_at) SELECT 'LEG-S6', (SELECT new_id FROM legacy_product_map WHERE legacy_id=23), 1, 45000, 45000.0, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoiceProduct WHERE invoiceId='LEG-S6' AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id=23));
--> statement-breakpoint
INSERT INTO saleInvoice (id, organization_id, date, totalAmount, totalDiscountAmount, paidAmount, dueAmount, profit, customerId, currencyId, userId, note, created_at) SELECT 'LEG-S7', 1, '2023-08-22 00:00:00', 69500, 0, 69500, 0, 69500, (SELECT new_id FROM legacy_customer_map WHERE legacy_id=26), (SELECT MIN(id) FROM currency WHERE currencyName = 'FRANC CONGOLAIS' AND status = 'true'), NULL, 'Déchet manioc vendu au plateau et qui ne pas comptabilisé dans le rapport donné par Fatima et Prisca ', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoice WHERE id='LEG-S7');
--> statement-breakpoint
INSERT INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productFinalAmount, created_at) SELECT 'LEG-S7', (SELECT new_id FROM legacy_product_map WHERE legacy_id=23), 1, 69500, 69500.0, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoiceProduct WHERE invoiceId='LEG-S7' AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id=23));
--> statement-breakpoint
INSERT INTO saleInvoice (id, organization_id, date, totalAmount, totalDiscountAmount, paidAmount, dueAmount, profit, customerId, currencyId, userId, note, created_at) SELECT 'LEG-S8', 1, '2023-08-23 00:00:00', 417, 0, 417, 0, 417, (SELECT new_id FROM legacy_customer_map WHERE legacy_id=26), (SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true'), NULL, 'fufu vendu a kasangulu par Esther, montant :1000000 changé en dollar ce qui donne:417  ', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoice WHERE id='LEG-S8');
--> statement-breakpoint
INSERT INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productFinalAmount, created_at) SELECT 'LEG-S8', (SELECT new_id FROM legacy_product_map WHERE legacy_id=25), 1, 417, 417.0, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoiceProduct WHERE invoiceId='LEG-S8' AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id=25));
--> statement-breakpoint
INSERT INTO saleInvoice (id, organization_id, date, totalAmount, totalDiscountAmount, paidAmount, dueAmount, profit, customerId, currencyId, userId, note, created_at) SELECT 'LEG-S9', 1, '2023-08-29 00:00:00', 195000, 0, 195000, 0, 195000, (SELECT new_id FROM legacy_customer_map WHERE legacy_id=26), (SELECT MIN(id) FROM currency WHERE currencyName = 'FRANC CONGOLAIS' AND status = 'true'), NULL, 'vente d''un porc pourrit au mois d''Avril ', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoice WHERE id='LEG-S9');
--> statement-breakpoint
INSERT INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productFinalAmount, created_at) SELECT 'LEG-S9', (SELECT new_id FROM legacy_product_map WHERE legacy_id=26), 13, 15000, 195000.0, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoiceProduct WHERE invoiceId='LEG-S9' AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id=26));
--> statement-breakpoint
INSERT INTO saleInvoice (id, organization_id, date, totalAmount, totalDiscountAmount, paidAmount, dueAmount, profit, customerId, currencyId, userId, note, created_at) SELECT 'LEG-S10', 1, '2023-09-05 00:00:00', 10175000, 0, 10175000, 0, 10175000, (SELECT new_id FROM legacy_customer_map WHERE legacy_id=26), (SELECT MIN(id) FROM currency WHERE currencyName = 'FRANC CONGOLAIS' AND status = 'true'), NULL, NULL, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoice WHERE id='LEG-S10');
--> statement-breakpoint
INSERT INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productFinalAmount, created_at) SELECT 'LEG-S10', (SELECT new_id FROM legacy_product_map WHERE legacy_id=22), 185, 55000, 10175000.0, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoiceProduct WHERE invoiceId='LEG-S10' AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id=22));
--> statement-breakpoint
INSERT INTO saleInvoice (id, organization_id, date, totalAmount, totalDiscountAmount, paidAmount, dueAmount, profit, customerId, currencyId, userId, note, created_at) SELECT 'LEG-S11', 1, '2023-09-05 00:00:00', 10175000, 0, 10175000, 0, 10175000, (SELECT new_id FROM legacy_customer_map WHERE legacy_id=26), (SELECT MIN(id) FROM currency WHERE currencyName = 'FRANC CONGOLAIS' AND status = 'true'), NULL, NULL, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoice WHERE id='LEG-S11');
--> statement-breakpoint
INSERT INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productFinalAmount, created_at) SELECT 'LEG-S11', (SELECT new_id FROM legacy_product_map WHERE legacy_id=22), 185, 55000, 10175000.0, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoiceProduct WHERE invoiceId='LEG-S11' AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id=22));
--> statement-breakpoint
INSERT INTO saleInvoice (id, organization_id, date, totalAmount, totalDiscountAmount, paidAmount, dueAmount, profit, customerId, currencyId, userId, note, created_at) SELECT 'LEG-S12', 1, '2023-09-05 00:00:00', 10175000, 0, 10175000, 0, 10175000, (SELECT new_id FROM legacy_customer_map WHERE legacy_id=26), (SELECT MIN(id) FROM currency WHERE currencyName = 'FRANC CONGOLAIS' AND status = 'true'), NULL, NULL, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoice WHERE id='LEG-S12');
--> statement-breakpoint
INSERT INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productFinalAmount, created_at) SELECT 'LEG-S12', (SELECT new_id FROM legacy_product_map WHERE legacy_id=22), 185, 55000, 10175000.0, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoiceProduct WHERE invoiceId='LEG-S12' AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id=22));
--> statement-breakpoint
INSERT INTO saleInvoice (id, organization_id, date, totalAmount, totalDiscountAmount, paidAmount, dueAmount, profit, customerId, currencyId, userId, note, created_at) SELECT 'LEG-S13', 1, '2023-09-27 00:00:00', 8360000, 0, 8360000, 0, 8360000, (SELECT new_id FROM legacy_customer_map WHERE legacy_id=26), (SELECT MIN(id) FROM currency WHERE currencyName = 'FRANC CONGOLAIS' AND status = 'true'), NULL, 'vente manioc au plateau Batéké, somme d`argent versé le mercredi 27-09-2023 pour 4 tour ', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoice WHERE id='LEG-S13');
--> statement-breakpoint
INSERT INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productFinalAmount, created_at) SELECT 'LEG-S13', (SELECT new_id FROM legacy_product_map WHERE legacy_id=22), 152, 55000, 8360000.0, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoiceProduct WHERE invoiceId='LEG-S13' AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id=22));
--> statement-breakpoint
INSERT INTO saleInvoice (id, organization_id, date, totalAmount, totalDiscountAmount, paidAmount, dueAmount, profit, customerId, currencyId, userId, note, created_at) SELECT 'LEG-S14', 1, '2023-12-11 00:00:00', 0, 0, 866000, -866000, 0, (SELECT new_id FROM legacy_customer_map WHERE legacy_id=21), (SELECT MIN(id) FROM currency WHERE currencyName = 'FRANC CONGOLAIS' AND status = 'true'), NULL, 'Vente de 2em porc par Prisca au mois de septembre, somme d`argent verset le lundi le 11-12-2023 ', NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoice WHERE id='LEG-S14');
--> statement-breakpoint
INSERT INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productFinalAmount, created_at) SELECT 'LEG-S14', (SELECT new_id FROM legacy_product_map WHERE legacy_id=21), 1, 0, 0.0, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoiceProduct WHERE invoiceId='LEG-S14' AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id=21));
--> statement-breakpoint

-- === purchaseInvoice (1) + purchaseInvoiceProduct. id cible varchar -> 'LEG-P<id>'. ===
INSERT INTO purchaseInvoice (id, organization_id, date, totalAmount, paidAmount, dueAmount, supplierId, currencyId, note, supplierMemoNo, created_at) SELECT 'LEG-P1', 1, '2023-07-30 00:00:00', 30, 30, 0, (SELECT new_id FROM legacy_supplier_map WHERE legacy_id=1), (SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true'), 'lumière arrière pour le camion', NULL, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM purchaseInvoice WHERE id='LEG-P1');
--> statement-breakpoint
INSERT INTO purchaseInvoiceProduct (invoiceId, productId, productQuantity, productUnitPurchasePrice, productFinalAmount, created_at) SELECT 'LEG-P1', (SELECT new_id FROM legacy_product_map WHERE legacy_id=19), 1, 30, 30.0, NOW() FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM purchaseInvoiceProduct WHERE invoiceId='LEG-P1' AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id=19));
--> statement-breakpoint

