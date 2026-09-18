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

Current outlet terms are explicit fictional fixtures in `src/content/demo-outlets.ts`.

The trust-model v2 domain now carries:

- evidence kind;
- source label;
- updated timestamp;
- validity end;
- unresolved unknowns.

Production work should introduce repository/data adapters rather than replacing fixture values with scraped or unverified values in the same file.

### C. Offline/keyless map remains the fallback

The current app still uses `ResilientLagunaMap.svelte`, an in-repo illustrative SVG map.

Straight-line distance is computed with deterministic Haversine calculations.

There is no claim that this is road distance, travel time, or freight cost.

A future MapLibre/road-routing layer must remain progressive: failure of live mapping/routing must not make the list/discovery workflow unusable.

---

## 3. Matching Boundaries

Detailed fixture matching is currently scoped to:

1. tomato / kamatis;
2. eggplant / talong;
3. calamansi / kalamansi.

Other crops return **Contact to confirm**.

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

## 7. Routing/Mapping Roadmap

Future live mapping should use a layered approach:

1. Haversine distance for inexpensive candidate discovery;
2. MapLibre as a live interactive map when available;
3. road routing only for selected/detail/compare destinations;
4. external routing key held server-side;
5. cache route results;
6. explicit fallback to straight-line distance when routing fails.

Do not send every discovery candidate through a routing API.

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
- optional MapLibre integration;
- server-side road-routing proxy;
- field/usability validation with farmers and market actors.

---

## 9. Related handoff

For the research findings, code changes, security decisions, and exact next queue from this hardening pass, see:

`docs/ANIWHERE_TRUST_MODEL_V2_IMPLEMENTATION_2026-09-18.md`
