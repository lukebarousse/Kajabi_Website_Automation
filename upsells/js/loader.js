/* ============================================================
   LUKE'S UPSELL CONTENT LOADER

   Single-source-of-truth for the Kajabi upsell pages. Each Kajabi
   page only needs two lines:

     <div class="luke-upsell" data-upsell="SLUG"></div>
     <script src=".../upsells/js/loader.js" defer></script>

   This script handles the rest:
     1. Injects upsell.css into <head> with a Date.now() cache-buster.
     2. Fetches the matching pages/SLUG.html (also cache-busted) and
        injects it into the container.

   Because the CSS link and HTML fetch both carry ?t=<now> on every
   page load, any edit to upsell.css or pages/*.html in the repo
   propagates to live Kajabi pages within minutes of a push+purge —
   no Kajabi edits, no per-page version bumps.

   Only change that requires visitor action: editing loader.js itself.
   Then a one-time hard-refresh is needed to evict the browser's
   7-day cached copy of this file. Rare (hopefully quarterly-at-most).
   ============================================================ */

(function () {
  'use strict';

  var REPO = 'lukebarousse/Kajabi_Website_Automation';
  var BRANCH = 'main';
  var BASE = 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + BRANCH + '/upsells';
  var PAGES_URL = BASE + '/pages/';
  var CSS_URL = BASE + '/css/upsell.css';

  var BUST = Date.now();

  function injectCss() {
    if (document.querySelector('link[data-luke-upsell-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_URL + '?t=' + BUST;
    link.setAttribute('data-luke-upsell-css', 'true');
    (document.head || document.documentElement).appendChild(link);
  }

  function loadUpsell(container) {
    var pageName = container.getAttribute('data-upsell');
    if (!pageName) {
      console.warn('[luke-upsell] container missing data-upsell attribute');
      return;
    }

    var url = PAGES_URL + pageName + '.html?t=' + BUST;

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
