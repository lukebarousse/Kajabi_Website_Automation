/* ============================================================
   /courses page — bundle tier row tooltips (desktop hover only)
   ============================================================ */

(function () {
  'use strict';

  var VIEW_MARGIN = 8;
  /** Vertical gap between tooltip bottom and row top (px). */
  var GAP_ABOVE_ROW = 10;
  var CARD_PAD = 6;

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

  function initBundlesRoot(root) {
    if (!root || root.getAttribute('data-lcp-tooltips-init') === '1') return;
    var mq = window.matchMedia('(hover: hover) and (min-width: 992px)');
    if (!mq.matches) return;

    var rows = root.querySelectorAll('.lcp-tier-row');
    if (!rows.length) return;

    root.setAttribute('data-lcp-tooltips-init', '1');
    root.classList.add('lcp-tooltips-enabled');

    var floatEl = document.createElement('div');
    floatEl.className = 'lcp-tooltip-float';
    floatEl.setAttribute('aria-hidden', 'true');
    root.appendChild(floatEl);

    var activeRow = null;

    function hideTooltip() {
      floatEl.classList.remove('is-visible');
      floatEl.style.maxWidth = '';
      floatEl.style.width = '';
      if (activeRow) {
        activeRow.classList.remove('is-lcp-row-active');
        activeRow = null;
      }
    }

    function reposition() {
      if (!activeRow || !floatEl.classList.contains('is-visible')) return;
      positionFloat(
        floatEl,
        activeRow.getBoundingClientRect(),
        cardRectForRow(activeRow)
      );
    }

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

    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    mq.addEventListener('change', function () {
      if (!mq.matches) {
        hideTooltip();
        root.classList.remove('lcp-tooltips-enabled');
      } else {
        root.classList.add('lcp-tooltips-enabled');
      }
    });
  }

  window.__lukeInitCoursesPage__ = function (root) {
    if (!root) return;
    if (root.classList && root.classList.contains('luke-courses-bundles')) {
      initBundlesRoot(root);
    }
  };
})();
