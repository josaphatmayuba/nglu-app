"""Parseur du dump PostgreSQL (pg_dump format INSERT) pour la migration legacy -> nglu-app.

Lit les INSERT INTO ... VALUES (...),(...); en respectant le quoting PostgreSQL
(apostrophes doublees '', virgules et retours ligne dans les chaines).

Usage:
    py scripts/migration/pg_parse.py "<chemin .sql>" analyze
    py scripts/migration/pg_parse.py "<chemin .sql>" dump <table>

Ne touche AUCUNE base. Lecture seule + analyse.
"""
import sys
import re
import json
import os


def read_sql(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


# Colonnes par table : le dump fait "INSERT INTO public.t VALUES (...)" SANS liste de
# colonnes. On recupere l'ordre des colonnes depuis manifest.json (genere du meme dump).
_MANIFEST = None


def load_columns(table):
    global _MANIFEST
    if _MANIFEST is None:
        mpath = os.path.join(os.path.dirname(__file__), "manifest.json")
        if not os.path.exists(mpath):
            # fallback : a cote du .sql / chemin connu
            mpath = r"C:\Users\pauln\Downloads\export_tables_csv_schema\manifest.json"
        with open(mpath, "r", encoding="utf-8") as f:
            _MANIFEST = json.load(f)
    return _MANIFEST["tables"][table]["columns"]


def find_inserts(sql, table):
    """Retourne la liste des blocs (cols, rows) pour 'INSERT INTO public.<table> VALUES'.

    Le dump n'a PAS de liste de colonnes -> on prend l'ordre depuis manifest.json.
    Gere le multi-lignes : un INSERT couvre plusieurs lignes physiques.
    """
    results = []
    cols = load_columns(table)
    pat = re.compile(
        r'INSERT INTO public\.(?:"' + re.escape(table) + r'"|' + re.escape(table) + r')\s+VALUES\s*',
        re.IGNORECASE,
    )
    for m in pat.finditer(sql):
        rows, _end = parse_values(sql, m.end())
        results.append((cols, rows))
    return results


def parse_values(sql, start):
    """Parse une serie de tuples (..),(..) ; a partir de start. Retourne (rows, end_index)."""
    rows = []
    i = start
    n = len(sql)
    while i < n:
        # sauter espaces/retours/virgules entre tuples
        while i < n and sql[i] in " \t\r\n,":
            i += 1
        if i >= n or sql[i] == ";":
            break
        if sql[i] != "(":
            break
        row, i = parse_tuple(sql, i)
        rows.append(row)
    return rows, i


def parse_tuple(sql, i):
    """Parse un tuple ( v1, v2, ... ) en respectant les chaines ''. Retourne (list_valeurs, end)."""
    assert sql[i] == "("
    i += 1
    n = len(sql)
    values = []
    while i < n:
        while i < n and sql[i] in " \t\r\n":
            i += 1
        if sql[i] == ")":
            i += 1
            break
        if sql[i] == "'":
            # chaine : lire jusqu'a ' non doublee
            i += 1
            buf = []
            while i < n:
                c = sql[i]
                if c == "'":
                    if i + 1 < n and sql[i + 1] == "'":
                        buf.append("'")
                        i += 2
                        continue
                    i += 1
                    break
                buf.append(c)
                i += 1
            values.append("".join(buf))
        else:
            # token non quote jusqu'a , ou )
            buf = []
            while i < n and sql[i] not in ",)":
                buf.append(sql[i])
                i += 1
            tok = "".join(buf).strip()
            values.append(None if tok.upper() == "NULL" else tok)
        # sauter la virgule separatrice
        while i < n and sql[i] in " \t\r\n":
            i += 1
        if i < n and sql[i] == ",":
            i += 1
    return values, i


def rows_as_dicts(sql, table):
    out = []
    for cols, rows in find_inserts(sql, table):
        for r in rows:
            out.append(dict(zip(cols, r)))
    return out


def analyze(sql):
    print("=== ANALYSE COMPTA (lecture seule) ===\n")

    devise = rows_as_dicts(sql, "devise")
    print(f"devise ({len(devise)}):")
    for d in devise:
        print(f"  id={d['id']} code={d['code']} name={d['name']}")

    acc = rows_as_dicts(sql, "account")
    print(f"\naccount ({len(acc)}):")
    for a in acc:
        print(f"  id={a['id']:>2} type={a['type']:<14} name={a['name']}")

    sub = rows_as_dicts(sql, "subAccount")
    sub_active = [s for s in sub if s.get("status") == "true"]
    print(f"\nsubAccount: total={len(sub)} actifs={len(sub_active)} exclus(status=false)={len(sub)-len(sub_active)}")

    tt = rows_as_dicts(sql, "transactionType")
    tt_active = [t for t in tt if t.get("status") == "true"]
    print(f"transactionType: total={len(tt)} actifs={len(tt_active)} exclus={len(tt)-len(tt_active)}")

    tx = rows_as_dicts(sql, "transaction")
    tx_active = [t for t in tx if t.get("status") == "true"]
    print(f"\ntransaction: total={len(tx)} actives={len(tx_active)} exclues(status=false)={len(tx)-len(tx_active)}")

    # devises utilisees dans les transactions actives
    from collections import Counter
    dev_used = Counter(t.get("device_id") for t in tx_active)
    print(f"  device_id utilises (actives): {dict(dev_used)}")

    # montants : verifier qu'ils sont numeriques et positifs
    bad = [t for t in tx_active if not is_num(t.get("amount"))]
    print(f"  montants non numeriques: {len(bad)}")
    total = sum(float(t["amount"]) for t in tx_active if is_num(t.get("amount")))
    print(f"  somme des montants (actives): {total:,.2f}")

    # liens immobilier
    with_contract = [t for t in tx_active if t.get("contract_id")]
    with_rent = [t for t in tx_active if t.get("rent_payment_id")]
    print(f"  liees a un contract_id: {len(with_contract)} | a un rent_payment_id: {len(with_rent)}")

    # integrite : debit_id / credit_id references dans subAccount actifs ?
    sub_ids = {s["id"] for s in sub}
    sub_active_ids = {s["id"] for s in sub_active}
    miss_debit = [t for t in tx_active if t.get("debit_id") not in sub_ids]
    miss_credit = [t for t in tx_active if t.get("credit_id") not in sub_ids]
    on_inactive = [t for t in tx_active if t.get("debit_id") not in sub_active_ids or t.get("credit_id") not in sub_active_ids]
    print(f"  debit_id absent du plan: {len(miss_debit)} | credit_id absent: {len(miss_credit)}")
    print(f"  transactions actives pointant un subAccount INACTIF: {len(on_inactive)}")


def is_num(v):
    if v is None:
        return False
    try:
        float(v)
        return True
    except ValueError:
        return False


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return
    path, cmd = sys.argv[1], sys.argv[2]
    sql = read_sql(path)
    if cmd == "analyze":
        analyze(sql)
    elif cmd == "dump":
        table = sys.argv[3]
        rows = rows_as_dicts(sql, table)
        print(f"{table}: {len(rows)} lignes")
        for r in rows[:10]:
            print(r)


if __name__ == "__main__":
    main()
