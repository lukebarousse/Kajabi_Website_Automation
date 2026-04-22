/* ============================================================
   LUKE'S CHECKOUT TESTIMONIAL CAROUSEL

   Auto-cycles the student testimonials inside the
   `.lc-testimonial-carousel` block on each checkout page.

   Controls (any of the below move the carousel):
     • auto-advance every CYCLE_MS
     • prev/next arrow buttons   ([data-lc-prev] / [data-lc-next])
     • dots                       ([data-lc-dot])
     • horizontal swipe/drag     (Pointer Events on [data-lc-swipe])
     • keyboard left/right arrows when focus is inside the carousel

   Pauses:
     • pointer hover OR focus-within
     • tab hidden (document.visibilitychange)
     • off-screen (IntersectionObserver)
     • prefers-reduced-motion (auto-advance only — manual still works)

   Markup contract (emitted by generate.py):

     <div class="lc-testimonial-carousel" data-lc-carousel>
       <div class="lc-sr-only" data-lc-live aria-live="polite"></div>
       <div class="lc-testimonial-slides" data-lc-swipe>
         <article class="lc-testimonial lc-testimonial-slide is-active"
                  data-lc-slide data-lc-slide-name="Name">...</article>
         ...
       </div>
       <div class="lc-testimonial-nav">
         <button class="lc-arrow" data-lc-prev>...</button>
         <div class="lc-testimonial-dots">
           <button class="lc-dot is-active" data-lc-dot data-lc-index="0">
           ...
         </div>
         <button class="lc-arrow" data-lc-next>...</button>
       </div>
     </div>
   ============================================================ */

(function () {
  'use strict';

  var CYCLE_MS = 7000;
  var SWIPE_THRESHOLD = 40;   // px horizontal before we commit to a slide
  var SWIPE_AXIS_LOCK = 10;   // px horizontal before we start capturing
  var INIT_FLAG = 'data-lc-initialized';

  var reducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  function initCarousel(root) {
    var slides = root.querySelectorAll('[data-lc-slide]');
    var dots = root.querySelectorAll('[data-lc-dot]');
    var live = root.querySelector('[data-lc-live]');
    var prevBtn = root.querySelector('[data-lc-prev]');
    var nextBtn = root.querySelector('[data-lc-next]');
    var swipeTarget = root.querySelector('[data-lc-swipe]');

    if (slides.length === 0) return;
    if (slides.length === 1) {
      slides[0].classList.add('is-active');
      slides[0].setAttribute('aria-hidden', 'false');
      return;
    }

    var index = 0;
    var timer = null;
    var isHovered = false;
    var isVisible = true;
    var tabVisible = !document.hidden;

    function activate(i) {
      for (var k = 0; k < slides.length; k++) {
        var active = (k === i);
        slides[k].classList.toggle('is-active', active);
        slides[k].setAttribute('aria-hidden', active ? 'false' : 'true');
      }
      for (var d = 0; d < dots.length; d++) {
        var sel = (d === i);
        dots[d].classList.toggle('is-active', sel);
        dots[d].setAttribute('aria-selected', sel ? 'true' : 'false');
      }
      if (live) {
        var name = slides[i].getAttribute('data-lc-slide-name') || '';
        live.textContent =
          'Review ' + (i + 1) + ' of ' + slides.length +
          (name ? ': ' + name : '');
      }
      index = i;
    }

    function advance(dir) {
      var delta = dir || 1;
      activate((index + delta + slides.length) % slides.length);
    }

    function canPlay() {
      return !reducedMotion && !isHovered && isVisible && tabVisible;
    }

    function start() {
      if (timer || !canPlay()) return;
      timer = setInterval(function () { advance(1); }, CYCLE_MS);
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function restartCycle() {
      stop();
      start();
    }

    for (var di = 0; di < dots.length; di++) {
      (function (k) {
        dots[k].addEventListener('click', function () {
          activate(k);
          restartCycle();
        });
      })(di);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        advance(-1);
        restartCycle();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        advance(1);
        restartCycle();
      });
    }

    // Keyboard: left/right arrows when focus is anywhere inside the
    // carousel jump between slides. Doesn't hijack the page when focus
    // is outside the carousel, so it won't conflict with normal reading.
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        advance(-1);
        restartCycle();
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        advance(1);
        restartCycle();
        e.preventDefault();
      }
    });

    // ------- Swipe / drag via Pointer Events -------
    // Works for touch, pen, AND mouse — a single code path. We only
    // commit to a direction after SWIPE_AXIS_LOCK px of horizontal
    // movement so a diagonal scroll doesn't accidentally flip the slide.
    if (swipeTarget && 'PointerEvent' in window) {
      var pointerId = null;
      var startX = 0;
      var startY = 0;
      var locked = false;    // true once we've decided this gesture is horizontal
      var rejected = false;  // true if we've decided it's vertical (leave it alone)

      swipeTarget.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        pointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        locked = false;
        rejected = false;
      });

      swipeTarget.addEventListener('pointermove', function (e) {
        if (e.pointerId !== pointerId || rejected) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        if (!locked) {
          if (Math.abs(dx) < SWIPE_AXIS_LOCK && Math.abs(dy) < SWIPE_AXIS_LOCK) return;
          if (Math.abs(dy) > Math.abs(dx)) {
            // Vertical intent — let the page scroll, bail out of this gesture.
            rejected = true;
            return;
          }
          locked = true;
          swipeTarget.classList.add('is-dragging');
          try { swipeTarget.setPointerCapture(pointerId); } catch (_) { /* no-op */ }
        }
      });

      function endSwipe(e) {
        if (e.pointerId !== pointerId) return;
        var dx = e.clientX - startX;
        var wasLocked = locked;
        pointerId = null;
        locked = false;
        rejected = false;
        swipeTarget.classList.remove('is-dragging');
        if (!wasLocked) return;
        if (dx <= -SWIPE_THRESHOLD) {
          advance(1);
          restartCycle();
        } else if (dx >= SWIPE_THRESHOLD) {
          advance(-1);
          restartCycle();
        }
      }
      swipeTarget.addEventListener('pointerup', endSwipe);
      swipeTarget.addEventListener('pointercancel', endSwipe);
    }

    // ------- Pause triggers -------
    root.addEventListener('mouseenter', function () { isHovered = true; stop(); });
    root.addEventListener('mouseleave', function () { isHovered = false; start(); });
    root.addEventListener('focusin', function () { isHovered = true; stop(); });
    root.addEventListener('focusout', function () { isHovered = false; start(); });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) {
          isVisible = entries[e].isIntersecting;
        }
        if (isVisible) start(); else stop();
      }, { threshold: 0.2 });
      io.observe(root);
    }

    document.addEventListener('visibilitychange', function () {
      tabVisible = !document.hidden;
      if (tabVisible) start(); else stop();
    });

    activate(0);
    start();
  }

  function initAll(root) {
    var scope = root || document;
    var carousels = scope.querySelectorAll('[data-lc-carousel]');
    for (var i = 0; i < carousels.length; i++) {
      var c = carousels[i];
      if (c.hasAttribute(INIT_FLAG)) continue;
      c.setAttribute(INIT_FLAG, 'true');
      initCarousel(c);
    }
  }

  // Expose for loader.js and local-test.html to call after injecting
  // checkout HTML. Idempotent via INIT_FLAG — re-runs are safe.
  window.__lukeInitCheckoutCarousels__ = initAll;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }
})();
