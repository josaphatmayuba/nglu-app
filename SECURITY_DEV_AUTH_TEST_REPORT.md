# Rapport tests securite authentifies sur dev

Date: 2026-06-29

## Perimetre

Cible:
- `https://dev.ongdngolu.org`

Compte utilise:
- utilisateur demo fourni par le proprietaire.
- Le mot de passe n'est pas documente dans ce rapport.

Autorisation:
- tests authentifies sur dev;
- simulation brute force;
- fuzzing controle;
- mutations/destructions limitees aux donnees de test creees pendant l'audit.

## Resume executif

Resultats importants:
- Connexion demo reussie, role observe: `super-admin`.
- Routes protegees accessibles avec token, refusees sans token.
- Brute force controle: blocage a partir de la 6e tentative.
- Fuzzing authentifie: 96 requetes, 0 erreur serveur `5xx`.
- Mutation destructive reversible: creation de 2 `transaction-type`, puis suppression confirmee.
- Anomalie API: `DELETE /api/transaction-type/:id` retourne `404`, mais `PATCH /api/transaction-type/:id` supprime vraiment.
- Aucune donnee de test restante trouvee avec le prefixe `SECURITY_TEST_20260629_`.

## Connexion authentifiee

Endpoint:
- `POST /api/auth/login`

Resultat:
- `200`
- token JWT retourne.
- utilisateur id observe: `1`
- role observe: `super-admin`

Limite:
- Comme le compte est `super-admin`, ce test ne prouve pas l'isolation RBAC pour des roles faibles.
- Il faudrait un compte standard, un compte locataire/client et un compte admin d'une autre organisation pour tester l'IDOR/multitenant correctement.

## Routes protegees avec token

Endpoints testes:
- `GET /api/account?query=all` -> `200`
- `GET /api/sub-accounts` -> `200`
- `GET /api/transaction-type` -> `200`
- `GET /api/currency` -> `200`
- `GET /api/audit-log` -> `200`

Conclusion:
- Le token demo permet bien l'acces aux routes admin attendues.

## Test destructif controle avec nettoyage

Objet cible:
- `transaction-type`

Donnees creees:
- `SECURITY_TEST_20260629_TX_NORMAL_*`
- `SECURITY_TEST_20260629_TX_XSS_<img src=x onerror=alert(1)>`

Creation:
- `POST /api/transaction-type` -> `201`, id `148`
- `POST /api/transaction-type` -> `201`, id `149`

Suppression tentee:
- `DELETE /api/transaction-type/148` -> `404`, mais `GET` retournait encore `200`
- `DELETE /api/transaction-type/149` -> `404`, mais `GET` retournait encore `200`

Suppression reussie:
- `PATCH /api/transaction-type/148` -> `200`, verification `GET` -> `404`
- `PATCH /api/transaction-type/149` -> `200`, verification `GET` -> `404`

Nettoyage:
- verification liste `/api/transaction-type`;
- `remainingSecurityTestTransactionTypes=0`.

Finding:
- L'API expose un comportement incoherent: le controleur declare `@Patch(":id")` et `@Delete(":id")` sur la meme methode, mais seul `PATCH` supprime en dev.

Fichier concerne:
- `backend2/src/transaction-types/transaction-types.controller.ts`

Risque:
- les clients REST qui utilisent `DELETE` croiront supprimer une ressource mais recevront `404`;
- les developpeurs peuvent contourner avec `PATCH`, ce qui rend l'API confuse;
- les tests automatiques devraient couvrir les deux verbes ou retirer l'un des deux.

## Fuzzing authentifie controle

Volume:
- 96 requetes.
- Concurrence: 8.

Payloads:
- SQL injection simple.
- XSS HTML/script.
- path traversal Unix/Windows.
- template injection.
- null byte.
- unicode long.
- chaine longue 4096 caracteres.
- tentative JSON/prototype pollution en contenu.

Endpoints fuzzes:
- `GET /api/transaction-type/:payload`
- `GET /api/account/:payload`
- `GET /api/product/public?key=:payload`
- `GET /api/tenant-onboarding?token=:payload`
- `GET /api/audit-log?page=:payload&limit=:payload`
- `POST /api/transaction-type` avec comptes invalides pour eviter creation.
- `POST /api/currency` avec champs requis invalides.
- `POST /api/tenant-onboarding/save?token=:payload`

Resultats:
- total: `96`
- `200`: `19`
- `400`: `44`
- `403`: `10`
- `404`: `22`
- `414`: `1`
- `5xx`: `0`

Conclusion:
- Aucun crash serveur observe pendant ce fuzzing borne.
- `414` sur URL trop longue est acceptable.
- Les `400/403/404` sont des rejets attendus.

## Brute force controle

Endpoint:
- `POST /api/auth/login`

Compte:
- `demo`

Volume:
- 15 mots de passe volontairement faux.
- Pas de dictionnaire externe.

Resultats:
- tentatives 1 a 5: `401`
- tentatives 6 a 15: `429`
- distribution: `401=5`, `429=10`

Conclusion:
- Le blocage intervient a partir de la 6e tentative.
- Le throttling Nest `@Throttle(limit: 5/min)` semble actif.
- Le middleware Express peut aussi avoir consomme son quota `/auth/login` et bloquer l'IP de test jusqu'a 15 minutes.

Fichiers concernes:
- `backend2/src/auth/auth.controller.ts`
- `middleware/src/index.js`

## Nettoyage final

Donnees applicatives creees:
- 2 `transaction-type`.

Donnees applicatives supprimees:
- 2 `transaction-type`.

Verification:
- aucun `transaction-type` restant avec prefixe `SECURITY_TEST_20260629_`.

Fichiers temporaires locaux:
- cookies/token temporaires supprimes apres generation du rapport.

Effets restants probables:
- logs serveur de test;
- rate-limit temporaire sur `/api/auth/login` pour l'IP de test.

## Recommandations

1. Corriger `DELETE /api/transaction-type/:id`.
   - Soit faire fonctionner `DELETE`.
   - Soit retirer `@Delete(":id")` et documenter `PATCH` comme soft/hard delete.

2. Ajouter des tests e2e pour les verbes mutateurs.
   - `POST`, `GET`, `PATCH`, `DELETE`.
   - Verification que les objets crees pendant le test sont supprimes.

3. Tester avec roles faibles.
   - compte standard;
   - compte client/locataire;
   - compte autre organisation.

4. Continuer le durcissement deja note.
   - secrets `.env`;
   - login Google legacy;
   - `/auth/logout`;
   - `/api/setting`;
   - WebSockets;
   - XSS frontend;
   - uploads;
   - CSP.
