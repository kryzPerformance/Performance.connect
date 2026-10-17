/* ============================================================
   Performance Connect — Shared Config (environment-aware)
   ------------------------------------------------------------
   ONE file, works on BOTH environments automatically.
   It detects the domain and picks the right Supabase project:

     • Live site (performanceconnect.ca)  → PRODUCTION keys
     • Preview URLs (*.workers.dev, or a
       hostname containing "staging")     → STAGING keys

   No manual key swapping. No merge conflicts.
   Just fill in your STAGING values once, below.
   ============================================================ */

(function () {
  var host = window.location.hostname;

  // Treat anything that isn't your real domain as staging:
  //  - Cloudflare preview URLs end in .workers.dev
  //  - any hostname containing "staging"
  //  - localhost / 127.0.0.1 for local testing
  var isStaging =
    host.indexOf('workers.dev') !== -1 ||
    host.indexOf('staging')     !== -1 ||
    host === 'localhost'              ||
    host === '127.0.0.1';

  var PRODUCTION = {
    SUPABASE_URL: 'https://myapluhgfpnyjsfrflhd.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_yfHWon3pr30Z8do9QW9tSQ_wqlkzDxc'
  };

  // Only ever put PUBLISHABLE keys (sb_publishable_...) in this file. It is served
  // to every visitor. Secret / service-role keys must never appear in site code.
  var STAGING = {
    SUPABASE_URL: 'PASTE_STAGING_PROJECT_URL_HERE',
    SUPABASE_ANON_KEY: 'PASTE_STAGING_PUBLISHABLE_KEY_HERE'
  };

  window.PC_CONFIG = isStaging ? STAGING : PRODUCTION;
  window.PC_CONFIG.ENVIRONMENT = isStaging ? 'staging' : 'production';

  // Small console note so you always know which DB a page is talking to
  if (window.console && console.info) {
    console.info('[Performance Connect] Environment: ' + window.PC_CONFIG.ENVIRONMENT);
  }
})();
