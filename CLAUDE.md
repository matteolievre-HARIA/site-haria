# Site Haria — landing

Site statique (pas de build). Déployé sur Render depuis la branche `main`,
racine du dépôt publiée telle quelle. En ligne : https://haria-chatbot.com

## Structure

- `index.html` — la landing. Les autres pages (guides, mentions, merci, 404)
  sont autonomes et ne chargent que 1 ou 2 scripts.
- `assets/` — le template Synex, repris tel quel. **On ne modifie pas
  `main.css`** : toutes nos surcharges vont dans `assets/css/haria.css`, qui
  est chargé après et gagne donc à spécificité égale.
- `assets/js/haria.js` — nos comportements (ancres, bascule tarifs).
  `assets/js/globe.js` + `world-map.json` — le globe de la section
  Fonctionnement. `assets/js/main.js` — celui du template, modifié à deux
  endroits seulement (animations GSAP passées en `gsap.matchMedia()`).
- `backup/` — sections retirées du site, avec la marche à suivre pour les
  remettre. Interdit dans `robots.txt`.

## Conventions

- Commentaires et libellés en français.
- Reprendre le markup du template au plus près ; ne rien redessiner sans
  demande explicite.
- Toute correction se vérifie dans un navigateur avant d'être annoncée
  (Chrome headless + CDP : mesures de positions, comparaison avant/après,
  captures aux largeurs 1440 / 768 / 390 / 360).

## Poids de la page (état au 17/09/2026)

- Niveau 1 : `three.js`, `webgl.js`, `chroma.min.js` et `swiper` supprimés
  (JS de 2 440 Ko à 465 Ko).
- Polices Font Awesome : les trois `woff2` de `assets/webfonts/` sont des
  **sous-ensembles** ne gardant que les glyphes utilisés (U+2B, F005, E09F,
  F077, F078, F0E1, F00D, F062, F068) : 766 Ko → 2 Ko, HTML et CSS
  inchangés. **Toute nouvelle icône Font Awesome n'apparaîtra pas** : il
  faut refaire le sous-ensemble depuis les polices d'origine (historique
  git) en ajoutant son code.
- Préchargeur : masqué au DOMContentLoaded par `haria.js` (le template
  attendait `load` + 1 s). Widget chargé en `async`. Image du hero en WebP
  via `<picture>` (PNG en repli).
- Reste possible : `all.min.css` (455 Ko brut, 78 Ko compressé) pour
  6 icônes, à remplacer par du SVG en ligne (touche au DOM, sur validation
  de Matteo). Les en-têtes de cache de `render.yaml` ne sont pas appliqués
  en ligne (`max-age=0`) : à régler dans le dashboard Render.

## Autres chantiers identifiés (pas encore arbitrés)

- Les captures « produit » de la page sont les mockups du template, pas Haria.
  Les remplacer par de vraies captures est le levier de conversion le plus
  fort ; dépend d'images fournies par Matteo.
- La preuve client (section Avis) arrive tard sur téléphone : remonter un
  témoignage ou un chiffre sous le hero.
- Les avis défilent tout seuls : prévoir une pause au toucher sur téléphone.
- Beaucoup d'images ont encore `alt="img"` (hérité du template).
