# Mode Gateway + Frontier Scenic Route

## Status

- Persistent `autonomous-evolution` Draft PR vertical slice.
- Product direction is approved in `docs/DECISIONS.md` D-015.
- Real Space V4.1 remains the release baseline and navigation authority.

## Goal / intended user outcome

Make Frontier Fiction feel like part of the same product instead of four independent rotatable model demos. A player should choose a science-fiction destination from one clear landing hierarchy, arrive through the existing destination approach, then view one curated scenic composition with the same compact controls everywhere.

## Scope

### Landing / destination hierarchy

The top-level gateway remains exactly four actions:

1. **Continue Journey** — return to the current/restored Real Space state without replanning.
2. **Real Space** — existing eight-system V4+ map and travel.
3. **Frontier Fiction** — focus the unified four-destination Frontier selector; it no longer silently enters AURELIA.
4. **Gallery / Captures** — existing read-only journey/discovery record surface and Real Space Photo Mode handoff.

Frontier destinations are now one equal 2×2 mobile grid:

- `AURELIA ARC｜曙光環域`
- `NADIR WELL｜玄淵觀測站`
- `VESPER YARD｜暮環採集場`
- `EIDOLON GATE｜遺光門廊`

There is no separate `Featured Expedition` pointer and no destination receives hidden priority.

### Frontier Scenic Route shell

`frontier-scenic.html?dest=<ID>` is the user-facing Frontier shell. It reuses the existing standalone Three.js pages as rendering runtimes but removes their free-rotation presentation from the user path:

- the child canvas is display-only from the shell (`pointer-events:none`);
- the child destination HUD, vista buttons and orbit controls are hidden;
- after the existing approach/arrival reaches final exploration, the shell applies that destination's curated `overview` composition and disables auto-orbit;
- one consistent control row is used for every destination: **模式選擇 / 科幻航線 / Real Space / 高畫質留影**;
- `科幻航線` opens the same equal four-destination selector in every Frontier destination;
- capture delegates to the existing destination renderer/capture authority and retains the existing temporary DPR boost.

The existing four destination HTML files remain rendering sources for this slice. They are not deleted so their current scene geometry, capture paths and destination-specific validators remain available while the user-facing interaction converges.

## Architecture boundary

- Real Space remains authoritative in `index.html`: existing eight-system data, 6.0 LY Dijkstra graph, coordinate-based turns, flight phases, continuous arrival, Travel Journal and Star Atlas.
- Frontier Scenic Route does **not** add AURELIA/NADIR/VESPER/EIDOLON to the Real Space graph and does not invent LY distances or a fake route planner.
- The scenic shell owns presentation/navigation only. It has no WebGL renderer of its own; each loaded child keeps its existing single renderer/camera.
- Shell state is session-only. No new `localStorage`, account, backend, analytics or network API is introduced.
- A bounded 5 Hz state sync reads only the active child destination state to update the shell phase/capture availability and apply the fixed vista once.

## Goal / Scope / Acceptance / Out of Scope

### Acceptance Criteria

1. Landing exposes exactly four top-level mode actions and exactly four equal Frontier destination actions.
2. At 390×844 and 360×800, the destination selector is a 2×2 grid with ≥44 px touch targets and no horizontal overflow.
3. Tapping **Frontier Fiction** keeps the user on the landing page and focuses the unified destination selector; it no longer enters AURELIA implicitly.
4. Selecting any Frontier destination opens `frontier-scenic.html` with the selected destination ID.
5. The scenic shell exposes exactly four consistent controls and a four-destination route panel.
6. Final exploration is fixed to the destination `overview` composition; the displayed child canvas is not draggable and auto-orbit is off.
7. AURELIA/NADIR/VESPER/EIDOLON retain their existing approach, arrival, scene identity and high-resolution capture implementations.
8. Capture from the shell raises the active child's WebGL backing resolution to the existing capture tier, exports PNG and restores normal DPR.
9. Real Space V4+ route/flight/Hermite behavior, Gallery, offline recovery, Photo Mode and existing cinematic quality extensions remain unchanged.
10. The new shell is included in the existing offline core contract.

### Out of Scope

- Building a new Frontier Dijkstra graph, distances or simulated flight model in this slice.
- Rewriting the four 3D scenes or deleting their legacy direct pages.
- New rotating camera modes, extra vista presets, scanner/checklist mechanics or destination count.
- New renderer, permanent high DPR, post-processing framework, backend, account, cloud save or analytics.

## Validation evidence required

- Repository/static validation for four equal landing destinations, no Featured pointer, shell route hierarchy, no storage/backend/route authority and offline-shell inclusion.
- Production Chromium trusted-touch checks at **390×844** and **360×800**.
- Browser evidence that NADIR and at least one second Frontier destination enter fixed `overview` mode with child auto-orbit disabled and `pointer-events:none` on the displayed scene.
- Capture evidence that the active child still produces a larger backing-buffer PNG and restores normal DPR.
- Exact-current-HEAD CI and review before the cycle is reported complete.

## Risks / supplementary checks

Physical iPhone Safari remains useful for long-duration thermal/frame pacing, same-origin iframe WebGL behavior and Save Sheet feel. These are supplementary checks, not blockers when exact production Chromium and repository gates are green.

## Completion signal

The slice is complete when the landing hierarchy no longer has competing Frontier pointers, the four destinations enter one fixed-scenic shell, phone browser gates prove the fixed composition and unified controls, existing V4+ regression checks pass, and exact-head review has no actionable P0/P1 finding.
