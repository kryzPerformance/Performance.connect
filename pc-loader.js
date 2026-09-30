/*!
 * pc-loader.js — Performance Connect "Car Collector" loading screen
 * Build-free, plain <script>. Attaches to window.PC.Loader.
 *
 * Rotation: each page load picks ONE loading screen from VARIANTS below, at random,
 * using the weights (higher = more often). Only the chosen one downloads.
 * To add a screen: drop <id>.mp4, <id>.webp, <id>-poster.webp in /assets/loader/
 * and add a line to VARIANTS. To change the odds, edit the weights.
 *
 * Assets per screen (default base: /assets/loader/):
 *   <id>.mp4          primary animation (~250-420 KB)
 *   <id>.webp         animated fallback when video can't autoplay (iOS Low Power Mode, etc.)
 *   <id>-poster.webp  still frame (poster + prefers-reduced-motion)
 *
 * Testing: add ?loader=<id> to any page URL to force a screen (e.g. ?loader=p1).
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

  // ---------- loading screens (weights: higher = more often) ----------
  // 10 regulars x 10 = 100, plus 2 rares x 2  ->  each rare ~1 in 52 loads (either rare ~1 in 26)
  var VARIANTS = [
    { id: '930',   name: 'Porsche 930',              weight: 10 },
    { id: 'r8',    name: 'Audi R8',                  weight: 10 },
    { id: 'z06',   name: 'Corvette Z06',             weight: 10 },
    { id: 'rx7',   name: 'Mazda RX-7',               weight: 10 },
    { id: 'supra', name: 'Toyota Supra',             weight: 10 },
    { id: 'viper', name: 'Dodge Viper ACR',          weight: 10 },
    { id: 'gto',   name: 'Pontiac GTO Judge',        weight: 10 },
    { id: 'm3',    name: 'BMW M3',                   weight: 10 },
    { id: 'evo',   name: 'Mitsubishi Evo',           weight: 10 },
    { id: 'gtr',   name: 'Nissan GT-R',              weight: 10 },
    { id: 'gt3rs', name: 'Porsche 911 GT3 RS', rare: true, weight: 2 },
    { id: 'p1',    name: 'McLaren P1',         rare: true, weight: 2 }
  ];

  function pickVariant() {
    var forced = null;
    try { forced = new URLSearchParams(location.search).get('loader'); } catch (e) {}
    for (var f = 0; f < VARIANTS.length; f++) if (VARIANTS[f].id === forced) return VARIANTS[f];
    var last = null;
    try { last = sessionStorage.getItem('pcl-last'); } catch (e) {}
    function roll() {
      var total = 0, i;
      for (i = 0; i < VARIANTS.length; i++) total += VARIANTS[i].weight;
      var r = Math.random() * total;
      for (i = 0; i < VARIANTS.length; i++) { r -= VARIANTS[i].weight; if (r < 0) return VARIANTS[i]; }
      return VARIANTS[0];
    }
    var v = roll();
    if (last && v.id === last) v = roll();               // avoid the same screen twice in a row
    try { sessionStorage.setItem('pcl-last', v.id); } catch (e) {}
    return v;
  }
  var CHOSEN = pickVariant();
  var SRC = {
    mp4: BASE + CHOSEN.id + '.mp4',
    webp: BASE + CHOSEN.id + '.webp',
    poster: BASE + CHOSEN.id + '-poster.webp'
  };

  var SHOW_DELAY = 180;   // ms before appearing (fast operations never flash)
  var MIN_VISIBLE = 700;  // ms minimum on screen once shown
  var FADE = 280;         // ms fade

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- styles ----------
  var css =
    '.pcl-overlay{position:fixed;inset:0;z-index:2147483100;background:#000;display:flex;' +
    'align-items:center;justify-content:center;opacity:0;visibility:hidden;' +
    'transition:opacity ' + FADE + 'ms ease,visibility 0s linear ' + FADE + 'ms}' +
    '.pcl-overlay.pcl-on{opacity:1;visibility:visible;transition:opacity ' + FADE + 'ms ease}' +
    '.pcl-media{display:block;height:min(88vh,150vw);height:min(88dvh,150vw);width:auto;aspect-ratio:2/3;' +
    'max-width:100vw;object-fit:contain;background:#000;pointer-events:none;user-select:none}' +
    '.pcl-inline{display:flex;align-items:center;justify-content:center;padding:16px 0;width:100%}' +
    '.pcl-inline .pcl-media{height:auto;width:min(180px,40vw)}' +
    '.pcl-rare{position:absolute;left:50%;top:max(14px,calc(50% - min(44vh,75vw) - 2px));transform:translateX(-50%);' +
    'z-index:2;padding:6px 14px;border-radius:999px;border:1px solid rgba(255,214,102,0.55);' +
    'background:rgba(20,16,4,0.72);font:700 12px/1 Rajdhani,Inter,system-ui,sans-serif;letter-spacing:0.22em;' +
    'text-transform:uppercase;white-space:nowrap;color:#FFD666;text-shadow:0 0 12px rgba(255,200,80,0.6);' +
    'animation:pcl-rare-glow 1.6s ease-in-out infinite}' +
    '@keyframes pcl-rare-glow{0%,100%{box-shadow:0 0 0 rgba(255,214,102,0)}50%{box-shadow:0 0 18px rgba(255,214,102,0.45)}}' +
    '@media (prefers-reduced-motion:reduce){.pcl-rare{animation:none}}' +
    '.pcl-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    'html.pcl-lock,html.pcl-lock body{overflow:hidden!important}' +
    // pre-paint cover for page-load mode, until <body> exists and the overlay mounts
    'html.pcl-boot::after{content:"";position:fixed;inset:0;z-index:2147483101;' +
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
    sr.textContent = CHOSEN.rare ? 'Loading… rare find: ' + CHOSEN.name : 'Loading…';
    media = makeMedia();
    overlay.appendChild(media);
    if (CHOSEN.rare) {
      var badge = document.createElement('div');
      badge.className = 'pcl-rare';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = '\u2726 Rare find \u00b7 ' + CHOSEN.name + ' \u2726';
      overlay.appendChild(badge);
    }
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

  PC.Loader = { show: show, hide: hide, wrap: wrap, inline: inline, src: SRC, variant: CHOSEN, variants: VARIANTS };

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
