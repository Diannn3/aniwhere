# Generation prompts and visual QA — screens 04–06

Generated 18 September 2026 with the built-in image generator. Each generation call used the corresponding original UI reference first and supplied logo image 11 second. The images are individual UI concepts, not functioning or accessibility-tested application screens. The first screen was generated successfully after the delegated agent reached its usage limit; screen 05's first parallel request failed and was rerun successfully; screen 06's first draft was retained as `06-mobile-discover-v1.png` for audit history, then regenerated with corrected fixture terms and the final file below.

## 04 — `04-mobile-detail.png`

Inputs, in order:

1. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-4.png` — original mobile detail composition/style reference.
2. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-11.png` — supplied AniWhere logo reference.

Original generated output: `C:\Users\Dian\.codex\generated_images\01a0a563-4122-7502-b000-f23980eeb67b\exec-1cca1690-7f00-47e3-a711-a0b387788d3c.png`.

### Exact submitted prompt

```text
Use case: ui-mockup. Generate one polished, high-fidelity AniWhere mobile app screen, using Image 1 as the layout/style reference and Image 2 as the supplied AniWhere logo reference. Preserve the logo's rounded A silhouette, winding white route, green fields and brown soil and place it cleanly beside the wordmark "AniWhere"; no white sticker, no invented redesign. This is a visual reference reconstruction with corrected product content, not a real data claim.

Asset type: direct portrait mobile app UI screen, approximately 1024x1536 ratio, no physical phone bezel, no device status bar, no browser chrome, no collage, no second screen.
Style: premium warm editorial agricultural product. Source Serif 4-like display headings, Source Sans 3-like interface text, crisp readable hierarchy, generous 8-point spacing, subtle borders, restrained shadows, consistent Lucide-like outline icons.
Palette: Field Olive #597928, Young Leaf #91AC67, Soil Brown #6E3511, Rice Cream #FCECD8, Warm Surface #FFFDF8, Field Ink #20251E, Route Blue #4E7380. Use Ink for essential text, Warm Surface text on Olive actions, Brown for secondary emphasis. No generic gradients, fake status dots, emoji icons or handwritten slogans.

Screen 04: fictional Demo Cooperative place detail for a farmer with Tomatoes, 300 kg, from Los Baños, Laguna, ready 17 Sep 2026. Include a clear but unobtrusive "Demo — sample data" notice near the top and "Illustrative map" if a map appears. Show the place role, one explainable fit state labeled exactly "Matches your harvest", and a short reason: "Listed for tomatoes and accepts up to 300 kg." Use visible terms: "PHP 28 / kg", "300 kg accepted", "PHP 8,400 gross", "PHP 600 entered transport", "PHP 7,800 after entered transport", "0 kg remaining". Label the calculation as after entered transport, never profit or net income. Include "Confirm terms before travel", requirements as questions to confirm, a schematic route/context panel without invented exact kilometers or minutes, and contact-preparation actions such as "Prepare message" or "Call / public contact". Do not use a real organization name, real person, phone, email, registration, review, guarantee, onsite inspection or precise route. Do not use a match percentage. Keep one clear primary action and readable vertical scrolling hierarchy. All visible copy must be intentional and limited to these product details; do not add metrics or unsupported claims.
```

### Visual inspection

One direct portrait UI with the supplied A logo, no device frame. Demo Cooperative, Los Baños, Tomatoes, 300 kg, PHP 28/kg, PHP 8,400 gross, PHP 600 entered transport, PHP 7,800 after entered transport and 0 kg remaining are readable and arithmetically correct. The map is labeled illustrative and has no exact distance. The generator added a generic descriptive sentence and a footer brand line; they are harmless visual filler but should be omitted in code. The photo sign says Demo Cooperative, which is appropriate for a fictional fixture. Treat every location, photo and term as illustrative.

## 05 — `05-mobile-compare.png`

Inputs, in order:

1. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-5.png` — original mobile comparison composition/style reference.
2. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-11.png` — supplied AniWhere logo reference.

Original generated output: `C:\Users\Dian\.codex\generated_images\01a0a563-4122-7502-b000-f23980eeb67b\exec-f7b0e570-25a7-425a-846c-47d7fca588ef.png`.

### Exact submitted prompt

