# RiderGuard — Project Worklog

This is the shared handover document for RiderGuard. Each phase appends a new
section below (separated by `---`). Read previous sections before starting
new work to understand actual progress.

---
Task ID: 1
Agent: Z.ai Code (lead full-stack engineer)
Task: Build RiderGuard — production-ready AI weather safety co-pilot for delivery riders (Next.js 16 + TypeScript + Prisma + Bun).

Work Log:
- Inspected existing scaffold: placeholder page, Prisma schema with only User/Post, fresh Next.js 16 setup, full shadcn/ui component set available.
- Designed & pushed comprehensive Prisma schema (`prisma/schema.prisma`): Rider, TrackingSession, GpsPoint, Destination, HazardReport, HazardVote, SafeStop, WeatherCache, RiskAssessment. Ran `bun run db:push` successfully.
- Built deterministic risk engine (`src/lib/risk-engine.ts`) — the SINGLE SOURCE OF TRUTH. Inputs: weather (precip, wind, visibility, temp), time-of-day, hazard density, route exposure. Weighted blend → 0..100 score + level (low/moderate/high/severe) + factors + recommendation. AI may NEVER compute/override this.
- Built geo helpers (`src/lib/geo.ts`): haversine, bbox, polyline sampling, bearing.
- Built weather service (`src/lib/weather-service.ts`): Open-Meteo (free, no key), DB-backed 15-min cache, precip probability forecasting.
- Built routing service (`src/lib/routing-service.ts`): OSRM public demo + graceful straight-line fallback with 5-min memory cache.
- Built geocoding service (`src/lib/geocode-service.ts`): Nominatim (OpenStreetMap) search + reverse geocode.
- Built anonymous auth (`src/lib/auth.ts`): opaque token in httpOnly cookie, SHA-256 hashed before storage, display name like "Rider-46DF". No email/password.
- Built security layer (`src/lib/security.ts`): token-bucket rate limiter per IP, coordinate clamping, text sanitization, IP extraction.
- Built AI explanation service (`src/lib/ai-explain.ts`): z-ai-web-dev-sdk, server-side only, explains the already-computed risk with system prompt enforcing it must never recompute/override scores.
- Built 11 API routes (all `runtime = nodejs`, rate-limited, validated):
  - GET /api/rider/identity (anonymous identity bootstrap)
  - POST/PUT/DELETE /api/location/track (session + GPS points)
  - POST/GET /api/location/destination (saved searches, separate from GPS)
  - GET /api/location/destination/search (Nominatim)
  - GET /api/weather
  - GET /api/route-plan (OSRM)
  - GET /api/risk (deterministic assessment, persists RiskAssessment)
  - GET/POST /api/hazards (community reports with GPS/map-pin verification)
  - POST /api/hazards/[id]/vote (confirm/dispute lifecycle, auto-resolve at 3 disputes)
  - GET /api/safe-stops
  - GET /api/feed (location-based community intelligence)
  - POST /api/ai/explain
- Built frontend (`src/app/page.tsx`): single-page app with sticky header (logo + rider identity + theme toggle), responsive 2-column layout (map left, intelligence panels right), sticky footer.
- Built map component (`src/components/rider-map.tsx`): Leaflet + react-leaflet, dynamically imported (ssr:false), custom div-icons, current-location pulse, destination marker, route polyline, hazard markers (severity-colored), safe-stop markers, map-click-to-pin, flyTo.
- Built panel components: RiskDashboard, WeatherCard, DestinationSearch (debounced), GpsControls, HazardReportForm, CommunityFeed (voting), SafeStopsList, AiExplanationPanel, ThemeProvider.
- Seeded DB (`src/lib/seed.ts`): 8 safe stops + 4 demo hazards around Bengaluru. Ran successfully.
- Switched Prisma logging to warn/error only (was flooding dev.log with query SQL).
- Updated layout: RiderGuard metadata/viewport, ThemeProvider, Sonner toaster (richColors).

