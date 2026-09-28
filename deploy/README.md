# Déploiement de haria-chatbot.com sur le VPS OVH

Le site est servi par Nginx sur le VPS OVH (141.95.162.100), le même serveur
que hariastudio.com, **uniquement derrière le proxy orange de Cloudflare**.
Il remplace l'hébergement Render.

## Les fichiers

| Dans le dépôt | Sur le VPS | Rôle |
|---|---|---|
| `deploy/nginx/haria-chatbot.conf` | `/etc/nginx/sites-available/haria-chatbot` (+ lien dans `sites-enabled/`) | Le site, la redirection www, les en-têtes, les fichiers interdits |
| `deploy/landing-deploy` | `/usr/local/sbin/landing-deploy` | Met le site à jour depuis GitHub si `main` a bougé |
| `deploy/verifier.sh` | (lancé depuis le clone) | Contrôle automatique : codes, 404, types, en-têtes |
| — | `/var/www/haria-chatbot` | Clone du dépôt (propriétaire `ubuntu`), racine du site |
| — | `/etc/ssl/cloudflare/haria-chatbot.pem` / `.key` | Certificat d'origine Cloudflare (15 ans) |
| — | crontab de `ubuntu` | `landing-deploy` toutes les 5 min |
| — | `/var/log/nginx/haria-chatbot.access.log` / `.error.log` | Journaux Nginx |

Ce que Nginx ne sert **jamais** (réponse 404 avec la page 404 du site) :
les fichiers et dossiers cachés (`.git/`, `.github/`, `.gitignore`…),
`scripts/`, `_articles/`, `backup/`, `deploy/`, `node_modules/`, et tout
fichier `.md`, `.yml`, `.yaml`, `.mjs`, `.sh` ou `package.json`.
(Render servait tous ces fichiers en 200.)

Les adresses sans `.html` marchent (`/guides` sert `guides.html`).
`/guides/` redirige en 301 vers `/guides` : chez Render, cette adresse
affichait la page sans CSS.

### En-têtes

Ils reprennent **ce que Render envoyait réellement** (réglages du dashboard),
et non `render.yaml`, qui n'était pas appliqué :

- sécurité : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy` ;
- CSP en **`Content-Security-Policy-Report-Only`** : elle signale dans la
  console mais ne bloque rien, comme sur Render. La passer en mode bloquant
  (`Content-Security-Policy`) est un chantier à part, à tester sur
  `vps.haria-chatbot.com` ;
- `Cache-Control` : 1 jour sur `/assets/` et `/images/`, `max-age=0`
  ailleurs. Le `s-maxage=300` ajouté partout limite le cache de Cloudflare
  à 5 min : une modification (CSS, article) est partout en ligne en
  moins de 5 min, sans purge manuelle.

## Mise à jour automatique

L'Action « Article quotidien » pousse sur `main` à 09:30 UTC. Toutes les
5 min, le cron de `ubuntu` lance `landing-deploy`, qui fait `git fetch`, puis
`git reset --hard origin/main` seulement si `main` a changé. Un verrou
(`flock`) empêche deux mises à jour en même temps. L'article est donc en ligne
au plus 5 min après le push. Le dépôt est public : aucune clé ni aucun
secret n'est nécessaire.

```bash
landing-deploy                              # forcer une mise à jour maintenant
journalctl -t haria-chatbot-deploy -n 20    # les dernières mises à jour / erreurs
git -C /var/www/haria-chatbot log -1 --oneline   # version en ligne
```

Pour modifier la config Nginx ou le script : on modifie les fichiers dans le
dépôt, on pousse, on attend que `landing-deploy` les ait récupérés, puis on
relance les commandes `install` de l'étape 3 ou 4 (elles sont rejouables).

---

## Procédure d'installation (une étape à la fois)

Render reste en ligne jusqu'à la toute fin. Toutes les commandes se relancent
sans rien casser.

### Étape 0 — État du VPS (lecture seule)

```bash
ssh ubuntu@141.95.162.100
nginx -v
ls -l /etc/nginx/sites-enabled/ /etc/ssl/cloudflare/
sudo grep -rn "default_server\|real_ip\|ssl_protocols\|haria_chatbot" /etc/nginx/
sudo ufw status numbered
```

`real_ip` : si hariastudio règle déjà `set_real_ip_from` au niveau http, les
journaux de la landing afficheront aussi les vraies IP des visiteurs. Sinon,
ils afficheront les IP de Cloudflare (sans conséquence pour le service).

### Étape 1 — Cloudflare : ajouter le domaine, sans rien basculer

1. Cloudflare → Add a site → `haria-chatbot.com` → offre Free.
2. Cloudflare importe les enregistrements. **Ne pas encore toucher aux
   serveurs de noms chez Namecheap.**
3. Comparer, ligne à ligne, l'import avec Namecheap (captures des deux) :
   - tout ce qui concerne les e-mails (MX, TXT `v=spf1`, DKIM, `_dmarc`,
     vérifications Google/Meta…) → **gris (DNS only)**, jamais orange ;
   - `haria-chatbot.com` et `www` restent **pointés vers Render et en gris**
     pour l'instant ; le site ne change pas d'hébergeur à ce stade ;
   - ajouter ce que l'import aurait oublié.
4. SSL/TLS → Origin Server → Create certificate : `haria-chatbot.com` +
   `*.haria-chatbot.com`, 15 ans, format PEM. Garder la page ouverte (la
   clé privée ne s'affiche qu'une fois).

### Étape 2 — Certificat d'origine sur le VPS

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/haria-chatbot.pem   # coller le certificat
sudo nano /etc/ssl/cloudflare/haria-chatbot.key   # coller la clé privée
sudo chmod 600 /etc/ssl/cloudflare/haria-chatbot.key /etc/ssl/cloudflare/haria-chatbot.pem
sudo openssl x509 -in /etc/ssl/cloudflare/haria-chatbot.pem -noout -subject -enddate -ext subjectAltName
```

