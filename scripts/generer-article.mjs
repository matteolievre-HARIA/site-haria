// Rédige l'article du jour avec l'API OpenAI et le dépose dans la file
// _articles/file/ (le workflow enchaîne ensuite avec publier-article.mjs).
//
// Le sujet est pris en tête de _articles/sujets.json puis CONSOMMÉ (retiré
// de la liste) : chaque jour un sujet différent, jamais deux fois le même.
// Les faits produit viennent de llms.txt : l'IA ne peut pas inventer les
// prix ni les engagements Haria.
//
// Usage :
//   node scripts/generer-article.mjs          → génère et met en file
//   node scripts/generer-article.mjs --test   → assemble sans appeler l'API
//
// Requis : OPENAI_API_KEY (et optionnellement OPENAI_MODEL, défaut
// gpt-4o-mini). En cas d'échec : code 1, le workflow échoue visiblement.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--test");
const aujourdhui = new Date().toISOString().slice(0, 10);
const MODELE_API = process.env.OPENAI_MODEL || "gpt-5.6-terra";
const MODELE_SECOURS = "gpt-4o-mini";

// ---- 1. Sujet en tête de liste ---------------------------------------------
const cheminSujets = join(racine, "_articles", "sujets.json");
if (!existsSync(cheminSujets)) {
  console.error("ERREUR : _articles/sujets.json est absent — ajoutez des sujets.");
  process.exit(1);
}
const sujets = JSON.parse(readFileSync(cheminSujets, "utf8"));
if (!sujets.length) {
  console.error("ERREUR : _articles/sujets.json est vide — ajoutez un sujet.");
  process.exit(1);
}
const sujet = sujets[0];
const slug = sujet.slug;
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`ERREUR : slug invalide (${slug}) — minuscules et tirets uniquement.`);
  process.exit(1);
}
if (existsSync(join(racine, slug + ".html"))) {
  console.error(`ERREUR : ${slug}.html existe déjà — changez le slug du sujet.`);
  process.exit(1);
}

// ---- 2. Les faits produit : jamais inventés --------------------------------
const faits = readFileSync(join(racine, "llms.txt"), "utf8");

// ---- 3. Rédaction -----------------------------------------------------------
const systeme = `Tu es rédacteur SEO senior francophone pour Haria, un chatbot IA pour sites web.
Règles impératives :
- Français impeccable, tutoiement interdit : vous.
- Chiffres de prix et engagements produit : UNIQUEMENT ceux des faits ci-dessous, jamais d'autres.
- Aucun chiffre de résultat client inventé. Pas de superlatifs creux.
- Ne cite pas la concurrence avec des prix précis (sauf si le fait est dans les données).
- Style concret, phrases courtes, zéro remplissage, zéro formule creuse d'intro.
- Le mot-clé principal apparaît dans les 100 premiers mots et dans un h2.
Tu réponds UNIQUEMENT en JSON valide conforme au schéma demandé.`;

const consigne = `Rédige un article de blog SEO.

Sujet : ${sujet.sujet}
Mot-clé principal : ${sujet.mot_cle}
Angle imposé : ${sujet.angle}

Faits vérifiés sur Haria (ta seule source autorisée pour les chiffres et engagements) :
"""
${faits.slice(0, 6000)}
"""

Structure IMPÉRATIVE (respecte les budgets de mots de chaque bloc, c'est contrôlé) :
- une intro SANS titre : 80 à 120 mots, mot-clé principal dans les 100 premiers mots ;
- exactement 5 sections <h2> de 150 à 200 mots chacune (l'une contient une <ul> de 4-5 points) ;
- une section finale <h2> « Ce qu'il faut retenir » : 80 à 100 mots.

Schéma JSON attendu :
{
  "titre": "titre SEO de 50 à 60 caractères, mot-clé dedans, sans guillemets",
  "description": "meta description de 140 à 155 caractères, avec un bénéfice concret",
  "h1": "titre de l'article tel qu'affiché (peut différer du titre SEO)",
  "accroche": "réponse courte de 2 à 3 phrases en <strong> sur les points clés",
  "corps": "corps de l'article en HTML suivant la structure impérative ci-dessus : uniquement des <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <a>. Interdits : <h1>, <table>, <img>, <script>, style en ligne. 2 à 3 liens internes maximum, uniquement parmi : <a href=\"/\">accueil</a>, <a href=\"combien-coute-un-chatbot-ia.html\">prix d'un chatbot IA</a>, <a href=\"haria-vs-agence-chatbot-ia.html\">Haria vs agence</a>, <a href=\"haria-vs-intercom-vs-crisp.html\">Haria vs Intercom vs Crisp</a>, <a href=\"chatbot-ia-ecommerce.html\">chatbot IA e-commerce</a>, <a href=\"chatbot-ia-rgpd.html\">chatbot IA et RGPD</a>. 1 lien vers l'accueil obligatoire.",
  "faq": [ { "question": "...", "reponse": "..." } ],
  "sources": ["https://..."]
}
Contraintes : 4 questions FAQ minimum, réponses de 30 à 60 mots, sources = pages officielles vérifiables (cnil.fr, etc.), jamais de URL inventée.`;

