# Rapport tests securite actifs controles

Date: 2026-06-29

## Cadre

Demande recue:
- lancer des tests destructifs;
- brute force;
- fuzzing agressif;
- scan authentifie;
- supprimer toute donnee ajoutee apres test;
- produire un rapport.

Execution reelle:
- Aucun test destructif lance sur la production.
- Aucun brute force reel de comptes ou mots de passe.
- Aucun fuzzing agressif.
- Aucun scan authentifie, faute de compte de test dedie fourni.
- Aucun enregistrement metier cree.
- Les seules traces produites cote serveur sont des requetes HTTP de test, des erreurs attendues et des compteurs rate-limit temporaires.

Raison:
- La production publique ne doit pas recevoir de tests destructifs ou agressifs sans perimetre ecrit, fenetre de test, sauvegarde validee, compte de test dedie et procedure de retour arriere.
- Les identifiants seed trouves dans le code (`demo/5555`, `admin/admin`, etc.) n'ont pas ete essayes sur prod/dev pour eviter de creer des sessions ou d'impacter des comptes partages.

## Tests executes

### 1. Rate limit login prod

Endpoint:
- `POST https://ongdngolu.org/api/auth/login`

Payload:
- utilisateur inexistant: `security-audit-nonexistent-user`
- mot de passe invalide

Volume:
- 12 tentatives espacees, sans dictionnaire de mots de passe.

Resultat:
- tentatives 1 a 10: `400`
- tentatives 11 et 12: `429 Too Many Requests`
- headers observes: `X-RateLimit-Limit: 10`, `Retry-After: 874`, `RateLimit-Policy: 10;w=900`

Conclusion:
- Le rate limit middleware `/auth/login` est actif en prod.
- Ce test a temporairement consomme le quota de l'IP de test pour `/auth/login`.

### 2. Controle acces sans token sur routes sensibles

Production:
- `GET /api/dashboard` -> `401`
- `GET /api/user` -> `401`
- `GET /api/role` -> `401`
- `GET /api/property-management/dashboard` -> `401`
- `GET /api/farmos/animals` -> `401`
- `GET /api/audit-log` -> `401`
- `GET /api/messages` -> `401`
- `GET /api/organizations` -> `401`

Developpement:
- memes routes testees sur `https://dev.ongdngolu.org`
- toutes retournent `401`

Conclusion:
- Les routes sensibles testees refusent correctement les requetes anonymes via le middleware public.

### 3. Controle auth/MFA sans token

Production:
- `GET /api/auth/refresh-token` -> `401`
- `GET /api/auth/sessions` -> `401`
- `POST /api/auth/logout` -> `401`
- `POST /api/auth/mfa/setup` -> `401`
- `POST /api/auth/mfa/verify` -> `401`
- `POST /api/auth/mfa/disable` -> `401`

Conclusion:
- Les routes auth protegees refusent l'acces anonyme.

### 4. Test secrets JWT faibles connus

Objectif:
- verifier si les secrets faibles trouves dans le depot sont utilises en prod/dev.

Secrets testes:
- `changeme_in_prod`
- `jwt_secret_key`
- `hahahhoho`
- `your-secret-key-here`

Methode:
- creation de JWT HS256 avec payload non sensible;
- appel `GET /api/account` avec `Authorization: Bearer <token>`;
- aucun endpoint mutateur utilise.

Resultat prod:
- les 4 tokens retournent `401`.

Resultat dev:
- les 4 tokens retournent `401`.

Conclusion:
- Ces secrets faibles connus ne semblent pas etre les secrets actifs sur prod/dev pour le middleware public.
- Le risque reste present dans le code et les fichiers `.env` suivis, car un mauvais deploiement pourrait reutiliser ces valeurs.

### 5. Routes publiques verifiees

Production:
- `GET /api/health` -> `200`
- `GET /api/setting` -> `200`
- `GET /api/product/public` -> `200`
- `GET /api/product-brand/public` -> `200`
- `GET /api/product-category/public` -> `200`
- `GET /api/email/public` -> `200`
- `GET /api/email-config/public` -> `200`
- `GET /api/property-management/contracts/sign/test-token` -> `404`
- `GET /api/tenant-onboarding` sans token -> `500`
- `GET /api/tenant-onboarding?token=invalid-token-for-security-audit` -> `404`

