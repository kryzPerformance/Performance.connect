# Performance Connect – Event Intelligence Engine

Canada's premier automotive event discovery platform. Community submissions, organizer events, and auto-discovered events flow through an AI-powered moderation pipeline before being published to the public events board.

## Run & Operate

- `pnpm --filter @workspace/performance-connect run dev` — frontend (port auto-assigned, preview at `/`)
- `pnpm --filter @workspace/api-server run dev` — API server (port auto-assigned, preview at `/api`)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm run typecheck` — full typecheck across all packages
- After any `lib/*` change: run `pnpm run typecheck:libs` before leaf checks

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter routing, TanStack Query, Tailwind CSS v4, shadcn/ui
- Maps: Leaflet + react-leaflet with OpenStreetMap tiles (no API key required)
- Backend: Express 5, Drizzle ORM, PostgreSQL
- AI Flyer Parser: OpenAI gpt-4o Vision (`OPENAI_API_KEY` env var)
- Geocoding: OpenStreetMap Nominatim (abstracted behind `GeocodingProvider` interface)
- API codegen: Orval (OpenAPI → React Query hooks + Zod schemas)

## Where Things Live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/events.ts` — events table (all fields, JSONB arrays for categories/vehicleTypes/sponsors)
- `lib/db/src/schema/event_sources.ts` — discovery sources table
- `artifacts/api-server/src/routes/events.ts` — events CRUD + moderation endpoints
- `artifacts/api-server/src/routes/flyer.ts` — AI flyer parsing endpoint
- `artifacts/api-server/src/routes/sources.ts` — discovery sources CRUD
- `artifacts/api-server/src/routes/geocode.ts` — geocoding endpoint
- `artifacts/api-server/src/services/geocoding.ts` — Nominatim provider (swap here for Google Maps/Mapbox)
- `artifacts/api-server/src/services/flyer-parser.ts` — OpenAI Vision flyer extraction
- `artifacts/api-server/src/services/duplicate-detection.ts` — multi-signal duplicate scoring
- `artifacts/performance-connect/src/` — React frontend (pages + components)

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Public event browser — list/map toggle, Leaflet map, province/category/search filters |
| `/events/:id` | Event detail with full info and location map |
| `/submit` | Community submission — flyer upload (AI parse) or manual form |
| `/admin` | Moderator dashboard — pending queue, approve/reject/merge/edit |
| `/admin/sources` | Discovery sources management |
| `/admin/stats` | Platform statistics with recharts charts |

## Architecture Decisions

- **API-first**: OpenAPI spec gates all frontend work via codegen — never hand-write API types
- **Geocoding abstracted**: `GeocodingProvider` interface in `geocoding.ts` — swap Nominatim → Google Maps → Mapbox by changing one file
- **Leaflet only**: No Google Maps JS API required; consistent with the existing Affiliates map
- **JSONB for arrays**: `categories`, `vehicleTypes`, `sponsors` stored as Postgres JSONB — flexible for future schema evolution
- **Duplicate detection**: Multi-signal scoring (title similarity, date, coordinates, organizer, time, source URL) — never auto-publishes duplicates
- **Modular connectors**: `event_sources` table + discovery framework designed so new connectors (Instagram, Facebook, websites) can be plugged in without changing core architecture
- **Status pipeline**: `pending → approved | rejected | duplicate` — all submissions land in `pending` and require moderator action

## Required Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)
- `OPENAI_API_KEY` — For AI flyer parsing (Vision API)
- `SESSION_SECRET` — Express session secret

## Future Ready

The architecture is designed to add without refactoring:
- Push notifications / email alerts
- Organizer dashboard with analytics
- Paid featured events
- RSVP + check-in system
- Weather integration, calendar sync (Apple/Google)
- Country expansion + multi-language
- AI popularity score, attendance prediction

## Gotchas

- Always run `pnpm run typecheck:libs` after changing anything in `lib/*` — leaf packages see stale declarations otherwise
- Nominatim has a 1 req/sec rate limit — do not batch geocoding calls rapidly
- Leaflet marker icons need the `_getIconUrl` delete hack — already done in map components
- OpenAPI body schema names must be entity-shaped (e.g. `EventInput`) not operation-shaped (e.g. `CreateEventBody`) — Orval collision rule

## User Preferences

- Use Leaflet + OpenStreetMap/Nominatim for all maps (no Google Maps JS API)
- Geocoding interface must be swappable (Google Maps / Mapbox in future) without changing callers
- Do not tightly couple event engine to any single platform/source
