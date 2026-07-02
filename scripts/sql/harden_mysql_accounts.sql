-- Durcissement des comptes MySQL — restreint les comptes ouverts a tous les hotes (%).
-- Idempotent : a executer en tant que root sur DEV et PROD.
--
-- Contexte : root@% et nglu_user@% acceptent des connexions depuis n'importe quel
-- hote. Le pare-feu Lightsail filtre 3306, mais une seule regle protege alors une
-- base root exposee. On restreint root a localhost et nglu_user au sous-reseau Docker.
--
-- IMPORTANT : ajuster le sous-reseau '172.%' au reseau reel du bridge Docker
-- (verifier via : docker network inspect nglu_network | grep Subnet).
-- L'application se connecte avec DB_HOST=mysql (nom de service Docker), donc via
-- une IP du sous-reseau Docker : ne PAS restreindre nglu_user a 'localhost'.

-- 1) root : supprimer l'acces distant, ne garder que localhost.
--    (root@localhost est cree par defaut par l'image mysql:8.0.)
DROP USER IF EXISTS 'root'@'%';

-- 2) nglu_user : basculer de '%' vers le sous-reseau Docker.
--    On cree la version restreinte AVANT de supprimer '%' pour eviter toute coupure.
--    Le mot de passe est repris depuis la variable @db_pass ci-dessous.
SET @db_pass = 'R9#tuP4@zN8$Qx2R9#tuP4@zN8$Qx2';

CREATE USER IF NOT EXISTS 'nglu_user'@'172.%' IDENTIFIED BY '@db_pass_placeholder';
-- Ne pas laisser le placeholder : definir le vrai mot de passe puis les droits.
-- (Executer les 2 lignes suivantes en remplacant le mot de passe reel.)
-- ALTER USER 'nglu_user'@'172.%' IDENTIFIED BY 'LE_VRAI_MOT_DE_PASSE';
-- GRANT ALL PRIVILEGES ON `nglu_db`.* TO 'nglu_user'@'172.%';

-- 3) une fois la version '172.%' validee (l'app se reconnecte), supprimer '%'.
-- DROP USER IF EXISTS 'nglu_user'@'%';

FLUSH PRIVILEGES;

-- Verification :
--   SELECT user, host FROM mysql.user WHERE user IN ('root','nglu_user');
-- Attendu : root@localhost, nglu_user@172.% (plus de @%).
