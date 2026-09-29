/**
 * Performance Connect — AI Flyer Parser (Supabase Edge Function)
 * ------------------------------------------------------------------
 * Called by event-submit.html. Takes a flyer image, asks OpenAI to read
 * it, and returns structured event fields for the form to pre-fill.
 *
 * Why this lives on the server: the OpenAI key must stay secret. The
 * browser only ever sees this function's URL; the key is stored as a
 * Supabase secret (Dashboard → Edge Functions → Secrets → OPENAI_API_KEY).
 *
 * Originally extracted from the Replit `flyer-parser.ts` (same prompt and
 * field normalisation), then moved from a Cloudflare Worker plan to a
 * Supabase Edge Function so it sits next to the database.
 *
 * Request:  POST { "image": "data:image/jpeg;base64,...." }
 * Response: { confidenceScore, extractedFields, rawText }
 */

const MODEL = "gpt-5-mini";

// Only pages on these sites may call this function (blocks other websites
// from using your OpenAI balance). Preview deploys end in .workers.dev.
const ALLOWED_ORIGINS = [
  "https://performanceconnect.ca",
  "https://www.performanceconnect.ca",
];
function originAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".workers.dev") || host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

// ~6 MB of base64 ≈ 4.5 MB image. The page shrinks photos before sending,
// so real uploads are far smaller; this just rejects abuse.
const MAX_IMAGE_CHARS = 6_000_000;

const EMPTY_FIELDS = {
  title: null, description: null, organizer: null, venueName: null,
  address: null, city: null, province: null, country: null,
  startDate: null, endDate: null, startTime: null, endTime: null,
  rainDate: null, categories: [], vehicleTypes: [], entryFee: null,
  isCharityEvent: null, hasFoodVendors: null, hasBurnoutContest: null,
  hasDyno: null, sponsors: [], contactInfo: null,
};

function systemPrompt(today: string): string {
  return `You are an expert at extracting structured data from automotive event flyers.
Analyze the image and extract as much information as possible. Return ONLY valid JSON with no markdown.

Today's date is ${today}. If the flyer shows a date without a year, use the next upcoming occurrence of that date.

The JSON must follow this exact structure:
{
  "title": "Event name or null",
  "description": "Brief event description or null",
  "organizer": "Organizer name or null",
  "venueName": "Venue name or null",
  "address": "Street address or null",
  "city": "City name or null",
  "province": "Province/State abbreviation (e.g. ON, BC, QC, AB) or null",
  "country": "Country or null",
  "startDate": "YYYY-MM-DD format or null",
  "endDate": "YYYY-MM-DD format or null (if multi-day event)",
  "startTime": "HH:MM 24h format or null",
  "endTime": "HH:MM 24h format or null",
  "rainDate": "YYYY-MM-DD format or null",
  "categories": ["array of categories like Car Show, Track Day, Drag Race, Car Meet, Autocross, Drift Event, Burnout Contest"],
  "vehicleTypes": ["array like All Makes, JDM, Domestic, European, Classic, Muscle, Trucks, Motorcycles"],
  "entryFee": "Fee amount as string e.g. '$20' or 'Free' or null",
  "isCharityEvent": true/false/null,
  "hasFoodVendors": true/false/null,
  "hasBurnoutContest": true/false/null,
  "hasDyno": true/false/null,
  "sponsors": ["array of sponsor names"],
  "contactInfo": "Email, phone, Instagram handle, or website or null",
  "confidenceScore": 0.0 to 1.0 based on how much data you could extract,
  "rawText": "All text visible in the image as a single string"
}`;
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": originAllowed(origin) ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  const fail = (status: number, reason: string) =>
    json({ confidenceScore: 0, extractedFields: EMPTY_FIELDS, rawText: null, error: reason }, status);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return fail(405, "POST only");
  if (!originAllowed(origin)) return fail(403, "Origin not allowed");

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.error("OPENAI_API_KEY secret is not set");
    return fail(500, "Parser not configured");
  }

  let imageData: unknown;
  try {
    imageData = (await req.json()).image;
  } catch {
    return fail(400, "Invalid JSON body");
  }
  if (typeof imageData !== "string" || !imageData) return fail(400, "Missing image");
  if (imageData.length > MAX_IMAGE_CHARS) return fail(413, "Image too large");

  const url = imageData.startsWith("data:image/")
    ? imageData
    : `data:image/jpeg;base64,${imageData}`;

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });

  try {
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt(today) },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all event information from this automotive event flyer." },
              { type: "image_url", image_url: { url, detail: "high" } },
            ],
          },
        ],
        // GPT-5 family: uses max_completion_tokens (not max_tokens), doesn't
        // accept a custom temperature, and spends tokens "thinking" first —
        // "minimal" keeps that small so the answer isn't cut off.
        reasoning_effort: "minimal",
        max_completion_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!apiRes.ok) {
      console.error("OpenAI error", apiRes.status, await apiRes.text());
      return fail(502, "AI request failed");
    }

    const data = await apiRes.json();
    const content: string | undefined = data.choices?.[0]?.message?.content;
    if (!content) return fail(502, "Empty AI response");

    const cleaned = content.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    const confidenceScore = Math.min(1, Math.max(0, Number(parsed.confidenceScore ?? 0.5)));
    const arr = (v: unknown) => (Array.isArray(v) ? v : []);

    const extractedFields = {
      title: parsed.title ?? null,
      description: parsed.description ?? null,
      organizer: parsed.organizer ?? null,
      venueName: parsed.venueName ?? null,
      address: parsed.address ?? null,
      city: parsed.city ?? null,
      province: parsed.province ?? null,
      country: parsed.country ?? null,
      startDate: parsed.startDate ?? null,
      endDate: parsed.endDate ?? null,
      startTime: parsed.startTime ?? null,
      endTime: parsed.endTime ?? null,
      rainDate: parsed.rainDate ?? null,
      categories: arr(parsed.categories),
      vehicleTypes: arr(parsed.vehicleTypes),
      entryFee: parsed.entryFee ?? null,
      isCharityEvent: parsed.isCharityEvent ?? null,
      hasFoodVendors: parsed.hasFoodVendors ?? null,
      hasBurnoutContest: parsed.hasBurnoutContest ?? null,
      hasDyno: parsed.hasDyno ?? null,
      sponsors: arr(parsed.sponsors),
      contactInfo: parsed.contactInfo ?? null,
    };

    return json({ confidenceScore, extractedFields, rawText: parsed.rawText ?? null });
  } catch (err) {
    console.error("flyer-parser: extraction failed", err);
    return fail(500, "Extraction failed");
  }
});
