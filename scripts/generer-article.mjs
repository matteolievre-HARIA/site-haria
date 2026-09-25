// Rédige l'article du jour avec l'API OpenAI et le dépose dans la file
// _articles/file/ (le workflow enchaîne ensuite avec publier-article.mjs).
//
// Le sujet est pris en tête de _articles/sujets.json puis CONSOMMÉ (retiré
// de la liste) : chaque jour un sujet différent, jamais deux fois le même.
// Chaque sujet est un BRIEF complet : requête, intention, problème,
// requêtes secondaires, questions, notions, page cible, apport concret.
//
// Garde-fous avant rédaction :
// - comparaison du sujet avec l'inventaire réel du site (scripts/lib-site.mjs)
//   pour refuser un sujet qui ferait doublon avec une page publiée ;
// - les faits produit viennent de llms.txt : l'IA ne peut pas inventer les
//   prix ni les engagements Haria ;
// - les liens internes autorisés sont dérivés des pages réellement publiées ;
// - les liens externes du corps doivent figurer dans « sources », et chaque
//   source est vérifiée par requête HTTP (une source injoignable est retirée,
//   jamais publiée telle quelle).
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
import { listerPages, lireAnnotations, rechercherConflits } from "./lib-site.mjs";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--test");
const aujourdhui = new Date().toISOString().slice(0, 10);
const MODELE_API = process.env.OPENAI_MODEL || "gpt-4o-mini";
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
const requete = sujet.requete || sujet.mot_cle; // mot_cle = ancien format
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`ERREUR : slug invalide (${slug}) — minuscules et tirets uniquement.`);
  process.exit(1);
}
if (!requete) {
  console.error(`ERREUR : le sujet ${slug} n'a pas de « requete » — complétez le brief.`);
  process.exit(1);
}
if (existsSync(join(racine, slug + ".html"))) {
  console.error(`ERREUR : ${slug}.html existe déjà — changez le slug du sujet.`);
  process.exit(1);
}

// ---- 2. Anti-cannibalisation : le sujet recouvre-t-il une page publiée ? ----
const pages = listerPages(racine);
const annotations = lireAnnotations(racine);
const conflits = rechercherConflits(requete, pages, annotations);
if (conflits.length && conflits[0].score >= 0.99) {
  console.error(
    `SUJET REFUSÉ : la requête « ${requete} » est déjà couverte par ${conflits[0].fichier} ` +
    `(recouvrement ${Math.round(conflits[0].score * 100)} %).\n` +
    `Enrichissez cette page existante plutôt que d'en créer une nouvelle,\n` +
    `ou resserrez l'angle du sujet dans _articles/sujets.json.`
  );
  process.exit(1);
}
if (conflits.length && conflits[0].score >= 0.85) {
  console.warn(
    `ATTENTION : recouvrement partiel (${Math.round(conflits[0].score * 100)} %) avec ` +
    `${conflits[0].fichier} — l'article doit traiter un angle distinct, jamais la même intention.`
  );
}

// ---- 3. Les faits produit : jamais inventés --------------------------------
const faits = readFileSync(join(racine, "llms.txt"), "utf8");

// ---- 4. Le brief du sujet ----------------------------------------------------
function construireBrief(s) {
  const lignes = [];
  lignes.push(`- Requête principale : ${s.requete || s.mot_cle}`);
  if (s.intention) lignes.push(`- Intention de recherche : ${s.intention}`);
  if (s.probleme) lignes.push(`- Problème concret du lecteur : ${s.probleme}`);
  if (s.requetes_secondaires?.length) lignes.push(`- Requêtes secondaires et variantes naturelles : ${s.requetes_secondaires.join(" ; ")}`);
  if (s.questions?.length) lignes.push(`- Questions associées (à traiter si elles restent utiles après le corps) : ${s.questions.join(" ; ")}`);
  if (s.notions?.length) lignes.push(`- Notions indispensables à expliquer : ${s.notions.join(" ; ")}`);
  if (s.angle) lignes.push(`- Angle imposé : ${s.angle}`);
  if (s.apport) lignes.push(`- Apport concret attendu (obligatoire, l'article est refusé sans lui) : ${s.apport}`);
  if (s.page_cible) lignes.push(`- Page vers laquelle conduire naturellement le lecteur (lien interne obligatoire dans le corps) : ${s.page_cible}`);
  if (s.recherche) lignes.push(`- Notes de recherche web vérifiées par l'équipe (fiables, tu peux t'appuyer dessus) : ${s.recherche}`);
  return lignes.join("\n");
}

