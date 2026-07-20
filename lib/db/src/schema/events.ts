import {
  pgTable,
  serial,
  text,
  boolean,
  numeric,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),

    // Core info
    title: text("title").notNull(),
    description: text("description"),
    organizer: text("organizer"),

    // Source tracking
    source: text("source").notNull().default("community"), // community | organizer | discovery | manual
    sourceUrl: text("source_url"),

    // Media
    flyerUrl: text("flyer_url"),

    // Location
    venueName: text("venue_name"),
    address: text("address"),
    city: text("city"),
    province: text("province"),
    country: text("country").default("Canada"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),

    // Time
    startDate: text("start_date"),
    endDate: text("end_date"),
    startTime: text("start_time"),
    endTime: text("end_time"),
    rainDate: text("rain_date"),

    // Event metadata — stored as JSONB arrays
    categories: jsonb("categories").$type<string[]>().default([]),
    vehicleTypes: jsonb("vehicle_types").$type<string[]>().default([]),
    sponsors: jsonb("sponsors").$type<string[]>().default([]),

    // Fees & features
    entryFee: text("entry_fee"),
    isCharityEvent: boolean("is_charity_event").default(false),
    hasFoodVendors: boolean("has_food_vendors").default(false),
    hasBurnoutContest: boolean("has_burnout_contest").default(false),
    hasDyno: boolean("has_dyno").default(false),

    // Contact
    contactInfo: text("contact_info"),

    // Moderation
    status: text("status").notNull().default("pending"), // pending | approved | rejected | duplicate
    featured: boolean("featured").default(false),
    rejectionReason: text("rejection_reason"),

    // AI metadata
    aiConfidenceScore: numeric("ai_confidence_score", { precision: 5, scale: 4 }),

    // Duplicate tracking
    duplicateOfId: integer("duplicate_of_id"),

    // Discovery source reference
    discoverySourceId: integer("discovery_source_id"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("events_status_idx").on(table.status),
    index("events_city_idx").on(table.city),
    index("events_province_idx").on(table.province),
    index("events_start_date_idx").on(table.startDate),
    index("events_featured_idx").on(table.featured),
  ],
);

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectEventSchema = createSelectSchema(eventsTable);

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
