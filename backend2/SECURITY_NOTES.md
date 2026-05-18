# Backend2 — Audit sécurité & propositions

État au 2026-05-16. Format : **constat → ce que je propose → effort estimé**.

Ce document est collaboratif. Ajoutez vos propositions dans la section [Propositions utilisateur](#propositions-utilisateur) en bas — ne modifiez pas les sections "Constat" sans noter pourquoi.

---

## Architecture actuelle (rappel)

Pipeline d'autorisation NestJS :

```
Requête → JwtAuthGuard → PermissionsGuard → Controller
```

- **JWT** : HS256, secret `env.jwtSecret`, payload `{ sub, roleId, role }`, TTL **6 h** pour access token, **30 j** pour refresh.
- **Refresh token** : signé avec `env.refreshSecret`, stocké en cookie httpOnly **et** en clair dans `users.refreshToken` (DB).
- **Super-admin** : bypass par comparaison `user.role === "super-admin"` (string depuis JWT).
- **Permissions** : table `rolePermissions JOIN permissions`, cache process-local 30 s par roleId.
- **Logout** : met `isLogin = "false"` + nettoie `refreshToken` en DB. **Ne révoque PAS l'access token actif**.
- Pas de rate limit. Pas de Helmet. Pas d'audit log.

Fichiers clés :
- [auth.service.ts](src/auth/auth.service.ts)
- [auth.controller.ts](src/auth/auth.controller.ts)
- [jwt-auth.guard.ts](src/auth/guards/jwt-auth.guard.ts)
- [permissions.guard.ts](src/auth/guards/permissions.guard.ts)
- [permissions.decorator.ts](src/auth/decorators/permissions.decorator.ts)
- [main.ts](src/main.ts)

---

## Mes propositions (claude)

### 🔴 P0-1 — Access token TTL 15 min + refresh 7 j

**Constat** — [auth.service.ts:38](src/auth/auth.service.ts#L38) signe l'access token avec `expiresIn: "6h"`. Si un token fuite (XSS, vol d'un appareil non verrouillé, dump d'un log), l'attaquant a 6 h d'accès. Couplé au fait que le logout ne révoque pas l'access token, c'est la fenêtre d'exposition réelle.

**Proposition** :
- Access token : `15m`
- Refresh token : `7d` au lieu de `30d`
- Frontend doit déjà gérer le refresh automatique (à vérifier) — sinon ajouter un intercepteur axios qui appelle `/auth/refresh` au 401.

**Pourquoi 15 min** : standard de l'industrie (OAuth2 BCP, draft-ietf-oauth-security-topics). Borne acceptable entre UX (rafraîchir 4 fois/h) et risque.

**Effort** : 5 min côté backend, 30 min côté frontend si l'intercepteur n'existe pas.

---

### 🔴 P0-2 — Rate limiting sur `/auth/login`

**Constat** — Rien dans [main.ts](src/main.ts) ni dans [auth.controller.ts](src/auth/auth.controller.ts). Brute force libre sur les mots de passe. Bcrypt ralentit l'attaquant mais ne le bloque pas — 100 requêtes/seconde par IP, ça monte vite sur un mot de passe faible.

**Proposition** :
- `@nestjs/throttler` global : `{ ttl: 60, limit: 60 }` par défaut (60 req/min/IP)
- Surcharge sur `POST /auth/login` : `{ ttl: 60, limit: 5 }` (5 essais/min/IP)
- Bonus : lockout temporaire par username après N échecs (15 min) — table `loginAttempts(username, count, lockedUntil)`. À discuter — alternative plus simple : juste le throttler IP est déjà 80 % du bénéfice.

**Effort** : 30 min sans le lockout par username, 2 h avec.

---

### 🟠 P1-1 — Super-admin via flag DB au lieu de match sur le nom

**Constat** — [permissions.guard.ts:51](src/auth/guards/permissions.guard.ts#L51) : `if (user.role === "super-admin") return true`. Deux problèmes :
1. Si quelqu'un crée un rôle nommé `"super-admin"` via l'API roles, il a tout (à confirmer : existe-t-il une garde sur la création de rôles ?).
2. Le check lit la string depuis le **JWT**, donc si on rétrograde un super-admin, son token reste tout-puissant pendant 6 h (couplé à P0-1, fenêtre réduite à 15 min).

**Proposition** :
- Ajouter colonne `roles.isSystem` (boolean, default false) — ou `isSuperAdmin`
- Set à `true` uniquement via seed/migration ; rejeter `true` dans le DTO de création/update de role
- Le guard lit le flag depuis la DB (avec le même cache 30 s) au lieu de comparer une string du JWT

**Effort** : 1 h (migration Drizzle + update guard + DTO whitelist).

---

### 🟠 P1-2 — Hash du refresh token avant stockage en DB

**Constat** — [auth.service.ts:48](src/auth/auth.service.ts#L48) : `set({ refreshToken, isLogin: "true", ... })` stocke la string JWT en clair. Si la table `users` fuit (backup volé, SQL injection ailleurs, dump dev partagé) → 30 jours d'accès sur chaque utilisateur connecté.

**Proposition** :
- Hasher avec SHA-256 (suffisant pour un secret long et aléatoire — pas bcrypt qui est trop lent au refresh)
- Stocker `users.refreshTokenHash` au lieu de `refreshToken`
- À la vérif : hasher le token reçu et comparer

**Effort** : 1 h (migration de colonne + update `login` / `logout` / `refreshAccessToken`).

---

### 🔴 P0-3 — Verrouiller explicitement l'algorithme JWT à HS256

**Constat** — [jwt-auth.guard.ts:20](src/auth/guards/jwt-auth.guard.ts#L20) appelle `verify(token, { secret })` sans `algorithms`. Historiquement, l'attaque dite *alg confusion* exploitait des serveurs qui acceptaient un header `"alg": "none"` ou `"HS256" → "RS256"` pour bypasser la signature. Les libs modernes (`jsonwebtoken` ≥ 9, `@nestjs/jwt` récent) rejettent `none` par défaut, mais c'est défensif d'expliciter.

**Proposition** :
```ts
this.jwtService.verify(token, {
  secret: env.jwtSecret,
  algorithms: ["HS256"],
});
```

Et même chose dans `auth.service.ts` pour `refreshAccessToken`.

**Effort** : 2 min, 2 lignes.

---

### 🟡 P2-1 — Helmet

**Constat** — [main.ts](src/main.ts) n'a pas `helmet()`. Headers de sécu (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, etc.) absents.

**Proposition** : `app.use(helmet())` — défauts sont bons.

**Effort** : 5 min (1 ligne + `npm install helmet`).

---

### 🟡 P2-2 — Audit log basique

**Constat** — Aucune trace des login/logout/échec d'auth/changements de role-permissions. Difficile de détecter et investiguer un abus.

**Proposition** :
- Table `auditLog(id, userId, action, target, ip, userAgent, ts, metadata jsonb)`
- Émettre depuis : login OK, login échoué, logout, refresh échoué, changement de role d'un user, ajout/retrait d'une permission à un rôle
- Pas besoin de tout logger (sinon explosion), juste les actions sensibles

**Effort** : 2-3 h (table + service + appel depuis 5-6 endroits).

---

### 🟡 P2-3 — Vérif `isLogin` OU blacklist Redis (révocation immédiate)

**Constat** — Logout met `isLogin = "false"` mais le guard ne le check pas. Un access token reste utilisable jusqu'à expiration. Le backend Laravel (backend1) check `isLogin` dans son middleware — backend2 a régressé.

**Proposition** :
- **Option A (simple)** : ajouter `isLogin` check dans `JwtAuthGuard`. Coût : 1 lecture DB par requête authentifiée. Avec un index sur `users.id` c'est rapide (<1 ms) mais perd l'aspect stateless du JWT.
- **Option B (propre)** : blacklist Redis. Au logout, ajouter `jti` (à inclure dans le JWT) avec TTL = durée restante du token. Guard check `redis.exists(jti)`. Stateless préservé, scale OK.
- **Option C (le plus simple)** : ne pas faire ça et compter sur P0-1 (15 min de fenêtre acceptable).

Mon choix : **C** d'abord (gratuit, livré par P0-1), puis **B** plus tard si on veut révocation immédiate (ex. button "Déconnecter tous mes appareils").

**Effort** : 0 si C, 2-4 h si B.

---

### 🟢 P3-1 — Cache permissions sur Redis (multi-instance)

**Constat** — [permissions.guard.ts:17](src/auth/guards/permissions.guard.ts#L17) : cache process-local. Documenté dans le code. Pas un problème tant qu'on tourne sur 1 instance, mais bloquant à scale.

**Proposition** : remplacer le `Map` par un client Redis (DI `@Inject("REDIS")`), même API.

**Effort** : 4 h (setup Redis si pas déjà là + refactor du cache).

---

### 🔴 P0-4 — Autorisation au niveau ressource (anti-IDOR)

**Constat** — `@Permissions("readSingle-property")` autorise un utilisateur à appeler `GET /properties/:id`, mais ne vérifie **PAS** qu'il a le droit d'accéder à *cette* propriété. C'est l'**IDOR** (Insecure Direct Object Reference) — n°1 dans le top OWASP API. Concrètement :

- Bob a la permission `readSingle-property`.
- Bob appelle `GET /properties/42` (sa propriété) → OK
- Bob appelle `GET /properties/43` (la propriété d'Alice) → **OK aussi, alors qu'il ne devrait pas**

Le backend ne vérifie pas le lien d'appartenance. Si on a une notion d'organisation / propriétaire / agence dans le modèle de données (à confirmer dans le schéma Drizzle), c'est un trou béant.

**Proposition** :
- Identifier dans le modèle de données qui « possède » quoi : `properties.organizationId`, `properties.ownerId`, ou équivalent
- Ajouter un check dans chaque service de lecture/écriture : `if (resource.ownerId !== user.organizationId) throw new ForbiddenException()`
- Alternative plus propre : un `OwnershipGuard` ou un décorateur `@CheckOwnership("property")` qui factorise

**Effort** : 4-8 h selon le nombre de modèles à couvrir. Critique si l'app sera utilisée par plusieurs orgs/agences.

**À vérifier d'abord** : est-ce que le backend a une notion de multi-tenancy ? Si oui c'est urgent. Si c'est mono-org pour l'instant, c'est P1.

---

### 🟠 P1-3 — MFA / 2FA pour les comptes à privilèges

**Constat** — Login = mot de passe seul. Un mot de passe volé (phishing, leak, reuse depuis un autre service) donne accès direct à un compte admin = catastrophe.

**Proposition** :
- TOTP (Google Authenticator / Authy / 1Password) — standard, gratuit, fait avec `otplib`
- Activable au minimum pour les rôles avec permissions `create-*`, `update-*`, `delete-*` sur les ressources sensibles (paiements, baux, users)
- Stocker `users.totpSecret` (chiffré au repos idéalement) + `users.totpEnabled`
- Au login : si TOTP activé, demander le code à 6 chiffres après le mot de passe
- Codes de récupération (10 codes one-shot stockés hashés) en cas de perte du téléphone

**Effort** : 1-2 jours (incl. UI frontend).

**Pourquoi P1 et pas P0** : impact UX significatif, à activer progressivement (d'abord opt-in admin, puis obligatoire pour certains rôles).

---

### 🟠 P1-4 — Lockout par username après N échecs (complète P0-2)

**Constat** — P0-2 (throttler IP) bloque un attaquant qui tape depuis une IP. Mais un botnet distribué (1000 IPs × 5 essais = 5000 essais) passe sous le radar. Il faut aussi un compteur **par username**.

**Proposition** :
- Table `loginAttempts(username, failedCount, lockedUntil)` ou colonnes `users.failedLoginCount`, `users.lockedUntil`
- Logique : après 5 échecs consécutifs → lockout 15 min ; reset du compteur sur login réussi
- Message d'erreur identique en cas d'erreur de mot de passe OU de lockout (sinon on confirme à l'attaquant que le username existe)
- Notification email à l'utilisateur après lockout (« quelqu'un a essayé de se connecter »)

**Effort** : 2 h.

---

### 🟠 P1-5 — Sécuriser le flux de reset password

**Constat** — À vérifier dans le code : existe-t-il un flux « mot de passe oublié » ? Les bugs classiques de ce flux :
- Token de reset prédictible ou trop long-vivant
- Token réutilisable (devrait être one-shot)
- Pas de rate limit sur la demande de reset → spam des boîtes mail des users
- Réponse différente selon si l'email existe ou pas → énumération d'utilisateurs
- Reset ne révoque pas les sessions actives → si compte compromis, l'attaquant garde son accès

**Proposition** (si le flux existe) :
- Token UUID v4 (128 bits), TTL 30 min, one-shot (suppression après usage)
- Réponse identique `200 OK` si email existe ou pas
- Rate limit 3 demandes/heure/IP et /email
- Après reset réussi : **invalider toutes les sessions** de cet utilisateur (combiné avec U2, c'est trivial : `DELETE FROM sessions WHERE userId = ?`)

**Effort** : 2-4 h si le flux existe déjà, ~1 jour si à créer.

---

### 🟡 P2-4 — Vérifier la config du cookie refresh

**Constat** — [auth.controller.ts](src/auth/auth.controller.ts) pose le `refreshToken` en cookie. À vérifier qu'il est bien configuré contre les attaques cookie classiques (XSS, CSRF, sniffing).

**Proposition** — la config doit avoir :

```ts
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,        // ← pas accessible en JS (anti-XSS)
  secure: true,          // ← seulement HTTPS (en prod ; false ok en dev)
  sameSite: "strict",    // ← anti-CSRF ; "lax" minimum si on a des redirects cross-site
  path: "/auth",         // ← limité aux endpoints qui en ont besoin
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

Si `sameSite` n'est pas `strict` ou `lax`, ajouter un token CSRF sur les endpoints qui consomment le cookie.

**Effort** : 5 min de vérif + 5 min de fix si manquant.

---

### 🟡 P2-5 — Redaction des données sensibles dans les logs

**Constat** — Si une erreur est loggée avec le body de la requête (commun avec les interceptors NestJS), des passwords / tokens / numéros de carte peuvent finir dans les logs (= filesystem, Datadog, Sentry...) = re-fuite indirecte.

**Proposition** :
- Custom logger qui masque les clés `password`, `token`, `refreshToken`, `secret`, `authorization`, `creditCard`, etc. avant d'écrire
- Configurer Sentry / observabilité avec `beforeSend` qui scrub la PII
- Ne **jamais** logger le body brut d'une requête `/auth/*`

**Effort** : 1-2 h.

---

### 🟡 P2-6 — Dependency scanning en CI

**Constat** — Pas vu de check de vulnérabilités automatique. `npm audit` rapporte 57 vulnérabilités (15 moderate, 37 high, 5 critical) suite à `npm install leaflet`. Probablement des transitivés bien antérieures. Sans alerte automatique, on découvre une CVE active 6 mois après publication.

**Proposition** :
- **GitHub Dependabot** (gratuit) ou **Bitbucket** équivalent — PRs auto pour les MAJ de sécu
- Étape CI : `npm audit --audit-level=high` qui fait échouer le build sur vulnérabilité high/critical
- Audit manuel ponctuel : `npm audit --json | jq` pour trier
- Pour les 5 critical actuelles : à diagnostiquer, certaines viennent peut-être de `react-scripts` (CRA est abandonné, plein de transitivés dépassées)

**Effort** : 1 h pour brancher Dependabot + CI, puis triage continu.

---

### 🟢 P3-3 — Secrets management en prod (pas `.env` brut)

**Constat** — En dev, `.env` c'est fine. En prod, secrets dans un fichier = risque de leak (commit accidentel, backup, accès SSH, dump container). De plus aucune rotation possible sans redéploiement.

**Proposition** :
- AWS Secrets Manager / GCP Secret Manager / HashiCorp Vault / Doppler
- Le backend lit ses secrets au boot via API du provider (avec rotation transparente)
- En cas de fuite suspectée : 1 clic pour rotater, redémarrage automatique des pods

**Effort** : 4-8 h selon le provider choisi. À planifier au moment du déploiement prod, pas avant.

---

### 🟢 P3-2 — Policy de mot de passe

**Constat** — À vérifier dans le user/customer controller : aucune contrainte de complexité visible côté DTO. Si on accepte `"123456"`, le throttler ne sauvera pas l'utilisateur seul contre lui-même.

**Proposition** : règle minimale via `class-validator` : longueur 12+, au moins 1 chiffre, 1 lettre. Pas de policy folle (max 64 char, pas de "doit contenir un symbole" — recos NIST 2023).

**Effort** : 30 min.

---

## Récap priorisé

| Prio | Item                                            | Effort   | Gain immédiat                            |
|------|-------------------------------------------------|----------|------------------------------------------|
| 🔴 P0 | P0-1 Access token 15 min + refresh 7d          | 5 min    | Fenêtre d'exposition ÷24                 |
| 🔴 P0 | P0-2 Throttler login                            | 30 min   | Brute force bloqué (par IP)              |
| 🔴 P0 | P0-3 Verrouiller algo HS256 explicite           | 2 min    | Ferme l'attaque alg confusion            |
| 🔴 P0 | P0-4 **Anti-IDOR (autorisation niveau ressource)** | 4-8 h | Empêche Bob de lire les données d'Alice  |
| 🔴 P0 | **U2 Table sessions (preuve de connexion)**     | 2-3 h    | **JWT_SECRET fuite ≠ accès** + logout immédiat |
| 🟠 P1 | P1-1 Super-admin via flag DB                    | 1 h      | Plus de bypass par string                |
| 🟠 P1 | P1-2 Hash refresh token DB                      | 1 h      | DB leak ≠ accès libre 30 j               |
| 🟠 P1 | P1-3 MFA/2FA TOTP pour admin                    | 1-2 j    | MdP volé seul ≠ compromission            |
| 🟠 P1 | P1-4 Lockout par username après N échecs        | 2 h      | Botnet distribué bloqué                  |
| 🟠 P1 | P1-5 Sécuriser le flux reset password           | 2 h-1 j  | Anti-énumération + token one-shot        |
| 🟠 P1 | U1 Vérif user actif + roleId en DB              | 30 min   | Compte révoqué bloqué immédiatement      |
| 🟡 P2 | P2-1 Helmet                                     | 5 min    | Headers sécu standards                   |
| 🟡 P2 | P2-2 Audit log                                  | 2-3 h    | Détection/forensics                      |
| 🟡 P2 | P2-3 isLogin check                              | _retiré_ | **Couvert par U2**                       |
| 🟡 P2 | P2-4 Vérif config cookie refresh (httpOnly/secure/sameSite) | 10 min | XSS + CSRF                       |
| 🟡 P2 | P2-5 Redaction logs (passwords, tokens)         | 1-2 h    | Logs ≠ source de leak                    |
| 🟡 P2 | P2-6 Dependency scanning CI (Dependabot)        | 1 h      | CVE détectée en heures, pas en mois      |
| 🟢 P3 | P3-1 Cache permissions Redis                    | 4 h      | Cohérence multi-instance                 |
| 🟢 P3 | P3-2 Password policy                            | 30 min   | Hygiène utilisateur                      |
| 🟢 P3 | P3-3 Secrets manager en prod (pas .env)         | 4-8 h    | Rotation + zero `.env` sur disque        |

**Recommandé pour un sprint de sécurité (1-2 jours)** :
P0-1 + P0-2 + P0-3 + P0-4 + **U2** + P1-1 + P1-2 + U1 + P2-1 + P2-4 + P2-6 = ~12-16 h de travail, ferme l'écrasante majorité des risques sérieux.

**Si on doit choisir 3 choses** :
1. **U2** (sessions DB) — seule mitigation contre fuite de `JWT_SECRET`
2. **P0-4** (anti-IDOR) — risque le plus probable d'exploitation réelle dans une app multi-org
3. **P0-2** (throttler login) — le plus simple à mettre en place pour fermer le brute force

**Pour quand l'app sera en prod réelle avec des utilisateurs** : ajouter P1-3 (MFA) et P3-3 (secrets manager).

---

## Propositions utilisateur

### 🟠 U1 — Double sécurité : vérifier l'utilisateur + sa permission directement en DB sur chaque action sensible

**Proposé par** : utilisateur, 2026-05-16.

**Idée** — Le frontend cache déjà les écrans interdits via `UserPrivateComponent`. Le backend, lui, ne se fie qu'au JWT (signature + payload). Ajouter une **deuxième barrière** : avant d'exécuter une action sensible, le backend re-vérifie en DB que l'utilisateur a réellement la permission. Comme ça même si le JWT a été dérobé / l'utilisateur révoqué, on bloque à la dernière marche.

**Ce qui existe déjà côté backend2** :
- Le `PermissionsGuard` n'est PAS purement JWT : il lit `rolePermissions JOIN permissions` en DB pour résoudre les permissions du `roleId`.
- Limite actuelle : **cache mémoire 30 s par roleId** → une permission révoquée reste effective jusqu'à 30 s, et on **ne vérifie pas** :
  - que l'`userId` du JWT existe toujours en DB
  - que `user.isLogin` est `true`
  - que le `roleId` du JWT correspond toujours au `roleId` actuel de l'utilisateur

**Proposition concrète** — Ajouter une vérif DB par requête, avec 3 niveaux possibles (du moins cher au plus complet) :

1. **Minimal** : dans `JwtAuthGuard`, après vérif signature, faire `SELECT id, roleId, isLogin FROM users WHERE id = sub`. Rejeter si user introuvable, `isLogin = false`, ou `roleId` ≠ payload.roleId. Coût : ~1 ms par requête authentifiée (1 lookup PK indexé). Élimine 90 % du risque.

2. **Moyen** : en plus du minimal, vider le cache permissions de `permissions.guard.ts` (passer de TTL 30 s à TTL 0). Coût : 1 lookup PK + 1 JOIN par requête authentifiée + sur action protégée. Élimine la fenêtre de 30 s.

3. **Complet** : ajouter un middleware d'audit qui logge chaque check refusé (`userId, route, permission_requise, timestamp, ip`). Permet de détecter qu'un compte compromis essaie d'aller plus haut que ses droits.

**Pourquoi c'est bon (defense in depth)** :
- Frontend masque l'UI → mais quelqu'un peut bypasser le frontend (curl, Postman, reverse engineering)
- JWT garantit "ce token a bien été émis par nous" → mais ne dit rien sur l'état actuel de l'utilisateur (révoqué, désactivé, mot de passe changé, rôle modifié)
- DB lookup garantit "à cet instant, cet utilisateur a vraiment cette permission"

**Effort** :
- Niveau 1 : 30 min (ajouter la requête + index si pas déjà présent)
- Niveau 2 : +5 min (juste virer le cache)
- Niveau 3 : recouvre P2-2 ci-dessus (audit log)

**Comment ça se combine avec mes propositions** :
- **Recouvre** P2-3 (vérif `isLogin`) → si U1 est adopté, on peut retirer P2-3 du backlog.
- **Réduit l'urgence** de P0-1 (TTL 15 min) : avec une vérif DB en temps réel, garder 6 h est moins risqué. Mais P0-1 reste utile car il limite les dégâts en cas de DB compromise (l'attaquant ne peut pas créer de tokens, il vole seulement ceux existants).
- **Conflit possible** avec scaling : 1 lookup DB par requête est OK à 100 req/s. À 1000 req/s, ça commence à compter — il faut soit un cache Redis très court (1-5 s) soit un index couvrant.

**Trade-off à trancher** :
- Niveau 2 = sécurité maximale mais perd l'intérêt "stateless" du JWT (le JWT devient juste un token d'identité, plus une preuve d'autorisation)
- Niveau 1 = bon compromis. La DB est seulement consultée pour des champs très courts (`id, roleId, isLogin`), 1 ligne, indexée
- Si on tient au stateless : faire le check DB seulement sur les routes `@Permissions("delete-*", "update-property", "create-payment")` etc. (actions sensibles), pas sur les `readAll-*`

---

### 🔴 U2 — Table `sessions` : "preuve de connexion" en DB, valider chaque requête contre

**Proposé par** : utilisateur, 2026-05-16.

**Idée** — À chaque login, créer une ligne en DB (« preuve de connexion »). À chaque requête, vérifier que cette ligne existe et est encore valide. Si le `JWT_SECRET` fuite et qu'un attaquant forge un token, **la signature sera valide mais aucune session n'existera en DB → rejet**.

**Pourquoi c'est puissant** — C'est la mitigation la plus efficace contre une fuite de `JWT_SECRET` :

| Attaque | Sans U2 | Avec U2 |
|---|---|---|
| JWT volé (vrai token) | reste valide jusqu'à expiration | reste valide jusqu'à logout ou expiration |
| **JWT_SECRET volé** | attaquant peut forger des tokens à volonté | **forgés mais rejetés** (pas de session) |
| Logout | access token reste utilisable 6 h | invalidé immédiatement |
| « Déconnecter tous mes appareils » | impossible sans changer la clé globale | suppression des lignes de cet utilisateur |

**Schéma proposé** :

```sql
CREATE TABLE sessions (
  jti          UUID PRIMARY KEY,           -- JWT ID, généré à chaque login
  user_id      INT NOT NULL,
  role_id      INT NOT NULL,               -- snapshot au moment du login
  created_at   TIMESTAMP DEFAULT NOW(),
  expires_at   TIMESTAMP NOT NULL,         -- = JWT exp
  last_used_at TIMESTAMP DEFAULT NOW(),
  ip           INET,
  user_agent   TEXT,
  revoked      BOOLEAN DEFAULT FALSE,
  INDEX (user_id, revoked)
);
```

**Flux concret** :

1. **Login** :
   - Générer un `jti` (UUID v4, 128 bits → impossible à deviner)
   - Inclure `jti` dans le payload JWT : `{ sub, roleId, role, jti }`
   - Insérer la ligne `sessions(jti, userId, roleId, expires_at = now + 15m, ip, userAgent)`
2. **Chaque requête** (dans `JwtAuthGuard` après `verify`) :
   - Lire `request.user.jti`
   - `SELECT 1 FROM sessions WHERE jti = ? AND revoked = false AND expires_at > now()`
   - Si pas trouvé → **401 Unauthorized**
   - Sinon : optionnel — `UPDATE sessions SET last_used_at = now() WHERE jti = ?` (asynchrone, pour stats / liste des sessions actives)
3. **Logout** :
   - `UPDATE sessions SET revoked = true WHERE jti = ?` (ou `DELETE`)
   - Le token JWT est physiquement encore valide mais le backend le rejette dès la requête suivante
4. **Refresh** :
   - Au moment du refresh, créer une nouvelle session (nouveau `jti`) et révoquer l'ancienne — rotation propre

**Pourquoi `jti` plutôt que juste `userId`** :
- Permet **plusieurs sessions par user** (mobile + desktop + tablette) sans s'écraser
- Permet de révoquer **une seule session** (« déconnecter le téléphone perdu ») sans toucher aux autres
- Standard JWT (RFC 7519) — supporté nativement par toutes les libs

**Pourquoi UUID v4 et pas un ID séquentiel** :
- 128 bits aléatoires → un attaquant ne peut pas deviner un `jti` valide
- Sinon, avec un autoincrement, après JWT_SECRET volé, l'attaquant fait `for i in 1..10000: try jti=i` et il finit par tomber sur un valide

**Coût** :
- 1 SELECT indexé par requête authentifiée (~1 ms)
- 1 INSERT au login (négligeable)
- 1 UPDATE au logout (négligeable)
- Cache Redis optionnel pour amortir le SELECT à scale (mais à 100 req/s c'est inutile)

**Effort** : 2-3 h
- Migration Drizzle pour la table `sessions` (30 min)
- Génération `jti` + INSERT au login dans `auth.service.ts` (30 min)
- Lookup dans `JwtAuthGuard` (30 min)
- Update `logout` + `refreshAccessToken` (30 min)
- Cron job de nettoyage (`DELETE FROM sessions WHERE expires_at < now() - interval '7 days'`) (30 min)
- Tests (30 min)

**Combinaison avec mes propositions / U1** :
- **Remplace** P2-3 entièrement (révocation immédiate sans Redis)
- **Renforce** P1-2 (hash refresh token) — les deux sont indépendants
- **Compatible** avec U1 (User check) — U2 valide la session, U1 valide en plus que l'user est actif et que son rôle correspond. Si on adopte U2, U1 niveau 1 devient quasi-redondant (la session contient déjà roleId snapshot)
- **N'enlève pas** P0-1 (TTL court) — utile en combinaison : si la session table fuite, les `jti` collectés expirent vite
- **N'enlève pas** P1-1 (super-admin via flag DB) — c'est un risque différent (création de rôle malveillante, pas vol de token)

**Trade-off** :
- ✅ Sécurité maximale contre `JWT_SECRET` fuite + révocation immédiate + multi-device
- ❌ Perd le « JWT pur stateless » — mais c'est un mythe utile uniquement à très grande échelle. Pour notre app, 1 lookup DB indexé en plus est négligeable et le bénéfice sécurité énorme.

**Mon avis** — C'est la meilleure proposition de toute la liste. Je la mettrais en P0 à côté de tes autres priorités. Combiné avec P0-1 (TTL 15 min) + P0-2 (throttler) + P0-3 (algo lock), on couvre 95 % des risques sérieux avec ~5 h de travail total.

---

## Décisions actées

<!-- À mettre à jour une fois qu'on a tranché ensemble. -->

_(vide)_