// Inventaire réel du site : le modèle connaît les pages existantes et la
// liste des liens internes autorisés (les fichiers publiés à la racine).
const liensInternes = pages
  .map((p) => `  - ${p.url} — ${p.titre || "(titre absent)"}`)
  .join("\n");

// ---- 5. Rédaction -----------------------------------------------------------
const systeme = `Tu es rédacteur SEO senior francophone pour Haria, un assistant IA pour sites web (haria-chatbot.com).
Règles impératives :
- Français impeccable, tutoiement interdit : vous.
- Chiffres de prix et engagements produit : UNIQUEMENT ceux des faits ci-dessous, jamais d'autres.
- Aucun chiffre de résultat client inventé, aucun témoignage, aucune statistique externe sans source listée dans « sources ». Pas de superlatif creux.
- Ne cite pas la concurrence avec des prix précis (sauf si le fait figure dans les données).
- Style concret, phrases courtes, zéro remplissage, zéro formule d'introduction passe-partout.
- La requête principale apparaît naturellement dans les 100 premiers mots et dans un titre de section, sans être rabachue dans chaque intertitre.
- La requête est une suite de mots-clés, pas une phrase : ne la colle JAMAIS telle quelle dans un titre ou une phrase (« Pourquoi rédiger FAQ site web », « questions fréquentes site web reviennent »). Accorde-la en français correct, avec articles et prépositions (« Pourquoi rédiger la FAQ de votre site web »). Un intertitre doit se lire comme l'écrirait un rédacteur humain.
Tu réponds UNIQUEMENT en JSON valide conforme au schéma demandé.`;

const consigne = `Rédige un article de blog SEO qui résout le problème du lecteur.

${construireBrief(sujet)}

Faits vérifiés sur Haria (ta seule source autorisée pour les chiffres et engagements) :
"""
${faits.slice(0, 6000)}
"""

Pages déjà publiées sur le site — n'écris JAMAIS un article qui répond à la même intention que l'une d'elles ; renvoie-y le lecteur plutôt que de répéter :
${liensInternes}

Règles de structure (adapte la longueur à la question, aucun minimum de mots imposé) :
- une introduction SANS titre : 60 à 120 mots, la requête principale dans les 100 premiers mots ;
- l'accroche du schéma donne la réponse courte dès l'ouverture de la page ;
- ensuite des sections <h2>/<h3> au nombre et à la longueur NÉCESSAIRES (généralement 3 à 6 h2) : chaque titre introduit une vraie réponse, pas un remplissage ;
- utilise une liste <ul> ou un tableau quand une comparaison aide. Tableau uniquement au format exact : <div class="table-scroll"><table class="article-table">...</table></div> avec <thead> et <tbody> ;
- expliquer les étapes, conditions, limites et erreurs pertinentes ; un exemple concret quand il aide ;
- pas de conclusion générique : termine le corps par une prochaine étape utile adaptée à l'intention du lecteur (une phrase, pas un paragraphe de vente) ;
- FAQ : uniquement les questions listées au brief qui RESTENT sans réponse dans le corps. Si tout est déjà traité, rends « faq » vide. 0 à 5 questions, jamais de question déjà répondue plus haut ;
- si tu cites un fait externe, place le lien de sa source juste après l'affirmation (ancre descriptive), et liste l'URL dans « sources ». N'invente aucune URL.

Liens internes : 1 à 4 liens <a> vers des pages de la liste ci-dessus (href relatifs exactement comme listés, « / » pour l'accueil), ancres descriptives et variées. Le lien vers la page cible du brief est obligatoire dans le corps. Aucun lien interne hors de cette liste.

Schéma JSON attendu :
{
  "titre": "title SEO de 50 à 60 caractères, avec la requête ou une formulation proche, sans guillemets",
  "description": "meta description de 140 à 155 caractères expliquant l'intérêt concret de la page",
  "h1": "titre affiché (peut différer du title)",
  "accroche": "réponse courte de 2 à 4 phrases en <strong>",
  "corps": "corps en HTML : uniquement <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <a>, et le format exact de tableau décrit plus haut. Interdits : <h1>, <img>, <script>, style en ligne, markdown (**, ##).",
  "faq": [ { "question": "...", "reponse": "..." } ],
  "sources": ["https://..."]
}
Contraintes : sources = pages officielles vérifiables uniquement (cnil.fr, developers.google.com, etc.), jamais d'URL inventée ; « sources » peut être vide si l'article ne s'appuie sur aucun fait externe.`;

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

