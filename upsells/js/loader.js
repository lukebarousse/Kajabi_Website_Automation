/* ============================================================
   LUKE'S UPSELL CONTENT LOADER

   Single-source-of-truth for the Kajabi upsell pages. Each Kajabi
   page only needs two lines:

     <div class="luke-upsell" data-upsell="SLUG"></div>
     <script src=".../upsells/js/loader.js" defer></script>

   This script handles the rest:
     1. Injects upsell.css into <head>.
     2. Fetches the matching pages/SLUG and injects it into the
        container.

   Hosting: Cloudflare Pages (atomic deploys). Every `git push` to
   main triggers an auto-build; the new content replaces the old
   atomically at the edge. Cloudflare serves files with
   `Cache-Control: public, max-age=0, must-revalidate`, so browsers
   re-validate via ETag on every request — visitors see fresh
   content within seconds of a deploy landing, with 304s when
   nothing changed. No purge step, no throttle, no stale-cache
   mental model to carry.

   The only file whose updates lag for visitors is loader.js
   itself: browsers still cache it (CF default), and Kajabi's
   <script src="..."> tag references it directly. In practice,
   ETag revalidation catches changes on next page load anyway.
   Keep this file stable; edit rarely.
   ============================================================ */

(function () {
  'use strict';

  var BASE = 'https://lukebarousse-kajabi.pages.dev/upsells';
  var PAGES_URL = BASE + '/pages/';
  var CSS_URL = BASE + '/css/upsell.css';

  function injectCss() {
    if (document.querySelector('link[data-luke-upsell-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_URL;
    link.setAttribute('data-luke-upsell-css', 'true');
    (document.head || document.documentElement).appendChild(link);
  }

  function loadUpsell(container) {
    var pageName = container.getAttribute('data-upsell');
    if (!pageName) {
      console.warn('[luke-upsell] container missing data-upsell attribute');
      return;
    }

    var url = PAGES_URL + pageName;

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
