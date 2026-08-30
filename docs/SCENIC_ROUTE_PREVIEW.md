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
- Reuse the same canonical corridor profile for reverse travel; do not duplicate route-edge metadata.
- Refresh only when the existing `#routeLegs` child list is rebuilt, using one bounded `MutationObserver` plus microtask coalescing.
- Include the presentation module in the prepared offline shell.

## Acceptance Criteria

1. Selecting the approved long route `SOL → LUNA → VEGA → CYG → ORION` shows exactly four scenic cards: `地月影錐`, `星門引導弧`, `藍紫導引束`, `獵戶發射雲絲`.
2. Planning `ORION → CYG → VEGA → LUNA → SOL` reuses those same canonical corridor profiles in reverse order instead of creating a second route table.
3. A direct `SOL → SIRIUS` route shows one `冰藍剪切層` scenic card.
4. The preview stays inside the existing map panel, creates no page-level horizontal overflow at 390×844 or 360×800, and uses its own bounded horizontal card track when multiple legs exist.
5. The preview is informational only: it adds no launch/navigation controls and cannot alter the selected route.
6. No coordinates, Dijkstra logic, distance formula, flight phase, simulation timing, camera, renderer or arrival curve is copied or modified.
7. No storage key, backend, network request, analytics, polling timer, animation loop or Three.js object is added.
8. Existing V4+ travel, Journey Atmosphere, Cinematic High-tier, Photo Capture Boost, Focus Tray, Mode Gateway / Gallery and all Frontier destinations remain green under the repository validation suite.

## Out of Scope

- Scenic-route recommendation or route scoring.
- Replacing shortest-path routing with a scenic path algorithm.
- New 3D corridor geometry or extra warp particles.
- Frontier Fiction route planning or Frontier persistence.
- New storage, account, backend or sharing systems.

## Performance contract

This slice is DOM-only presentation. It performs no work in the 60 Hz renderer loop. The single observer is attached only to direct child changes in `#routeLegs`; multiple synchronous redraw mutations are coalesced into one microtask render. The number of cards is inherently bounded by the existing eight-system Real Space route.

## Validation evidence required

- `npm run check` must pass on the exact PR HEAD.
- Production Chromium at 390×844 and 360×800 must execute the real app, plan the approved SOL→ORION multi-leg route, verify four corridor cards and viewport containment, and save screenshots.
- The same runtime gate must prove reverse-profile reuse and the direct SOL→SIRIUS case.
- Security / dependency inspection must confirm zero new network, persistence, backend or renderer authority.

## Completion signal

From the existing Real Space star map, a player can select a destination and immediately see the distinctive scenic sequence of the actual planned route before launch, while the underlying V4 navigation and travel simulation remain untouched.
