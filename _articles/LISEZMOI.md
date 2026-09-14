# Publication d'un article SEO par jour

## Le principe

1. Vous écrivez (ou faites écrire) des articles **en avance** et les déposez
   dans `_articles/file/` sous le nom `AAAA-MM-JJ_slug.html`
   (ex. `2026-09-16_chatbot-ia-pme.html`). La date fixe l'ordre de passage.
2. Tous les jours à **11 h 30 (heure de Paris)**, GitHub Actions exécute
   `scripts/publier-article.mjs` :
   - l'article le plus ancien est déplacé à la racine du site (`slug.html`) ;
   - il est ajouté à la liste « Nos guides » de la page d'accueil ;
   - il est ajouté au `sitemap.xml`, et la date de l'accueil est rafraîchie ;
   - le tout est commité (`Article SEO : <titre>`) et poussé — Render
     redéploie automatiquement.
3. Sans article en attente, le workflow se termine sans commit vide.

## Déclencher manuellement

GitHub → dépôt `site-haria` → onglet **Actions** → **Article quotidien** →
**Run workflow**. Utile pour publier immédiatement un article plutôt que
d'attendre le cron.

## Première utilisation

Si le push du workflow échoue avec un refus de permission : dépôt →
**Settings → Actions → General → Workflow permissions** → cocher
**Read and write permissions**.

## Rédiger un article (règles SEO)

Copier `_articles/modele.html` (structure identique aux guides existants) :

- **title** unique, 50-65 caractères, mot-clé principal au début ;
- **meta description** unique, 140-155 caractères, avec un bénéfice ;
- **canonical** absolu pointant vers `https://haria-chatbot.com/slug.html`
  (le script refuse de publier sinon) ;
- un seul **h1**, des h2/h3 structurés, ~800 mots minimum ;
- liens internes vers l'accueil et au moins deux autres pages du site ;
- un bloc CTA vers l'inscription, une FAQ avec JSON-LD `FAQPage`,
  JSON-LD `Article` et `BreadcrumbList` ;
- pas de contenu dupliqué d'une page à l'autre, chiffres et sources vérifiés.

## Tester sans publier

```
node scripts/publier-article.mjs --dry
```

## Ajouter un autre point d'insertion de liens

Le script insère à la place du repère
`<li hidden data-haria-guide-auto></li>` (et le repose derrière le nouveau
lien). Pour insérer ailleurs, dupliquer la logique dans
`scripts/publier-article.mjs` (section « Liste Nos guides »).
