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

            // Les frais d'installation ne concernent que le mensuel :
            // en annuel on les barre au lieu de les retirer.
            document.querySelectorAll('.pricing-section .setup-fee').forEach(function (el) {
                el.classList.toggle('is-struck', period === 'yearly');
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

    document.addEventListener('DOMContentLoaded', function () {
        initAnchors();
        initPricingToggle();
        initWidgetPolish();
    });
})();
