/* ============================================================
   LUKE'S UPSELL CONTENT LOADER
   
   Fetches upsell HTML content from GitHub at runtime.
   Each Kajabi page contains <div data-upsell="page-name">.
   This script finds those, fetches the matching HTML from the
   pages/ folder on GitHub, and injects it.
   
   Single source of truth: edit pages/*.html on GitHub, push,
   all Kajabi pages update after jsDelivr cache refreshes
   (usually within 12 hours, or force-purge on jsdelivr.com).
   ============================================================ */

(function () {
  'use strict';

  var BASE_URL = 'https://cdn.jsdelivr.net/gh/lukebarousse/Kajabi_Website_Automation@main/pages/';

  function loadUpsell(container) {
    var pageName = container.getAttribute('data-upsell');
    if (!pageName) {
      console.warn('[luke-upsell] container missing data-upsell attribute');
      return;
    }

    var url = BASE_URL + pageName + '.html';

    fetch(url)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ' fetching ' + url);
        }
        return response.text();
      })
      .then(function (html) {
        container.innerHTML = html;
        // Mark as loaded so CSS can fade it in (optional)
        container.setAttribute('data-upsell-loaded', 'true');
      })
      .catch(function (err) {
        console.error('[luke-upsell] failed to load "' + pageName + '":', err);
        // Silent fail: Kajabi native checkout still works,
        // page just won't show the custom receipt/perks/trust block.
        container.style.display = 'none';
      });
  }

  function init() {
    var containers = document.querySelectorAll('[data-upsell]');
    if (containers.length === 0) {
      console.warn('[luke-upsell] no [data-upsell] containers found on page');
      return;
    }
    Array.prototype.forEach.call(containers, loadUpsell);
  }

  // Run immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
