/*!
 * pc-abduct.js: "it got abducted" scene for missing listings / part outs.
 * Build-free, plain <script>.
 *
 * The alien (our resident car thief) flies the P like a spaceship and
 * beams up a car, a wheel, a wrench and an oil jug, one after another.
 *
 * Usage: put <div class="pc-abduct"></div> where you want the scene and
 * load this file. It draws into every .pc-abduct on the page.
 * Decorative only (aria-hidden). Holds still for reduced motion.
 */
(function () {
  'use strict';
  if (window.__pcAbduct) return;
  window.__pcAbduct = true;

  var css =
    '.pc-abduct{width:min(300px,78vw);margin:0 auto 6px;pointer-events:none}' +
    '.pc-abduct>svg{display:block;width:100%;height:auto;overflow:visible}' +
    '.pca-ship{animation:pca-hover 3.4s ease-in-out infinite;transform-box:view-box;transform-origin:170px 95px}' +
    '@keyframes pca-hover{0%,100%{transform:translateY(0) rotate(-9deg)}50%{transform:translateY(-6px) rotate(-6.5deg)}}' +
    '.pca-beam{animation:pca-beam 2.2s ease-in-out infinite;transform-box:view-box;transform-origin:172px 128px}' +
    '@keyframes pca-beam{0%,100%{opacity:.75}38%{opacity:.5}41%{opacity:.85}70%{opacity:.62}}' +
    '.pca-item{opacity:0;animation:pca-rise 4.8s cubic-bezier(.45,.05,.55,.95) infinite;transform-box:fill-box;transform-origin:center}' +
    '@keyframes pca-rise{' +
      '0%{opacity:0;transform:translate(0,0) rotate(0) scale(1)}' +
      '10%{opacity:1}' +
      '50%{transform:translate(var(--sway),-60px) rotate(var(--spin)) scale(.78)}' +
      '82%{opacity:1}' +
      '100%{opacity:0;transform:translate(0,-112px) rotate(calc(var(--spin) * 2)) scale(.42)}}' +
    '.pca-ground{animation:pca-ground 2.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}' +
    '@keyframes pca-ground{0%,100%{opacity:.55;transform:scaleX(1)}50%{opacity:.85;transform:scaleX(1.06)}}' +
    '@media (prefers-reduced-motion: reduce){' +
      '.pca-ship,.pca-beam,.pca-ground{animation:none}' +
      '.pca-ship{transform:rotate(-8deg)}' +
      '.pca-item{animation:none;opacity:1}' +
      '.pca-i2,.pca-i3{display:none}' +
      '.pca-i1{transform:translate(-26px,-70px) rotate(-8deg) scale(.8)}' +
      '.pca-i4{transform:translate(22px,-24px) rotate(12deg) scale(.9)}' +
    '}';

  // Everything is drawn in a 340 x 300 box. Items start at the bottom of the beam.
  var svg =
  '<svg viewBox="0 0 340 300" aria-hidden="true" focusable="false">' +
    '<defs>' +
      '<linearGradient id="pcaBeam" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#3DC9F0" stop-opacity=".55"/>' +
        '<stop offset=".55" stop-color="#3DC9F0" stop-opacity=".18"/>' +
        '<stop offset="1" stop-color="#3DC9F0" stop-opacity=".04"/>' +
      '</linearGradient>' +
      '<radialGradient id="pcaGround"><stop offset="0" stop-color="#3DC9F0" stop-opacity=".5"/><stop offset="1" stop-color="#3DC9F0" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="pcaUnder"><stop offset="0" stop-color="#E9FBFF" stop-opacity=".95"/><stop offset=".4" stop-color="#3DC9F0" stop-opacity=".6"/><stop offset="1" stop-color="#3DC9F0" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="pcaGlass" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff" stop-opacity=".35"/><stop offset=".45" stop-color="#ffffff" stop-opacity=".06"/><stop offset="1" stop-color="#3DC9F0" stop-opacity=".12"/></radialGradient>' +
      '<clipPath id="pcaDome"><circle cx="0" cy="0" r="23"/></clipPath>' +
    '</defs>' +

    // ground glow where the beam lands
    '<ellipse class="pca-ground" cx="172" cy="276" rx="104" ry="11" fill="url(#pcaGround)"/>' +

    // tractor beam
    '<path class="pca-beam" d="M150 128 L194 128 L270 276 L74 276 Z" fill="url(#pcaBeam)"/>' +

    // things being beamed up (each drawn around its own spot at the bottom of the beam)
    // car
    '<g class="pca-item pca-i1" style="animation-delay:0s;--sway:-14px;--spin:-14deg">' +
      '<g transform="translate(140 236)">' +
        '<path d="M2 21 L4 15 Q6 12.5 13 11.5 L22 6.5 Q26 4.5 34 4.5 L43 5.5 Q47 6.5 51 10.5 L59 12.5 Q63.5 13.5 63.5 18 L63.5 21.5 Z" fill="#DCE4E6" stroke="#0b1215" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M24 8.6 Q27 7.2 33 7.2 L33 11.4 L19.5 11.4 Z M36 7.2 L42 7.7 Q45 8.6 47.5 11.4 L36 11.4 Z" fill="#163039"/>' +
        '<path d="M5 17.5 H61" stroke="#3DC9F0" stroke-width="1.6"/>' +
        '<circle cx="16" cy="21.5" r="6" fill="#1a2023" stroke="#0b1215" stroke-width="2"/><circle cx="16" cy="21.5" r="2.4" fill="#8FA0A6"/>' +
        '<circle cx="50" cy="21.5" r="6" fill="#1a2023" stroke="#0b1215" stroke-width="2"/><circle cx="50" cy="21.5" r="2.4" fill="#8FA0A6"/>' +
      '</g>' +
    '</g>' +
    // wheel
    '<g class="pca-item pca-i2" style="animation-delay:-1.2s;--sway:16px;--spin:120deg">' +
      '<g transform="translate(172 248)">' +
        '<circle r="15" fill="#1a2023" stroke="#0b1215" stroke-width="2"/>' +
        '<circle r="9.5" fill="#C7D0D2" stroke="#0b1215" stroke-width="1.6"/>' +
        '<g stroke="#3DC9F0" stroke-width="2.2" stroke-linecap="round"><path d="M0 -8V-3"/><path d="M7.6 -2.5L2.9 -0.9"/><path d="M4.7 6.5L1.8 2.4"/><path d="M-4.7 6.5L-1.8 2.4"/><path d="M-7.6 -2.5L-2.9 -0.9"/></g>' +
        '<circle r="2" fill="#0b1215"/>' +
      '</g>' +
    '</g>' +
    // wrench
    '<g class="pca-item pca-i3" style="animation-delay:-2.4s;--sway:-10px;--spin:-200deg">' +
      '<g transform="translate(172 246) rotate(-35)">' +
        '<path d="M-3.2 -14 H3.2 V12 Q3.2 15 0 15 Q-3.2 15 -3.2 12 Z" fill="#C7D0D2" stroke="#0b1215" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<path d="M-8.5 -17 A9 9 0 1 0 8.5 -17 L4 -20.5 L4 -14.5 L-4 -14.5 L-4 -20.5 Z" fill="#C7D0D2" stroke="#0b1215" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<path d="M0 -6 V8" stroke="#3DC9F0" stroke-width="1.4" stroke-linecap="round"/>' +
      '</g>' +
    '</g>' +
    // oil jug
    '<g class="pca-item pca-i4" style="animation-delay:-3.6s;--sway:14px;--spin:30deg">' +
      '<g transform="translate(160 228)">' +
        '<path d="M4 8 Q4 5 7 5 H17 L21 1 H26 V5 Q28 5 28 8 V30 Q28 33 25 33 H7 Q4 33 4 30 Z" fill="#DCE4E6" stroke="#0b1215" stroke-width="2" stroke-linejoin="round"/>' +
        '<rect x="8" y="14" width="16" height="11" rx="2" fill="#1FA9CF"/>' +
        '<path d="M12 19.5 Q16 15.5 20 19.5" stroke="#0b1215" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '</g>' +
    '</g>' +

    // the ship: the alien in a glass dome, sitting in the P
    '<g class="pca-ship">' +
      '<ellipse cx="172" cy="130" rx="34" ry="9" fill="url(#pcaUnder)"/>' +
      '<g transform="translate(166 36)">' +
        '<g clip-path="url(#pcaDome)"><circle r="23" fill="#081014"/><image href="/assets/abduct/alien-head.webp" x="-23" y="-25" width="46" height="46"/></g>' +
        '<circle r="23" fill="url(#pcaGlass)" stroke="#3DC9F0" stroke-width="2.2"/>' +
        '<path d="M-14 -12 Q-8 -19 0 -20" stroke="#ffffff" stroke-opacity=".7" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '</g>' +
      // the P mark from the real logo file (its wordmark sits outside this window, so only the P shows)
      '<svg x="96" y="44" width="150" height="104" viewBox="790 0 2200 1530"><image href="/logo.svg" x="0" y="0" width="3608" height="2064"/></svg>' +
      // little lights along the bottom of the P
      '<g fill="#E9FBFF"><circle cx="150" cy="124" r="1.6"><animate attributeName="opacity" values="1;.2;1" dur="1.1s" repeatCount="indefinite"/></circle>' +
      '<circle cx="167" cy="124" r="1.6"><animate attributeName="opacity" values=".2;1;.2" dur="1.1s" repeatCount="indefinite"/></circle>' +
      '<circle cx="184" cy="124" r="1.6"><animate attributeName="opacity" values="1;.2;1" dur="1.1s" repeatCount="indefinite"/></circle></g>' +
    '</g>' +
  '</svg>';

  function draw() {
    var spots = document.querySelectorAll('.pc-abduct');
    if (!spots.length) return;
    if (!document.getElementById('pc-abduct-css')) {
      var st = document.createElement('style');
      st.id = 'pc-abduct-css';
      st.textContent = css;
      document.head.appendChild(st);
    }
    for (var i = 0; i < spots.length; i++) {
      if (!spots[i].firstChild) spots[i].innerHTML = svg;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', draw);
  else draw();
})();
