/**
 * Safe website scraper for event discovery sources.
 *
 * Safety rules:
 *  - Never scrapes Facebook/Instagram/Meta domains (against their ToS).
 *  - Respects robots.txt Disallow rules for anonymous crawlers.
 *  - Identifies itself with an honest User-Agent.
 *  - One fetch per check, 15s timeout, 2MB response cap.
 *  - AI extraction shares the global daily AI quota with the flyer scanner.
 *  - Everything found lands in the moderation queue as "pending" (or
 *    "duplicate" if it matches an existing event) — nothing goes live
 *    without moderator approval.
 */

import OpenAI from "openai";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { db, eventsTable, eventSourcesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { EventSource } from "@workspace/db";
import { findDuplicates } from "./duplicate-detection";
import { consumeDailyAiQuota } from "../middleware/rate-limit";

const USER_AGENT =
  "PerformanceConnectBot/1.0 (+https://performanceconnect.ca; event discovery)";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_TEXT_CHARS = 20_000;
const MAX_EVENTS_PER_CHECK = 10;

const BLOCKED_DOMAINS = [
  "facebook.com",
  "fb.com",
  "fb.me",
  "instagram.com",
  "meta.com",
  "threads.net",
];

export interface ScrapeResult {
  ok: boolean;
  message: string;
  eventsFound: number;
  duplicatesFound: number;
}

function isBlockedDomain(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return BLOCKED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * SSRF guard: resolve the hostname and reject private, loopback,
 * link-local, and cloud-metadata addresses (IPv4 + IPv6).
 */
function isPrivateIp(addr: string): boolean {
  // Normalize IPv4-mapped IPv6 (::ffff:1.2.3.4)
  const v4 = addr.replace(/^::ffff:/i, "");
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local + AWS/GCP metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224 // multicast/reserved
    );
  }
  const lower = addr.toLowerCase();
  return (
    lower === "::" || lower === "::1" ||
    lower.startsWith("fe80:") || // link-local
    lower.startsWith("fc") || lower.startsWith("fd") || // ULA
    lower.startsWith("ff") // multicast
  );
}

async function isSafePublicHost(hostname: string): Promise<boolean> {
  try {
    if (isIP(hostname)) return !isPrivateIp(hostname);
    const results = await lookup(hostname, { all: true });
    if (results.length === 0) return false;
    return results.every((r) => !isPrivateIp(r.address));
  } catch {
    return false;
  }
}

/**
 * Fetch with manual redirect handling: every hop is re-validated
 * against the SSRF guard before it is followed.
 */
