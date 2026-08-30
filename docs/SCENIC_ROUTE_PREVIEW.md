# Scenic Route Preview｜航道景觀預覽

## Status

- **Candidate vertical slice on `autonomous-evolution`**
- Uses the approved journey-spectacle / destination-identity direction from `docs/ROADMAP.md`.
- Real Space routing, coordinates, flight timing and arrival authority remain unchanged.

## Goal / intended player outcome

Make route planning feel like choosing a voyage rather than reading only distance and ETA. Before launch, the existing Real Space map panel should preview the visual identity of every planned leg and now finish that sequence with the destination's own arrival composition, so a long multi-leg journey reads as a complete miniature travel trailer rather than ending at the last corridor card.

## Scope

- Add a compact `航道景觀預覽` section directly after the existing route-leg list inside the navigation panel.
- Read the authoritative planned route only from `WarpSim.state().route`.
- Read corridor names/signatures and destination identity only from existing `WarpJourneyAtmosphere.corridors()` / `profiles()` presentation metadata.
- Render one bounded card per planned leg with leg number, corridor identity, visual signature and next destination.
- Each corridor card includes a static **cinematic storyboard viewport** built from bounded CSS layers. The nine existing canonical Real Space corridors receive distinct route-specific motifs (for example Earth/Moon shadow arcs, VEGA gate rings, CYG guide beams, ORION emission haze, TAU dust/ice transition and PROX magnetic glow) so the player can visually read the journey sequence before launch instead of seeing text-only cards.
- Append exactly one **Arrival Finale** card after the corridor sequence. It uses the actual final destination from the selected route and one of eight bounded destination-specific CSS compositions: SOL Earth/Moon return, LUNA moon/ring approach, VEGA star-gate frame, CYG twin-star beacon, ORION red-giant/nebula/outpost, TAU ringed giant, SIRIUS dual-star relay, or PROX red-dwarf/lava/starport.
- The Arrival Finale explicitly preserves the approved travel story `曲速脫離 → 連續減速 → 到站探索`; it is presentation only and does not create a second arrival state machine.
- Storyboard viewports are decorative/presentation-only: they use no image asset, WebGL object, filter pipeline, animation loop or route logic. Reverse travel reuses the same canonical corridor visual identity while the final arrival composition follows the actual destination.
- Refresh only when the existing `#routeLegs` child list is rebuilt, using one bounded `MutationObserver` plus microtask coalescing.
- Include the presentation module in the prepared offline shell.

## Acceptance Criteria

1. Selecting the approved long route `SOL → LUNA → VEGA → CYG → ORION` shows exactly four scenic corridor cards: `地月影錐`, `星門引導弧`, `藍紫導引束`, `獵戶發射雲絲`, followed by exactly one ORION Arrival Finale card.
2. The four corridor cards each show a distinct static visual storyboard matching the canonical corridor identity, while the ORION finale is visibly different and identifies `獵戶前哨` plus the approved exit/deceleration/exploration handoff.
3. Planning `ORION → CYG → VEGA → LUNA → SOL` reuses those same canonical corridor profiles and storyboard identities in reverse order, then ends with the SOL Earth/Moon arrival composition instead of retaining ORION's finale.
4. A direct `SOL → SIRIUS` route shows one `冰藍剪切層` scenic card followed by exactly one SIRIUS dual-star/relay Arrival Finale.
5. All eight Real Space destinations have their own bounded arrival composition identity without copying coordinates, scene geometry or renderer state into this presentation module.
6. The preview stays inside the existing map panel, creates no page-level horizontal overflow at 390×844 or 360×800, and uses its own bounded horizontal card track when multiple legs exist.
7. The preview is informational only: it adds no launch/navigation controls and cannot alter the selected route.
8. No coordinates, Dijkstra logic, distance formula, flight phase, simulation timing, camera, renderer or arrival curve is copied or modified.
9. No storage key, backend, network request, analytics, polling timer, animation loop or Three.js object is added.
10. Existing V4+ travel, Journey Atmosphere, Cinematic High-tier, Photo Capture Boost, Focus Tray, Mode Gateway / Gallery and all Frontier destinations remain green under the repository validation suite.

## Out of Scope

- Scenic-route recommendation or route scoring.
- Replacing shortest-path routing with a scenic path algorithm.
- New 3D corridor geometry or extra warp particles.
- A second arrival state machine or camera controller.
- Frontier Fiction route planning or Frontier persistence.
- New storage, account, backend or sharing systems.

## Performance contract

This slice is DOM/CSS-only presentation. It performs no work in the 60 Hz renderer loop and adds no CSS animation. The single observer is attached only to direct child changes in `#routeLegs`; multiple synchronous redraw mutations are coalesced into one microtask render. Each corridor card uses three bounded decorative spans plus one short vector label, and the single final arrival card uses the same bounded three-layer pattern. Card count remains inherently bounded by the existing eight-system Real Space route.

## Validation evidence required

- `npm run check` must pass on the exact PR HEAD.
- Production Chromium at 390×844 and 360×800 must execute the real app, plan the approved SOL→ORION multi-leg route, verify four corridor cards + exactly one ORION Arrival Finale, confirm viewport containment, and save screenshots showing the full trailer sequence.
- The same runtime gate must prove reverse-profile reuse ends with a SOL finale and the direct SOL→SIRIUS case ends with exactly one SIRIUS finale.
- Static validation must prove all eight destination-specific arrival visual identities exist while the module still has zero storage/network/timer/render-loop/Three.js authority.
- Visual inspection must confirm the arrival frame reads as the climax of the route sequence without black frames, clipping or unreadable route text.
- Security / dependency inspection must confirm zero new network, persistence, backend or renderer authority.

## Completion signal

From the existing Real Space star map, a player can select a destination and immediately see a compact route trailer: the distinctive scenic sequence of the actual planned corridors followed by a destination-specific arrival frame, while the underlying V4 navigation, flight timing and continuous arrival simulation remain untouched.