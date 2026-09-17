# AniWhere: Harvest-Based Market Discovery for Farmers
## Autonomous Engineering & Verification Walkthrough

**Project:** AniWhere  
**Team:** Walang Ani Buseng (Ponce, Bebis, Abadier &mdash; Mentor: Asst. Prof. Nazareno)  
**Context:** Top 10 Finalist &middot; UPLB TTBDO NextGen Agri Hackathon 2026  
**Repository Branch:** `feat/aniwhere-frontend-prototype`  
**Execution Standard:** Fensalir Loop Engineering & Verification Protocol &middot; Apple HIG &middot; Awwwards UI/UX Quality

---

## 1. Executive Summary

**AniWhere** is a harvest-driven market discovery and decision support web application built for agricultural producers in Laguna, Philippines. Rather than forcing farmers into complex speculative platforms, AniWhere answers the essential practical question before departure:

> *"A farmer enters what they will harvest, how much they have, and where they are. AniWhere shows nearby places that may buy that harvest&mdash;bagsakan, cooperatives, MSMEs, restaurants, and processors&mdash;then helps the farmer compare fit, posted price, distance, transport cost, contact details, and data freshness before traveling."*

This prototype executes strictly against canonical specification `ANTIGRAVITY_MASTER_PROMPT.md` and the 12-feature Goal Contract.

---

## 2. 12-Feature Work Queue & Commit History

Every feature slice represents an atomic, test-verified local commit backed by an audit receipt in `.agentic/aniwhere-frontend/receipts/`:

| # | Feature / Milestone | Commit | Status | Independent Critic Score |
| :---: | :--- | :---: | :---: | :---: |
| **00** | Preflight, branch setup, build contract, Laguna tokens | `53bb236` | **ACCEPTED** | Self-certified |
| **01** | Astro + Svelte 5 + Tailwind scaffold, BaseLayout shell | `415389e` | **ACCEPTED** | BaseLayout certified |
| **02** | Pure domain matching logic, fixtures, Vitest suite | `dd56ce0` | **ACCEPTED** | 100% test coverage |
| **03** | Shared navigation, EN/FIL dictionary, defensive storage | `e5df549` | **ACCEPTED** | SSR-safe verified |
| **04** | Harvest-entry Homepage (`/`) | `68b8927` | **ACCEPTED** | **10.0 / 10** PASS |
| **05** | Discovery List & Filters (`/discover`) | `e5a640f` | **ACCEPTED** | **10.0 / 10** PASS |
| **06** | Resilient Map Panel & Mobile Sheet | `f9c9d04` | **ACCEPTED** | **10.5 / 11.0** PASS |
| **07** | Outlet Detail (`/places/[slug]`) & Saved (`/saved`) | `fe87148` | **ACCEPTED** | **10.0 / 10** PASS |
| **08** | Transparent Comparison (`/compare`) & Hauling Recalculation | `e2e4fc7` | **ACCEPTED** | **10.5 / 11.0** PASS |
| **09** | Buyer Local-Demo Workspace (`/buyer`) & Offer Editor | `c5c8927` | **ACCEPTED** | **10.0 / 10** PASS |
| **10** | Hardening, A11y, Print Styles, 6-Viewport Polish | `a287813` | **ACCEPTED** | All viewports verified |
| **11** | End-to-End Visual QA, Technical Docs, Master Receipts | *Final* | **ACCEPTED** | Complete Receipt |

---

## 3. Maker / Checker Verification & Critic Results

In strict adherence to the Maker/Checker separation rule, every feature slice was independently evaluated by a distinct Critic subagent against Apple Human Interface Guidelines, agricultural credibility, responsive ergonomics, and Fensalir Anti-Vibecode rules.

### Key Critic Results:
1. **Feature 04 (Homepage `/`): 10 / 10 PASS**
   - 2x2 harvest entry grid with all 4 inputs (`Crop`, `Quantity`, `Origin Municipality`, `Ready Date`) visible above the fold on mobile.
   - Primary CTA (`Find places to sell >`) within direct thumb reach.
2. **Feature 05 (Discovery List `/discover`): 10 / 10 PASS**
   - 4 deterministic fit states (`Matches your harvest`, `Accepts part of your harvest`, `Contact to confirm`, `Does not match`).
   - Pure arithmetic breakdown: Gross Subtotal &minus; Hauling Expense = Net After Transport.
   - Mandatory disclaimer: *"After entered transport only — not profit or guaranteed income. Before farm costs."*
