# LogicTravel Pro (MERN) - Master Implementation Plan

## 1. Objective and Delivery Standard

Build a deterministic, high-precision itinerary builder inside CRM (`/sales/itinerary-builder`) using geospatial logic, operating-hour constraints, and repeatable scheduling algorithms.

This plan is written for implementation quality where:
- Logic correctness is higher priority than UI polish.
- Every backend decision is testable and deterministic.
- No generative AI is used for schedule decisions.
- Data model, API contracts, and rollout gates are explicit.

---

## 2. Scope

### In Scope
- Admin-managed Golden Database of places.
- Agent-facing drag-and-drop itinerary builder.
- Deterministic validation and autoscheduling engine.
- Geospatial distance/time computation with fallback.
- Day-wise timeline + map synchronization.
- Validation warnings and scheduling conflicts surfaced in UI.
- Full audit trail for major scheduling actions.

### Out of Scope (Phase 1)
- Customer-facing traveler app.
- Dynamic vendor availability from external systems.
- AI-generated suggestions/text descriptions.
- Payments and invoicing workflow.

---

## 3. Final Collection Plan (Required)

### Total Collections Required for V1: **7**

1. `places`
2. `trips`
3. `trip_versions`
4. `route_cache`
5. `place_closures`
6. `logic_run_logs`
7. `itinerary_builder_settings`

### Existing Shared Collection (Reference Only, Not Owned by this module)
- `users` (already exists in your auth/user domain; referenced by `userId`, `createdBy`, `updatedBy`)

### Why 7 Collections
- `places` and `trips` are core runtime entities.
- `trip_versions` gives safe rollback/history for enterprise operations.
- `route_cache` removes repeated OSRM requests and improves performance.
- `place_closures` handles one-off closures (holidays, temporary shutdowns) without mutating base place rules.
- `logic_run_logs` provides traceability for scheduling decisions.
- `itinerary_builder_settings` centralizes configurable logic defaults.

---

## 4. Collection Specifications

## 4.1 `places` (Golden Database)

Primary schema is exactly your provided `Place` schema with GeoJSON point.

Required indexes:
- `location: 2dsphere` (critical)
- `{ category: 1, name: 1 }`
- `{ isActive: 1, category: 1 }` (if using active flag)

Operational rules:
- Coordinates always saved as `[longitude, latitude]`.
- Enforce uniqueness by `(name, normalized coordinates)` at service layer.
- Use admin-only CRUD.

## 4.2 `trips`

Primary schema is exactly your provided `Trip` schema with embedded `days.events`.

Additional operational constraints (service/controller layer):
- `days.dayIndex` unique within trip.
- `events.order` contiguous integer sequence per day.
- `startDate <= endDate`.

Recommended indexes:
- `{ userId: 1, status: 1, startDate: -1 }`
- `{ "days.date": 1 }`

## 4.3 `trip_versions`

Purpose: immutable snapshots when day schedule changes materially.

Fields:
- `tripId: ObjectId`
- `version: Number` (monotonic)
- `snapshot: Mixed` (complete trip/day JSON)
- `reason: String` (`AUTO_SCHEDULE`, `MANUAL_REORDER`, `ADMIN_FIX`, etc.)
- `createdBy: ObjectId`
- `createdAt: Date`

Indexes:
- `{ tripId: 1, version: -1 }`

## 4.4 `route_cache`

Purpose: cache logistics between two points for deterministic repeat calls.

Fields:
- `originHash: String`
- `destinationHash: String`
- `distanceKm: Number`
- `travelTimeMin: Number`
- `provider: String` (`OSRM`, `HAVERSINE`)
- `computedAt: Date`
- `expiresAt: Date`

Indexes:
- `{ originHash: 1, destinationHash: 1 }` unique
- TTL index on `expiresAt`

## 4.5 `place_closures`

Purpose: date-specific closure overrides.

Fields:
- `placeId: ObjectId`
- `date: Date`
- `reason: String`
- `isClosedFullDay: Boolean`
- `closedRanges: [{ startTime: "HH:mm", endTime: "HH:mm" }]`
- `createdBy: ObjectId`

Indexes:
- `{ placeId: 1, date: 1 }`

## 4.6 `logic_run_logs`

Purpose: explainability for support/debug.

Fields:
- `tripId: ObjectId`
- `dayIndex: Number`
- `triggeredBy: ObjectId`
- `triggerType: String` (`DRAG_DROP`, `SAVE_DAY`, `RECALC_ALL`)
- `inputEventCount: Number`
- `outputEventCount: Number`
- `warnings: [String]`
- `errors: [String]`
- `timingsMs: { validate: Number, route: Number, schedule: Number, total: Number }`
- `createdAt: Date`

