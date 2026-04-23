/* ============================================================
   LUKE'S KAJABI CONTENT LOADER

   Single script, seven modes. Each host page only needs:

     <div class="luke-upsell"              data-upsell="SLUG"></div>
     — OR —
     <div class="luke-checkout"            data-checkout="COURSE-KEY"></div>
     — OR —
     <div class="luke-bundle"              data-bundle="BUNDLE-KEY"></div>
     — OR —
     <div class="luke-shopify"             data-shopify-page="SLUG"></div>
     — OR —
     <div class="luke-landing-pricing"     data-landing-pricing="COURSE-KEY"></div>
     — OR —
     <div class="luke-courses-bundles"     data-courses-page-bundles="all"></div>
     — OR —
     <div class="luke-courses-individual"  data-courses-page-individual="all"></div>

     <script src=".../js/loader.js" defer></script>

   The script finds every container on the page and dispatches
   based on which attribute is present:

     data-upsell                → shared + upsell.css, /upsells/pages/SLUG

     data-checkout              → shared + checkout.css + carousel,
                                  /checkouts/pages/COURSE-KEY

     data-bundle                → shared + checkout + upsell + bundle + carousel,
                                  /checkouts/bundles/BUNDLE-KEY

     data-shopify-page          → shared + checkout + upsell + shopify.css,
                                  /shopify/pages/SLUG

     data-landing-pricing       → shared + landing.css,
                                  /landing/pricing/COURSE-KEY

     data-courses-page-bundles  → shared + courses-page.css + courses-page.js,
                                  /courses-page/bundles

     data-courses-page-individual → shared + courses-page.css,
                                    /courses-page/individual

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
  var COURSES_PAGE_CSS_URL = BASE + '/css/courses-page.css';
  var COURSES_PAGE_JS_URL = BASE + '/js/courses-page.js';
  var COURSES_PAGE_BUNDLES_URL = BASE + '/courses-page/bundles';
  var COURSES_PAGE_INDIVIDUAL_URL = BASE + '/courses-page/individual';

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
    if (typeof window.__lukeInitCheckoutCarousels__ === 'function') {
      window.__lukeInitCheckoutCarousels__(container);
    }
  }

  function runCoursesPageInit(container) {
    if (typeof window.__lukeInitCoursesPage__ === 'function') {
      window.__lukeInitCoursesPage__(container);
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
        if (opts.runCoursesInit) runCoursesPageInit(container);
      })
      .catch(function (err) {
        console.error('[luke-loader] failed to load ' + dataAttr + ' "' + slug + '":', err);
        container.style.display = 'none';
      });
  }

  function loadCoursesFixedUrl(container, dataAttr, fullUrl, withTooltips) {
    var loadedAttr = dataAttr + '-loaded';
    fetch(fullUrl)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ' fetching ' + fullUrl);
        }
        return response.text();
      })
      .then(function (html) {
        container.innerHTML = html;
        container.setAttribute(loadedAttr, 'true');
        if (withTooltips) runCoursesPageInit(container);
      })
      .catch(function (err) {
        console.error('[luke-loader] failed to load courses section:', err);
        container.style.display = 'none';
      });
  }

  function injectCoursesScript(callback) {
    if (typeof window.__lukeInitCoursesPage__ === 'function') {
      callback();
      return;
    }
    var existing = document.querySelector('script[data-lb-js="courses-page"]');
    if (existing) {
      if (existing.getAttribute('data-lb-ready') === '1') {
        callback();
      } else {
        existing.addEventListener('load', callback);
      }
      return;
    }
    var s = document.createElement('script');
    s.src = COURSES_PAGE_JS_URL;
    s.async = true;
    s.setAttribute('data-lb-js', 'courses-page');
    s.onload = function () {
      s.setAttribute('data-lb-ready', '1');
      callback();
    };
    s.onerror = callback;
    (document.head || document.documentElement).appendChild(s);
  }

  function init() {
    var upsells = document.querySelectorAll('.luke-upsell[data-upsell]');
    var checkouts = document.querySelectorAll('.luke-checkout[data-checkout]');
    var bundles = document.querySelectorAll('.luke-bundle[data-bundle]');
    var shopify = document.querySelectorAll('.luke-shopify[data-shopify-page]');
    var landingPricing = document.querySelectorAll(
      '.luke-landing-pricing[data-landing-pricing]'
    );
    var coursesBundles = document.querySelectorAll(
      '.luke-courses-bundles[data-courses-page-bundles]'
    );
    var coursesIndividual = document.querySelectorAll(
      '.luke-courses-individual[data-courses-page-individual]'
    );

    if (
      upsells.length === 0 &&
      checkouts.length === 0 &&
      bundles.length === 0 &&
      shopify.length === 0 &&
      landingPricing.length === 0 &&
      coursesBundles.length === 0 &&
      coursesIndividual.length === 0
    ) {
      console.warn(
        '[luke-loader] no recognized Luke content containers found on page'
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

    var coursesNeedsCss =
      coursesBundles.length > 0 || coursesIndividual.length > 0;
    if (coursesNeedsCss) {
      injectStylesheet(SHARED_CSS_URL, 'shared');
      injectStylesheet(COURSES_PAGE_CSS_URL, 'courses-page');
    }
    function loadAllCoursesIndividual() {
      Array.prototype.forEach.call(coursesIndividual, function (c) {
        loadCoursesFixedUrl(
          c,
          'data-courses-page-individual',
          COURSES_PAGE_INDIVIDUAL_URL,
          false
        );
      });
    }
    function loadAllCoursesBundles() {
      Array.prototype.forEach.call(coursesBundles, function (c) {
        loadCoursesFixedUrl(
          c,
          'data-courses-page-bundles',
          COURSES_PAGE_BUNDLES_URL,
          true
        );
      });
    }
    if (coursesBundles.length > 0) {
      injectCoursesScript(function () {
        loadAllCoursesBundles();
        if (coursesIndividual.length > 0) loadAllCoursesIndividual();
      });
    } else if (coursesIndividual.length > 0) {
      loadAllCoursesIndividual();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
