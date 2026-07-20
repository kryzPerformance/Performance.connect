import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventSourcesTable = pgTable(
  "event_sources",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(), // instagram | facebook | website | api | manual
    url: text("url"),
    active: boolean("active").default(true).notNull(),
    lastCheckedAt: timestamp("last_checked_at"),
    eventsFound: integer("events_found").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_sources_type_idx").on(table.type),
    index("event_sources_active_idx").on(table.active),
  ],
);

export const insertEventSourceSchema = createInsertSchema(eventSourcesTable).omit({
  id: true,
  createdAt: true,
  lastCheckedAt: true,
  eventsFound: true,
});
export const selectEventSourceSchema = createSelectSchema(eventSourcesTable);

export type InsertEventSource = z.infer<typeof insertEventSourceSchema>;
export type EventSource = typeof eventSourcesTable.$inferSelect;