// Vérifie chaque source par HTTP : une source injoignable ne sera pas
// publiée (retirée du bas de page ET du corps, l'ancre redevenant du texte).
async function verifierSources(urls) {
  const resultats = await Promise.allSettled(
    urls.map(async (u) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      try {
        const r = await fetch(u, {
          signal: ctrl.signal,
          redirect: "follow",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; verification-sources-haria)" },
        });
        return r.status;
      } finally {
        clearTimeout(t);
      }
    })
  );
  return urls.map((u, i) => {
    const r = resultats[i];
    const statut = r.status === "fulfilled" ? r.value : (r.reason?.name === "AbortError" ? "timeout" : "erreur reseau");
    return { url: u, ok: r.status === "fulfilled" && r.value < 400, statut };
  });
}

// Mode --test : réponse figée pour valider l'assemblage sans dépenser d'API.
const corpsTest =
  [1, 2, 3, 4].map((n) =>
    `<h2>Section de contrôle numéro ${n}</h2><p>Ce paragraphe de test numéro ${n} vérifie l'assemblage automatique de l'article : le comptage des mots hors balises HTML, la présence du lien vers la page d'accueil, la conformité des liens internes à l'inventaire réel du site et la structure générale de la page. Il répète volontairement un vocabulaire de contrôle pour franchir le garde anti-troncature qui bloque toute page manifestement coupée avant la mise en file d'un vrai article rédigé par l'API.</p>`
  ).join("") +
  `<h2>Un exemple de tableau de contrôle</h2><div class="table-scroll"><table class="article-table"><thead><tr><th>Colonne A</th><th>Colonne B</th></tr></thead><tbody><tr><td>Valeur 1</td><td>Valeur 2</td></tr></tbody></table></div><p>Retour vers <a href="/">l'accueil</a> et le guide <a href="chatbot-ia-rgpd.html">Chatbot IA et RGPD</a>.</p>`;

const exempleTest = {
  titre: "Article de test : la chaîne de génération fonctionne",
  description: "Page de test du pipeline de génération d'articles Haria. Ne reste pas en ligne : elle est remplacée dès le lendemain par un vrai sujet.",
  h1: "Article de test : la chaîne de génération fonctionne",
  accroche: "Réponse courte de <strong>test</strong> pour vérifier l'assemblage de la page, le sitemap et les liens internes.",
  corps: corpsTest,
  faq: [
    { question: "Que teste cette page ?", reponse: "L'assemblage automatique des articles générés : structure, JSON-LD, sitemap et liens internes du site Haria." },
    { question: "Qui rédige les vrais articles ?", reponse: "L'API OpenAI, à partir des briefs de _articles/sujets.json et des faits produit du site Haria." },
  ],
  sources: ["https://www.cnil.fr/"],
};

