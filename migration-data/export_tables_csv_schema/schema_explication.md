# Explication du schéma de la base de données

Source analysée : `db-backup-postgres (1) (3).sql`
Nombre de tables détectées : **35**

## Résumé des fichiers CSV

| Table | Lignes exportées | Fichier CSV | Clé primaire |
|---|---:|---|---|
| `Devis` | 38 | `csv/Devis.csv` | `id` |
| `_prisma_migrations` | 21 | `csv/prisma_migrations.csv` | `id` |
| `account` | 7 | `csv/account.csv` | `id` |
| `appSetting` | 1 | `csv/appSetting.csv` | `id` |
| `contract` | 24 | `csv/contract.csv` | `id` |
| `contract_type` | 3 | `csv/contract_type.csv` | `id` |
| `customer` | 19 | `csv/customer.csv` | `id` |
| `designation` | 11 | `csv/designation.csv` | `id` |
| `devise` | 2 | `csv/devise.csv` | `id` |
| `invoiceProductStock` | 10 | `csv/invoiceProductStock.csv` | `id` |
| `permission` | 117 | `csv/permission.csv` | `id` |
| `product` | 25 | `csv/product.csv` | `id` |
| `product_category` | 5 | `csv/product_category.csv` | `id` |
| `project` | 1 | `csv/project.csv` | `id` |
| `purchaseInvoice` | 1 | `csv/purchaseInvoice.csv` | `id` |
| `purchaseInvoiceProduct` | 1 | `csv/purchaseInvoiceProduct.csv` | `id` |
| `realestate` | 19 | `csv/realestate.csv` | `id` |
| `realestate_type` | 4 | `csv/realestate_type.csv` | `id` |
| `rent_payment` | 374 | `csv/rent_payment.csv` | `id` |
| `report` | 77 | `csv/report.csv` | `id` |
| `returnPurchaseInvoice` | 0 | `csv/returnPurchaseInvoice.csv` | `id` |
| `returnPurchaseInvoiceProduct` | 0 | `csv/returnPurchaseInvoiceProduct.csv` | `id` |
| `returnSaleInvoice` | 0 | `csv/returnSaleInvoice.csv` | `id` |
| `returnSaleInvoiceProduct` | 0 | `csv/returnSaleInvoiceProduct.csv` | `id` |
| `role` | 22 | `csv/role.csv` | `id` |
| `rolePermission` | 336 | `csv/rolePermission.csv` | `id` |
| `saleInvoice` | 11 | `csv/saleInvoice.csv` | `id` |
| `saleInvoiceProduct` | 11 | `csv/saleInvoiceProduct.csv` | `id` |
| `session` | 552 | `csv/session.csv` | `id` |
| `subAccount` | 85 | `csv/subAccount.csv` | `id` |
| `supplier` | 4 | `csv/supplier.csv` | `id` |
| `transaction` | 1178 | `csv/transaction.csv` | `id` |
| `transactionType` | 79 | `csv/transactionType.csv` | `id` |
| `user` | 32 | `csv/user.csv` | `uuid` |
| `userProject` | 1 | `csv/userProject.csv` | `id` |

## Détail des tables

### Table `Devis`

- Fichier CSV : `csv/Devis.csv`
- Nombre de lignes exportées : **38**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `subject` | `text` | Oui | `—` |
| `description` | `text` | Oui | `—` |
| `status` | `boolean` | Oui | `true` |
| `state_status` | `text` | Oui | `'Envoyé'::text` |
| `image` | `text` | Non | `—` |
| `creator_id` | `text` | Oui | `—` |
| `approval` | `text` | Non | `—` |
| `comment` | `text` | Non | `—` |

### Table `_prisma_migrations`

- Fichier CSV : `csv/prisma_migrations.csv`
- Nombre de lignes exportées : **21**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `character varying(36)` | Oui | `—` |
| `checksum` | `character varying(64)` | Oui | `—` |
| `finished_at` | `timestamp with time zone` | Non | `—` |
| `migration_name` | `character varying(255)` | Oui | `—` |
| `logs` | `text` | Non | `—` |
| `rolled_back_at` | `timestamp with time zone` | Non | `—` |
| `started_at` | `timestamp with time zone` | Oui | `now()` |
| `applied_steps_count` | `integer` | Oui | `0` |

### Table `account`

- Fichier CSV : `csv/account.csv`
- Nombre de lignes exportées : **7**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `name` | `text` | Oui | `—` |
| `type` | `text` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |
| `createdAt` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |

### Table `appSetting`