Verification (agent-browser E2E):
- `bun run lint` → clean, 0 errors.
- `bunx tsc --noEmit` → 0 errors in project code (only pre-existing errors in examples/ & skills/ folders which are not part of this app).
- Dev server running on :3000, all routes 200, no 500s, no runtime/hydration errors.
- agent-browser golden path verified end-to-end:
  1. Page renders cleanly (no blank screen, no hydration crash).
  2. Rider identity auto-created (Rider-46DF, ★0 reputation) via httpOnly cookie.
  3. "Find me" GPS → located Bengaluru (12.97190, 77.64120, ±25m).
  4. Destination search "MG Road Bangalore" → 8 Nominatim results; selected one.
  5. Deterministic risk computed: score 9/100 → 🟢 Low Risk. Factors: Weather +4 (89% rain chance), Road hazards +3 (2 active nearby), Time of day +2 (dusk glare), Route exposure +0. Recommendation shown.
  6. Weather card: 22°C feels 25°C, Partly cloudy, Night, 0.0mm rain/89% prob, wind 3km/h gust 10, vis 7.3km.
  7. "Ask AI co-pilot" → 2.2s response explaining risk + 3 tailored tips + disclaimer that deterministic score is source of truth.
  8. Hazard report submitted ("Reported!" + toast).
  9. Vote confirm on hazard → count 0→1, status "active", toast "Vote recorded".
  10. Community feed shows 4 seeded hazards + 4 safe stops; map shows all markers (🕳️🏗️🌑 hazards, ☕🏠🚻 safe stops, 📍 destination).
- VLM screenshot review: UI rated "exceptionally clean and professional", "no visible visual issues, overlapping elements, or broken styling".
- Mobile (390×844) + desktop responsive verified; sticky footer via `min-h-screen flex flex-col` + `mt-auto`.

Stage Summary:
- RiderGuard is a production-ready, fully-functional AI weather safety co-pilot.
- Architecture: deterministic risk engine = source of truth; AI explains only (enforced via system prompt + code contract).
- All 10 build priorities from the master prompt addressed: location intelligence, backend production setup, security hardening, route intelligence, hazard reporting (with lifecycle + voting), rider network, safe stops, UI polish, and verified via agent-browser.
- Stack used: Next.js 16 App Router, TypeScript, Prisma+SQLite, Tailwind 4 + shadcn/ui, Leaflet+OpenStreetMap, Open-Meteo weather, OSRM routing, Nominatim geocoding, z-ai-web-dev-sdk LLM, Sonner toasts, next-themes.

Known Limitations / Risks:
- OSRM public demo server is rate-limited and occasionally slow from sandbox → routing gracefully falls back to straight-line (haversine) with 25 km/h estimate. For production, swap to a self-hosted OSRM or a paid routing provider (e.g. Valhalla, GraphHopper) for true two-wheeler routing.
- SQLite is used for dev DB; for production scale, migrate to PostgreSQL (schema is provider-agnostic except `String` JSON columns which work on both).
- Rate limiter is in-memory (per-instance); swap for Redis in multi-instance deployments.
- Image uploads for hazard reports: API accepts an imageUrl path but no upload endpoint yet (Phase 2 work).
- No automated test suite yet (unit/E2E) — Phase 2 priority.

Priority Recommendations for Next Phase:
1. Add hazard image upload endpoint (multipart → local /download dir, validate type+size).
2. Add automated tests: unit tests for risk-engine.ts (deterministic inputs→outputs), API tests for hazards/vote lifecycle, Playwright E2E for golden path.
3. Upgrade routing to self-hosted OSRM or Valhalla for two-wheeler-friendly turn-by-turn routes.
4. Add weather sampling along full route polyline (currently samples midpoint only).
5. Add rider reputation leaderboard + moderator dashboard for hazard moderation.
6. Add PWA manifest + service worker for offline-capable mobile use by delivery riders.
7. Add WebSocket mini-service for real-time hazard push to active riders.

Files changed (key):
- prisma/schema.prisma (full RiderGuard schema)
- src/lib/{risk-engine,geo,weather-service,routing-service,geocode-service,auth,security,ai-explain,api,types,api-client,seed}.ts
- src/app/api/** (11 route files)
- src/app/layout.tsx, src/app/page.tsx
- src/components/{rider-map,risk-dashboard,weather-card,destination-search,gps-controls,hazard-report-form,community-feed,safe-stops-list,ai-explanation-panel,theme-provider}.tsx
