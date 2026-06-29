# Notes audit securite - nglu-app

Date: 2026-06-29

Portee:
- Revue passive du code local.
- Audit npm des projets avec lockfile.
- Tests passifs prod/dev sur `ongdngolu.org`, `dev.ongdngolu.org` et `mail.ongdngolu.org`.
- Tests authentifies controles sur dev avec compte demo autorise.
- Pas de test destructif ni bruteforce agressif sur prod.

## Priorite P0 - corriger immediatement

### Secrets et `.env` suivis dans Git

Constat:
- Plusieurs `.env` reels sont suivis dans le depot.
- Valeurs faibles ou dangereuses trouvees: `APP_DEBUG=true`, `DB_PASSWORD=password`, `JWT_SECRET=hahahhoho`, `REFRESH_SECRET=VIRVVIER`, `changeme_in_prod`, `jwt_secret_key`.

Fichiers concernes:
- `.env`
- `backend/.env`
- `backend/.env.docker`
- `backend2/src/config/env.ts`
- `middleware/src/index.js`
- `docker-compose.prod.yml`

Actions:
- Retirer les `.env` reels du suivi Git.
- Ajouter/renforcer `.gitignore`.
- Rotater JWT secret, refresh secret, DB password, SMTP/Twilio si deja utilises.
- Faire echouer le demarrage prod si un secret obligatoire est absent ou faible.

### Login Google legacy non verifie

Constat:
- `backend2/src/compat/compat.service.ts` decode le JWT Google en base64 sans verifier signature, audience, issuer ou expiration.
- Route: `backend2/src/compat/compat.controller.ts` -> `/googlelogin/login`.

Impact:
- Si la route est exposee, un attaquant peut forger un faux token Google et obtenir une session.

Actions:
- Supprimer cette route legacy si inutile.
- Sinon, deleguer au service Google officiel avec `google-auth-library.verifyIdToken`.

### Logout base sur un ID client

Constat:
- `backend2/src/auth/auth.controller.ts` utilise `@Body("id")` pour `/auth/logout`.

Impact:
- Un utilisateur authentifie peut potentiellement deconnecter/revoquer la session d'un autre utilisateur.

Action:
- Utiliser uniquement `req.user.sub` depuis le JWT.
- Ignorer tout ID envoye par le client.

### Signature exposee publiquement

Constat:
- `https://ongdngolu.org/api/setting` retourne publiquement `landlordSignature` en base64.

Fichiers concernes:
- `backend2/src/app-settings/app-settings.controller.ts`
- `backend2/src/app-settings/app-settings.service.ts`

Impact:
- Si c'est une vraie signature, exposition de donnee sensible.

Actions:
- Creer un DTO public sans signature/champs sensibles.
- Ou proteger `/api/setting` par authentification.

### Admin mail public en HTTP

Constat:
- `http://mail.ongdngolu.org:8088/admin/` repond en `200 OK`.
- Service admin accessible en clair sans TLS sur Internet.

Actions:
- Fermer le port 8088 publiquement.
- Limiter par firewall/VPN/IP admin.
- Si necessaire, mettre derriere reverse proxy HTTPS + authentification forte.

## Priorite P1 - eleve

### WebSockets sans authentification serveur

Constat:
- `backend2/src/chat/chat.gateway.ts` et `backend2/src/discussion/discussion.gateway.ts` ont `cors: "*"` et font confiance aux `userId` envoyes par le client.
- Les frontends envoient un token Socket.IO, mais le backend ne le valide pas.

Statut remediation:
- corrige cote code le 2026-06-29.
- ajout de validation JWT au handshake Socket.IO.
- identite utilisateur derivee du token, pas du payload client.
- verification serveur de l'acces aux channels/discussions.
- CORS socket restreint aux origins configurees.

Impact:
- Si les sockets sont exposes, usurpation d'utilisateur et messages non autorises possibles.

Actions restantes:
- Retester apres deploiement dev avec un compte standard et un compte d'une autre organisation.
- Verifier que toutes les apps clientes Socket.IO envoient bien le JWT dans le handshake.

### XSS via HTML rendu directement

Constat:
- Plusieurs composants utilisent `dangerouslySetInnerHTML` ou `innerHTML`.
- La CSP prod autorise encore `'unsafe-inline'`.

Exemples:
- `frontend/src/eCommerce/SingleProduct/ProductDetails.jsx`
- `frontend/src/components/product/DetailsProduct.jsx`
- `frontend/src/components/propertyManagement/SignContractPage.jsx`
- `frontend/src/components/propertyManagement/ContractsTab.jsx`

