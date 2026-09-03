# Mode Gateway + Frontier Scenic Destinations

## Status

- Persistent `autonomous-evolution` Draft PR vertical slice.
- Product direction is approved in `docs/DECISIONS.md` D-015.
- Real Space V4.1 remains the release baseline and navigation authority.

## Goal / intended user outcome

Make Frontier Fiction feel like part of the same product instead of four independent rotatable model demos. A player should choose a science-fiction destination from one clear hierarchy, deliberately confirm that destination, see one curated scenic composition, and move between Frontier destinations without confusing pointer priority or UI that implies a route model which does not exist yet.

The same top-level gateway should also make prior Real Space records useful: a recent voyage or discovery entry can hand back to the existing Real Space planner for a deliberate revisit, without teleporting, duplicating route authority or inventing a second navigation model.

## Scope

### Landing / destination hierarchy

The top-level gateway remains exactly four actions:

1. **Continue Journey** — return to the current/restored Real Space state without replanning.
2. **Real Space** — existing eight-system V4+ map and travel.
3. **Frontier Fiction** — focus the unified four-destination Frontier selector; it does not silently enter a preferred destination.
4. **Gallery / Captures** — existing Journey Gallery, discovery archive, Real Space revisit handoff and current-dock Capture Handoff using the existing Travel Journal / Star Atlas / route planner / Photo Mode authorities.

Frontier destinations remain one equal destination set:

- `AURELIA ARC｜曙光環域`
- `NADIR WELL｜玄淵觀測站`
- `VESPER YARD｜暮環採集場`
- `EIDOLON GATE｜遺光門廊`

At phone widths up to 520 px, both the Landing Page selector and the in-destination selector use the same ordered **01–04 single-column rail**. Wider layouts may compact the same four equal destinations into a 2×2 grid. There is no separate `Featured Expedition` pointer and no destination receives hidden priority.

### Shared destination confirmation

Frontier selection now uses the same two-step interaction at the Landing Page and inside a Frontier destination:

1. Tap one of the equal 01–04 destination rows.
2. A compact **DESTINATION CONFIRM｜目的地確認** panel shows the selected destination and scenic identity.
3. **取消** keeps the user exactly where they are; **前往景觀** commits the selection.

This makes destination changes deliberate and reduces accidental jumps on a dense phone interface. It also moves Frontier closer to Real Space's mental model of **select → commit → arrive**, without pretending a physical Frontier route exists.

The confirmation layer is presentation-only:

- it does not create LY distance, coordinates, route legs, Dijkstra topology, travel duration or warp timing;
- a staged selection does not change the current Frontier destination;
- only explicit **前往景觀** starts the existing scenic handoff or enters the selected scenic shell;
- both confirmation actions retain at least the 44 px mobile touch baseline;
- no new persistence, backend, network request or second navigation authority is introduced.

Visible Landing copy now consistently uses **FRONTIER DESTINATIONS｜科幻目的地**, not `FRONTIER ROUTE`. Existing `routeButton` / `routeOpen` identifiers remain internal compatibility aliases only.

### Frontier Scenic Destination shell

`frontier-scenic.html?dest=<ID>` is the user-facing Frontier shell. It reuses the existing standalone Three.js pages as rendering runtimes but removes their free-rotation presentation from the user path:

- the child canvas is display-only from the shell (`pointer-events:none`);
- the child destination HUD, vista buttons and orbit controls are hidden;
- after the existing approach/arrival reaches final exploration, the shell applies that destination's curated `overview` composition and disables auto-orbit;
- one consistent control row is used for every destination: **模式選擇 / 科幻目的地 / Real Space / 高畫質留影**;
- **科幻目的地** opens the same equal four-destination selector everywhere;
- on phone widths the selector repeats the same 01–04 single-column order used on the Landing Page, so the hierarchy does not change after entry;
- the selector marks exactly one **目前景觀**, so the user's current location in the four-world hierarchy is explicit;
- choosing another destination stages the same confirmation panel used at Landing before any handoff begins;
- capture delegates to the existing destination renderer/capture authority and retains the existing temporary DPR boost.

The four destination HTML files remain production rendering backends. Their old direct-page free-rotation/preset controls are not the approved user-facing Frontier interaction, but renderer, destination identity, scene diagnostics, bounded render cost and capture/restore behavior remain production contracts.

