/* ============================================================
   Performance Connect — SEO Worker
   ------------------------------------------------------------
   Every page on the site is still a plain static .html file.
   This Worker only runs for three paths (see wrangler.jsonc
   "run_worker_first"): /listing, /partout and /sitemap.xml.

   WHY: listing.html and partout.html load their content with
   JavaScript, so before that runs every listing has the same
   generic title. Here we look up the listing in Supabase and
   write its real title, description, link-preview tags and
   schema.org data into the HTML before it's sent — so Google
   and social apps see each listing as its own page.

   If Supabase is slow or down, the page is served unchanged
   (exactly as before), so this can never break a listing.
   ============================================================ */

const SITE = 'https://performanceconnect.ca';
const SUPABASE_URL = 'https://myapluhgfpnyjsfrflhd.supabase.co';
// Public anon key (same one the pages already use). RLS protects data.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YXBsdWhnZnBueWpzZnJmbGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODcxNDYsImV4cCI6MjA5NzY2MzE0Nn0.j_Xe_J1uvBA-w4Sag1tl3Yp7zqlaEmkQzt2eO6xz1vg';
const DEFAULT_IMAGE = SITE + '/og-image.jpg';

const CAT_LABEL = { vehicles: 'Vehicle', wheels: 'Wheels & Tires', parts: 'Parts', tools: 'Tools', fluids: 'Fluids & Products' };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/sitemap.xml') return await sitemap(request, env);
      if (path === '/listing') return await listingPage(request, env, url);
      if (path === '/partout') return await partoutPage(request, env, url);
    } catch (e) {
      // Fall through to the untouched static file on any error
    }
    return env.ASSETS.fetch(request);
  }
};

/* ── Supabase REST helper (short timeout so pages never hang) ── */
async function sb(query) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2500);
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + query, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
      signal: ctrl.signal
    });
    if (!r.ok) throw new Error('supabase ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/* ── Small text helpers ── */
function clip(s, n) {
  s = String(s || '').replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1).replace(/[\s,.;:–—-]+\S*$/, '') + '…' : s;
}
function money(p) {
  return p ? '$' + Number(p).toLocaleString('en-CA', { maximumFractionDigits: 0 }) : '';
}
function attr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function jsonLd(obj) {
  // Escape "<" so text from a listing can never close the <script> tag
  return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';
}
function firstPhoto(list) {
  if (Array.isArray(list)) for (const p of list) if (typeof p === 'string' && /^https:\/\//.test(p)) return p;
  return null;
}

/* ── Rewrites <title>, description and adds tags to <head> ── */
function rewrite(res, meta) {
  const head = [
    '<link rel="canonical" href="' + attr(meta.canonical) + '">',
    meta.noindex ? '<meta name="robots" content="noindex">' : '',
    '<meta property="og:site_name" content="Performance Connect">',
    '<meta property="og:type" content="' + (meta.ogType || 'website') + '">',
    '<meta property="og:title" content="' + attr(meta.title) + '">',
    '<meta property="og:description" content="' + attr(meta.description) + '">',
    '<meta property="og:url" content="' + attr(meta.canonical) + '">',
    '<meta property="og:image" content="' + attr(meta.image || DEFAULT_IMAGE) + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + attr(meta.title) + '">',
    '<meta name="twitter:description" content="' + attr(meta.description) + '">',
    '<meta name="twitter:image" content="' + attr(meta.image || DEFAULT_IMAGE) + '">',
    meta.schema ? jsonLd(meta.schema) : ''
  ].filter(Boolean).join('\n');

  const out = new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(meta.title); } })
    .on('meta[name="description"]', { element(el) { el.setAttribute('content', meta.description); } })
    .on('head', { element(el) { el.append(head, { html: true }); } })
    .transform(res);

  const h = new Headers(out.headers);
  h.set('Cache-Control', 'public, max-age=0, must-revalidate');
  return new Response(out.body, { status: out.status, headers: h });
}

async function htmlAsset(request, env) {
  const res = await env.ASSETS.fetch(request);
  const ok = res.status === 200 && (res.headers.get('content-type') || '').includes('text/html');
  return ok ? res : null;
}

