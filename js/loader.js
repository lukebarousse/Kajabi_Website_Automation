/* ============================================================
   LUKE'S KAJABI CONTENT LOADER

   Single script, two modes. Each Kajabi page only needs:

     <div class="luke-upsell"   data-upsell="SLUG"></div>
     — OR —
     <div class="luke-checkout" data-checkout="COURSE-KEY"></div>

     <script src=".../js/loader.js" defer></script>

   The script finds every container on the page and dispatches
   based on which attribute is present:

     data-upsell   → inject shared.css + upsell.css,
                     fetch /upsells/pages/SLUG

     data-checkout → inject shared.css + checkout.css,
                     fetch /checkouts/pages/COURSE-KEY

   Hosting: Cloudflare Pages (atomic deploys). Each deploy is
   served with `Cache-Control: public, max-age=0, must-revalidate`,
   so browsers re-validate via ETag on every request — visitors
   see fresh content within seconds of a deploy landing, with
   304s when nothing changed. No purge step, no cache-busting
   query strings.

   Cloudflare Pages strips `.html` by default; URLs here request
   without the extension to avoid the redundant 308 redirect.
   ============================================================ */

(function () {
  'use strict';

  var BASE = 'https://lukebarousse-kajabi.pages.dev';
  var SHARED_CSS_URL = BASE + '/css/shared.css';
  var UPSELL_CSS_URL = BASE + '/css/upsell.css';
  var CHECKOUT_CSS_URL = BASE + '/css/checkout.css';
  var UPSELL_PAGES_URL = BASE + '/upsells/pages/';
  var CHECKOUT_PAGES_URL = BASE + '/checkouts/pages/';

  function injectStylesheet(href, marker) {
    if (document.querySelector('link[data-lb-css="' + marker + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-lb-css', marker);
    (document.head || document.documentElement).appendChild(link);
  }

  function loadContainer(container, kind, pagesBase) {
    var slug = container.getAttribute('data-' + kind);
    if (!slug) {
      console.warn('[luke-' + kind + '] container missing data-' + kind + ' attribute');
      return;
    }
    var url = pagesBase + slug;
    fetch(url)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ' fetching ' + url);
        }
        return response.text();
      })
      .then(function (html) {
        container.innerHTML = html;
        container.setAttribute('data-' + kind + '-loaded', 'true');
      })
      .catch(function (err) {
        console.error('[luke-' + kind + '] failed to load "' + slug + '":', err);
        container.style.display = 'none';
      });
  }

  function init() {
    var upsells = document.querySelectorAll('.luke-upsell[data-upsell]');
    var checkouts = document.querySelectorAll('.luke-checkout[data-checkout]');

    if (upsells.length === 0 && checkouts.length === 0) {
      console.warn('[luke-loader] no .luke-upsell or .luke-checkout containers found on page');
      return;
    }

    if (upsells.length > 0) {
      injectStylesheet(SHARED_CSS_URL, 'shared');
      injectStylesheet(UPSELL_CSS_URL, 'upsell');
      Array.prototype.forEach.call(upsells, function (c) {
        loadContainer(c, 'upsell', UPSELL_PAGES_URL);
      });
    }

    if (checkouts.length > 0) {
      injectStylesheet(SHARED_CSS_URL, 'shared');
      injectStylesheet(CHECKOUT_CSS_URL, 'checkout');
      Array.prototype.forEach.call(checkouts, function (c) {
        loadContainer(c, 'checkout', CHECKOUT_PAGES_URL);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
