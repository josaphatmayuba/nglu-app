"""Generateur SQL immobilier : legacy PostgreSQL -> Domus (real_estate_*) nglu-app.

Decalage de modele : legacy realestate -> contract -> rent_payment (sans unite).
Cible : property -> unit -> lease -> rent_payment.

Decisions (13/06/2026, regroupement residences le 15/06/2026) :
  - realestate : les 19 lignes legacy = 19 appartements/biens repartis sur 7 residences
    reelles (voir RESIDENCES). Chaque residence -> 1 real_estate_properties ; chaque
    legacy_id -> 1 real_estate_units (nom = "AP <apartment_number>"). property.status=
    'occupied' si au moins 1 unite occupee par un bail actif, sinon 'available'.
    unit.status='vacant' par defaut, 'occupied' si bail actif sur ce legacy_id.
  - contract : migrer les 6 actifs (status=true). Tous expires (end_date < today) -> 'expired'.
  - rent_payment : seulement ceux des 6 baux actifs (122). status legacy -> statut paiement.
  - customer : les 19 (tous actifs) -> customer + tenant_details. Champs texte non-numeriques
    (monthly_pay, occupant_number = "non mentionne") -> 0. password = placeholder.

Anti-collision : real_estate_properties a deja 7 lignes en local -> ids AUTO + tables de
correspondance legacy_property_map / legacy_customer_map / legacy_lease_map.

NE TOUCHE AUCUNE BASE. Produit un .sql relu avant application.

Usage:
    py scripts/migration/gen_immo_sql.py "<.sql>" scripts/sql/0151_legacy_immo.sql
"""
import sys
import io
import re
from pg_parse import read_sql, rows_as_dicts

_OUT = io.StringIO()


def out(line=""):
    _OUT.write(line + "\n")


def bp():
    out("--> statement-breakpoint")


# Devises par NOM (currencyCode NULL en base). USD = DOLLAR.
# Devise par currencyName EXACT + MIN(id) actif (aligne sur migration 0143). CDF =
# 'FRANC CONGOLAIS', USD = 'DOLLAR'. Pas de symbole (mojibake) ni de LIKE (ambigu 'FRANC').
CUR_USD = "(SELECT MIN(id) FROM currency WHERE currencyName = 'DOLLAR' AND status = 'true')"
CUR_CDF = "(SELECT MIN(id) FROM currency WHERE currencyName = 'FRANC CONGOLAIS' AND status = 'true')"

# realestate_type -> property_type / unit_type Domus
TYPE_MAP = {
    "1": ("house", "house"),         # Maison
    "10": ("building", "apartment"), # Appartement
    # 11/12 = des adresses, pas de vrais types -> apartment par defaut
}