### Étape 3 — Clone, script de mise à jour, cron

```bash
sudo mkdir -p /var/www/haria-chatbot
sudo chown ubuntu:ubuntu /var/www/haria-chatbot
[ -d /var/www/haria-chatbot/.git ] || git clone https://github.com/matteolievre-HARIA/site-haria.git /var/www/haria-chatbot
sudo install -m 755 /var/www/haria-chatbot/deploy/landing-deploy /usr/local/sbin/landing-deploy
landing-deploy
( crontab -l 2>/dev/null | grep -v landing-deploy; echo "*/5 * * * * /usr/local/sbin/landing-deploy" ) | crontab -
crontab -l
sudo -u www-data head -c 100 /var/www/haria-chatbot/index.html; echo   # www-data sait lire
```

### Étape 4 — Nginx

```bash
sudo install -m 644 /var/www/haria-chatbot/deploy/nginx/haria-chatbot.conf /etc/nginx/sites-available/haria-chatbot
sudo ln -sfn /etc/nginx/sites-available/haria-chatbot /etc/nginx/sites-enabled/haria-chatbot
sudo nginx -t
sudo systemctl reload nginx      # seulement si nginx -t dit « successful »
```

Puis vérifier que hariastudio n'a pas bougé (`curl -sI https://hariastudio.com/`).

### Étape 5 — Contrôle sur le VPS lui-même (aucun DNS nécessaire)

```bash
bash /var/www/haria-chatbot/deploy/verifier.sh https://vps.haria-chatbot.com 127.0.0.1
bash /var/www/haria-chatbot/deploy/verifier.sh https://haria-chatbot.com 127.0.0.1
```

Attendu : « Tout est bon. » pour les deux.

### Étape 6 — Serveurs de noms Namecheap → Cloudflare

Pourquoi maintenant, et pas après les essais sur `vps.` : tant que Namecheap
gère le domaine, un sous-domaine créé chez Cloudflare n'existe pour personne.
Cette étape ne déplace pas encore le site : il reste sur Render, en gris.

1. Revérifier une dernière fois les enregistrements e-mail (gris).
2. Namecheap → Domain List → Manage → Nameservers → Custom DNS → les deux
   serveurs donnés par Cloudflare.
3. Attendre que Cloudflare affiche la zone « Active » (de quelques minutes à
   quelques heures).
4. Vérifier : le site répond toujours (Render) ; **envoyer un e-mail vers une
   adresse @haria-chatbot.com** et vérifier qu'il arrive.

### Étape 7 — Essais sur vps.haria-chatbot.com

1. Cloudflare → SSL/TLS → mode **Full (strict)**. Edge Certificates →
   **Always Use HTTPS** activé.
2. DNS → ajouter `vps` → A → `141.95.162.100` → **orange**.
3. Depuis le Mac :
   ```bash
   bash deploy/verifier.sh https://vps.haria-chatbot.com
   curl -sI http://vps.haria-chatbot.com/ | head -3    # 301 vers https (Cloudflare)
   ```
4. Dans le navigateur, sur https://vps.haria-chatbot.com (console ouverte) :
   le widget Haria répond, l'agenda Cal.com s'ouvre, le pixel Meta se charge,
   les polices s'affichent. Des avertissements « Report-Only » sont possibles
   (ils existaient déjà sur Render), mais pas d'erreur bloquante.
5. GitHub → Actions → « Article quotidien » → Run workflow. Moins de 5 min
   après le push : `journalctl -t haria-chatbot-deploy -n 5` sur le VPS, et
   le nouvel article s'ouvre sur `vps.haria-chatbot.com`.

### Étape 8 — Bascule

1. DNS : `haria-chatbot.com` → A → `141.95.162.100` → **orange**.
2. DNS : `www` → A → `141.95.162.100` → **orange** (remplace l'enregistrement
   vers Render).
3. Suivre l'arrivée du trafic :
   `sudo tail -f /var/log/nginx/haria-chatbot.access.log`
4. `bash deploy/verifier.sh https://haria-chatbot.com`, puis les mêmes essais
   dans le navigateur qu'à l'étape 7, et un nouvel e-mail de test.

### Étape 9 — Après 24 à 48 h sans souci

1. Render → le service → Settings → désactiver l'auto-deploy, puis
   supprimer le service.
2. Supprimer `render.yaml` du dépôt et mettre à jour `CLAUDE.md`
   (« Déployé sur Render » → VPS).

## Retour arrière

À tout moment, dans Cloudflare → DNS : remettre `haria-chatbot.com` et `www`
comme ils étaient (vers Render), **en gris**. Render est toujours en ligne
jusqu'à l'étape 9. Côté VPS, pour retirer la landing sans toucher à
hariastudio :

```bash
sudo rm /etc/nginx/sites-enabled/haria-chatbot
sudo nginx -t && sudo systemctl reload nginx
```
