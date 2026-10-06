/*!
 * pc-nav.js: Performance Connect site navigation (single source of truth)
 * Build-free, plain <script>. Attaches to window.PC.Nav.
 *
 * To change the menu on EVERY page, edit the LINKS list below. That's it.
 *
 * What it does on each page:
 *   - Page already has <nav class="site-nav">: rewrites its links in the
 *     order below and highlights the current page (keeps that page's styling).
 *   - Page has no main nav (listing, part-out, event submit, legal pages):
 *     adds a slim nav bar right under the page's header.
 *   - Phones: the nav row scrolls sideways instead of wrapping or clipping.
 *
 * Usage (in <head>, after pc-loader.js):
 *   <script src="/pc-nav.js" defer></script>
 */
(function () {
  'use strict';
  var PC = (window.PC = window.PC || {});
  if (PC.Nav) return;

  // Menu order, left to right. `match` = extra pages that count as "inside" this section.
  var LINKS = [
    { label: 'Home',        href: '/',       match: ['', 'index'] },
    { label: 'Events',      href: '/events',      match: ['events', 'event-submit'] },
    { label: 'Marketplace', href: '/marketplace', match: ['marketplace', 'listing', 'partout', 'manage'] },
    { label: 'Affiliates',  href: '/affiliates',  match: ['affiliates'] },
    { label: 'Blog',        href: '/blog',        match: ['blog'] }
  ];

  // "/events.html" -> "events", "/" -> ""  (also handles Cloudflare's extension-less URLs)
  var page = location.pathname.split('/').pop().replace(/\.html$/, '');

  function isCurrent(link) { return link.match.indexOf(page) !== -1; }

  var css =
    // phones: one sideways-scrolling row, centred when it fits
    '@media (max-width:640px){' +
      '.site-nav,.pcn-bar{flex-wrap:nowrap!important;overflow-x:auto;max-width:100%;' +
      'justify-content:flex-start!important;scrollbar-width:none;-webkit-overflow-scrolling:touch}' +
      '.site-nav::-webkit-scrollbar,.pcn-bar::-webkit-scrollbar{display:none}' +
      '.site-nav>a:first-child,.pcn-bar>a:first-child{margin-left:auto}' +
      '.site-nav>a:last-child,.pcn-bar>a:last-child{margin-right:auto}' +
      '.site-nav>a,.pcn-bar>a{flex:0 0 auto}' +
      '.site-nav>a:last-of-type,.pcn-bar>a:last-of-type{margin-right:auto}' +
    '}' +
    // injected bar for pages without a main nav
    '.pcn-bar{position:relative;z-index:5;display:flex;align-items:center;justify-content:center;gap:8px;' +
      'padding:10px 16px;border-bottom:0.5px solid #23292b;background:rgba(7,8,8,0.72);' +
      '-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}' +
    '.pcn-bar .pcn-link{font-family:Inter,system-ui,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.03em;' +
      'color:#8FA0A6;text-decoration:none;padding:7px 14px;border-radius:999px;border:0.5px solid #23292b;' +
      'background:rgba(255,255,255,0.02);white-space:nowrap;transition:color .15s,border-color .15s,background .15s}' +
    '.pcn-bar .pcn-link:hover{color:#3DC9F0;border-color:rgba(31,169,207,0.45);background:rgba(31,169,207,0.07)}' +
    '.pcn-bar .pcn-link.is-current{color:#3DC9F0;border-color:rgba(31,169,207,0.35);background:rgba(31,169,207,0.06)}';

  function addStyles() {
    if (document.getElementById('pc-nav-css')) return;
    var s = document.createElement('style');
    s.id = 'pc-nav-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function fill(nav, linkClass) {
    var frag = document.createDocumentFragment();
    LINKS.forEach(function (l) {
      var a = document.createElement('a');
      a.href = l.href;
      a.textContent = l.label;
      a.className = linkClass;
      if (isCurrent(l)) {
        a.className += ' is-current active';   // pages use one or the other
        a.setAttribute('aria-current', 'page');
      }
      frag.appendChild(a);
    });
    var acctPill = nav.querySelector('.pc-acct');   // keep the sign-in pill (pc-account.js) at the end
    nav.replaceChildren(frag);
    if (acctPill) nav.appendChild(acctPill);
    centerCurrent(nav);
  }

  // on phones, scroll the highlighted link into view (leaving room for the sign-in pill)
  function centerCurrent(nav) {
    var cur = nav.querySelector('[aria-current]');
    if (!cur || nav.scrollWidth <= nav.clientWidth) return;
    var pill = nav.querySelector('.pc-acct');
    var room = nav.clientWidth - (pill ? pill.offsetWidth : 0);
    nav.scrollLeft = cur.offsetLeft - nav.offsetLeft - (room - cur.offsetWidth) / 2;
  }

  function build() {
    addStyles();
    var navs = document.querySelectorAll('nav.site-nav');
    if (navs.length) {
      navs.forEach(function (n) {
        n.setAttribute('aria-label', 'Main');
        fill(n, 'nav-link');
      });
      return;
    }
    // no main nav on this page: add a bar under the page header
    var anchor = document.querySelector('header.site-header, .page > header, .topbar, body > header');
    var bar = document.createElement('nav');
    bar.className = 'pcn-bar';
    bar.setAttribute('aria-label', 'Main');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);
    fill(bar, 'pcn-link');
  }

  function buildAndDock() {
    build();
    if (PC.account && PC.account.dock) PC.account.dock();
    document.querySelectorAll('nav.site-nav, nav.pcn-bar').forEach(centerCurrent);
  }

  PC.Nav = {
    links: LINKS,
    rebuild: buildAndDock,
    center: function () { document.querySelectorAll('nav.site-nav, nav.pcn-bar').forEach(centerCurrent); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildAndDock);
  else buildAndDock();
})();
