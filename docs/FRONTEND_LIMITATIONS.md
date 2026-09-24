# AniWhere Frontend Prototype — Technical Scope & Limitations

**Project:** AniWhere: Harvest-Based Market Discovery for Farmers  
**Hackathon:** UPLB TTBDO NextGen Agri Hackathon 2026 (Top 10 Finalist)  
**Document Version:** 2.0 (18 September 2026)

---

## 1. Executive Summary

This codebase is a high-fidelity frontend demonstration prototype developed for the UPLB NextGen Agri Hackathon 2026.

The current running application is intentionally reliable without a backend or third-party map service, while the repository now also contains a **production data/security scaffold** for the next implementation phase.

Those two facts must not be conflated:

- the frontend demo is functional;
- the Supabase schema exists as code;
- no live production database is connected by this branch alone.

The core trust rule is that AniWhere should never convert missing or stale market information into a confident claim simply to complete the UI.

---

## 2. Runtime Architectural Boundaries

### A. No live backend at runtime

**Current runtime state:**

- no active Supabase client;
- no active PostgreSQL connection;
- no real buyer synchronization;
- no cloud persistence for farmer searches;
- no production buyer authentication.

Browser interactions such as saved outlets and the buyer-demo workspace still persist through local browser storage.

The new `supabase/` directory is a **handoff scaffold**, not evidence that a remote database has been deployed.

### B. Demo and production data must stay distinguishable

Current outlet terms are explicit fictional fixtures separated into places, crop capabilities, offers, sources, and hauling assumptions in `src/content/`. The demo shifts its sample dates relative to the current Manila date for offline presentation; the displayed freshness is illustrative, not evidence of recent verification.

The trust-model v2 domain now carries:

- evidence kind;
- source label;
- updated timestamp;
- validity end;
- unresolved unknowns.

Production work should introduce repository/data adapters rather than replacing fixture values with scraped or unverified values in the same file.

### C. Live map is progressive; offline/keyless map remains the fallback

The discovery and outlet-detail flows now use `LiveLagunaMap.svelte`, which lazy-loads MapLibre GL JS and the keyless OpenFreeMap Liberty style when network/WebGL are available.

`ResilientLagunaMap.svelte` remains the explicit fallback. Live-map failure must not make discovery unusable.

Straight-line distance is still computed deterministically with Haversine. The checked-in routing artifact is fail-closed (`status: not_generated`) until an operator runs the OpenRouteService generator with a private `ORS_API_KEY`.

When a generated matrix cell exists, the UI may label its values **Road distance** and **Estimated drive**. Otherwise it continues to label Haversine as **Straight-line distance** and shows no invented driving time.

Route distance/time remains separate from market evidence, buyer acceptance, fit state, and hauling expense.

---

## 3. Matching Boundaries

Detailed demo fixture matching covers tomato / kamatis, eggplant / talong, calamansi / kalamansi, banana / saging, papaya, pechay / petsay, and string beans / sitaw. Other crops return **Contact to confirm**.

Within the pilot crops, the engine now distinguishes:

- explicit crop exclusion;
- missing crop-acceptance evidence;
- unknown capacity;
- non-current offer;
- offer-validity window;
- receiving weekdays;
- minimum/maximum quantity;
- full vs partial accepted quantity;
- missing price.

Important semantics:

- no crop record is **not** a rejection;
- paused/non-current terms cannot produce MATCH/PARTIAL;
- missing capacity cannot produce a quantity claim;
- missing price cannot produce proceeds;
- a fit result never reserves capacity.

Quality, grade, variety, and packaging are not yet fully machine-evaluated in the local fixture engine. They remain conditions to confirm unless/until structured production data is available.

---

## 4. Date & Freshness Boundaries

Runtime default dates now use the current date in `Asia/Manila`.

Offer-like fixture records can carry:

- `validFrom`;
- `validUntil`;
- `offerStatus`;
- `receivingWeekdays`;
- source/freshness metadata.

Historical demo timestamps can remain historical. They must not be silently rewritten to look current.

Production freshness policy still needs to be defined per fact type. An address and a buyer price should not share the same staleness threshold.

