# Mode Gateway Cinematic Postcards

## Status

Approved autonomous vertical slices on the persistent `autonomous-evolution` branch. This document records the landing-page and Gallery record visual contracts; it does not create new route, storage, capture, or rendering authority.

## Goal / intended outcome

Make the existing exploration gateway feel like an immediate part of Stellar Wrap rather than a plain menu. Players should be able to identify Continue Journey, Real Space, Frontier Fiction, Gallery / Captures, and the four existing Frontier destinations by visual silhouette before reading every line of copy.

Gallery should also make completed Real Space journeys feel like records worth revisiting, rather than plain text rows. The record surface must still use the existing Travel Journal as its only journey authority.

## Scope

- Add lightweight cinematic identity art to the four existing mode cards.
- Add destination-specific miniature silhouettes to AURELIA, NADIR, VESPER, and EIDOLON in the existing Frontier destination selector.
- Keep the existing landing hierarchy, destination confirmation, Real Space handoff, Frontier scenic shell, and Gallery behavior unchanged.
- Reuse the existing landing DOM and add only decorative spans plus CSS gradients/borders.
- Keep decorative layers `pointer-events:none` and `aria-hidden=true`.
- Cache the cinematic module in the existing offline shell.

## Visual identities

- Continue Journey: bounded route line and arrival markers.
- Real Space: blue planetary crescent with orbital line.
- Frontier Fiction: artificial ring silhouette around a dark aperture.
- Gallery / Captures: layered capture-frame silhouette.
- AURELIA: luminous habitat ring and central core.
- NADIR: dark event-horizon disk and accretion ring.
- VESPER: banded gas giant and extraction ring.
- EIDOLON: paired broken / dashed ancient-gate arcs.

These are abstract original silhouettes assembled with CSS. They do not copy franchise locations, logos, screenshots, or external image assets.

## Gallery Voyage Postcards v2

### User outcome

When Gallery / Captures shows completed Real Space journeys, each recent voyage now reads as a destination-specific cinematic postcard. The existing destination name, route, distance/time, discovery outcome and safe `再次前往` action remain authoritative; the new art gives the record immediate place identity without inventing a screenshot library.

### Scope

- Decorate only the existing bounded `#modeGatewayJourneyList` cards produced from Travel Journal entries.
- Infer the destination from the existing `data-revisit` handoff already attached to each journey card; do not duplicate route or destination persistence.
- Cover all eight Real Space systems with distinct lightweight silhouettes:
  - SOL Earth/orbit
  - LUNA lunar foreground + Earthrise cue
  - VEGA gate aperture
  - CYG twin-star beacon
  - ORION red giant / nebula
  - TAU ringed giant
  - SIRIUS dual-star relay
  - PROX red dwarf / starport
- Keep the existing maximum five recent voyage cards.
- Use one scoped `MutationObserver` on the journey-list child set so cards replaced by the existing Gallery refresh are immediately redecorated.
- Decorative art stays `aria-hidden`, `pointer-events:none`, CSS-only, and bounded inside each record card.

### Acceptance criteria

- Existing four mode-card and four Frontier destination cinematic identities remain intact.
- A Gallery populated with TAU and ORION journeys produces exactly two cinematic voyage cards with matching destination art.
- Replacing the existing journey list after a real `stellarwarp:journey-complete` refresh redecorates the new SIRIUS card without a timer or global subtree observer.
- Journey record controls retain at least 44 px touch height.
- 390×844 and 360×800 production Chromium show the postcard surface with no horizontal overflow; destination art remains visibly sized and cannot intercept input.
- Travel Journal remains the journey authority and the existing route replanning handoff remains unchanged.
- The slice adds zero new persistence, zero network requests, zero Three.js/WebGL objects, zero draw calls, zero simulation/camera/route authority and zero image-byte storage.

### Out of scope

- Storing generated PNG bytes or creating a second image library.
- Changing Photo Mode capture DPR, framing or file export.
- New Gallery filtering, sorting, cloud sync or account features.
- New Real Space routes or Frontier route simulation.
- Replacing Travel Journal or Star Atlas persistence.

### Completion signal

The Gallery record surface visibly distinguishes recent destinations as scenic postcards on both mobile acceptance viewports, survives an existing journey-list refresh, keeps the safe replan controls usable, and passes exact-head repository/browser validation without adding data or renderer authority.

## Performance / architecture boundary

The pass adds no Three.js renderer, canvas, animation loop, timer, network request, storage, route logic, or capture path. Landing decoration is installed once after the existing gateway DOM becomes available. Gallery Voyage Postcards use a scoped child-list observer only while the existing journey-list host exists. The visual layer uses only DOM/CSS and does not change simulation timing or the V4+ travel state machine.

## Baseline acceptance criteria

1. Four primary mode cards expose distinct cinematic art.
2. All four Frontier destination controls expose distinct destination identity miniatures.
3. Decorative art never intercepts touch or keyboard interaction.
4. 390×844 and 360×800 portrait layouts retain at least 44 px control height and no horizontal overflow.
5. A real Chromium trusted touch on Frontier Fiction still hands focus to AURELIA after decoration.
6. The exact runtime produces non-empty mobile screenshots at both acceptance viewports.
7. The offline shell includes `mode-gateway-cinematic.js`.
8. No route, storage, network, Three.js, or simulation authority is added.

## Out of scope

- New Frontier destinations or lore.
- Real Space route changes.
- New Gallery image persistence.
- New WebGL rendering passes.
- Changing Photo Mode or capture DPR.
- Reworking the existing landing information architecture.

## Completion signal

Each slice is complete when repository validation and its focused real-browser gate pass on the exact pushed HEAD, the persistent Draft PR contains the evidence, and exact-head review has no actionable P0/P1/P2 finding.