/* ── /listing?id=123 ── */
async function listingPage(request, env, url) {
  const id = url.searchParams.get('id');
  const res = await htmlAsset(request, env);
  if (!res || !id || !/^\d+$/.test(id)) return res || env.ASSETS.fetch(request);

  const rows = await sb('listings?id=eq.' + id +
    '&select=id,category,title,price,condition,location,description,details,photo_urls,status,created_at');
  const l = rows[0];
  const canonical = SITE + '/listing?id=' + id;

  if (!l) {
    return rewrite(res, {
      canonical, noindex: true,
      title: 'Listing not found — Performance Connect',
      description: 'This listing may have been removed or sold. Browse more cars and parts for sale in the GTA on Performance Connect.'
    });
  }

  const d = l.details || {};
  const sold = l.status === 'sold';
  const price = money(l.price);
  const where = l.location ? ' in ' + l.location : ' in the GTA';
  const isCar = l.category === 'vehicles';

  const title = clip(l.title, 60) + (sold ? ' (Sold)' : (isCar ? ' for Sale' + where : ' for Sale')) +
    (price && !sold ? ' — ' + price : '') + ' | Performance Connect';

  const facts = [
    d.mileage ? Number(d.mileage).toLocaleString('en-CA') + ' km' : '',
    d.transmission, d.drivetrain, d.engine,
    !isCar ? CAT_LABEL[l.category] : ''
  ].filter(Boolean).join(' · ');

  // Drop the boilerplate affiliate prefix so the useful text leads
  const blurb = String(l.description || '').replace(/^\*?Affiliate Listing\*?\s*·?\s*/i, '');
  const description = clip(
    l.title + (sold ? ' — sold' : (price ? ' — ' + price : '')) + where + '. ' +
    (facts ? facts + '. ' : '') + blurb, 158);

  const image = firstPhoto(l.photo_urls);
  const schema = {
    '@context': 'https://schema.org',
    '@type': isCar ? ['Product', 'Car'] : 'Product',
    name: l.title,
    description: clip(blurb || description, 500),
    url: canonical,
    category: CAT_LABEL[l.category] || l.category,
    offers: {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'CAD',
      availability: 'https://schema.org/' + (sold ? 'SoldOut' : 'InStock'),
      itemCondition: 'https://schema.org/' + (l.condition === 'new' ? 'NewCondition' : 'UsedCondition')
    }
  };
  if (l.price) schema.offers.price = Number(l.price);
  if (image) schema.image = l.photo_urls.filter(p => typeof p === 'string');
  if (isCar) {
    if (d.make) schema.brand = { '@type': 'Brand', name: d.make };
    if (d.make) schema.manufacturer = d.make;
    if (d.model) schema.model = d.model;
    if (d.year) schema.vehicleModelDate = String(d.year);
    if (d.mileage) schema.mileageFromOdometer = { '@type': 'QuantitativeValue', value: Number(d.mileage), unitCode: 'KMT' };
    if (d.transmission) schema.vehicleTransmission = d.transmission;
    if (d.drivetrain) schema.driveWheelConfiguration = d.drivetrain;
  }

  return rewrite(res, { canonical, title, description, image, ogType: 'product', schema, noindex: false });
}

/* ── /partout?id=uuid ── */
async function partoutPage(request, env, url) {
  const id = url.searchParams.get('id');
  const res = await htmlAsset(request, env);
  if (!res || !id || !/^[0-9a-f-]{36}$/i.test(id)) return res || env.ASSETS.fetch(request);

  const [vRows, parts] = await Promise.all([
    sb('partout_vehicles?id=eq.' + id + '&select=id,year,make,model,trim,engine,transmission,location,description,photos,status'),
    sb('partout_parts?vehicle_id=eq.' + id + '&select=name,price,status&order=created_at.asc')
  ]);
  const v = vRows[0];
  const canonical = SITE + '/partout?id=' + id;

  if (!v) {
    return rewrite(res, {
      canonical, noindex: true,
      title: 'Part out not found — Performance Connect',
      description: 'This part out may have been removed. Browse more parts for sale in the GTA on Performance Connect.'
    });
  }

  const car = [v.year, v.make, v.model, v.trim].filter(Boolean).join(' ');
  const where = v.location ? ' in ' + v.location : ' in the GTA';
  const available = parts.filter(p => String(p.status) === 'available' || String(p.status) === 'active');
  const names = (available.length ? available : parts).slice(0, 6).map(p => p.name).filter(Boolean);

  const title = clip(car, 55) + ' Part Out — Parts for Sale' + where + ' | Performance Connect';
  const description = clip(
    car + ' parting out' + where + '. ' +
    (parts.length ? parts.length + ' part' + (parts.length === 1 ? '' : 's') + ' listed' +
      (names.length ? ': ' + names.join(', ') : '') + '. ' : '') +
    (v.description || ''), 158);

  const image = firstPhoto(v.photos);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: car + ' Part Out',
    description,
    url: canonical,
    about: { '@type': 'Car', name: car, brand: v.make ? { '@type': 'Brand', name: v.make } : undefined, model: v.model || undefined, vehicleModelDate: v.year ? String(v.year) : undefined }
  };
  if (image) schema.image = image;

  return rewrite(res, { canonical, title, description, image, schema, noindex: false });
}

/* ── /sitemap.xml = static sitemap.xml + every live listing ── */
async function sitemap(request, env) {
  const base = await env.ASSETS.fetch(new Request(SITE + '/sitemap.xml'));
  let xml = await base.text();

  try {
    const [listings, partouts] = await Promise.all([
      sb('listings?status=eq.active&select=id,created_at&order=created_at.desc'),
      sb('partout_vehicles?status=eq.active&select=id,updated_at,created_at&order=created_at.desc')
    ]);
    const day = s => (s ? String(s).slice(0, 10) : '');
    const urls =
      listings.map(l => '  <url><loc>' + SITE + '/listing?id=' + l.id + '</loc>' +
        (l.created_at ? '<lastmod>' + day(l.created_at) + '</lastmod>' : '') + '<priority>0.6</priority></url>').join('\n') + '\n' +
      partouts.map(p => '  <url><loc>' + SITE + '/partout?id=' + p.id + '</loc>' +
        '<lastmod>' + day(p.updated_at || p.created_at) + '</lastmod><priority>0.6</priority></url>').join('\n') + '\n';
    xml = xml.replace('</urlset>', urls + '</urlset>');
  } catch (e) {
    // Supabase unavailable: serve the static page list only
  }

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  });
}
