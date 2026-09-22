# Publication d'un article SEO par jour

## Le principe

1. La liste des sujets à couvrir vit dans `_articles/sujets.json`. Chaque
   sujet est un **brief complet** (voir plus bas) : requête, intention,
   problème, questions, notions, page cible, apport concret. Chaque sujet
   est utilisé une seule fois, dans l'ordre.
2. Tous les jours à **11 h 30 (heure de Paris)**, GitHub Actions exécute le
   pipeline :
   - si la file `_articles/file/` est **vide**, l'article du jour est
     **rédigé par l'API OpenAI** (`scripts/generer-article.mjs`) à partir du
     prochain brief et des faits produit de `llms.txt` (l'IA ne peut pas
     inventer les prix ni les engagements) ;
   - **avant rédaction**, le sujet est comparé à l'inventaire réel du site
     (`scripts/lib-site.mjs`) : si sa requête est déjà couverte par une page
     publiée, le workflow échoue avec un message qui dit d'enrichir la page
     existante plutôt que d'en créer une copie ;
   - l'assemblage est validé : longueurs de title/description, réponse
     courte présente, garde anti-troncature, un `h2` minimum, pas de balise
     interdite (tableau uniquement au format stylé `.article-table`), liens
     internes limités aux pages réellement publiées, lien vers la page cible
     du brief obligatoire, liens externes déclarés dans « sources », FAQ
     limitée à 5 questions **nouvelles** (0 possible), aucun placeholder ;
   - **chaque source est vérifiée par HTTP** : une source injoignable est
     retirée du bas de page et du corps, jamais publiée telle quelle ;
   - le plus ancien article de la file est publié
     (`scripts/publier-article.mjs`) : contrôles techniques (canonical,
     indexabilité, un seul h1, liens internes résolus, JSON-LD valides et
     fidèles au texte visible, placeholders), déplacement à la racine, ajout
     au `sitemap.xml`, sans modifier l'accueil ;
   - commit (`Article SEO : <titre>`) + push — Render redéploie.
3. Échec de génération, sujet en doublon, file et sujets vides = échec
   **visible** du workflow (mail GitHub). Après **4 tentatives** non
   conformes, l'article n'est pas mis en file : la cadence quotidienne ne
   publie jamais une page insuffisante.
4. Chaque génération laisse une trace dans `_articles/journal/` : brief
   utilisé, refus de chaque tentative, sources et statut de vérification.

## Le brief d'un sujet (`_articles/sujets.json`)

Chaque entrée contient :

| Champ | Rôle |
| --- | --- |
| `slug` | nom du fichier futur (minuscules, tirets) |
| `titre` | titre de travail |
| `requete` | requête principale visée |
| `intention` | ce que cherche vraiment la personne qui tape la requête |
| `probleme` | le problème concret du lecteur, en situation |
| `requetes_secondaires` | variantes naturelles et requêtes voisines |
| `questions` | questions associées — à traiter **uniquement si le corps n'y répond pas** |
| `notions` | les notions indispensables à expliquer |
| `page_cible` | la page vers laquelle conduire naturellement (lien obligatoire dans le corps) |
| `apport` | ce que l'article apporte de concret et de différent ; sans apport, le sujet est refusé |
| `recherche` | *(optionnel)* notes de recherche web vérifiées par l'équipe, avec source et date |
| `sources_a_verifier` | *(optionnel)* sources officielles candidates, à vérifier au moment de la rédaction |

Règles de sélection d'un sujet : pertinence commerciale d'abord, adéquation
avec l'offre, intention précise, pas de doublon avec une page existante.
**Aucun volume de recherche, difficulté ou potentiel de trafic ne doit être
avancé sans données réelles** (Search Console ou outil de mots-clés
connecté) : sans elles, les requêtes restent des hypothèses.

## Rédiger un article à la main

1. Rédiger le brief (format ci-dessus) dans `sujets.json` **ou**, si
   l'article ne doit pas partir automatiquement, dans un fichier
   `_articles/brouillons/AAAA-MM-JJ_slug.brief.md`.
2. Écrire la page en copiant `_articles/modele.html` :
   - title unique (~50-60 caractères, souple), meta description spécifique
     (~140-160, souple), **pas de balise meta keywords** ;
   - canonical absolu vers `https://haria-chatbot.com/slug.html` (le
     contrôle refuse de publier sinon) ;
   - un seul `h1`, des `h2`/`h3` qui structurent de vraies réponses, une
     réponse courte en ouverture, longueur adaptée à la question ;
   - FAQ seulement pour les vraies questions restantes (JSON-LD FAQPage
     strictement identique aux questions visibles) ;
   - JSON-LD `Article` + `BreadcrumbList` ; `dateModified` ne change que
     lors d'une modification substantielle réelle ;
   - liens internes vers des pages existantes, ancres descriptives et
     variées ; sources fiables citées près des affirmations concernées.
3. Contrôler **sans publier** :
   ```
   node scripts/publier-article.mjs --verifier _articles/brouillons/2026-09-22_mon-slug.html
   ```
4. À la demande explicite de Matteo seulement : déplacer le fichier dans
   `_articles/file/` (préfixe de date obligatoire) — il sera publié au
   prochain passage du workflow.

## Activation (une seule fois)

La rédaction automatique demande une clé OpenAI :

```
gh secret set OPENAI_API_KEY -R matteolievre-HARIA/site-haria
```

Le modèle s'ajuste avec le secret/variable `OPENAI_MODEL` (défaut :
`gpt-4o-mini`, suffisant et économique pour ce volume).

Dépôt → Settings → Actions → General → Workflow permissions →
**Read and write permissions** (si le push du workflow est refusé).

## Déclencher manuellement

GitHub → dépôt `site-haria` → onglet **Actions** → **Article quotidien** →
**Run workflow**. Mode test du générateur (sans appel API) :
`node scripts/generer-article.mjs --test` — l'article de test reste dans la
file, à supprimer ensuite.

## Tester sans publier

```
node scripts/publier-article.mjs --dry                        # publication simulée
node scripts/generer-article.mjs --test                       # génération, sans API
node scripts/publier-article.mjs --verifier FICHIER.html      # contrôle d'un brouillon
```

## Mesurer et améliorer

Voir `_articles/mesure.md` : suivi Search Console, délais d'observation,
règles de décision (enrichir ou créer). Aucune connexion GSC/analytics
n'existe à ce jour : les requêtes et leur potentiel restent des hypothèses
tant que ces données manquent.

## Inventaire et anti-doublon

`scripts/lib-site.mjs` scanne automatiquement les `.html` publiés à la
racine (titres + descriptions). Pour préciser la requête visée d'une page
quand le titre ne suffit pas, ajouter une annotation dans
`_articles/inventaire.json` :

```json
{ "chatbot-ia-rgpd.html": { "requete": "chatbot ia rgpd" } }
```

## Liens vers les nouveaux guides

Les nouveaux guides sont publiés à la racine et ajoutés au sitemap.
La publication quotidienne n'ajoute aucun lien dans le pied de page de
l'accueil et ne modifie pas sa date de dernière modification.
Les articles déjà publiés restent accessibles à leur URL.
