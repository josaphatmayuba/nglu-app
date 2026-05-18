-- ============================================================
-- Seed: produits + factures de vente pour démo
-- Idempotent: INSERT IGNORE sur SKU produit + invoiceMemoNo facture
-- ============================================================

-- ─── 1. PRODUITS catalogue ────────────────────────────────
INSERT IGNORE INTO product
  (name, sku, productQuantity, productSalePrice, productPurchasePrice, status, created_at, updated_at)
VALUES
  ('Maïs sec · sac 50kg',           'SKU-MAIS-50',     500,   25000,  18000, 'true', NOW(), NOW()),
  ('Manioc · sac 50kg',             'SKU-MANIOC-50',   320,   22000,  16000, 'true', NOW(), NOW()),
  ('Riz · sac 25kg',                'SKU-RIZ-25',      180,   45000,  35000, 'true', NOW(), NOW()),
  ('Haricots · sac 25kg',           'SKU-HARI-25',     210,   38000,  28000, 'true', NOW(), NOW()),
  ('Huile de palme · bidon 5L',     'SKU-HUILE-5L',    140,   18000,  13000, 'true', NOW(), NOW()),
  ('Œufs · plateau 30',             'SKU-OEUFS-30',    420,   18000,  12000, 'true', NOW(), NOW()),
  ('Poulet vivant · pièce',         'SKU-POULET-1',     85,   25000,  18000, 'true', NOW(), NOW()),
  ('Porc · kg',                     'SKU-PORC-1',      210,   12000,   8500, 'true', NOW(), NOW()),
  ('Bœuf · kg',                     'SKU-BOEUF-1',     180,   15000,  10500, 'true', NOW(), NOW()),
  ('Lait frais · litre',            'SKU-LAIT-1L',     310,    4500,   3000, 'true', NOW(), NOW()),
  ('Tomates · kg',                  'SKU-TOMATE-1',    240,    3500,   2200, 'true', NOW(), NOW()),
  ('Oignons · kg',                  'SKU-OIGNON-1',    280,    3000,   1800, 'true', NOW(), NOW());

-- ─── 2. FACTURES de vente ──────────────────────────────────
-- 1 customer + 1 user + line items pour chacune
-- userId=1 = super-admin, 2 = admin (selon seed standard)

INSERT IGNORE INTO saleInvoice
  (id, date, invoiceMemoNo, totalAmount, totalTaxAmount, totalDiscountAmount,
   paidAmount, dueAmount, profit, customerId, userId, note, dueDate, isHold,
   orderStatus, created_at, updated_at)
VALUES
  -- 1. Marie Kabongo · payée intégralement
  ('1778900001', '2026-05-14 10:30:00', 'INV-2026-0847',
   245000, 33793, 0, 245000, 0, 75000, 7, 2, 'Vente comptant', '2026-05-28', 'false', 'delivered', NOW(), NOW()),

  -- 2. Paul Lumumba · en attente, échéance dépassée
  ('1778900002', '2026-05-14 14:15:00', 'INV-2026-0846',
   890000, 122759, 0, 0, 890000, 280000, 8, 2, 'Crédit 14 jours · à recouvrer', '2026-05-12', 'false', 'pending', NOW(), NOW()),

  -- 3. Sarah Mwamba · payée intégralement
  ('1778900003', '2026-05-13 09:20:00', 'INV-2026-0845',
   120500, 16621, 0, 120500, 0, 38000, 9, 2, NULL, '2026-05-27', 'false', 'delivered', NOW(), NOW()),

  -- 4. Jean Bemba · annulée (totalAmount à 0 visuel via orderStatus)
  ('1778900004', '2026-05-13 16:45:00', 'INV-2026-0844',
   75000, 10345, 0, 0, 75000, 0, 12, 2, 'Annulée à la demande client', NULL, 'false', 'returned', NOW(), NOW()),

  -- 5. Christine Tshisekedi · payée intégralement
  ('1778900005', '2026-05-12 11:00:00', 'INV-2026-0843',
   1450000, 200000, 0, 1450000, 0, 425000, 10, 2, 'Gros achat anniversaire', '2026-05-26', 'false', 'delivered', NOW(), NOW()),

  -- 6. David Ilunga · payée partiellement
  ('1778900006', '2026-05-11 08:30:00', 'INV-2026-0842',
   680000, 93793, 0, 400000, 280000, 195000, 11, 2, 'Acompte 400k versé', '2026-05-25', 'false', 'pending', NOW(), NOW()),

  -- 7. Esther Mbuyi · payée intégralement
  ('1778900007', '2026-05-10 13:50:00', 'INV-2026-0841',
   315000, 43448, 0, 315000, 0, 95000, 13, 2, NULL, '2026-05-24', 'false', 'delivered', NOW(), NOW()),

  -- 8. Patrick Mutombo · en attente (échéance future)
  ('1778900008', '2026-05-15 10:00:00', 'INV-2026-0848',
   2200000, 303448, 0, 0, 2200000, 650000, 14, 2, 'Crédit 30 jours', '2026-06-14', 'false', 'pending', NOW(), NOW()),

  -- 9. Aimée Nzuzi · payée intégralement
  ('1778900009', '2026-05-09 15:20:00', 'INV-2026-0840',
   89500, 12345, 0, 89500, 0, 27000, 15, 2, NULL, '2026-05-23', 'false', 'delivered', NOW(), NOW()),

  -- 10. Eric Kasongo · payée intégralement
  ('1778900010', '2026-05-08 17:40:00', 'INV-2026-0839',
   165000, 22759, 0, 165000, 0, 50000, 16, 2, 'Vente comptoir', '2026-05-22', 'false', 'delivered', NOW(), NOW());

