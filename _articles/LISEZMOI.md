# Publication d'un article SEO par jour

## Le principe

1. La liste des sujets à couvrir vit dans `_articles/sujets.json`
   (12 sujets prêts au départ : ajoutez-en, chaque sujet est utilisé une
   seule fois, dans l'ordre).
2. Tous les jours à **11 h 30 (heure de Paris)**, GitHub Actions exécute le
   pipeline :
   - si la file `_articles/file/` est **vide**, l'article du jour est
     **rédigé par l'API OpenAI** (`scripts/generer-article.mjs`) à partir du
     prochain sujet et des faits produit de `llms.txt` (l'IA ne peut pas
     inventer les prix ni les engagements) — puis l'assemblage est validé
     strictement : titre et description dans les bonnes longueurs, 600 mots
     minimum, 3 h2 minimum, pas de balise interdite, liens internes
     autorisés uniquement, 4 questions FAQ minimum ;
   - le plus ancien article de la file est publié : déplacement à la racine,
     ajout à la liste « Nos guides » de l'accueil, ajout au `sitemap.xml`,
     rafraîchissement de la date de l'accueil ;
   - commit (`Article SEO : <titre>`) + push — Render redéploie.
3. Échec de génération ou file et sujets vides = échec **visible** du
   workflow (mail GitHub), jamais de page à moitié générée.

## Activation (une seule fois)

La rédaction automatique demande une clé OpenAI :

```
gh secret set OPENAI_API_KEY -R matteolievre-HARIA/site-haria
```

(collez la clé quand il la demande — la même que celle de la plateforme,
disponible dans les variables d'environnement Render.)

Le modèle s'ajuste avec le secret/variable `OPENAI_MODEL` (défaut :
`gpt-4o-mini`, suffisant et économique pour ce volume).

## Déclencher manuellement

GitHub → dépôt `site-haria` → onglet **Actions** → **Article quotidien** →
**Run workflow**. Le mode test du générateur (sans appel API) :
`node scripts/generer-article.mjs --test` — l'article de test reste dans la
file, à supprimer ensuite.

## Publier un article écrit à la main

Toujours possible : déposez le fichier dans `_articles/file/`, il passera
avant la génération (la génération ne tourne que si la file est vide).

## Première utilisation

Si le push du workflow échoue avec un refus de permission : dépôt →
**Settings → Actions → General → Workflow permissions** → cocher
**Read and write permissions**.

## Rédiger un article à la main (règles SEO)

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
node scripts/publier-article.mjs --dry   # publication
node scripts/generer-article.mjs --test  # génération (sans API)
```


## Ajouter un autre point d'insertion de liens

Le script insère à la place du repère
`<li hidden data-haria-guide-auto></li>` (et le repose derrière le nouveau
lien). Pour insérer ailleurs, dupliquer la logique dans
`scripts/publier-article.mjs` (section « Liste Nos guides »).
