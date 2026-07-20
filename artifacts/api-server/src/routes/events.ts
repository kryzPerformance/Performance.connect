import { Router } from "express";
import { eq, and, or, ilike, sql, not, desc } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import { findDuplicates } from "../services/duplicate-detection";
import { geocodingService } from "../services/geocoding";
import {
  ListEventsQueryParams,
  CreateEventBody,
  ListUpcomingEventsQueryParams,
  ListNearbyEventsQueryParams,
  GetEventParams,
  UpdateEventBody,
  UpdateEventParams,
  DeleteEventParams,
  ApproveEventParams,
  RejectEventParams,
  RejectEventBody,
  MergeEventsParams,
  MergeEventsBody,
  GetEventDuplicatesParams,
} from "@workspace/api-zod";

const router = Router();

// -------------------------------------------------------------------
// GET /events  — list approved events with filters
// -------------------------------------------------------------------
router.get("/events", async (req, res) => {
  const parsed = ListEventsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const {
    city,
    province,
    country,
    category,
    vehicleType,
    search,
    featured,
    limit = 50,
    offset = 0,
  } = parsed.data;

  const conditions = [eq(eventsTable.status, "approved")];

  if (city) conditions.push(ilike(eventsTable.city, `%${city}%`));
  if (province) conditions.push(ilike(eventsTable.province, `%${province}%`));
  if (country) conditions.push(ilike(eventsTable.country, `%${country}%`));
  if (featured !== undefined) conditions.push(eq(eventsTable.featured, featured));
  if (search) {
    conditions.push(
      or(
        ilike(eventsTable.title, `%${search}%`),
        ilike(eventsTable.description, `%${search}%`),
        ilike(eventsTable.venueName, `%${search}%`),
        ilike(eventsTable.city, `%${search}%`),
      )!,
    );
  }
  if (category) {
    conditions.push(
      sql`${eventsTable.categories}::text ilike ${"%" + category + "%"}`,
    );
  }
  if (vehicleType) {
    conditions.push(
      sql`${eventsTable.vehicleTypes}::text ilike ${"%" + vehicleType + "%"}`,
    );
  }

  const where = and(...conditions);

  const [events, countResult] = await Promise.all([
    db
      .select()
      .from(eventsTable)
      .where(where)
      .orderBy(desc(eventsTable.startDate), desc(eventsTable.createdAt))
      .limit(Number(limit))
      .offset(Number(offset)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(eventsTable)
      .where(where),
  ]);

  res.json({ events, total: countResult[0]?.count ?? 0 });
});

// -------------------------------------------------------------------
// GET /events/upcoming
// -------------------------------------------------------------------
router.get("/events/upcoming", async (req, res) => {
  const parsed = ListUpcomingEventsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const { days = 30, limit = 20 } = parsed.data;

  const events = await db
    .select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.status, "approved"),
        sql`${eventsTable.startDate} >= current_date`,
        sql`${eventsTable.startDate} <= current_date + interval '${sql.raw(String(days))} days'`,
      ),
    )
    .orderBy(eventsTable.startDate)
    .limit(Number(limit));

  res.json(events);
});

// -------------------------------------------------------------------
// GET /events/nearby
// -------------------------------------------------------------------
router.get("/events/nearby", async (req, res) => {
  const parsed = ListNearbyEventsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const { lat, lng, radiusKm = 100, limit = 20 } = parsed.data;

  // Haversine approximation in SQL (using Earth radius 6371 km)
  const distanceExpr = sql<number>`
    6371 * acos(
      cos(radians(${lat})) * cos(radians(${eventsTable.latitude}::float))
      * cos(radians(${eventsTable.longitude}::float) - radians(${lng}))
      + sin(radians(${lat})) * sin(radians(${eventsTable.latitude}::float))
    )
  `;

  const events = await db
    .select({
      id: eventsTable.id,
      title: eventsTable.title,
      description: eventsTable.description,
      organizer: eventsTable.organizer,
      source: eventsTable.source,
      sourceUrl: eventsTable.sourceUrl,
      flyerUrl: eventsTable.flyerUrl,
      venueName: eventsTable.venueName,
      address: eventsTable.address,
      city: eventsTable.city,
      province: eventsTable.province,
      country: eventsTable.country,
      latitude: eventsTable.latitude,
      longitude: eventsTable.longitude,
      startDate: eventsTable.startDate,
      endDate: eventsTable.endDate,
      startTime: eventsTable.startTime,
      endTime: eventsTable.endTime,
      rainDate: eventsTable.rainDate,
      categories: eventsTable.categories,
      vehicleTypes: eventsTable.vehicleTypes,
      sponsors: eventsTable.sponsors,
      entryFee: eventsTable.entryFee,
      isCharityEvent: eventsTable.isCharityEvent,
      hasFoodVendors: eventsTable.hasFoodVendors,
      hasBurnoutContest: eventsTable.hasBurnoutContest,
      hasDyno: eventsTable.hasDyno,
      contactInfo: eventsTable.contactInfo,
      status: eventsTable.status,
      featured: eventsTable.featured,
      aiConfidenceScore: eventsTable.aiConfidenceScore,
      rejectionReason: eventsTable.rejectionReason,
      createdAt: eventsTable.createdAt,
      updatedAt: eventsTable.updatedAt,
      duplicateOfId: eventsTable.duplicateOfId,
      discoverySourceId: eventsTable.discoverySourceId,
      distanceKm: distanceExpr,
    })
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.status, "approved"),
        sql`${eventsTable.latitude} is not null`,
        sql`${eventsTable.longitude} is not null`,
        sql`${distanceExpr} <= ${radiusKm}`,
      ),
    )
    .orderBy(distanceExpr)
    .limit(Number(limit));

  res.json(events);
});

