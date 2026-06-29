# Plan de remediation securite

Date: 2026-06-29

## Objectif

Corriger les failles confirmees sans casser les flux existants, en priorisant les changements:
- a fort impact securite;
- localisables dans le code;
- verifiables par typecheck/build;
- sans rotation de secrets ni changement infra tant que les valeurs prod ne sont pas disponibles.

## Corrections appliquees

### 1. Logout IDOR

Faille:
- `/auth/logout` utilisait l'ID fourni par le client dans le body.

Impact avant correction:
- un utilisateur authentifie pouvait potentiellement deconnecter/revoquer la session d'un autre utilisateur en envoyant son ID.

Correction:
- le logout utilise maintenant `req.user.sub` issu du JWT valide.
- l'ID envoye par le client est ignore.

Fichier:
- `backend2/src/auth/auth.controller.ts`

Impact fonctionnel:
- les clients peuvent continuer a appeler `/auth/logout`.
- le champ body `id` devient inutile.

### 2. Login Google legacy

Faille:
- `/googlelogin/login` decodait le JWT Google sans verifier la signature.

Impact avant correction:
- si la route etait exposee, un attaquant pouvait forger un faux token Google.

Correction:
- verification via `google-auth-library.verifyIdToken`.
- verification de l'audience Google avec `GOOGLE_CLIENT_ID`.
- refus si l'email Google est indique mais non verifie.
- suppression du fallback dangereux `body.googleId`.

Fichier:
- `backend2/src/compat/compat.service.ts`

Impact fonctionnel:
- le flux legacy exige maintenant un vrai token Google.
- si `GOOGLE_CLIENT_ID` n'est pas configure, la route refuse proprement.

### 3. Signature publique dans `/api/setting`

Faille:
- `landlordSignature` etait retournee par l'endpoint public.

Impact avant correction:
- exposition publique d'une signature potentiellement sensible.

Correction:
- `/setting` est maintenant protege par JWT et utilise l'organisation du token.
- ajout de `/setting/public` pour les besoins publics minimaux.
- `/setting/public` ne lit plus `appSetting` avec `organization_id = 1`.
- les mises a jour internes gardent l'acces a la version complete.

Fichiers:
- `backend2/src/app-settings/app-settings.controller.ts`
- `backend2/src/app-settings/app-settings.service.ts`
- `middleware/src/whitelist.js`

Impact fonctionnel:
- les ecrans admin authentifies gardent les settings complets de leur organisation.
- les pages publiques ne recoivent plus les settings tenant de l'organisation 1.
- si une page publique a besoin du branding, elle doit utiliser `/setting/public`.

### 4. `tenant-onboarding` sans token

Faille:
- `/tenant-onboarding` sans token retournait `500`.

Impact avant correction:
- bruit logs/monitoring;
- erreur publique non maitrisee;
- surface de robustesse faible.

Correction:
- validation explicite du token sur `GET`, `save`, `submit`.
- reponse `400 Bad Request` si token absent.

Fichier:
- `backend2/src/property-management/tenant-onboarding-public.controller.ts`

Impact fonctionnel:
- les liens valides continuent de fonctionner.
- les requetes sans token sont rejetees proprement.

### 5. CORS origine externe

Faille:
- une origine externe rejetee generait un `500`.

Impact avant correction:
- faux positifs monitoring;
- logs inutiles;
- comportement API non propre.

Correction:
- le callback CORS renvoie `cb(null, false)` au lieu de lever une erreur.

Fichier:
- `backend2/src/main.ts`

Impact fonctionnel:
- les origines autorisees restent autorisees.
- les origines externes restent refusees sans produire de `500`.

### 6. Preflight `OPTIONS`

Faille:
- le middleware bloquait les requetes `OPTIONS`.

Impact avant correction:
- preflight CORS casse pour certains clients web/natifs.

Correction:
- le middleware laisse passer `OPTIONS` vers le backend.

Fichier:
- `middleware/src/index.js`

Impact fonctionnel:
- les preflights peuvent etre traites par la config CORS Nest.
- les vraies requetes restent soumises a la whitelist/JWT.

### 7. Defense en profondeur sur controleurs mutables

Faille:
- plusieurs controleurs backend2 mutables comptaient surtout sur le middleware externe.

Impact avant correction:
- si backend2 etait expose directement, certaines routes pouvaient lire/modifier les donnees avec `CurrentOrg` par defaut.

Correction:
- ajout de `JwtAuthGuard` et `ApiBearerAuth` sur les controleurs:
  - `accounts`
  - `currency`
  - `discount`
  - `payment-method`
  - `supplier`
  - `transaction-type`

Fichiers:
- `backend2/src/accounts/accounts.controller.ts`
- `backend2/src/currencies/currencies.controller.ts`
- `backend2/src/discounts/discounts.controller.ts`
- `backend2/src/payment-methods/payment-methods.controller.ts`
- `backend2/src/suppliers/suppliers.controller.ts`
- `backend2/src/transaction-types/transaction-types.controller.ts`

Impact fonctionnel:
- les appels via le middleware avec JWT continuent.
- les appels directs a backend2 sans JWT sont refuses.

