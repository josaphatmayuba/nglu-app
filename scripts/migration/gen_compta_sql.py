"""Generateur SQL compta : legacy PostgreSQL -> ledger moderne nglu-app (MySQL/Drizzle).

Transforme les donnees compta ACTIVES (status=true) en SQL idempotent et SANS COLLISION
avec l'existant de dev (verifie le 13/06/2026) :
  - dev a deja account 1-6 (EN), subAccount 1-17 (EN), transaction_types 1-6, currency 1-16.
  - le ledger (journal_entry_lines.account_id) reference subAccount.id (confirme code l.391).
  - side = 'DEBIT'/'CREDIT' en MAJUSCULES (convention code l.719/799).
  - currency.currencyCode est NULL -> mapping devise par id fixe : legacy 1(CDF)->1, 2(USD)->2.

Strategie anti-collision (table de correspondance) :
  - account : FUSION sur l'existant. legacy 1..6 -> dev 1..6 (meme nature). legacy 7 (Locatif,
    Revenue) -> insere en id auto. Map dans variables SQL @acc_<legacy>.
  - subAccount : tous REINSERES en id AUTO. Table temporaire legacy_subaccount_map(legacy_id,new_id)
    pour recabler le ledger. On ne touche pas aux 17 existants.
  - transaction_types : reinseres en id auto (debit/credit recables via la map subAccount).
  - journal_entry_lines.account_id = NEW subAccount id (via la map).

NE TOUCHE AUCUNE BASE. Produit un .sql relu avant application.

Usage:
    py scripts/migration/gen_compta_sql.py "<.sql>" scripts/sql/0150_legacy_compta.sql
"""
import sys
import io
from pg_parse import read_sql, rows_as_dicts

_OUT = io.StringIO()


def out(line=""):
    _OUT.write(line + "\n")


def bp():
    """Separateur de statement compatible Drizzle migrate() ET le repair (split sur ;)."""
    out("--> statement-breakpoint")


# Sous-requetes devise (currencyCode NULL en base -> on cible par NOM).
# CDF = franc congolais (symbole FC) ; USD = dollar (symbole $). On cible le SYMBOLE,
# non ambigu : la table a aussi un 'FRANC' (id 12) -> un LIKE 'FRANC%' le matcherait par
# erreur. currencyCode est NULL en base, d'ou le symbole comme cle.
CUR_CDF = "(SELECT id FROM currency WHERE currencySymbol = 'FC' ORDER BY id LIMIT 1)"
CUR_USD = "(SELECT id FROM currency WHERE currencySymbol = '$' ORDER BY id LIMIT 1)"


def cur_sub(devise_id):
    return {"1": CUR_CDF, "2": CUR_USD}.get(devise_id, "NULL")


# account legacy -> account dev existant (par nature). None = a inserer en id auto.
ACCOUNT_MAP_TO_DEV = {
    "1": 1,   # Actif      -> Asset
    "2": 2,   # Passif     -> Liability
    "3": 3,   # Capital    -> Equity
    "4": 4,   # Retrait    -> Withdrawal (Equity)
    "5": 5,   # Revenue    -> Revenue
    "6": 6,   # Depense    -> Expense
    # "7" Locatif -> insere (Revenue), id auto
}
ACCOUNT_INSERT = {"7": ("Locatif", "Revenue")}

# devise legacy -> currency dev (currencyCode NULL cote dev, on mappe par id)
DEVISE_MAP = {"1": 1, "2": 2}


