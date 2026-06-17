"""Generateur SQL final : migration-data/cleaned_csv/*.csv -> nglu-app (MySQL/Drizzle).

Lit les CSV deja transformes (gen_cleaned_csv.py : regroupement subAccount en 7
categories canoniques, residences immo, comptes/sous-comptes, customers, users,
products, devis...) et produit UN SEUL .sql idempotent couvrant compta + immobilier
+ commercial + users/devis.

Strategie de recablage : chaque CSV reference ses dependances par CLE NATURELLE
(legacy_id, code, sku, username...) car les ids AUTO reels ne sont connus qu'apres
insertion. Des tables temporaires legacy_*_map (legacy_id -> new_id) servent de pont,
remplies par "INSERT ... SELECT id ... ON DUPLICATE KEY UPDATE".

Conventions (alignees sur gen_compta_sql.py / gen_immo_sql.py / gen_comm_sql.py /
gen_users_devis_sql.py) :
  - 1 statement par --> statement-breakpoint (Drizzle).
  - INSERT idempotents via "WHERE NOT EXISTS (...)" sur une cle naturelle.
  - account 1-6 + subAccount 1-17 + currency + designations/department seeds deja en
    base dev -> on FUSIONNE (legacy_account_map fige 1..6, devises par currencyName).
  - account 7 (Locatif) + les 7 categories canoniques de charge (legacy_id 9001-9007)
    + tous les autres subAccount actifs -> INSERES en id AUTO + mappes.

NE TOUCHE AUCUNE BASE. Produit un .sql relu avant application.

Usage:
    py scripts/migration/gen_import_sql.py migration-data/cleaned_csv scripts/sql/0150_legacy_import.sql
"""
import sys
import io
import os
import csv

_OUT = io.StringIO()


def out(line=""):
    _OUT.write(line + "\n")


def bp():
    out("--> statement-breakpoint")


def q(s):
    if s is None or s == "":
        return "NULL"
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


def qreq(s):
    """Comme q() mais une chaine vide reste '' (pas NULL) pour les colonnes NOT NULL sans defaut."""
    if s is None:
        return "NULL"
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


def numv(v, default="0"):
    if v is None or v == "":
        return default
    try:
        float(v)
        return str(v)
    except ValueError:
        return default


# Devise par currencyName EXACT + MIN(id) actif (aligne sur migration 0143). CDF =
# 'FRANC CONGOLAIS', USD = 'DOLLAR'. Pas de symbole (mojibake) ni de LIKE (ambigu 'FRANC').
CUR_USD = "(SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true')"
CUR_CDF = "(SELECT MIN(id) FROM currency WHERE currencyName = 'FRANC CONGOLAIS' AND status = 'true')"


def cur_expr(code):
    return CUR_CDF if code == "CDF" else CUR_USD


