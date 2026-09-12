/* ===================================================================
   Globe Haria — décor de la carte « Réponse en 2 secondes ».
   Repris à l'identique du portail (portal-shell.js 1608-2213) :
   sphère océan en dégradé, continents en pointillé projetés, étoiles,
   fusée en orbite qui passe derrière la Terre, survol exact par pays.
   Zéro dépendance. Adaptations landing :
   - nom d'usine Globe + événement site:theme (au lieu de portal:theme) ;
   - démarrage paresseux (IntersectionObserver) et destroy() en sortie ;
   - tactile : rotation seule, le glisser est désactivé pour laisser
     passer le scroll de la page (touch-action: pan-y en CSS).
   =================================================================== */
(function () {
  "use strict";

  function reducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  function fmtNum(n) {
    return (n || 0).toLocaleString("fr-FR");
  }

  var worldPromise = null;
  function loadWorld() {
    if (!worldPromise) {
      worldPromise = fetch("/world-map.json").then(function (r) {
        if (!r.ok) throw new Error("carte indisponible");
        return r.json();
      });
    }
    return worldPromise;
  }

  var regionNames = null;
  function countryName(code) {
    try {
      if (!regionNames) regionNames = new Intl.DisplayNames(["fr"], { type: "region" });
      return regionNames.of(code) || code;
    } catch (e) {
      return code;
    }
  }

  // ── Globe interactif ─────────────────────────────────────────────
  //
  // Une sphère en pointillé, qu'on fait tourner à la souris, avec un point par
  // lieu d'où viennent des visiteurs. Dessinée sur un <canvas> à la main :
  // aucune bibliothèque 3D n'est chargée, la page reste à zéro dépendance
  // externe comme le reste du portail.
  //
  // D'OÙ VIENNENT LES TERRES
  // De `world-map.json`, déjà embarqué pour la carte plate. Ses tracés sont en
  // projection ÉQUIRECTANGULAIRE — vérifié en régressant ses centroïdes sur
  // des latitudes connues : x = (lon+180)·1000/360 à 3 px près, et
  // y = 230.59 − 2.7933·lat à 2,8 px près. On peut donc convertir dans les
  // deux sens, et surtout : on peint les pays une fois sur un canevas hors
  // écran, puis on demande à chaque point de la grille « suis-je sur une
  // terre ? ». Pas de géométrie à tester, juste un pixel à lire.
  var MAP_X_SCALE = 1000 / 360;
  var MAP_Y_SCALE = 2.7933;
  var MAP_Y_ORIGIN = 230.59;

  function lonToMapX(lon) { return (lon + 180) * MAP_X_SCALE; }
  function latToMapY(lat) { return MAP_Y_ORIGIN - lat * MAP_Y_SCALE; }
  function mapXToLon(x) { return x / MAP_X_SCALE - 180; }
  function mapYToLat(y) { return (MAP_Y_ORIGIN - y) / MAP_Y_SCALE; }

  // Grille de points de terre, calculée une fois pour toutes les vues.
  //
  // Chaque pays est peint dans SA PROPRE teinte de rouge (r = index + 1, le
  // bleu 0 valant « mer ») : un point de la grille sait ainsi à quel pays il
  // appartient, et le même masque sert au survol — on lit le pays sous le
  // curseur au lieu de chercher le marqueur le plus proche.
  var landPromise = null;
  function loadLand() {
    if (landPromise) return landPromise;
    landPromise = loadWorld().then(function (world) {
      var codes = Object.keys(world.paths);
      var cv = document.createElement("canvas");
      cv.width = world.width;
      cv.height = world.height;
      var ctx = cv.getContext("2d", { willReadFrequently: true });
      codes.forEach(function (code, i) {
        // 255 pays maximum sur un seul canal ; il y en a 172.
        ctx.fillStyle = "rgb(" + (i + 1) + ",0,0)";
        ctx.fill(new Path2D(world.paths[code]));
      });
      var mask = ctx.getImageData(0, 0, cv.width, cv.height).data;

      // Index du pays sous un point de la carte, ou -1 pour la mer.
      function indexAtMap(px, py) {
        if (px < 0 || py < 0 || px >= cv.width || py >= cv.height) return -1;
        var o = (py * cv.width + px) * 4;
        if (mask[o + 3] < 110) return -1;
        var i = mask[o] - 1;
        return i >= 0 && i < codes.length ? i : -1;
      }

      // Espacement constant EN SURFACE : le nombre de points d'un parallèle
      // décroît en cosinus de la latitude. Sans ça, les pôles seraient une
      // bouillie de points et l'équateur un désert.
      var STEP = 1.7;
      var dots = [];
      for (var lat = -56; lat <= 83; lat += STEP) {
        var count = Math.max(1, Math.round((360 / STEP) * Math.cos(lat * Math.PI / 180)));
        for (var i = 0; i < count; i++) {
          var lon = -180 + (360 * i) / count;
          var ci = indexAtMap(Math.round(lonToMapX(lon)), Math.round(latToMapY(lat)));
          if (ci < 0) continue;
          var phi = lat * Math.PI / 180;
          var lam = lon * Math.PI / 180;
          var cosPhi = Math.cos(phi);
          dots.push({
            x: cosPhi * Math.sin(lam),
            y: Math.sin(phi),
            z: cosPhi * Math.cos(lam),
            ci: ci,
          });
        }
      }

      return {
        dots: dots,
        codes: codes,
        centroids: world.centroids,
        // Code pays sous une latitude/longitude, ou null.
        codeAt: function (lat, lon) {
          var ci = indexAtMap(Math.round(lonToMapX(lon)), Math.round(latToMapY(lat)));
          return ci < 0 ? null : codes[ci];
        },
      };
    });
    return landPromise;
  }

  // Coordonnées d'un pays, déduites du centroïde de la carte plate : pas de
  // table de latitudes à maintenir en plus de `world-map.json`.
  function countryLatLon(centroids, code) {
    var c = centroids && centroids[code];
    return c ? { lat: mapYToLat(c[1]), lon: mapXToLon(c[0]) } : null;
  }

  /**
   * Globe interactif.
   *
   * `countries` : [{ code, value, label, sub, valueText }] — un pays actif se
   * distingue en COLORANT SES PROPRES POINTS, pas en posant un marqueur
   * par-dessus : la forme du pays reste lisible, et le survol porte sur toute
   * sa surface plutôt que sur une pastille.
   */
  function Globe(hostId, countries, opts) {
    var host = document.getElementById(hostId);
    if (!host) return;
    opts = opts || {};

    var byCode = {};
    var maxValue = 1;
    (countries || []).forEach(function (c) {
      if (!c || !c.code) return;
      byCode[c.code] = c;
      maxValue = Math.max(maxValue, c.value || 0);
    });

    host.innerHTML =
      '<canvas class="gl-canvas"></canvas>' +
      '<div class="gl-tip" hidden><span class="gl-tip-title"></span>' +
      '<span class="gl-tip-sub"></span><span class="gl-tip-val"></span></div>' +
      '<div class="gl-hint">Faites glisser pour tourner</div>';

    var canvas = host.querySelector(".gl-canvas");
    var ctx = canvas.getContext("2d");
    var tip = host.querySelector(".gl-tip");
    var css = getComputedStyle(host);
    function token(name, fallback) {
      return css.getPropertyValue(name).trim() || fallback;
    }
    var COLORS = {
      // Un violet clair, pas blanc : la flamme doit rester dans la même
      // famille de couleur que la fumée, juste plus lumineuse — c'est ce qui
      // lit comme « chaud » sans sortir du thème violet demandé. Le seul ton
      // qui ne dépend pas du thème.
      flame: "#c4b5fd",
    };
    // Les jetons sont RELUS à chaque bascule de thème : `css` est un objet
    // vivant, mais le canevas, lui, garde la couleur qu'on lui a donnée au
    // dernier dessin. Sans cette relecture le globe restait clair sur une
    // page passée en sombre jusqu'au premier mouvement de souris.
    function readTokens() {
      COLORS.land = token("--gl-land", "#c7ccd6");
      COLORS.sea = token("--gl-sea", "#eceef2");
      COLORS.seaLight = token("--gl-sea-light", "#f7f8fa");
      COLORS.active = token("--gl-active", "#6c5ce7");
    }
    readTokens();

    var yaw = -0.15;
    var pitch = 0.32;
    var spin = reducedMotion() ? 0 : 0.0016;
    var dragging = false;
    var hovered = null;       // code du pays survolé
    var W = 0, H = 0, R = 0, cx = 0, cy = 0;
    var alive = true;

    function resize() {
      var rect = host.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.44;
      cx = W / 2;
      cy = H / 2;
      makeStars();
    }

    // ── Étoiles ──────────────────────────────────────────────────
    // Un petit détail, pas un décor : une soixantaine de points, seulement
    // là où le globe ne les recouvre pas (on écarte tout point trop proche
    // du centre au moment de les semer — inutile de peindre ce que la
    // sphère cachera de toute façon). Régénérées au redimensionnement,
    // puisque leurs positions dépendent de W/H/R.
    var stars = [];
    function makeStars() {
      var count = Math.max(28, Math.min(70, Math.round((W * H) / 9000)));
      var rand = mulberry32(0xA5F3);          // semées une fois pour de bon
      stars = [];
      var guard = 0;
      while (stars.length < count && guard++ < count * 12) {
        var x = rand() * W;
        var y = rand() * H;
        var d = Math.hypot(x - cx, y - cy);
        if (d < R * 1.06) continue;           // sous la sphère : inutile
        stars.push({ x: x, y: y, r: 0.45 + rand() * 0.7 });
      }
    }
    // Générateur déterministe : les étoiles ne sautent pas d'une image à
    // l'autre à chaque appel de resize() pour la même taille de fenêtre.
    function mulberry32(seed) {
      var s = seed >>> 0;
      return function () {
        s = (s + 0x6D2B79F5) >>> 0;
        var t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    // Rotation puis projection orthographique. null si le point est passé
    // derrière : rien à dessiner.
    function project(x, y, z) {
      var cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      var x1 = x * cosY - z * sinY;
      var z1 = x * sinY + z * cosY;
      var cosP = Math.cos(pitch), sinP = Math.sin(pitch);
      var y2 = y * cosP - z1 * sinP;
      var z2 = y * sinP + z1 * cosP;
      if (z2 <= 0.02) return null;
      return { sx: cx + x1 * R, sy: cy - y2 * R, depth: z2 };
    }

    // Chemin inverse : d'un point de l'écran vers une latitude/longitude.
    // C'est lui qui rend le survol exact — on lit le pays sous le curseur au
    // lieu de chercher le marqueur le plus proche.
    function unproject(mx, my) {
      var nx = (mx - cx) / R;
      var ny = -(my - cy) / R;
      var d2 = nx * nx + ny * ny;
      if (d2 > 1) return null;                 // en dehors du disque
      var nz = Math.sqrt(1 - d2);
      var cosP = Math.cos(pitch), sinP = Math.sin(pitch);
      var y = ny * cosP + nz * sinP;
      var z1 = -ny * sinP + nz * cosP;
      var cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      var x = nx * cosY + z1 * sinY;
      var z = -nx * sinY + z1 * cosY;
      return {
        lat: (Math.asin(Math.max(-1, Math.min(1, y))) * 180) / Math.PI,
        lon: (Math.atan2(x, z) * 180) / Math.PI,
      };
    }

    var land = null;
    var codes = null;
    var codeAt = null;
    var centroids = null;

    loadLand().then(function (data) {
      if (!alive) return;
      land = data.dots;
      codes = data.codes;
      codeAt = data.codeAt;
      centroids = data.centroids;
      host.classList.add("ready");
      draw();
    }).catch(function () {
      host.innerHTML = '<div class="gl-empty">Globe indisponible pour le moment</div>';
    });

    function draw() {
      if (!alive || !land) return;
      ctx.clearRect(0, 0, W, H);
      drawStars();

      // Position de la fusée calculée UNE fois : elle sert à décider si on la
      // peint maintenant (derrière la sphère, donc recouverte par l'océan
      // qu'on dessine juste après) ou plus loin, par-dessus tout le reste.
      // C'est ce qui fait « passer la fusée derrière la Terre » au lieu de la
      // laisser transparaître à travers.
      var rocket = rocketState();
      if (rocket.behind) drawRocket(rocket);

      // L'océan : un disque dégradé, plus clair vers la lumière. Sans lui, les
      // points flottent dans le vide.
      var g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      g.addColorStop(0, COLORS.seaLight);
      g.addColorStop(0.6, COLORS.sea);
      g.addColorStop(1, COLORS.sea);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      // Les points sont regroupés par tranche d'opacité, et séparés en deux
      // familles : les pays sans donnée (gris) et les pays actifs (accent).
      // Quelques chemins au lieu de milliers de changements d'état, ce qui
      // garde la rotation fluide.
      var BUCKETS = 5;
      var plain = [];
      var active = [];
      for (var b = 0; b < BUCKETS; b++) { plain.push(new Path2D()); active.push(new Path2D()); }
      var hoverPath = new Path2D();
      var r0 = Math.max(0.9, R * 0.0125);

      for (var i = 0; i < land.length; i++) {
        var d = land[i];
        var p = project(d.x, d.y, d.z);
        if (!p) continue;
        var code = codes[d.ci];
        var data = byCode[code];
        var bi = Math.min(BUCKETS - 1, Math.floor(p.depth * BUCKETS));
        // Le pays survolé grossit légèrement : c'est le retour visuel qui dit
        // « c'est bien celui-là », sans changer sa couleur.
        var scale = 0.72 + p.depth * 0.28;
        var target = data ? active[bi] : plain[bi];
        if (hovered && code === hovered) { target = hoverPath; scale *= 1.45; }
        target.moveTo(p.sx + r0 * scale, p.sy);
        target.arc(p.sx, p.sy, r0 * scale, 0, Math.PI * 2);
      }

      ctx.fillStyle = COLORS.land;
      for (var b2 = 0; b2 < BUCKETS; b2++) {
        ctx.globalAlpha = 0.3 + (b2 / (BUCKETS - 1)) * 0.6;
        ctx.fill(plain[b2]);
      }
      ctx.fillStyle = COLORS.active;
      for (var b3 = 0; b3 < BUCKETS; b3++) {
        ctx.globalAlpha = 0.42 + (b3 / (BUCKETS - 1)) * 0.58;
        ctx.fill(active[b3]);
      }
      ctx.globalAlpha = 1;
      ctx.fill(hoverPath);
      ctx.globalAlpha = 1;
      if (!rocket.behind) drawRocket(rocket);
    }

    // Semées une bonne fois, réparties en 3 groupes qui scintillent chacun à
    // leur propre rythme (phase décalée) : un seul changement d'opacité par
    // groupe et par image plutôt qu'un par étoile, et un clignotement qui
    // n'a pas l'air synchronisé pour autant.
    var STAR_GROUPS = 3;
    function drawStars() {
      if (!stars.length) return;
      var now = reducedMotion() ? null : Date.now() / 1000;
      var groups = [];
      for (var g = 0; g < STAR_GROUPS; g++) groups.push(new Path2D());
      for (var i2 = 0; i2 < stars.length; i2++) {
        var st = stars[i2];
        var p = groups[i2 % STAR_GROUPS];
        p.moveTo(st.x + st.r, st.y);
        p.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      }
      ctx.fillStyle = COLORS.active;
      for (var g2 = 0; g2 < STAR_GROUPS; g2++) {
        // Une sinusoïde par groupe, déphasée : jamais deux groupes au même
        // point de leur cycle, donc jamais toutes les étoiles à la fois.
        // Volontairement basses : plus petites et plus pâles que les points
        // des pays, pour qu'on ne puisse pas les confondre avec eux.
        var alpha = now == null
          ? 0.22
          : 0.12 + 0.22 * (0.5 + 0.5 * Math.sin(now * 0.55 + g2 * ((2 * Math.PI) / STAR_GROUPS)));
        ctx.globalAlpha = alpha;
        ctx.fill(groups[g2]);
      }
      ctx.globalAlpha = 1;
    }

    // ── Fusée en orbite ─────────────────────────────────────────────
    // Anneau elliptique autour du globe (une orbite vue de biais, comme les
    // points de la sphère elle-même sont vus en perspective).
    var ROCKET_SPEED = 0.5; // radians par seconde

    // Position, cap et profondeur de la fusée à l'instant présent — calculé
    // une fois par image, lu par `draw()` (pour savoir QUAND la peindre) et
    // par `drawRocket()` (pour savoir COMMENT).
    function rocketState() {
      var t = reducedMotion() ? 0 : (Date.now() / 1000) * ROCKET_SPEED;
      var orbitX = R * 1.2;
      var orbitY = R * 0.32;
      var dx = -orbitX * Math.sin(t);
      var dy = orbitY * Math.cos(t);
      return {
        x: cx + orbitX * Math.cos(t),
        y: cy + orbitY * Math.sin(t),
        heading: Math.atan2(dy, dx) + Math.PI / 2,
        // Vecteur de recul (sens opposé au déplacement) : la fumée part de
        // là, pas de la trajectoire future.
        backX: -dx, backY: -dy,
        // > 0 : moitié « haute » de l'ellipse — c'est la moitié qui passe
        // derrière la sphère (voir le commentaire dans `draw()`).
        behind: Math.sin(t) < 0,
      };
    }

    // Fusée + une traînée de fumée très courte (trois puffs qui s'effacent
    // vite) : de quoi comprendre que c'est une fusée, pas un panache qui
    // traîne sur la moitié de l'orbite.
    function drawRocket(state) {
      var norm = Math.hypot(state.backX, state.backY) || 1;
      var ux = state.backX / norm, uy = state.backY / norm;

      ctx.save();
      ctx.translate(state.x, state.y);

      // Fumée : posée AVANT la fusée (donc sous elle), le long de l'axe de
      // recul, dans le référentiel de l'écran — pas besoin de suivre la
      // rotation du vaisseau, une traînée reste comme un nuage. Un flamme
      // claire au ras du réacteur, puis des volutes violettes franches qui
      // gonflent avant de s'effacer : à cette opacité on la voit vraiment,
      // pas seulement deviner qu'elle est là.
      ctx.beginPath();
      ctx.arc(ux * 2.6, uy * 2.6, 1.9, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.flame;
      ctx.globalAlpha = 0.85;
      ctx.fill();

      var puffs = [
        { d: 5.5, r: 2.6, a: 0.62 },
        { d: 9.5, r: 3.2, a: 0.46 },
        { d: 14, r: 3.5, a: 0.3 },
        { d: 18.5, r: 3.2, a: 0.15 },
      ];
      ctx.fillStyle = COLORS.active;
      for (var i = 0; i < puffs.length; i++) {
        var pf = puffs[i];
        ctx.globalAlpha = pf.a;
        ctx.beginPath();
        ctx.arc(ux * pf.d, uy * pf.d, pf.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Le vaisseau : un rien plus grand qu'à l'origine, et sans halo — le
      // panache derrière lui suffit à le détacher du fond.
      var scale = 0.78 + (state.behind ? 0 : 0.42);
      ctx.globalAlpha = state.behind ? 0.65 : 1;
      ctx.rotate(state.heading);
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(3.6, -2.2, 2.9, 4.6);
      ctx.lineTo(5.3, 8.3);
      ctx.lineTo(2.4, 6.1);
      ctx.lineTo(0, 8.8);
      ctx.lineTo(-2.4, 6.1);
      ctx.lineTo(-5.3, 8.3);
      ctx.lineTo(-2.9, 4.6);
      ctx.quadraticCurveTo(-3.6, -2.2, 0, -8);
      ctx.closePath();
      ctx.fillStyle = COLORS.active;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -1.2, 1.45, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // ── Boucle d'animation ────────────────────────────────────────
    // Elle ne tourne QUE s'il y a quelque chose à faire. Un globe immobile ne
    // consomme rien.
    var raf = null;
    function tick() {
      raf = null;
      if (!alive) return;
      if (spin && !dragging) {
        yaw += spin;
        draw();
        schedule();
      }
    }
    function schedule() {
      if (!raf && alive) raf = requestAnimationFrame(tick);
    }

    // ── Rotation à la souris et au doigt ──────────────────────────
    // Le globe suit le geste : glisser vers la droite fait partir la face
    // visible vers la droite. D'où les signes — la rotation `yaw` déplace les
    // points vers la GAUCHE quand elle croît (cf. `project`).
    var lastX = 0, lastY = 0;
    canvas.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return; // tactile : rotation seule, le scroll passe
      dragging = true;
      spin = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sans capture */ }
      host.classList.add("dragging");
    });
    canvas.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      if (dragging) {
        yaw -= (e.clientX - lastX) * 0.006;
        // Bornée : au-delà, on regarderait la sphère par le pôle et le
        // pointillé se replierait sur lui-même.
        pitch = Math.max(-1.15, Math.min(1.15, pitch + (e.clientY - lastY) * 0.006));
        lastX = e.clientX;
        lastY = e.clientY;
        draw();
        return;
      }
      hoverAt(e);
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      host.classList.remove("dragging");
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* déjà relâché */ }
    }
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    // ── Survol ────────────────────────────────────────────────────
    // Exact : on remonte du pixel à la latitude/longitude, puis au pays. Toute
    // la surface du pays répond, pas seulement ses points.
    function hoverAt(e) {
      if (!codeAt) return;
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var ll = unproject(mx, my);
      var code = ll ? codeAt(ll.lat, ll.lon) : null;
      // Seuls les pays qui ont des visiteurs se survolent : les autres n'ont
      // rien à raconter.
      if (code && !byCode[code]) code = null;

      if (code === hovered) {
        if (code) placeTip(code, mx, my);
        return;
      }
      hovered = code;
      if (!code) {
        tip.hidden = true;
        host.classList.remove("pointing");
        draw();
        return;
      }
      var info = byCode[code];
      tip.querySelector(".gl-tip-title").textContent = info.label || countryName(code);
      tip.querySelector(".gl-tip-sub").textContent = info.sub || "";
      // Pas de chiffre inventé : sans valeur, la ligne reste vide et le CSS
      // la masque — l'infobulle se réduit alors au nom du pays.
      tip.querySelector(".gl-tip-val").textContent =
        info.valueText || (info.value ? fmtNum(info.value) : "");
      tip.hidden = false;
      host.classList.add("pointing");
      placeTip(code, mx, my);
      draw();
      if (opts.onHover) opts.onHover(info);
    }

    // Ancrée au centre du pays quand il est visible : elle ne tremble pas
    // pendant qu'on promène la souris sur un même pays. Repli sur le curseur
    // pour un pays dont le centre est passé derrière le globe.
    function placeTip(code, mx, my) {
      var at = null;
      var ll = countryLatLon(centroids, code);
      if (ll) {
        var v = toVector(ll.lat, ll.lon);
        at = project(v[0], v[1], v[2]);
      }
      var sx = at ? at.sx : mx;
      var sy = at ? at.sy : my;
      tip.style.left = sx + "px";
      tip.style.top = sy + "px";
      tip.classList.toggle("below", sy < 90);
      tip.classList.toggle("flip", sx > W - 150);
    }

    function toVector(lat, lon) {
      var phi = lat * Math.PI / 180;
      var lam = lon * Math.PI / 180;
      var cosPhi = Math.cos(phi);
      return [cosPhi * Math.sin(lam), Math.sin(phi), cosPhi * Math.cos(lam)];
    }

    // Sortie du globe : plus d'infobulle, et la rotation reprend.
    host.addEventListener("pointerleave", function () {
      hovered = null;
      tip.hidden = true;
      host.classList.remove("pointing");
      if (!reducedMotion()) spin = 0.0016;
      draw();
      schedule();
    });

    var resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { resize(); draw(); }, 120);
    }
    window.addEventListener("resize", onResize);

    // Bascule clair/sombre : on repeint DANS la foulée (pas au prochain
    // rendu), pour que le globe change de couleur en même temps que la page.
    function onThemeChange() {
      if (!alive) return;
      readTokens();
      draw();
    }
    document.addEventListener("site:theme", onThemeChange);

    resize();
    schedule();

    return {
      // Le globe vit dans une vue qu'on peut quitter : l'appelant coupe la
      // boucle pour ne pas animer un canevas invisible.
      destroy: function () {
        alive = false;
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("site:theme", onThemeChange);
      },
      focus: function (lat, lon) {
        spin = 0;
        yaw = -lon * Math.PI / 180;
        pitch = Math.max(-1.15, Math.min(1.15, lat * Math.PI / 180));
        draw();
      },
    };
  }

  // ── Démarrage paresseux (adaptation landing) ─────────────────────
  // Décor : une vingtaine de pays sur les 172 de la carte pigmentés à
  // l'accent, répartis sur tous les continents pour que le violet reste
  // visible quelle que soit la face montrée par la rotation, sans noyer le
  // globe. Aucun chiffre n'est avancé :
  // ces pays n'ont pas de `value`, l'infobulle se limite à leur nom. Pour
  // afficher un chiffre un jour, ajouter `valueText` — et seulement s'il est
  // vrai.
  var GLOBE_HIGHLIGHTS = [
    // Europe
    "FR", "GB", "DE", "ES", "IT", "PT", "BE", "CH",
    // Amériques
    "US", "CA", "MX", "BR", "AR",
    // Afrique
    "MA", "SN", "ZA",
    // Asie et Moyen-Orient
    "AE", "IN", "JP",
    // Océanie
    "AU",
  ];
  var GLOBE_COUNTRIES = GLOBE_HIGHLIGHTS.map(function (code) {
    return { code: code };
  });
  var globeInstance = null;

  function globeStart() {
    if (!globeInstance) globeInstance = Globe("globeStage", GLOBE_COUNTRIES);
  }

  function globeStop() {
    if (globeInstance) {
      globeInstance.destroy();
      globeInstance = null;
    }
  }

  var globeStage = document.getElementById("globeStage");
  if (globeStage) {
    if ("IntersectionObserver" in window) {
      var globeIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) globeStart();
          else globeStop();
        });
      }, { rootMargin: "240px" });
      globeIO.observe(globeStage);
    } else {
      globeStart();
    }
  }
})();
