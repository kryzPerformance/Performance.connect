/**
 * AI Flyer Parser — uses OpenAI Vision to extract structured event data
 * from automotive event flyer images.
 */

import OpenAI from "openai";

export interface FlyerExtractedFields {
  title: string | null;
  description: string | null;
  organizer: string | null;
  venueName: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  rainDate: string | null;
  categories: string[];
  vehicleTypes: string[];
  entryFee: string | null;
  isCharityEvent: boolean | null;
  hasFoodVendors: boolean | null;
  hasBurnoutContest: boolean | null;
  hasDyno: boolean | null;
  sponsors: string[];
  contactInfo: string | null;
}

export interface FlyerParseResult {
  confidenceScore: number;
  extractedFields: FlyerExtractedFields;
  rawText: string | null;
}

const EMPTY_FIELDS: FlyerExtractedFields = {
  title: null,
  description: null,
  organizer: null,
  venueName: null,
  address: null,
  city: null,
  province: null,
  country: null,
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
  rainDate: null,
  categories: [],
  vehicleTypes: [],
  entryFee: null,
  isCharityEvent: null,
  hasFoodVendors: null,
  hasBurnoutContest: null,
  hasDyno: null,
  sponsors: [],
  contactInfo: null,
};

const SYSTEM_PROMPT = `You are an expert at extracting structured data from automotive event flyers.
Analyze the image and extract as much information as possible. Return ONLY valid JSON with no markdown.

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

export async function parseFlyerImage(
  imageData: string,
  isUrl: boolean = false,
): Promise<FlyerParseResult> {
  // Uses Replit-managed AI Integrations (no personal OpenAI account needed).
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!apiKey || !baseURL) {
    console.error(
      "parseFlyerImage: AI_INTEGRATIONS_OPENAI_API_KEY / AI_INTEGRATIONS_OPENAI_BASE_URL not set — returning empty result",
    );
    return {
      confidenceScore: 0,
      extractedFields: EMPTY_FIELDS,
      rawText: null,
    };
  }

  const client = new OpenAI({ apiKey, baseURL });

  // Frontend sends a full data URL (data:image/png;base64,...) — don't double-prefix it.
  const url = isUrl || imageData.startsWith("data:")
    ? imageData
    : `data:image/jpeg;base64,${imageData}`;
  const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPartImage = {
    type: "image_url",
    image_url: { url, detail: "high" },
  };

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all event information from this automotive event flyer." },
            imageContent,
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { confidenceScore: 0, extractedFields: EMPTY_FIELDS, rawText: null };
    }

    // Strip markdown code fences if present
    const cleaned = content.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as FlyerExtractedFields & {
      confidenceScore?: number;
      rawText?: string;
    };

    const confidenceScore = Math.min(1, Math.max(0, parsed.confidenceScore ?? 0.5));
    const rawText = parsed.rawText ?? null;

    // Build clean extracted fields
    const extractedFields: FlyerExtractedFields = {
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
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      vehicleTypes: Array.isArray(parsed.vehicleTypes) ? parsed.vehicleTypes : [],
      entryFee: parsed.entryFee ?? null,
      isCharityEvent: parsed.isCharityEvent ?? null,
      hasFoodVendors: parsed.hasFoodVendors ?? null,
      hasBurnoutContest: parsed.hasBurnoutContest ?? null,
      hasDyno: parsed.hasDyno ?? null,
      sponsors: Array.isArray(parsed.sponsors) ? parsed.sponsors : [],
      contactInfo: parsed.contactInfo ?? null,
    };

    return { confidenceScore, extractedFields, rawText };
  } catch (err) {
    console.error("parseFlyerImage: extraction failed", err);
    return { confidenceScore: 0, extractedFields: EMPTY_FIELDS, rawText: null };
  }
}
