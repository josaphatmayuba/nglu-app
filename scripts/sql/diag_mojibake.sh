#!/bin/sh
# Diagnostic mojibake (double-encodage UTF-8) sur les tables farmos + champs
# transverses visibles dans le chat.
# Cherche le motif 0xC383 ("Ã") qui signe le double-encodage.
# Lecture seule — ne modifie rien.
docker exec nglu_dev_mysql bash -c '
DB=$(mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -e "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN (\"information_schema\",\"performance_schema\",\"mysql\",\"sys\") LIMIT 1;" 2>/dev/null)
echo "DB=$DB"
# Liste les colonnes texte des tables farmos_*
COLS=$(mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N "$DB" 2>/dev/null -e "
  SELECT CONCAT(TABLE_NAME, \".\", COLUMN_NAME)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=\"$DB\" AND (
      TABLE_NAME LIKE \"farmos_%\"
      OR (TABLE_NAME = \"users\" AND COLUMN_NAME IN (\"firstName\", \"lastName\"))
      OR (TABLE_NAME = \"chat_channels\" AND COLUMN_NAME IN (\"name\", \"description\"))
      OR (TABLE_NAME = \"journal_discussions\" AND COLUMN_NAME = \"title\")
      OR (TABLE_NAME = \"journal_messages\" AND COLUMN_NAME = \"content\")
    )
    AND DATA_TYPE IN (\"varchar\",\"text\",\"mediumtext\",\"longtext\",\"tinytext\");")
for tc in $COLS; do
  T=${tc%%.*}; C=${tc#*.}
  N=$(mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N "$DB" 2>/dev/null -e "SELECT COUNT(*) FROM \`$T\` WHERE HEX(\`$C\`) LIKE \"%C383%\";")
  if [ "$N" != "0" ] && [ -n "$N" ]; then echo "MOJIBAKE  $T.$C  -> $N ligne(s)"; fi
done
echo "--- done ---"
'
