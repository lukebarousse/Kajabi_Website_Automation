/* ============================================================
   /courses page — bundle tier row tooltips (desktop hover only)
   Tooltip node lives on document.body to avoid Kajabi ancestors
   (transform / filter / containment) breaking position: fixed.
   ============================================================ */

(function () {
  'use strict';

  var VIEW_MARGIN = 8;
  /** Vertical gap between tooltip bottom and row top (px). */
  var GAP_ABOVE_ROW = 10;
  var CARD_PAD = 6;

  var tooltipEl = null;
  var activeRow = null;
  var globalListenersBound = false;
  var mqListenerBound = false;

  function positionFloat(floatEl, rowRect, cardRect) {
    if (cardRect && cardRect.width > 0) {
      floatEl.style.maxWidth =
        Math.min(310, Math.max(160, cardRect.width - 2 * CARD_PAD)) + 'px';
    } else {
      floatEl.style.maxWidth = '';
    }

    var w = floatEl.offsetWidth;
    var h = floatEl.offsetHeight;
    var rowCenterX = rowRect.left + rowRect.width / 2;

    var left = rowCenterX - w / 2;

    if (cardRect && cardRect.width > 0) {
      var minL = cardRect.left + CARD_PAD;
      var maxL = cardRect.right - w - CARD_PAD;
      if (maxL >= minL) {
        left = Math.max(minL, Math.min(left, maxL));
      } else {
        left = minL;
      }
    } else {
      if (left + w > window.innerWidth - VIEW_MARGIN) {
        left = window.innerWidth - w - VIEW_MARGIN;
      }
      if (left < VIEW_MARGIN) {
        left = VIEW_MARGIN;
      }
    }

    var top = rowRect.top - GAP_ABOVE_ROW - h;
    if (top < VIEW_MARGIN) {
      top = VIEW_MARGIN;
    }

    floatEl.style.left = left + 'px';
    floatEl.style.top = top + 'px';

    var arrowLeft = rowCenterX - left;
    var arrowMin = 18;
    var arrowMax = Math.max(arrowMin, w - 18);
    arrowLeft = Math.max(arrowMin, Math.min(arrowMax, arrowLeft));
    floatEl.style.setProperty('--lcp-arrow-left', arrowLeft + 'px');

    floatEl.classList.remove(
      'lcp-tooltip-float--place-left',
      'lcp-tooltip-float--place-right'
    );
    floatEl.classList.add('lcp-tooltip-float--place-above');
  }

  function cardRectForRow(row) {
    var card = row && row.closest && row.closest('.lcp-bundle-tier');
    return card ? card.getBoundingClientRect() : null;
  }

  function ensureTooltipOnBody() {
    if (tooltipEl && document.body.contains(tooltipEl)) {
      return tooltipEl;
    }
    var el = document.createElement('div');
    el.className = 'lcp-tooltip-float';
    el.setAttribute('data-lcp-courses-tooltip', '1');
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    tooltipEl = el;
    return tooltipEl;
  }

  function hideTooltip() {
    if (tooltipEl) {
      tooltipEl.classList.remove('is-visible');
      tooltipEl.innerHTML = '';
      tooltipEl.style.maxWidth = '';
      tooltipEl.style.width = '';
    }
    if (activeRow) {
      activeRow.classList.remove('is-lcp-row-active');
      activeRow = null;
    }
  }

  function reposition() {
    if (
      !tooltipEl ||
      !activeRow ||
      !tooltipEl.classList.contains('is-visible')
    ) {
      return;
    }
    positionFloat(
      tooltipEl,
      activeRow.getBoundingClientRect(),
      cardRectForRow(activeRow)
    );
  }

  function onCoursesMqChange() {
    var mq = window.matchMedia('(hover: hover) and (min-width: 992px)');
    if (!mq.matches) {
      hideTooltip();
      Array.prototype.forEach.call(
        document.querySelectorAll(
          '.luke-courses-bundles[data-lcp-tooltips-init="1"]'
        ),
        function (r) {
          r.classList.remove('lcp-tooltips-enabled');
        }
      );
    } else {
      Array.prototype.forEach.call(
        document.querySelectorAll(
          '.luke-courses-bundles[data-lcp-tooltips-init="1"]'
        ),
        function (r) {
          r.classList.add('lcp-tooltips-enabled');
        }
      );
    }
  }

  function bindGlobalListenersOnce() {
    if (globalListenersBound) return;
    globalListenersBound = true;
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
  }

  function bindMqListenerOnce() {
    if (mqListenerBound) return;
    mqListenerBound = true;
    window
      .matchMedia('(hover: hover) and (min-width: 992px)')
      .addEventListener('change', onCoursesMqChange);
  }

  function initBundlesRoot(root) {
    if (!root || root.getAttribute('data-lcp-tooltips-init') === '1') return;
    var mq = window.matchMedia('(hover: hover) and (min-width: 992px)');
    if (!mq.matches) return;

    var rows = root.querySelectorAll('.lcp-tier-row');
    if (!rows.length) return;

    root.setAttribute('data-lcp-tooltips-init', '1');
    root.classList.add('lcp-tooltips-enabled');

    var floatEl = ensureTooltipOnBody();
    bindGlobalListenersOnce();
    bindMqListenerOnce();

    Array.prototype.forEach.call(rows, function (row) {
      var tipSrc = row.querySelector('.lcp-tip-html');
      if (!tipSrc) return;

      row.addEventListener('mouseenter', function () {
        if (!mq.matches) return;
        if (activeRow && activeRow !== row) {
          activeRow.classList.remove('is-lcp-row-active');
        }
        activeRow = row;
        row.classList.add('is-lcp-row-active');
        floatEl.innerHTML =
          '<div class="lcp-tooltip-float-inner">' +
          tipSrc.innerHTML +
          '</div>';
        floatEl.classList.add('is-visible');
        requestAnimationFrame(function () {
          positionFloat(
            floatEl,
            row.getBoundingClientRect(),
            cardRectForRow(row)
          );
          requestAnimationFrame(function () {
            positionFloat(
              floatEl,
              row.getBoundingClientRect(),
              cardRectForRow(row)
            );
          });
        });
      });

      row.addEventListener('mouseleave', function () {
        hideTooltip();
      });
    });
  }

  window.__lukeInitCoursesPage__ = function (root) {
    if (!root) return;
    if (root.classList && root.classList.contains('luke-courses-bundles')) {
      initBundlesRoot(root);
    }
  };
})();
