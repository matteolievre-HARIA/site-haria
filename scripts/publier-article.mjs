// Publie le plus ancien article en attente dans _articles/file/.
//
// Convention de nommage : AAAA-MM-JJ_slug.html (la date fixe l'ordre de
// publication). Le fichier est déplacé à la racine du site sous `slug.html`,
// le guide est ajouté à la liste « Nos guides » de l'accueil et au sitemap,
// et la date de dernière modification de l'accueil est rafraîchie.
//
// Usage :
//   node scripts/publier-article.mjs          → publie un article
//   node scripts/publier-article.mjs --dry    → montre ce qui se passerait
//
// Sortie : ligne « TITRE=<titre court> » pour le workflow GitHub Actions.
// Sans article en attente : « RIEN_A_PUBLIER » et code 0 (le workflow
// s'arrête proprement sans commit vide).

import { readdirSync, readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(racine, "_articles", "file");
const dry = process.argv.includes("--dry");
const aujourdhui = new Date().toISOString().slice(0, 10);

function lire(f) {
  return readFileSync(join(racine, f), "utf8");
}
function ecrire(f, contenu) {
  if (dry) return;
  writeFileSync(join(racine, f), contenu);
}

// ---- 1. L'article en tête de file -----------------------------------------
if (!existsSync(file)) {
  console.log("RIEN_A_PUBLIER");
  console.log("Le dossier _articles/file/ n'existe pas.");
  process.exit(0);
}
const enAttente = readdirSync(file)
  .filter((f) => f.endsWith(".html"))
  .sort();
if (enAttente.length === 0) {
  console.log("RIEN_A_PUBLIER");
  console.log("Aucun article dans _articles/file/ — pensez à en rédiger d'avance.");
  process.exit(0);
}
const nomFichier = enAttente[0];
const slug = nomFichier.replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/\.html$/, "");
if (slug === nomFichier.replace(/\.html$/, "")) {
  console.error(`ERREUR : ${nomFichier} doit être préfixé par sa date (AAAA-MM-JJ_slug.html)`);
  process.exit(1);
}
if (existsSync(join(racine, slug + ".html"))) {
  console.error(`ERREUR : ${slug}.html existe déjà à la racine — slug en conflit.`);
  process.exit(1);
}

// ---- 2. Validation du contenu ---------------------------------------------
const contenu = readFileSync(join(file, nomFichier), "utf8");
const titre = contenu.match(/<title>(.*?)<\/title>/s)?.[1]?.trim();
const description = contenu.match(/<meta name="description" content="([^"]*)"/)?.[1];
const canonique = contenu.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
const url = `https://haria-chatbot.com/${slug}.html`;

const problemes = [];
if (!titre) problemes.push("balise <title> absente");
if (!description) problemes.push("meta description absente");
if (!canonique) problemes.push("canonical absent");
else if (canonique !== url) problemes.push(`canonical (${canonique}) ≠ URL publiée (${url})`);
if (problemes.length) {
  console.error(`ERREUR : ${nomFichier} — ${problemes.join(", ")}.`);
  process.exit(1);
}
const titreCourt = titre.split(/\s+[|—·]\s+/)[0].trim();

// ---- 3. Publication à la racine --------------------------------------------
console.log(dry ? "[dry] déplacerait" : "Déplacement de", `_articles/file/${nomFichier} → ${slug}.html`);
if (!dry) renameSync(join(file, nomFichier), join(racine, slug + ".html"));

// ---- 4. Liste « Nos guides » de l'accueil ----------------------------------
let index = lire("index.html");
const placeHolder = '<li hidden data-haria-guide-auto></li>';
if (!index.includes(placeHolder)) {
  console.error("ERREUR : repère <li hidden data-haria-guide-auto></li> introuvable dans index.html.");
  process.exit(1);
}
const nouveauLi = `<li>
                                                        <a href="${slug}.html">
                                                            ${titreCourt}
                                                        </a>
                                                    </li>
                                                    ` + placeHolder;
index = index.replace(placeHolder, nouveauLi);
ecrire("index.html", index);
console.log(`Guide ajouté à l'accueil : ${titreCourt}`);

// ---- 5. Sitemap -------------------------------------------------------------
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
// Fraîcheur de l'accueil : il vient de changer (nouveau lien).
sitemap = sitemap.replace(
  /(<loc>https:\/\/haria-chatbot\.com\/<\/loc>\s*<lastmod>)([^<]+)(<\/lastmod>)/,
  `$1${aujourdhui}$3`
);
ecrire("sitemap.xml", sitemap);
console.log(`Sitemap : ${url} ajouté, accueil daté du ${aujourdhui}`);

console.log(`TITRE=${titreCourt}`);
