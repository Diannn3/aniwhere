---
version: 1
slug: "src-pages-discover-astro"
primary_target: "src/pages/discover.astro"
related_targets: ["src/pages/index.astro","src/pages/saved.astro","src/pages/compare.astro","src/pages/buyer.astro","src/pages/404.astro","src/pages/places/[slug].astro"]
---

# Discovery and routed product surfaces

Mode: Operate
Scope: Every routed AniWhere screen, centered on `src/pages/discover.astro` and its shared shell, farmer flow, buyer demo, and state variants.

Audience and job: Laguna smallholder farmers deciding which potential outlet is worth contacting before travel. The primary action is to trace a harvest from origin to realistic destinations, inspect fit and evidence, compare up to three outlets, and contact an outlet to confirm.

## Direction contract

**SEED — 3afc0fd8**

**THESIS — Map-first Field Almanac.** AniWhere behaves like a contemporary agricultural field guide whose main plate is a working Laguna map. It refuses the generic dashboard arrangement where the map is a secondary card beside interchangeable metrics.

**OWN-WORLD —** Warm Surface paper plane, Field Ink rules and type, Field Olive structural actions, Route Blue geography and routes, Soil Brown uncertainty, Rice Cream evidence insets, and Young Leaf reserved for broad quiet fields. Outfit gives compact headings; Atkinson Hyperlegible Next carries controls, prose, and tabular data. Shoulder indexes, guide words, numbered entries, and bordered color plates make the system recognizable without antique ornament.

**STORY —** A farmer enters crop, quantity, origin, and ready date; the harvest appears as the map origin and branches toward potential outlets. Selecting a route or marker reveals the corresponding ruled evidence entry. The farmer saves or compares options and leaves with explicit questions to confirm, never a guaranteed recommendation.

**FIRST VIEWPORT —** Discovery opens with a dominant Laguna map occupying most of the viewport. A narrow outside shoulder holds harvest context and primary navigation. A compact evidence rail lists map-linked outlets with fit, quantity, distance basis, freshness, and unresolved questions. The map—not a hero heading—is the focal moment. Mobile retains a substantial map viewport above an indexed, map-synchronized sheet.

**FORM —** One page plane, one bordered working map plate, and ruled evidence regions. Controls read as modern printed marks with clear button affordances. Selection travels bidirectionally between marker, route, and entry. Page transitions resemble passing to the next field-guide spread; micro-motion traces route continuity and respects reduced motion.

**CHALLENGE —** The almanac can become institutional or overly dense. Counter it with plain language, generous measures, familiar controls, and progressive evidence disclosure. The dominant map must remain operational under weak connectivity through the existing resilient fallback and must never imply live demand, precise farm GPS, or reviewed road distance when only straight-line distance exists.

Constraints: Preserve product truth, demo notices, bilingual English/Filipino support, WCAG 2.2 AA, 44px targets, keyboard operation, offline usefulness, and explicit uncertainty. Preserve all real behaviors and data. UX copy may be rewritten without inventing claims.

Material states: first-run harvest entry, valid and invalid forms, loading, no results, partial acceptance, unknown capacity/price/distance/freshness, selected and compared outlets, compare limit, saved empty/populated, offline and resilient map fallback, buyer demo empty/editing/success, 404, and print comparison.

Anti-goals: Generic dashboards, decorative maps, winner or AI recommendation badges, fake live status, guaranteed demand or income, dense antique pastiche, shrunken desktop layouts, and color-only state.

Approved comp: `.impeccable/mocks/cartographic-desk-desktop.webp`
Approved mobile companion: `.impeccable/mocks/cartographic-desk-mobile.webp`
