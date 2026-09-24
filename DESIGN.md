---
name: AniWhere
description: Map-first market discovery for Laguna farmers
colors:
  field-olive: "#597928"
  young-leaf: "#91AC67"
  soil-brown: "#6E3511"
  rice-cream: "#FCECD8"
  warm-surface: "#FFFDF8"
  field-ink: "#20251E"
  route-blue: "#4E7380"
typography:
  display:
    fontFamily: "Outfit Variable, Outfit, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Atkinson Hyperlegible Next Variable, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "8px"
  surface: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.field-olive}"
    textColor: "{colors.warm-surface}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  evidence-surface:
    backgroundColor: "{colors.rice-cream}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.surface}"
    padding: "16px"
---

# AniWhere Design System Specification

## 1. Product Identity
AniWhere is a harvest-based market-discovery and decision-support tool for smallholder farmers in Laguna, Philippines.
- Core Farmer Question: *Saan ko ibebenta ang ani ko?* (Where do I sell my harvest?)
- Core Positioning: *Tell us your harvest. We show where it can realistically go.*
- Visual Character: **Map-first Field Almanac**—a full-width working Laguna map, ruled evidence ledgers, shoulder indexes, and direct modern controls. Calm, legible, and honest about uncertainty.

---

## 2. Color Palette & Semantic Tokens

### 2.1 Core Palette Tokens
```yaml
tokens:
  color:
    field-olive: "#597928"   # Primary action background, selected controls, agricultural anchor
    young-leaf: "#91AC67"    # Soft large emphasis surfaces only (NEVER small text)
    soil-brown: "#6E3511"    # Warm accent, category marker, warning/confirmation cues
    rice-cream: "#FCECD8"    # Warm secondary surface, soft callouts, badges
    warm-surface: "#FFFDF8"  # Main application surface, card background
    field-ink: "#20251E"     # Monolithic primary text, headings, strong borders/icons
    route-blue: "#4E7380"    # Illustrative map water, route accents, link emphasis
```

### 2.2 Semantic Aliases
```css
:root {
  --color-text-primary: var(--field-ink);
  --color-text-secondary: #4A5245;
  --color-text-muted: #596052;
  --color-text-inverse: var(--warm-surface);

  --color-surface-base: var(--warm-surface);
  --color-surface-raised: #FFFFFF;
  --color-surface-warm: var(--rice-cream);
  --color-surface-soft: rgba(252, 236, 216, 0.45);
  
  --color-action-primary: var(--field-olive);
  --color-action-primary-hover: #486320;
  --color-action-primary-text: var(--warm-surface);

  --color-border-subtle: rgba(32, 37, 30, 0.12);
  --color-border-strong: rgba(32, 37, 30, 0.28);
  --color-border-focus: var(--field-olive);

  --color-route-accent: var(--route-blue);
  --color-soil-accent: var(--soil-brown);
}
```

### 2.3 Verified Contrast Ratios (WCAG 2.2 AA)
- `field-ink` on `warm-surface`: **15.36:1** (PASS AAA)
- `field-ink` on `rice-cream`: **13.48:1** (PASS AAA)
- `warm-surface` on `field-olive`: **4.93:1** (PASS AA Normal Text, AAA Large)
- `soil-brown` on `rice-cream`: **8.32:1** (PASS AAA)
- `route-blue` on `warm-surface`: **5.05:1** (PASS AA)
- *Prohibited Pairings for Text*:
  - `route-blue` on `rice-cream` (4.44:1 - FAIL for normal text)
  - `field-olive` on `rice-cream` (4.33:1 - FAIL for normal text)
  - `warm-surface` on `young-leaf` (2.49:1 - STRICTLY FORBIDDEN FOR TEXT)

---

## 3. Typography Hierarchy

### 3.1 Typefaces
- **Display / headings / brand:** `Outfit Variable`, then `Outfit`, `system-ui`, sans-serif.
  - Weights: 600–700.
  - Letter-spacing: `-0.025em`.
  - Line-height: `1.1`–`1.25`.
  - Purpose: compact field-guide headings and decisive screen titles. Exactly one H1 per page.
- **UI / body / controls / tables:** `Atkinson Hyperlegible Next Variable`, then `Atkinson Hyperlegible Next`, `system-ui`, sans-serif.
  - Weights: 400, 500, 600, 700.
  - Body base: minimum `16px` on mobile.
  - Tabular numerals are mandatory for financial, kilogram, distance, and comparison data.

### 3.2 Typography Scale
- `H1`: 1.875rem mobile / 3rem desktop; leading tight.
- `H2`: 1.5rem mobile / 1.875rem desktop.
- `H3`: 1.25rem, semibold.
- `Body Large`: 1.125rem.
- `Body Base`: 1rem, line-height 1.5.
- `Caption / Meta`: 0.75–0.875rem, medium or semibold.
- `Data / Numerical Metric`: 1.25–2rem, bold with tabular numerals.

---

## 4. Spacing, Shapes & Elevation

