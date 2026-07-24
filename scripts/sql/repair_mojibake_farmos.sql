-- Réparation mojibake (double-encodage UTF-8) sur les tables FarmOS + champs
-- transverses visibles dans le chat.
-- Contexte : certaines valeurs ont été stockées doublement encodées UTF-8
-- (ex. « Étable » -> « Ã‰table », hex C383E280B0 au lieu de C389). La colonne
-- est utf8mb4 ; seules les VALEURS sont corrompues.
--
-- Fix : reconversion inverse `CONVERT(BINARY CONVERT(col USING latin1) USING utf8mb4)`.
-- (MySQL latin1 = cp1252 dans les faits, ce qui couvre les caractères type ‰.)
--
-- SÛRETÉ :
--  - ne touche QUE les lignes contenant le motif corrompu (HEX LIKE '%C383%') ;
--  - idempotent : une 2e exécution ne retrouve plus le motif, donc ne fait rien ;
--  - à exécuter sur DEV d'abord ; vérifier visuellement avant PROD.
--
-- Usage :
--   docker exec -i nglu_dev_mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" nglu_db_dev < repair_mojibake_farmos.sql
--   (adapter le nom de base : prod = nglu_db / nglu_mysql)

SET @bad := '%C383%';

UPDATE farmos_ai_insights        SET action_label_fr   = CONVERT(BINARY CONVERT(action_label_fr   USING latin1) USING utf8mb4) WHERE HEX(action_label_fr)   LIKE @bad;
UPDATE farmos_ai_insights        SET text_fr           = CONVERT(BINARY CONVERT(text_fr           USING latin1) USING utf8mb4) WHERE HEX(text_fr)           LIKE @bad;
UPDATE farmos_animals            SET barn              = CONVERT(BINARY CONVERT(barn              USING latin1) USING utf8mb4) WHERE HEX(barn)              LIKE @bad;
UPDATE farmos_animals            SET last_event        = CONVERT(BINARY CONVERT(last_event        USING latin1) USING utf8mb4) WHERE HEX(last_event)        LIKE @bad;
UPDATE farmos_animals            SET lot               = CONVERT(BINARY CONVERT(lot               USING latin1) USING utf8mb4) WHERE HEX(lot)               LIKE @bad;
UPDATE farmos_animals            SET name              = CONVERT(BINARY CONVERT(name              USING latin1) USING utf8mb4) WHERE HEX(name)              LIKE @bad;
UPDATE farmos_animals            SET race              = CONVERT(BINARY CONVERT(race              USING latin1) USING utf8mb4) WHERE HEX(race)              LIKE @bad;
UPDATE farmos_expenses           SET description       = CONVERT(BINARY CONVERT(description       USING latin1) USING utf8mb4) WHERE HEX(description)       LIKE @bad;
UPDATE farmos_expenses           SET supplier          = CONVERT(BINARY CONVERT(supplier          USING latin1) USING utf8mb4) WHERE HEX(supplier)          LIKE @bad;
UPDATE farmos_lookups            SET value_en          = CONVERT(BINARY CONVERT(value_en          USING latin1) USING utf8mb4) WHERE HEX(value_en)          LIKE @bad;
UPDATE farmos_lookups            SET value_fr          = CONVERT(BINARY CONVERT(value_fr          USING latin1) USING utf8mb4) WHERE HEX(value_fr)          LIKE @bad;
UPDATE farmos_medicines          SET name              = CONVERT(BINARY CONVERT(name              USING latin1) USING utf8mb4) WHERE HEX(name)              LIKE @bad;
UPDATE farmos_medicines          SET supplier          = CONVERT(BINARY CONVERT(supplier          USING latin1) USING utf8mb4) WHERE HEX(supplier)          LIKE @bad;
UPDATE farmos_reproduction_events SET notes            = CONVERT(BINARY CONVERT(notes             USING latin1) USING utf8mb4) WHERE HEX(notes)             LIKE @bad;
UPDATE farmos_sales              SET buyer             = CONVERT(BINARY CONVERT(buyer             USING latin1) USING utf8mb4) WHERE HEX(buyer)             LIKE @bad;
UPDATE farmos_semen_straws       SET breed             = CONVERT(BINARY CONVERT(breed             USING latin1) USING utf8mb4) WHERE HEX(breed)             LIKE @bad;
UPDATE farmos_semen_straws       SET collection_center = CONVERT(BINARY CONVERT(collection_center USING latin1) USING utf8mb4) WHERE HEX(collection_center) LIKE @bad;
UPDATE farmos_semen_straws       SET notes             = CONVERT(BINARY CONVERT(notes             USING latin1) USING utf8mb4) WHERE HEX(notes)             LIKE @bad;
UPDATE farmos_semen_straws       SET region            = CONVERT(BINARY CONVERT(region            USING latin1) USING utf8mb4) WHERE HEX(region)            LIKE @bad;
UPDATE farmos_semen_straws       SET sire_name         = CONVERT(BINARY CONVERT(sire_name         USING latin1) USING utf8mb4) WHERE HEX(sire_name)         LIKE @bad;
UPDATE farmos_treatments         SET medicine_name     = CONVERT(BINARY CONVERT(medicine_name     USING latin1) USING utf8mb4) WHERE HEX(medicine_name)     LIKE @bad;
UPDATE farmos_treatments         SET notes             = CONVERT(BINARY CONVERT(notes             USING latin1) USING utf8mb4) WHERE HEX(notes)             LIKE @bad;
UPDATE farmos_treatments         SET route             = CONVERT(BINARY CONVERT(route             USING latin1) USING utf8mb4) WHERE HEX(route)             LIKE @bad;
UPDATE farmos_vaccinations       SET target            = CONVERT(BINARY CONVERT(target            USING latin1) USING utf8mb4) WHERE HEX(target)            LIKE @bad;
UPDATE farmos_vaccinations       SET vaccine           = CONVERT(BINARY CONVERT(vaccine           USING latin1) USING utf8mb4) WHERE HEX(vaccine)           LIKE @bad;

-- Champs transverses affichés dans Chat SIFA (onglet Personnes, titres, messages).
UPDATE users               SET firstName   = CONVERT(BINARY CONVERT(firstName   USING latin1) USING utf8mb4) WHERE firstName   IS NOT NULL AND HEX(firstName)   LIKE @bad;
UPDATE users               SET lastName    = CONVERT(BINARY CONVERT(lastName    USING latin1) USING utf8mb4) WHERE lastName    IS NOT NULL AND HEX(lastName)    LIKE @bad;
UPDATE chat_channels       SET name        = CONVERT(BINARY CONVERT(name        USING latin1) USING utf8mb4) WHERE name        IS NOT NULL AND HEX(name)        LIKE @bad;
UPDATE chat_channels       SET description = CONVERT(BINARY CONVERT(description USING latin1) USING utf8mb4) WHERE description IS NOT NULL AND HEX(description) LIKE @bad;
UPDATE journal_discussions SET title       = CONVERT(BINARY CONVERT(title       USING latin1) USING utf8mb4) WHERE title       IS NOT NULL AND HEX(title)       LIKE @bad;
UPDATE journal_messages    SET content     = CONVERT(BINARY CONVERT(content     USING latin1) USING utf8mb4) WHERE content     IS NOT NULL AND HEX(content)     LIKE @bad;
