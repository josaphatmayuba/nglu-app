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
    python scripts/migration/gen_users_devis_sql.py "<.sql ou dossier csv>" scripts/sql/0153_legacy_users_devis.sql
    python scripts/migration/gen_users_devis_sql.py "<.sql>" scripts/sql/0153_legacy_users_devis.sql "<dossier csv>"
"""
import sys
import io
import unicodedata
import re
import os
import csv
from pg_parse import read_sql, rows_as_dicts

_OUT = io.StringIO()


def out(line=""):
    _OUT.write(line + "\n")


def bp():
    out("-- statement-breakpoint")


def q(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("\\", "\\\\").replace("'", "''") + "'"


def clean(s):
    if s is None:
        return None
    s = str(s).strip()
    return s or None


def trunc(s, n):
    s = clean(s)
    return None if s is None else s[:n]


def truthy(s):
    return str(s).strip().lower() == "true"


def date_only(s):
    s = clean(s)
    return None if s is None else s[:10]


def datetime_or_null(s):
    s = clean(s)
    return "NULL" if s is None else q(s)


def date_or_null(s):
    s = date_only(s)
    return "NULL" if s is None else q(s)


def num_lit(s):
    s = clean(s)
    if s is None:
        return None
    s = s.replace(",", ".")
    try:
        float(s)
    except ValueError:
        return None
    return s


def norm_key(s):
    return (clean(s) or "").lower()


def uniq(values):
    seen = set()
    out = []
    for v in values:
        v = clean(v)
        if not v:
            continue
        k = norm_key(v)
        if k in seen:
            continue
        seen.add(k)
        out.append(v)
    return out


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


class Source:
    def __init__(self, path, csv_dir=None):
        self.path = path
        self.csv_dir = csv_dir or (path if os.path.isdir(path) else None)
        self.sql = None if os.path.isdir(path) else read_sql(path)
        self._cache = {}

    def rows(self, table):
        if table in self._cache:
            return self._cache[table]
        rows = None
        if self.csv_dir:
            rows = read_csv_table(self.csv_dir, table)
        if rows is None and self.sql is not None:
            rows = rows_as_dicts(self.sql, table)
        if rows is None:
            rows = []
        self._cache[table] = rows
        return rows


def read_csv_table(csv_dir, table):
    if not csv_dir or not os.path.isdir(csv_dir):
        return None
    target = f"{table}.csv".lower()
    path = None
    for name in os.listdir(csv_dir):
        if name.lower() == target:
            path = os.path.join(csv_dir, name)
            break
    if path is None:
        return None
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return [{k: clean(v) for k, v in row.items()} for row in csv.DictReader(f)]


# state_status legacy Devis -> statut quote cible
DEVIS_STATUS = {
    "Approuver": "approved",
    "Envoyé": "sent",
    "EnvoyÃ©": "sent",
    "Refuser": "rejected",
    "En traitement": "draft",
}


def emit_header():
    out("-- ============================================================")
    out("-- Migration users + Devis legacy -> nglu-app (GENERE)")
    out("-- Statements AUTONOMES (-- statement-breakpoint, pas de @var). Users NON fusionnes.")
    out("-- Recablage par cle naturelle : username (partie locale de l'email genere, unique).")
    out("-- ============================================================")
    out("SET NAMES utf8mb4;")
    bp()
    out("CREATE TABLE IF NOT EXISTS legacy_user_map (legacy_uuid VARCHAR(64) PRIMARY KEY, new_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    bp()


def active_users(source):
    return [u for u in source.rows("user") if truthy(u.get("status"))]


def legacy_designation_by_id(source):
    return {str(d.get("id")): clean(d.get("name")) for d in source.rows("designation") if clean(d.get("id")) and clean(d.get("name"))}


def emit_hr_reference_data(source, users):
    legacy_desig = legacy_designation_by_id(source)

    # Dans le legacy, user.role contient le poste metier. La table designation legacy
    # contient surtout des groupes/sites; on les conserve dans department.
    role_names = uniq(u.get("role") for u in users)
    dept_names = uniq(
        [u.get("department") for u in users]
        + [legacy_desig.get(str(u.get("designation_id"))) for u in users]
    )

    out(f"-- === referentiels RH depuis user.csv/designation.csv : designations={len(role_names)}, departements={len(dept_names)} ===")
    for name in role_names:
        name = trunc(name, 255)
        out(f"INSERT INTO designations (name, status, created_at, updated_at) "
            f"SELECT {q(name)}, 'true', NOW(), NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM designations WHERE LOWER(name)=LOWER({q(name)}));")
        bp()
    for name in dept_names:
        name = trunc(name, 255)
        out(f"INSERT INTO department (name, status, created_at, updated_at) "
            f"SELECT {q(name)}, 'true', NOW(), NOW() "
            f"FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM department WHERE LOWER(name)=LOWER({q(name)}));")
        bp()
    out()


def emit_users(source, users):
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


def target_department_expr(name):
    if not name:
        return "NULL"
    return f"(SELECT id FROM department WHERE LOWER(name)=LOWER({q(trunc(name, 255))}) ORDER BY id LIMIT 1)"


def target_designation_expr(name):
    if not name:
        return "NULL"
    return f"(SELECT id FROM designations WHERE LOWER(name)=LOWER({q(trunc(name, 255))}) ORDER BY id LIMIT 1)"


def emit_user_hr_details(source, users):
    legacy_desig = legacy_designation_by_id(source)
    out("-- === enrichissement RH des users depuis user.csv ===")
    for u in users:
        uuid = u["uuid"]
        role_name = clean(u.get("role"))
        dept_name = clean(u.get("department")) or legacy_desig.get(str(u.get("designation_id")))
        sets = []

        if clean(u.get("first_name")):
            sets.append(f"u.firstName={q(trunc(u.get('first_name'), 255))}")
        if clean(u.get("last_name")):
            sets.append(f"u.lastName={q(trunc(u.get('last_name'), 255))}")
        if clean(u.get("phone")):
            sets.append(f"u.phone={q(trunc(u.get('phone'), 255))}")
        if clean(u.get("id_no")):
            sets.append(f"u.employeeId={q(trunc(u.get('id_no'), 255))}")
        if clean(u.get("join_date")):
            sets.append(f"u.joinDate={datetime_or_null(u.get('join_date'))}")
        if clean(u.get("leave_date")):
            sets.append(f"u.leaveDate={datetime_or_null(u.get('leave_date'))}")
        if clean(u.get("birthday")):
            sets.append(f"u.birthDate={date_or_null(u.get('birthday'))}")
        if clean(u.get("address")):
            sets.append(f"u.street={q(trunc(u.get('address'), 255))}")
        if clean(u.get("blood_group")):
            sets.append(f"u.bloodGroup={q(trunc(u.get('blood_group'), 255))}")
        if clean(u.get("image")):
            sets.append(f"u.image={q(trunc(u.get('image'), 255))}")
        if role_name:
            sets.append(f"u.designationId={target_designation_expr(role_name)}")
        if dept_name:
            sets.append(f"u.departmentId={target_department_expr(dept_name)}")

        if not sets:
            continue
        sets.append("u.updated_at=NOW()")
        out(f"UPDATE users u JOIN legacy_user_map m ON m.new_id=u.id "
            f"SET {', '.join(sets)} WHERE m.legacy_uuid={q(uuid)};")
        bp()
    out()


def currency_expr(legacy_devise_id, salary=None):
    legacy_devise_id = clean(legacy_devise_id)
    if legacy_devise_id == "1":
        return "1"
    if legacy_devise_id == "2":
        return "2"
    if salary is not None and float(salary) >= 1000:
        return "1"
    # Legacy rule: if no devise was recorded on an imported amount, it is USD.
    return "2"


def salary_start(u):
    return date_only(u.get("join_date")) or date_only(u.get("createdAt"))


def emit_salary_histories(users):
    salary_users = [u for u in users if (num_lit(u.get("salary")) is not None and float(num_lit(u.get("salary"))) > 0)]
    out(f"-- === salary_histories depuis user.csv ({len(salary_users)} salaires > 0) ===")
    for u in salary_users:
        uuid = u["uuid"]
        salary = num_lit(u.get("salary"))
        comment = trunc(f"[LEG-USER-{uuid}] Salaire legacy user.csv", 65535)
        out(f"INSERT INTO salary_histories (userId, salary, currency_id, startDate, endDate, comment, created_at, updated_at) "
            f"SELECT m.new_id, {salary}, {currency_expr(u.get('devise_id'), salary)}, {date_or_null(salary_start(u))}, {date_or_null(u.get('leave_date'))}, {q(comment)}, NOW(), NOW() "
            f"FROM legacy_user_map m "
            f"WHERE m.legacy_uuid={q(uuid)} "
            f"AND NOT EXISTS (SELECT 1 FROM salary_histories s WHERE s.userId=m.new_id AND s.comment LIKE {q('[LEG-USER-' + uuid + ']%')});")
        bp()
    out("UPDATE salary_histories SET currency_id=1, updated_at=NOW() "
        "WHERE comment LIKE '[LEG-USER-%' AND currency_id IS NULL AND salary >= 1000;")
    bp()
    out()


def emit_designation_histories(users):
    designation_users = [u for u in users if clean(u.get("role"))]
    out(f"-- === designation_histories depuis user.csv ({len(designation_users)} affectations) ===")
    for u in designation_users:
        uuid = u["uuid"]
        role_name = clean(u.get("role"))
        comment = trunc(f"[LEG-USER-{uuid}] Poste legacy user.csv: {role_name}", 65535)
        designation = target_designation_expr(role_name)
        out(f"INSERT INTO designation_histories (userId, designationId, startDate, endDate, comment, created_at, updated_at) "
            f"SELECT m.new_id, {designation}, {date_or_null(salary_start(u))}, {date_or_null(u.get('leave_date'))}, {q(comment)}, NOW(), NOW() "
            f"FROM legacy_user_map m "
            f"WHERE m.legacy_uuid={q(uuid)} "
            f"AND {designation} IS NOT NULL "
            f"AND NOT EXISTS (SELECT 1 FROM designation_histories dh WHERE dh.userId=m.new_id AND dh.comment LIKE {q('[LEG-USER-' + uuid + ']%')});")
        bp()
    out()


def emit_devis(source):
    dv = [d for d in source.rows("Devis") if truthy(d.get("status"))]
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


def emit_recable(source):
    out("-- === (OPTIONNEL) recablage saleInvoice.userId depuis creator_id legacy ===")
    out("-- A activer apres validation. Resout le creator_id de chaque saleInvoice legacy.")
    si = source.rows("saleInvoice")
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
    source = Source(sys.argv[1], sys.argv[3] if len(sys.argv) > 3 else None)
    users = active_users(source)
    emit_header()
    emit_hr_reference_data(source, users)
    emit_users(source, users)
    emit_user_hr_details(source, users)
    emit_salary_histories(users)
    emit_designation_histories(users)
    emit_devis(source)
    emit_recable(source)
    with open(sys.argv[2], "w", encoding="utf-8", newline="\n") as f:
        f.write(_OUT.getvalue())
    print(f"OK: {sys.argv[2]} ecrit ({_OUT.getvalue().count(chr(10))} lignes, UTF-8).")


if __name__ == "__main__":
    main()
