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
4. **Gallery / Captures** — existing read-only Journey Gallery, discovery archive and current-dock Capture Handoff using the existing Travel Journal / Star Atlas / Photo Mode authorities.

Frontier destinations remain one equal 2×2 mobile grid:

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

The four destination HTML files remain production rendering backends for this shell. Their old direct-page free-rotation/preset controls are not the approved user-facing Frontier interaction, but renderer, destination identity, scene diagnostics, bounded render cost and capture/restore behavior remain production contracts and must continue to be tested.

### Renderer backend acceptance contract

Because the scenic shell still depends on all four child pages, `npm run check` must not treat those pages as untested legacy files. `scripts/validate-frontier-backends.mjs` provides the production-relevant replacement for retired direct-page UI validators:

- all four backends keep exactly one WebGL renderer, pinned Three.js `0.185.1`, `preserveDrawingBuffer:false`, normal mobile DPR ≤1.25 and capture DPR ≤1.60;
- all four expose their existing scenic child API plus draw-call, triangle, backing-buffer and DPR diagnostics;
- all four remain free of new persistence/background-network authority;
- production Chromium loads every backend through the actual unified `frontier-scenic.html` shell at 390×844 and 360×800;
- each destination reaches fixed `overview`, `autoOrbit:false`, and a display-only iframe;
- each destination performs a real high-resolution shell capture, proves the backing buffer grows, then proves dimensions/DPR and fixed camera state restore;
- each restored scene is captured as browser evidence and remains within a broad mobile regression ceiling of 18 draw calls / 24,000 triangles.

This deliberately does **not** revive retired assertions for user-facing free drag, old orbit buttons, three-preset rails or double-tap camera reset. Those controls remain implementation details of some renderer pages while the approved shell owns the product interaction.

### Journey Gallery / Capture Handoff compatibility

This slice does not redesign the existing Gallery. The Journey Gallery remains a read-only view over `WarpTravelJournal` and `WarpStarAtlas`, and the current-dock Capture Handoff continues to delegate to the existing Real Space `WarpPhotoMode`. No second journey, discovery or image persistence authority is created.

## Architecture boundary

- Real Space remains authoritative in `index.html`: existing eight-system data, 6.0 LY Dijkstra graph, coordinate-based turns, flight phases, continuous arrival, Travel Journal and Star Atlas.
- Frontier Scenic Route does **not** add AURELIA/NADIR/VESPER/EIDOLON to the Real Space graph and does not invent LY distances or a fake route planner.
- The scenic shell owns presentation/navigation only. It has no WebGL renderer of its own; each loaded child keeps its existing single renderer/camera.
- Shell state is session-only. No new `localStorage`, account, backend, analytics or network API is introduced.
- A bounded 5 Hz state sync reads only the active child destination state to update the shell phase/capture availability and apply the fixed vista once.

## Acceptance Criteria

1. Landing exposes exactly four top-level mode actions and exactly four equal Frontier destination actions.
2. At 390×844 and 360×800, the destination selector is a 2×2 grid with ≥44 px touch targets and no horizontal overflow.
3. Tapping **Frontier Fiction** keeps the user on the landing page and focuses the unified destination selector; it no longer enters AURELIA implicitly.
4. Selecting any Frontier destination opens `frontier-scenic.html` with the selected destination ID.
5. The scenic shell exposes exactly four consistent controls and a four-destination route panel.
6. Final exploration is fixed to the destination `overview` composition; the displayed child canvas is not draggable and auto-orbit is off.
7. AURELIA/NADIR/VESPER/EIDOLON retain their approach, arrival, scene identity and bounded renderer contracts.
8. **All four** backends must complete high-resolution capture through the unified shell, then restore normal backing dimensions, DPR and fixed scenic state.
9. Real Space V4+ route/flight/Hermite behavior, Gallery, offline recovery, Photo Mode and existing cinematic quality extensions remain unchanged.
10. The scenic shell remains in the existing offline core contract.

## Out of Scope

- Building a new Frontier Dijkstra graph, distances or simulated flight model in this slice.
- Deleting the four existing 3D renderer pages.
- Restoring free-rotation/preset UI as the user-facing Frontier interaction.
- New rotating camera modes, scanner/checklist mechanics or destination count.
- New renderer, permanent high DPR, post-processing framework, backend, account, cloud save or analytics.

## Validation evidence required

- Repository/static validation for four equal landing destinations, no Featured pointer, shell route hierarchy, no storage/backend/route authority and offline-shell inclusion.
- Production-relevant backend contract for all four child pages in `npm run check`.
- Production Chromium checks at **390×844** and **360×800** proving all four destinations enter fixed `overview` mode through the unified shell.
- Production Chromium **4/4 shell capture** evidence: backing buffer increases, PNG result exists, normal DPR/backing dimensions restore, fixed camera state remains intact, and renderer costs stay bounded.
- Browser screenshots for each restored destination at both phone viewports.
- Exact-current-HEAD CI and review before the cycle is reported complete.

## Risks / supplementary checks

Physical iPhone Safari remains useful for long-duration thermal/frame pacing, same-origin iframe WebGL behavior and Save Sheet feel. These are supplementary checks, not blockers when exact production Chromium and repository gates are green.

## Completion signal

The slice is complete when the landing hierarchy has no competing Frontier pointers, the four destinations enter one fixed-scenic shell, all four production renderer backends have active acceptance coverage including high-resolution shell capture/restore at both phone viewports, V4+ regressions remain green, and exact-head review has no actionable P0/P1 finding.
