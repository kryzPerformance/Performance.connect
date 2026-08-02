/* ============================================================================
   pc-account.js — Performance Connect pseudo-login (persistent, login-free)
   ----------------------------------------------------------------------------
   Built on the Performance Key. Adds a device-persistent identity layer:

   - Stores the seller's key + public label in localStorage (THIS device only).
   - Injects a top-right pill on every page:
       logged out -> "Sign in"
       logged in  -> the seller's @handle
   - Silently autofills the Performance Key on gated forms, so posting a
     listing (and future gated actions) never requires re-typing the key.

   LOAD ORDER — put this AFTER the Supabase CDN on every page:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="pc-account.js"></script>

   SECURITY MODEL (read before extending):
   - The Performance Key is a PRIVATE CREDENTIAL, like a car key. It is stored
     so the owner's own device can act as them, but it is NEVER rendered — not
     in the pill, not in the DOM, not in a URL. The public label is the @handle.
   - Contact edits update the sellers row by seller_id with the anon key,
     matching the existing site. A client-side key re-verify is done first as a
     stopgap, but this is NOT true server-side ownership auth. The hardened
     version must route writes through a Cloudflare Worker that validates the
     key server-side. Tracked in DECISIONS.md.
   ========================================================================== */
window.PC = window.PC || {};
(function () {
  'use strict';

  var STORAGE_KEY = 'pc_identity_v1';
  var ACCENT = '#3dc9f0';

  /* ── Supabase client (same inline anon pattern as every page) ────────────── */
  var SB_URL  = 'https://myapluhgfpnyjsfrflhd.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YXBsdWhnZnBueWpzZnJmbGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODcxNDYsImV4cCI6MjA5NzY2MzE0Nn0.j_Xe_J1uvBA-w4Sag1tl3Yp7zqlaEmkQzt2eO6xz1vg';
  var sb = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SB_URL, SB_ANON)
    : null;

  /* ── Key helper (mirrors normaliseKey in marketplace.html / manage.html) ─── */
  function normaliseKey(raw) {
    var clean = String(raw || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    // Accept a full key ("PCABCDEFGH") or just the body ("ABCDEFGH")
    if (clean.length === 10 && clean.slice(0, 2) === 'PC') clean = clean.slice(2);
    if (clean.length === 8) return 'PC-' + clean.slice(0, 4) + '-' + clean.slice(4, 8);
    return null;
  }

  /* ── Storage API: window.PC.account ──────────────────────────────────────── */
  var acct = window.PC.account = window.PC.account || {};

  acct.get = function () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  };
  acct.isLoggedIn = function () { var i = acct.get(); return !!(i && i.key); };
  acct.key        = function () { var i = acct.get(); return i ? i.key : null; };
  acct.sellerId   = function () { var i = acct.get(); return i ? i.seller_id : null; };

  function save(identity) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        key:       identity.key,
        seller_id: identity.seller_id,
        instagram: identity.instagram || null,
        email:     identity.email || null
      }));
    } catch (e) {}
    render();
  }
  acct.set = save;

  acct.clear = function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    render();
  };

  /* Resolve a typed key against the sellers table, then store it.
     -> { ok:true } | { ok:false, reason:'format'|'notfound'|'offline' } */
  acct.signInWithKey = async function (rawKey) {
    var norm = normaliseKey(rawKey);
    if (!norm) return { ok: false, reason: 'format' };
    if (!sb)   return { ok: false, reason: 'offline' };
    var res = await sb.from('sellers')
      .select('seller_id,instagram,email')
      .eq('performance_key', norm).single();
    if (res.error || !res.data) return { ok: false, reason: 'notfound' };
    save({ key: norm, seller_id: res.data.seller_id, instagram: res.data.instagram, email: res.data.email });
    return { ok: true };
  };

  /* Update this account's contact info.
     Stopgap client-side re-verify — NOT server-side auth (see SECURITY MODEL). */
  acct.updateContact = async function (instagram, email) {
    var id = acct.get();
    if (!id || !id.key) return { ok: false, reason: 'not_logged_in' };
    if (!sb) return { ok: false, reason: 'offline' };
    var chk = await sb.from('sellers').select('seller_id')
      .eq('performance_key', id.key).single();
    if (chk.error || !chk.data || chk.data.seller_id !== id.seller_id) {
      return { ok: false, reason: 'verify' };
    }
    var ig = ((instagram || '').trim().replace(/^@/, '')) || null;
    var em = ((email || '').trim()) || null;
    var res = await sb.from('sellers').update({
      instagram: ig, email: em, updated_at: new Date().toISOString()
    }).eq('seller_id', id.seller_id);
    if (res.error) return { ok: false, reason: 'db', message: res.error.message };
    save({ key: id.key, seller_id: id.seller_id, instagram: ig, email: em });
    return { ok: true };
  };

  /* Silent autofill: drop the stored key into a form field and fire the
     page's existing 'input' handler so its own lookup/autofill runs. */
  acct.prefillKeyField = function (inputId) {
    var el = document.getElementById(inputId || 'perf-key-input');
    var k = acct.key();
    if (el && k) {
      el.value = k.replace(/^PC-/, '');   // fields hold the XXXX-XXXX body only
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  };

  /* ── Public label (never the key) ────────────────────────────────────────── */
  function labelFor(i) {
    if (!i) return 'Sign in';
    if (i.instagram) return '@' + i.instagram;
    if (i.email) return i.email;
    return 'Signed in';
  }

  /* ── Styles (scoped, injected once) ──────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('pc-acct-styles')) return;
    var s = document.createElement('style');
    s.id = 'pc-acct-styles';
    s.textContent = [
      '.pc-acct{position:fixed;top:14px;right:14px;z-index:2147483000;font-family:Inter,system-ui,sans-serif;}',
      '.pc-acct *{box-sizing:border-box;}',
      '.pc-acct-pill{display:inline-flex;align-items:center;gap:7px;cursor:pointer;',
      'padding:8px 14px;border-radius:999px;border:0.5px solid rgba(255,255,255,0.14);',
      'background:rgba(10,12,13,0.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
      'color:#e8edf0;font-size:13px;font-weight:600;letter-spacing:0.02em;line-height:1;',
      'max-width:60vw;transition:border-color .15s ease,background .15s ease;}',
      '.pc-acct-pill:hover{border-color:rgba(61,201,240,0.5);background:rgba(10,12,13,0.94);}',
      '.pc-acct-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.pc-acct-dot{width:7px;height:7px;border-radius:50%;background:' + ACCENT + ';flex:0 0 auto;box-shadow:0 0 6px ' + ACCENT + ';}',
      '.pc-acct-ico{width:14px;height:14px;flex:0 0 auto;}',
      '.pc-acct-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:210px;',
      'background:#0c0f10;border:0.5px solid rgba(255,255,255,0.14);border-radius:12px;',
      'padding:6px;box-shadow:0 12px 40px rgba(0,0,0,0.55);display:none;}',
      '.pc-acct-menu.open{display:block;}',
      '.pc-acct-item{display:block;width:100%;text-align:left;background:none;border:none;',
      'color:#c9d3d8;font-size:13px;font-weight:500;font-family:inherit;padding:10px 12px;',
      'border-radius:8px;cursor:pointer;text-decoration:none;}',
      '.pc-acct-item:hover{background:rgba(61,201,240,0.1);color:#fff;}',
      '.pc-acct-item.danger{color:#f2856f;}',
      '.pc-acct-item.danger:hover{background:rgba(242,133,111,0.12);color:#ff9d88;}',
      '.pc-acct-sep{height:1px;background:rgba(255,255,255,0.08);margin:5px 6px;}',
      '.pc-acct-ov{position:fixed;inset:0;z-index:2147483001;display:none;align-items:center;',
      'justify-content:center;background:rgba(4,6,7,0.72);backdrop-filter:blur(4px);padding:20px;}',
      '.pc-acct-ov.open{display:flex;}',
      '.pc-acct-card{width:100%;max-width:360px;background:#0c0f10;border:0.5px solid rgba(255,255,255,0.14);',
      'border-radius:16px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,0.6);}',
      '.pc-acct-card h3{margin:0 0 4px;color:#fff;font-size:17px;font-weight:700;font-family:inherit;}',
      '.pc-acct-card p{margin:0 0 16px;color:#8b979d;font-size:13px;line-height:1.45;}',
      '.pc-acct-card label{display:block;color:#c9d3d8;font-size:12px;font-weight:600;margin:12px 0 6px;}',
      '.pc-acct-card input{width:100%;padding:11px 13px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.16);',
      'background:rgba(255,255,255,0.04);color:#fff;font-size:14px;font-family:inherit;}',
      '.pc-acct-card input:focus{outline:none;border-color:' + ACCENT + ';}',
      '.pc-acct-msg{font-size:12.5px;margin-top:10px;display:none;}',
      '.pc-acct-msg.ok{color:#3df08a;display:block;}',
      '.pc-acct-msg.err{color:#f2856f;display:block;}',
      '.pc-acct-row{display:flex;gap:8px;margin-top:18px;}',
      '.pc-acct-btn{flex:1;padding:11px 14px;border-radius:8px;border:none;cursor:pointer;',
      'font-size:13px;font-weight:700;font-family:inherit;}',
      '.pc-acct-btn.primary{background:' + ACCENT + ';color:#04191f;}',
      '.pc-acct-btn.ghost{background:rgba(255,255,255,0.06);color:#c9d3d8;border:0.5px solid rgba(255,255,255,0.14);}',
      '.pc-acct-btn:disabled{opacity:0.5;cursor:default;}'
    ].join('');
    document.head.appendChild(s);
  }

  var KEY_ICON = '<svg class="pc-acct-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.6 12.4 21 2"/><path d="m15.5 7.5 3 3"/></svg>';

  var root = null;

  /* ── Overlays ────────────────────────────────────────────────────────────── */
  function buildOverlay(innerBuilder) {
    var ov = document.createElement('div');
    ov.className = 'pc-acct-ov';
    var card = document.createElement('div');
    card.className = 'pc-acct-card';
    ov.appendChild(card);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(ov); });
    innerBuilder(card, ov);
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('open'); });
    return ov;
  }
  function close(ov) { ov.classList.remove('open'); setTimeout(function () { ov.remove(); }, 150); }

  function openSignIn() {
    buildOverlay(function (card, ov) {
      var input = document.createElement('input');
      input.type = 'text'; input.placeholder = 'PC-XXXX-XXXX';
      input.setAttribute('autocomplete', 'off'); input.spellcheck = false;
      input.style.letterSpacing = '0.12em'; input.style.textTransform = 'uppercase';

      var msg = document.createElement('div'); msg.className = 'pc-acct-msg';
      var go = document.createElement('button'); go.className = 'pc-acct-btn primary'; go.textContent = 'Sign in';
      var cancel = document.createElement('button'); cancel.className = 'pc-acct-btn ghost'; cancel.textContent = 'Cancel';

      var h = document.createElement('h3'); h.textContent = 'Enter your Performance Key';
      var p = document.createElement('p');
      p.textContent = 'Sign in once and this device stays signed in — your key auto-fills when you post or manage listings. Treat your key like a password.';
      card.appendChild(h); card.appendChild(p);
      var lbl = document.createElement('label'); lbl.textContent = 'Performance Key';
      card.appendChild(lbl); card.appendChild(input); card.appendChild(msg);
      var row = document.createElement('div'); row.className = 'pc-acct-row';
      row.appendChild(cancel); row.appendChild(go); card.appendChild(row);

      input.addEventListener('input', function () {
        var c = this.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (c.length === 10 && c.slice(0, 2) === 'PC') c = c.slice(2); // pasted full key
        c = c.slice(0, 8);
        this.value = c.length > 4 ? c.slice(0, 4) + '-' + c.slice(4, 8) : c;
        msg.className = 'pc-acct-msg';
      });
      cancel.addEventListener('click', function () { close(ov); });
      go.addEventListener('click', async function () {
        go.disabled = true; msg.className = 'pc-acct-msg'; msg.textContent = '';
        var r = await acct.signInWithKey(input.value);
        if (r.ok) { close(ov); }
        else {
          go.disabled = false;
          msg.className = 'pc-acct-msg err';
          msg.textContent = r.reason === 'format'
            ? 'That doesn\u2019t look like a full key (PC-XXXX-XXXX).'
            : r.reason === 'notfound'
              ? 'No account found for that key. Double-check it.'
              : 'Couldn\u2019t reach the server. Try again.';
        }
      });
      setTimeout(function () { input.focus(); }, 60);
    });
  }

  function openEditContact() {
    var id = acct.get(); if (!id) return;
    buildOverlay(function (card, ov) {
      var h = document.createElement('h3'); h.textContent = 'Contact details';
      var p = document.createElement('p');
      p.textContent = 'Shown to buyers on your listings. Your email is never displayed publicly — buyers reach you through a secure form.';
      card.appendChild(h); card.appendChild(p);

      var igL = document.createElement('label'); igL.textContent = 'Instagram handle';
      var ig = document.createElement('input'); ig.type = 'text'; ig.placeholder = 'yourhandle';
      ig.value = id.instagram || '';
      var emL = document.createElement('label'); emL.textContent = 'Email';
      var em = document.createElement('input'); em.type = 'email'; em.placeholder = 'you@example.com';
      em.value = id.email || '';
      var msg = document.createElement('div'); msg.className = 'pc-acct-msg';
      card.appendChild(igL); card.appendChild(ig);
      card.appendChild(emL); card.appendChild(em); card.appendChild(msg);

      var save = document.createElement('button'); save.className = 'pc-acct-btn primary'; save.textContent = 'Save';
      var cancel = document.createElement('button'); cancel.className = 'pc-acct-btn ghost'; cancel.textContent = 'Cancel';
      var row = document.createElement('div'); row.className = 'pc-acct-row';
      row.appendChild(cancel); row.appendChild(save); card.appendChild(row);

      cancel.addEventListener('click', function () { close(ov); });
      save.addEventListener('click', async function () {
        if (!ig.value.trim() && !em.value.trim()) {
          msg.className = 'pc-acct-msg err'; msg.textContent = 'Add at least one contact method.'; return;
        }
        save.disabled = true; msg.className = 'pc-acct-msg'; msg.textContent = '';
        var r = await acct.updateContact(ig.value, em.value);
        if (r.ok) { msg.className = 'pc-acct-msg ok'; msg.textContent = 'Saved.'; setTimeout(function () { close(ov); }, 700); }
        else {
          save.disabled = false; msg.className = 'pc-acct-msg err';
          msg.textContent = r.reason === 'verify'
            ? 'Could not verify this account. Sign in again.'
            : 'Couldn\u2019t save right now. Try again.';
        }
      });
      setTimeout(function () { ig.focus(); }, 60);
    });
  }

  /* ── Pill render ─────────────────────────────────────────────────────────── */
  function closeMenus() {
    var open = root && root.querySelector('.pc-acct-menu.open');
    if (open) open.classList.remove('open');
  }
  document.addEventListener('click', function (e) {
    if (root && !root.contains(e.target)) closeMenus();
  });

  function render() {
    injectStyles();
    if (!root) {
      root = document.createElement('div');
      root.className = 'pc-acct';
      document.body.appendChild(root);
    }
    root.textContent = '';
    var i = acct.get();

    var pill = document.createElement('div');
    pill.className = 'pc-acct-pill';

    if (i && i.key) {
      var dot = document.createElement('span'); dot.className = 'pc-acct-dot';
      var lab = document.createElement('span'); lab.className = 'pc-acct-label';
      lab.textContent = labelFor(i);           // user data -> textContent (XSS-safe)
      pill.appendChild(dot); pill.appendChild(lab);
    } else {
      var wrap = document.createElement('span');
      wrap.className = 'pc-acct-ico-wrap';
      wrap.innerHTML = KEY_ICON;               // static markup only
      var lab2 = document.createElement('span'); lab2.className = 'pc-acct-label';
      lab2.textContent = 'Sign in';
      pill.appendChild(wrap.firstChild); pill.appendChild(lab2);
    }
    root.appendChild(pill);

    if (!(i && i.key)) {
      pill.addEventListener('click', function (e) { e.stopPropagation(); openSignIn(); });
      return;
    }

    /* logged-in dropdown */
    var menu = document.createElement('div');
    menu.className = 'pc-acct-menu';

    var mListings = document.createElement('a');
    mListings.className = 'pc-acct-item'; mListings.textContent = 'Manage listings';
    mListings.href = 'manage.html';

    var mIg = document.createElement('button');
    mIg.className = 'pc-acct-item'; mIg.type = 'button';
    mIg.textContent = i.instagram ? 'Change Instagram / email' : 'Add Instagram / email';
    mIg.addEventListener('click', function () { closeMenus(); openEditContact(); });

    var sep = document.createElement('div'); sep.className = 'pc-acct-sep';

    var mForget = document.createElement('button');
    mForget.className = 'pc-acct-item danger'; mForget.type = 'button';
    mForget.textContent = 'Forget key (sign out)';
    mForget.addEventListener('click', function () { closeMenus(); acct.clear(); });

    menu.appendChild(mListings);
    menu.appendChild(mIg);
    menu.appendChild(sep);
    menu.appendChild(mForget);
    root.appendChild(menu);

    pill.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.toggle('open');
    });
  }

  /* ── Boot ────────────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