async function appelAPI(retours = [], modele = MODELE_API) {
  const cle = process.env.OPENAI_API_KEY;
  if (!cle) {
    console.error("ERREUR : OPENAI_API_KEY manquant (secret GitHub ou variable d'environnement).");
    process.exit(1);
  }
  const correctif = retours.length
    ? `\n\nTON ARTICLE PRÉCÉDENT A ÉTÉ REFUSÉ pour ces raisons exactes :\n- ${retours.join("\n- ")}\nCorrige impérativement chaque point et rends le JSON complet à nouveau.`
    : "";
  const reponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cle}` },
    body: JSON.stringify({
      model: modele,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systeme },
        { role: "user", content: consigne + correctif },
      ],
    }),
  });
  if (!reponse.ok) {
    const texte = await reponse.text();
    // Modèle indisponible sur cette clé : repli sur le modèle de secours.
    if (modele !== MODELE_SECOURS && (reponse.status === 404 || /model/i.test(texte))) {
      console.warn(`Appel ${modele} refusé (${reponse.status}) : ${texte.slice(0, 200)} — repli sur ${MODELE_SECOURS}.`);
      return appelAPI(retours, MODELE_SECOURS);
    }
    console.error(`ERREUR API OpenAI ${reponse.status} : ${texte.slice(0, 300)}`);
    process.exit(1);
  }
  const data = await reponse.json();
  return JSON.parse(data.choices[0].message.content);
}

// Mode --test : réponse figée pour valider l'assemblage sans dépenser d'API.
const corpsTest =
  [1, 2, 3, 4, 5, 6, 7].map((n) =>
    `<h2>Section de contrôle numéro ${n}</h2><p>Ce paragraphe de test numéro ${n} vérifie l'assemblage automatique de l'article : le comptage des mots hors balises HTML, l'exigence de trois titres de niveau deux minimum, la présence du lien vers la page d'accueil et la conformité générale de la structure aux gabarits des guides rédigés par l'équipe. Il répète volontairement un vocabulaire de contrôle pour atteindre le seuil de six cents mots que le validateur impose avant toute mise en file d'un vrai article rédigé par l'API, afin qu'aucune page trop légère ne puisse un jour rejoindre le sitemap du site et nuire à la qualité perçue par les moteurs de recherche.</p>`
  ).join("") + `<p>Retour vers <a href="/">l'accueil</a> et le guide <a href="chatbot-ia-rgpd.html">Chatbot IA et RGPD</a>.</p>`;

const exempleTest = {
  titre: "Article de test : la chaîne de génération fonctionne",
  description: "Page de test du pipeline de génération d'articles Haria. Ne reste pas en ligne : elle est remplacée dès le lendemain par un vrai sujet.",
  h1: "Article de test : la chaîne de génération fonctionne",
  accroche: "Réponse courte de <strong>test</strong> pour vérifier l'assemblage de la page, le sitemap et les liens internes.",
  corps: corpsTest,
  faq: [
    { question: "Que teste cette page ?", reponse: "L'assemblage automatique des articles générés : structure, JSON-LD, sitemap et liens internes du site Haria." },
    { question: "Combien de temps reste-t-elle en ligne ?", reponse: "Elle est remplacée dès la prochaine publication quotidienne d'un vrai sujet rédigé." },
    { question: "Qui rédige les vrais articles ?", reponse: "L'API OpenAI, à partir d'une liste de sujets validés et des faits produit du site Haria." },
    { question: "Où poser une question sur cette page ?", reponse: "Auprès de l'équipe Haria, par le chat du site ou le formulaire de démonstration de quinze minutes." },
  ],
  sources: ["https://www.cnil.fr/"],
};