Actions:
- Centraliser une fonction de sanitation avec DOMPurify.
- Mettre a jour `dompurify`.
- Remplacer les rendus HTML non sanitisés.
- Durcir la CSP ensuite.

### Uploads pas toujours valides en profondeur

Constat:
- Certains endpoints utilisent l'extension de `originalname`.
- Certains uploads n'ont pas de validation magic bytes ni limite claire.

Exemples:
- `backend2/src/compat/compat.controller.ts`
- `backend2/src/compat/compat.service.ts`
- `backend2/src/app-settings/app-settings.service.ts`
- `backend2/src/property-management/property-management.service.ts`

Actions:
- Creer un helper upload commun.
- Allowlist MIME + extension.
- Validation magic bytes.
- Taille max stricte.
- Nom de fichier random, extension derivee du MIME valide.

## Priorite P2 - moyen

### CSP et headers a rationaliser

Constat:
- Headers securite globalement presents.
- CSP contient `unsafe-inline`.
- Certains headers semblent definis a la fois par Nginx et Helmet.

Actions:
- Avoir une seule source d'autorite pour les headers.
- Supprimer `unsafe-inline` quand les XSS surfaces sont corrigees.

### Dev fingerprinting

Constat:
- `https://dev.ongdngolu.org` expose `X-Environment: development`.

Action:
- Retirer cet header public ou limiter dev par auth/IP.

### SPA fallback sur chemins sensibles

Constat:
- `/.env`, `/.git/config`, `/backend/.env` retournent le fallback SPA en `200 text/html`.
- Pas de fuite directe observee, mais le statut est trompeur.

Action:
- Configurer Nginx pour retourner `403` ou `404` sur `.env`, `.git`, backups, archives, dumps.

### Backend Laravel legacy

Constat:
- `backend/routes/web.php` expose `/install`.
- `SetupController` peut ecrire `.env` et lancer `migrate:fresh --seed --force` si active.
- `backend/config/cors.php` autorise `allowed_origins => ['*']` avec credentials.

Action:
- Retirer Laravel legacy du build prod si inutilise.
- Sinon verrouiller `/install`, corriger CORS, et passer `APP_DEBUG=false`.

## Dependances npm

Resultats:
- `backend2`: 11 high.
- `chat-app`: 2 high.
- `journal-app`: 2 high.
- `farmos-app`: 1 high, 1 moderate.
- `frontend`: 2 moderate.
- `domus-app`: 1 moderate.
- `marketing-site`: 1 high.
- `avelomi-site`, `batipro-app`, `comptabilite-app`, `hr-app`, `migration-app`: 0.

Notes:
- Ne pas lancer `npm audit fix` aveuglement, surtout sur NestJS.
- Mettre a jour par projet avec tests de regression.
- `middleware`, `tickets-app`, `pdf-service` n'ont pas de lockfile npm auditable.
- `composer audit` non execute: PHP/Composer absents localement.

## Points positifs observes

- HTTP redirige vers HTTPS sur prod et dev.
- TLS 1.3 actif avec certificats Let's Encrypt valides.
- Ports backend directs `8001`, `3001` et DB `9306` non accessibles depuis le reseau de test.
- `/api/api-docs`, `/api/install`, `/api/googlelogin/login` bloques publiquement en prod.
- Headers presents: HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.

## Checklist courte

- [ ] Retirer les `.env` reels du depot.
- [ ] Rotater tous les secrets faibles ou exposes.
- [x] Supprimer ou verifier correctement `/googlelogin/login`.
- [x] Corriger `/auth/logout`.
- [x] Ne plus exposer `landlordSignature`.
- [x] Corriger `/tenant-onboarding` sans token (`500` -> `400`).
- [x] Corriger le rejet CORS externe qui generait `500`.
- [x] Laisser passer les preflights `OPTIONS` vers la couche CORS.
- [x] Ajouter `JwtAuthGuard` aux controleurs mutables identifies.
- [x] Retablir `DELETE /transaction-type/:id`.
- [x] Authentifier les WebSockets.
- [ ] Fermer `mail.ongdngolu.org:8088`.
- [ ] Sanitize HTML avec DOMPurify partout.
- [ ] Durcir la CSP.
- [ ] Uniformiser la validation upload.
- [ ] Mettre a jour les dependances vulnerables.
- [ ] Ajouter lockfiles pour les services sans audit npm.
