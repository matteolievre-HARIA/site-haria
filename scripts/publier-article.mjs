// Publie le plus ancien article en attente dans _articles/file/.
//
// Convention de nommage : AAAA-MM-JJ_slug.html (la date fixe l'ordre de
// publication). Le fichier est déplacé à la racine du site sous `slug.html`,
// ajouté à la page guides.html (régénérée) puis au sitemap. L'accueil et son pied de page restent inchangés.
//
// Contrôles effectués avant publication (bloquants) :
// - title, meta description et canonical présents, canonical = URL publiée ;
// - page indexable (pas de noindex), langue fr, un seul h1 ;
// - tout lien interne pointe vers une page réellement publiée (ou /) ;
// - les blocs JSON-LD (Article, FAQPage, BreadcrumbList) sont du JSON valide ;
// - chaque question FAQPage figure bien dans le texte visible de la page ;
// - aucun placeholder ni commentaire interne.
// Avertissements (non bloquants, à relire) : longueurs de title/description,
// recouvrement de sujet avec une page déjà publiée.
//
// Usage :
//   node scripts/publier-article.mjs                    → publie un article
//   node scripts/publier-article.mjs --dry              → montre ce qui se passerait
//   node scripts/publier-article.mjs --verifier FICHIER → contrôle un brouillon
//     sans le publier (utile pour un article écrit à la main)
//
// Sortie : ligne « TITRE=<titre court> » pour le workflow GitHub Actions.
// Sans article en attente : « RIEN_A_PUBLIER » et code 0 (le workflow
// s'arrête proprement sans commit vide).

import { readdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { listerPages, lireAnnotations, rechercherConflits, genererPageGuides } from "./lib-site.mjs";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(racine, "_articles", "file");
const dry = process.argv.includes("--dry");
const idxVerifier = process.argv.indexOf("--verifier");
const modeVerifier = idxVerifier !== -1;
const aujourdhui = new Date().toISOString().slice(0, 10);

function lire(f) {
  return readFileSync(join(racine, f), "utf8");
}
function ecrire(f, contenu) {
  if (dry) return;
  writeFileSync(join(racine, f), contenu);
}

// ---- 0. Mode vérification d'un brouillon isolé ------------------------------
let nomFichier;
if (modeVerifier) {
  const chemin = process.argv[idxVerifier + 1];
  if (!chemin) {
    console.error("ERREUR : --verifier attend un chemin de fichier HTML.");
    process.exit(1);
  }
  // Chemin relatif à la racine du dépôt, comme en mode file.
  nomFichier = existsSync(join(racine, chemin))
    ? chemin
    : join("_articles", "brouillons", chemin);
  if (!existsSync(join(racine, nomFichier))) {
    console.error(`ERREUR : fichier introuvable : ${chemin}`);
    process.exit(1);
  }
} else {
  // ---- 1. L'article en tête de file -----------------------------------------
  if (!existsSync(file)) {
    console.log("RIEN_A_PUBLIER");
    console.log("Le dossier _articles/file/ n'existe pas.");
    process.exit(0);
  }
  const enAttente = readdirSync(file).filter((f) => f.endsWith(".html")).sort();
  if (enAttente.length === 0) {
    console.log("RIEN_A_PUBLIER");
    console.log("Aucun article dans _articles/file/ — pensez à en rédiger d'avance.");
    process.exit(0);
  }
  nomFichier = join("_articles", "file", enAttente[0]);
}

const baseNom = nomFichier.split("/").pop();
const slug = baseNom.replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/\.html$/, "");
if (!modeVerifier && slug === baseNom.replace(/\.html$/, "")) {
  console.error(`ERREUR : ${baseNom} doit être préfixé par sa date (AAAA-MM-JJ_slug.html)`);
  process.exit(1);
}
if (!modeVerifier && existsSync(join(racine, slug + ".html"))) {
  console.error(`ERREUR : ${slug}.html existe déjà à la racine — slug en conflit.`);
  process.exit(1);
}

// ---- 2. Contrôles du contenu ------------------------------------------------
const contenu = readFileSync(join(racine, nomFichier), "utf8");
const url = slug === "index" ? "https://haria-chatbot.com/" : `https://haria-chatbot.com/${slug}.html`;

const titre = contenu.match(/<title>(.*?)<\/title>/s)?.[1]?.trim();
const description = contenu.match(/<meta name="description" content="([^"]*)"/)?.[1];
const canonique = contenu.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
const robots = contenu.match(/<meta name="robots" content="([^"]*)"/)?.[1] || "";
const langue = contenu.match(/<html[^>]*\slang="([^"]*)"/)?.[1];
const h1s = contenu.match(/<h1[ >]/g) || [];

const problemes = [];
const avertissements = [];

if (!titre) problemes.push("balise <title> absente");
if (!description) problemes.push("meta description absente");
if (!canonique) problemes.push("canonical absent");
else if (canonique !== url) problemes.push(`canonical (${canonique}) ≠ URL publiée (${url})`);
if (/noindex/i.test(robots)) problemes.push(`la page est bloquée à l'indexation (meta robots : ${robots})`);
if (langue !== "fr") problemes.push(`langue absente ou différente de fr (${langue || "aucune"})`);
if (h1s.length !== 1) problemes.push(`${h1s.length} balise(s) <h1> (exactement 1 attendu)`);