Indexes:
- `{ tripId: 1, createdAt: -1 }`

## 4.7 `itinerary_builder_settings`

Purpose: central config without code deploy.

Fields:
- `key: String` (unique)
- `value: Mixed`
- `description: String`
- `updatedBy: ObjectId`
- `updatedAt: Date`

Required keys:
- `day_start_time` (default `09:00`)
- `default_transition_buffer_min` (default `10`)
- `route_cache_ttl_hours` (default `168`)
- `logic_timezone` (default `Asia/Kolkata`)

---

## 5. System Architecture (Target)

## 5.1 Frontend (Vite + React + TypeScript)

Route entry inside CRM:
- `/sales/itinerary-builder`
- `/sales/itinerary-builder/:tripId/builder`
- `/sales/itinerary-builder/places` (admin)

Core modules:
- `src/pages/itinerary-builder/TripBuilder.tsx`
- `src/components/inventory/InventoryList.tsx`
- `src/components/timeline/DayTimeline.tsx`
- `src/components/map/TripMap.tsx`
- `src/store/useTripStore.ts` (Zustand)
- `src/services/logicApi.ts`

Libraries:
- DnD: `@dnd-kit/core`, `@dnd-kit/sortable`
- Map: `react-leaflet`
- Validation: `zod`

## 5.2 Backend (Node + Express + Mongoose)

Core modules:
- `server/models/Place.ts`
- `server/models/Trip.ts`
- `server/models/TripVersion.ts`
- `server/models/RouteCache.ts`
- `server/models/PlaceClosure.ts`
- `server/models/LogicRunLog.ts`
- `server/services/LogicService.ts`
- `server/controllers/logicController.ts`
- `server/routes/logic.ts`

Non-functional constraints:
- All logic service methods are pure where possible.
- Controllers only orchestrate auth + validation + service calls.
- No schedule computation inside controllers.

---

## 6. Backend API Contract Plan

## 6.1 Place Management (Admin)
- `POST /api/places`
- `GET /api/places`
- `GET /api/places/:id`
- `PUT /api/places/:id`
- `DELETE /api/places/:id`

Filters:
- `category`, `search`, `near=[lon,lat]`, `radiusKm`, `isActive`

## 6.2 Trip Management (Agent)
- `POST /api/trips`
- `GET /api/trips`
- `GET /api/trips/:id`
- `PUT /api/trips/:id`
- `PUT /api/trips/:id/days/:dayIndex`
- `POST /api/trips/:id/auto-schedule-day/:dayIndex`
- `POST /api/trips/:id/recalculate-all`

## 6.3 Logic Engine Endpoints
- `POST /api/logic/validate`
- `POST /api/logic/route`
- `POST /api/logic/auto-schedule-day`
- `POST /api/logic/reorder-and-recalculate`

## 6.4 Response Standards

