# Mesurer et améliorer les articles

> État au 22/09/2026 : **aucune connexion** Search Console ou analytics
> n'existe dans ce dépôt. Tant que ces données manquent, aucune performance
> ne peut être affirmée et aucun mot-clé ne doit être présenté avec un
> volume, une difficulté ou un potentiel de trafic chiffré.

## Données à réunir

1. **Search Console** (propriété https://haria-chatbot.com/) : requêtes,
   impressions, clics, CTR et position moyenne, par page et par requête.
   Export mensuel en CSV, à déposer dans `_articles/suivi/` (dossier à
   créer au premier export).
2. **Conversions** : la source de vérité est le nombre de comptes créés
   (hariastudio.com) et de démos calées (cal.com). Un article n'est
   « performant » que s'il contribue à l'un des deux, pas s'il génère du
   trafic seul.

## Règles d'observation

- Attendre **8 à 12 semaines** après publication avant de juger une page ;
  le SEO met du temps et les premières impressions n'indiquent rien.
- Comparer des périodes complètes (4 semaines contre 4 semaines) et tenir
  compte de la saisonnalité.
- Une variation de position n'est **jamais** une preuve de causalité : elle
  coïncide avec les mises à jour, elle ne les prouve pas.

## Décisions possibles avec les données

| Observation | Action |
| --- | --- |
| Impressions sans clics, position 8-20 | retravailler le title et la meta description de la page |
| Position correcte mais contenu dépassé | **enrichir la page existante**, ne pas créer un doublon |
| Requêtes réelles sans page dédiée | ajouter un brief dans `sujets.json` (ou enrichir une page qui en est proche) |
| Page avec trafic mais zéro conversion | vérifier le CTA et la page cible du maillage |
| Page sans impressions après 12 semaines | sujet sans demande réelle : ne pas renouveler ce type d'angle |

## Boucle à tenir

1. Export GSC mensuel → `_articles/suivi/AAAA-MM.csv`.
2. Lecture globale : pages en progression, régression, nouveautés.
3. En déduire : 2-3 améliorations ciblées (enrichissement, title, maillage),
   à passer dans le processus normal (brief → rédaction → contrôle).
4. Noter la décision et sa raison dans le journal du mois.
