/* ============================================================
   LUKE'S KAJABI CONTENT LOADER

   Single script, five modes. Each host page only needs:

     <div class="luke-upsell"          data-upsell="SLUG"></div>
     — OR —
     <div class="luke-checkout"        data-checkout="COURSE-KEY"></div>
     — OR —
     <div class="luke-bundle"          data-bundle="BUNDLE-KEY"></div>
     — OR —
     <div class="luke-shopify"         data-shopify-page="SLUG"></div>
     — OR —
     <div class="luke-landing-pricing" data-landing-pricing="COURSE-KEY"></div>

     <script src=".../js/loader.js" defer></script>

   The script finds every container on the page and dispatches
   based on which attribute is present:

     data-upsell           → inject shared.css + upsell.css,
                             fetch /upsells/pages/SLUG

     data-checkout         → inject shared.css + checkout.css,
                             fetch /checkouts/pages/COURSE-KEY

     data-bundle           → inject shared.css + checkout.css + upsell.css + bundle.css,
                             fetch /checkouts/bundles/BUNDLE-KEY

     data-shopify-page     → inject shared.css + checkout.css + upsell.css + shopify.css,
                             fetch /shopify/pages/SLUG

     data-landing-pricing  → inject shared.css + landing.css,
                             fetch /landing/pricing/COURSE-KEY

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
  var BUNDLE_CSS_URL = BASE + '/css/bundle.css';
  var CHECKOUT_CAROUSEL_JS_URL = BASE + '/js/checkout-carousel.js';
  var UPSELL_PAGES_URL = BASE + '/upsells/pages/';
  var CHECKOUT_PAGES_URL = BASE + '/checkouts/pages/';
  var BUNDLE_PAGES_URL = BASE + '/checkouts/bundles/';
  var SHOPIFY_PAGES_URL = BASE + '/shopify/pages/';
  var SHOPIFY_CSS_URL = BASE + '/css/shopify.css';
  var LANDING_CSS_URL = BASE + '/css/landing.css';
  var LANDING_PRICING_PAGES_URL = BASE + '/landing/pricing/';

  function injectStylesheet(href, marker) {
    if (document.querySelector('link[data-lb-css="' + marker + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-lb-css', marker);
    (document.head || document.documentElement).appendChild(link);
  }

  function injectScript(src, marker) {
    if (document.querySelector('script[data-lb-js="' + marker + '"]')) return;
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.setAttribute('data-lb-js', marker);
    (document.head || document.documentElement).appendChild(s);
  }

  function runCheckoutEnhancers(container) {
    // The carousel script auto-initializes on DOMContentLoaded, but we
    // also fire it explicitly because HTML may land AFTER that event.
    // It's idempotent — carousels already initialized are skipped.
    if (typeof window.__lukeInitCheckoutCarousels__ === 'function') {
      window.__lukeInitCheckoutCarousels__(container);
    }
  }

  /**
   * @param {string} dataAttr - e.g. 'data-checkout', 'data-shopify-page'
   * @param {{ runCarousel?: boolean }} opts
   */
  function loadContainer(container, dataAttr, pagesBase, opts) {
    opts = opts || {};
    var slug = container.getAttribute(dataAttr);
    if (!slug) {
      console.warn('[luke-loader] container missing ' + dataAttr + ' attribute');
      return;
    }
    var loadedAttr = dataAttr + '-loaded';
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
        container.setAttribute(loadedAttr, 'true');
        if (opts.runCarousel) runCheckoutEnhancers(container);
      })
      .catch(function (err) {
        console.error('[luke-loader] failed to load ' + dataAttr + ' "' + slug + '":', err);
        container.style.display = 'none';
      });
  }

  function init() {
    var upsells = document.querySelectorAll('.luke-upsell[data-upsell]');
    var checkouts = document.querySelectorAll('.luke-checkout[data-checkout]');
    var bundles = document.querySelectorAll('.luke-bundle[data-bundle]');
    var shopify = document.querySelectorAll('.luke-shopify[data-shopify-page]');
    var landingPricing = document.querySelectorAll(
      '.luke-landing-pricing[data-landing-pricing]'
    );

    if (
      upsells.length === 0 &&
      checkouts.length === 0 &&
      bundles.length === 0 &&
      shopify.length === 0 &&
      landingPricing.length === 0
    ) {
      console.warn(
        '[luke-loader] no .luke-upsell, .luke-checkout, .luke-bundle, .luke-shopify, or .luke-landing-pricing containers found on page'
      );
      return;
    }

    if (upsells.length > 0) {
      injectStylesheet(SHARED_CSS_URL, 'shared');
      injectStylesheet(UPSELL_CSS_URL, 'upsell');
      Array.prototype.forEach.call(upsells, function (c) {
        loadContainer(c, 'data-upsell', UPSELL_PAGES_URL);
      });
    }

    if (checkouts.length > 0) {
      injectStylesheet(SHARED_CSS_URL, 'shared');
      injectStylesheet(CHECKOUT_CSS_URL, 'checkout');
      injectScript(CHECKOUT_CAROUSEL_JS_URL, 'checkout-carousel');
      Array.prototype.forEach.call(checkouts, function (c) {
        loadContainer(c, 'data-checkout', CHECKOUT_PAGES_URL, { runCarousel: true });
      });
    }

    if (bundles.length > 0) {
      injectStylesheet(SHARED_CSS_URL, 'shared');
      injectStylesheet(CHECKOUT_CSS_URL, 'checkout');
      injectStylesheet(UPSELL_CSS_URL, 'upsell');
      injectStylesheet(BUNDLE_CSS_URL, 'bundle');
      injectScript(CHECKOUT_CAROUSEL_JS_URL, 'checkout-carousel');
      Array.prototype.forEach.call(bundles, function (c) {
        loadContainer(c, 'data-bundle', BUNDLE_PAGES_URL, { runCarousel: true });
      });
    }

    if (shopify.length > 0) {
      injectStylesheet(SHARED_CSS_URL, 'shared');
      injectStylesheet(CHECKOUT_CSS_URL, 'checkout');
      injectStylesheet(UPSELL_CSS_URL, 'upsell');
      injectStylesheet(SHOPIFY_CSS_URL, 'shopify');
      Array.prototype.forEach.call(shopify, function (c) {
        loadContainer(c, 'data-shopify-page', SHOPIFY_PAGES_URL);
      });
    }

    if (landingPricing.length > 0) {
      injectStylesheet(SHARED_CSS_URL, 'shared');
      injectStylesheet(LANDING_CSS_URL, 'landing');
      Array.prototype.forEach.call(landingPricing, function (c) {
        loadContainer(c, 'data-landing-pricing', LANDING_PRICING_PAGES_URL);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
