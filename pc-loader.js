/*!
 * pc-loader.js — Performance Connect "Car Collector" loading screen
 * Build-free, plain <script>. Attaches to window.PC.Loader.
 *
 * Assets (default base: /assets/loader/):
 *   pc-loader.mp4          primary animation (~230 KB)
 *   pc-loader.webp         animated fallback when video can't autoplay (iOS Low Power Mode, etc.)
 *   pc-loader-poster.webp  static frame (poster + prefers-reduced-motion)
 *
 * Usage
 *   <script src="/pc-loader.js" data-pageload></script>   // in <head>: covers the initial page load
 *
 *   PC.Loader.show();  ...  PC.Loader.hide();              // full-screen, ref-counted
 *   await PC.Loader.wrap(fetchListings());                 // show while a promise runs
 *   const stop = PC.Loader.inline(gridEl);  ...  stop();   // small loader inside a container
 *
 * Options (attributes on the <script> tag):
 *   data-pageload     show immediately, hide on window "load"
 *   data-base="/x/"   asset folder (default "/assets/loader/")
 */
(function () {
  'use strict';
  var PC = (window.PC = window.PC || {});
  if (PC.Loader) return;

  var script = document.currentScript;
  var attr = function (n) { return script && script.hasAttribute(n) ? script.getAttribute(n) : null; };
  var BASE = attr('data-base') || '/assets/loader/';
  if (BASE.slice(-1) !== '/') BASE += '/';
  var SRC = {
    mp4: BASE + 'pc-loader.mp4',
    webp: BASE + 'pc-loader.webp',
    poster: BASE + 'pc-loader-poster.webp'
  };

  var SHOW_DELAY = 180;   // ms before appearing (fast operations never flash)
  var MIN_VISIBLE = 700;  // ms minimum on screen once shown
  var FADE = 280;         // ms fade

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- styles ----------
  var css =
    '.pcl-overlay{position:fixed;inset:0;z-index:2147483000;background:#000;display:flex;' +
    'align-items:center;justify-content:center;opacity:0;visibility:hidden;' +
    'transition:opacity ' + FADE + 'ms ease,visibility 0s linear ' + FADE + 'ms}' +
    '.pcl-overlay.pcl-on{opacity:1;visibility:visible;transition:opacity ' + FADE + 'ms ease}' +
    '.pcl-media{display:block;height:min(88vh,150vw);height:min(88dvh,150vw);width:auto;aspect-ratio:2/3;' +
    'max-width:100vw;object-fit:contain;background:#000;pointer-events:none;user-select:none}' +
    '.pcl-inline{display:flex;align-items:center;justify-content:center;padding:16px 0;width:100%}' +
    '.pcl-inline .pcl-media{height:auto;width:min(180px,40vw)}' +
    '.pcl-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    'html.pcl-lock,html.pcl-lock body{overflow:hidden!important}' +
    // pre-paint cover for page-load mode, until <body> exists and the overlay mounts
    'html.pcl-boot::after{content:"";position:fixed;inset:0;z-index:2147483001;' +
    'background:#000 url("' + SRC.poster + '") center/auto min(88vh,150vw) no-repeat}';
  var style = document.createElement('style');
  style.id = 'pc-loader-css';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  // ---------- media element (video with graceful fallbacks) ----------
  function makeMedia() {
    if (reduceMotion) return img(SRC.poster);
    var v = document.createElement('video');
    v.className = 'pcl-media';
    v.muted = true; v.defaultMuted = true;
    v.loop = true; v.autoplay = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    v.preload = 'auto';
    v.poster = SRC.poster;
    var s = document.createElement('source');
    s.src = SRC.mp4; s.type = 'video/mp4';
    v.appendChild(s);
    var swapped = false;
    function fallback() {
      if (swapped || !v.parentNode) { swapped = true; return; }
      swapped = true;
      v.parentNode.replaceChild(img(SRC.webp), v);
    }
    s.addEventListener('error', fallback);
    v.addEventListener('error', fallback);
    v._pcPlay = function () {
      var p;
      try { p = v.play(); } catch (e) { fallback(); return; }
      if (p && p.catch) p.catch(fallback);
    };
    return v;
  }
  function img(src) {
    var i = document.createElement('img');
    i.className = 'pcl-media';
    i.src = src; i.alt = ''; i.decoding = 'async';
    i.setAttribute('aria-hidden', 'true');
    return i;
  }
  function play(el) { if (el && el._pcPlay) el._pcPlay(); }

  // ---------- full-screen overlay ----------
  var overlay = null, media = null, count = 0, shownAt = 0, showTimer = null, hideTimer = null;

  function build() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'pcl-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    var sr = document.createElement('span');
    sr.className = 'pcl-sr';
    sr.textContent = 'Loading…';
    media = makeMedia();
    overlay.appendChild(media);
    overlay.appendChild(sr);
  }
  function mount(cb) {
    build();
    if (overlay.parentNode) return cb();
    var attach = function () { document.body.appendChild(overlay); cb(); };
    if (document.body) attach();
    else document.addEventListener('DOMContentLoaded', attach, { once: true });
  }
  function reveal() {
    showTimer = null;
    mount(function () {
      if (count === 0) { document.documentElement.classList.remove('pcl-boot'); return; }
      play(overlay.querySelector('video'));
      var booting = document.documentElement.classList.contains('pcl-boot');
      if (booting) overlay.style.transition = 'none'; // page load: appear instantly, no see-through fade
      void overlay.offsetWidth;          // commit start state so the fade runs
      overlay.classList.add('pcl-on');
      if (booting) { void overlay.offsetWidth; overlay.style.transition = ''; }
      document.documentElement.classList.remove('pcl-boot');
      document.documentElement.classList.add('pcl-lock');
      document.documentElement.setAttribute('aria-busy', 'true');
      shownAt = Date.now();
    });
  }
  function conceal() {
    hideTimer = null;
    if (!overlay || count > 0) return;
    overlay.classList.remove('pcl-on');
    document.documentElement.classList.remove('pcl-lock', 'pcl-boot');
    document.documentElement.removeAttribute('aria-busy');
    setTimeout(function () {
      if (count === 0 && overlay) {
        var v = overlay.querySelector('video');
        if (v) try { v.pause(); } catch (e) {}
      }
    }, FADE + 20);
  }

  function show(opts) {
    opts = opts || {};
    count++;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (overlay && overlay.classList.contains('pcl-on')) return;
    if (showTimer) return;
    if (opts.immediate) reveal();
    else showTimer = setTimeout(reveal, SHOW_DELAY);
  }
  function hide(opts) {
    opts = opts || {};
    if (opts.force) count = 0; else count = Math.max(0, count - 1);
    if (count > 0) return;
    if (showTimer) { clearTimeout(showTimer); showTimer = null; return; } // never appeared
    if (!overlay || !overlay.classList.contains('pcl-on')) {
      // closed before the overlay finished mounting: drop the page-load cover too
      document.documentElement.classList.remove('pcl-boot');
      return;
    }
    var wait = Math.max(0, MIN_VISIBLE - (Date.now() - shownAt));
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(conceal, wait);
  }
  function wrap(promiseOrFn, opts) {
    show(opts);
    var p;
    try { p = Promise.resolve(typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn); }
    catch (e) { p = Promise.reject(e); }
    return p.then(
      function (v) { hide(); return v; },
      function (e) { hide(); throw e; }
    );
  }

  // ---------- inline (inside a container) ----------
  function inline(container, opts) {
    opts = opts || {};
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return function () {};
    var box = document.createElement('div');
    box.className = 'pcl-inline';
    box.setAttribute('role', 'status');
    var m = makeMedia();
    if (opts.width) m.style.width = typeof opts.width === 'number' ? opts.width + 'px' : opts.width;
    var sr = document.createElement('span');
    sr.className = 'pcl-sr';
    sr.textContent = 'Loading…';
    box.appendChild(m); box.appendChild(sr);
    if (opts.replace) container.replaceChildren(box); else container.appendChild(box);
    play(m);
    return function remove() {
      var v = box.querySelector('video');
      if (v) try { v.pause(); v.removeAttribute('src'); } catch (e) {}
      if (box.parentNode) box.parentNode.removeChild(box);
    };
  }

  PC.Loader = { show: show, hide: hide, wrap: wrap, inline: inline, src: SRC };

  // ---------- page-load mode ----------
  if (script && script.hasAttribute('data-pageload')) {
    document.documentElement.classList.add('pcl-boot');
    show({ immediate: true });
    var done = function () { hide(); };
    if (document.readyState === 'complete') done();
    else window.addEventListener('load', done, { once: true });
    setTimeout(function () { if (count > 0) hide({ force: true }); }, 15000); // safety net
    // back/forward cache: never restore a stuck overlay
    window.addEventListener('pageshow', function (e) { if (e.persisted) hide({ force: true }); });
  }
})();
