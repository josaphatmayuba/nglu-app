"""Generateur SQL commercial : legacy PostgreSQL -> nglu-app (product/ventes/achats/devis).

Tables cibles VIDES en local -> ids AUTO + tables de correspondance.
Decisions :
  - product (24 actifs, 1 exclu) -> product. category -> productCategory (+ une productSubCategory
    par categorie car product cible pointe productSubCategoryId, pas categoryId).
  - supplier (4) -> supplier.
  - saleInvoice (11, pas de status) -> saleInvoice. customer_id recable via legacy_customer_map
    (deja peuple par l'immo). user_id (uuid) -> NULL pour l'instant (mapping users plus tard).
  - saleInvoiceProduct (11) -> saleInvoiceProduct. product_id recable via legacy_product_map.
  - purchaseInvoice (1) + purchaseInvoiceProduct (1) -> idem.
  - Devis (38) -> quote.

Montants : double cote cible (productSalePrice etc.) -> on garde tel quel.
saleInvoice.id cible = varchar -> on prefixe 'LEG-' + id legacy.

NE TOUCHE AUCUNE BASE. Produit un .sql relu avant application.

Usage:
    py scripts/migration/gen_comm_sql.py "<.sql>" scripts/sql/0152_legacy_comm.sql
"""
import sys
import io
from pg_parse import read_sql, rows_as_dicts

_OUT = io.StringIO()


def out(line=""):
    _OUT.write(line + "\n")


def bp():
    out("--> statement-breakpoint")


# CDF=franc congolais (symbole FC), USD=dollar (symbole $). On cible le SYMBOLE (non
# ambigu : 'FRANC' id 12 existe aussi). currencyCode est NULL en base.
CUR_USD = "(SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1)"
CUR_CDF = "(SELECT id FROM currency WHERE currencySymbol = 'FC' ORDER BY id LIMIT 1)"


def cur_sub(devise_id):
    return CUR_CDF if devise_id == "1" else CUR_USD


