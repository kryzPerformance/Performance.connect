/*!
 * pc-track.js: tiny anonymous click counter for Performance Connect
 * Build-free, plain <script>. Attaches to window.PC.Track.
 *
 * WHY: to find out whether people actually click "Shop" before spending
 * money on a store. Each event is one row in the Supabase table
 * `site_events` (event name, page, short detail, random per-visit id).
 * No names, emails, IPs or Performance Keys are ever sent.
 *
 * Only logs on the live domain, so testing elsewhere doesn't pollute
 * the numbers. RLS lets anyone INSERT but only admin can READ.
 *
 * Usage:
 *   - Loaded automatically by pc-nav.js on every page with the nav.
 *   - Any link/button with data-track="shop_link_click" is counted on click.
 *   - From code: PC.Track.event('shop_view', 'optional detail');
 *
 * Allowed event names are fixed in the database (check constraint):
 *   shop_nav_click, shop_link_click, shop_view, shop_signup, shop_interest_pick
 */
(function () {
  'use strict';
  var PC = (window.PC = window.PC || {});
  if (PC.Track) return;

  var URL_ = 'https://myapluhgfpnyjsfrflhd.supabase.co';
  // Public anon key (same one every page already uses). RLS protects data.
  var KEY_ = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YXBsdWhnZnBueWpzZnJmbGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODcxNDYsImV4cCI6MjA5NzY2MzE0Nn0.j_Xe_J1uvBA-w4Sag1tl3Yp7zqlaEmkQzt2eO6xz1vg';

  var host = location.hostname;
  var live = host === 'performanceconnect.ca' || host === 'www.performanceconnect.ca';
  var page = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';

  // Random id for this browser tab's visit, so one person clicking 5 times
  // can be told apart from 5 people. Forgotten when the tab closes.
  function sessionId() {
    try {
      var id = sessionStorage.getItem('pc_sid');
      if (!id) {
        id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        sessionStorage.setItem('pc_sid', id);
      }
      return id;
    } catch (e) { return null; }
  }

  function clip(s) { return s == null ? null : String(s).slice(0, 80); }

  function event(name, detail) {
    if (!live) {
      if (window.console && console.info) console.info('[PC.Track] (not live, skipped)', name, detail || '');
      return;
    }
    try {
      // keepalive lets the request finish even if the click navigates away
      fetch(URL_ + '/rest/v1/site_events', {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'apikey': KEY_,
          'Authorization': 'Bearer ' + KEY_,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ event: name, page: clip(page), detail: clip(detail), session_id: sessionId() })
      }).catch(function () {});
    } catch (e) {}
  }

  // Count each event at most once per visit (e.g. page views).
  function once(name, detail) {
    try {
      var k = 'pc_once_' + name;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
    } catch (e) {}
    event(name, detail);
  }

  // One listener for the whole page: catches clicks on anything marked
  // data-track, including links pc-nav.js adds after the page loads.
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-track]');
    if (el) event(el.getAttribute('data-track'), el.getAttribute('data-track-detail') || el.textContent.trim());
  }, true);

  PC.Track = { event: event, once: once };
})();