### 4.1 Spacing Scale (8pt Grid)
- Scale: `4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px`
- Micro-padding / touch bounds: `4px, 8px`
- Card padding: `16px` (mobile), `24px` (desktop)
- Section spacing: `32px` (mobile), `48px - 64px` (desktop)

### 4.2 Border Radius
- `8px` (`rounded-lg`): Small form inputs, buttons, pills, tag badges
- `12px` (`rounded-xl`): Standard cards, tables, modal containers
- `16px` (`rounded-2xl`): Hero surfaces, mobile nonmodal bottom sheet, media wrappers

### 4.3 Depth & Elevation
- Subtle 1px borders (`border-field-ink/10`) paired with ambient warm shadows:
  - Base Card: `box-shadow: 0 1px 3px rgba(32, 37, 30, 0.05), 0 1px 2px rgba(32, 37, 30, 0.03)`
  - Elevated Popover / Bottom Sheet: `box-shadow: 0 10px 25px -5px rgba(32, 37, 30, 0.1), 0 8px 10px -6px rgba(32, 37, 30, 0.05)`
- Zero aggressive neon glows or heavy drop shadows.

---

## 5. Signature Visual Motif: The Harvest Route
The **Harvest Route** is a working decision surface, not decorative chrome. Discovery uses the full available width for synchronized map routes and outlet evidence.
- Desktop: one dominant cartographic plate with a compact harvest docket and a ruled outlet ledger beneath it.
- Mobile: a substantial map viewport paired with an indexed evidence sheet; never a shrunken desktop spread.
- Map and list selection remain bidirectionally synchronized.

---

## 6. Strict Anti-Vibecode Rules & Product Invariants
1. **NO Eyebrows / Kickers Above H1/H2**: Do not prepend uppercase tags or pill badges like `MORE MARKETS` or `BETTER CHOICES` above primary headings. Start directly with the headline.
2. **NO Fake Status Dots**: Colored green/red/amber dots are banned unless reflecting a live binary WebSocket/hardware connection. Use text labels + icons.
3. **NO Winner / AI Recommendation Badges**: Never crown an outlet as "Best Choice", "Optimal", or "AI Pick". Present options on equal visual footing; the farmer decides.
4. **NO "Profit" Labeling**: Transparent arithmetic only (`gross - entered transport = after entered transport`). Include notice: *"After entered transport only — not profit or guaranteed income."*
5. **Visible Demo Notices**: Prominently display `Demo — sample data` on all screens rendering fictional buyers, prices, or capacities.
6. **Map Truth**: The online MapLibre surface is an **interactive map**, while `ResilientLagunaMap` is an **illustrative/offline fallback**. Neither one implies live buyer demand, precise farm GPS, real-time traffic, or guaranteed travel time. Road distance/time may be shown only when a reviewed routing artifact provides it; otherwise label the Haversine value as straight-line distance.
7. **Zero Prompt Leakage**: Zero mention of `agent`, `prompt`, `seed`, `mock`, `anti-hallucination`, or internal architecture names in user-facing UI.
8. **Accessible Touch Targets**: Minimum 44x44px clickable bounds on mobile. Real `<button>` and `<a>` elements only; zero `<div onClick>`.


---

## 7. Premium Interaction Layer (September 22)

### Surface hierarchy
Use three intentional levels rather than nested-card stacking:
1. **Page plane** — Warm Surface.
2. **Decision surface** — raised white/warm surface for Harvest Ticket, selected result, comparison.
3. **Evidence inset** — Rice Cream/soft neutral for source, freshness, unknowns and confirmation.

A container earns a border only when it groups a distinct decision or interaction.

### Motion tokens
```css
--motion-instant: 80ms;
--motion-micro: 140ms;
--motion-ui: 220ms;
--motion-gentle: 360ms;
--ease-out: cubic-bezier(.2,.8,.2,1);
--ease-settle: cubic-bezier(.16,1,.3,1);
--travel-micro: 8px;
--travel-sheet: 16px;
```
Motion explains continuity; it never gates input. Prefer opacity/transform. Reduced motion uses immediate/static state changes.

### Ani character
Canonical Ani is a cream/ivory rounded seed-like character with asymmetric dark-olive and young-green leaf canopy, warm brown eyes, white highlights, tiny warm cheek dots and small rounded hands. Ani is quiet, friendly and agricultural—not a robot, orb, sparkle, farmer caricature or purple AI brand.

Semantic avatar states:
`idle | attentive | listening | thinking | working | speaking | success | uncertain | error | offline`.

Animation is derived from semantic state, not arbitrary props. Idle movement is rare and near-imperceptible. Listening must be visually explicit. Uncertain remains calm. Error never flashes. Reduced-motion uses static state changes.

### Assistant placement
Ani is contextual, not a permanent navigation destination. Desktop uses a compact trigger expanding into an integrated side/popover surface. Mobile uses an accessible floating trigger above the bottom navigation and safe area, opening a bottom sheet/near-full-height surface. Closed Ani is quiet and never covers primary actions.
