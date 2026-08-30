# Scenic Route Preview｜航道景觀預覽

## Status

- **Candidate vertical slice on `autonomous-evolution`**
- Uses the approved journey-spectacle / destination-identity direction from `docs/ROADMAP.md`.
- Real Space routing, coordinates, flight timing and arrival authority remain unchanged.

## Goal / intended player outcome

Make route planning feel like choosing a voyage rather than reading only distance and ETA. Before launch, the existing Real Space map panel previews the visual identity of every planned leg and finishes with the destination's own arrival composition. On a phone, the player can now deliberately jump between the start of the trailer and its Arrival Finale instead of relying on a subtle horizontal scrollbar or discovering the final frame by chance.

## Scope

- Keep the compact `航道景觀預覽` section directly after the existing route-leg list inside the navigation panel.
- Read the authoritative planned route only from `WarpSim.state().route`.
- Read corridor names/signatures and destination identity only from existing `WarpJourneyAtmosphere.corridors()` / `profiles()` presentation metadata.
- Render one bounded card per planned leg with leg number, corridor identity, visual signature and next destination.
- Each corridor card includes a static cinematic storyboard viewport built from bounded CSS layers. The nine existing canonical Real Space corridors retain distinct route-specific motifs.
- Append exactly one **Arrival Finale** card after the corridor sequence. It uses the actual final destination from the selected route and one of eight bounded destination-specific CSS compositions.
- The Arrival Finale preserves the approved travel story `曲速脫離 → 連續減速 → 到站探索`; it remains presentation-only and does not create a second arrival state machine.
- Add two preview-local mobile navigation controls: `起點景觀` and `看抵達構圖`. Each keeps the 44 px touch baseline and only scrolls the existing scenic-card track; neither control launches, replans, mutates or selects a route.
- `看抵達構圖` exposes a destination-specific accessible label such as `查看獵戶前哨抵達構圖` while keeping the visible control compact.
- Reduced-motion users receive an immediate scroll jump; other users may use the browser's bounded smooth horizontal scroll. No timer or animation loop is introduced.
- Refresh only when the existing `#routeLegs` child list is rebuilt, using one bounded `MutationObserver` plus microtask coalescing.
- The existing presentation module remains part of the prepared offline shell.

## Acceptance Criteria

1. Selecting `SOL → LUNA → VEGA → CYG → ORION` shows exactly four scenic corridor cards — `地月影錐`, `星門引導弧`, `藍紫導引束`, `獵戶發射雲絲` — followed by exactly one ORION Arrival Finale.
2. The four corridor cards remain visually distinct, while the ORION finale identifies `獵戶前哨` plus the approved exit/deceleration/exploration handoff.
3. At both 390×844 and 360×800, trusted mobile touch on `看抵達構圖` must make the final ORION card fully revealable inside the bounded horizontal track; trusted touch on `起點景觀` must return the first scenic card fully into view.
4. Using either preview navigator must leave `WarpSim.state().route` byte-for-byte equivalent at the route-ID level; the controls are presentation navigation, not travel navigation.
5. Both preview navigation controls retain at least a 44 px rendered touch height and cannot create page-level horizontal overflow.
6. Planning `ORION → CYG → VEGA → LUNA → SOL` reuses the same canonical corridor profiles in reverse order and ends with the SOL arrival composition.
7. A direct `SOL → SIRIUS` route shows one `冰藍剪切層` scenic card followed by exactly one SIRIUS Arrival Finale.
8. All eight Real Space destinations retain their own bounded arrival composition identity without copying coordinates, scene geometry or renderer state into this presentation module.
9. No coordinates, Dijkstra logic, distance formula, flight phase, simulation timing, camera, renderer or arrival curve is copied or modified.
10. No storage key, backend, network request, analytics, polling timer, independent animation loop or Three.js object is added.
11. Existing V4+ travel, Journey Atmosphere, Cinematic High-tier, Photo Capture Boost, Focus Tray, Mode Gateway / Gallery and all Frontier destinations remain green under the repository validation suite.

## Out of Scope

- Scenic-route recommendation or route scoring.
- Replacing shortest-path routing with a scenic path algorithm.
- Launch, destination selection or flight controls inside the route trailer.
- New 3D corridor geometry or extra warp particles.
- A second arrival state machine or camera controller.
- Frontier Fiction route planning or Frontier persistence.
- New storage, account, backend or sharing systems.

## Performance contract

This slice stays DOM/CSS presentation only. It performs no work in the 60 Hz renderer loop, creates no extra WebGL object and adds no JavaScript timer. The single observer remains attached only to direct child changes in `#routeLegs`; multiple synchronous redraw mutations are coalesced into one microtask render. The new controls only invoke one browser-native horizontal `scrollTo` operation per user action. Card count remains inherently bounded by the existing eight-system Real Space route.

## Validation evidence required

- `npm run check` must pass on the exact PR HEAD.
- Production Chromium at 390×844 and 360×800 must execute the real app and plan the approved SOL→ORION route.
- The browser gate must use trusted touch input on both new preview controls, prove their rendered target height is ≥44 px, prove the Arrival Finale and first card become fully visible in the track, and prove the authoritative route is unchanged before/after those touches.
- The same runtime gate must retain reverse-profile reuse and the direct SOL→SIRIUS case.
- Static validation must prove all eight destination-specific arrival identities remain present while the module still has zero storage/network/timer/render-loop/Three.js route authority.
- Screenshots must retain the normal trailer view and the revealed Arrival Finale at both phone viewports without page overflow, clipping or black frames.
- Security / dependency inspection must confirm zero new network, persistence, backend or renderer authority.

## Risks / supplementary manual checks

- Physical iPhone Safari can still provide supplementary evidence for tactile horizontal-scroll feel and native momentum, but it is not a completion gate when trusted Chromium touch/runtime evidence is green.
- Long-route trailer density should remain readable in portrait; the explicit finale jump reduces dependence on manually swiping across four corridor cards.

## Completion signal

From the existing Real Space star map, a player can select a destination, see the actual corridor trailer, use a 44 px phone control to reveal the destination-specific Arrival Finale immediately, and jump back to the first scenic leg without mutating the planned route. The underlying V4 navigation, flight timing, renderer and continuous arrival simulation remain untouched.