async function safeFetch(target: URL, timeoutMs: number): Promise<globalThis.Response> {
  let current = target;
  for (let hop = 0; hop < 4; hop++) {
    if (current.protocol !== "http:" && current.protocol !== "https:") {
      throw new Error("Unsupported protocol in redirect chain");
    }
    if (isBlockedDomain(current) || !(await isSafePublicHost(current.hostname))) {
      throw new Error("Blocked or non-public address");
    }
    const res = await fetch(current, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/json;q=0.9,*/*;q=0.5" },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = new URL(loc, current);
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects");
}

/**
 * Fetch and check robots.txt: returns true if we're allowed to fetch the path.
 * Fails open only when robots.txt itself doesn't exist (404) — fails closed
 * on parse-able Disallow rules for "*".
 */
async function robotsAllows(url: URL): Promise<boolean> {
  try {
    const res = await safeFetch(new URL(`${url.protocol}//${url.host}/robots.txt`), 8_000);
    if (!res.ok) return true; // no robots.txt → allowed
    const text = (await res.text()).slice(0, 100_000);

    // Collect Disallow rules that apply to "*" (and to our bot name)
    let applies = false;
    const disallows: string[] = [];
    for (const rawLine of text.split("\n")) {
      const line = rawLine.split("#")[0].trim();
      if (!line) continue;
      const [key, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      const k = key.toLowerCase().trim();
      if (k === "user-agent") {
        applies = value === "*" || value.toLowerCase().includes("performanceconnect");
      } else if (applies && k === "disallow" && value) {
        disallows.push(value);
      }
    }
    const path = url.pathname || "/";
    return !disallows.some((rule) => path.startsWith(rule));
  } catch {
    return true; // robots.txt unreachable → proceed politely
  }
}

/** Strip HTML down to readable text. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

const EXTRACTION_PROMPT = `You are an expert at finding automotive events (car meets, shows, track days, drag races, autocross, drift events, cars & coffee) in web page text.

Today's date is {TODAY}. Only include events that are clearly in the future (or undated but clearly upcoming). Ignore past events, generic business info, and anything that is not a specific automotive event.

Return ONLY valid JSON (no markdown) of the form:
{"events": [
  {
    "title": "Event name",
    "description": "Brief description or null",
    "organizer": "Organizer or null",
    "venueName": "Venue or null",
    "address": "Street address or null",
    "city": "City or null",
    "province": "Province/State abbreviation or null",
    "country": "Country or null",
    "startDate": "YYYY-MM-DD or null",
    "endDate": "YYYY-MM-DD or null",
    "startTime": "HH:MM 24h or null",
    "endTime": "HH:MM 24h or null",
    "categories": ["from: Car Show, Track Day, Drag Race, Car Meet, Autocross, Drift Event, Burnout Contest"],
    "vehicleTypes": ["e.g. All Makes, JDM, Domestic, European, Classic, Muscle, Trucks, Motorcycles"],
    "entryFee": "e.g. '$20' or 'Free' or null",
    "contactInfo": "Email/phone/website or null",
    "confidence": 0.0 to 1.0
  }
]}
Return {"events": []} if no automotive events are found. Maximum ${MAX_EVENTS_PER_CHECK} events.`;

interface ExtractedEvent {
  title?: string | null;
  description?: string | null;
  organizer?: string | null;
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  categories?: string[];
  vehicleTypes?: string[];
  entryFee?: string | null;
  contactInfo?: string | null;
  confidence?: number;
}

async function extractEventsFromText(pageText: string): Promise<ExtractedEvent[]> {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey || !baseURL) {
    throw new Error("AI integration is not configured");
  }
  const client = new OpenAI({ apiKey, baseURL });

  const today = new Date().toISOString().slice(0, 10);
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: EXTRACTION_PROMPT.replace("{TODAY}", today) },
      { role: "user", content: pageText },
    ],
    max_tokens: 3000,
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const cleaned = content.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as { events?: ExtractedEvent[] };
  return Array.isArray(parsed.events) ? parsed.events.slice(0, MAX_EVENTS_PER_CHECK) : [];
}

/**
 * Check a single discovery source: fetch its page, extract events with AI,
 * and add new ones to the moderation queue.
 */
// Only one scan at a time process-wide (prevents overlap/quota abuse)
let scanInProgress = false;

export async function checkSource(source: EventSource): Promise<ScrapeResult> {
  if (scanInProgress) {
    return { ok: false, message: "Another scan is already running — try again in a moment.", eventsFound: 0, duplicatesFound: 0 };
  }
  scanInProgress = true;
  try {
    return await doCheckSource(source);
  } finally {
    scanInProgress = false;
  }
}

async function doCheckSource(source: EventSource): Promise<ScrapeResult> {
  if (!source.url) {
    return { ok: false, message: "This source has no URL to check.", eventsFound: 0, duplicatesFound: 0 };
  }

  let url: URL;
  try {
    url = new URL(source.url);
  } catch {
    return { ok: false, message: "The source URL is not valid.", eventsFound: 0, duplicatesFound: 0 };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, message: "Only http(s) URLs can be checked.", eventsFound: 0, duplicatesFound: 0 };
  }

  if (source.type === "facebook" || source.type === "instagram" || isBlockedDomain(url)) {
    return {
      ok: false,
      message:
        "Facebook and Instagram can't be scraped (it's against their terms of service). Use the flyer scanner for events posted there.",
      eventsFound: 0,
      duplicatesFound: 0,
    };
  }

  if (!(await isSafePublicHost(url.hostname))) {
    return {
      ok: false,
      message: "That URL points to a private or internal address and can't be scanned.",
      eventsFound: 0,
      duplicatesFound: 0,
    };
  }

  if (!(await robotsAllows(url))) {
    return {
      ok: false,
      message: "This website asks crawlers not to access that page (robots.txt), so it was skipped.",
      eventsFound: 0,
      duplicatesFound: 0,
    };
  }

  // Fetch the page
  let html: string;
  try {
    const res = await safeFetch(url, FETCH_TIMEOUT_MS);
    if (!res.ok) {
      return { ok: false, message: `The website responded with an error (${res.status}).`, eventsFound: 0, duplicatesFound: 0 };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_RESPONSE_BYTES) {
      return { ok: false, message: "The page is too large to scan.", eventsFound: 0, duplicatesFound: 0 };
    }
    html = buf.toString("utf-8");
  } catch (err) {
    console.error(`checkSource: fetch failed for ${source.url}`, err);
    return { ok: false, message: "Couldn't reach the website (timeout or connection error).", eventsFound: 0, duplicatesFound: 0 };
  }

  const pageText = htmlToText(html).slice(0, MAX_TEXT_CHARS);
  if (pageText.length < 50) {
    return {
      ok: false,
      message:
        "The page has almost no readable text — it may load its content with JavaScript, which this scraper can't read.",
      eventsFound: 0,
      duplicatesFound: 0,
    };
  }

  // Respect the global daily AI budget (shared with the flyer scanner)
  if (!consumeDailyAiQuota()) {
    return { ok: false, message: "The daily AI usage limit has been reached. Try again tomorrow.", eventsFound: 0, duplicatesFound: 0 };
  }

  let extracted: ExtractedEvent[];
  try {
    extracted = await extractEventsFromText(pageText);
  } catch (err) {
    console.error(`checkSource: AI extraction failed for ${source.url}`, err);
    return { ok: false, message: "The AI couldn't process this page. Please try again later.", eventsFound: 0, duplicatesFound: 0 };
  }

  let inserted = 0;
  let duplicates = 0;

  for (const ev of extracted) {
    const title = (ev.title ?? "").trim();
    if (!title) continue;

    const candidate = {
      title,
      description: ev.description ?? null,
      organizer: ev.organizer ?? null,
      venueName: ev.venueName ?? null,
      address: ev.address ?? null,
      city: ev.city ?? null,
      province: ev.province ?? null,
      country: ev.country ?? "Canada",
      startDate: ev.startDate ?? null,
      endDate: ev.endDate ?? null,
      startTime: ev.startTime ?? null,
      endTime: ev.endTime ?? null,
      categories: Array.isArray(ev.categories) ? ev.categories : [],
      vehicleTypes: Array.isArray(ev.vehicleTypes) ? ev.vehicleTypes : [],
      entryFee: ev.entryFee ?? null,
      contactInfo: ev.contactInfo ?? null,
      source: "discovery" as const,
      sourceUrl: source.url,
      discoverySourceId: source.id,
      aiConfidenceScore: String(Math.min(1, Math.max(0, ev.confidence ?? 0.5))),
    };

    const matches = await findDuplicates(candidate);
    const topMatch = matches[0];

    await db.insert(eventsTable).values({
      ...candidate,
      status: topMatch ? "duplicate" : "pending",
      duplicateOfId: topMatch ? topMatch.event.id : null,
    });

    if (topMatch) duplicates += 1;
    else inserted += 1;
  }

  await db
    .update(eventSourcesTable)
    .set({
      lastCheckedAt: new Date(),
      eventsFound: sql`${eventSourcesTable.eventsFound} + ${inserted}`,
    })
    .where(eq(eventSourcesTable.id, source.id));

  const parts: string[] = [];
  if (inserted > 0) parts.push(`${inserted} new event${inserted === 1 ? "" : "s"} added to your review queue`);
  if (duplicates > 0) parts.push(`${duplicates} likely duplicate${duplicates === 1 ? "" : "s"} flagged`);
  if (parts.length === 0) parts.push("no automotive events found on the page");

  return { ok: true, message: `Check complete: ${parts.join(", ")}.`, eventsFound: inserted, duplicatesFound: duplicates };
}
