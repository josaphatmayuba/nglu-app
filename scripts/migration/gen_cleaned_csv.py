"""Genere des CSV "nettoyes" (donnees legacy transformees vers le schema cible nglu-app).

Reprend les memes regles/filtres/mappings que gen_compta_sql.py, gen_immo_sql.py,
gen_comm_sql.py, gen_users_devis_sql.py mais ecrit des lignes CSV (1 fichier par
table cible) au lieu de SQL. Les FK vers une autre table migree sont exprimees via
des CLES NATURELLES (mêmes que les scripts SQL: LEG-*, code, reference, username...)
puisque les ids AUTO reels ne sont connus qu'apres insertion en base.

Lecture SEULE des CSV sources (migration-data/export_tables_csv_schema/csv).
N'ECRIT JAMAIS dans une base.

Usage:
    py scripts/migration/gen_cleaned_csv.py <csv_dir_source> <csv_dir_out>
"""
import sys
import os
import csv
import re
import unicodedata
from collections import Counter


def clean(s):
    if s is None:
        return None
    s = str(s).strip()
    return s or None


def truthy(s):
    return str(s).strip().lower() == "true"


def trunc(s, n):
    s = clean(s)
    return None if s is None else s[:n]


def date_only(s):
    s = clean(s)
    return None if s is None else s[:10]


def num(v, default="0"):
    if v is None:
        return default
    s = str(v).strip().replace(",", ".")
    m = re.search(r"-?\d+(\.\d+)?", s)
    return m.group(0) if m else default


def num_or_none(v):
    s = clean(v)
    if s is None:
        return None
    s = s.replace(",", ".")
    try:
        float(s)
    except ValueError:
        return None
    return s


def slug(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]", "", s.lower())


def make_email(first, last, taken):
    fn = slug(first) or "user"
    ln = slug(last)
    base = f"{fn}.{ln}" if ln else fn
    email = f"{base}@ongdngolu.org"
    n = 2
    while email in taken:
        email = f"{base}{n}@ongdngolu.org"
        n += 1
    taken.add(email)
    return email


class Source:
    """Lit les tables depuis les CSV exportes (utf-8-sig, valeurs nettoyees)."""

    def __init__(self, csv_dir):
        self.csv_dir = csv_dir
        self._cache = {}
        self._files = {f.lower(): f for f in os.listdir(csv_dir)}

    def rows(self, table):
        if table in self._cache:
            return self._cache[table]
        target = f"{table}.csv".lower()
        fname = self._files.get(target)
        if fname is None:
            self._cache[table] = []
            return []
        path = os.path.join(self.csv_dir, fname)
        with open(path, "r", encoding="utf-8-sig", newline="") as f:
            rows = [{k: clean(v) for k, v in row.items()} for row in csv.DictReader(f)]
        self._cache[table] = rows
        return rows


class CsvWriter:
    """Accumule des lignes par table cible et ecrit a la fin."""

    def __init__(self, out_dir):
        self.out_dir = out_dir
        self.tables = {}  # table -> (fieldnames, rows)

    def add(self, table, fieldnames, row):
        if table not in self.tables:
            self.tables[table] = (fieldnames, [])
        self.tables[table][1].append(row)

    def write_all(self):
        os.makedirs(self.out_dir, exist_ok=True)
        for table, (fieldnames, rows) in self.tables.items():
            path = os.path.join(self.out_dir, f"{table}.csv")
            with open(path, "w", encoding="utf-8", newline="") as f:
                w = csv.DictWriter(f, fieldnames=fieldnames)
                w.writeheader()
                for r in rows:
                    w.writerow(r)
            print(f"  {table}.csv : {len(rows)} lignes")


# ============================================================
# DOMAINE 1 - COMPTA (cf. gen_compta_sql.py)
# ============================================================