- Fichier CSV : `csv/appSetting.csv`
- Nombre de lignes exportées : **1**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `company_name` | `text` | Oui | `—` |
| `tag_line` | `text` | Oui | `—` |
| `address` | `text` | Oui | `—` |
| `phone` | `text` | Oui | `—` |
| `email` | `text` | Oui | `—` |
| `website` | `text` | Oui | `—` |
| `footer` | `text` | Oui | `—` |

### Table `contract`

- Fichier CSV : `csv/contract.csv`
- Nombre de lignes exportées : **24**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `contract_contract_type_id_fkey` : `contract_type_id` → `contract_type(id)` ON UPDATE CASCADE ON DELETE RESTRICT
  - `contract_customer_id_fkey` : `customer_id` → `customer(id)` ON UPDATE CASCADE ON DELETE RESTRICT
  - `contract_devise_id_fkey` : `devise_id` → `devise(id)` ON UPDATE CASCADE ON DELETE SET NULL
  - `contract_realestate_id_fkey` : `realestate_id` → `realestate(id)` ON UPDATE CASCADE ON DELETE RESTRICT

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `customer_id` | `integer` | Oui | `—` |
| `realestate_id` | `integer` | Oui | `—` |
| `contract_type_id` | `integer` | Oui | `—` |
| `rent_amount` | `double precision` | Oui | `—` |
| `note` | `text` | Non | `—` |
| `imageName` | `text` | Non | `—` |
| `status` | `boolean` | Oui | `true` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |
| `start_date` | `timestamp(3) without time zone` | Oui | `—` |
| `end_date` | `timestamp(3) without time zone` | Oui | `—` |
| `lessor_address` | `text` | Non | `—` |
| `lessor_fullname` | `text` | Non | `—` |
| `devise_id` | `integer` | Non | `—` |
| `lessor_city` | `text` | Non | `—` |
| `sign_city` | `text` | Non | `—` |

### Table `contract_type`

- Fichier CSV : `csv/contract_type.csv`
- Nombre de lignes exportées : **3**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `name` | `text` | Oui | `—` |
| `createdAt` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updatedAt` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |
| `day` | `integer` | Oui | `—` |

### Table `customer`

- Fichier CSV : `csv/customer.csv`
- Nombre de lignes exportées : **19**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `first_name` | `text` | Non | `—` |
| `last_name` | `text` | Oui | `—` |
| `phone2` | `text` | Non | `—` |
| `status` | `boolean` | Oui | `true` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Non | `—` |
| `activity` | `text` | Non | `—` |
| `birth_date` | `timestamp(3) without time zone` | Non | `—` |
| `child_age` | `text` | Non | `—` |
| `child_number` | `text` | Non | `—` |
| `contacted_person` | `text` | Non | `—` |
| `email` | `text` | Non | `—` |
| `entity_address` | `text` | Non | `—` |
| `entity_name` | `text` | Non | `—` |
| `hiring_date` | `timestamp(3) without time zone` | Non | `—` |
| `main_activity` | `text` | Non | `—` |
| `marital_status` | `text` | Non | `—` |
| `middle_name` | `text` | Non | `—` |
| `monthly_pay` | `text` | Non | `—` |
| `moving_reason` | `text` | Non | `—` |
| `nationality` | `text` | Non | `—` |
| `occupant_number` | `text` | Non | `—` |
| `old_address` | `text` | Non | `—` |
| `old_lessor` | `text` | Non | `—` |
| `origin_province` | `text` | Non | `—` |
| `other_allowance` | `text` | Non | `—` |
| `other_monthly_income` | `text` | Non | `—` |
| `partenair_name` | `text` | Non | `—` |
| `phone` | `text` | Oui | `—` |
| `phone3` | `text` | Non | `—` |
| `prossional_status` | `text` | Non | `—` |
| `seniority` | `text` | Non | `—` |
| `sex` | `text` | Non | `—` |
| `contract_type` | `text` | Non | `—` |

### Table `designation`

- Fichier CSV : `csv/designation.csv`
- Nombre de lignes exportées : **11**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `name` | `text` | Oui | `—` |
| `createdAt` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updatedAt` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `devise`

- Fichier CSV : `csv/devise.csv`
- Nombre de lignes exportées : **2**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `name` | `text` | Oui | `—` |
| `code` | `text` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `invoiceProductStock`