// Longueurs éditoriales : repères souples, on n'avertit qu'hors bornes larges.
if (titre && (titre.length < 30 || titre.length > 65)) avertissements.push(`title ${titre.length} car (recommandé 30-65)`);
if (description && (description.length < 110 || description.length > 160)) avertissements.push(`description ${description.length} car (recommandé 110-160)`);

// Liens internes : chaque href relatif doit correspondre à une page publiée
// (l'inventaire de contenu ou une page utilitaire : mentions, 404, etc.).
const pages = listerPages(racine);
const fichiersPublies = new Set(pages.map((p) => p.fichier));
fichiersPublies.add("404.html").add("merci.html").add("mentions-legales.html").add("politique-confidentialite.html").add("guides.html");
const hrefs = [...contenu.matchAll(/<a href="([^"]*)"/g)].map((m) => m[1]);
for (const h of hrefs) {
  if (h.startsWith("#") || h.startsWith("/#") || h === "/") continue;
  if (/^https?:\/\//.test(h)) continue;
  if (/^(mailto:|tel:)/.test(h)) continue;
  if (!fichiersPublies.has(h)) problemes.push(`lien interne brisé : ${h}`);
}

// JSON-LD : du JSON valide, et les questions FAQ visibles dans la page.
// Texte visible : balises retirées, entités courantes décodées, espaces
// et apostrophes normalisés (pour comparer avec le JSON-LD).
const texteVisible = contenu
  .replace(/<script[\s\S]*?<\/script>/g, " ")
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "'")
  .replace(/[’‘]/g, "'")
  .replace(/\s+/g, " ")
  .toLowerCase();
const blocsJsonLd = [...contenu.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
for (const bloc of blocsJsonLd) {
  let json;
  try {
    json = JSON.parse(bloc[1]);
  } catch (e) {
    problemes.push(`JSON-LD invalide : ${e.message}`);
    continue;
  }
  const type = json["@type"];
  if (type === "FAQPage") {
    const normaliser = (t) => (t || "").replace(/[’‘]/g, "'").toLowerCase();
    for (const q of json.mainEntity || []) {
      const debut = normaliser(q.name).slice(0, 40);
      if (debut && !texteVisible.includes(debut)) {
        problemes.push(`question FAQPage absente du texte visible : ${q.name}`);
      }
    }
  }
  if ((type === "Article" || type === "BlogPosting") && !/^\d{4}-\d{2}-\d{2}$/.test(json.datePublished || "")) {
    problemes.push("JSON-LD Article sans datePublished ISO");
  }
}
const aFaqVisible = /<h3[ >]/.test(contenu);
const aFaqJson = blocsJsonLd.some((b) => {
  try {
    return JSON.parse(b[1])["@type"] === "FAQPage";
  } catch {
    return false;
  }
});
if (aFaqJson && !aFaqVisible) problemes.push("JSON-LD FAQPage sans questions visibles dans la page");

// Aucun placeholder ni commentaire interne dans le texte visible.
if (/TODO|FIXME|LOREM|IPSUM|AAAA-MM-JJ|\[nom\]|\[titre\]|\[description\]|SUJET DE L'ARTICLE|à compléter|à remplacer/i.test(texteVisible)) {
  problemes.push("placeholder ou commentaire interne détecté dans le texte visible");
}

// Recouvrement de sujet avec l'existant (avertissement : la décision
// d'enrichir ou de créer appartient à l'équipe).
const annotations = lireAnnotations(racine);
const conflits = rechercherConflits(`${titre || ""} ${description || ""}`.trim(), pages, annotations)
  .filter((c) => c.fichier !== slug + ".html" && c.fichier !== "index.html");
if (conflits.length && conflits[0].score >= 0.99) {
  avertissements.push(`sujet très proche de ${conflits[0].fichier} (recouvrement ${Math.round(conflits[0].score * 100)} %) — vérifiez qu'il ne s'agit pas d'un doublon d'intention`);
}

if (problemes.length) {
  console.error(`ERREUR : ${baseNom} — contrôle avant publication en échec :\n  - ` + problemes.join("\n  - "));
  process.exit(1);
}
for (const a of avertissements) console.warn(`AVERTISSEMENT : ${a}`);

const titreCourt = (titre || "").split(/\s+[|—·]\s+/)[0].trim();
if (modeVerifier) {
  console.log(`CONTRÔLE OK : ${nomFichier} (${avertissements.length} avertissement(s))`);
  process.exit(0);
}

// ---- 3. Publication à la racine --------------------------------------------
console.log(dry ? "[dry] déplacerait" : "Déplacement de", `${nomFichier} → ${slug}.html`);
if (!dry) renameSync(join(racine, nomFichier), join(racine, slug + ".html"));

// ---- 4. Page guides.html (seul lien entrant garanti vers l'article) ---------
ecrire("guides.html", genererPageGuides(racine));
console.log(dry ? "[dry] régénérerait guides.html" : "guides.html régénérée");

// ---- 5. Sitemap (sans insertion de lien dans l'accueil) ---------------------
let sitemap = lire("sitemap.xml");
const entree = `  <url>
    <loc>${url}</loc>
    <lastmod>${aujourdhui}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
if (sitemap.includes(`<loc>${url}</loc>`)) {
  console.error(`ERREUR : ${url} est déjà dans le sitemap.`);
  process.exit(1);
}
sitemap = sitemap.replace("</urlset>", entree + "</urlset>");
ecrire("sitemap.xml", sitemap);
console.log(`Sitemap : ${url} ajouté`);

console.log(`TITRE=${titreCourt}`);
