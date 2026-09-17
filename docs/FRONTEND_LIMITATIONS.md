# AniWhere Frontend Prototype — Technical Scope & Limitations

**Project:** AniWhere: Harvest-Based Market Discovery for Farmers  
**Hackathon:** UPLB TTBDO NextGen Agri Hackathon 2026 (Top 10 Finalist)  
**Document Version:** 1.0 (18 September 2026)

---

## 1. Executive Summary

This codebase is a high-fidelity frontend demonstration prototype developed for the UPLB NextGen Agri Hackathon 2026. It models an **UPPETITE-like discovery and comparison workflow** that enables agricultural producers in Laguna to discover market outlets, evaluate compatibility with their harvest, and compare transparent financial projections before traveling.

To ensure resilience, privacy, and zero operational dependency during offline or live pitching demonstrations, this phase is architected with strict boundary constraints.

---

## 2. Architectural Boundaries

### A. Zero Backend & Zero External Database
- **Current State:** The prototype operates completely serverless and stateless on the backend. No active Supabase, PostgreSQL, Prisma, Redis, or cloud storage connections are utilized at runtime.
- **Persistence Strategy:** All user actions (saving outlets, configuring compare sets, editing custom hauling expenses, and creating buyer offers) persist strictly to browser `localStorage` using a defensive, SSR-safe storage adapter (`src/lib/state/storage.ts`).
- **Data Isolation:** Data entered on one device (e.g. buyer demo offers) remains local to that specific browser session and is never transmitted over the network.

### B. Offline & Keyless Illustrative Cartography
- **Current State:** Live third-party tile services (e.g. Mapbox, Google Maps, OpenRouteService) requiring proprietary API keys or paid usage quotas are deliberately avoided.
- **Resilient Fallback:** An in-repo, responsive vector SVG cartographic projection of Laguna de Bay and the Mt. Makiling transport corridor (`ResilientLagunaMap.svelte`) delivers reliable geospatial visualization with 100% offline availability.
- **Distance Calculation:** Straight-line spherical Haversine distances (`src/lib/domain/distance.ts`) are calculated deterministically between Laguna municipality centroids.

### C. Pilot Commodity & Fixture Scope
- **Canonical Crops:** Detailed algorithmic matching and sample price fixtures are implemented for three pilot crops:
  1. **Tomatoes** (*Solanum lycopersicum* / Kamatis)
  2. **Eggplant** (*Solanum melongena* / Talong)
  3. **Calamansi** (*Citrus × microcarpa* / Kalamansi)
- **Other Crops:** Harvest queries outside these three commodities transition into the deterministic `"Contact to confirm"` fit state, prompting direct verification before travel.

---

## 3. Financial & Arithmetic Integrity

- **Non-Profit Disclaimer:** Arithmetic is strictly bounded:
  $$\text{Net After Transport} = \text{Gross Amount} - \text{Entered Hauling Deduction}$$
- **Anti-Slop Framing:** The result is always explicitly labeled *"After entered transport only — not profit or guaranteed income. Before farm costs."* AniWhere does not claim to know on-farm production expenses (seeds, fertilizer, labor, irrigation) and therefore never calculates or displays "profit".
- **Zero Winner Declarations:** The comparison engine displays up to 3 outlets on equal visual footing. No outlet is ever awarded a "Best Deal", "Top Choice", or "Recommended" badge.

---

## 4. Handoff & Production Roadmap

The architecture is strictly separated into domain logic, presentation islands, and state adapters. To connect a live backend in a future phase:
1. Replace `safeStorage` in `src/lib/state/` with an authenticated Supabase client using PostgreSQL Row Level Security (RLS).
2. Wire real Department of Agriculture (DA-AMAS) or Agribusiness and Marketing Assistance Division price monitoring feeds into `src/content/demo-outlets.ts`.
3. Enhance the SVG map with MapLibre GL JS vector tiles and an OpenRouteService routing API bridge.
