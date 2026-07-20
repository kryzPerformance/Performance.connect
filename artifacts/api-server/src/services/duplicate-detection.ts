/**
 * Duplicate detection service.
 * Compares candidate events against existing events using multiple signals
 * and returns a confidence score with match reasons.
 */

import { db } from "@workspace/db";
import { eventsTable } from "@workspace/db";
import { eq, and, not } from "drizzle-orm";
import type { Event } from "@workspace/db";

export interface DuplicateMatch {
  event: Event;
  confidenceScore: number;
  matchReasons: string[];
}

const DUPLICATE_THRESHOLD = 0.6;

/**
 * Normalize a string for fuzzy comparison: lowercase, trim, collapse spaces.
 */
function normalize(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Simple token overlap similarity (Jaccard-like).
 * Returns 0–1.
 */
function tokenSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const setA = new Set(a.split(/\W+/).filter(Boolean));
  const setB = new Set(b.split(/\W+/).filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach((t) => { if (setB.has(t)) intersection++; });
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/**
 * Compute pairwise coordinate distance in km (Haversine).
 */
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Score a single candidate against the new event.
 * Returns null if confidence is below threshold.
 */
function scoreCandidate(candidate: Event, newEvent: Partial<Event>): DuplicateMatch | null {
  let score = 0;
  const reasons: string[] = [];

  // --- Title similarity (weight: 0.35) ---
  const titleSim = tokenSimilarity(
    normalize(newEvent.title),
    normalize(candidate.title),
  );
  if (titleSim > 0.8) {
    score += 0.35;
    reasons.push("Very similar event name");
  } else if (titleSim > 0.5) {
    score += 0.18;
    reasons.push("Similar event name");
  }

  // --- Date match (weight: 0.25) ---
  if (newEvent.startDate && candidate.startDate && newEvent.startDate === candidate.startDate) {
    score += 0.25;
    reasons.push("Same date");
  }

  // --- Coordinate proximity (weight: 0.20) ---
  const lat1 = newEvent.latitude != null ? parseFloat(String(newEvent.latitude)) : null;
  const lon1 = newEvent.longitude != null ? parseFloat(String(newEvent.longitude)) : null;
  const lat2 = candidate.latitude != null ? parseFloat(String(candidate.latitude)) : null;
  const lon2 = candidate.longitude != null ? parseFloat(String(candidate.longitude)) : null;

  if (lat1 != null && lon1 != null && lat2 != null && lon2 != null) {
    const distKm = haversineKm(lat1, lon1, lat2, lon2);
    if (distKm < 0.5) {
      score += 0.20;
      reasons.push("Same or very close location");
    } else if (distKm < 5) {
      score += 0.10;
      reasons.push("Nearby location");
    }
  } else {
    // Fall back to city + address text match
    if (newEvent.city && candidate.city && normalize(newEvent.city) === normalize(candidate.city)) {
      score += 0.08;
      reasons.push("Same city");
    }
    if (newEvent.address && candidate.address) {
      const addrSim = tokenSimilarity(normalize(newEvent.address), normalize(candidate.address));
      if (addrSim > 0.7) {
        score += 0.10;
        reasons.push("Similar address");
      }
    }
  }

  // --- Organizer match (weight: 0.10) ---
  if (newEvent.organizer && candidate.organizer) {
    const orgSim = tokenSimilarity(normalize(newEvent.organizer), normalize(candidate.organizer));
    if (orgSim > 0.7) {
      score += 0.10;
      reasons.push("Same organizer");
    }
  }

  // --- Time match (weight: 0.05) ---
  if (newEvent.startTime && candidate.startTime && newEvent.startTime === candidate.startTime) {
    score += 0.05;
    reasons.push("Same start time");
  }

  // --- Source URL match (weight: 0.05) ---
  if (newEvent.sourceUrl && candidate.sourceUrl && newEvent.sourceUrl === candidate.sourceUrl) {
    score += 0.05;
    reasons.push("Same source URL");
  }

  if (score < DUPLICATE_THRESHOLD) return null;

  return {
    event: candidate,
    confidenceScore: Math.min(1, score),
    matchReasons: reasons,
  };
}

/**
 * Find potential duplicates for a new or updated event.
 * Excludes the event itself (by id) and already-merged events.
 */
export async function findDuplicates(
  newEvent: Partial<Event> & { id?: number },
): Promise<DuplicateMatch[]> {
  // Fetch approved and pending events to compare against
  const candidates = await db
    .select()
    .from(eventsTable)
    .where(
      newEvent.id
        ? and(
            not(eq(eventsTable.id, newEvent.id)),
            not(eq(eventsTable.status, "rejected")),
          )
        : not(eq(eventsTable.status, "rejected")),
    )
    .limit(500);

  const matches: DuplicateMatch[] = [];

  for (const candidate of candidates) {
    const match = scoreCandidate(candidate, newEvent);
    if (match) matches.push(match);
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidenceScore - a.confidenceScore);

  return matches.slice(0, 10);
}
