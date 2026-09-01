/* ============================================
   Pixel Meta (Facebook / Instagram)
   ---------------------------------------------
   Ce fichier NE CHARGE RIEN tout seul.
   Le pixel n'est initialisé que si le visiteur a
   donné son consentement (voir consent.js).
   ============================================ */
window.HariaPixel = (function () {

    /* ID du pixel Meta (Gestionnaire d'événements > Sources de données).
       Tant que l'ID n'est pas renseigné, aucun script Meta n'est chargé. */
    var PIXEL_ID = '1703498950762071';

    var loaded = false;
    var readyQueue = [];

    function isConfigured() {
        return !!PIXEL_ID && PIXEL_ID !== 'TON_PIXEL_ID';
    }

    /* Appelé uniquement après consentement explicite */
    function load() {
        if (loaded || !isConfigured()) return;
        loaded = true;

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

        readyQueue.forEach(function (cb) { try { cb(); } catch (e) {} });
        readyQueue = [];
    }

    /* Exécute cb dès que le pixel est actif (tout de suite s'il l'est déjà,
       plus tard si le visiteur accepte pendant sa visite, jamais s'il refuse) */
    function onReady(cb) {
        if (loaded) { try { cb(); } catch (e) {} }
        else readyQueue.push(cb);
    }

    return { load: load, onReady: onReady, isConfigured: isConfigured };
})();
