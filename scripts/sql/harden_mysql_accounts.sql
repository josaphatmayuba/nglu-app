-- Durcissement des comptes MySQL — restreint les comptes ouverts a tous les hotes (%).
-- Idempotent : a executer en tant que root sur DEV et PROD.
--
-- Contexte : root@% et nglu_user@% acceptent des connexions depuis n'importe quel
-- hote. Le pare-feu Lightsail filtre 3306, mais une seule regle protege alors une
-- base root exposee. On restreint root a localhost et nglu_user au sous-reseau Docker.
--
-- SECURITE : ne jamais committer de mot de passe reel dans ce fichier.
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
--    NE PAS ecrire le mot de passe dans ce fichier (il est versionne dans git).
--    Le remplacer au moment de l'execution par la valeur reelle de DB_PASSWORD
--    (celle du .env / docker-compose), passee de facon ephemere.
CREATE USER IF NOT EXISTS 'nglu_user'@'172.%' IDENTIFIED BY 'REMPLACER_A_L_EXECUTION';
GRANT ALL PRIVILEGES ON `nglu_db`.* TO 'nglu_user'@'172.%';
-- Verifier que l'app se reconnecte bien avec le compte @172.% avant l'etape 3.

-- 3) une fois la version '172.%' validee (l'app se reconnecte), supprimer '%'.
-- DROP USER IF EXISTS 'nglu_user'@'%';

FLUSH PRIVILEGES;

-- Verification :
--   SELECT user, host FROM mysql.user WHERE user IN ('root','nglu_user');
-- Attendu : root@localhost, nglu_user@172.% (plus de @%).