---

## 5. Financial & Arithmetic Integrity

AniWhere does not calculate profit.

Where the required inputs are known:

```text
Gross Amount = posted price per kg × accepted quantity
Amount After Transport = Gross Amount − known/entered hauling expense
```

The result excludes farm production costs.

The comparison layer no longer introduces a generic transport fallback when no hauling value exists. Unknown transport remains unknown until an explicit demo default or user-entered amount exists.

There is no universal Laguna hauling tariff in the code.

---

## 6. Production Data Scaffold

The repository now includes:

- `supabase/schemas/market_data_v2.sql`
- `supabase/tests/market_data_rls.test.sql`
- `supabase/README.md`

The declarative schema scaffold separates:

- organizations;
- people/memberships;
- stable places;
- place editors;
- crop capability facts;
- time-sensitive offers;
- sources;
- verification records;
- reference prices.

RLS is scaffolded so anonymous farmers can eventually read approved public information while buyers/stewards can edit only authorized records.

These policies still require behavioral testing in a running Supabase local environment. A proper versioned migration must be generated/reviewed through the Supabase CLI workflow before production application.

---

## 7. Routing/Mapping State

The layered architecture is now implemented:

1. Haversine remains the inexpensive deterministic fallback.
2. MapLibre + OpenFreeMap is the progressive live map.
3. `src/generated/routing-matrix.json` is the browser-safe road-routing artifact.
4. `scripts/generate-routing-matrix.mjs` uses a private ORS key outside the browser to precompute the 10 municipality-origin × 5 demo-outlet driving matrix.
5. Optional geometry generation can precompute selected-route lines.
6. Discovery/detail/compare read the same artifact and fall back explicitly when no routed cell exists.
7. The resilient SVG map remains available when the live map cannot load.

The browser does not send every candidate through a routing API and does not receive an ORS secret.

---

## 8. What is still missing for a live pilot

A production pilot still needs:

- a deliberately selected/configured Supabase project;
- applied/verified migrations;
- generated DB/client types;
- behavioral RLS tests;
- authentication/invitation flows for buyers/stewards;
- reviewed real Laguna place records;
- source/verification workflow;
- current buyer offer collection;
- separation of demo and production repositories/adapters;
- production review of the MapLibre/OpenFreeMap dependency, CSP, caching, attribution, and no-WebGL fallback;
- a legitimately generated ORS road-routing artifact or a secure cached routing service, with private credentials kept out of the browser;
- field/usability validation with farmers and market actors;
- representative Filipino/Taglish voice testing before claiming production-quality Ani voice navigation.

---

## 9. Related handoff

For the research findings, code changes, security decisions, and exact next queue from this hardening pass, see:

`docs/ANIWHERE_TRUST_MODEL_V2_IMPLEMENTATION_2026-09-18.md`

---

## 10. Local Ani Help & Offline/PWA Boundary

Ani now includes a bundled bilingual FAQ layer intended for low-connectivity use.

### What local help is

- a fixed, reviewed set of Filipino/English AniWhere explanations;
- matched locally in the browser;
- available without an online AI call once the application has loaded;
- safe to use even when the current harvest form is incomplete because it explains product concepts rather than calculating market facts.

### What local help is not

It is **not** an offline language model and it does not generate fresh market information. It cannot create or refresh:

- buyer demand;
- active offers;
- capacity;
- prices;
- route requests;
- map tiles;
- transactions or reservations.

Ani's chat panel presents only the bundled local FAQ. It has no online-provider or voice switch.

### PWA/service-worker behavior

The service worker is a resilience layer, not a freshness guarantee.

- The first successful load requires a connection.
- Core navigation is network-first when connectivity exists.
- Cached page fallbacks are used only when the network request fails.
- Farmer query strings are not intentionally persisted as cache keys; navigation responses are cached by pathname.
- `/api/` requests are not intercepted by the service worker.
- Static assets may be reused from cache.
- Live map tiles and fresh road-route requests still require network access.

Cached demo or previously loaded information must never be described as current merely because it remains available offline.
