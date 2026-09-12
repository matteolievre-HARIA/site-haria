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

## À faire : nettoyage niveau 2 (Font Awesome)

Le niveau 1 est fait : `three.js`, `webgl.js`, `chroma.min.js` et `swiper`
étaient chargés sans être appelés nulle part ; supprimés, le JS est passé de
2 440 Ko à 465 Ko.

Reste le plus gros morceau de CSS :

- `assets/css/all.min.css` — **465 Ko**, plus jusqu'à **765 Ko de polices**
  (`assets/webfonts/fa-solid-900.woff2`, `fa-regular-400.woff2`,
  `fa-brands-400.woff2`).
- Pour **6 icônes seulement** : l'étoile des avis (`fa-star`), la flèche des
  boutons (`fa-arrow-up-right`), le `+` de la FAQ (`fa-plus`), LinkedIn
  (`fa-linkedin-in`), la croix du menu (`fa-times`), la flèche `fa-arrow-up`.

**Méthode prévue** : remplacer chaque icône par du SVG en ligne, une par une,
avec comparaison visuelle avant/après à chaque étape, puis retirer le CSS et
les trois `woff2`. Gain attendu : environ 1,2 Mo, soit un site sous 200 Ko de
JS + CSS. **Ça touche au DOM** (contrairement au niveau 1) : Matteo a demandé
de ne pas le faire pour l'instant, à ne lancer que sur sa validation.

## Autres chantiers identifiés (pas encore arbitrés)

- Les captures « produit » de la page sont les mockups du template, pas Haria.
  Les remplacer par de vraies captures est le levier de conversion le plus
  fort ; dépend d'images fournies par Matteo.
- La preuve client (section Avis) arrive tard sur téléphone : remonter un
  témoignage ou un chiffre sous le hero.
- Les avis défilent tout seuls : prévoir une pause au toucher sur téléphone.
- Beaucoup d'images ont encore `alt="img"` (hérité du template).
