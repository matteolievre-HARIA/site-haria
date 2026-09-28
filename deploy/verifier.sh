#!/usr/bin/env bash
# Contrôle d'une installation du site : codes HTTP, fichiers interdits,
# page 404, types MIME, en-têtes. N'écrit rien, relançable à volonté.
#
# Usage : deploy/verifier.sh [https://hote] [ip]
#   deploy/verifier.sh https://vps.haria-chatbot.com
#   deploy/verifier.sh https://haria-chatbot.com
#   Sur le VPS, avant tout DNS (certificat d'origine non reconnu : -k) :
#   deploy/verifier.sh https://vps.haria-chatbot.com 127.0.0.1
set -uo pipefail

BASE=${1:-https://haria-chatbot.com}
IP=${2:-}
HOTE=${BASE#https://}
HOTE=${HOTE%%/*}
OPTS=(-s --max-time 15)
if [ -n "$IP" ]; then
    OPTS+=(-k --resolve "$HOTE:443:$IP" --resolve "www.$HOTE:443:$IP")
fi
ECHECS=0

ok() { printf '  ok     %s\n' "$1"; }
ko() { printf '  ÉCHEC  %s\n' "$1"; ECHECS=$((ECHECS + 1)); }

# code <chemin> <code attendu>
code() {
    local c
    c=$(curl "${OPTS[@]}" -o /dev/null -w '%{http_code}' "$BASE$1")
    if [ "$c" = "$2" ]; then ok "$1 -> $c"; else ko "$1 -> $c (attendu $2)"; fi
}

# entete <chemin> <nom> <extrait attendu de la valeur>
entete() {
    local v
    v=$(curl "${OPTS[@]}" -o /dev/null -D - "$BASE$1" | tr -d '\r' \
        | grep -i "^$2:" | head -1 | cut -d' ' -f2-)
    case "$v" in
        *"$3"*) ok "$1  $2: $v" ;;
        *) ko "$1  $2: '$v' (attendu : '$3')" ;;
    esac
}

echo "== $BASE ${IP:+(via $IP)}"

echo "-- Pages servies (200)"
for p in / /index.html /guides /guides.html /chatbot-ia-rgpd /mentions-legales \
         /merci /404.html /sitemap.xml /robots.txt /llms.txt /llms-full.txt \
         /05260039f9ef7de227a922d097f61178.txt /assets/css/haria.css \
         /images/avatars/neo.jpg /fonts/inter-latin.woff2 /og-image.jpg; do
    code "$p" 200
done

echo "-- Barre finale (301 vers la page sans barre)"
code /guides/ 301

echo "-- Jamais servis (404)"
for p in /page-inexistante /.git/config /.git/HEAD /.gitignore \
         /.github/workflows/article-quotidien.yml /CLAUDE.md /AGENTS.md \
         /render.yaml /package.json /scripts/publier-article.mjs \
         /_articles/LISEZMOI.md /backup/ /deploy/README.md /deploy/landing-deploy \
         /images/; do
    code "$p" 404
done

echo "-- Une 404 affiche bien 404.html"
A=$(curl "${OPTS[@]}" "$BASE/page-inexistante" | cksum)
B=$(curl "${OPTS[@]}" "$BASE/404.html" | cksum)
if [ "$A" = "$B" ]; then ok "contenu identique à /404.html"; else ko "contenu différent de /404.html"; fi

echo "-- Types MIME"
entete /sitemap.xml Content-Type xml
entete /robots.txt Content-Type text/plain
entete /llms.txt Content-Type text/plain
entete /assets/css/haria.css Content-Type text/css
entete /fonts/inter-latin.woff2 Content-Type font/woff2

echo "-- En-têtes de sécurité (y compris sur une 404)"
for p in / /page-inexistante; do
    entete "$p" X-Frame-Options DENY
    entete "$p" X-Content-Type-Options nosniff
    entete "$p" Referrer-Policy strict-origin-when-cross-origin
    entete "$p" Permissions-Policy "camera=(), microphone=(), geolocation=()"
    entete "$p" Content-Security-Policy-Report-Only "frame-src https://app.cal.com https://cal.com https://www.facebook.com; frame-ancestors 'none'"
done

echo "-- Cache-Control"
entete / Cache-Control "public, max-age=0, s-maxage=300"
entete /sitemap.xml Cache-Control "public, max-age=0, s-maxage=300"
entete /assets/css/haria.css Cache-Control "public, max-age=86400"
entete /assets/js/haria.js Cache-Control "public, max-age=86400"
entete /images/avatars/neo.jpg Cache-Control "public, max-age=86400"
entete /fonts/inter-latin.woff2 Cache-Control "public, max-age=0"

if [ "$HOTE" = "haria-chatbot.com" ]; then
    echo "-- www -> domaine nu"
    L=$(curl "${OPTS[@]}" -o /dev/null -w '%{http_code} %{redirect_url}' "https://www.$HOTE/guides")
    if [ "$L" = "301 https://haria-chatbot.com/guides" ]; then ok "www -> $L"; else ko "www -> '$L'"; fi
fi

echo
if [ "$ECHECS" -eq 0 ]; then echo "Tout est bon."; else echo "$ECHECS échec(s)."; fi
exit $(( ECHECS > 0 ))
