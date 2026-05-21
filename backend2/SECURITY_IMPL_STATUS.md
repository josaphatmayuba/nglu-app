# Security Implementation Status — backend2

Mis à jour : 2026-05-21. Source : SECURITY_NOTES.md + sessions de travail.

## Règles pour agents

1. **Avant de travailler** : marquer la phase `in_progress` dans ce fichier et committer.
2. **Après** : marquer `done` avec notes/PR. Committer.
3. **Jamais 2 agents sur la même phase** : vérifier ce fichier d'abord.
4. **`auth.service.ts` / `jwt-auth.guard.ts`** : réservés Phase 0, puis C/D/E seulement après Phase 0 done.

---

## Statut des phases

| Phase | Ticket | Owner | État | Branche/PR | Notes |
|-------|--------|-------|------|-----------|-------|
| **Phase 0** — Foundation auth | SCRUM-27 | Claude Sonnet | ✅ done | develop | TTL 15m, throttle login 5/min, bcrypt refresh token, logout revoke sessions, Helmet |
| **Phase A** — Super-admin DB flag | SCRUM-28 | Claude Sonnet | ✅ done | develop | `roles.is_system` migration+guard. Evil-super-admin ne bypass pas. |
| **Phase B** — Password policy | SCRUM-33 | Claude Sonnet | ✅ done | develop | MinLength 12, MaxLength 64, lettre+chiffre. CI `npm audit --audit-level=high`. |
| **Phase C** — Audit log | SCRUM-30 | Claude Sonnet | ✅ done | develop | `audit_log` table, AuditService avec redaction auto password/token/secret. |
| **Phase D** — Password reset | SCRUM-31 | Claude Sonnet | ✅ done | develop | Token UUID→SHA-256, one-shot, 15min expiry, revoke sessions, anti-enum. |
| **Phase E** — Anti-IDOR | SCRUM-29 | Claude Sonnet | 🚫 blocked | — | Audit 2026-05-21: aucun `organization_id` dans le schéma. Système mono-org. Décision métier requise avant tout code. Voir note ci-dessous. |
| **Phase F** — MFA TOTP | SCRUM-32 | — | ❌ pending | — | Requiert Phase 0+A. Complexe: TOTP, backup codes, enforced pour super-admin. |
| **Phase G** — Prod hardening | SCRUM-34 | — | ⏸ deferred | — | Redis session cache, secrets manager. Optionnel. |

---

## Audit SCRUM-29 — Résultat schema (2026-05-21)

Tables PM auditées pour `organization_id` / `agency_id` / `owner_id` / `created_by` :

| Table | org_id | owner_id | created_by | Verdict |
|-------|--------|----------|------------|---------|
| `real_estate_properties` | ❌ | ❌ | ❌ | Aucune appartenance |
| `real_estate_units` | ❌ | ❌ | ❌ | Aucune appartenance |
| `real_estate_leases` | ❌ | ❌ | ❌ | tenantId = customer, pas d'org |
| `real_estate_rent_payments` | ❌ | ❌ | ❌ | Via lease uniquement |
| `real_estate_maintenance_requests` | ❌ | ❌ | ❌ | Aucune appartenance |
| `real_estate_contracts` | ❌ | ❌ | ✅ `created_by` (user) | Pas d'org |
| `real_estate_contract_templates` | ❌ | ❌ | ✅ `created_by` (user) | Pas d'org |
| `users` | ❌ | — | — | Pas d'org |
| `customers` | ❌ | — | — | Pas d'org |

**Conclusion** : Le système est **mono-tenant** — une seule organisation partage toutes les données. Il n'y a pas de risque IDOR cross-org car il n'y a qu'une org.

**Décision métier requise** (blocker) :

1. **Option A — Rester mono-tenant** : fermer Phase E comme N/A. La protection IDOR existante est le système de permissions (rôles). Acceptable si l'app n'est déployée que pour une seule société.
2. **Option B — Multi-tenancy minimaliste** : ajouter `organizations` table + `organization_id` FK sur toutes les tables PM + seeder un org par défaut + filtrer toutes les listes par org. Effort : 1-2 jours. Prérequis pour SaaS multi-clients.
3. **Option C — Row-level security par utilisateur** : ajouter `created_by_user_id` sur properties/units, les gestionnaires ne voient que ce qu'ils ont créé. Plus léger qu'Option B mais plus opinionné.

**Recommandation** : Option A si mono-client. Option B seulement si l'app doit supporter plusieurs sociétés distinctes sur la même instance.

---

## Vérification SCRUM-36 — Scénarios de sécurité

Tests exécutés sur `dev.ongdngolu.org` le 2026-05-21 :

| Scénario | Attendu | Résultat |
|----------|---------|----------|
| JWT signature tamperée (payload super-admin) | 401 Unauthorized | ✅ 401 |
| JWT signé avec mauvais secret | 401 Unauthorized | ✅ 401 |
| Brute force login > 5/min | 429 Too Many Requests | ✅ 429 après 4-5 tentatives |
| Role nommé `super-admin` créé via API (`is_system=0`) | Accès refusé aux routes protégées | ✅ is_system=0 confirmé |
| PUT `super-admin` (id=2, is_system=1) via API | 400 Bad Request | ✅ "System roles cannot be modified" |
| Reset password — réutilisation token | 410 Gone | ✅ 1 rejet confirmé en DB |
| Reset password — token expiré/invalide | 410 Gone | ✅ testé |
| Email inconnu `forgot-password` | 200 (anti-enum) | ✅ même réponse que email connu |
| Audit log — login OK/KO | Lignes en DB | ✅ `auth.login.ok`, `auth.login.fail`, etc. |
| Logout + refresh → sessions révoquées | `refreshToken = NULL` en DB | ✅ confirmé |
| IDOR cross-org | 404/403 | ❌ Non implémenté (SCRUM-29) |
| MFA TOTP super-admin | 401 sans code | ❌ Non implémenté (SCRUM-32) |
| CI CVE high → build rouge | Pipeline fail | ⏳ Actif le 02/06/2026 (pipelines rechargés) |

---

## Fichiers critiques par phase

| Fichier | Phase | Note |
|---------|-------|------|
| `src/auth/auth.service.ts` | 0, D | Login/logout/refresh/reset password |
| `src/auth/guards/jwt-auth.guard.ts` | 0 | Vérification JWT HS256 |
| `src/auth/guards/permissions.guard.ts` | A | Lecture `is_system` DB |
| `src/auth/password-reset.service.ts` | D | Token SHA-256, one-shot |
| `src/audit/audit.service.ts` | C | Redaction + écriture audit_log |
| `src/users/dto/create-user.dto.ts` | B | Password policy validators |
| `src/database/schema.ts` | tous | Tables: audit_log, password_reset_tokens, roles.is_system |
| `drizzle/0028_*.sql` | A | Migration is_system |
| `drizzle/0029_*.sql` | C | Migration audit_log |
| `drizzle/0030_*.sql` | D | Migration password_reset_tokens |
| `middleware/src/whitelist.js` | tous | Routes publiques/authentifiées |

---

## Risques non encore fermés

| Risque | Sévérité | Ticket |
|--------|----------|--------|
| Pas de JTI (session table) — logout ne révoque pas l'access token (15 min restants) | P0 partiel | SCRUM-27 (session table non faite) |
| IDOR cross-org non protégé | P0 | SCRUM-29 |
| Pas de MFA pour super-admin | P1 | SCRUM-32 |