let article = null;
const journalTentatives = [];

function valider(a) {
  const problemes = [];
  const L = (t) => (t || "").length;
  if (L(a.titre) < 30 || L(a.titre) > 65) problemes.push(`titre ${L(a.titre)} car (30-65 attendus)`);
  if (L(a.description) < 120 || L(a.description) > 158) problemes.push(`description ${L(a.description)} car (120-158 attendus)`);
  if (!a.accroche || a.accroche.length < 40) problemes.push("accroche absente ou trop courte");

  const corps = a.corps || "";
  const corpsSansBalises = corps.replace(/<[^>]+>/g, " ");
  const motsCorps = corpsSansBalises.split(/\s+/).filter(Boolean).length;
  // Garde anti-troncature, pas un objectif SEO : la longueur reste adaptée à la question.
  if (motsCorps < 250) problemes.push(`corps trop court : ${motsCorps} mots (garde anti-troncature : 250 minimum)`);
  if (/\*\*|^#{1,6} /m.test(corps)) problemes.push("markdown détecté dans le corps (HTML uniquement)");
  if (/<h1[ >]/.test(corps)) problemes.push("le corps ne doit pas contenir de <h1>");
  if (!corps.includes("<h2>")) problemes.push("aucun <h2> dans le corps");
  if (/<(script|img|iframe|style)[ >]/.test(corps)) problemes.push("balise interdite dans le corps (script/img/iframe/style)");
  // Tableau : uniquement le format stylé par styles.css (.table-scroll > .article-table).
  if (/<table/.test(corps)) {
    const sansTableauxValides = corps.replace(/<div class="table-scroll"><table class="article-table">[\s\S]*?<\/table><\/div>/g, "");
    if (/<table/.test(sansTableauxValides)) problemes.push("tableau hors du format imposé <div class=\"table-scroll\"><table class=\"article-table\">");
  }

  // Liens internes : uniquement des pages réellement publiées.
  const fichiersPublies = new Set(pages.map((p) => p.fichier));
  const liens = [...corps.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]);
  const liensExternes = [];
  let lienAccueil = false;
  let lienCible = false;
  for (const l of liens) {
    if (l.startsWith("#")) continue;
    if (l === "/") { lienAccueil = true; continue; }
    if (l.startsWith("http")) { liensExternes.push(l); continue; }
    if (!fichiersPublies.has(l)) problemes.push(`lien interne non autorisé : ${l}`);
    if (sujet.page_cible && l === sujet.page_cible) lienCible = true;
  }
  if (!liens.length) problemes.push("aucun lien dans le corps");
  if (sujet.page_cible && sujet.page_cible !== "/" && !lienCible) {
    problemes.push(`lien vers la page cible du brief manquant : ${sujet.page_cible}`);
  }

  // Liens externes du corps : obligatoirement listés dans « sources ».
  const sources = [...new Set(a.sources || [])];
  for (const l of liensExternes) {
    if (!sources.includes(l)) problemes.push(`lien externe non déclaré dans sources : ${l}`);
  }
  for (const u of sources) {
    if (!/^https:\/\/[a-z0-9.-]+([\/?#].*)?$/i.test(u)) problemes.push(`source invalide (URL https complète attendue) : ${u}`);
  }

  // FAQ : 0 à 5 questions, seulement ce qui reste sans réponse dans le corps.
  if (!Array.isArray(a.faq)) problemes.push("faq absente du schéma (peut être vide)");
  else if (a.faq.length > 5) problemes.push(`faq : ${a.faq.length} questions (5 maximum — les vraies questions seulement)`);
  else {
    const texteCorps = corpsSansBalises.toLowerCase();
    for (const q of a.faq) {
      if (!q.question || q.question.length < 10) problemes.push("question FAQ trop courte");
      if (!q.reponse || q.reponse.length < 20) problemes.push(`réponse FAQ trop courte : ${q.question || "?"}`);
      const debutQuestion = (q.question || "").toLowerCase().replace(/[?!.'’]/g, "").split(/\s+/).slice(0, 5).join(" ");
      if (debutQuestion && texteCorps.includes(debutQuestion)) {
        // Pas forcément une erreur (le corps peut mentionner la question),
        // on ne bloque que si la réponse entière figure déjà mot pour mot.
        const reponseNue = q.reponse.replace(/<[^>]+>/g, "").toLowerCase().slice(0, 80);
        if (reponseNue.length > 40 && texteCorps.includes(reponseNue)) {
          problemes.push(`FAQ déjà répondue dans le corps : ${q.question}`);
        }
      }
    }
  }

  // Aucun placeholder ni commentaire interne.
  const tout = JSON.stringify(a);
  if (/TODO|FIXME|LOREM|IPSUM|AAAA-MM-JJ|\[nom\]|\[description\]|\[titre\]|à compléter|à remplacer/i.test(tout)) {
    problemes.push("placeholder ou commentaire interne détecté");
  }
  return problemes;
}

// Jusqu'à 4 essais : chaque refus repart au modèle avec la liste exacte des
// reproches. Au-delà, échec explicite — la cadence quotidienne ne publie
// jamais une page insuffisante.
let retours = [];
for (let essai = 1; essai <= 4 && !article; essai++) {
  if (essai > 1) console.log(`Tentative ${essai}/4 après refus : ${retours.join(" ; ")}`);
  const candidat = dry ? exempleTest : await appelAPI(retours);
  const problemes = valider(candidat);
  journalTentatives.push({ essai, problemes });
  if (problemes.length === 0) {
    article = candidat;
  } else {
    console.error(`Refus de la tentative ${essai} —\n  ` + problemes.join("\n  "));
    retours = problemes;
  }
}
if (!article) {
  console.error("ERREUR : 4 tentatives non conformes — l'article du jour n'est PAS mis en file (état d'échec explicite).");
  process.exit(1);
}

// ---- 6. Vérification des sources (jamais en --test) -------------------------
const liensExternesCorps = [...article.corps.matchAll(/<a href="(https:[^"]*)"/g)].map((m) => m[1]);
const verifications = dry
  ? (article.sources || []).map((u) => ({ url: u, ok: true, statut: "mode test" }))
  : await verifierSources([...new Set(article.sources || [])]);
const sourcesValides = verifications.filter((v) => v.ok).map((v) => v.url);
const sourcesRejetees = verifications.filter((v) => !v.ok);
for (const v of sourcesRejetees) {
  console.warn(`Source retirée (${v.statut}) : ${v.url}`);
  // Une source liée dans le corps mais injoignable : l'ancre redevient du texte.
  article.corps = article.corps.replace(
    new RegExp(`<a href="${v.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>([\\s\\S]*?)</a>`, "g"),
    "$1"
  );
}
article.sources = sourcesValides;

// ---- 7. Assemblage de la page ----------------------------------------------
function echapper(t) {
  return (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const faqJson = article.faq
  .map((q) => `            {
                "@type": "Question",
                "name": ${JSON.stringify(q.question)},
                "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(q.reponse)} }
            }`)
  .join(",\n");

// Bloc « Voir aussi » : la page cible du brief + les liens internes déjà
// présents dans le corps. Déduit du contenu, jamais une liste figée.
const pagesLiees = [...new Set(
  [...article.corps.matchAll(/<a href="([a-z0-9-]+\.html)"/g)].map((m) => m[1])
)];
const voirAussi = [];
if (sujet.page_cible && sujet.page_cible !== "/" && !pagesLiees.includes(sujet.page_cible)) {
  voirAussi.push(sujet.page_cible);
}
for (const f of pagesLiees) {
  if (voirAussi.length >= 3) break;
  if (!voirAussi.includes(f)) voirAussi.push(f);
}
const voirAussiHtml = voirAussi
  .map((f) => {
    const p = pages.find((x) => x.fichier === f);
    return `<a href="${f}">${echapper(p?.titre || f.replace(/\.html$/, "").replace(/-/g, " "))}</a>`;
  })
  .join(" ·\n                ");
const sourcesHtml = article.sources
  .map((u) => `<a href="${echapper(u)}" target="_blank" rel="noopener noreferrer">${echapper(u.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>`)
  .join(" ·\n                ");
const blocSources = sourcesHtml ? `Sources :\n                ${sourcesHtml}.` : "";
const blocVoirAussi = voirAussiHtml ? `Voir aussi : ${voirAussiHtml}.` : "";
const ligneSources = [blocSources, blocVoirAussi].filter(Boolean).join("\n                ");
const blocFaq = article.faq.length
  ? `            <h2>Questions fréquentes</h2>
${article.faq.map((q) => `            <h3>${echapper(q.question)}</h3>
            <p>
                ${echapper(q.reponse)}
            </p>`).join("\n")}

`
  : "";
const jsonFaq = article.faq.length
  ? `    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
${faqJson}
        ]
    }
    </script>

`
  : "";

const page = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${echapper(article.titre)} | Haria</title>
    <meta name="description" content="${echapper(article.description)}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="author" content="Haria">
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
            <p class="article-breadcrumb"><a href="/">Accueil</a> › Guides › ${echapper(requete)}</p>

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

${blocFaq}            <p class="article-sources">
                ${ligneSources}
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

${jsonFaq}    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://haria-chatbot.com/" },
            { "@type": "ListItem", "position": 2, "name": ${JSON.stringify(requete)}, "item": "https://haria-chatbot.com/${slug}.html" }
        ]
    }
    </script>
    <!-- async : le widget ne retarde plus l'affichage de la page -->
    <script async src="https://hariastudio.com/widget.js" data-client="5f9c204d-e28a-43b2-8073-fae9d68aa03e"></script>
</body>
</html>
`;

// ---- 8. Journal de génération (traçabilité du brief et des contrôles) -------
mkdirSync(join(racine, "_articles", "journal"), { recursive: true });
const enteteJournal = `# Journal de génération — ${slug}

- Date : ${aujourdhui}
- Mode : ${dry ? "test (sans appel API)" : "génération OpenAI"}
- Tentatives : ${journalTentatives.length}
- Corps : ${article.corps.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length} mots, ${(article.corps.match(/<h2>/g) || []).length} h2, FAQ ${article.faq.length}
- Sources vérifiées : ${article.sources.length ? article.sources.join(", ") : "aucune (l'article ne s'appuie sur aucun fait externe)"}
- Sources rejetées : ${sourcesRejetees.length ? sourcesRejetees.map((v) => `${v.url} (${v.statut})`).join(", ") : "aucune"}

## Brief du sujet
\`\`\`json
${JSON.stringify(sujet, null, 2)}
\`\`\`

## Contrôles
${journalTentatives.map((t) => `- Tentative ${t.essai} : ${t.problemes.length ? "refusée — " + t.problemes.join(" ; ") : "acceptée"}`).join("\n")}
`;
writeFileSync(join(racine, "_articles", "journal", `${aujourdhui}_${slug}.md`), enteteJournal);

// ---- 9. Mise en file puis consommation du sujet -----------------------------
const nomFile = `${aujourdhui}_${slug}.html`;
mkdirSync(join(racine, "_articles", "file"), { recursive: true });
writeFileSync(join(racine, "_articles", "file", nomFile), page);

if (!dry) {
  sujets.shift();
  writeFileSync(cheminSujets, JSON.stringify(sujets, null, 2) + "\n");
}

const motsFinaux = article.corps.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
const h2Finaux = (article.corps.match(/<h2>/g) || []).length;
console.log(`Article mis en file : _articles/file/${nomFile} (${motsFinaux} mots, ${h2Finaux} h2, FAQ ${article.faq.length})`);
console.log(`TITRE=${article.titre.split(/\s+[|—·]\s+/)[0].trim()}`);
