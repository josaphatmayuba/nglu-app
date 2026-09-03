# whatsapp-service

Microservice HTTP autonome pour le bot WhatsApp (Baileys, session non-officielle
gratuite). Isole de `backend2` pour proteger la session longue-duree/fragile des
redemarrages frequents de l'API principale (deploiement de features) et pour
qu'un souci Baileys ne fasse pas tomber l'API principale.

Deploye sur un serveur dedie, separement du reste du monorepo (son propre
`docker-compose.yml`, pas integre a `docker-compose.dev.yml`/`docker-compose.prod.yml`).

## Demarrer

```
docker compose up -d --build
```

## Variables d'environnement

- `PORT` (defaut 8090) — port HTTP ecoute par le service.
- `WHATSAPP_ENABLED` — `true` pour connecter la session Baileys au demarrage.
- `WHATSAPP_SERVICE_SECRET` — secret partage attendu dans le header `X-Internal-Secret` sur chaque requete (voir `InternalSecretGuard`).
- `WHATSAPP_AUTH_DIR` — dossier de persistance de la session Baileys (volume Docker `whatsapp_auth`), defaut `storage/whatsapp-auth`.

## Endpoints (tous proteges par le header `X-Internal-Secret`)

- `GET /status` — statut de la session (`disconnected`/`connecting`/`qr_pending`/`connected`).
- `GET /qr` — QR code a scanner (data URL image), si en attente de scan.
- `GET /groups` — liste des groupes WhatsApp dont le bot est membre.
- `POST /send` — `{ jid, text }` : envoie un message texte.
- `POST /send-image` — `{ jid, imageBase64, caption? }` : envoie une image (base64, plus simple a appeler en HTTP interne qu'un multipart).

Appele par `backend2` via `WhatsappClientService` (`backend2/src/whatsapp-client/`),
configure par `WHATSAPP_SERVICE_URL` + `WHATSAPP_SERVICE_SECRET` cote backend2.
