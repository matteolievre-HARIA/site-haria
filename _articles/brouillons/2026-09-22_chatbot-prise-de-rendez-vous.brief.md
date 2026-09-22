# Brief — Chatbot et prise de rendez-vous

> Brouillon de démonstration du nouveau pipeline éditorial (voir
> `_articles/LISEZMOI.md`). Ce sujet n'est PAS dans `sujets.json` : il ne
> sera publié que sur décision explicite de Matteo (déplacer le fichier
> dans `_articles/file/`). Rien ne part automatiquement.

## Le brief

- **Requête principale** : chatbot prise de rendez-vous
- **Intention de recherche** : commerciale puis pratique — un dirigeant veut
  savoir si un chatbot peut réellement faire aboutir des rendez-vous depuis
  son site, et comment cela s'articule avec son agenda ou son outil de
  réservation existant.
- **Problème concret du lecteur** : des visiteurs prêts à prendre rendez-vous
  repartent sans rien quand personne ne répond (formulaire sans réponse,
  téléphone décroché en retard, horaires de bureau) ; il ne sait pas ce
  qu'un chatbot peut faire à la place, ni ce qu'il ne peut pas faire.
- **Requêtes secondaires** : chatbot pour prendre rendez-vous ; chatbot
  rappel téléphonique site web ; assistant ia prise de rendez-vous ;
  chatbot réservation site web.
- **Questions associées** : le chatbot peut-il bloquer un créneau dans mon
  agenda ? comment arrivent les demandes de rappel ?
- **Notions indispensables** : les 3 modes (orienter vers l'agenda existant /
  capter une demande de rappel / répondre puis qualifier) ; le chatbot
  n'est pas un outil de réservation ; la vitesse de réponse comme facteur
  de qualification ; le suivi en euros des contacts captés.
- **Page cible du maillage** : `combien-de-temps-installer-chatbot-ia.html`
  (prochaine étape naturelle : combien de temps pour mettre en ligne).
  Liens secondaires : `site-web-perd-clients-week-end.html` (angle hors
  horaires), `chatbot-ia-vs-formulaire-contact.html`, l'accueil.
- **Apport concret** : un tableau de décision des 3 modes de prise de
  rendez-vous selon l'équipement du site, un exemple chiffré complet et
  explicitement présenté comme illustratif, et les limites honnêtes (pas de
  connexion d'agenda directe : Haria oriente ou capte).

## Phrase de valeur

« Cet article sera particulièrement utile parce qu'il apporte un tableau de
décision des 3 modes de prise de rendez-vous selon l'équipement du site, un
calcul illustratif complet que le lecteur peut refaire avec ses propres
chiffres, et les limites assumées de ce qu'un chatbot ne fait pas. »

## Recherche effectuée (sources consultées)

- Harvard Business Review, « The Short Life of Online Sales Leads »
  (Oldroyd, McElheran, Elkington, mars 2011) — page consultée le 22/09/2026
  (https://hbr.org/2011/03/the-short-life-of-online-sales-leads) et texte
  intégral vérifié via la copie PDF de l'article : audit de 2 241
  entreprises américaines ; 37 % répondent dans l'heure, 23 % ne répondent
  jamais, temps de réponse moyen 42 heures ; les entreprises qui contactent
  dans l'heure qualifient près de 7 fois plus de leads que celles qui
  contactent une heure plus tard, et plus de 60 fois plus que celles qui
  attendent 24 h ou plus. Étude américaine de 2011 : présentée comme telle.
- Faits produit : `llms.txt` (mise à jour 17/09/2026) — réponse en
  2 secondes 24h/24, capture des contacts, proposition de rappel quand
  l'information n'existe pas, suivi en euros, gratuit sans carte bancaire,
  mise en ligne en quelques minutes via une ligne de code, cas Edabos
  (1,4× de rendez-vous dès le premier mois).
- Aucun volume de recherche, aucune difficulté SEO ni promesse de trafic
  n'est avancé : pas de données de mots-clés accessibles dans ce projet
  (pas de Search Console connectée au dépôt).

## Contrôle qualité

Contrôle technique exécuté le 22/09/2026 :

- [x] `node scripts/publier-article.mjs --verifier _articles/brouillons/2026-09-22_chatbot-prise-de-rendez-vous.html`
      → **CONTRÔLE OK, 0 avertissement** : title 55 car, description 153 car,
      canonical = URL publiée, indexable, 1 h1, liens internes tous résolus,
      JSON-LD (Article + FAQPage + BreadcrumbList) valides et fidèles au
      texte visible, aucun placeholder.
- [x] Corps : 969 mots (longueur adaptée à la question, non calibrée sur un
      minimum), 1 tableau de décision stylé, FAQ limitée à 2 questions
      réellement restantes.
- [x] Relecture éditoriale : intention satisfaite, apport concret présent
      (tableau des 3 modes + calcul illustratif affiché comme tel + limites
      honnêtes), aucun fait produit hors `llms.txt`, source HBR vérifiée
      dans le texte intégral (23 % sans réponse ; ×7 dans l'heure vs une
      heure de plus ; 2 241 entreprises, États-Unis, 2011), aucun
      témoignage ni statistique inventé.
- [x] Rendu navigateur (Chrome headless, fichier servi en local) :
      title et h1 corrects, tableau stylé présent ; mesure JavaScript du
      débordement à petite largeur : aucun élément hors `.table-scroll` ne
      dépasse le viewport. Vérification **390 px réelle** effectuée via
      émulation de device (CDP `Emulation.setDeviceMetricsOverride`) :
      `clientWidth = scrollWidth = 390`, zéro élément débordant, tableau
      contenu — capture conservée lors de la session de contrôle. Seul
      artefact : le bouton de chat flottant de Haria recouvre le bas de
      page, comportement standard identique sur tout le site.