```text
Use case: ui-mockup. Generate one polished high-fidelity AniWhere mobile app screen for comparison. Input image 1 is the corresponding original AniWhere comparison UI reference for composition and hierarchy. Input image 2 is the supplied AniWhere logo; preserve the rounded A silhouette with the winding white route, green fields and brown soil and integrate it cleanly beside the exact wordmark "AniWhere". Direct portrait mobile application screen, no phone bezel, no status bar, no browser chrome, no collage, no extra screen. This is a fictional demo interface.

Style and design: premium warm editorial agricultural product, Source Serif 4-like display headings, Source Sans 3-like UI text, generous 8-point spacing, clear dividers, readable 16px+ data, subtle shadows, consistent Lucide-like outline icons. Use only supplied brand palette in interface: Field Olive #597928, Young Leaf #91AC67, Soil Brown #6E3511, Rice Cream #FCECD8, Warm Surface #FFFDF8, Field Ink #20251E, Route Blue #4E7380. Ink for text, Warm Surface text on Olive primary controls. No gradients, fake status dots, emoji icons, handwritten slogans, unsupported scores or metrics.

Screen specification: comparison for Tomatoes, 300 kg, Los Baños, Laguna, ready 17 Sep 2026. Header with logo, back control and EN / FIL switch. Large heading "Compare options" and a visible "Demo — sample data" notice. Use a vertical comparison that never requires horizontal scrolling. Show exactly three fictional options with equal visual treatment:
- Demo Cooperative — 300 kg accepted, 0 kg remaining, PHP 28/kg, PHP 8,400 gross, PHP 600 entered transport, PHP 7,800 after entered transport.
- Demo Processor — 300 kg, 0 kg, PHP 32/kg, PHP 9,600 gross, PHP 300 entered transport, PHP 9,300 after entered transport.
- Demo Market — 200 kg accepted, 100 kg remaining, PHP 30/kg, PHP 6,000 gross, PHP 300 entered transport, PHP 5,700 after entered transport.
Explain once: "After entered transport only — not profit or guaranteed income." Include accepted quantity, remaining harvest, price, gross, entered transport, after-entered-transport amount, and a clear "Confirm terms before travel." Include accessible "View details" or "Choose this option" actions without calling any option best/recommended. Do not add exact kilometers, minutes, real business names, fake photos, ratings, verification, guarantees, inquiry counts or other numbers. Render only this single practical UI screen with readable copy; preserve all arithmetic exactly.
```

### Visual inspection

One direct portrait comparison screen. All three options and arithmetic are correct, equal card treatment is preserved, and the demo notice plus entered-transport disclaimer are visible. The subtitle says “Find the best outlet”, which is a mild copy drift toward ranking; implementation should change it to “See how each option handles your harvest.” The cards have no best badge or recommendation crown. No routes, distances, real names or verification claims appear.

## 06 — `06-mobile-discover.png`

Inputs, in order:

1. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-6.png` — original mobile discovery map/sheet composition/style reference.
2. `C:/Users/Dian/.codex/attachments/9ba8576b-a4c9-4997-8e02-2c298ff30e66/image-11.png` — supplied AniWhere logo reference.

First draft retained for audit history: `C:\Users\Dian\.codex\generated_images\01a0a563-4122-7502-b000-f23980eeb67b\exec-9fdb1d78-1025-4c49-88fa-891b660ca52d.png`, copied to `06-mobile-discover-v1.png`. Final generated output: `C:\Users\Dian\.codex\generated_images\01a0a563-4122-7502-b000-f23980eeb67b\exec-397ad223-bdc4-49f9-9f75-1949bd54a8c6.png`.

### Exact submitted prompt for final output

```text
Use case: ui-mockup. Generate exactly one polished high-fidelity AniWhere mobile discovery app screen. Input image 1 is the original mobile map/results inspiration. Input image 2 is the supplied AniWhere logo reference. Preserve the logo's rounded A silhouette, winding white route, green fields, brown soil and exact wordmark “AniWhere”. Direct portrait app UI, no phone bezel, no status bar, no browser chrome, no collage, no second screen.

Warm premium editorial agricultural interface: Source Serif 4-like headings, Source Sans 3-like UI, readable text, generous 8-point spacing, quiet map, subtle borders, restrained shadows, consistent Lucide-like outline icons. Use interface palette Field Olive #597928, Young Leaf #91AC67, Soil Brown #6E3511, Rice Cream #FCECD8, Warm Surface #FFFDF8, Field Ink #20251E, Route Blue #4E7380. Ink text and Warm Surface text on Olive actions. No gradients, percentages, scores, fake status dots, emoji icons, handwritten slogans, real businesses, real locations as buying claims, fake distances, fake times, ratings or verification.

Screen 06: farmer discovery for Tomatoes, 300 kg, Los Baños, Laguna, ready 17 Sep 2026. Header is logo plus exact bottom navigation labels Home, Discover, Saved only; show a visible EN / FIL switch. At top use a search summary: Tomatoes | 300 kg | Los Baños, Laguna. Show an explicit “Demo — sample data” notice and label the map “Illustrative map”. Use a calm schematic Laguna map with generic unlabeled pins or only the label Los Baños; do not draw a route or assert distance. Add an explicit Map / List toggle. The lower rounded sheet is titled “Places that may buy tomatoes” and has exactly three fictional result rows, each with no photo required:
1) Demo Cooperative — “Matches your harvest” — “Accepts 300 kg of tomatoes. Confirm grade and delivery terms.”
2) Demo Processor — “Matches your harvest” — “Accepts 300 kg for processing. Confirm quality and schedule.”
3) Demo Market — “Accepts part of your harvest” — “Accepts 200 kg. 100 kg would remain.”
Do not show prices in this map screen. Do not use “Messages”, “Profile”, “Buyers”, inquiry counts, match percentages, exact kilometers, minutes, road labels, market statistics or extra organizations. Keep the sheet only partially expanded so the map/list relationship is clear, but all three names and fit states must be readable. Add one small line “Confirm terms before travel.” Render only this one practical UI screen.
```

### Visual inspection

Final output is one direct portrait UI with a clear map/sheet relationship, correct three fictional names and fit explanations, exact Home / Discover / Saved navigation, EN / FIL switch, and visible demo/illustrative labels. No prices, distances, percentages, or real organizations appear. The first draft used Messages/Profile navigation and drifted to a 200 kg processor term; it is intentionally not the gallery final. The final map uses illustrative geography and must be recreated with real map data only during implementation.