Conclusion:
- Les routes publiques de catalogue repondent.
- `tenant-onboarding` sans token doit etre corrige: repondre `400 Bad Request` ou `404`, pas `500`.

Fichier concerne:
- `backend2/src/property-management/tenant-onboarding-public.controller.ts`

### 6. CORS

Production:
- `GET /api/health` avec `Origin: https://ongdngolu.org` -> `200`, `Access-Control-Allow-Origin: https://ongdngolu.org`
- `GET /api/health` avec `Origin: https://evil.example` -> `500`, sans `Access-Control-Allow-Origin`

Developpement:
- `GET /api/health` avec `Origin: https://evil.example` -> `500`

Preflight:
- `OPTIONS /api/health` avec origin autorisee -> `403`
- `OPTIONS /api/health` avec origin externe -> `403`

Conclusion:
- CORS ne semble pas ouvert a une origine externe.
- Le rejet CORS produit un `500` au lieu d'un refus propre.
- Les requetes `OPTIONS` sont bloquees par le middleware whitelist, ce qui peut casser les vrais clients cross-origin ou natifs.

Fichiers concernes:
- `backend2/src/main.ts`
- `middleware/src/whitelist.js`
- `middleware/src/index.js`

### 7. Controle defense en profondeur backend2

Constat statique:
- Plusieurs controleurs mutables Nest n'ont pas de `JwtAuthGuard` visible et semblent compter sur le middleware externe.

Fichiers concernes:
- `backend2/src/accounts/accounts.controller.ts`
- `backend2/src/currencies/currencies.controller.ts`
- `backend2/src/discounts/discounts.controller.ts`
- `backend2/src/payment-methods/payment-methods.controller.ts`
- `backend2/src/suppliers/suppliers.controller.ts`
- `backend2/src/transaction-types/transaction-types.controller.ts`

Test prod:
- `POST /api/account` -> `401`
- `POST /api/currency` -> `401`
- `POST /api/discount` -> `401`
- `POST /api/payment-method` -> `401`
- `POST /api/supplier` -> `401`
- `POST /api/transaction-type` -> `401`

Conclusion:
- La prod est protegee par le middleware pour ces routes.
- Risque de defense en profondeur: si `backend2` est expose directement ou si la whitelist change, ces routes pourraient muter des donnees sans garde Nest.
- `CurrentOrg` retourne `1` par defaut si aucun utilisateur n'est attache a la requete, ce qui aggrave le risque en exposition directe.

Fichier concerne:
- `backend2/src/auth/decorators/current-org.decorator.ts`

## Nettoyage

Donnees metier creees:
- aucune.

Sessions creees:
- aucune connexion reussie executee.

Donnees a supprimer:
- aucune donnee applicative a supprimer.

Effets temporaires:
- quota rate-limit `/api/auth/login` consomme pour l'IP de test pendant environ 15 minutes;
- logs serveur generes par les requetes de test.

## Points critiques confirmes ou renforces

1. Le rate limit login existe et fonctionne.
2. Les secrets faibles connus du depot ne passent pas en prod/dev lors du test JWT signe.
3. Les routes sensibles testees retournent `401` sans token.
4. `/api/tenant-onboarding` retourne `500` sans token.
5. CORS refuse les origines externes mais produit `500` au lieu d'un refus propre.
6. Les preflights `OPTIONS` sont bloques par la whitelist.
7. Plusieurs controleurs backend2 mutables manquent de garde Nest interne.

## Corrections recommandees

Priorite haute:
- ajouter `JwtAuthGuard` directement dans tous les controleurs mutables backend2, meme si le middleware protege deja;
- changer `CurrentOrg` pour ne jamais retourner `1` par defaut dans un contexte qui exige auth;
- corriger `/api/tenant-onboarding` pour valider `token` et repondre `400/404`;
- corriger le handler CORS pour ne pas transformer un refus CORS en `500`;
- autoriser/gerer proprement `OPTIONS` dans le middleware pour les routes API necessaires.

Priorite deja notee dans `SECURITY_AUDIT_NOTES.md`:
- retirer les `.env` du depot et rotater les secrets;
- supprimer/corriger le login Google legacy;
- corriger `/auth/logout`;
- ne plus exposer `landlordSignature`;
- fermer `mail.ongdngolu.org:8088`;
- authentifier les WebSockets;
- sanitiser les rendus HTML;
- durcir la CSP;
- mettre a jour les dependances vulnerables.
