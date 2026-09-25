// Utilitaires partagés entre generer-article.mjs et publier-article.mjs :
// - inventaire automatique des pages publiées à la racine ;
// - annotations manuelles optionnelles (_articles/inventaire.json) ;
// - normalisation de requêtes et détection de recouvrement entre sujets
//   (pour éviter que deux pages répondent à la même intention).

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Pages utilitaires : jamais des cibles de maillage ni de comparaison de sujet.
const PAGES_HORS_CONTENU = new Set([
  "404.html",
  "merci.html",
  "mentions-legales.html",
  "politique-confidentialite.html",
  "guides.html",
]);

// Inventaire automatique : scan des .html de la racine (les dossiers
// TEMPLATE/, Archive/, backup/ etc. ne sont pas touchés).
export function listerPages(racine) {
  const pages = [];
  for (const fichier of readdirSync(racine).filter((f) => f.endsWith(".html")).sort()) {
    if (PAGES_HORS_CONTENU.has(fichier)) continue;
    const html = readFileSync(join(racine, fichier), "utf8");
    const titre = (html.match(/<title>(.*?)<\/title>/s)?.[1] || "")
      .replace(/\s*\|\s*Haria\s*$/i, "")
      .trim();
    const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] || "";
    pages.push({
      fichier,
      url: fichier === "index.html" ? "/" : fichier,
      titre,
      description,
    });
  }
  return pages;
}

// Annotations manuelles : requête principale et rôle de chaque page, tels
// que l'équipe les définit. Optionnel — le titre et la description publiés
// suffisent au calcul sinon.
export function lireAnnotations(racine) {
  const chemin = join(racine, "_articles", "inventaire.json");
  if (!existsSync(chemin)) return {};
  try {
    return JSON.parse(readFileSync(chemin, "utf8"));
  } catch (e) {
    console.warn(`ATTENTION : _articles/inventaire.json illisible (${e.message}) — ignoré.`);
    return {};
  }
}

// Normalisation : minuscules, sans accents, ponctuation = espace.
export function normaliser(t) {
  return (t || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Mots significatifs (les mots-vides français sont écartés).
const MOTS_VIDES = new Set(
  `a au aux avec ce ces dans de des du elle en et eux il je la le les leur lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous c d j l a m n s t y ete etee etees etes etant suis es est sommes etes sont serai sera seront serait serais sommes suis etes etais etaient seraient groite the of and to for your you`.split(
    /\s+/
  )
);

export function mots(t) {
  return new Set(normaliser(t).split(" ").filter((m) => m && !MOTS_VIDES.has(m)));
}

// Recouvrement = part des mots de la requête déjà couverts par la page.
// Une requête entièrement couverte par le titre/description d'une page
// existante signale une cannibalisation probable.
export function recouvrement(requete, textePage) {
  const R = mots(requete);
  const P = mots(textePage);
  if (!R.size || !P.size) return 0;
  let communs = 0;
  for (const m of R) if (P.has(m)) communs++;
  return communs / R.size;
}

// Compare une requête à tout l'inventaire. Retourne les pages dont le
// titre + description (+ annotation) couvrent au moins 50 % des mots de la
// requête, triées par score décroissant.
export function rechercherConflits(requete, pages, annotations = {}) {
  const resultats = [];
  for (const p of pages) {
    const ann = annotations[p.fichier] || {};
    const texte = [p.titre, p.description, ann.requete || ""].filter(Boolean).join(" ");
    const score = recouvrement(requete, texte);
    if (score >= 0.5) {
      resultats.push({ fichier: p.fichier, titre: p.titre, score: Math.round(score * 100) / 100 });
    }
  }
  return resultats.sort((a, b) => b.score - a.score);
}

// Page guides.html : liste de tous les guides publiés, reliée depuis le bas
// de page de l'accueil. Elle donne à chaque article au moins un lien entrant
// (sans elle, les nouveaux articles ne sont connus de Google que par le
// sitemap). Régénérée à chaque publication par publier-article.mjs.
export function genererPageGuides(racine) {
  const guides = listerPages(racine).filter(
    (p) => p.fichier !== "index.html" && p.fichier !== "guides.html"
  );
  const items = guides
    .map(
      (p) => `                <li>
                    <a href="${p.fichier}">${p.titre}</a><br>
                    ${p.description}
                </li>`
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Guides chatbot IA pour site web | Haria</title>
    <meta name="description" content="Tous les guides Haria sur le chatbot IA pour site web : prix, installation, RGPD, SEO, comparatifs et cas d’usage par métier.">
    <link rel="canonical" href="https://haria-chatbot.com/guides.html">
    <meta name="theme-color" content="#6366f1">
    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
    <link rel="apple-touch-icon" href="apple-touch-icon.png">
    <link rel="preload" href="fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap">
    <link rel="stylesheet" href="styles.css">
    <!-- Meta Pixel Code -->
    <script src="meta-pixel.js" defer></script>
    <!-- End Meta Pixel Code -->
</head>
<body>
    <!-- Meta Pixel (fallback sans JavaScript) -->
    <noscript><img height="1" width="1" style="display:none" alt=""
    src="https://www.facebook.com/tr?id=1703498950762071&amp;ev=PageView&amp;noscript=1" /></noscript>
    <!-- Page générée par scripts/lib-site.mjs (genererPageGuides) : ne pas modifier à la main -->
    <!-- Navigation -->
    <nav class="navbar">
        <div class="nav-container">
            <a href="/" class="logo">
                <img src="logo.png" alt="Haria" class="logo-icon" width="50" height="50">
                <span class="logo-text">Haria</span>
            </a>
            <div class="nav-actions">
                <a href="/" class="btn btn-primary">&#8592; Retour au site</a>
            </div>
        </div>
    </nav>

    <main class="legal-main">
        <div class="container">
            <h1>Guides</h1>
            <p>Nos guides sur le chatbot IA pour site web.</p>
            <ul>
${items}
            </ul>
        </div>
    </main>

    <!-- Footer -->
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
</body>
</html>
`;
}