// -------------------------------------------------------------------
// GET /events/stats
// -------------------------------------------------------------------
router.get("/events/stats", async (req, res) => {
  const [counts, byProvince, byCategory, recentlyAdded, upcomingThisMonth] =
    await Promise.all([
      db
        .select({
          status: eventsTable.status,
          count: sql<number>`count(*)::int`,
        })
        .from(eventsTable)
        .groupBy(eventsTable.status),

      db
        .select({
          province: eventsTable.province,
          count: sql<number>`count(*)::int`,
        })
        .from(eventsTable)
        .where(
          and(
            eq(eventsTable.status, "approved"),
            sql`${eventsTable.province} is not null`,
          ),
        )
        .groupBy(eventsTable.province)
        .orderBy(desc(sql`count(*)`))
        .limit(15),

      db.execute<{ category: string; count: number }>(sql`
        SELECT cat as category, count(*)::int as count
        FROM events, jsonb_array_elements_text(categories) as cat
        WHERE status = 'approved'
        GROUP BY cat
        ORDER BY count DESC
        LIMIT 15
      `),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventsTable)
        .where(
          sql`${eventsTable.createdAt} >= now() - interval '7 days'`,
        ),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventsTable)
        .where(
          and(
            eq(eventsTable.status, "approved"),
            sql`${eventsTable.startDate} >= date_trunc('month', current_date)`,
            sql`${eventsTable.startDate} < date_trunc('month', current_date) + interval '1 month'`,
          ),
        ),
    ]);

  const statusMap: Record<string, number> = {};
  for (const row of counts) {
    if (row.status) statusMap[row.status] = row.count;
  }

  res.json({
    totalEvents: Object.values(statusMap).reduce((a, b) => a + b, 0),
    pendingCount: statusMap["pending"] ?? 0,
    approvedCount: statusMap["approved"] ?? 0,
    rejectedCount: statusMap["rejected"] ?? 0,
    duplicateCount: statusMap["duplicate"] ?? 0,
    featuredCount: await db
      .select({ count: sql<number>`count(*)::int` })
      .from(eventsTable)
      .where(eq(eventsTable.featured, true))
      .then((r) => r[0]?.count ?? 0),
    eventsByProvince: byProvince
      .filter((r) => r.province)
      .map((r) => ({ province: r.province!, count: r.count })),
    eventsByCategory: (byCategory.rows as { category: string; count: number }[]).map((r) => ({
      category: r.category,
      count: Number(r.count),
    })),
    recentlyAdded: recentlyAdded[0]?.count ?? 0,
    upcomingThisMonth: upcomingThisMonth[0]?.count ?? 0,
  });
});

// -------------------------------------------------------------------
// GET /events/pending  — moderator queue
// -------------------------------------------------------------------
router.get("/events/pending", async (req, res) => {
  const parsed = ListEventsQueryParams.safeParse(req.query);
  const limit = Number(req.query["limit"] ?? 50);
  const offset = Number(req.query["offset"] ?? 0);

  const [events, countResult] = await Promise.all([
    db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.status, "pending"))
      .orderBy(desc(eventsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(eventsTable)
      .where(eq(eventsTable.status, "pending")),
  ]);

  // Augment each event with duplicate info
  const enriched = await Promise.all(
    events.map(async (event) => {
      const dupes = await findDuplicates(event);
      return {
        ...event,
        duplicateWarning: dupes.length > 0,
        duplicateCount: dupes.length,
        sourceLabel:
          event.source === "community"
            ? "Community Submission"
            : event.source === "organizer"
              ? "Organizer"
              : event.source === "discovery"
                ? "Auto-Discovered"
                : "Manual",
      };
    }),
  );

  res.json({ events: enriched, total: countResult[0]?.count ?? 0 });
});

