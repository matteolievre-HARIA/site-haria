/* ============================================
   Pixel Meta (Facebook / Instagram)
   ---------------------------------------------
   Chargé sur toutes les pages, sans condition.
   Le code de base (init + PageView) part dès que
   ce fichier est exécuté.
   ============================================ */
window.HariaPixel = (function () {

    /* ID du pixel Meta (Gestionnaire d'événements > Sources de données). */
    var PIXEL_ID = '1703498950762071';

    /* Snippet officiel Meta */
    !function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');

    /* Conservé pour les pages qui déclenchent un événement de conversion
       (voir merci.html). Le pixel étant toujours actif, cb s'exécute
       immédiatement. */
    function onReady(cb) {
        try { cb(); } catch (e) {}
    }

    return { onReady: onReady };
})();