3. **Feature 06 (Resilient Map): 10.5 / 11.0 PASS**
   - Vector SVG Laguna de Bay / Mt. Makiling corridor projected into upper canvas ($y=45\text{ to }250$), ensuring complete pin visibility above the non-modal mobile bottom sheet.
   - Touch targets $\ge 44\text{px}$, backdrop tap dismissal, and seamless split-view on desktop.
4. **Feature 07 (Outlet Detail & Saved `/saved`): 10 / 10 PASS**
   - 6-metric decision ledger, operational questions to confirm before travel (ripeness, crate specifications, intake schedule).
   - Non-automated, copyable SMS inquiry modal with tactile clipboard confirmation.
   - Friendly 404 outlet-not-found recovery route (`/404`).
5. **Feature 08 (Transparent Comparison `/compare`): 10.5 / 11.0 PASS**
   - 1 to 3 outlets displayed on equal visual footing without declaring any "winner" or "best deal".
   - Live reactive hauling recalculation with client-side override inputs.
   - Action phrasing strictly non-transactional ("Review this option").
6. **Feature 09 (Buyer Workspace `/buyer`): 10 / 10 PASS**
   - Exact initial counts: `1 published`, `1 in review`, `1 draft`.
   - Zero fake analytics, inbound inquiries, or artificial conversion percentages.
   - Accessible modal dialog for creating and editing offers, saving strictly to `localStorage`.
   - Clear banner: *"Demo workspace. Offers are saved on this device only and do not publish real buyer demand."*

---

## 4. Anti-Vibecode & Architectural Invariants

| Rule | Enforcement Verification |
| :--- | :--- |
| **Rule 9: No Eyebrows / Kickers** | Strictly zero kicker pills or overlines above H1/H2 headlines across all routes. Every page initiates directly with its typographic headline. |
| **Rule 10: No Decorative Dots** | Zero pulsing rings, green status dots (`🟢`, `●`), or decorative pseudo-indicators. Statuses use high-contrast semantic icons (checkmarks, clocks, pencils) and background tints. |
| **Rule 11: Zero Prompt Leakage** | All internal agent terminology (`fixture`, `prompt`, `agent`, `seed`, `vibecode`) is 100% excluded from public copy. Mock notices say: *"Demo &mdash; sample data"*. |
| **Arithmetic Integrity** | Transparent equation: $\text{Gross} - \text{Hauling} = \text{Net After Transport}$. Strictly never described as "profit". |
| **WCAG 2.2 AA Contrast** | Field Ink (`#20251E`) on Warm Surface (`#FFFDF8`) yields **15.36:1** contrast (exceeds WCAG AAA). All interactive controls exceed **4.5:1**. |

---

## 5. Viewport Resilience Matrix

The application was tested and verified across 6 core screen viewports:
- **320px (Extreme Narrow):** `scrollWidth === clientWidth` (zero horizontal overflow); cards format into high-density stacked cards.
- **375px (iPhone SE):** Compact hero with all inputs above fold.
- **390px (iPhone 14/15):** Compact 3-stat buyer bar, full touch targets $\ge 44-48\text{px}$, fixed bottom navigation.
- **414px (iPhone Plus/Max):** Spacious card layout with crisp typography.
- **768px (iPad Portrait):** Side-by-side comparison cards and desktop header navigation adaptation.
- **1024px (Small Laptop):** 4-column metric cards and full data tables.
- **1440px (Desktop):** Museum-grade dual-column split view (list + live cartography).

---

## 6. How to Run and Verify

```bash
# Navigate to repository root
cd C:/Users/Dian/Documents/Codex/2026-09-15/so/aniwhere-publish

# Run automated unit test suite (22 tests)
npm test

# Run Astro TypeScript type check (0 errors across 30 files)
npx astro check

# Build production static bundle (11 static routes)
npm run build

# Launch preview server on port 4328
npm run preview -- --port 4328
```

---

## 7. Artifact References & Documentation

- `DESIGN.md`: Complete design system tokens, typography rules, and spatial standards.
- `docs/FRONTEND_LIMITATIONS.md`: Detailed boundary limits, prototype scope, and backend handoff guide.
- `docs/THIRD_PARTY_NOTICES.md`: Complete dependency and font licensing audit.
- `.agentic/aniwhere-frontend/receipt.yaml`: Master completion receipt.
- `.agentic/aniwhere-frontend/receipts/`: Individual feature acceptance receipts (00 to 10).