def q(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


def trunc(s, n):
    return None if s is None else str(s)[:n]


def numv(v, default="0"):
    if v is None:
        return default
    try:
        float(v)
        return str(v)
    except ValueError:
        return default


def emit_header():
    out("-- ============================================================")
    out("-- Migration commercial legacy -> nglu-app (GENERE)")
    out("-- Statements AUTONOMES (--> statement-breakpoint, pas de @var). Recablage par cle")
    out("-- naturelle : product.sku='LEG-PROD-<id>', category/supplier par nom. Idempotent.")
    out("-- ============================================================")
    for t in ("category", "subcategory", "product", "supplier"):
        out(f"CREATE TABLE IF NOT EXISTS legacy_{t}_map (legacy_id INT PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
        bp()


def emit_categories(sql):
    pc = rows_as_dicts(sql, "product_category")
    out(f"-- === productCategory + 1 productSubCategory par categorie ({len(pc)}) ===")
    for c in pc:
        lid = c["id"]
        name = trunc(c["name"], 255)
        # 1) categorie (idempotent par nom)
        out(f"INSERT INTO productCategory (name, created_at) SELECT {q(name)}, NOW() FROM DUAL "
            f"WHERE NOT EXISTS (SELECT 1 FROM productCategory WHERE name={q(name)});")
        bp()
        out(f"INSERT INTO legacy_category_map (legacy_id, new_id) "
            f"SELECT {lid}, id FROM productCategory WHERE name={q(name)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
        # 2) sous-categorie miroir (product cible reference productSubCategoryId)
        catsel = f"(SELECT new_id FROM legacy_category_map WHERE legacy_id={lid})"
        out(f"INSERT INTO productSubCategory (name, productCategoryId, status, created_at) "
            f"SELECT {q(name)}, {catsel}, 'true', NOW() FROM DUAL "
            f"WHERE NOT EXISTS (SELECT 1 FROM legacy_subcategory_map WHERE legacy_id={lid});")
        bp()
        out(f"INSERT INTO legacy_subcategory_map (legacy_id, new_id) "
            f"SELECT {lid}, id FROM productSubCategory WHERE productCategoryId={catsel} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_products(sql):
    prod = [p for p in rows_as_dicts(sql, "product") if p.get("status") == "true"]
    out(f"-- === product ({len(prod)} actifs) ===")
    out("-- sku force a 'LEG-PROD-<id>' : cle naturelle unique pour le recablage (les sku")
    out("-- legacy sont peu fiables/absents). Idempotent par ce sku.")
    for p in prod:
        lid = p["id"]
        name = trunc(p["name"], 255)
        sub = p.get("product_category_id")
        sub_sel = f"(SELECT new_id FROM legacy_subcategory_map WHERE legacy_id={sub})" if sub else "NULL"
        sku = f"LEG-PROD-{lid}"
        out(f"INSERT INTO product (organization_id, name, productSubCategoryId, sku, productQuantity, productSalePrice, productPurchasePrice, reorderQuantity, status, created_at) "
            f"SELECT 1, {q(name)}, {sub_sel}, {q(sku)}, {numv(p.get('quantity'))}, "
            f"{numv(p.get('sale_price'))}, {numv(p.get('purchase_price'))}, {numv(p.get('reorder_quantity'))}, 'true', NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM product WHERE sku={q(sku)});")
        bp()
        out(f"INSERT INTO legacy_product_map (legacy_id, new_id) "
            f"SELECT {lid}, id FROM product WHERE sku={q(sku)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_suppliers(sql):
    sup = [s for s in rows_as_dicts(sql, "supplier") if s.get("status") == "true"]
    out(f"-- === supplier ({len(sup)}) ===")
    for s in sup:
        lid = s["id"]
        name = trunc(s["name"], 255)
        out(f"INSERT INTO supplier (name, phone, address, status, created_at) "
            f"SELECT {q(name)}, {q(trunc(s.get('phone') or 'N/A',255))}, {q(trunc(s.get('address'),255))}, 'true', NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM supplier WHERE name={q(name)});")
        bp()
        out(f"INSERT INTO legacy_supplier_map (legacy_id, new_id) "
            f"SELECT {lid}, id FROM supplier WHERE name={q(name)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_sale_invoices(sql):
    si = rows_as_dicts(sql, "saleInvoice")  # pas de status
    sip = rows_as_dicts(sql, "saleInvoiceProduct")
    by_inv = {}
    for r in sip:
        by_inv.setdefault(r["invoice_id"], []).append(r)
    out(f"-- === saleInvoice ({len(si)}) + saleInvoiceProduct. id cible varchar -> 'LEG-S<id>'. ===")
    out("-- customer_id recable via legacy_customer_map. user_id=NULL (mapping users plus tard).")
    for s in si:
        lid = s["id"]
        newid = f"LEG-S{lid}"
        cur = cur_sub(s.get("devise_id"))
        out(f"INSERT INTO saleInvoice (id, organization_id, date, totalAmount, totalDiscountAmount, paidAmount, dueAmount, profit, customerId, currencyId, userId, note, created_at) "
            f"SELECT {q(newid)}, 1, {q(s['date'])}, {numv(s.get('total_amount'))}, {numv(s.get('discount'))}, {numv(s.get('paid_amount'))}, {numv(s.get('due_amount'))}, {numv(s.get('profit'))}, "
            f"(SELECT new_id FROM legacy_customer_map WHERE legacy_id={s.get('customer_id')}), {cur}, NULL, {q(trunc(s.get('note'),65535))}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoice WHERE id={q(newid)});")
        bp()
        for line in by_inv.get(lid, []):
            # productFinalAmount = quantite x prix unitaire (pas juste le prix unitaire).
            qte = numv(line.get("product_quantity"), "1")
            pu = numv(line.get("product_sale_price"))
            final = str(round(float(qte) * float(pu), 2))
            out(f"INSERT INTO saleInvoiceProduct (invoiceId, productId, productQuantity, productUnitSalePrice, productFinalAmount, created_at) "
                f"SELECT {q(newid)}, (SELECT new_id FROM legacy_product_map WHERE legacy_id={line['product_id']}), "
                f"{qte}, {pu}, {final}, NOW() "
                f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM saleInvoiceProduct WHERE invoiceId={q(newid)} AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id={line['product_id']}));")
            bp()
    out()


def emit_purchase_invoices(sql):
    pi = rows_as_dicts(sql, "purchaseInvoice")
    pip = rows_as_dicts(sql, "purchaseInvoiceProduct")
    by_inv = {}
    for r in pip:
        by_inv.setdefault(r["invoice_id"], []).append(r)
    out(f"-- === purchaseInvoice ({len(pi)}) + purchaseInvoiceProduct. id cible varchar -> 'LEG-P<id>'. ===")
    for p in pi:
        lid = p["id"]
        newid = f"LEG-P{lid}"
        cur = cur_sub(p.get("devise_id"))
        # purchaseInvoice n'a PAS de colonne discount (verifie information_schema) -> on l'omet.
        out(f"INSERT INTO purchaseInvoice (id, organization_id, date, totalAmount, paidAmount, dueAmount, supplierId, currencyId, note, supplierMemoNo, created_at) "
            f"SELECT {q(newid)}, 1, {q(p['date'])}, {numv(p.get('total_amount'))}, {numv(p.get('paid_amount'))}, {numv(p.get('due_amount'))}, "
            f"(SELECT new_id FROM legacy_supplier_map WHERE legacy_id={p.get('supplier_id')}), {cur}, {q(trunc(p.get('note'),65535))}, {q(trunc(p.get('supplier_memo_no'),255))}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM purchaseInvoice WHERE id={q(newid)});")
        bp()
        for line in by_inv.get(lid, []):
            qte = numv(line.get("product_quantity"), "1")
            pu = numv(line.get("product_purchase_price"))
            final = str(round(float(qte) * float(pu), 2))
            out(f"INSERT INTO purchaseInvoiceProduct (invoiceId, productId, productQuantity, productUnitPurchasePrice, productFinalAmount, created_at) "
                f"SELECT {q(newid)}, (SELECT new_id FROM legacy_product_map WHERE legacy_id={line['product_id']}), "
                f"{qte}, {pu}, {final}, NOW() "
                f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM purchaseInvoiceProduct WHERE invoiceId={q(newid)} AND productId=(SELECT new_id FROM legacy_product_map WHERE legacy_id={line['product_id']}));")
            bp()
    out()


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return
    sql = read_sql(sys.argv[1])
    emit_header()
    emit_categories(sql)
    emit_products(sql)
    emit_suppliers(sql)
    emit_sale_invoices(sql)
    emit_purchase_invoices(sql)
    with open(sys.argv[2], "w", encoding="utf-8", newline="\n") as f:
        f.write(_OUT.getvalue())
    print(f"OK: {sys.argv[2]} ecrit ({_OUT.getvalue().count(chr(10))} lignes, UTF-8).")


if __name__ == "__main__":
    main()
