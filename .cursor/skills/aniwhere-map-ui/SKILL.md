---
name: aniwhere-map-ui
description: Use for AniWhere map UX, outlet markers, route explanation, mobile map sheets, accessibility, and visual hierarchy.
---

# AniWhere Map UI

Use together with aniwhere-live-mapping.

## Scene
A farmer may be checking market options outdoors, on a low-to-mid-range phone, with intermittent data. The map must answer quickly: where is this outlet relative to my origin, and what does the route estimate actually mean?

## Hierarchy
1. fit state and accepted quantity;
2. outlet identity and evidence freshness;
3. origin to outlet spatial relationship;
4. road distance / estimated driving time when actually routed;
5. straight-line fallback when routing is unavailable;
6. secondary map controls.

The map never outranks evidence.

## Interaction
- One selected outlet at a time.
- Marker selection synchronizes with the discovery list.
- Keep the existing List / Map view state and selected-place URL state.
- Mobile uses a compact non-modal bottom dock/sheet; desktop may use split list + map.
- A marker click selects first; details remain a separate deliberate action.
- Do not trap keyboard focus inside the map.
- Every marker-only action needs a list/button equivalent.
- Controls target at least 44 by 44 CSS px.

## Visual language
Follow AniWhere's Field Olive / Young Leaf / Soil Brown / Rice Cream / Warm Surface / Field Ink / Route Blue system.

- farmer origin: clear A / origin marker;
- selected outlet: stronger outlined marker with text-equivalent selected state;
- other outlets: quiet category/status-aware markers;
- actual routed road geometry: solid Route Blue;
- Haversine/simplified connector: dashed and explicitly labeled Straight-line context.

Never use color alone to encode fit status.

## Route card
When routed show Road distance, Estimated drive, provider/source note, and Estimate only — confirm receiving schedule before travel.

When not routed show Straight-line distance and Road route unavailable, with no fabricated minutes.

Do not merge route estimate with transport expense. Existing entered hauling cost remains separate.

## Resilience
The existing SVG Laguna map is the offline/no-WebGL fallback and must preserve selection and context.

## Motion
Use AniWhere's motion tokens. Camera movement follows explicit selection only. With reduced motion, use immediate camera changes.

## Accessibility
Keep route metrics as semantic text outside the canvas, announce map errors once, preserve keyboard/list equivalents, visible focus, and unobscured attribution.
