---
name: aniwhere-live-mapping
description: Use for AniWhere live maps, road routing, routing matrices, route geometry, MapLibre, OpenRouteService, and map fallbacks.
---

# AniWhere Live Mapping & Routing

Use this skill before changing AniWhere mapping, distance, route, or routing-matrix code.

## Product boundary
AniWhere is a harvest-based market discovery tool for farmers in Laguna. A map can explain where an outlet is and how far the road trip is likely to be, but it must never turn a reviewed place into active demand or make an uncertain buyer offer look confirmed. Mapping evidence and market evidence are separate.

## Architecture
Use a progressive four-layer model:
1. deterministic Haversine distance for cheap candidate discovery and offline fallback;
2. MapLibre GL JS for the live interactive basemap;
3. a road-routing matrix artifact/service only for the shortlist, selected outlet, detail, or compare flows;
4. the existing SVG Laguna map as the no-network/no-WebGL fallback.

Do not route every raw candidate on every render.

## Routing truth
- straightLineDistanceKm means Haversine only.
- roadDistanceKm means a routing provider returned a road route.
- roadDurationMinutes is a routing estimate, never a guaranteed trip time.
- Never label Haversine as road distance or travel time.
- Never invent a route duration when the provider is unavailable.
- Never derive hauling cost from route distance unless a separately sourced/user-entered cost model explicitly does so.
- Route data does not change MATCH / PARTIAL / CONTACT_TO_CONFIRM / NO_MATCH semantics.
- Preserve route provenance: provider, profile, generated/fetched timestamp, origin, destination, and status.

## Provider strategy
Preferred production provider: OpenRouteService (ORS), driving-car profile, because AniWhere already names ORS in its architecture.

Keep the API key out of browser code. Preferred production paths:
- precompute demo/pilot matrices in a build/ops script and ship a reviewed JSON artifact; or
- call ORS through a server/edge proxy with caching when AniWhere gains a server runtime.

Do not expose a private ORS key through a PUBLIC variable.

## Routing matrix
A matrix record is keyed by a stable origin ID and stable outlet ID. For each cell store status, distanceMeters when routed, durationSeconds when routed, provider/profile, generatedAt, and optional route geometry reference.

Municipality centroids are discovery origins, not a farmer's precise farm location.

## MapLibre
- Live map is an enhancement, not a dependency for discovery.
- Lazy-load it only in map-bearing islands.
- Use GeoJSON style layers for route lines and larger point sets.
- DOM marker/buttons are acceptable for the small visible outlet set when they need rich accessible interaction.
- Reuse sources with setData rather than recreating the map.
- Fit selected route geometry with padding that accounts for mobile sheets.
- Avoid continuous fly animations; respect prefers-reduced-motion.
- Attribution must remain visible.
- Map load failure must switch to the resilient SVG map without losing discovery state.

## Privacy
Do not request precise GPS automatically. If geolocation is added later it must be explicit and user-initiated. Do not persist precise coordinates in URLs, analytics, local storage, or market records by default.

## Testing
Verify live-map failure fallback, list/map selection sync, honest Haversine labels, routed provenance, unchanged fit status on routing failure, reduced motion, keyboard alternatives, and unobscured attribution/endpoints.