# account legacy 1-6 -> account dev existant (meme nature, deja seede). 7 = Locatif, insere.
ACCOUNT_MAP_TO_DEV = {"1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6}


class Source:
    def __init__(self, csv_dir):
        self.csv_dir = csv_dir
        self._cache = {}
        self._files = {f.lower(): f for f in os.listdir(csv_dir)}

    def rows(self, table):
        if table in self._cache:
            return self._cache[table]
        fname = self._files.get(f"{table}.csv".lower())
        if fname is None:
            self._cache[table] = []
            return []
        path = os.path.join(self.csv_dir, fname)
        with open(path, "r", encoding="utf-8-sig", newline="") as f:
            rows = [dict(row) for row in csv.DictReader(f)]
        self._cache[table] = rows
        return rows


def emit_header():
    out("-- ============================================================")
    out("-- Migration legacy -> nglu-app, GENERE depuis migration-data/cleaned_csv/")
    out("-- Genere par scripts/migration/gen_import_sql.py (NE PAS EDITER A LA MAIN)")
    out("-- 1 statement / --> statement-breakpoint. Idempotent (WHERE NOT EXISTS / ON DUPLICATE KEY).")
    out("-- ============================================================")
    for t in ("account", "subaccount", "property", "unit", "customer", "lease",
              "category", "subcategory", "product", "supplier", "user"):
        out(f"CREATE TABLE IF NOT EXISTS legacy_{t}_map (legacy_id VARCHAR(64) PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
        bp()


# ============================================================
# COMPTA
# ============================================================

def emit_accounts(src):
    rows = src.rows("account")
    out(f"-- === account : fusion 1-6 sur l'existant dev + insert(s) ({len(rows)} ligne(s) dans le CSV) ===")
    for legacy_id, dev_id in ACCOUNT_MAP_TO_DEV.items():
        out(f"INSERT INTO legacy_account_map (legacy_id, new_id) VALUES ({q(legacy_id)}, {dev_id}) "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    for a in rows:
        lid, name, typ = a["legacy_id"], a["name"], a["type"]
        out(f"-- account legacy {lid} ({name}) : insere si absent (match par nom+type)")
        out(f"INSERT INTO account (name, type, created_at) "
            f"SELECT {q(name)}, {q(typ)}, NOW() FROM DUAL "
            f"WHERE NOT EXISTS (SELECT 1 FROM account WHERE name={q(name)} AND type={q(typ)});")
        bp()
        out(f"INSERT INTO legacy_account_map (legacy_id, new_id) "
            f"SELECT {q(lid)}, id FROM account WHERE name={q(name)} AND type={q(typ)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_subaccounts(src):
    rows = src.rows("subAccount")
    out(f"-- === subAccount ({len(rows)}) : reinseres en id AUTO + map legacy_subaccount_map ===")
    out("-- accountId recable via legacy_account_map. Les 7 categories canoniques de charge")
    out("-- (legacy_id 9001-9007) sont incluses ici comme les autres : nouvelles lignes.")
    for s in rows:
        lid, name, acc_legacy, status = s["legacy_id"], s["name"], s["account_legacy_id"], s["status"]
        accsel = f"(SELECT new_id FROM legacy_account_map WHERE legacy_id={q(acc_legacy)})"
        out(f"INSERT INTO subAccount (name, accountId, status, created_at) "
            f"SELECT {q(name)}, {accsel}, {q(status)}, NOW() FROM DUAL "
            f"WHERE NOT EXISTS (SELECT 1 FROM legacy_subaccount_map WHERE legacy_id={q(lid)});")
        bp()
        out(f"INSERT INTO legacy_subaccount_map (legacy_id, new_id) "
            f"SELECT {q(lid)}, sa.id FROM subAccount sa "
            f"WHERE sa.name={q(name)} AND sa.accountId={accsel} "
            f"AND sa.id NOT IN (SELECT new_id FROM legacy_subaccount_map) "
            f"ORDER BY sa.id DESC LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_transaction_types(src):
    rows = src.rows("transaction_types")
    out(f"-- === transaction_types ({len(rows)}) : id AUTO, debit/credit via legacy_subaccount_map ===")
    for t in rows:
        name = t["name"]
        desc = t.get("description") or None
        debit_sel = f"(SELECT new_id FROM legacy_subaccount_map WHERE legacy_id={q(t['debit_subaccount_legacy_id'])})"
        credit_sel = f"(SELECT new_id FROM legacy_subaccount_map WHERE legacy_id={q(t['credit_subaccount_legacy_id'])})"
        out(f"INSERT INTO transaction_types (name, debit_account_id, credit_account_id, description, is_active, created_at) "
            f"SELECT {q(name)}, {debit_sel}, {credit_sel}, {q(desc)}, 1, NOW() FROM DUAL "
            f"WHERE NOT EXISTS (SELECT 1 FROM transaction_types WHERE name={q(name)} AND description={q(desc)});")
        bp()
    out()


def emit_journal(src):
    rows = src.rows("journal_entries")
    out(f"-- === journal_entries + journal_entry_lines ({len(rows)}) : 1 entry + 2 lines (DEBIT/CREDIT) ===")
    out("-- account_id = legacy_subaccount_map.new_id. Idempotent via idempotency_key 'legacy-je-<legacy_id>'.")
    for j in rows:
        lid = j["legacy_id"]
        idem = f"legacy-je-{lid}"
        cur = cur_expr(j["currency"])
        amount = numv(j["amount"])
        particulars = j["particulars"]
        date = j["date"]
        debit_sel = f"(SELECT new_id FROM legacy_subaccount_map WHERE legacy_id={q(j['debit_subaccount_legacy_id'])})"
        credit_sel = f"(SELECT new_id FROM legacy_subaccount_map WHERE legacy_id={q(j['credit_subaccount_legacy_id'])})"
        out(f"INSERT INTO journal_entries "
            f"(organization_id, date, particulars, source_module, related_id, status, currency_id, total_debit, total_credit, idempotency_key, created_at) "
            f"SELECT 1, {q(date)}, {q(particulars)}, {q(j['source_module'])}, {q(lid)}, {q(j['status'])}, {cur}, {amount}, {amount}, {q(idem)}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM journal_entries WHERE idempotency_key={q(idem)});")
        bp()
        out(f"INSERT INTO journal_entry_lines (entry_id, organization_id, account_id, side, amount, created_at) "
            f"SELECT je.id, 1, {debit_sel}, 'DEBIT', {amount}, NOW() "
            f"FROM journal_entries je WHERE je.idempotency_key={q(idem)} "
            f"AND NOT EXISTS (SELECT 1 FROM journal_entry_lines l WHERE l.entry_id=je.id AND l.side='DEBIT');")
        bp()
        out(f"INSERT INTO journal_entry_lines (entry_id, organization_id, account_id, side, amount, created_at) "
            f"SELECT je.id, 1, {credit_sel}, 'CREDIT', {amount}, NOW() "
            f"FROM journal_entries je WHERE je.idempotency_key={q(idem)} "
            f"AND NOT EXISTS (SELECT 1 FROM journal_entry_lines l WHERE l.entry_id=je.id AND l.side='CREDIT');")
        bp()
    out()


# ============================================================
# IMMOBILIER
# ============================================================

def emit_properties(src):
    rows = src.rows("real_estate_properties")
    out(f"-- === real_estate_properties ({len(rows)} residences) ===")
    for p in rows:
        code = p["code"]
        out(f"INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) "
            f"SELECT 1, {q(p['name'])}, {q(code)}, {q(p['property_type'])}, {q(p['status'])}, {q(p['address'])}, {q(p['city'])}, {q(p['country'])}, "
            f"{numv(p['market_value'])}, {CUR_USD}, {p['is_active']}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code={q(code)});")
        bp()
        out(f"INSERT INTO legacy_property_map (legacy_id, new_id) "
            f"SELECT {q(code)}, id FROM real_estate_properties WHERE code={q(code)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_units(src):
    rows = src.rows("real_estate_units")
    out(f"-- === real_estate_units ({len(rows)}) ===")
    for u in rows:
        unit_code = u["unit_code"]
        prop_sel = f"(SELECT new_id FROM legacy_property_map WHERE legacy_id={q(u['property_code'])})"
        out(f"INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) "
            f"SELECT 1, {prop_sel}, {q(u['name'])}, {q(u['unit_type'])}, {q(u['status'])}, {numv(u['monthly_rent'])}, {CUR_USD}, {u['is_active']}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_id={q(unit_code)});")
        bp()
        out(f"INSERT INTO legacy_unit_map (legacy_id, new_id) "
            f"SELECT {q(unit_code)}, ru.id FROM real_estate_units ru "
            f"WHERE ru.property_id={prop_sel} AND ru.name={q(u['name'])} "
            f"AND ru.id NOT IN (SELECT new_id FROM legacy_unit_map) "
            f"ORDER BY ru.id DESC LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_customers(src):
    cust = src.rows("customer")
    tdet = {t["customer_username"]: t for t in src.rows("tenant_details")}
    out(f"-- === customer + tenant_details ({len(cust)}) ===")
    for c in cust:
        uname = c["username"]
        out(f"INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) "
            f"SELECT 1, {q(c['firstName'])}, {q(c['lastName'])}, {q(uname)}, {q(c['phone'])}, {q(c['email'])}, {q(c['address'])}, {q(c['password'])}, {c['roleId']}, {q(c['status'])}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username={q(uname)});")
        bp()
        out(f"INSERT INTO legacy_customer_map (legacy_id, new_id) "
            f"SELECT {q(uname)}, id FROM customer WHERE username={q(uname)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
        t = tdet.get(uname)
        if t:
            cidsel = f"(SELECT new_id FROM legacy_customer_map WHERE legacy_id={q(uname)})"
            out(f"INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) "
                f"SELECT {cidsel}, {q(t['birth_date'])}, {q(t['sex'])}, {q(t['nationality'])}, {q(t['marital_status'])}, "
                f"{q(t['origin_province'])}, {q(t['contacted_person'])}, {q(t['contacted_person_phone_number'])}, "
                f"{q(t['prossional_status'])}, {q(t['main_activity'])}, {q(t['entity_name'])}, {q(t['entity_address'])}, "
                f"{q(t['hiring_date'])}, {q(t['contract_type'])}, {numv(t['monthly_pay'])}, "
                f"{q(t['old_address'])}, {q(t['old_lessor'])}, {q(t['moving_reason'])}, "
                f"{numv(t['occupant_number'],'1')}, {numv(t['child_number'])}, NOW() "
                f"FROM DUAL WHERE {cidsel} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id={cidsel});")
            bp()
    out()


def emit_leases(src):
    rows = src.rows("real_estate_leases")
    out(f"-- === real_estate_leases ({len(rows)}) ===")
    for l in rows:
        ref = l["reference"]
        out(f"INSERT INTO real_estate_leases (organization_id, reference, property_id, unit_id, tenant_id, start_date, end_date, billing_cycle, rent_amount, currency_id, status, created_at) "
            f"SELECT 1, {q(ref)}, "
            f"(SELECT ru.property_id FROM real_estate_units ru JOIN legacy_unit_map m ON m.new_id=ru.id WHERE m.legacy_id={q(l['unit_code'])}), "
            f"(SELECT new_id FROM legacy_unit_map WHERE legacy_id={q(l['unit_code'])}), "
            f"(SELECT new_id FROM legacy_customer_map WHERE legacy_id={q(l['tenant_username'])}), "
            f"{q(l['start_date'])}, {q(l['end_date'])}, {q(l['billing_cycle'])}, {numv(l['rent_amount'])}, {CUR_USD}, {q(l['status'])}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_leases WHERE reference={q(ref)});")
        bp()
        out(f"INSERT INTO legacy_lease_map (legacy_id, new_id) "
            f"SELECT {q(l['legacy_id'])}, id FROM real_estate_leases WHERE reference={q(ref)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_rent_payments(src):
    rows = src.rows("real_estate_rent_payments")
    out(f"-- === real_estate_rent_payments ({len(rows)}) ===")
    for r in rows:
        ref = r["reference"]
        out(f"INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) "
            f"SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id={q(r['lease_reference'])}), {cur_expr(r['currency'])}, {q(r['payment_date'])}, {numv(r['amount'])}, {q(r['method'])}, {q(ref)}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference={q(ref)});")
        bp()
    out()


# ============================================================
# COMMERCIAL
# ============================================================

def emit_categories(src):
    cats = src.rows("productCategory")
    subcats = {s["legacy_id"]: s for s in src.rows("productSubCategory")}
    out(f"-- === productCategory + productSubCategory ({len(cats)}) ===")
    for c in cats:
        lid, name = c["legacy_id"], c["name"]
        out(f"INSERT INTO productCategory (name, created_at) SELECT {q(name)}, NOW() FROM DUAL "
            f"WHERE NOT EXISTS (SELECT 1 FROM productCategory WHERE name={q(name)});")
        bp()
        out(f"INSERT INTO legacy_category_map (legacy_id, new_id) "
            f"SELECT {q(lid)}, id FROM productCategory WHERE name={q(name)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
        sc = subcats.get(lid)
        if sc:
            catsel = f"(SELECT new_id FROM legacy_category_map WHERE legacy_id={q(lid)})"
            out(f"INSERT INTO productSubCategory (name, productCategoryId, status, created_at) "
                f"SELECT {q(sc['name'])}, {catsel}, {q(sc['status'])}, NOW() FROM DUAL "
                f"WHERE NOT EXISTS (SELECT 1 FROM legacy_subcategory_map WHERE legacy_id={q(lid)});")
            bp()
            out(f"INSERT INTO legacy_subcategory_map (legacy_id, new_id) "
                f"SELECT {q(lid)}, id FROM productSubCategory WHERE productCategoryId={catsel} ORDER BY id LIMIT 1 "
                f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
            bp()
    out()


def emit_products(src):
    rows = src.rows("product")
    out(f"-- === product ({len(rows)}) : sku 'LEG-PROD-<legacy_id>' = cle naturelle idempotente ===")
    for p in rows:
        sku = p["sku"]
        sub = p.get("subcategory_legacy_id") or None
        sub_sel = f"(SELECT new_id FROM legacy_subcategory_map WHERE legacy_id={q(sub)})" if sub else "NULL"
        out(f"INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) "
            f"SELECT 1, {q(p['name'])}, {sub_sel}, {q(sku)}, {numv(p['productQuantity'])}, "
            f"{numv(p['productSalePrice'])}, {numv(p['productPurchasePrice'])}, {numv(p['reorderQuantity'])}, {q(p['status'])}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku={q(sku)});")
        bp()
        out(f"INSERT INTO legacy_product_map (legacy_id, new_id) "
            f"SELECT {q(p['legacy_id'])}, id FROM product WHERE sku={q(sku)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_suppliers(src):
    rows = src.rows("supplier")
    out(f"-- === supplier ({len(rows)}) ===")
    for s in rows:
        name = s["name"]
        out(f"INSERT INTO supplier (name, phone, address, status, created_at) "
            f"SELECT {q(name)}, {q(s['phone'])}, {q(s['address'])}, {q(s['status'])}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM supplier WHERE name={q(name)});")
        bp()
        out(f"INSERT INTO legacy_supplier_map (legacy_id, new_id) "
            f"SELECT {q(s['legacy_id'])}, id FROM supplier WHERE name={q(name)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_sale_invoices(src):
    si = src.rows("saleInvoice")
    sip = src.rows("saleInvoiceProduct")
    by_inv = {}
    for r in sip:
        by_inv.setdefault(r["invoiceId"], []).append(r)
    out(f"-- === saleInvoice ({len(si)}) + saleInvoiceProduct ===")
    for s in si:
        newid = s["id"]
        cust_legacy = s.get("customer_legacy_id") or None
        cust_sel = f"(SELECT new_id FROM legacy_customer_map WHERE legacy_id={q('legacy-cust-' + cust_legacy)})" if cust_legacy else "NULL"
        out(f"INSERT INTO saleInvoice (id, organization_id, date, totalAmount, totalDiscountAmount, paidAmount, dueAmount, profit, customerId, currencyId, userId, note, created_at) "
            f"SELECT {q(newid)}, 1, {q(s['date'])}, {numv(s['totalAmount'])}, {numv(s['totalDiscountAmount'])}, {numv(s['paidAmount'])}, {numv(s['dueAmount'])}, {numv(s['profit'])}, "
            f"{cust_sel}, {cur_expr(s['currency'])}, NULL, {q(s['note'])}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoice WHERE id={q(newid)});")
        bp()
        for line in by_inv.get(newid, []):
            prod_sel = f"(SELECT new_id FROM legacy_product_map WHERE legacy_id={q(line['product_legacy_id'])})"
            out(f"INSERT INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productFinalAmount, created_at) "
                f"SELECT {q(newid)}, {prod_sel}, {numv(line['productQuantity'],'1')}, {numv(line['productUnitSalePrice'])}, {numv(line['productFinalAmount'])}, NOW() "
                f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoiceProduct WHERE invoiceId={q(newid)} AND productId={prod_sel});")
            bp()
    out()


def emit_purchase_invoices(src):
    pi = src.rows("purchaseInvoice")
    pip = src.rows("purchaseInvoiceProduct")
    by_inv = {}
    for r in pip:
        by_inv.setdefault(r["invoiceId"], []).append(r)
    out(f"-- === purchaseInvoice ({len(pi)}) + purchaseInvoiceProduct ===")
    for p in pi:
        newid = p["id"]
        sup_legacy = p.get("supplier_legacy_id") or None
        sup_sel = f"(SELECT new_id FROM legacy_supplier_map WHERE legacy_id={q(sup_legacy)})" if sup_legacy else "NULL"
        out(f"INSERT INTO purchaseInvoice (id, organization_id, date, totalAmount, paidAmount, dueAmount, supplierId, currencyId, note, supplierMemoNo, created_at) "
            f"SELECT {q(newid)}, 1, {q(p['date'])}, {numv(p['totalAmount'])}, {numv(p['paidAmount'])}, {numv(p['dueAmount'])}, "
            f"{sup_sel}, {cur_expr(p['currency'])}, {q(p['note'])}, {q(p['supplierMemoNo'])}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM purchaseInvoice WHERE id={q(newid)});")
        bp()
        for line in by_inv.get(newid, []):
            prod_sel = f"(SELECT new_id FROM legacy_product_map WHERE legacy_id={q(line['product_legacy_id'])})"
            out(f"INSERT INTO purchaseInvoiceProduct (invoiceId, productId, productQuantity, productUnitPurchasePrice, productFinalAmount, created_at) "
                f"SELECT {q(newid)}, {prod_sel}, {numv(line['productQuantity'],'1')}, {numv(line['productUnitPurchasePrice'])}, {numv(line['productFinalAmount'])}, NOW() "
                f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM purchaseInvoiceProduct WHERE invoiceId={q(newid)} AND productId={prod_sel});")
            bp()
    out()


# ============================================================
# USERS / DEVIS
# ============================================================

def target_department_expr(name):
    if not name:
        return "NULL"
    return f"(SELECT id FROM department WHERE LOWER(name)=LOWER({q(name)}) ORDER BY id LIMIT 1)"


def target_designation_expr(name):
    if not name:
        return "NULL"
    return f"(SELECT id FROM designations WHERE LOWER(name)=LOWER({q(name)}) ORDER BY id LIMIT 1)"


def emit_hr_reference_data(src):
    desigs = src.rows("designations")
    depts = src.rows("department")
    out(f"-- === referentiels RH : designations={len(desigs)}, departements={len(depts)} ===")
    for d in desigs:
        name = d["name"]
        out(f"INSERT INTO designations (name, status, created_at, updated_at) "
            f"SELECT {q(name)}, {q(d['status'])}, NOW(), NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM designations WHERE LOWER(name)=LOWER({q(name)}));")
        bp()
    for d in depts:
        name = d["name"]
        out(f"INSERT INTO department (name, status, created_at, updated_at) "
            f"SELECT {q(name)}, {q(d['status'])}, NOW(), NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM department WHERE LOWER(name)=LOWER({q(name)}));")
        bp()
    out()


def emit_users(src):
    rows = src.rows("users")
    out(f"-- === users ({len(rows)}) migres en NOUVEAUX users (seeds 1-6 intacts) ===")
    for u in rows:
        uuid, username = u["legacy_uuid"], u["username"]
        out(f"INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, employeeId, joinDate, leaveDate, birthDate, street, bloodGroup, image, created_at) "
            f"SELECT 1, {q(username)}, {q(u['firstName'])}, {q(u['lastName'])}, {q(u['email'])}, {q(u['phone'])}, {q(u['password'])}, {u['roleId']}, {q(u['status'])}, "
            f"{q(u['employeeId'])}, {q(u['joinDate'])}, {q(u['leaveDate'])}, {q(u['birthDate'])}, {q(u['street'])}, {q(u['bloodGroup'])}, {q(u['image'])}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username={q(username)});")
        bp()
        out(f"INSERT INTO legacy_user_map (legacy_id, new_id) "
            f"SELECT {q(uuid)}, id FROM users WHERE username={q(username)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
        sets = []
        if u.get("designation_name"):
            sets.append(f"u.designationId={target_designation_expr(u['designation_name'])}")
        if u.get("department_name"):
            sets.append(f"u.departmentId={target_department_expr(u['department_name'])}")
        if sets:
            sets.append("u.updated_at=NOW()")
            out(f"UPDATE users u JOIN legacy_user_map m ON m.new_id=u.id "
                f"SET {', '.join(sets)} WHERE m.legacy_id={q(uuid)};")
            bp()
    out()


def emit_salary_histories(src):
    rows = src.rows("salary_histories")
    out(f"-- === salary_histories ({len(rows)}) ===")
    for s in rows:
        uuid = s["legacy_uuid"]
        comment = s["comment"]
        out(f"INSERT INTO salary_histories (userId, salary, currency_id, startDate, endDate, comment, created_at, updated_at) "
            f"SELECT m.new_id, {numv(s['salary'])}, {cur_expr(s['currency'])}, {q(s['startDate'])}, {q(s['endDate'])}, {q(comment)}, NOW(), NOW() "
            f"FROM legacy_user_map m WHERE m.legacy_id={q(uuid)} "
            f"AND NOT EXISTS (SELECT 1 FROM salary_histories sh WHERE sh.userId=m.new_id AND sh.comment={q(comment)});")
        bp()
    out()


def emit_designation_histories(src):
    rows = src.rows("designation_histories")
    out(f"-- === designation_histories ({len(rows)}) ===")
    for d in rows:
        uuid = d["legacy_uuid"]
        comment = d["comment"]
        designation = target_designation_expr(d["designation_name"])
        out(f"INSERT INTO designation_histories (userId, designationId, startDate, endDate, comment, created_at, updated_at) "
            f"SELECT m.new_id, {designation}, {q(d['startDate'])}, {q(d['endDate'])}, {q(comment)}, NOW(), NOW() "
            f"FROM legacy_user_map m WHERE m.legacy_id={q(uuid)} AND {designation} IS NOT NULL "
            f"AND NOT EXISTS (SELECT 1 FROM designation_histories dh WHERE dh.userId=m.new_id AND dh.comment={q(comment)});")
        bp()
    out()


def emit_devis(src):
    rows = src.rows("quote")
    out(f"-- === quote ({len(rows)} Devis) ===")
    for d in rows:
        ref = d["reference"]
        owner = d.get("owner_legacy_uuid") or None
        owner_sel = f"(SELECT new_id FROM legacy_user_map WHERE legacy_id={q(owner)})" if owner else "NULL"
        out(f"INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) "
            f"SELECT {q(d['quoteName'])}, NOW(), {owner_sel}, NULL, {numv(d['totalAmount'])}, {q(d['note'])}, {q(d['status'])}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE {q('[' + ref + ']%')});")
        bp()
    out()


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return
    src = Source(sys.argv[1])
    emit_header()
    print("Compta:")
    emit_accounts(src)
    emit_subaccounts(src)
    emit_transaction_types(src)
    emit_journal(src)
    print("Immobilier:")
    emit_properties(src)
    emit_units(src)
    emit_customers(src)
    emit_leases(src)
    emit_rent_payments(src)
    print("Commercial:")
    emit_categories(src)
    emit_products(src)
    emit_suppliers(src)
    emit_sale_invoices(src)
    emit_purchase_invoices(src)
    print("Users/Devis:")
    emit_hr_reference_data(src)
    emit_users(src)
    emit_salary_histories(src)
    emit_designation_histories(src)
    emit_devis(src)
    with open(sys.argv[2], "w", encoding="utf-8", newline="\n") as f:
        f.write(_OUT.getvalue())
    print(f"OK: {sys.argv[2]} ecrit ({_OUT.getvalue().count(chr(10))} lignes, UTF-8).")


if __name__ == "__main__":
    main()
