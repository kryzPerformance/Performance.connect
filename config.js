/* ============================================================
   Performance Connect — Shared Config
   ------------------------------------------------------------
   This is the ONLY place Supabase credentials live.
   To switch between PRODUCTION and STAGING, edit this one file.

   PRODUCTION (live site — main branch):
     URL:  https://myapluhgfpnyjsfrflhd.supabase.co
     Use your production anon + service_role keys.

   STAGING (test site — staging branch):
     Replace all three values below with your staging project's
     URL + keys from: Supabase → staging project → Settings → API
   ============================================================ */

window.PC_CONFIG = {
  // Supabase project URL
  SUPABASE_URL: 'https://myapluhgfpnyjsfrflhd.supabase.co',

  // Anon (public) key — safe to expose, used by public-facing pages
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YXBsdWhnZnBueWpzZnJmbGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODcxNDYsImV4cCI6MjA5NzY2MzE0Nn0.j_Xe_J1uvBA-w4Sag1tl3Yp7zqlaEmkQzt2eO6xz1vg',

  // Service role key — bypasses RLS. ONLY used by admin.html (password-gated).
  // Leave as placeholder until you paste your real key.
  SERVICE_ROLE_KEY: 'PASTE_SERVICE_ROLE_KEY_HERE'
};
