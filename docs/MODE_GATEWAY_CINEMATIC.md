# Mode Gateway Cinematic Postcards

## Status

Approved autonomous vertical slice on the persistent `autonomous-evolution` branch. This document records the landing-page visual contract; it does not create new route, storage, capture, or rendering authority.

## Goal / intended outcome

Make the existing exploration gateway feel like an immediate part of Stellar Wrap rather than a plain menu. Players should be able to identify Continue Journey, Real Space, Frontier Fiction, Gallery / Captures, and the four existing Frontier destinations by visual silhouette before reading every line of copy.

## Scope

- Add lightweight cinematic identity art to the four existing mode cards.
- Add destination-specific miniature silhouettes to AURELIA, NADIR, VESPER, and EIDOLON in the existing Frontier destination selector.
- Keep the existing landing hierarchy, destination confirmation, Real Space handoff, Frontier scenic shell, and Gallery behavior unchanged.
- Reuse the existing landing DOM and add only decorative spans plus CSS gradients/borders.
- Keep decorative layers `pointer-events:none` and `aria-hidden=true`.
- Cache the new module in the existing offline shell.

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

## Performance / architecture boundary

The pass adds no Three.js renderer, canvas, animation loop, timer, network request, storage, route logic, or capture path. Decoration is installed once after the existing gateway DOM becomes available; a temporary `MutationObserver` disconnects immediately after successful decoration. The visual layer uses only DOM/CSS and does not change simulation timing or the V4+ travel state machine.

## Acceptance criteria

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

The slice is complete when repository validation and the focused real-browser gate pass on the exact pushed HEAD, the persistent Draft PR contains the evidence, and exact-head review has no actionable P0/P1/P2 finding.