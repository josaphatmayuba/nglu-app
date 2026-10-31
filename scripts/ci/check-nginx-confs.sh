#!/bin/sh
# Contrat CI : `nginx -t` de chaque conf nginx deployee, dans un conteneur nginx
# de la meme version majeure/mineure que la prod (nginx/1.31.x, image nginx:alpine
# de frontend/Dockerfile.prod). Tourne sur le runner GitHub, AVANT tout job qui
# copie une conf sur un serveur (job `contracts` de deploy-dev.yml / deploy-prod.yml).
#
# Reproduit le montage prod (docker-compose.prod.yml) :
#   ./nginx/nginx.frontend.conf -> /etc/nginx/conf.d/default.conf:ro
#   /etc/letsencrypt            -> /etc/letsencrypt:ro
# Sur Avelomi, deploy-prod-static-app.sh ship nginx.avelomi.conf SOUS le nom
# nginx.frontend.conf : meme destination.
#
# UNE conf par conteneur : nginx.avelomi.conf et nginx.avelomi-dev.conf definissent
# les memes map/log_format ($is_path_traversal, $nglu_log_uri, nglu_safe) ; en prod
# un seul fichier est monte en default.conf, ils ne sont jamais charges ensemble.
#
# Certificats : un couple auto-signe factice par dossier reference par
# ssl_certificate / ssl_certificate_key (fichier *key* = cle, sinon = cert).
# Upstreams : resolus au runtime (resolver 127.0.0.11 + variables), mais chaque
# nom http://<nom> trouve dans proxy_pass / set est ajoute en --add-host par
# securite (un proxy_pass statique serait sinon resolu des `nginx -t`).
#
# Usage : sh scripts/ci/check-nginx-confs.sh [conf ...]
#         NGINX_IMAGE=nginx:1.31-alpine (defaut) pour changer d'image.
set -eu

NGINX_IMAGE="${NGINX_IMAGE:-nginx:1.31-alpine}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
if [ "$#" -gt 0 ]; then
  CONFS="$*"
else
  CONFS="nginx/nginx.frontend.conf nginx/nginx.avelomi.conf nginx/nginx.avelomi-dev.conf"
fi

for bin in docker openssl; do
  command -v "$bin" >/dev/null 2>&1 || { echo "::error title=check-nginx-confs::$bin introuvable" >&2; exit 1; }
done

# Destination du montage de la conf, lue dans le compose prod (source unique).
DEST=""
if [ -f "$COMPOSE_FILE" ]; then
  DEST="$(grep -oE 'nginx/nginx\.frontend\.conf:[^:[:space:]]+' "$COMPOSE_FILE" | head -n 1 | cut -d: -f2 || true)"
fi
[ -n "$DEST" ] || DEST=/etc/nginx/conf.d/default.conf

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT INT TERM

docker pull -q "$NGINX_IMAGE" >/dev/null
echo "[nginx-t] image $NGINX_IMAGE ($(docker run --rm "$NGINX_IMAGE" nginx -v 2>&1)), montage -> $DEST"

FAILED=0
for conf in $CONFS; do
  if [ ! -f "$conf" ]; then
    echo "::error title=nginx -t::$conf absent" >&2
    FAILED=1
    continue
  fi
  case "$conf" in
    /*) abs="$conf" ;;
    *) abs="$(pwd)/$conf" ;;
  esac
  d="$WORK/$(basename "$conf" .conf)"
  mkdir -p "$d/letsencrypt" "$d/kp"
  # Directives effectives seulement (lignes de commentaire ignorees).
  tr -d '\r' < "$conf" | grep -v '^[[:space:]]*#' > "$d/body" || true

  # Certificats factices aux chemins references.
  BAD_CERT=0
  grep -oE '^[[:space:]]*ssl_(certificate|certificate_key|trusted_certificate)[[:space:]]+[^;[:space:]]+' "$d/body" \
    | awk '{print $2}' | sort -u > "$d/certs" || true
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    case "$p" in
      *'$'*) echo "::error title=nginx -t::$conf : chemin de certificat variable non verifiable ($p)" >&2; BAD_CERT=1; continue ;;
      /etc/letsencrypt/*) ;;
      *) echo "::error title=nginx -t::$conf : $p hors de /etc/letsencrypt (seul dossier de certs monte en prod)" >&2; BAD_CERT=1; continue ;;
    esac
    dir="$(dirname "$p")"
    kp="$d/kp$dir"
    if [ ! -f "$kp/key.pem" ]; then
      mkdir -p "$kp"
      openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj "/CN=nglu-ci-$(basename "$dir")" \
        -keyout "$kp/key.pem" -out "$kp/cert.pem" >/dev/null 2>"$d/openssl.err" \
        || { cat "$d/openssl.err" >&2; echo "::error title=nginx -t::openssl KO pour $dir" >&2; exit 1; }
    fi
    target="$d/letsencrypt/${p#/etc/letsencrypt/}"
    mkdir -p "$(dirname "$target")"
    case "$(basename "$p")" in
      *key*) cp "$kp/key.pem" "$target" ;;
      *) cp "$kp/cert.pem" "$target" ;;
    esac
  done < "$d/certs"
  chmod -R a+rX "$d/letsencrypt"
  if [ "$BAD_CERT" != "0" ]; then
    FAILED=1
    continue
  fi

  # --add-host pour chaque upstream nomme (hors IP litterales).
  ADD_HOSTS=""
  for h in $(grep -oE '(proxy_pass|set[[:space:]]+\$[A-Za-z0-9_]+)[[:space:]]+https?://[A-Za-z0-9_.-]+' "$d/body" \
               | sed -E 's#.*://##' | sort -u); do
    case "$h" in
      *[!0-9.]*) ADD_HOSTS="$ADD_HOSTS --add-host $h:127.0.0.1" ;;
    esac
  done

  echo "[nginx-t] $conf (certs: $(wc -l < "$d/certs" | tr -d ' '), hosts:${ADD_HOSTS:- aucun})"
  # shellcheck disable=SC2086
  if docker run --rm $ADD_HOSTS \
       -v "$abs:$DEST:ro" \
       -v "$d/letsencrypt:/etc/letsencrypt:ro" \
       "$NGINX_IMAGE" nginx -t; then
    echo "[nginx-t] OK $conf"
  else
    echo "::error title=nginx -t::$conf invalide (voir sortie nginx ci-dessus)" >&2
    FAILED=1
  fi
done

[ "$FAILED" = "0" ] || exit 1
echo "[nginx-t] toutes les confs sont valides"