// -------------------------------------------------------------------
// GET /events/:id
// -------------------------------------------------------------------
router.get("/events/:id", async (req, res) => {
  const parsed = GetEventParams.safeParse({ id: Number(req.params["id"]) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const [event] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, parsed.data.id))
    .limit(1);

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(event);
});

// -------------------------------------------------------------------
// POST /events  — create / submit event
// -------------------------------------------------------------------
router.post("/events", async (req, res) => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  const data = parsed.data;

  // Auto-geocode if address info present but no coords
  let latitude = data.latitude;
  let longitude = data.longitude;
  let city = data.city;
  let province = data.province;
  let country = data.country;

  if (!latitude || !longitude) {
    const geo = await geocodingService.geocode({
      address: data.address,
      city: data.city,
      province: data.province,
      country: data.country ?? "Canada",
    });
    if (geo.success) {
      latitude = geo.latitude ?? undefined;
      longitude = geo.longitude ?? undefined;
      city = geo.normalizedCity ?? data.city;
      province = geo.normalizedProvince ?? data.province;
      country = geo.normalizedCountry ?? data.country;
    }
  }

  const [event] = await db
    .insert(eventsTable)
    .values({
      ...data,
      latitude: latitude != null ? String(latitude) : undefined,
      longitude: longitude != null ? String(longitude) : undefined,
      city,
      province,
      country,
      status: "pending",
      categories: data.categories ?? [],
      vehicleTypes: data.vehicleTypes ?? [],
      sponsors: data.sponsors ?? [],
    })
    .returning();

  res.status(201).json(event);
});

// -------------------------------------------------------------------
// PATCH /events/:id
// -------------------------------------------------------------------
router.patch("/events/:id", async (req, res) => {
  const idParsed = UpdateEventParams.safeParse({ id: Number(req.params["id"]) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const bodyParsed = UpdateEventBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const data = bodyParsed.data;
  const { latitude, longitude, ...rest } = data;

  const [updated] = await db
    .update(eventsTable)
    .set({
      ...rest,
      ...(latitude != null ? { latitude: String(latitude) } : {}),
      ...(longitude != null ? { longitude: String(longitude) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(eventsTable.id, idParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(updated);
});

// -------------------------------------------------------------------
// DELETE /events/:id
// -------------------------------------------------------------------
router.delete("/events/:id", async (req, res) => {
  const parsed = DeleteEventParams.safeParse({ id: Number(req.params["id"]) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  await db.delete(eventsTable).where(eq(eventsTable.id, parsed.data.id));
  res.status(204).send();
});

// -------------------------------------------------------------------
// POST /events/:id/approve
// -------------------------------------------------------------------
router.post("/events/:id/approve", async (req, res) => {
  const parsed = ApproveEventParams.safeParse({ id: Number(req.params["id"]) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const [updated] = await db
    .update(eventsTable)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(eventsTable.id, parsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(updated);
});

// -------------------------------------------------------------------
// POST /events/:id/reject
// -------------------------------------------------------------------
router.post("/events/:id/reject", async (req, res) => {
  const idParsed = RejectEventParams.safeParse({ id: Number(req.params["id"]) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const bodyParsed = RejectEventBody.safeParse(req.body ?? {});
  const reason = bodyParsed.success ? (bodyParsed.data.reason ?? null) : null;

  const [updated] = await db
    .update(eventsTable)
    .set({
      status: "rejected",
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(eventsTable.id, idParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(updated);
});

// -------------------------------------------------------------------
// POST /events/:id/merge
// -------------------------------------------------------------------
router.post("/events/:id/merge", async (req, res) => {
  const idParsed = MergeEventsParams.safeParse({ id: Number(req.params["id"]) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const bodyParsed = MergeEventsBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  // Mark the incoming event as duplicate of the target
  const [updated] = await db
    .update(eventsTable)
    .set({
      status: "duplicate",
      duplicateOfId: bodyParsed.data.targetEventId,
      updatedAt: new Date(),
    })
    .where(eq(eventsTable.id, idParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(updated);
});

// -------------------------------------------------------------------
// GET /events/:id/duplicates
// -------------------------------------------------------------------
router.get("/events/:id/duplicates", async (req, res) => {
  const parsed = GetEventDuplicatesParams.safeParse({ id: Number(req.params["id"]) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const [event] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, parsed.data.id))
    .limit(1);

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const matches = await findDuplicates(event);
  res.json(matches);
});

export default router;