Success envelope:
```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Validation failure envelope:
```json
{
  "success": false,
  "code": "CLOSED_AT_TIME",
  "message": "Place is closed at selected time",
  "details": {}
}
```

---

## 7. Logic Engine Specification

## 7.1 `validateEvent(place, date, time)`

Inputs:
- `place`: place object
- `date`: JS Date
- `time`: `HH:mm`

Processing order:
1. Day check against `closedDays`.
2. Date override check from `place_closures`.
3. Time range check (`opensAt`, `closesAt`) using minute arithmetic.
4. Duration fit check (`input + avgDurationMin <= closesAt`).

Outputs:
- `{ valid: true }`
- or `{ valid: false, reason: "CLOSED_ON_DAY" | "CLOSED_AT_TIME" | "CLOSED_SPECIAL_DATE" | "DURATION_EXCEEDS_WINDOW" }`

## 7.2 `calculateLogistics(origin, destination)`

Inputs:
- Two coordinate arrays in `[lon, lat]`

Flow:
1. Normalize and hash pair for `route_cache` lookup.
2. If cached and not expired, return cached.
3. Try OSRM first.
4. If OSRM fails/timeouts, fallback to geolib Haversine.
5. Save result in `route_cache`.

Output:
- `{ distanceKm, travelTimeMin, provider }`

## 7.3 `autoScheduleDay(events[])`

Deterministic rules:
- Sort by `order` ascending.
- Event 0 starts at configured `day_start_time` (default `09:00`).
- Each next event starts at `previous.endTime + travel + buffer`.
- End time is `start + avgDurationMin`.
- Validate every event after each assignment.
- Mark invalid events with explicit reason; do not silently drop.

Output:
- updated `events[]` with `startTime`, `endTime`, `travelTimeMin`, `distanceKm`, `validationStatus`, `validationReason`.

## 7.4 Determinism Rules
- Same input payload must produce same output.
- No randomization.
- No clock-based branching except explicit date passed by client.

---

## 8. Frontend Detailed Plan

## 8.1 Builder UX Layout

3-pane desktop layout:
- Left: inventory (`places` filters/search)
- Center: day timeline canvas with sortable cards
- Right: map with route polyline + leg details

Mobile behavior:
- Tabbed pane switching (`Inventory | Timeline | Map`)
- Sticky action bar (`Save`, `Recalculate`, `Validate`)

## 8.2 Zustand Store Shape

```ts
interface TripState {
  currentTrip: Trip | null;
  activeDayIndex: number;
  days: TripDay[];
  inventory: Place[];
  loading: boolean;
  dirty: boolean;
  addEvent: (dayIndex: number, place: Place) => void;
  reorderEvents: (dayIndex: number, activeId: string, overId: string) => void;
  updateEventTimes: (dayIndex: number, events: ItineraryEvent[]) => void;
  markValidation: (dayIndex: number, eventId: string, reason?: string) => void;
  hydrateTrip: (trip: Trip) => void;
  reset: () => void;
}
```

## 8.3 Drag and Drop Lifecycle

1. User drags place from inventory to timeline day.
2. Store applies optimistic insert.
3. UI calls `POST /api/logic/reorder-and-recalculate`.
4. Backend returns authoritative schedule.
5. Store reconciles returned events.
6. If error, rollback optimistic update and show toast.

## 8.4 Warning and Conflict UI
- Invalid card border: red.
- Validation badge on card (`Closed`, `Outside hours`, `Duration overflow`).
- Timeline gutter markers for conflict time slots.
- Conflict list panel with one-click jump to event.

---

## 9. Security, RBAC, and Audit

Roles:
- `admin`: full place + closure + settings management.
- `agent`: trip create/edit, no place master edits.

Audit events (minimum):
- place created/updated/deleted
- special closure added/removed
- trip day autoscheduled
- trip status changed

All audit writes must include:
- user id
- timestamp
- entity id
- before/after summary

---

## 10. Performance and Reliability Targets

Targets (Phase 1 production):
- Day autoschedule API p95 < 1200 ms for 15 events/day.
- Route calc API p95 < 500 ms with warm cache.
- Builder initial load < 2.5 s on broadband.
- Drag action to updated timeline < 700 ms perceived (optimistic UI).

Reliability:
- OSRM failure should not block scheduling (fallback mandatory).
- All logic endpoints must return structured error codes.

---

## 11. Testing Strategy

## 11.1 Unit Tests
- time parsing and arithmetic edge cases
- `validateEvent` matrix by day/time/duration
- `calculateLogistics` fallback behavior
- `autoScheduleDay` ordering and deterministic outputs

## 11.2 Integration Tests
- trip day save triggers autoschedule
- route cache hit/miss behavior
- invalid place closure detection
- RBAC restrictions by endpoint

## 11.3 E2E Tests
- admin creates place with coordinates
- agent drag-drop schedules day
- conflict appears visually when invalid
- save + reload preserves computed timeline

## 11.4 Test Data
- Seed at least 30 places across 3 cities.
- Include mixed operating hours and closed days.
- Include 5 problematic places (short window, frequent closures).

---

## 12. Delivery Phases and Milestones

## Phase 0 - Foundation and Guardrails (3-4 days)

Deliverables:
- Feature flag `ENABLE_LOGICTRAVEL_PRO`
- New code folders for models/services/routes
- Lint/test baseline for new module

Acceptance:
- App builds and runs with feature flag disabled/enabled.
- No dependency conflicts with existing CRM modules.

## Phase 1 - Data Layer and Indexing (4-5 days)

Deliverables:
- Implement `Place` and `Trip` schemas exactly as mandated.
- Implement additional 5 support collections.
- Create all required indexes (including `2dsphere`).
- Seed script for realistic places.

Acceptance:
- `places` has valid GeoJSON data and geospatial queries work.
- `trips` write/read with embedded `days.events` works.
- Index verification script passes.

## Phase 2 - Core Logic Service (6-8 days)

Deliverables:
- `validateEvent`, `calculateLogistics`, `autoScheduleDay`.
- Fallback logic from OSRM to Haversine.
- deterministic schedule output contract.

Acceptance:
- Unit test coverage >= 90% for logic service.
- Same input snapshot gives byte-equivalent output.

## Phase 3 - Logic APIs + Trip Day APIs (4-6 days)

Deliverables:
- `/api/logic/*` endpoints.
- `/api/trips/:id/days/:dayIndex` save + recalc flow.
- Structured validation/error response codes.

Acceptance:
- Postman regression pack passes 100%.
- RBAC enforcement verified.

## Phase 4 - Frontend Builder Shell (6-8 days)

Deliverables:
- New `TripBuilder` page inside Sales module.
- Inventory + timeline + map base layout.
- Zustand store with optimistic update flow.

Acceptance:
- Drag/drop works from inventory to timeline.
- Route map draws legs from computed schedule.

## Phase 5 - Validation UX and Conflict Surfacing (4-5 days)

Deliverables:
- Card-level validation states.
- conflict panel and error code mapping.
- red borders + warnings.

Acceptance:
- Invalid scheduling scenarios are visible without backend logs.

## Phase 6 - Versioning, Audit, and Recovery (3-4 days)

Deliverables:
- Write `trip_versions` on major edits.
- restore endpoint for previous version.
- `logic_run_logs` persisted on each recalc.

Acceptance:
- Agent can recover last stable day version.
- Support can diagnose failures from logs only.

## Phase 7 - Hardening and Launch (4-6 days)

Deliverables:
- load testing
- final E2E suite
- production runbook + rollback plan

Acceptance:
- performance SLOs met.
- no P0/P1 defects in UAT signoff.

---

## 13. Estimated Total Timeline

- Best case: 30 working days
- Realistic: 36-42 working days
- Recommended planning window: 8 calendar weeks

---

## 14. Detailed Task Breakdown (Execution Checklist)

## Backend Tasks
- [ ] Add dependencies: `geolib`, `axios`, `zod` (backend usage).
- [ ] Implement `Place` schema in TypeScript with `2dsphere` index.
- [ ] Implement `Trip` schema in TypeScript with embedded day events.
- [ ] Add support models: `TripVersion`, `RouteCache`, `PlaceClosure`, `LogicRunLog`, `ItineraryBuilderSetting`.
- [ ] Implement Zod request validators for all logic endpoints.
- [ ] Implement `LogicService` pure helpers (`timeToMin`, `minToTime`, `dayName`).
- [ ] Implement `validateEvent` with closure override checks.
- [ ] Implement OSRM client with timeout + fallback.
- [ ] Implement route cache read/write utility.
- [ ] Implement `autoScheduleDay` deterministic chain update.
- [ ] Add controllers and routes for places/trips/logic.
- [ ] Add integration tests and fixtures.

## Frontend Tasks
- [ ] Install `zustand`, `@dnd-kit/core`, `@dnd-kit/sortable`, `react-leaflet`, `leaflet`.
- [ ] Create `TripBuilder` route and page shell.
- [ ] Build inventory list with filter chips and search.
- [ ] Build day timeline with sortable cards.
- [ ] Build map panel with markers + route segments.
- [ ] Implement Zustand store and optimistic actions.
- [ ] Wire drag end event to backend recalculate API.
- [ ] Build conflict visualization states.
- [ ] Add save/revert/recalculate controls.
- [ ] Add loading/error skeleton states.

## DevOps and Quality Tasks
- [ ] Seed scripts for places and closures.
- [ ] Index verification script.
- [ ] Postman collection for regression.
- [ ] E2E script for major workflows.
- [ ] release checklist and rollback procedure.

---

## 15. Key Risks and Mitigations

1. Risk: OSRM instability or latency spikes.
Mitigation: hard timeout + Haversine fallback + route cache TTL.

2. Risk: Bad coordinate order from frontend.
Mitigation: strict DTO validation + helper to normalize lat/lng -> lon/lat.

3. Risk: Timeline drift due to mixed manual edits.
Mitigation: always recompute chain after reorder and persist version snapshot.

4. Risk: Data quality issues in Golden Database.
Mitigation: admin form constraints + nightly validation job + anomaly report.

5. Risk: Agent confusion in conflict-heavy trips.
Mitigation: explicit conflict panel with reason codes and suggested quick actions.

---

## 16. Definition of Done (Project)

Project is done only when all below are true:
- All 7 required collections exist with indexes in production.
- Logic engine endpoints are deterministic and fully tested.
- Drag-drop timeline + map + validation warnings work in CRM route.
- Admin can manage Golden Database safely.
- Version restore and logic logs are operational.
- UAT signoff completed with no critical defects.

---

## 17. Immediate Next Planning Actions

1. Freeze final collection names exactly as listed in Section 3.
2. Freeze API path naming (`/api/places`, `/api/trips`, `/api/logic`).
3. Approve Phase 0 and Phase 1 as the first development sprint.
4. Define one canonical timezone for all scheduling logic before coding.