### Destination handoff

After the user confirms a different Frontier destination, the existing short, bounded **scenic handoff** runs instead of an immediate hard iframe swap:

- the current and next destination names are shown during the handoff;
- repeat destination selection and capture are locked while switching;
- the handoff is presentation-only and ends as soon as the next child runtime is ready;
- the next destination still owns its existing approach → arrival → fixed scenic sequence;
- no LY distance, Dijkstra graph, route leg, warp duration or simulated travel claim is invented.

This is deliberately a visual continuity layer, not a second flight model. The existing `routeButton` / `routeOpen` identifiers remain as internal compatibility aliases for existing acceptance tooling; the visible product language is **科幻目的地**.

### Renderer backend acceptance contract

Because the scenic shell depends on all four child pages, `npm run check` must keep production-relevant acceptance for those backends:

- exactly one WebGL renderer each, pinned Three.js `0.185.1`, `preserveDrawingBuffer:false`, normal mobile DPR ≤1.25 and capture DPR ≤1.60;
- existing scenic child API plus draw-call, triangle, backing-buffer and DPR diagnostics;
- no new persistence/background-network authority;
- production Chromium loads every backend through `frontier-scenic.html` at 390×844 and 360×800;
- each destination reaches fixed `overview`, `autoOrbit:false`, and a display-only iframe;
- each destination performs a real high-resolution shell capture, proves the backing buffer grows, then restores dimensions/DPR and fixed camera state;
- restored scenes remain within the broad mobile regression ceiling of 18 draw calls / 24,000 triangles.

The acceptance suite does **not** revive retired assertions for user-facing free drag, old orbit buttons, three-preset rails or double-tap camera reset.

### Journey Gallery / Gallery Revisit Handoff / Capture Handoff

Journey Gallery continues to **read** existing `WarpTravelJournal` journeys and `WarpStarAtlas` discoveries; it does not create a second journey/discovery persistence authority. It now adds a deliberately narrow action layer so records can lead back into the actual simulator instead of being a dead-end archive.

- Every retained recent voyage card exposes a ≥44 px **再次前往** action when its final destination is not the current location.
- Each of the seven Real Space discovery cards exposes **再次前往** when already collected, or **前往探索** while still incomplete.
- A revisit never calls `jumpTo()` and never changes the current simulated location by itself. It delegates destination selection to the existing `WarpSim.select(id)` authority, closes the Gateway, and opens the existing Real Space planning panel so the user still reviews and launches the real Dijkstra route.
- The action is disabled for the current destination, while a flight is active, during WebGL context loss, or if the existing selection authority is unavailable. The click path re-checks these conditions before handing off.
- No coordinates, edge table, LY calculation, route duration, route persistence or second navigation state is copied into the Gateway.
- Current-dock Capture Handoff continues to delegate to the existing Real Space `WarpPhotoMode` and its temporary High-tier capture path.
- PNG files still save only to the device; Gallery does not claim an image library or upload/store image bytes.

This keeps the record loop coherent: **journey / discovery record → existing Real Space planner → normal travel → arrival / capture**, while route authority remains entirely inside the existing V4+ simulator.

## Architecture boundary

- Real Space remains authoritative in `index.html`: existing eight-system data, 6.0 LY Dijkstra graph, coordinate-based turns, flight phases, continuous arrival, Travel Journal and Star Atlas.
- AURELIA/NADIR/VESPER/EIDOLON remain outside the Real Space graph. Frontier Scenic Destination does not invent coordinates, LY distances or a fake route planner.
- The scenic shell owns presentation/navigation only. It has no WebGL renderer of its own; each loaded child keeps its existing single renderer/camera.
- Landing and scenic confirmation states are memory-only UI state. No new `localStorage`, account, backend, analytics or network API is introduced.
- Gallery Revisit Handoff owns no route data. It only calls the existing `WarpSim.select(id)` and opens the existing Real Space panel.
- A bounded 5 Hz state sync reads only the active Frontier child state to update phase/capture availability and enforce the fixed vista. Destination handoff adds one bounded timeout per deliberate destination change; it is not a render loop.

## Acceptance Criteria