### 8. `DELETE /transaction-type/:id`

Faille:
- en dev, `DELETE /api/transaction-type/:id` retournait `404` et ne supprimait pas, alors que `PATCH` supprimait.

Impact avant correction:
- API incoherente;
- nettoyage automatique non fiable;
- risque de laisser des donnees de test.

Correction:
- separation explicite des handlers `PATCH` et `DELETE`.
- les deux appellent le service `remove`.

Fichier:
- `backend2/src/transaction-types/transaction-types.controller.ts`

Impact fonctionnel:
- `PATCH` reste compatible.
- `DELETE` devrait maintenant fonctionner correctement.

### 9. WebSockets chat/discussion

Faille:
- les gateways Socket.IO acceptaient `cors: "*"` et faisaient confiance aux `userId` envoyes par le client.

Impact avant correction:
- usurpation possible d'un utilisateur sur les sockets;
- messages ou abonnements possibles sans controle serveur suffisant;
- exposition inutile a des origins non maitrisees.

Correction:
- ajout d'une validation JWT au handshake Socket.IO.
- verification de session active, non revoquee, non expiree.
- verification de l'utilisateur actif et de son organisation.
- l'identite utilisateur est derivee du token et stockee dans `client.data`.
- les payloads socket ne peuvent plus imposer `userId`.
- verification serveur de l'acces aux channels/discussions avant join, lecture ou envoi.
- CORS socket restreint aux origins configurees.

Fichiers:
- `backend2/src/auth/ws-auth.service.ts`
- `backend2/src/auth/auth.module.ts`
- `backend2/src/chat/chat.gateway.ts`
- `backend2/src/chat/chat.service.ts`
- `backend2/src/discussion/discussion.gateway.ts`
- `backend2/src/discussion/discussion.service.ts`
- `backend2/src/discussion/discussion.controller.ts`

Impact fonctionnel:
- les clients doivent envoyer le JWT dans `handshake.auth.token` ou `Authorization: Bearer`.
- les salons/discussions arbitraires par ID sont refuses si l'utilisateur n'est pas autorise.
- les flux legitimes doivent passer par les endpoints qui creent ou rattachent correctement le participant.

### 10. Frontend settings public/authentifie

Faille:
- apres protection de `/setting`, un frontend non authentifie pouvait encore tenter l'ancien endpoint.

Correction:
- `getSetting()` appelle `/setting` quand un token local existe.
- sinon, il appelle `/setting/public`.

Fichier:
- `frontend/src/redux/rtk/features/setting/settingSlice.js`

Impact fonctionnel:
- pre-login/public garde un endpoint minimal.
- les ecrans authentifies recuperent les settings de leur organisation.

## Verification effectuee

Commandes:
- `cmd.exe /c npm run typecheck` dans `backend2`
- `cmd.exe /c npm run build` dans `backend2`
- `cmd.exe /c npm run build:dev` dans `frontend`
- `node --check middleware/src/index.js`

Resultat:
- typecheck OK.
- build OK.
- build frontend OK avec warnings existants Vite: `lottie-web` utilise `eval` et certains chunks depassent 500 kB.
- syntaxe middleware OK.

## Restant a traiter

### Secrets et `.env`

Statut:
- non corrige automatiquement.

Raison:
- il faut rotater les secrets reels et verifier les variables d'environnement de prod.

Action recommandee:
- retirer les `.env` reels du suivi Git;
- rotater JWT/refresh/DB/SMTP/Twilio;
- rendre les secrets obligatoires en prod;
- ajouter une validation au demarrage.

### Admin mail `:8088`

Statut:
- non corrige dans le code applicatif.

Raison:
- correction infra/firewall/reverse proxy.

Action recommandee:
- fermer le port public;
- limiter par VPN/IP admin;
- forcer HTTPS si l'interface reste exposee.

### WebSockets

Statut:
- corrige cote code pour l'authentification, l'usurpation `userId`, le CORS socket et les controles d'acces principaux.

Action recommandee:
- retester en dev apres deploiement avec un compte standard et un compte d'une autre organisation;
- verifier les applications socket clientes en staging si elles utilisent un format de handshake different.

### XSS frontend

Statut:
- non corrige dans cette passe.

Raison:
- plusieurs composants et flux HTML; correction a faire avec sanitation centralisee et tests UI.

Action recommandee:
- centraliser DOMPurify;
- remplacer les `dangerouslySetInnerHTML` non sanitisés;
- durcir CSP apres nettoyage.

### Uploads

Statut:
- non corrige dans cette passe.

Raison:
- demande un helper commun et tests par endpoint.

Action recommandee:
- valider MIME, extension et magic bytes;
- taille max stricte;
- extension derivee du MIME valide;
- ne jamais faire confiance a `originalname`.

### Tests RBAC/multitenant

Statut:
- partiel.

Raison:
- le compte demo fourni est `super-admin`.

Action recommandee:
- creer/fournir un compte standard;
- un compte client/locataire;
- un compte d'une autre organisation;
- tester IDOR et isolation org avec ces comptes.
