/* ============================================================
   LUKE'S UPSELL CONTENT LOADER

   Single-source-of-truth for the Kajabi upsell pages. Each Kajabi
   page only needs two lines:

     <div class="luke-upsell" data-upsell="SLUG"></div>
     <script src=".../upsells/js/loader.js" defer></script>

   This script handles the rest:
     1. Injects upsell.css into <head>.
     2. Fetches the matching pages/SLUG.html and injects it into
        the container.

   Cache model (two layers — both matter):

     CDN edge cache  (jsDelivr, ~12h TTL, query strings IGNORED on
                     /gh/ paths) → cleared by scripts/purge.sh after
                     every deploy. Throttled to ~1 purge per 30 min
                     per path, so don't redeploy within that window.

     Browser cache   (per visitor, 7-day max-age from CDN headers)
                     → cleared by the ?t=Date.now() browser-cache
                     buster appended to the CSS link and HTML fetch
                     below. This does NOT bypass the edge; it only
                     prevents the visitor's browser from serving its
                     own 7-day-stale copy of whatever the edge last
                     returned. Without it, a successful edge purge
                     would take up to 7 days to reach each visitor.

   Net propagation after ./scripts/deploy.sh:
     push → edge purge (if not throttled) → next page load fetches
     fresh from edge (browser cache miss guaranteed by ?t=now) →
     typically <15 min end-to-end.

   Only change that requires visitor action: editing loader.js itself.
   loader.js is fetched without a cache-buster (by design — we want
   browsers to cache it), so edits are capped by the 7-day browser
   cache. Keep this file stable; edit rarely.
   ============================================================ */

(function () {
  'use strict';

  var REPO = 'lukebarousse/Kajabi_Website_Automation';
  var BRANCH = 'main';
  var BASE = 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + BRANCH + '/upsells';
  var PAGES_URL = BASE + '/pages/';
  var CSS_URL = BASE + '/css/upsell.css';

  var BROWSER_BUST = Date.now();

  function injectCss() {
    if (document.querySelector('link[data-luke-upsell-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_URL + '?t=' + BROWSER_BUST;
    link.setAttribute('data-luke-upsell-css', 'true');
    (document.head || document.documentElement).appendChild(link);
  }

  function loadUpsell(container) {
    var pageName = container.getAttribute('data-upsell');
    if (!pageName) {
      console.warn('[luke-upsell] container missing data-upsell attribute');
      return;
    }

    var url = PAGES_URL + pageName + '.html?t=' + BROWSER_BUST;

    fetch(url)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ' fetching ' + url);
        }
        return response.text();
      })
      .then(function (html) {
        container.innerHTML = html;
        container.setAttribute('data-upsell-loaded', 'true');
      })
      .catch(function (err) {
        console.error('[luke-upsell] failed to load "' + pageName + '":', err);
        container.style.display = 'none';
      });
  }

  function init() {
    injectCss();
    var containers = document.querySelectorAll('[data-upsell]');
    if (containers.length === 0) {
      console.warn('[luke-upsell] no [data-upsell] containers found on page');
      return;
    }
    Array.prototype.forEach.call(containers, loadUpsell);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
