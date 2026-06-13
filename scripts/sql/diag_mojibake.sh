#!/bin/sh
# Diagnostic mojibake (double-encodage UTF-8) sur les tables farmos.
# Cherche le motif 0xC383 ("Ã") qui signe le double-encodage.
# Lecture seule — ne modifie rien.
docker exec nglu_dev_mysql bash -c '
DB=$(mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -e "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN (\"information_schema\",\"performance_schema\",\"mysql\",\"sys\") LIMIT 1;" 2>/dev/null)
echo "DB=$DB"
# Liste les colonnes texte des tables farmos_*
COLS=$(mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N "$DB" 2>/dev/null -e "
  SELECT CONCAT(TABLE_NAME, \".\", COLUMN_NAME)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=\"$DB\" AND TABLE_NAME LIKE \"farmos_%\"
    AND DATA_TYPE IN (\"varchar\",\"text\",\"mediumtext\",\"longtext\",\"tinytext\");")
for tc in $COLS; do
  T=${tc%%.*}; C=${tc#*.}
  N=$(mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N "$DB" 2>/dev/null -e "SELECT COUNT(*) FROM \`$T\` WHERE HEX(\`$C\`) LIKE \"%C383%\";")
  if [ "$N" != "0" ] && [ -n "$N" ]; then echo "MOJIBAKE  $T.$C  -> $N ligne(s)"; fi
done
echo "--- done ---"
'
