/* =====================================================================
   Haria - le strict minimum par-dessus main.js.
   1. Les ancres du menu : le template utilise ScrollSmoother, qui
      deplace le contenu en transform. Le saut natif ne marche donc pas.
   2. Bascule Mensuel / Annuel des tarifs. Celle de main.js est ecrite en
      dur en dollars et en anglais ; on la neutralise en n'utilisant pas
      ses classes .monthly-label / .yearly-label, et on la refait ici.
   3. Retouches d'affichage du widget de chat charge a distance.
   ===================================================================== */
(function () {
    'use strict';

    /* ---------- Ancres compatibles ScrollSmoother ---------- */
    function initAnchors() {
        document.querySelectorAll('a[href^="#"]').forEach(function (link) {
            link.addEventListener('click', function (e) {
                var href = this.getAttribute('href');
                if (!href || href.length < 2) return;

                var target = document.querySelector(href);
                if (!target) return;

                e.preventDefault();

                // Le menu mobile resterait ouvert par-dessus la page
                document.querySelectorAll('.mobile-menu-overlay, .mobile-menu-main')
                    .forEach(function (el) { el.classList.remove('active'); });

                var smoother = (typeof ScrollSmoother !== 'undefined') ? ScrollSmoother.get() : null;
                if (smoother) {
                    smoother.scrollTo(target, true, 'top 110px');
                } else {
                    var top = target.getBoundingClientRect().top + window.pageYOffset - 110;
                    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
                }
            });
        });
    }

    /* ---------- Bascule Mensuel / Annuel des tarifs ---------- */
    function initPricingToggle() {
        var labels = document.querySelectorAll('.pricing-toggle-wrapper .toggle-label');
        if (!labels.length) return;

        var animating = false;

        function apply(period) {
            if (animating) return;
            animating = true;

            // Le prix affiche : fondu comme dans le template
            var prices = document.querySelectorAll('.pricing-section .price[data-monthly]');
            prices.forEach(function (el) {
                var value = el.getAttribute('data-' + period);
                if (!value) return;
                el.classList.add('fade-out');
                setTimeout(function () {
                    el.innerHTML = value + '<sub>/ mois</sub>';
                    el.classList.remove('fade-out');
                }, 300);
            });

            // La note sous le prix : vide en mensuel, detail de la facturation annuelle sinon
            document.querySelectorAll('.pricing-section .setup-fee[data-yearly-text]').forEach(function (el) {
                el.textContent = period === 'yearly'
                    ? el.getAttribute('data-yearly-text')
                    : (el.getAttribute('data-monthly-text') || '');
            });

            // Le lien de paiement correspondant a la periode
            document.querySelectorAll('.pricing-section [data-' + period + '-href]').forEach(function (el) {
                el.setAttribute('href', el.getAttribute('data-' + period + '-href'));
            });

            setTimeout(function () { animating = false; }, 600);
        }

        function select(label) {
            if (label.classList.contains('active')) return;
            labels.forEach(function (l) { l.classList.remove('active'); });
            label.classList.add('active');
            apply(label.getAttribute('data-period'));
        }

        labels.forEach(function (label) {
            label.addEventListener('click', function () { select(this); });
            label.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    select(this);
                }
            });
        });
    }

    /* ---------- Retouches du widget charge a distance ----------
       Les corrections definitives sont a faire dans widget.js ;
       ici on ne fait que rattraper l'affichage cote site. */
    function initWidgetPolish() {
        var TEASER_DELAY = 9000;
        var teaserHandled = false;

        function polish() {
            var input = document.getElementById('haria-widget-input');
            if (input && input.placeholder && input.placeholder.startsWith('Ecrivez')) {
                input.placeholder = 'Écrivez votre message…';
            }

            var teaser = document.getElementById('haria-widget-teaser');
            if (teaser && !teaserHandled) {
                teaserHandled = true;

                if (sessionStorage.getItem('haria-teaser-vu')) {
                    teaser.remove();
                    return;
                }

                var label = teaser.querySelector('span');
                if (label && label.textContent.includes('Test le chatbot')) {
                    label.textContent = 'Une question ? Testez le chatbot';
                }

                setTimeout(function () {
                    teaser.style.transition = 'opacity 300ms ease';
                    teaser.style.opacity = '0';
                    setTimeout(function () { teaser.remove(); }, 350);
                }, TEASER_DELAY);

                teaser.addEventListener('click', function () {
                    sessionStorage.setItem('haria-teaser-vu', '1');
                });
            }
        }

        polish();

        // Le widget est injecte apres coup : on surveille son arrivee, puis on s'arrete.
        var observer = new MutationObserver(polish);
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(function () { observer.disconnect(); }, 20000);
    }

    /* ---------- Pastilles du carrousel de tarifs (telephone) ----------
       Sur telephone, la rangee des quatre formules defile lateralement
       (scroll-snap, voir haria.css). Les pastilles disent ou on en est et
       permettent de sauter d'une formule a l'autre. Elles sont creees ici
       quelle que soit la largeur ; le CSS ne les affiche qu'en dessous de
       992 px, ou le carrousel existe. */
    function initPricingCarousel() {
        var rangee = document.querySelector('.pricing-section .row');
        if (!rangee || !('IntersectionObserver' in window)) return;

        var cartes = Array.prototype.slice.call(rangee.children);
        if (cartes.length < 2) return;

        var pastilles = document.createElement('div');
        pastilles.className = 'haria-carousel-dots';

        cartes.forEach(function (carte, i) {
            var nom = carte.querySelector('.sub-price');
            var bouton = document.createElement('button');
            bouton.type = 'button';
            bouton.setAttribute('aria-label', 'Voir la formule ' + (nom ? nom.textContent.trim() : i + 1));
            bouton.addEventListener('click', function () {
                // block: 'nearest' : on glisse sur le cote sans faire sauter la page.
                carte.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
            });
            pastilles.appendChild(bouton);
        });

        rangee.parentNode.insertBefore(pastilles, rangee.nextSibling);

        var observateur = new IntersectionObserver(function (entrees) {
            entrees.forEach(function (entree) {
                if (entree.intersectionRatio < 0.6) return;
                var index = cartes.indexOf(entree.target);
                Array.prototype.forEach.call(pastilles.children, function (p, j) {
                    p.classList.toggle('active', j === index);
                });
            });
        }, { root: rangee, threshold: [0.6] });

        cartes.forEach(function (carte) { observateur.observe(carte); });
    }

    /* ---------- FAQ : la question ouverte part au chatbot ----------
       Le widget expose window.Haria.open(texte) (côté plateforme,
       widget.js). L'ordre des écouteurs compte : le gestionnaire du
       template (jQuery, délégué sur .accordion-box, chargé avant) ne
       court qu'À LA FIN de la propagation — vu d'ici, active-block
       décrit donc l'état AVANT le clic : présent = le clic REFERME la
       question, absent = le clic l'OUVRE, et seul ce cas envoie.
       Widget ancien en cache, sans l'API : on ne fait rien, l'accordéon
       garde son comportement normal. */
    function initFaqChat() {
        var boutons = document.querySelectorAll('.faq-items-1 .accordion-box .acc-btn');
        if (!boutons.length) return;

        boutons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var bloc = btn.closest('.accordion');
                if (!bloc || bloc.classList.contains('active-block')) return;
                if (!window.Haria || typeof window.Haria.open !== 'function') return;

                var texte = btn.textContent.replace(/\s+/g, ' ').trim();
                // Le numéro (« 01. ») n'a pas sa place dans le message.
                texte = texte.replace(/^\d+\.\s*/, '');
                if (texte) window.Haria.open(texte);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initAnchors();
        initPricingToggle();
        initPricingCarousel();
        initWidgetPolish();
        initFaqChat();
    });
})();