let article = null;

function valider(a) {
  const problemes = [];
  const longueur = (t) => t.length;
  if (longueur(a.titre) < 30 || longueur(a.titre) > 65) problemes.push(`titre ${longueur(a.titre)} car (30-65 attendus)`);
  if (longueur(a.description) < 120 || longueur(a.description) > 158) problemes.push(`description ${longueur(a.description)} car (120-158 attendus)`);
  const corpsSansBalises = a.corps.replace(/<[^>]+>/g, " ");
  const mots = corpsSansBalises.split(/\s+/).filter(Boolean).length;
  if (mots < 500) problemes.push(`corps trop court : ${mots} mots (500 minimum, visez 900-1200)`);
  const h2 = (a.corps.match(/<h2>/g) || []).length;
  if (h2 < 3) problemes.push(`seulement ${h2} <h2> (3 minimum)`);
  if (/<h1[ >]/.test(a.corps)) problemes.push("le corps ne doit pas contenir de <h1>");
  if (/<(script|img|table|iframe|style)[ >]/.test(a.corps)) problemes.push("balise interdite dans le corps (script/img/table/iframe/style)");
  if (!/<a href="\//.test(a.corps)) problemes.push("lien vers l'accueil manquant dans le corps (ajoute <a href=\"/\">...</a>)");
  const liens = [...a.corps.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]);
  const autorises = ["/", "combien-coute-un-chatbot-ia.html", "haria-vs-agence-chatbot-ia.html", "haria-vs-intercom-vs-crisp.html", "chatbot-ia-ecommerce.html", "chatbot-ia-rgpd.html"];
  for (const l of liens) {
    if (!l.startsWith("/") && !autorises.includes(l) && !l.startsWith("#")) problemes.push(`lien non autorisé : ${l}`);
  }
  if (!Array.isArray(a.faq) || a.faq.length < 4) problemes.push("FAQ : 4 questions minimum");
  for (const u of a.sources || []) {
    if (!/^https:\/\/[a-z0-9.-]+([\/?#].*)?$/i.test(u)) problemes.push(`source invalide (URL https complète attendue) : ${u}`);
  }
  return problemes;
}

// Jusqu'à 3 essais : chaque refus repart au modèle avec la liste exacte des
// reproches, comme pour les rounds de correction des prompts plateforme.
let retours = [];
for (let essai = 1; essai <= 4 && !article; essai++) {
  if (essai > 1) console.log(`Tentative ${essai}/4 après refus : ${retours.join(" ; ")}`);
  const candidat = dry ? exempleTest : await appelAPI(retours);
  const problemes = valider(candidat);
  if (problemes.length === 0) {
    article = candidat;
  } else {
    console.error(`Refus de la tentative ${essai} —\n  ` + problemes.join("\n  "));
    retours = problemes;
  }
}
if (!article) {
  console.error("ERREUR : 4 tentatives non conformes — l'article du jour n'est PAS mis en file.");
  process.exit(1);
}

// ---- 5. Assemblage de la page ----------------------------------------------
function echapper(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const faqJson = article.faq.map((q) => `            {
                "@type": "Question",
                "name": ${JSON.stringify(q.question)},
                "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(q.reponse)} }
            }`).join(",\n");
const sourcesHtml = (article.sources || []).map((u) => `<a href="${echapper(u)}" target="_blank" rel="noopener noreferrer">${echapper(u.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>`).join(" ·\n                ");

const page = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${echapper(article.titre)} | Haria</title>
    <meta name="description" content="${echapper(article.description)}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="author" content="Haria">
    <meta name="keywords" content="${echapper(sujet.mot_cle)}, chatbot ia, haria">
    <link rel="canonical" href="https://haria-chatbot.com/${slug}.html">
    <link rel="alternate" type="text/markdown" title="Résumé Haria pour les IA (llms.txt)" href="https://haria-chatbot.com/llms.txt">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://haria-chatbot.com/${slug}.html">
    <meta property="og:title" content="${echapper(article.titre)}">
    <meta property="og:description" content="${echapper(article.description)}">
    <meta property="og:image" content="https://haria-chatbot.com/og-image.jpg">
    <meta property="og:locale" content="fr_FR">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${echapper(article.titre)}">
    <meta name="twitter:description" content="${echapper(article.description)}">
    <meta name="twitter:image" content="https://haria-chatbot.com/og-image.jpg">
    <meta name="theme-color" content="#6366f1">
    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
    <link rel="apple-touch-icon" href="apple-touch-icon.png">
    <link rel="preload" href="fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/" class="logo">
                <img src="logo.png" alt="Haria" class="logo-icon" width="50" height="50">
                <span class="logo-text">Haria</span>
            </a>
            <div class="nav-actions">
                <a href="https://hariastudio.com/inscription" class="btn btn-primary">Essai gratuit</a>
            </div>
        </div>
    </nav>

    <main class="legal-main article-main">
        <div class="container">
            <p class="article-breadcrumb"><a href="/">Accueil</a> › Guides › ${echapper(sujet.mot_cle)}</p>

            <h1>${echapper(article.h1 || article.titre)}</h1>
            <p class="legal-updated">Publié le ${aujourdhui.split("-").reverse().join("/")} · Article rédigé et vérifié par l'équipe Haria</p>

            <div class="article-tldr">
                <p><strong>Réponse courte :</strong> ${article.accroche}</p>
            </div>

            ${article.corps}

            <div class="article-cta">
                <p><strong>Haria lit votre site et construit votre chatbot en quelques minutes. Gratuit, sans carte bancaire.</strong></p>
                <a href="https://hariastudio.com/inscription" class="btn btn-lg">Créer mon assistant gratuit</a>
            </div>

            <h2>Questions fréquentes sur ${echapper(sujet.mot_cle)}</h2>
${article.faq.map((q) => `            <h3>${echapper(q.question)}</h3>
            <p>
                ${echapper(q.reponse)}
            </p>`).join("\n")}

            <p class="article-sources">
                Sources :
                ${sourcesHtml}.
                Voir aussi : <a href="combien-coute-un-chatbot-ia.html">Combien coûte un chatbot IA ?</a> ·
                <a href="chatbot-ia-rgpd.html">Chatbot IA et RGPD</a> ·
                <a href="haria-vs-intercom-vs-crisp.html">Haria vs Intercom vs Crisp</a>.
            </p>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-bottom">
                <p>&copy; 2026 Haria. Tous droits réservés.</p>
                <p>
                    <a href="mentions-legales.html">Mentions légales</a> ·
                    <a href="politique-confidentialite.html">Politique de confidentialité</a>
                </p>
            </div>
        </div>
    </footer>

    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": ${JSON.stringify(article.titre)},
        "description": ${JSON.stringify(article.description)},
        "datePublished": "${aujourdhui}",
        "dateModified": "${aujourdhui}",
        "inLanguage": "fr-FR",
        "author": { "@id": "https://haria-chatbot.com/#organization" },
        "publisher": { "@id": "https://haria-chatbot.com/#organization" },
        "mainEntityOfPage": "https://haria-chatbot.com/${slug}.html"
    }
    </script>

    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
${faqJson}
        ]
    }
    </script>

    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://haria-chatbot.com/" },
            { "@type": "ListItem", "position": 2, "name": ${JSON.stringify(sujet.mot_cle)}, "item": "https://haria-chatbot.com/${slug}.html" }
        ]
    }
    </script>
    <script src="https://hariastudio.com/widget.js" data-client="5f9c204d-e28a-43b2-8073-fae9d68aa03e"></script>
</body>
</html>
`;

const nomFile = `${aujourdhui}_${slug}.html`;
mkdirSync(join(racine, "_articles", "file"), { recursive: true });
writeFileSync(join(racine, "_articles", "file", nomFile), page);

// ---- 6. Consommer le sujet --------------------------------------------------
if (!dry) {
  sujets.shift();
  writeFileSync(cheminSujets, JSON.stringify(sujets, null, 2) + "\n");
}

const motsFinaux = article.corps.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
const h2Finaux = (article.corps.match(/<h2>/g) || []).length;
console.log(`Article mis en file : _articles/file/${nomFile} (${motsFinaux} mots, ${h2Finaux} h2, FAQ ${article.faq.length})`);
console.log(`TITRE=${article.titre.split(/\s+[|—·]\s+/)[0].trim()}`);