def q(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


def num(v, default="0"):
    """Convertit en nombre ; texte non-numerique (ex: 'non mentionne') -> default."""
    if v is None:
        return default
    s = str(v).strip().replace(",", ".")
    m = re.search(r"-?\d+(\.\d+)?", s)
    return m.group(0) if m else default


def trunc(s, n):
    return None if s is None else str(s)[:n]


def date_only(v):
    """timestamp legacy -> 'YYYY-MM-DD' (colonnes date cible en mode string)."""
    if not v:
        return None
    return str(v)[:10]


def emit_header():
    out("-- ============================================================")
    out("-- Migration immobilier legacy -> Domus real_estate_* (GENERE)")
    out("-- Cible : nglu_db / conteneur nglu_mysql (DEV LOCAL).")
    out("-- Statements AUTONOMES (--> statement-breakpoint, pas de @var) : compatible pipeline.")
    out("-- Recablage par cle naturelle : property.code='LEG-<id>', lease.reference, etc.")
    out("-- ============================================================")
    for t in ("property", "customer", "lease"):
        out(f"CREATE TABLE IF NOT EXISTS legacy_{t}_map (legacy_id INT PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
        bp()
    out("CREATE TABLE IF NOT EXISTS legacy_unit_map (legacy_property_id INT PRIMARY KEY, new_unit_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    bp()


# Regroupement des 19 lignes legacy "realestate" en residences reelles (decide avec
# l'utilisateur le 15/06/2026). Chaque residence = 1 real_estate_properties, chaque
# legacy_id d'origine devient une real_estate_units (nom = appartement d'origine).
RESIDENCES = [
    {
        "code": "RES-BETITO",
        "name": "Residence Betito",
        "address": "17 Av. Betito",
        "municipality": "Bandalungwa",
        "property_type": "building",
        "members": [2, 10, 11, 12, 13, 14, 18],
    },
    {
        "code": "RES-BABOMA",
        "name": "Residence Baboma",
        "address": "30 D Quartier Baboma",
        "municipality": "Matete",
        "property_type": "building",
        "members": [5, 8, 9, 15, 19, 20],
    },
    {
        "code": "RES-BATEKE",
        "name": "Residence Bateke",
        "address": "18 A Quartier Bateke 2",
        "municipality": "Matete",
        "property_type": "building",
        "members": [3, 7],
    },
    {
        "code": "RES-KINKOLE",
        "name": "Residence Kinkole",
        "address": "13 Avenue Muenga, Quartier Kinkole",
        "municipality": "N'Sele",
        "property_type": "house",
        "members": [17],
    },
    {
        "code": "RES-GOMBE",
        "name": "Residence Gombe",
        "address": "7 Ave Le Marinel",
        "municipality": "Gombe",
        "property_type": "house",
        "members": [16],
    },
    {
        "code": "RES-KINKOLE2",
        "name": "Residence Kinkole 2",
        "address": "5 Avenue Muenga",
        "municipality": "N'Sele",
        "property_type": "building",
        "members": [6],
    },
    {
        "code": "RES-MAYENGE",
        "name": "Residence Mahenge",
        "address": "17 Rue de Mahenge",
        "municipality": "Kinshasa",
        "property_type": "building",
        "members": [4],
        # Vendue (15/06/2026) -> plus dans le portefeuille locatif actif.
        "sold": True,
    },
]


def emit_properties(sql):
    prop_by_id = {int(p["id"]): p for p in rows_as_dicts(sql, "realestate")}
    # biens occupes par un bail actif -> status occupied
    contracts = [c for c in rows_as_dicts(sql, "contract") if c.get("status") == "true"]
    occupied = {int(c["realestate_id"]) for c in contracts}
    rent_by_realestate = {int(c["realestate_id"]): num(c.get("rent_amount")) for c in contracts}
    out(f"-- === real_estate_properties ({len(RESIDENCES)} residences, {sum(len(r['members']) for r in RESIDENCES)} unites legacy) ===")
    for res in RESIDENCES:
        members = res["members"]
        any_occ = any(lid in occupied for lid in members)
        status = "occupied" if any_occ else "available"
        city = "Kinshasa"
        addr = res["address"] + (f", {res['municipality']}" if res["municipality"] else "")
        market = sum(int(num(prop_by_id[lid].get("purchase_price"))) for lid in members)
        code = res["code"]
        is_active = 0 if res.get("sold") else 1
        # 1) la residence (idempotent par code)
        out(f"INSERT INTO real_estate_properties (organization_id, name, code, property_type, status, address, city, country, market_value, currency_id, is_active, created_at) "
            f"SELECT 1, {q(res['name'])}, {q(code)}, {q(res['property_type'])}, {q(status)}, {q(addr)}, {q(city)}, 'République démocratique du Congo', {market}, {CUR_USD}, {is_active}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_properties WHERE code={q(code)});")
        bp()
        for lid in members:
            # 2) map legacy_id -> id de la residence (retrouve par code)
            out(f"INSERT INTO legacy_property_map (legacy_id, new_id) "
                f"SELECT {lid}, id FROM real_estate_properties WHERE code={q(code)} ORDER BY id LIMIT 1 "
                f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
            bp()
            # 3) 1 unite par legacy_id (idempotent via legacy_unit_map)
            p = prop_by_id[lid]
            is_occ = lid in occupied
            ustatus = "occupied" if is_occ else "vacant"
            _, utype = TYPE_MAP.get(p.get("realestate_type_id"), ("building", "apartment"))
            apnum = num(p.get("apartment_number"), "0")
            uname = f"AP {apnum}" if apnum != "0" else f"Unite {lid}"
            rent = rent_by_realestate.get(lid, "0")
            out(f"INSERT INTO real_estate_units (organization_id, property_id, name, unit_type, status, monthly_rent, currency_id, is_active, created_at) "
                f"SELECT 1, (SELECT new_id FROM legacy_property_map WHERE legacy_id={lid}), {q(uname)}, {q(utype)}, {q(ustatus)}, {rent}, {CUR_USD}, {is_active}, NOW() "
                f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM legacy_unit_map WHERE legacy_property_id={lid});")
            bp()
            # 4) map legacy_id -> unit_id
            out(f"INSERT INTO legacy_unit_map (legacy_property_id, new_unit_id) "
                f"SELECT {lid}, id FROM real_estate_units WHERE property_id=(SELECT new_id FROM legacy_property_map WHERE legacy_id={lid}) AND name={q(uname)} ORDER BY id LIMIT 1 "
                f"ON DUPLICATE KEY UPDATE new_unit_id=VALUES(new_unit_id);")
            bp()
    out()


def emit_customers(sql):
    cust = [c for c in rows_as_dicts(sql, "customer") if c.get("status") == "true"]
    out(f"-- === customer + tenant_details ({len(cust)}) ===")
    for c in cust:
        lid = c["id"]
        fn = trunc(c.get("first_name") or "", 255)
        ln = trunc(c.get("last_name") or f"Locataire {lid}", 255)
        phone = trunc(c.get("phone"), 255)
        email = trunc(c.get("email"), 255)
        addr = trunc(c.get("old_address"), 255)
        # username sert de cle naturelle unique pour le recablage (legacy-cust-<id>).
        uname = f"legacy-cust-{lid}"
        # 1) le customer (idempotent par username marqueur)
        out(f"INSERT INTO customer (organization_id, firstName, lastName, username, phone, email, address, password, roleId, status, created_at) "
            f"SELECT 1, {q(fn)}, {q(ln)}, {q(uname)}, {q(phone)}, {q(email)}, {q(addr)}, '!migrated-no-login!', 3, 'true', NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM customer WHERE username={q(uname)});")
        bp()
        # 2) map legacy_id -> id (retrouve par username)
        out(f"INSERT INTO legacy_customer_map (legacy_id, new_id) "
            f"SELECT {lid}, id FROM customer WHERE username={q(uname)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
        # tenant_details (NOT NULL -> defauts). Champs texte->num nettoyes.
        bd = date_only(c.get("birth_date")) or "1970-01-01"
        sex = trunc(c.get("sex") or "N/A", 10)
        hd = date_only(c.get("hiring_date")) or "1970-01-01"
        cidsel = f"(SELECT new_id FROM legacy_customer_map WHERE legacy_id={lid})"
        out(f"INSERT INTO tenant_details (customer_id, birth_date, sex, nationality, marital_status, origin_province, contacted_person, contacted_person_phone_number, prossional_status, main_activity, entity_name, entity_address, hiring_date, contract_type, monthly_pay, old_address, old_lessor, moving_reason, occupant_number, child_number, created_at) "
            f"SELECT {cidsel}, {q(bd)}, {q(sex)}, {q(trunc(c.get('nationality') or 'N/A',255))}, {q(trunc(c.get('marital_status') or 'N/A',255))}, "
            f"{q(trunc(c.get('origin_province') or 'N/A',255))}, {q(trunc(c.get('contacted_person') or 'N/A',255))}, {q(trunc(c.get('phone2') or 'N/A',255))}, "
            f"{q(trunc(c.get('prossional_status') or 'N/A',255))}, {q(trunc(c.get('main_activity') or 'N/A',255))}, {q(trunc(c.get('entity_name') or 'N/A',255))}, "
            f"{q(trunc(c.get('entity_address') or 'N/A',255))}, {q(hd)}, {q(trunc(c.get('contract_type') or 'N/A',255))}, {num(c.get('monthly_pay'))}, "
            f"{q(trunc(c.get('old_address') or 'N/A',255))}, {q(trunc(c.get('old_lessor') or 'N/A',255))}, {q(trunc(c.get('moving_reason') or 'N/A',255))}, "
            f"{num(c.get('occupant_number'),'1')}, {num(c.get('child_number'))}, NOW() "
            f"FROM DUAL WHERE {cidsel} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_details WHERE customer_id={cidsel});")
        bp()
    out()


CONTRACT_CYCLE = {"1": "monthly", "2": "weekly", "3": "daily"}


def emit_leases(sql):
    contracts = [c for c in rows_as_dicts(sql, "contract") if c.get("status") == "true"]
    out(f"-- === real_estate_leases ({len(contracts)} baux actifs, tous expires) ===")
    for c in contracts:
        lid = c["id"]
        cycle = CONTRACT_CYCLE.get(c.get("contract_type_id"), "monthly")
        rent = num(c.get("rent_amount"))
        start = date_only(c.get("start_date")) or "2023-01-01"
        end = date_only(c.get("end_date"))
        ref = f"LEG-BAIL-{lid}"  # cle naturelle unique
        # 1) le bail (idempotent par reference)
        out(f"INSERT INTO real_estate_leases (organization_id, reference, property_id, unit_id, tenant_id, start_date, end_date, billing_cycle, rent_amount, currency_id, status, created_at) "
            f"SELECT 1, {q(ref)}, "
            f"(SELECT new_id FROM legacy_property_map WHERE legacy_id={c['realestate_id']}), "
            f"(SELECT new_unit_id FROM legacy_unit_map WHERE legacy_property_id={c['realestate_id']}), "
            f"(SELECT new_id FROM legacy_customer_map WHERE legacy_id={c['customer_id']}), "
            f"{q(start)}, {q(end)}, {q(cycle)}, {rent}, {CUR_USD}, 'expired', NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_leases WHERE reference={q(ref)});")
        bp()
        # 2) map legacy_id -> id (retrouve par reference)
        out(f"INSERT INTO legacy_lease_map (legacy_id, new_id) "
            f"SELECT {lid}, id FROM real_estate_leases WHERE reference={q(ref)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_rent_payments(sql):
    contracts = {c["id"] for c in rows_as_dicts(sql, "contract") if c.get("status") == "true"}
    rp = [r for r in rows_as_dicts(sql, "rent_payment") if r.get("contract_id") in contracts]
    # On ne migre que les paiements REELS (payment>0) — les echeances non payees seront
    # regenerees par l'app depuis le bail. (uncompleted/delayed/coming = pas un encaissement)
    paid = [r for r in rp if r.get("payment") and float(r["payment"]) > 0]
    out(f"-- === real_estate_rent_payments ({len(paid)} paiements reels sur {len(rp)} echeances des baux actifs) ===")
    out("-- Seuls les payment>0 (encaissements reels). Les echeances vides = regenerees par l'app.")
    for r in paid:
        lid = r["id"]
        amount = num(r.get("payment"))
        pdate = date_only(r.get("payment_date")) or date_only(r.get("planned_payment_date")) or "2023-01-01"
        idem = f"legacy-rp-{lid}"
        out(f"INSERT INTO real_estate_rent_payments (organization_id, lease_id, currency_id, payment_date, amount, method, reference, created_at) "
            f"SELECT 1, (SELECT new_id FROM legacy_lease_map WHERE legacy_id={r['contract_id']}), {CUR_USD}, {q(pdate)}, {amount}, 'cash', {q(idem)}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM real_estate_rent_payments WHERE reference={q(idem)});")
        bp()
    out()


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return
    sql = read_sql(sys.argv[1])
    emit_header()
    emit_properties(sql)
    emit_customers(sql)
    emit_leases(sql)
    emit_rent_payments(sql)
    with open(sys.argv[2], "w", encoding="utf-8", newline="\n") as f:
        f.write(_OUT.getvalue())
    print(f"OK: {sys.argv[2]} ecrit ({_OUT.getvalue().count(chr(10))} lignes, UTF-8).")


if __name__ == "__main__":
    main()
