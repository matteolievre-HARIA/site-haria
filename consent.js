/* ============================================
   Bannière de consentement aux traceurs (CNIL / RGPD)
   ---------------------------------------------
   - Aucun traceur n'est déposé avant un choix explicite.
   - Refuser est aussi simple qu'accepter (même niveau, même poids visuel).
   - Le choix est conservé 6 mois, puis la question est reposée.
   - Le visiteur peut changer d'avis à tout moment via le lien
     « Gérer mes cookies » ajouté dans le pied de page.
   ============================================ */
(function () {
    var STORAGE_KEY = 'haria-consent-v1';
    var MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000; /* ~6 mois */
    var banner = null;

    /* ---------- Stockage du choix ---------- */
    function readChoice() {
        try {
            var raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var data = JSON.parse(raw);
            if (!data || !data.choice || !data.date) return null;
            if (Date.now() - data.date > MAX_AGE_MS) return null; /* expiré : on redemande */
            return data.choice;
        } catch (e) {
            return null; /* navigation privée, stockage bloqué... */
        }
    }

    function saveChoice(choice) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
                choice: choice,
                date: Date.now()
            }));
        } catch (e) {}
    }

    /* ---------- Actions ---------- */
    function accept() {
        saveChoice('accepted');
        hideBanner();
        if (window.HariaPixel) window.HariaPixel.load();
    }

    function refuse() {
        saveChoice('refused');
        hideBanner();
        /* Rien n'est chargé. Si le pixel tournait déjà (choix changé en cours
           de visite), on recharge pour repartir d'une page totalement propre. */
        if (window.fbq) window.location.reload();
    }

    /* ---------- Bannière ---------- */
    function buildBanner() {
        var el = document.createElement('div');
        el.className = 'consent-banner';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-label', 'Consentement aux traceurs');

        el.innerHTML =
            '<div class="consent-inner">' +
                '<p class="consent-text">' +
                    'Nous utilisons le <strong>pixel Meta</strong> (Facebook, Instagram) pour mesurer ' +
                    'l\'efficacité de nos publicités. Il dépose des cookies sur votre appareil et n\'est ' +
                    'activé qu\'avec votre accord. Aucune mesure d\'audience ni publicité personnalisée ' +
                    'sans votre consentement. ' +
                    '<a href="/politique-confidentialite.html">En savoir plus</a>' +
                '</p>' +
                '<div class="consent-actions">' +
                    '<button type="button" class="consent-btn consent-refuse">Tout refuser</button>' +
                    '<button type="button" class="consent-btn consent-accept">Tout accepter</button>' +
                '</div>' +
            '</div>';

        el.querySelector('.consent-accept').addEventListener('click', accept);
        el.querySelector('.consent-refuse').addEventListener('click', refuse);
        return el;
    }

    function showBanner() {
        if (banner) { banner.classList.add('is-visible'); return; }
        banner = buildBanner();
        document.body.appendChild(banner);
        /* laisse un frame au navigateur pour jouer la transition d'entrée */
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () { banner.classList.add('is-visible'); });
        });
    }

    function hideBanner() {
        if (banner) banner.classList.remove('is-visible');
    }

    /* ---------- Lien « Gérer mes cookies » dans le pied de page ---------- */
    function addFooterLink() {
        /* Liens déjà écrits dans le HTML (ex. merci.html) */
        Array.prototype.forEach.call(
            document.querySelectorAll('.consent-manage-link'),
            function (a) {
                a.addEventListener('click', function (e) { e.preventDefault(); showBanner(); });
            }
        );

        var footers = document.querySelectorAll('.footer-bottom');
        if (!footers.length) return;

        var target = footers[footers.length - 1];
        var p = document.createElement('p');
        var link = document.createElement('a');
        link.href = '#';
        link.className = 'consent-manage-link';
        link.textContent = 'Gérer mes cookies';
        link.addEventListener('click', function (e) {
            e.preventDefault();
            showBanner();
        });
        p.appendChild(link);
        target.appendChild(p);
    }

    /* ---------- Démarrage ---------- */
    function init() {
        addFooterLink();

        /* Si le pixel n'est pas configuré, rien n'est déposable :
           pas de bannière à afficher. */
        if (!window.HariaPixel || !window.HariaPixel.isConfigured()) return;

        var choice = readChoice();
        if (choice === 'accepted') window.HariaPixel.load();
        else if (choice !== 'refused') showBanner();
    }

    /* Exposé pour un lien manuel éventuel : onclick="hariaConsent.open()" */
    window.hariaConsent = { open: showBanner };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