- Fichier CSV : `csv/invoiceProductStock.csv`
- Nombre de lignes exportées : **10**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `invoiceProductStock_devise_id_fkey` : `devise_id` → `devise(id)` ON UPDATE CASCADE ON DELETE RESTRICT
  - `invoiceProductStock_product_id_fkey` : `product_id` → `product(id)` ON UPDATE CASCADE ON DELETE CASCADE

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `product_id` | `integer` | Oui | `—` |
| `invoice_id` | `integer` | Oui | `—` |
| `product_quantity` | `integer` | Oui | `—` |
| `product_price` | `double precision` | Oui | `—` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `operation_name` | `text` | Oui | `—` |
| `product_stock` | `integer` | Oui | `—` |
| `observation` | `text` | Oui | `—` |
| `devise_id` | `integer` | Oui | `—` |

### Table `permission`

- Fichier CSV : `csv/permission.csv`
- Nombre de lignes exportées : **117**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `name` | `text` | Oui | `—` |
| `createdAt` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updatedAt` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `product`

- Fichier CSV : `csv/product.csv`
- Nombre de lignes exportées : **25**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `product_devise_id_fkey` : `devise_id` → `devise(id)` ON UPDATE CASCADE ON DELETE RESTRICT
  - `product_product_category_id_fkey` : `product_category_id` → `product_category(id)` ON UPDATE CASCADE ON DELETE SET NULL

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `name` | `text` | Oui | `—` |
| `quantity` | `integer` | Oui | `—` |
| `purchase_price` | `double precision` | Oui | `—` |
| `sale_price` | `double precision` | Oui | `—` |
| `imageName` | `text` | Non | `—` |
| `product_category_id` | `integer` | Non | `—` |
| `unit_measurement` | `double precision` | Non | `—` |
| `unit_type` | `text` | Non | `—` |
| `sku` | `text` | Non | `—` |
| `reorder_quantity` | `integer` | Non | `—` |
| `status` | `boolean` | Oui | `true` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |
| `devise_id` | `integer` | Oui | `—` |

### Table `product_category`

- Fichier CSV : `csv/product_category.csv`
- Nombre de lignes exportées : **5**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `name` | `text` | Oui | `—` |
| `createdAt` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updatedAt` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `project`

- Fichier CSV : `csv/project.csv`
- Nombre de lignes exportées : **1**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `name` | `text` | Oui | `—` |
| `description` | `text` | Oui | `—` |
| `status` | `boolean` | Oui | `true` |
| `createdAt` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updatedAt` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `purchaseInvoice`

- Fichier CSV : `csv/purchaseInvoice.csv`
- Nombre de lignes exportées : **1**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `purchaseInvoice_devise_id_fkey` : `devise_id` → `devise(id)` ON UPDATE CASCADE ON DELETE RESTRICT
  - `purchaseInvoice_supplier_id_fkey` : `supplier_id` → `supplier(id)` ON UPDATE CASCADE ON DELETE CASCADE

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `date` | `timestamp(3) without time zone` | Oui | `—` |
| `total_amount` | `double precision` | Oui | `—` |
| `discount` | `double precision` | Oui | `—` |
| `paid_amount` | `double precision` | Oui | `—` |
| `due_amount` | `double precision` | Oui | `—` |
| `supplier_id` | `integer` | Oui | `—` |
| `note` | `text` | Non | `—` |
| `supplier_memo_no` | `text` | Non | `—` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |
| `devise_id` | `integer` | Oui | `—` |

### Table `purchaseInvoiceProduct`

- Fichier CSV : `csv/purchaseInvoiceProduct.csv`
- Nombre de lignes exportées : **1**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `purchaseInvoiceProduct_devise_id_fkey` : `devise_id` → `devise(id)` ON UPDATE CASCADE ON DELETE RESTRICT
  - `purchaseInvoiceProduct_invoice_id_fkey` : `invoice_id` → `purchaseInvoice(id)` ON UPDATE CASCADE ON DELETE CASCADE
  - `purchaseInvoiceProduct_product_id_fkey` : `product_id` → `product(id)` ON UPDATE CASCADE ON DELETE CASCADE

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `product_id` | `integer` | Oui | `—` |
| `invoice_id` | `integer` | Oui | `—` |
| `product_quantity` | `integer` | Oui | `—` |
| `product_purchase_price` | `double precision` | Oui | `—` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |
| `devise_id` | `integer` | Oui | `—` |

### Table `realestate`

- Fichier CSV : `csv/realestate.csv`
- Nombre de lignes exportées : **19**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `realestate_realestate_type_id_fkey` : `realestate_type_id` → `realestate_type(id)` ON UPDATE CASCADE ON DELETE SET NULL

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `address` | `text` | Oui | `—` |
| `city` | `text` | Oui | `—` |
| `country` | `text` | Oui | `—` |
| `municipalities` | `text` | Oui | `—` |
| `imageName` | `text` | Non | `—` |
| `purchase_price` | `integer` | Oui | `—` |
| `sale_price` | `double precision` | Non | `—` |
| `realestate_type_id` | `integer` | Non | `—` |
| `note` | `text` | Non | `—` |
| `area` | `integer` | Non | `—` |
| `apartment_number` | `integer` | Non | `—` |
| `year_of_construction` | `integer` | Oui | `—` |
| `code` | `integer` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |
| `status` | `boolean` | Oui | `true` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |

### Table `realestate_type`

- Fichier CSV : `csv/realestate_type.csv`
- Nombre de lignes exportées : **4**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `name` | `text` | Oui | `—` |
| `createdAt` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updatedAt` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `rent_payment`