-- ─── 3. LIGNES de facture ──────────────────────────────────
-- Chaque facture a 1-3 lignes pointant vers les produits seedés.
-- productId est résolu par sous-requête sur SKU pour rester idempotent.

-- Marie Kabongo · INV-2026-0847 : maïs 6 + œufs 5
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900001', p.id, 6, 25000, 0, 150000, 16, 24000, NOW(), NOW() FROM product p WHERE p.sku='SKU-MAIS-50' LIMIT 1;
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900001', p.id, 3, 18000, 0, 54000, 16, 8640, NOW(), NOW() FROM product p WHERE p.sku='SKU-OEUFS-30' LIMIT 1;

-- Paul Lumumba · INV-2026-0846 : riz 10 + huile 8 + porc 12 kg
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900002', p.id, 10, 45000, 0, 450000, 16, 72000, NOW(), NOW() FROM product p WHERE p.sku='SKU-RIZ-25' LIMIT 1;
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900002', p.id, 8, 18000, 0, 144000, 16, 23040, NOW(), NOW() FROM product p WHERE p.sku='SKU-HUILE-5L' LIMIT 1;
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900002', p.id, 12, 12000, 0, 144000, 16, 23040, NOW(), NOW() FROM product p WHERE p.sku='SKU-PORC-1' LIMIT 1;

-- Sarah · INV-2026-0845 : tomates 15 + oignons 12 + lait 3
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900003', p.id, 15, 3500, 0, 52500, 16, 8400, NOW(), NOW() FROM product p WHERE p.sku='SKU-TOMATE-1' LIMIT 1;
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900003', p.id, 12, 3000, 0, 36000, 16, 5760, NOW(), NOW() FROM product p WHERE p.sku='SKU-OIGNON-1' LIMIT 1;
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900003', p.id, 3, 4500, 0, 13500, 16, 2160, NOW(), NOW() FROM product p WHERE p.sku='SKU-LAIT-1L' LIMIT 1;

-- Jean Bemba · INV-2026-0844 : 1 ligne, annulée
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900004', p.id, 5, 12000, 0, 60000, 16, 9600, NOW(), NOW() FROM product p WHERE p.sku='SKU-PORC-1' LIMIT 1;

-- Christine · INV-2026-0843 : grosse commande variée
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900005', p.id, 20, 25000, 0, 500000, 16, 80000, NOW(), NOW() FROM product p WHERE p.sku='SKU-MAIS-50' LIMIT 1;
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900005', p.id, 30, 15000, 0, 450000, 16, 72000, NOW(), NOW() FROM product p WHERE p.sku='SKU-BOEUF-1' LIMIT 1;
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900005', p.id, 50, 5000, 0, 250000, 16, 40000, NOW(), NOW() FROM product p WHERE p.sku='SKU-LAIT-1L' LIMIT 1;

-- David Ilunga · INV-2026-0842 : œufs 20 plateaux + haricots 8
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900006', p.id, 20, 18000, 0, 360000, 16, 57600, NOW(), NOW() FROM product p WHERE p.sku='SKU-OEUFS-30' LIMIT 1;
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900006', p.id, 6, 38000, 0, 228000, 16, 36480, NOW(), NOW() FROM product p WHERE p.sku='SKU-HARI-25' LIMIT 1;

-- Esther · INV-2026-0841 : porc 15kg + lait 10
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900007', p.id, 15, 12000, 0, 180000, 16, 28800, NOW(), NOW() FROM product p WHERE p.sku='SKU-PORC-1' LIMIT 1;
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900007', p.id, 10, 4500, 0, 45000, 16, 7200, NOW(), NOW() FROM product p WHERE p.sku='SKU-LAIT-1L' LIMIT 1;

-- Patrick Mutombo · INV-2026-0848 : grosse commande commerciale
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900008', p.id, 30, 22000, 0, 660000, 16, 105600, NOW(), NOW() FROM product p WHERE p.sku='SKU-MANIOC-50' LIMIT 1;
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900008', p.id, 25, 45000, 0, 1125000, 16, 180000, NOW(), NOW() FROM product p WHERE p.sku='SKU-RIZ-25' LIMIT 1;

-- Aimée · INV-2026-0840 : poulet 3 + oignons 5
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900009', p.id, 3, 25000, 0, 75000, 16, 12000, NOW(), NOW() FROM product p WHERE p.sku='SKU-POULET-1' LIMIT 1;
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900009', p.id, 5, 3000, 0, 15000, 16, 2400, NOW(), NOW() FROM product p WHERE p.sku='SKU-OIGNON-1' LIMIT 1;

-- Eric Kasongo · INV-2026-0839 : porc 8kg + tomates 10
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900010', p.id, 8, 12000, 0, 96000, 16, 15360, NOW(), NOW() FROM product p WHERE p.sku='SKU-PORC-1' LIMIT 1;
INSERT IGNORE INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productDiscount, productFinalAmount, tax, taxAmount, created_at, updated_at)
SELECT '1778900010', p.id, 10, 3500, 0, 35000, 16, 5600, NOW(), NOW() FROM product p WHERE p.sku='SKU-TOMATE-1' LIMIT 1;

-- ─── 4. Vérification ───────────────────────────────────────
SELECT
  i.invoiceMemoNo AS invoice,
  DATE_FORMAT(i.date, '%Y-%m-%d') AS date,
  CONCAT(c.firstName, ' ', c.lastName) AS client,
  i.totalAmount AS total,
  i.paidAmount AS paid,
  i.dueAmount AS due,
  i.orderStatus AS status
FROM saleInvoice i
LEFT JOIN customer c ON c.id = i.customerId
WHERE i.id LIKE '17789000%'
ORDER BY i.date DESC;