def q(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


def trunc(s, n):
    return None if s is None else s[:n]


def emit_header():
    out("-- ============================================================")
    out("-- Migration compta legacy -> ledger moderne (GENERE, NE PAS EDITER A LA MAIN)")
    out("-- Genere par scripts/migration/gen_compta_sql.py")
    out("-- Cible : migration Drizzle (pipeline). Statements AUTONOMES separes par")
    out("-- --> statement-breakpoint, sans variables de session (@var) : robuste car")
    out("-- migrate() execute chaque statement independamment. Idempotent (NOT EXISTS).")
    out("-- Devises : sous-requete sur currency (CDF/USD par NOM, currencyCode NULL en base).")
    out("-- ============================================================")
    out("CREATE TABLE IF NOT EXISTS legacy_subaccount_map (legacy_id INT PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    bp()
    out("CREATE TABLE IF NOT EXISTS legacy_account_map (legacy_id INT PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    bp()


def emit_accounts(sql):
    out("-- === account : fusion sur l'existant dev (1-6) + insert Locatif ===")
    for legacy_id, dev_id in ACCOUNT_MAP_TO_DEV.items():
        out(f"INSERT INTO legacy_account_map (legacy_id, new_id) VALUES ({legacy_id}, {dev_id}) "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    for legacy_id, (name, typ) in ACCOUNT_INSERT.items():
        out(f"-- account legacy {legacy_id} ({name}) : insere si absent (match par nom+type)")
        out(f"INSERT INTO account (name, type, created_at) "
            f"SELECT {q(name)}, {q(typ)}, NOW() FROM DUAL "
            f"WHERE NOT EXISTS (SELECT 1 FROM account WHERE name={q(name)} AND type={q(typ)});")
        bp()
        out(f"INSERT INTO legacy_account_map (legacy_id, new_id) "
            f"SELECT {legacy_id}, id FROM account WHERE name={q(name)} AND type={q(typ)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_subaccounts(sql):
    all_sub = rows_as_dicts(sql, "subAccount")
    active = [s for s in all_sub if s.get("status") == "true"]
    # Un subAccount INACTIF peut etre reference par un transactionType ACTIF (ex: id 32
    # par le type 12 'depense ration alimentaire'). On doit alors le mapper quand meme,
    # sinon le type aurait un debit_account_id NULL. On l'insere en status='false' pour
    # qu'il n'apparaisse pas comme un compte actif, mais qu'il existe pour le recablage.
    active_ids = {s["id"] for s in active}
    tt_active = [t for t in rows_as_dicts(sql, "transactionType") if t.get("status") == "true"]
    needed_inactive = set()
    for t in tt_active:
        for ref in (t["debit_id"], t["credit_id"]):
            if ref not in active_ids:
                needed_inactive.add(ref)
    sub = active + [s for s in all_sub if s["id"] in needed_inactive and s.get("status") != "true"]
    out(f"-- === subAccount ({len(active)} actifs + {len(sub)-len(active)} inactif(s) requis par un type) : reinseres en id AUTO + map ===")
    out("-- accountId recable via legacy_account_map. Idempotent via legacy_subaccount_map.")
    out("-- Pour recabler sans LAST_INSERT_ID : on encode le legacy_id dans un marqueur de")
    out("-- description temporaire... non dispo ici -> on insere puis on mappe par (name,accountId)")
    out("-- du subAccount le PLUS RECENT non encore mappe. 2 statements autonomes + idempotents.")
    for s in sub:
        lid = s["id"]
        name = trunc(s["name"], 255)
        acc_legacy = s["account_id"]
        st = "true" if s.get("status") == "true" else "false"
        accsel = f"(SELECT new_id FROM legacy_account_map WHERE legacy_id={acc_legacy})"
        # 1) insere le subAccount s'il n'est pas deja mappe
        out(f"INSERT INTO subAccount (name, accountId, status, created_at) "
            f"SELECT {q(name)}, {accsel}, '{st}', NOW() FROM DUAL "
            f"WHERE NOT EXISTS (SELECT 1 FROM legacy_subaccount_map WHERE legacy_id={lid});")
        bp()
        # 2) mappe legacy_id -> le subAccount (name,accountId) dont l'id n'est pas deja pris
        #    dans la map (gere les rares doublons de nom). Idempotent.
        out(f"INSERT INTO legacy_subaccount_map (legacy_id, new_id) "
            f"SELECT {lid}, sa.id FROM subAccount sa "
            f"WHERE sa.name={q(name)} AND sa.accountId={accsel} "
            f"AND sa.id NOT IN (SELECT new_id FROM legacy_subaccount_map) "
            f"ORDER BY sa.id DESC LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_transaction_types(sql):
    tt = [t for t in rows_as_dicts(sql, "transactionType") if t.get("status") == "true"]
    out(f"-- === transaction_types ({len(tt)} actifs) : id AUTO, debit/credit via map subAccount ===")
    for t in tt:
        name = trunc(t["name"], 255)
        desc = t.get("details") or t.get("activity")
        debit_legacy = t["debit_id"]
        credit_legacy = t["credit_id"]
        idem = f"legacy-tt-{t['id']}"
        # description prefixee de la cle pour idempotence (pas d'autre colonne unique dispo)
        out(f"INSERT INTO transaction_types (name, debit_account_id, credit_account_id, description, is_active, created_at) "
            f"SELECT {q(name)}, "
            f"(SELECT new_id FROM legacy_subaccount_map WHERE legacy_id={debit_legacy}), "
            f"(SELECT new_id FROM legacy_subaccount_map WHERE legacy_id={credit_legacy}), "
            f"{q(desc)}, 1, NOW() FROM DUAL "
            f"WHERE NOT EXISTS (SELECT 1 FROM transaction_types WHERE name={q(name)} AND description={q(desc)});")
        bp()
    out()


def emit_journal(sql):
    tx = [t for t in rows_as_dicts(sql, "transaction") if t.get("status") == "true"]
    out(f"-- === journal_entries + journal_entry_lines ({len(tx)} transactions actives) ===")
    out("-- 1 tx = 1 entry + 2 lines (deja equilibree). account_id = NEW subAccount id (via map).")
    out("-- side en MAJUSCULES (convention code). Idempotent via idempotency_key.")
    out("-- Statements autonomes : la ligne retrouve son entry par idempotency_key (pas de @var).")
    for t in tx:
        cur = cur_sub(t.get("device_id"))
        amount = t["amount"]
        # varchar(255) cible : on coupe a 250 (marge) + retire les sauts de ligne.
        particulars = trunc((t.get("particulars") or "(sans libelle)").replace("\n", " ").replace("\r", " "), 250)
        date = t["date"]
        idem = f"legacy-tx-{t['id']}"
        debit_legacy = t["debit_id"]
        credit_legacy = t["credit_id"]
        related = t["id"]
        # 1) l'entry (idempotent par idempotency_key)
        out(f"INSERT INTO journal_entries "
            f"(organization_id, date, particulars, source_module, related_id, status, currency_id, total_debit, total_credit, idempotency_key, created_at) "
            f"SELECT 1, {q(date)}, {q(particulars)}, 'legacy_migration', {q(related)}, 'posted', {cur}, {amount}, {amount}, {q(idem)}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM journal_entries WHERE idempotency_key = {q(idem)});")
        bp()
        # 2) ligne DEBIT : retrouve l'entry par sa cle, idempotent par (entry_id, side)
        out(f"INSERT INTO journal_entry_lines (entry_id, organization_id, account_id, side, amount, created_at) "
            f"SELECT je.id, 1, (SELECT new_id FROM legacy_subaccount_map WHERE legacy_id={debit_legacy}), 'DEBIT', {amount}, NOW() "
            f"FROM journal_entries je WHERE je.idempotency_key={q(idem)} "
            f"AND NOT EXISTS (SELECT 1 FROM journal_entry_lines l WHERE l.entry_id=je.id AND l.side='DEBIT');")
        bp()
        # 3) ligne CREDIT
        out(f"INSERT INTO journal_entry_lines (entry_id, organization_id, account_id, side, amount, created_at) "
            f"SELECT je.id, 1, (SELECT new_id FROM legacy_subaccount_map WHERE legacy_id={credit_legacy}), 'CREDIT', {amount}, NOW() "
            f"FROM journal_entries je WHERE je.idempotency_key={q(idem)} "
            f"AND NOT EXISTS (SELECT 1 FROM journal_entry_lines l WHERE l.entry_id=je.id AND l.side='CREDIT');")
        bp()
    out()


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return
    sql = read_sql(sys.argv[1])
    emit_header()
    emit_accounts(sql)
    emit_subaccounts(sql)
    emit_transaction_types(sql)
    emit_journal(sql)
    with open(sys.argv[2], "w", encoding="utf-8", newline="\n") as f:
        f.write(_OUT.getvalue())
    print(f"OK: {sys.argv[2]} ecrit ({_OUT.getvalue().count(chr(10))} lignes, UTF-8).")


if __name__ == "__main__":
    main()
