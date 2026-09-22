# AniWhere Agent Instructions

AniWhere is a harvest-based market-discovery and decision-support product for farmers. Before editing product logic, preserve the evidence model and the distinction between market evidence and mapping evidence.

## MapLibre work

The repository vendors the official MapLibre agent skills under `.cursor/skills/maplibre-*/SKILL.md`, sourced from:

https://github.com/maplibre/maplibre-agent-skills

Before changing MapLibre code, read the relevant installed skill. In particular:

- `maplibre-v6-migration` for MapLibre GL JS v6 imports, CDN/bundler behavior, workers, and breaking changes;
- `maplibre-source-wiring` for sources, layers, GeoJSON updates, and layer order;
- `maplibre-tile-sources` for basemap/data-source choices;
- `maplibre-cartography` for marker, route, label, hierarchy, and accessibility decisions.

AniWhere-specific mapping rules are in:
- `.cursor/skills/aniwhere-live-mapping/SKILL.md`
- `.cursor/skills/aniwhere-map-ui/SKILL.md`
- `docs/LIVE_MAP_ROUTING_MATRIX_PLAN_2026-09-22.md`

If upstream MapLibre documentation contradicts an installed skill, follow the current primary documentation and update/report the skill rather than coding around stale guidance.

## Non-negotiable trust boundary

- Route data never changes MATCH / PARTIAL / CONTACT_TO_CONFIRM / NO_MATCH.
- Haversine distance must remain labeled as straight-line distance.
- Road distance/time is shown only when a routing provider actually returned it.
- Never fabricate travel time or hauling cost.
- Unknown/stale buyer demand remains unknown/stale.
- A reviewed place is not the same as an active buyer offer.
- Do not expose routing secrets through `PUBLIC_*` variables or browser code.
- Live-map failure must leave the list workflow and resilient SVG map usable.

## Verification

For behavior changes, run the repository verification gates and add/adjust tests at the same trust boundary being changed.