- Fichier CSV : `csv/rent_payment.csv`
- Nombre de lignes exportées : **374**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `rent_payment_contract_id_fkey` : `contract_id` → `contract(id)` ON UPDATE CASCADE ON DELETE RESTRICT
  - `rent_payment_devise_id_fkey` : `devise_id` → `devise(id)` ON UPDATE CASCADE ON DELETE SET NULL

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `contract_id` | `integer` | Oui | `—` |
| `payment_status` | `text` | Oui | `'uncompleted'::text` |
| `planned_payment_date` | `timestamp(3) without time zone` | Oui | `—` |
| `createdAt` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updatedAt` | `timestamp(3) without time zone` | Oui | `—` |
| `due_payment` | `integer` | Oui | `0` |
| `payment` | `integer` | Oui | `0` |
| `discount` | `double precision` | Non | `0` |
| `devise_id` | `integer` | Non | `—` |
| `payment_date` | `timestamp(3) without time zone` | Non | `—` |

### Table `report`

- Fichier CSV : `csv/report.csv`
- Nombre de lignes exportées : **77**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `subject` | `text` | Oui | `—` |
| `content` | `text` | Oui | `—` |
| `image` | `text` | Non | `—` |
| `date` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `status` | `boolean` | Oui | `true` |
| `creator_id` | `text` | Oui | `—` |

### Table `returnPurchaseInvoice`

- Fichier CSV : `csv/returnPurchaseInvoice.csv`
- Nombre de lignes exportées : **0**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `returnPurchaseInvoice_purchaseInvoice_id_fkey` : `purchaseInvoice_id` → `purchaseInvoice(id)` ON UPDATE CASCADE ON DELETE CASCADE

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `date` | `timestamp(3) without time zone` | Oui | `—` |
| `total_amount` | `double precision` | Oui | `—` |
| `note` | `text` | Non | `—` |
| `purchaseInvoice_id` | `integer` | Oui | `—` |
| `status` | `boolean` | Oui | `true` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `returnPurchaseInvoiceProduct`

- Fichier CSV : `csv/returnPurchaseInvoiceProduct.csv`
- Nombre de lignes exportées : **0**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `returnPurchaseInvoiceProduct_invoice_id_fkey` : `invoice_id` → `returnPurchaseInvoice(id)` ON UPDATE CASCADE ON DELETE CASCADE
  - `returnPurchaseInvoiceProduct_product_id_fkey` : `product_id` → `product(id)` ON UPDATE CASCADE ON DELETE CASCADE

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `product_id` | `integer` | Oui | `—` |
| `invoice_id` | `integer` | Oui | `—` |
| `product_quantity` | `integer` | Oui | `—` |
| `product_purchase_price` | `double precision` | Oui | `—` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `returnSaleInvoice`

- Fichier CSV : `csv/returnSaleInvoice.csv`
- Nombre de lignes exportées : **0**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `returnSaleInvoice_saleInvoice_id_fkey` : `saleInvoice_id` → `saleInvoice(id)` ON UPDATE CASCADE ON DELETE CASCADE

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `date` | `timestamp(3) without time zone` | Oui | `—` |
| `total_amount` | `double precision` | Oui | `—` |
| `note` | `text` | Non | `—` |
| `saleInvoice_id` | `integer` | Oui | `—` |
| `status` | `boolean` | Oui | `true` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `returnSaleInvoiceProduct`

- Fichier CSV : `csv/returnSaleInvoiceProduct.csv`
- Nombre de lignes exportées : **0**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `returnSaleInvoiceProduct_invoice_id_fkey` : `invoice_id` → `returnSaleInvoice(id)` ON UPDATE CASCADE ON DELETE CASCADE
  - `returnSaleInvoiceProduct_product_id_fkey` : `product_id` → `product(id)` ON UPDATE CASCADE ON DELETE CASCADE

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `product_id` | `integer` | Oui | `—` |
| `invoice_id` | `integer` | Oui | `—` |
| `product_quantity` | `integer` | Oui | `—` |
| `product_sale_price` | `double precision` | Oui | `—` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `role`

- Fichier CSV : `csv/role.csv`
- Nombre de lignes exportées : **22**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `name` | `text` | Oui | `—` |
| `status` | `boolean` | Oui | `true` |
| `createdAt` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updatedAt` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `rolePermission`

