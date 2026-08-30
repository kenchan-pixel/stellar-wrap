# Scenic Route Preview｜航道景觀預覽

## Status

- **Candidate vertical slice on `autonomous-evolution`**
- Uses the approved journey-spectacle / destination-identity direction from `docs/ROADMAP.md`.
- Real Space routing, coordinates, flight timing and arrival authority remain unchanged.

## Goal / intended player outcome

Make route planning feel like choosing a voyage rather than reading only distance and ETA. Before launch, the existing Real Space map panel should preview the visual identity of every planned leg so a long multi-leg journey has a readable scenic rhythm before the player commits to flight.

## Scope

- Add a compact `航道景觀預覽` section directly after the existing route-leg list inside the navigation panel.
- Read the authoritative planned route only from `WarpSim.state().route`.
- Read corridor names/signatures only from existing `WarpJourneyAtmosphere.corridors()` and destination names from `WarpJourneyAtmosphere.profiles()`.
- Render one bounded card per planned leg with leg number, corridor identity, visual signature and next destination.
- Each corridor card now includes a static **cinematic storyboard viewport** built from bounded CSS layers. The nine existing canonical Real Space corridors receive distinct route-specific motifs (for example Earth/Moon shadow arcs, VEGA gate rings, CYG guide beams, ORION emission haze, TAU dust/ice transition and PROX magnetic glow) so the player can visually read the journey sequence before launch instead of seeing text-only cards.
- Storyboard viewports are decorative/presentation-only: they use no image asset, WebGL object, filter pipeline, animation loop or route logic. Reverse travel reuses the same canonical visual identity while the card vector label reflects the actual direction.
- Reuse the same canonical corridor profile for reverse travel; do not duplicate route-edge metadata.
- Refresh only when the existing `#routeLegs` child list is rebuilt, using one bounded `MutationObserver` plus microtask coalescing.
- Include the presentation module in the prepared offline shell.

## Acceptance Criteria

1. Selecting the approved long route `SOL → LUNA → VEGA → CYG → ORION` shows exactly four scenic cards: `地月影錐`, `星門引導弧`, `藍紫導引束`, `獵戶發射雲絲`.
2. Those four cards each show a distinct static visual storyboard matching the canonical corridor identity, while keeping route text readable underneath.
3. Planning `ORION → CYG → VEGA → LUNA → SOL` reuses those same canonical corridor profiles and storyboard identities in reverse order instead of creating a second route table.
4. A direct `SOL → SIRIUS` route shows one `冰藍剪切層` scenic card with the ice-shear storyboard.
5. The preview stays inside the existing map panel, creates no page-level horizontal overflow at 390×844 or 360×800, and uses its own bounded horizontal card track when multiple legs exist.
6. The preview is informational only: it adds no launch/navigation controls and cannot alter the selected route.
7. No coordinates, Dijkstra logic, distance formula, flight phase, simulation timing, camera, renderer or arrival curve is copied or modified.
8. No storage key, backend, network request, analytics, polling timer, animation loop or Three.js object is added.
9. Existing V4+ travel, Journey Atmosphere, Cinematic High-tier, Photo Capture Boost, Focus Tray, Mode Gateway / Gallery and all Frontier destinations remain green under the repository validation suite.

## Out of Scope

- Scenic-route recommendation or route scoring.
- Replacing shortest-path routing with a scenic path algorithm.
- New 3D corridor geometry or extra warp particles.
- Frontier Fiction route planning or Frontier persistence.
- New storage, account, backend or sharing systems.

## Performance contract

This slice is DOM/CSS-only presentation. It performs no work in the 60 Hz renderer loop and adds no CSS animation. The single observer is attached only to direct child changes in `#routeLegs`; multiple synchronous redraw mutations are coalesced into one microtask render. Each card uses three bounded decorative spans plus one short vector label, and the number of cards remains inherently bounded by the existing eight-system Real Space route.

## Validation evidence required

- `npm run check` must pass on the exact PR HEAD.
- Production Chromium at 390×844 and 360×800 must execute the real app, plan the approved SOL→ORION multi-leg route, verify four corridor cards and viewport containment, and save screenshots showing the storyboard treatment.
- The same runtime gate must prove reverse-profile reuse and the direct SOL→SIRIUS case.
- Visual inspection must confirm that the four long-route storyboard cards are visibly differentiated and do not create black frames, clipping or unreadable route text.
- Security / dependency inspection must confirm zero new network, persistence, backend or renderer authority.

## Completion signal

From the existing Real Space star map, a player can select a destination and immediately see a compact visual storyboard of the distinctive scenic sequence of the actual planned route before launch, while the underlying V4 navigation and travel simulation remain untouched.