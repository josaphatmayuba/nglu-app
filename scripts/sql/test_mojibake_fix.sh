#!/bin/sh
# TEST (lecture seule) : montre la conversion inverse double-encodage sur données réelles.
docker exec nglu_dev_mysql bash -c '
DB=$(mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -e "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN (\"information_schema\",\"performance_schema\",\"mysql\",\"sys\") LIMIT 1;" 2>/dev/null)
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$DB" 2>/dev/null -e "
  SELECT
    barn AS avant,
    CONVERT(BINARY CONVERT(barn USING latin1) USING utf8mb4) AS apres_latin1
  FROM farmos_animals WHERE HEX(barn) LIKE \"%C383%\" LIMIT 3;
  SELECT
    value_fr AS avant,
    CONVERT(BINARY CONVERT(value_fr USING latin1) USING utf8mb4) AS apres_latin1
  FROM farmos_lookups WHERE HEX(value_fr) LIKE \"%C383%\" LIMIT 5;
"
'
