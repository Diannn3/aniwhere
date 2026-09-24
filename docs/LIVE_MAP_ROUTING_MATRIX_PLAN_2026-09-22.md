# AniWhere Live Map + Routing Matrix — Audit, Research, and Implementation Plan

**Date:** 2026-09-22  
**Branch:** feat/live-map-routing-matrix  
**Target:** Diannn3/aniwhere

> **Historical note (25 Sep 2026):** this document records the original 10-origin × 5-outlet routing design. The current implementation has 11 demo outlets and is superseded for routing operations by `ROUTING_MATRIX_V2_IMPLEMENTATION_2026-09-25.md`.

## Correction / target

The mapping work belongs in **AniWhere**, not UPPETITE. The earlier exploratory UPPETITE branch is isolated and is not merged. This plan adapts the useful UPPETITE + Room TBA architecture patterns to AniWhere's different domain: Laguna-wide farmer-to-market **road travel**, not UPLB pedestrian routing.

## Repository audit

AniWhere currently has:
- Astro 5 + Svelte 5 + TypeScript + Tailwind 4;
- an evidence-honest MATCH / PARTIAL / CONTACT_TO_CONFIRM / NO_MATCH engine;
- municipality centroid origins;
- five fictional demo outlets with coordinates;
- deterministic Haversine straight-line distance;
- ResilientLagunaMap.svelte, a polished in-repo SVG map;
- List / Map state synchronization;
- no live basemap dependency;
- no road-routing provider;
- no route-time claims.

README and FRONTEND_LIMITATIONS already name the intended next architecture: Haversine candidate discovery, MapLibre progressive enhancement, road routing only for shortlist/detail/compare, server-side routing secrets, caching, and explicit fallback.

## What UPPETITE and Room TBA teach us

### UPPETITE
Useful patterns:
- map and list share one selection state;
- routing metrics are decision data and the map explains them;
- MapLibre is lazy-loaded;
- route geometry and metrics must share provenance;
- unsupported routes fail closed;
- map failure does not break discovery;
- route data should be cached/precomputed where possible.

Not portable:
- its UPLB pedestrian graph and walking matrix are campus-specific and must **not** be copied into AniWhere.

### Room TBA
Useful patterns:
- client-side map remains cheap and responsive;
- route geometry is first-class state;
- camera fitting follows route bounds;
- routing has explicit provenance;
- the map is not allowed to invent connectivity.

Not portable:
- the Room TBA OSM-derived UPLB walk graph is pedestrian/campus data and is the wrong transport network for Laguna hauling.

## Research decisions

### Map rendering — MapLibre GL JS
Use MapLibre as the interactive renderer. Current MapLibre v6 is ESM-only; direct browser ESM loading is supported and auto-resolves its worker. AniWhere will lazy-load a pinned v6 module so the current lockfile is not destabilized during the hackathon pass.

### Basemap — OpenFreeMap
Use OpenFreeMap's public Liberty style for this pass:
- MapLibre-compatible;
- OSM-derived;
- no API key;
- no registration/cookies;
- appropriate for a resilient prototype.

Do not use CARTO Voyager without a key: CARTO's September 2026 guidance says external basemap use now requires a free API key.

### Road routing — OpenRouteService
Use ORS as the planned road-routing provider because it is already named in AniWhere's architecture and supports:
- driving-car;
- matrix distances/durations;
- directions geometry;
- one-to-many/many-to-many matrices.

As of September 2026 the correct hosted base is api.heigit.org; the older api.openrouteservice.org endpoint is deprecated and scheduled for shutdown on 2026-09-28.

### Secret handling
AniWhere is currently a static Astro build. Therefore an ORS secret must **not** be exposed to the browser.

This pass implements a precomputed routing-artifact workflow:
1. an ops script takes ORS_API_KEY from the local/CI environment;
2. it requests a 10-origin × 5-outlet driving matrix;
3. it can optionally fetch per-pair route geometry;
4. it writes a reviewed static artifact;
5. the browser reads only that artifact.

The checked-in default artifact contains no invented road metrics. Until a real ORS generation is run, the UI explicitly falls back to Haversine.

## Truth model

Routing facts are separate from market facts.

Road distance/time:
- cannot create a MATCH;
- cannot turn a reviewed place into active demand;
- cannot imply buyer availability;
- cannot alter accepted quantity;
- cannot be called hauling cost;
- cannot be called guaranteed travel time.

Display terms:
- routed cell: **Road distance** + **Estimated drive**
- no routed cell: **Straight-line distance** + **Road route unavailable**
- selected map route with geometry: solid Route Blue
- no geometry: dashed straight-line context

## Implementation phases

1. Install repo-local mapping/UI skills.
2. Add routing types and matrix lookup with explicit fallback.
3. Add an ORS artifact generator using the current 10 municipality centroids and 5 demo outlet coordinates.
4. Add a checked-in empty/unavailable routing artifact so builds remain deterministic without secrets.
5. Add a lazy MapLibre v6 loader and OpenFreeMap style config.
6. Build LiveLagunaMap.svelte:
   - MapLibre when available;
   - accessible outlet markers;
   - origin marker;
   - selected route GeoJSON;
   - camera fitting;
   - route metrics card;
   - resilient SVG fallback on load/WebGL/network failure.
7. Wire DiscoveryExperience to the live map without changing fit semantics.
8. Use routed distance for distance sorting only when a real routed cell exists; otherwise retain Haversine.
9. Add tests for matrix lookup, fallback truthfulness, route-state separation, and source-level resilience.
10. Update README / limitations / env example.

## Performance

- Do not request routing in the browser.
- Do not request every outlet on every render.
- Lazy-load MapLibre only in Map view.
- Keep five demo outlet markers as DOM controls; this is small enough and improves accessibility.
- Route line is a single GeoJSON source.
- Reuse/update map sources when selection changes.
- No automatic geolocation.

## Accessibility

- Map remains optional to complete the task.
- Marker selection has list equivalents.
- Route metrics exist as text outside the canvas.
- 44px controls.
- reduced-motion camera behavior.
- map failure message and SVG fallback.
- visible OSM/OpenFreeMap attribution.

## Verification gates

- pnpm test
- pnpm check
- pnpm build
- existing Playwright suite
- new routing unit tests
- source assertion that ORS key is never referenced through PUBLIC_*
- map fallback test
- no change to matching outcomes from route data

## Sources consulted

- MapLibre GL JS v5→v6 migration and current API docs
- MapLibre GeoJSON source / setData / camera / reduced-motion docs
- OpenFreeMap quick start and September 2026 terms
- OpenRouteService current API docs, restrictions, services, and August–September 2026 endpoint migration notices
- OpenStreetMap tile policy
- Turf route/line utilities (evaluated; not required for this small first implementation)
- UPPETITE and Room TBA source repositories