ACCOUNT_MAP_TO_DEV = {"1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6}
ACCOUNT_INSERT = {"7": ("Locatif", "Revenue")}

# Sous-comptes de charge (accountId legacy 6 = "Depense") deja propres : conserves
# tels quels, jamais remappes (memes noms que la liste de garde de la migration 0149).
EXPENSE_GUARD_NAMES = {
    "cost of sales", "salary", "rent", "utilities", "discount given",
    "maintenance", "farmos expenses", "exchange fees",
    "cout des ventes", "loyer", "remise accordee",
}

# 8 categories canoniques de charge (mappees a partir des 88 sous-comptes "libelles
# d'operation" legacy par mots-cles, meme regroupement que la migration 0149).
# legacy_id synthetiques 9001-9008 (hors plage des ids legacy reels 1-90).
EXPENSE_CANONICAL = [
    ("9006", "Reparation et entretien", ["reparation", "réparation", "tracteur"]),
    ("9001", "Carburant et energie", ["carburant", "électrogène", "electrogene", "groupe élect", "groupe elect"]),
    ("9003", "Salaires et main-d oeuvre", ["salaire", "salary", "main-d", "main d", "personnel", "ration", "briquetier"]),
    ("9004", "Elevage et agriculture", ["porc", "poisson", "étang", "etang", "aliment", "pharmaceutique", "bétail", "betail", "manioc", "moulin", "porcherie", "sarclage"]),
    ("9002", "Travaux et chantiers", ["chantier", "travaux", "construction", "forage", "briqu", "ciment", "sable", "poussiere", "poussière"]),
    ("9005", "Transport et voyage", ["voyage", "transport", "paillage"]),
    ("9008", "Achats et approvisionnements", ["achat"]),
]
EXPENSE_MISC_ID, EXPENSE_MISC_NAME = "9007", "Frais de bureau et divers"


def expense_canonical_target(name):
    """Retourne (legacy_id, nom) du compte canonique pour un sous-compte de charge
    "libelle d'operation", ou None si le sous-compte est a conserver tel quel."""
    if slug(name) in {slug(n) for n in EXPENSE_GUARD_NAMES}:
        return None
    low = name.lower()
    for legacy_id, canon_name, keywords in EXPENSE_CANONICAL:
        if any(kw in low for kw in keywords):
            return legacy_id, canon_name
    return EXPENSE_MISC_ID, EXPENSE_MISC_NAME


def gen_compta(src, w):
    # account : 1-6 fusionnes sur dev (pas de ligne nouvelle), 7 (Locatif) insere.
    for legacy_id, (name, typ) in ACCOUNT_INSERT.items():
        w.add("account", ["legacy_id", "name", "type"], {
            "legacy_id": legacy_id, "name": name, "type": typ,
        })

    # subAccount : actifs + inactifs requis par un transactionType actif (cf. script SQL).
    all_sub = src.rows("subAccount")
    active = [s for s in all_sub if truthy(s.get("status"))]
    active_ids = {s["id"] for s in active}
    tt_active = [t for t in src.rows("transactionType") if truthy(t.get("status"))]
    needed_inactive = set()
    for t in tt_active:
        for ref in (t.get("debit_id"), t.get("credit_id")):
            if ref not in active_ids:
                needed_inactive.add(ref)
    sub = active + [s for s in all_sub if s["id"] in needed_inactive and not truthy(s.get("status"))]

    # Regroupement des sous-comptes de charge "libelles d'operation" (account_id=6)
    # vers 8 categories canoniques par nature (cf. migration 0149). Le detail de
    # chaque operation reste dans journal_entries.particulars.
    remap = {}  # legacy_id source -> legacy_id canonique
    canon_seen = {}  # legacy_id canonique -> nom
    for s in sub:
        if s["account_id"] != "6":
            continue
        target = expense_canonical_target(s["name"])
        if target is None:
            continue
        canon_id, canon_name = target
        remap[s["id"]] = canon_id
        canon_seen[canon_id] = canon_name

    sub = [s for s in sub if s["id"] not in remap]
    for canon_id, canon_name in sorted(canon_seen.items()):
        w.add("subAccount", ["legacy_id", "name", "account_legacy_id", "status"], {
            "legacy_id": canon_id,
            "name": canon_name,
            "account_legacy_id": "6",
            "status": "true",
        })
    for s in sub:
        w.add("subAccount", ["legacy_id", "name", "account_legacy_id", "status"], {
            "legacy_id": s["id"],
            "name": trunc(s["name"], 255),
            "account_legacy_id": s["account_id"],
            "status": "true" if truthy(s.get("status")) else "false",
        })
    print(f"  (subAccount : {len(remap)} sous-compte(s) de charge regroupes en {len(canon_seen)} categorie(s) canonique(s))")

    def remapped(legacy_id):
        return remap.get(legacy_id, legacy_id)

    # transaction_types : actifs, debit/credit en legacy_id subAccount (recablage via map).
    for t in tt_active:
        desc = t.get("details") or t.get("activity")
        w.add("transaction_types", ["legacy_id", "name", "debit_subaccount_legacy_id", "credit_subaccount_legacy_id", "description"], {
            "legacy_id": t["id"],
            "name": trunc(t["name"], 255),
            "debit_subaccount_legacy_id": remapped(t["debit_id"]),
            "credit_subaccount_legacy_id": remapped(t["credit_id"]),
            "description": desc,
        })

    # journal_entries + journal_entry_lines : actives, dedup (montant, devise, date).
    tx = [t for t in src.rows("transaction") if truthy(t.get("status"))]
    seen = set()
    deduped = []
    skipped = 0
    for t in tx:
        key = (str(t["amount"]), str(t.get("device_id")), str(t["date"]))
        if key in seen:
            skipped += 1
            continue
        seen.add(key)
        deduped.append(t)
    for t in deduped:
        particulars = trunc((t.get("particulars") or "(sans libelle)").replace("\n", " ").replace("\r", " "), 250)
        devise = "CDF" if t.get("device_id") == "1" else "USD"
        w.add("journal_entries", [
            "legacy_id", "date", "particulars", "currency", "amount",
            "debit_subaccount_legacy_id", "credit_subaccount_legacy_id",
            "source_module", "status",
        ], {
            "legacy_id": t["id"],
            "date": t["date"],
            "particulars": particulars,
            "currency": devise,
            "amount": t["amount"],
            "debit_subaccount_legacy_id": remapped(t["debit_id"]),
            "credit_subaccount_legacy_id": remapped(t["credit_id"]),
            "source_module": "legacy_migration",
            "status": "posted",
        })
    print(f"  (journal_entries : {skipped} doublon(s) montant+devise+date ignore(s))")


# ============================================================
# DOMAINE 2 - IMMOBILIER (cf. gen_immo_sql.py)
# ============================================================

TYPE_MAP = {
    "1": ("house", "house"),
    "10": ("building", "apartment"),
}
CONTRACT_CYCLE = {"1": "monthly", "2": "weekly", "3": "daily"}

# Regroupement des 19 lignes legacy "realestate" en residences reelles (decide avec
# l'utilisateur le 15/06/2026) — cf. RESIDENCES dans gen_immo_sql.py.
RESIDENCES = [
    {
        "code": "RES-BETITO",
        "name": "Residence Betito",
        "address": "17 Av. Betito, Bandalungwa",
        "property_type": "building",
        "members": [2, 10, 11, 12, 13, 14, 18],
    },
    {
        "code": "RES-BABOMA",
        "name": "Residence Baboma",
        "address": "30 D Quartier Baboma, Matete",
        "property_type": "building",
        "members": [5, 8, 9, 15, 19, 20],
    },
    {
        "code": "RES-BATEKE",
        "name": "Residence Bateke",
        "address": "18 A Quartier Bateke 2, Matete",
        "property_type": "building",
        "members": [3, 7],
    },
    {
        "code": "RES-KINKOLE",
        "name": "Residence Kinkole",
        "address": "13 Avenue Muenga, Quartier Kinkole, N'Sele",
        "property_type": "house",
        "members": [17],
    },
    {
        "code": "RES-GOMBE",
        "name": "Residence Gombe",
        "address": "7 Ave Le Marinel, Gombe",
        "property_type": "house",
        "members": [16],
    },
    {
        "code": "RES-KINKOLE2",
        "name": "Residence Kinkole 2",
        "address": "5 Avenue Muenga, N'Sele",
        "property_type": "building",
        "members": [6],
    },
    {
        "code": "RES-MAYENGE",
        "name": "Residence Mahenge",
        "address": "17 Rue de Mahenge, Kinshasa",
        "property_type": "building",
        "members": [4],
        # Vendue (15/06/2026) -> plus dans le portefeuille locatif actif.
        "sold": True,
    },
]


def gen_immo(src, w):
    prop_by_id = {int(p["id"]): p for p in src.rows("realestate")}
    contracts_active = [c for c in src.rows("contract") if truthy(c.get("status"))]
    occupied = {int(c["realestate_id"]) for c in contracts_active}
    rent_by_realestate = {int(c["realestate_id"]): num(c.get("rent_amount")) for c in contracts_active}

    for res in RESIDENCES:
        members = res["members"]
        any_occ = any(lid in occupied for lid in members)
        market = sum(int(num(prop_by_id[lid].get("purchase_price"))) for lid in members)
        w.add("real_estate_properties", [
            "code", "name", "property_type", "status", "address", "city",
            "country", "market_value", "currency", "is_active",
        ], {
            "code": res["code"],
            "name": res["name"],
            "property_type": res["property_type"],
            "status": "occupied" if any_occ else "available",
            "address": res["address"],
            "city": "Kinshasa",
            "country": "République démocratique du Congo",
            "market_value": market,
            "currency": "USD",
            "is_active": 0 if res.get("sold") else 1,
        })
        for lid in members:
            p = prop_by_id[lid]
            _, utype = TYPE_MAP.get(p.get("realestate_type_id"), ("building", "apartment"))
            is_occ = lid in occupied
            apnum = num(p.get("apartment_number"), "0")
            uname = f"AP {apnum}" if apnum != "0" else f"Unite {lid}"
            w.add("real_estate_units", [
                "property_legacy_id", "property_code", "unit_code", "name", "unit_type",
                "status", "monthly_rent", "currency", "is_active",
            ], {
                "property_legacy_id": lid,
                "property_code": res["code"],
                "unit_code": f"LEG-{lid}",
                "name": uname,
                "unit_type": utype,
                "status": "occupied" if is_occ else "vacant",
                "monthly_rent": rent_by_realestate.get(lid, "0"),
                "currency": "USD",
                "is_active": 0 if res.get("sold") else 1,
            })

    cust = [c for c in src.rows("customer") if truthy(c.get("status"))]
    for c in cust:
        lid = c["id"]
        uname = f"legacy-cust-{lid}"
        w.add("customer", [
            "legacy_id", "username", "firstName", "lastName", "phone", "email", "address",
            "password", "roleId", "status",
        ], {
            "legacy_id": lid,
            "username": uname,
            "firstName": trunc(c.get("first_name") or "", 255),
            "lastName": trunc(c.get("last_name") or f"Locataire {lid}", 255),
            "phone": trunc(c.get("phone"), 255),
            "email": trunc(c.get("email"), 255),
            "address": trunc(c.get("old_address"), 255),
            "password": "!migrated-no-login!",
            "roleId": 3,
            "status": "true",
        })
        w.add("tenant_details", [
            "customer_username", "birth_date", "sex", "nationality", "marital_status",
            "origin_province", "contacted_person", "contacted_person_phone_number",
            "prossional_status", "main_activity", "entity_name", "entity_address",
            "hiring_date", "contract_type", "monthly_pay", "old_address", "old_lessor",
            "moving_reason", "occupant_number", "child_number",
        ], {
            "customer_username": uname,
            "birth_date": date_only(c.get("birth_date")) or "1970-01-01",
            "sex": trunc(c.get("sex") or "N/A", 10),
            "nationality": trunc(c.get("nationality") or "N/A", 255),
            "marital_status": trunc(c.get("marital_status") or "N/A", 255),
            "origin_province": trunc(c.get("origin_province") or "N/A", 255),
            "contacted_person": trunc(c.get("contacted_person") or "N/A", 255),
            "contacted_person_phone_number": trunc(c.get("phone2") or "N/A", 255),
            "prossional_status": trunc(c.get("prossional_status") or "N/A", 255),
            "main_activity": trunc(c.get("main_activity") or "N/A", 255),
            "entity_name": trunc(c.get("entity_name") or "N/A", 255),
            "entity_address": trunc(c.get("entity_address") or "N/A", 255),
            "hiring_date": date_only(c.get("hiring_date")) or "1970-01-01",
            "contract_type": trunc(c.get("contract_type") or "N/A", 255),
            "monthly_pay": num(c.get("monthly_pay")),
            "old_address": trunc(c.get("old_address") or "N/A", 255),
            "old_lessor": trunc(c.get("old_lessor") or "N/A", 255),
            "moving_reason": trunc(c.get("moving_reason") or "N/A", 255),
            "occupant_number": num(c.get("occupant_number"), "1"),
            "child_number": num(c.get("child_number")),
        })

    for c in contracts_active:
        lid = c["id"]
        cycle = CONTRACT_CYCLE.get(c.get("contract_type_id"), "monthly")
        w.add("real_estate_leases", [
            "legacy_id", "reference", "unit_code", "tenant_username", "start_date",
            "end_date", "billing_cycle", "rent_amount", "currency", "status",
        ], {
            "legacy_id": lid,
            "reference": f"LEG-BAIL-{lid}",
            "unit_code": f"LEG-{c['realestate_id']}",
            "tenant_username": f"legacy-cust-{c['customer_id']}",
            "start_date": date_only(c.get("start_date")) or "2023-01-01",
            "end_date": date_only(c.get("end_date")),
            "billing_cycle": cycle,
            "rent_amount": num(c.get("rent_amount")),
            "currency": "USD",
            "status": "expired",
        })

    contract_ids_active = {c["id"] for c in contracts_active}
    rp = [r for r in src.rows("rent_payment") if r.get("contract_id") in contract_ids_active]
    paid = [r for r in rp if r.get("payment") and float(r["payment"]) > 0]
    for r in paid:
        lid = r["id"]
        pdate = date_only(r.get("payment_date")) or date_only(r.get("planned_payment_date")) or "2023-01-01"
        w.add("real_estate_rent_payments", [
            "legacy_id", "reference", "lease_reference", "currency", "payment_date", "amount", "method",
        ], {
            "legacy_id": lid,
            "reference": f"legacy-rp-{lid}",
            "lease_reference": f"LEG-BAIL-{r['contract_id']}",
            "currency": "USD",
            "payment_date": pdate,
            "amount": num(r.get("payment")),
            "method": "cash",
        })


# ============================================================
# DOMAINE 3 - COMMERCIAL (cf. gen_comm_sql.py)
# ============================================================

def gen_comm(src, w):
    pc = src.rows("product_category")
    for c in pc:
        lid = c["id"]
        name = trunc(c["name"], 255)
        w.add("productCategory", ["legacy_id", "name"], {"legacy_id": lid, "name": name})
        w.add("productSubCategory", ["legacy_id", "name", "category_legacy_id", "status"], {
            "legacy_id": lid, "name": name, "category_legacy_id": lid, "status": "true",
        })

    prod = [p for p in src.rows("product") if truthy(p.get("status"))]
    for p in prod:
        lid = p["id"]
        w.add("product", [
            "legacy_id", "sku", "name", "subcategory_legacy_id", "productQuantity",
            "productSalePrice", "productPurchasePrice", "reorderQuantity", "status",
        ], {
            "legacy_id": lid,
            "sku": f"LEG-PROD-{lid}",
            "name": trunc(p["name"], 255),
            "subcategory_legacy_id": p.get("product_category_id") or "",
            "productQuantity": num(p.get("quantity")),
            "productSalePrice": num(p.get("sale_price")),
            "productPurchasePrice": num(p.get("purchase_price")),
            "reorderQuantity": num(p.get("reorder_quantity")),
            "status": "true",
        })

    sup = [s for s in src.rows("supplier") if truthy(s.get("status"))]
    for s in sup:
        w.add("supplier", ["legacy_id", "name", "phone", "address", "status"], {
            "legacy_id": s["id"],
            "name": trunc(s["name"], 255),
            "phone": trunc(s.get("phone") or "N/A", 255),
            "address": trunc(s.get("address"), 255),
            "status": "true",
        })

    si = src.rows("saleInvoice")
    sip = src.rows("saleInvoiceProduct")
    by_inv = {}
    for r in sip:
        by_inv.setdefault(r["invoice_id"], []).append(r)
    for s in si:
        lid = s["id"]
        newid = f"LEG-S{lid}"
        devise = "CDF" if s.get("devise_id") == "1" else "USD"
        w.add("saleInvoice", [
            "legacy_id", "id", "date", "totalAmount", "totalDiscountAmount", "paidAmount",
            "dueAmount", "profit", "customer_legacy_id", "currency", "note",
        ], {
            "legacy_id": lid,
            "id": newid,
            "date": s["date"],
            "totalAmount": num(s.get("total_amount")),
            "totalDiscountAmount": num(s.get("discount")),
            "paidAmount": num(s.get("paid_amount")),
            "dueAmount": num(s.get("due_amount")),
            "profit": num(s.get("profit")),
            "customer_legacy_id": s.get("customer_id") or "",
            "currency": devise,
            "note": trunc(s.get("note"), 65535),
        })
        for line in by_inv.get(lid, []):
            qte = num(line.get("product_quantity"), "1")
            pu = num(line.get("product_sale_price"))
            final = str(round(float(qte) * float(pu), 2))
            w.add("saleInvoiceProduct", [
                "invoiceId", "product_legacy_id", "productQuantity", "productUnitSalePrice", "productFinalAmount",
            ], {
                "invoiceId": newid,
                "product_legacy_id": line["product_id"],
                "productQuantity": qte,
                "productUnitSalePrice": pu,
                "productFinalAmount": final,
            })

    pi = src.rows("purchaseInvoice")
    pip = src.rows("purchaseInvoiceProduct")
    by_inv = {}
    for r in pip:
        by_inv.setdefault(r["invoice_id"], []).append(r)
    for p in pi:
        lid = p["id"]
        newid = f"LEG-P{lid}"
        devise = "CDF" if p.get("devise_id") == "1" else "USD"
        w.add("purchaseInvoice", [
            "legacy_id", "id", "date", "totalAmount", "paidAmount", "dueAmount",
            "supplier_legacy_id", "currency", "note", "supplierMemoNo",
        ], {
            "legacy_id": lid,
            "id": newid,
            "date": p["date"],
            "totalAmount": num(p.get("total_amount")),
            "paidAmount": num(p.get("paid_amount")),
            "dueAmount": num(p.get("due_amount")),
            "supplier_legacy_id": p.get("supplier_id") or "",
            "currency": devise,
            "note": trunc(p.get("note"), 65535),
            "supplierMemoNo": trunc(p.get("supplier_memo_no"), 255),
        })
        for line in by_inv.get(lid, []):
            qte = num(line.get("product_quantity"), "1")
            pu = num(line.get("product_purchase_price"))
            final = str(round(float(qte) * float(pu), 2))
            w.add("purchaseInvoiceProduct", [
                "invoiceId", "product_legacy_id", "productQuantity", "productUnitPurchasePrice", "productFinalAmount",
            ], {
                "invoiceId": newid,
                "product_legacy_id": line["product_id"],
                "productQuantity": qte,
                "productUnitPurchasePrice": pu,
                "productFinalAmount": final,
            })


# ============================================================
# DOMAINE 4 - USERS / DEVIS (cf. gen_users_devis_sql.py)
# ============================================================

DEVIS_STATUS = {
    "Approuver": "approved",
    "Envoyé": "sent",
    "EnvoyÃ©": "sent",
    "Refuser": "rejected",
    "En traitement": "draft",
}


def uniq(values):
    seen = set()
    res = []
    for v in values:
        v = clean(v)
        if not v:
            continue
        k = v.lower()
        if k in seen:
            continue
        seen.add(k)
        res.append(v)
    return res


def gen_users_devis(src, w):
    users = [u for u in src.rows("user") if truthy(u.get("status"))]
    legacy_desig = {str(d.get("id")): clean(d.get("name")) for d in src.rows("designation") if clean(d.get("id")) and clean(d.get("name"))}

    role_names = uniq(u.get("role") for u in users)
    dept_names = uniq(
        [u.get("department") for u in users]
        + [legacy_desig.get(str(u.get("designation_id"))) for u in users]
    )
    for name in role_names:
        w.add("designations", ["name", "status"], {"name": trunc(name, 255), "status": "true"})
    for name in dept_names:
        w.add("department", ["name", "status"], {"name": trunc(name, 255), "status": "true"})

    taken = set()
    for u in users:
        uuid = u["uuid"]
        email = make_email(u.get("first_name"), u.get("last_name"), taken)
        username = email.split("@")[0]
        role_name = clean(u.get("role"))
        dept_name = clean(u.get("department")) or legacy_desig.get(str(u.get("designation_id")))
        w.add("users", [
            "legacy_uuid", "username", "firstName", "lastName", "email", "phone", "password",
            "roleId", "status", "employeeId", "joinDate", "leaveDate", "birthDate", "street",
            "bloodGroup", "image", "designation_name", "department_name",
        ], {
            "legacy_uuid": uuid,
            "username": username,
            "firstName": trunc(u.get("first_name") or "", 255),
            "lastName": trunc(u.get("last_name") or "", 255),
            "email": email,
            "phone": trunc(u.get("phone"), 255),
            "password": u.get("password") or "!migrated-no-login!",
            "roleId": 3,
            "status": "true",
            "employeeId": trunc(u.get("id_no"), 255),
            "joinDate": clean(u.get("join_date")),
            "leaveDate": clean(u.get("leave_date")),
            "birthDate": date_only(u.get("birthday")),
            "street": trunc(u.get("address"), 255),
            "bloodGroup": trunc(u.get("blood_group"), 255),
            "image": trunc(u.get("image"), 255),
            "designation_name": role_name,
            "department_name": dept_name,
        })

        salary = num_or_none(u.get("salary"))
        if salary is not None and float(salary) > 0:
            devise_id = clean(u.get("devise_id"))
            if devise_id == "1":
                currency = "CDF"
            elif devise_id == "2":
                currency = "USD"
            elif float(salary) >= 1000:
                currency = "CDF"
            else:
                currency = "USD"
            start = date_only(u.get("join_date"))
            w.add("salary_histories", ["legacy_uuid", "salary", "currency", "startDate", "endDate", "comment"], {
                "legacy_uuid": uuid,
                "salary": salary,
                "currency": currency,
                "startDate": start,
                "endDate": date_only(u.get("leave_date")),
                "comment": f"[LEG-USER-{uuid}] Salaire legacy user.csv",
            })

        if role_name:
            w.add("designation_histories", ["legacy_uuid", "designation_name", "startDate", "endDate", "comment"], {
                "legacy_uuid": uuid,
                "designation_name": role_name,
                "startDate": date_only(u.get("join_date")),
                "endDate": date_only(u.get("leave_date")),
                "comment": f"[LEG-USER-{uuid}] Poste legacy user.csv: {role_name}",
            })

    dv = [d for d in src.rows("Devis") if truthy(d.get("status"))]
    for d in dv:
        lid = d["id"]
        status = DEVIS_STATUS.get(d.get("state_status"), "draft")
        ref = f"LEG-DEVIS-{lid}"
        desc = d.get("description") or ""
        w.add("quote", ["legacy_id", "reference", "quoteName", "owner_legacy_uuid", "totalAmount", "note", "status"], {
            "legacy_id": lid,
            "reference": ref,
            "quoteName": trunc(d.get("subject") or f"Devis {lid}", 255),
            "owner_legacy_uuid": d.get("creator_id") or "",
            "totalAmount": 0,
            "note": trunc(f"[{ref}] {desc}", 65535),
            "status": status,
        })


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return
    csv_in, csv_out = sys.argv[1], sys.argv[2]
    src = Source(csv_in)
    w = CsvWriter(csv_out)

    print("Compta:")
    gen_compta(src, w)
    print("Immobilier:")
    gen_immo(src, w)
    print("Commercial:")
    gen_comm(src, w)
    print("Users/Devis:")
    gen_users_devis(src, w)

    print(f"\nEcriture dans {csv_out} :")
    w.write_all()


if __name__ == "__main__":
    main()
