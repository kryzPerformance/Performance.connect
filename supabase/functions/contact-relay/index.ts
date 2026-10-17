/**
 * Performance Connect — Contact relay (Supabase Edge Function)
 * ------------------------------------------------------------------
 * "Message the seller" on listing and part-out pages posts here. The
 * function looks up the seller's email itself (the browser never sees it)
 * and sends the message through SMTP2GO, with Reply-To set to the buyer so
 * the seller can just hit reply.
 *
 * Secrets (Dashboard → Edge Functions → Secrets):
 *   SMTP2GO_API_KEY       — added by Krys
 *   SUPABASE_SECRET_KEYS  — provided by Supabase automatically
 *
 * Deployed with verify_jwt = false (the site uses a publishable key, which
 * the gateway's JWT check doesn't understand). Access is limited by the
 * origin check, input checks and rate limits below.
 *
 * Request:  POST { kind: "listing"|"partout", id, part?, name, email, message, website? }
 *           (website is a hidden honeypot field — real people leave it empty)
 * Response: { ok: true } | { ok: false, error: "<code>" }
 */
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const SENDER = "Performance Connect <messages@performanceconnect.ca>";
const SITE = "https://performanceconnect.ca";

const ALLOWED_ORIGINS = ["https://performanceconnect.ca", "https://www.performanceconnect.ca"];
function originAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".krys-taylor.workers.dev") || host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

// Rate limits (messages per window)
const PER_IP_10MIN = 5;
const PER_IP_DAY = 20;
const PER_SELLER_DAY = 40;

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": originAllowed(origin) ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "apikey, content-type, x-client-info",
    "Vary": "Origin",
  };
}

const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/;
const clean = (v: unknown, max: number) =>
  (typeof v === "string" ? v : "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ");
const escHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function adminClient() {
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const key = keys["default"] ?? Object.values(keys)[0];
  if (!key) throw new Error("No secret key available");
  return createClient(Deno.env.get("SUPABASE_URL")!, key as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  const fail = (status: number, error: string) => json({ ok: false, error }, status);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return fail(405, "post_only");
  if (!originAllowed(origin)) return fail(403, "origin");

  const apiKey = Deno.env.get("SMTP2GO_API_KEY");
  if (!apiKey) {
    console.error("SMTP2GO_API_KEY secret is not set");
    return fail(500, "not_configured");
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_json");
  }

  // Honeypot: bots fill every field. Pretend it worked so they move on.
  if (clean(body.website, 200)) return json({ ok: true });

  const kind = body.kind === "partout" ? "partout" : body.kind === "listing" ? "listing" : null;
  const id = clean(String(body.id ?? ""), 64);
  const part = oneLine(clean(body.part, 150));
  const name = oneLine(clean(body.name, 80));
  const email = clean(body.email, 200);
  const message = clean(body.message, 3000);

  if (!kind || !id) return fail(400, "bad_target");
  if (kind === "listing" && !/^\d+$/.test(id)) return fail(400, "bad_target");
  if (kind === "partout" && !/^[0-9a-f-]{36}$/i.test(id)) return fail(400, "bad_target");
  if (!name) return fail(400, "name_required");
  if (!EMAIL_RE.test(email)) return fail(400, "bad_email");
  if (message.length < 2) return fail(400, "message_required");

  let db;
  try {
    db = adminClient();
  } catch (e) {
    console.error("contact-relay: admin client", e);
    return fail(500, "not_configured");
  }

  // ── Find what's being asked about, and its seller ──
  let title = "";
  let link = "";
  let sellerId: number | null = null;
  if (kind === "listing") {
    const r = await db.from("listings").select("id,title,seller_id,status").eq("id", id).maybeSingle();
    if (r.error || !r.data || r.data.status !== "active") return fail(404, "not_found");
    title = r.data.title ?? "your listing";
    link = `${SITE}/listing?id=${r.data.id}`;
    sellerId = r.data.seller_id;
  } else {
    const r = await db.from("partout_vehicles").select("id,year,make,model,trim,seller_id,status")
      .eq("id", id).maybeSingle();
    if (r.error || !r.data || r.data.status === "archived") return fail(404, "not_found");
    title = [r.data.year, r.data.make, r.data.model, r.data.trim].filter(Boolean).join(" ") + " part out";
    link = `${SITE}/partout?id=${r.data.id}`;
    sellerId = r.data.seller_id;
  }
  if (sellerId == null) return fail(404, "no_email");
  const s = await db.from("sellers").select("email").eq("seller_id", sellerId).maybeSingle();
  const to = (s.data?.email ?? "").trim();
  if (s.error || !EMAIL_RE.test(to)) return fail(404, "no_email");

  // ── Rate limits ──
  const ip = (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "")
    .split(",")[0].trim();
  const ipHash = await sha256("pc-relay:" + ip);
  const now = Date.now();
  const since10 = new Date(now - 10 * 60 * 1000).toISOString();
  const sinceDay = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const [a, b, c] = await Promise.all([
    db.from("contact_log").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since10),
    db.from("contact_log").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", sinceDay),
    db.from("contact_log").select("id", { count: "exact", head: true }).eq("seller_id", sellerId).gte("created_at", sinceDay),
  ]);
  if ((a.count ?? 0) >= PER_IP_10MIN || (b.count ?? 0) >= PER_IP_DAY || (c.count ?? 0) >= PER_SELLER_DAY) {
    return fail(429, "rate_limited");
  }

  // ── Send ──
  const about = part ? `${part} — ${title}` : title;
  const subject = oneLine(`Performance Connect: ${name} asked about ${about}`).slice(0, 200);
  const text =
    `${name} (${email}) sent you a message about ${about} on Performance Connect.\n\n` +
    `${message}\n\n` +
    `— Reply to this email to answer them directly.\n` +
    `Listing: ${link}\n\n` +
    `Performance Connect never shows your email address on the site. If this message is spam, ` +
    `just ignore it or forward it to info@performanceconnect.ca.`;
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">` +
    `<p><b>${escHtml(name)}</b> (${escHtml(email)}) sent you a message about ` +
    `<b>${escHtml(about)}</b> on Performance Connect.</p>` +
    `<div style="border-left:3px solid #1FA9CF;padding:8px 14px;margin:14px 0;background:#f4f8fa;white-space:pre-wrap">` +
    `${escHtml(message)}</div>` +
    `<p>Reply to this email to answer them directly.<br><a href="${escHtml(link)}">View the listing</a></p>` +
    `<p style="font-size:12px;color:#666">Performance Connect never shows your email address on the site. ` +
    `If this message is spam, ignore it or forward it to info@performanceconnect.ca.</p></div>`;

  let sendRes: Response;
  try {
    sendRes = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Smtp2go-Api-Key": apiKey },
      body: JSON.stringify({
        api_key: apiKey,
        sender: SENDER,
        to: [to],
        subject,
        text_body: text,
        html_body: html,
        custom_headers: [{ header: "Reply-To", value: `${name.replace(/[<>",;]/g, "")} <${email}>` }],
      }),
    });
  } catch (e) {
    console.error("contact-relay: SMTP2GO unreachable", e);
    return fail(502, "send_failed");
  }
  const sendJson = await sendRes.json().catch(() => ({}));
  const ok = sendRes.ok && (sendJson?.data?.succeeded ?? 0) >= 1;

  await db.from("contact_log").insert({ ip_hash: ipHash, seller_id: sellerId, target: `${kind}:${id}${ok ? "" : ":failed"}` });

  if (!ok) {
    console.error("contact-relay: SMTP2GO error", sendRes.status, JSON.stringify(sendJson).slice(0, 500));
    return fail(502, "send_failed");
  }
  return json({ ok: true });
});
