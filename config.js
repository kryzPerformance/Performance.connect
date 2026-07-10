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
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YXBsdWhnZnBueWpzZnJmbGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODcxNDYsImV4cCI6MjA5NzY2MzE0Nn0.j_Xe_J1uvBA-w4Sag1tl3Yp7zqlaEmkQzt2eO6xz1vg',
    SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YXBsdWhnZnBueWpzZnJmbGhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjA4NzE0NiwiZXhwIjoyMDk3NjYzMTQ2fQ.XfQxfQp59qDkbemfbWKmIjXu83NWnt0NEP4s4YrR3FE'
  };

  var STAGING = {
    SUPABASE_URL: 'https://vtxqmxansudvpjbruinr.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eHFteGFuc3VkdnBqYnJ1aW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTM3NzEsImV4cCI6MjA5OTI2OTc3MX0.z7puvrbpb6QGSB0mdxrrJu30ZgDqgNKK_jblb_yc3AI',
    SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eHFteGFuc3VkdnBqYnJ1aW5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY5Mzc3MSwiZXhwIjoyMDk5MjY5NzcxfQ.S44rRV7TSPp03eWm0zMPBxbiIe19OhGOusEOqffx9kk'
  };

  window.PC_CONFIG = isStaging ? STAGING : PRODUCTION;
  window.PC_CONFIG.ENVIRONMENT = isStaging ? 'staging' : 'production';

  // Small console note so you always know which DB a page is talking to
  if (window.console && console.info) {
    console.info('[Performance Connect] Environment: ' + window.PC_CONFIG.ENVIRONMENT);
  }
})();