- Fichier CSV : `csv/rolePermission.csv`
- Nombre de lignes exportées : **336**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `rolePermission_permission_id_fkey` : `permission_id` → `permission(id)` ON UPDATE CASCADE ON DELETE CASCADE
  - `rolePermission_role_id_fkey` : `role_id` → `role(id)` ON UPDATE CASCADE ON DELETE CASCADE

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `role_id` | `integer` | Oui | `—` |
| `permission_id` | `integer` | Oui | `—` |
| `status` | `boolean` | Oui | `true` |
| `createdAt` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updatedAt` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `saleInvoice`

- Fichier CSV : `csv/saleInvoice.csv`
- Nombre de lignes exportées : **11**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `saleInvoice_customer_id_fkey` : `customer_id` → `customer(id)` ON UPDATE CASCADE ON DELETE CASCADE
  - `saleInvoice_devise_id_fkey` : `devise_id` → `devise(id)` ON UPDATE CASCADE ON DELETE RESTRICT
  - `saleInvoice_user_id_fkey` : `user_id` → `user(uuid)` ON UPDATE CASCADE ON DELETE RESTRICT

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `date` | `timestamp(3) without time zone` | Oui | `—` |
| `total_amount` | `double precision` | Oui | `—` |
| `discount` | `double precision` | Oui | `—` |
| `paid_amount` | `double precision` | Oui | `—` |
| `due_amount` | `double precision` | Oui | `—` |
| `profit` | `double precision` | Oui | `—` |
| `customer_id` | `integer` | Oui | `—` |
| `user_id` | `text` | Oui | `—` |
| `note` | `text` | Non | `—` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |
| `devise_id` | `integer` | Oui | `—` |

### Table `saleInvoiceProduct`

- Fichier CSV : `csv/saleInvoiceProduct.csv`
- Nombre de lignes exportées : **11**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `saleInvoiceProduct_invoice_id_fkey` : `invoice_id` → `saleInvoice(id)` ON UPDATE CASCADE ON DELETE CASCADE
  - `saleInvoiceProduct_product_id_fkey` : `product_id` → `product(id)` ON UPDATE CASCADE ON DELETE CASCADE

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `product_id` | `integer` | Oui | `—` |
| `invoice_id` | `integer` | Oui | `—` |
| `product_quantity` | `integer` | Oui | `—` |
| `product_sale_price` | `double precision` | Oui | `—` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `session`

- Fichier CSV : `csv/session.csv`
- Nombre de lignes exportées : **552**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `token` | `text` | Oui | `—` |
| `date` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `connected` | `boolean` | Oui | `—` |

### Table `subAccount`

- Fichier CSV : `csv/subAccount.csv`
- Nombre de lignes exportées : **85**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `subAccount_account_id_fkey` : `account_id` → `account(id)` ON UPDATE CASCADE ON DELETE RESTRICT

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `name` | `text` | Oui | `—` |
| `account_id` | `integer` | Oui | `—` |
| `status` | `boolean` | Oui | `true` |
| `creator_id` | `text` | Oui | `—` |

### Table `supplier`

- Fichier CSV : `csv/supplier.csv`
- Nombre de lignes exportées : **4**
- Clé primaire : `id`
- Relations / clés étrangères : aucune détectée

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `name` | `text` | Oui | `—` |
| `phone` | `text` | Oui | `—` |
| `address` | `text` | Oui | `—` |
| `status` | `boolean` | Oui | `true` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `transaction`

- Fichier CSV : `csv/transaction.csv`
- Nombre de lignes exportées : **1178**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `transaction_credit_id_fkey` : `credit_id` → `subAccount(id)` ON UPDATE CASCADE ON DELETE CASCADE
  - `transaction_debit_id_fkey` : `debit_id` → `subAccount(id)` ON UPDATE CASCADE ON DELETE CASCADE
  - `transaction_device_id_fkey` : `device_id` → `devise(id)` ON UPDATE CASCADE ON DELETE RESTRICT
  - `transaction_rent_payment_id_fkey` : `rent_payment_id` → `rent_payment(id)` ON UPDATE CASCADE ON DELETE CASCADE
  - `transaction_transaction_type_id_fkey` : `transaction_type_id` → `transactionType(id)` ON UPDATE CASCADE ON DELETE CASCADE

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `date` | `timestamp(3) without time zone` | Oui | `—` |
| `debit_id` | `integer` | Oui | `—` |
| `credit_id` | `integer` | Oui | `—` |
| `particulars` | `text` | Oui | `—` |
| `amount` | `double precision` | Oui | `—` |
| `type` | `text` | Non | `—` |
| `related_id` | `integer` | Non | `—` |
| `status` | `boolean` | Oui | `true` |
| `created_at` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |
| `contract_id` | `integer` | Non | `—` |
| `device_id` | `integer` | Oui | `—` |
| `rent_payment_id` | `integer` | Non | `—` |
| `transaction_type_id` | `integer` | Non | `—` |

### Table `transactionType`

- Fichier CSV : `csv/transactionType.csv`
- Nombre de lignes exportées : **79**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `transactionType_credit_id_fkey` : `credit_id` → `subAccount(id)` ON UPDATE CASCADE ON DELETE CASCADE
  - `transactionType_debit_id_fkey` : `debit_id` → `subAccount(id)` ON UPDATE CASCADE ON DELETE CASCADE

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `name` | `text` | Oui | `—` |
| `activity` | `text` | Oui | `—` |
| `status` | `boolean` | Oui | `true` |
| `details` | `text` | Oui | `—` |
| `debit_id` | `integer` | Oui | `—` |
| `credit_id` | `integer` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |

### Table `user`

- Fichier CSV : `csv/user.csv`
- Nombre de lignes exportées : **32**
- Clé primaire : `uuid`
- Relations / clés étrangères :
  - `user_designation_id_fkey` : `designation_id` → `designation(id)` ON UPDATE CASCADE ON DELETE SET NULL
  - `user_devise_id_fkey` : `devise_id` → `devise(id)` ON UPDATE CASCADE ON DELETE SET NULL

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `uuid` | `text` | Oui | `gen_random_uuid()` |
| `id` | `integer` | Oui | `—` |
| `username` | `text` | Oui | `—` |
| `first_name` | `text` | Oui | `—` |
| `last_name` | `text` | Oui | `—` |
| `password` | `text` | Oui | `—` |
| `birthday` | `timestamp(3) without time zone` | Non | `—` |
| `role` | `text` | Oui | `—` |
| `email` | `text` | Non | `—` |
| `salary` | `integer` | Non | `—` |
| `designation_id` | `integer` | Non | `—` |
| `join_date` | `timestamp(3) without time zone` | Non | `—` |
| `leave_date` | `timestamp(3) without time zone` | Non | `—` |
| `id_no` | `text` | Non | `—` |
| `department` | `text` | Non | `—` |
| `phone` | `text` | Non | `—` |
| `address` | `text` | Non | `—` |
| `blood_group` | `text` | Non | `—` |
| `image` | `text` | Non | `—` |
| `status` | `boolean` | Oui | `true` |
| `createdAt` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updatedAt` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |
| `devise_id` | `integer` | Non | `—` |

### Table `userProject`

- Fichier CSV : `csv/userProject.csv`
- Nombre de lignes exportées : **1**
- Clé primaire : `id`
- Relations / clés étrangères :
  - `userProject_project_id_fkey` : `project_id` → `project(id)` ON UPDATE CASCADE ON DELETE CASCADE
  - `userProject_user_id_fkey` : `user_id` → `user(id)` ON UPDATE CASCADE ON DELETE CASCADE

| Colonne | Type PostgreSQL | Obligatoire | Valeur par défaut |
|---|---|---|---|
| `id` | `integer` | Oui | `—` |
| `user_id` | `integer` | Oui | `—` |
| `project_id` | `integer` | Oui | `—` |
| `status` | `boolean` | Oui | `true` |
| `createdAt` | `timestamp(3) without time zone` | Oui | `CURRENT_TIMESTAMP` |
| `updatedAt` | `timestamp(3) without time zone` | Oui | `—` |
| `creator_id` | `text` | Oui | `—` |