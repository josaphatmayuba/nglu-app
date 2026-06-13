"""Generateur SQL users + Devis : legacy PostgreSQL -> nglu-app.

USERS (decision : NE PAS fusionner avec les 6 seeds locaux generiques) :
  - 31 users actifs (status=true) migres en NOUVEAUX users (id AUTO) + map legacy_user_map
    (legacy_uuid -> new_id). password legacy conserve (hash d'un autre systeme -> les users
    devront probablement reset/relogin). username NOT NULL -> fallback sur email/uuid.
  - creator_id 'fantome' (uuid absent de la table user, ex 3c4c326e) -> non resolu, pointera
    NULL ; on ne casse rien (les FK creator sont nullable ou informatives).

DEVIS (38, tous actifs) -> quote :
  - subject -> quoteName ; state_status -> status ; creator_id -> quoteOwnerId via map user.
  - pas de customer ni montant dans Devis legacy -> customerId NULL, totalAmount 0.

RECABLAGE des donnees deja migrees : ce script met aussi a jour saleInvoice.userId
(actuellement NULL) en resolvant le creator_id legacy via legacy_user_map (table commentee,
optionnelle — activable apres validation).

NE TOUCHE AUCUNE BASE. Produit un .sql relu avant application.

Usage:
    py scripts/migration/gen_users_devis_sql.py "<.sql>" scripts/sql/0153_legacy_users_devis.sql
"""
import sys
import io
import unicodedata
import re
from pg_parse import read_sql, rows_as_dicts

_OUT = io.StringIO()


def out(line=""):
    _OUT.write(line + "\n")


def bp():
    out("--> statement-breakpoint")


def q(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


def trunc(s, n):
    return None if s is None else str(s)[:n]


def slug(s):
    """Translittere sans accents, minuscules, garde [a-z0-9], espaces -> rien."""
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]", "", s.lower())


def make_email(first, last, taken):
    """prenom.nom@ongdngolu.org, sans accents ; suffixe numerique si collision."""
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


# state_status legacy Devis -> statut quote cible
DEVIS_STATUS = {
    "Approuver": "approved",
    "Envoyé": "sent",
    "Refuser": "rejected",
    "En traitement": "draft",
}


def emit_header():
    out("-- ============================================================")
    out("-- Migration users + Devis legacy -> nglu-app (GENERE)")
    out("-- Statements AUTONOMES (--> statement-breakpoint, pas de @var). Users NON fusionnes.")
    out("-- Recablage par cle naturelle : username (partie locale de l'email genere, unique).")
    out("-- ============================================================")
    out("CREATE TABLE IF NOT EXISTS legacy_user_map (legacy_uuid VARCHAR(64) PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    bp()


def emit_users(sql):
    users = [u for u in rows_as_dicts(sql, "user") if u.get("status") == "true"]
    out(f"-- === users ({len(users)} actifs) migres en NOUVEAUX users (seeds 1-6 intacts) ===")
    out("-- email = prenom.nom@ongdngolu.org genere (on ignore l'email source, souvent invalide).")
    taken = set()
    for u in users:
        uuid = u["uuid"]
        fn = trunc(u.get("first_name") or "", 255)
        ln = trunc(u.get("last_name") or "", 255)
        # Email genere @ongdngolu.org (decision 13/06/2026), unique, sans accents.
        email = make_email(u.get("first_name"), u.get("last_name"), taken)
        # username NOT NULL : on prend la partie locale de l'email genere (unique).
        username = email.split("@")[0]
        pwd = u.get("password") or "!migrated-no-login!"
        phone = trunc(u.get("phone"), 255)
        # 1) user (idempotent par username unique)
        out(f"INSERT INTO users (organization_id, username, firstName, lastName, email, phone, password, roleId, status, created_at) "
            f"SELECT 1, {q(username)}, {q(fn)}, {q(ln)}, {q(email)}, {q(phone)}, {q(pwd)}, 3, 'true', NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username={q(username)});")
        bp()
        # 2) map uuid legacy -> id (retrouve par username)
        out(f"INSERT INTO legacy_user_map (legacy_uuid, new_id) "
            f"SELECT {q(uuid)}, id FROM users WHERE username={q(username)} ORDER BY id LIMIT 1 "
            f"ON DUPLICATE KEY UPDATE new_id=VALUES(new_id);")
        bp()
    out()


def emit_devis(sql):
    dv = [d for d in rows_as_dicts(sql, "Devis") if d.get("status") == "true"]
    out(f"-- === quote ({len(dv)} Devis actifs) ===")
    for d in dv:
        lid = d["id"]
        name = trunc(d.get("subject") or f"Devis {lid}", 255)
        status = DEVIS_STATUS.get(d.get("state_status"), "draft")
        creator = d.get("creator_id")
        owner = f"(SELECT new_id FROM legacy_user_map WHERE legacy_uuid={q(creator)})" if creator else "NULL"
        ref = f"LEG-DEVIS-{lid}"
        # On prefixe la note du marqueur [ref] : sert de cle naturelle pour l'idempotence
        # (quote n'a pas de colonne reference). LIKE sur le prefixe.
        desc = d.get("description") or ""
        note = trunc(f"[{ref}] {desc}", 65535)
        out(f"INSERT INTO quote (quoteName, quoteDate, quoteOwnerId, customerId, totalAmount, note, status, created_at) "
            f"SELECT {q(name)}, NOW(), {owner}, NULL, 0, {q(note)}, {q(status)}, NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM quote WHERE note LIKE {q('[' + ref + ']%')});")
        bp()
    out()


def emit_recable(sql):
    out("-- === (OPTIONNEL) recablage saleInvoice.userId depuis creator_id legacy ===")
    out("-- A activer apres validation. Resout le creator_id de chaque saleInvoice legacy.")
    si = rows_as_dicts(sql, "saleInvoice")
    for s in si:
        creator = s.get("creator_id")
        if not creator:
            continue
        newid = f"LEG-S{s['id']}"
        out(f"-- UPDATE saleInvoice SET userId=(SELECT new_id FROM legacy_user_map WHERE legacy_uuid={q(creator)}) WHERE id={q(newid)};")
    out()


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return
    sql = read_sql(sys.argv[1])
    emit_header()
    emit_users(sql)
    emit_devis(sql)
    emit_recable(sql)
    with open(sys.argv[2], "w", encoding="utf-8", newline="\n") as f:
        f.write(_OUT.getvalue())
    print(f"OK: {sys.argv[2]} ecrit ({_OUT.getvalue().count(chr(10))} lignes, UTF-8).")


if __name__ == "__main__":
    main()