1. Landing exposes exactly four top-level mode actions and exactly four equal Frontier destination actions.
2. At 390×844 and 360×800, both Frontier destination selectors use the same 01–04 single-column order, ≥44 px touch targets and no horizontal overflow.
3. Tapping **Frontier Fiction** focuses the unified destination selector; it does not implicitly enter AURELIA or another preferred destination.
4. Tapping a Landing destination stages **目的地確認** and does not navigate until **前往景觀** is pressed; **取消** leaves the user on Landing.
5. Confirming a Landing destination opens the same `frontier-scenic.html` shell with the selected destination ID.
6. The scenic shell exposes exactly four consistent controls, with visible **科幻目的地** language rather than a fake route label.
7. The in-destination selector has exactly one **目前景觀** marker and keeps that marker on the current destination while a different destination is only staged.
8. In-destination **取消** preserves the current destination; **前往景觀** starts the bounded scenic handoff, locks duplicate selection/capture during the switch, then yields to the new child runtime.
9. Final exploration is fixed to the destination `overview` composition; the displayed child canvas is not draggable and auto-orbit is off.
10. AURELIA/NADIR/VESPER/EIDOLON retain their approach, arrival, scene identity and bounded renderer contracts.
11. All four backends complete high-resolution capture through the unified shell, then restore normal backing dimensions, DPR and fixed scenic state.
12. Real Space V4+ route/flight/Hermite behavior, Gallery, offline recovery, Photo Mode and existing cinematic quality extensions remain unchanged except for the explicit Gallery revisit handoff.
13. Neither Frontier confirmation surface introduces coordinates, LY distance, route legs, Dijkstra, travel timing, persistence or network authority.
14. The scenic shell remains in the existing offline core contract.
15. Gallery recent-voyage and discovery cards expose bounded ≥44 px revisit actions that delegate to `WarpSim.select(id)` and open the existing Real Space panel; they never call `jumpTo()` or launch a route automatically.
16. A Gallery revisit leaves `WarpSim.state().current` unchanged until the normal user-controlled launch/travel flow advances it, and is disabled while flying, during context loss or for the current destination.

## Out of Scope

- Building a Frontier Dijkstra graph, LY distances or a second simulated flight model.
- Deleting the four existing 3D renderer pages.
- Restoring free-rotation/preset UI as the user-facing Frontier interaction.
- New scanner/checklist mechanics or destination count.
- New renderer, permanent high DPR, post-processing framework, backend, account, cloud save or analytics.
- Direct Gallery teleport, auto-launch, copied route graph, itinerary recommendation or a second navigation panel.

## Validation evidence required

- Repository/static validation for four equal Frontier destinations, stable 01–04 order, phone single-column rail, zero Featured pointer, destination wording, shared confirmation wording/state, one-current-marker state, no storage/backend/route authority and offline-shell inclusion.
- Repository/static validation that Gallery revisit uses only `WarpSim.select(id)` + the existing `#panel`, provides ≥44 px actions, and contains no `jumpTo()` or copied route authority.
- Production Chromium trusted-touch checks at **390×844** and **360×800** for Landing select → cancel → select → confirm, plus AURELIA → stage NADIR → cancel → confirm → handoff, including viewport containment and current-marker preservation before commit.
- Production Chromium trusted-touch Gallery check at **390×844** and **360×800**: open populated records, use a recent `TAU` voyage **再次前往**, prove the Gateway closes, existing Real Space panel opens, `selected==='TAU'`, and `current` remains unchanged before normal launch.
- Production-relevant backend contract for all four Frontier child pages, including 4/4 shell capture/restore at both phone viewports.
- Existing current-dock Photo Mode handoff remains trusted-touch verified at both phone viewports.
- Exact-current-HEAD CI and review before the cycle is reported complete.

## Risks / supplementary checks

Physical iPhone Safari remains useful for long-duration thermal/frame pacing, same-origin iframe WebGL behavior, touch feel and Save Sheet behavior. These are supplementary checks, not blockers when exact production Chromium and repository gates are green.

## Completion signal

The slice is complete when Landing and in-destination Frontier selectors retain the same ordered phone hierarchy and selection-confirm pattern; Gallery records now provide a safe one-tap handoff into the existing Real Space planner without teleporting or duplicating route authority; TAU revisit and current-dock Photo Mode handoffs are trusted-touch verified at both phone sizes; all four fixed Frontier scenic renderer/capture contracts remain green; V4+ regressions remain green; and exact-head review has no actionable P0/P1 finding.
