# Changelog

All notable changes to this project are recorded here. Dates use Hong Kong time.

## [Unreleased]

### Added

- Added a V5-candidate **PROX Starport Alignment** exploration slice: after a true final arrival at PROX, users can tune two normalized -50–50 directional axes to locate three approach windows tied to the outer traffic beacon, lava-side thermal corridor and starport docking axis.
- Each PROX approach gate requires both axes inside a bounded ±3 window. Completing all three unlocks the local-only Star Atlas discovery `紅矮星港三點進場網`; the directional values are interaction indices rather than real angles or distances.
- Star Atlas now exposes a coherent `x / 7 發現` collection across the seven destinations outside the SOL home system. Completing all seven local discoveries shows an `探索檔案完成` milestone without inventing a SOL discovery solely to fill the count.
- PROX progress survives reloads through versioned local storage, mutation re-checks live safe final-exploration state, production Star Atlas refreshes in the same tab and after fresh-process reload, and the module is included in prepared offline shell cache v11 without adding renderer-loop or network work.
- Added a V5-candidate **SIRIUS Dual-Star Relay Calibration** exploration slice: after a true final arrival at SIRIUS, users can tune two normalized 0–100 calibration axes together and locate three stable relay handshake windows tied to the blue-white primary, companion and artificial relay ring.
- Each SIRIUS window requires both carrier and phase to fall inside a bounded ±4 gate. Completing the three dual-axis locks unlocks the local-only Star Atlas discovery `雙星相位中繼窗`; the two axes are interaction indices rather than real frequency or angle measurements.
- SIRIUS progress survives reloads through versioned local storage, mutation re-checks live safe final-exploration state, production Star Atlas refreshes in the same tab and after fresh-process reload, and the module is included in prepared offline shell cache v10 without adding renderer-loop or network work.
- Added a V5-candidate **TAU Ring Resonance Mapper** exploration slice: after a true final arrival at TAU, users can sweep a normalized 0–100 radial probe across the natural planetary rings and locate three simplified density anomalies at 23, 56 and 82.
- TAU ring features can only be recorded inside a bounded ±3 window. Completing the inner sparse band, moon resonance gap and outer density wave unlocks the local-only Star Atlas discovery `三層環隙共振`; the radial values are interaction indices rather than physical kilometres.
- TAU progress survives reloads through a versioned local record, mutation re-checks live safe final-exploration state, Star Atlas refreshes from the existing discovery event, and the module is included in prepared offline shell cache v9 without adding renderer-loop or network work.
- Added a V5-candidate **ORION Nebula Spectrograph** exploration slice: after a true final arrival at ORION, users can sweep a 470–680 nm narrow-band control and locate three simplified emission peaks at Hβ 486 nm, [O III] 501 nm and Hα 656 nm.
- Spectral lines can only be recorded inside a bounded ±4 nm window, turning ORION into an active wavelength-search interaction rather than another fixed observation checklist. Completing all three unlocks the local-only Star Atlas discovery `三線發射殼層`.
- ORION spectrum progress survives reloads through a versioned local record, refreshes Star Atlas immediately in the same tab, adds no backend/network/render-loop work, and is included in the prepared offline shell. The wavelength values are simplified interaction references, not a physical model of the fictional ORION scene.
- Added a V5-candidate **CYG Beacon Triangulation** exploration slice: after a true final arrival at CYG, users can sweep a 0–359° signal sensor and locate three distinct peaks from the blue star, violet companion and artificial beacon ring.
- Signal sources only lock inside a bounded ±8° window, making CYG a short active-search interaction rather than another three-button observation checklist. All three locks unlock the local-only Star Atlas discovery `雙星航標三角場`.
- CYG scan progress survives reloads through a versioned local record, refreshes Star Atlas immediately in the same tab, adds no backend/network/render-loop work, and is included in the prepared offline shell.

### Improved

- Arrival Debrief now forms a direct **arrival → exploration handoff**: on a true final arrival it is repositioned ahead of Landmark Guide and destination task content, shows whether the current destination still has an unfinished exploration objective, and changes its primary action between `開始探索`, `查看發現` and SOL `自由探索`.
- The handoff reads the existing Star Atlas discovery snapshot instead of creating another persistence authority, scrolls only to the real destination exploration module, keeps the normal `下一目的地` map action, and raises both Debrief actions to the 44 px mobile touch baseline without changing route, camera, renderer or flight timing.

### Fixed

- Hardened CYG beacon locking and ORION spectral capture so progress mutations now re-check the live safe final-exploration state at action time. Hidden or diagnostic actions are rejected while flying, during WebGL context loss, or outside the intended destination instead of relying only on UI visibility.

### Validation

- Extended the executable 390×844 production DOM/event harness to cover the arrival-to-exploration handoff: CYG arrival now proves the Debrief is placed before destination content, unfinished exploration exposes `開始探索`, the action scrolls to the real scanner, same-tab discovery completion switches to `查看發現`, and a fresh-process reload keeps the completed handoff state.
- Added focused PROX alignment validation covering JavaScript syntax, three unique two-axis approach windows, simultaneous ±3 locking, real production two-slider input/click execution, unsafe-state rejection, local persistence across a fresh process, production Star Atlas integration, seven-discovery completion UI, 44 px mobile controls, shared desktop typography, offline-shell inclusion, and absence of network/render-loop work.
- Added focused SIRIUS relay validation covering JavaScript syntax, three unique dual-axis 0–100 windows, simultaneous ±4 locking, real production two-slider input/click execution, unsafe-state rejection, local persistence across a fresh process, production Star Atlas integration, 44 px mobile controls, shared desktop typography, offline-shell inclusion, and absence of network/render-loop work.
- Added focused TAU ring validation covering JavaScript syntax, three unique normalized ring anomalies, ±3 capture gating, production range-input/click execution, unsafe-state rejection, local persistence across a fresh process, Star Atlas integration, shared desktop typography, offline-shell inclusion, and absence of network/render-loop work.
- Added a no-dependency executable destination interaction runtime harness at a 390×844 phone acceptance viewport. It loads the production Star Atlas plus CYG/ORION modules, drives real range-input and click events, proves bounded lock/capture and duplicate protection, verifies same-tab Atlas discovery refresh, rejects unsafe flight/context-loss mutations, and recreates a fresh process to prove local progress survives reload.
- Added focused ORION spectrum validation covering JavaScript syntax, three unique 470–680 nm emission lines, ±4 nm capture gating, local persistence, safe ORION-only final-exploration gating, bounded 2 Hz state sampling, Star Atlas integration, shared desktop typography, offline-shell inclusion, and absence of network/render-loop work.
- Added focused CYG beacon validation covering JavaScript syntax, three unique 0–359° signal peaks, angle wrap-around, ±8° locking, local persistence, safe CYG-only final-exploration gating, bounded 2 Hz state sampling, Star Atlas integration, shared desktop typography, offline-shell inclusion, and absence of network/render-loop work.

## [4.1.0] - 2026-08-27

### Release status

- Owner physical-device manual acceptance completed and PR #4 was merged to `main`.
- v4.1.0 runtime baseline commit: `e852096e65194543b97355efc48894339d550be7`.
- Pre-merge exact-HEAD validation: 405 / 405 checks passed; GitHub Actions and Vercel Preview succeeded.
- The immutable V4.0 regression snapshot remains unchanged.

### Improved

- Hardened **journey-distance authority** after PR review: Arrival Debrief no longer carries its own star-coordinate table or recomputes route distance independently. New completed journeys carry the existing core planner's displayed route-distance snapshot into the travel journal and debrief instead.
- Travel journal now shows route distance for newly completed journeys and a cumulative LY total for retained entries that have planner distance data. Existing older journal entries without the optional distance field remain readable and are not deleted.
- This keeps the approved `index.html` `N[].p`／`D()` planner as the only runtime coordinate calculation authority while preserving the V4 flight model, 60 Hz loop, route graph and zero-backend architecture.
- Added a V5-candidate **Arrival Debrief** vertical slice: a genuinely completed final-destination journey now gets a compact in-context summary with destination, leg count, full route, route distance and journal-measured active flight time, plus direct actions to continue exploring or open the next-destination map.
- The debrief consumes the travel journal's already-validated completion event instead of creating a second flight-completion authority; aborted journeys and intermediate fly-bys do not trigger it, and WebGL context loss hides it safely.
- Arrival Debrief stays inside the existing destination exploration card, adds no polling/render-loop work, network request, backend or persistence store, and is included in the V4.1 offline shell cache.
- Added a V4.1 static navigation fallback: browsers without usable WebGL, or sessions where the 3D app does not reach ready state within about 9 seconds, now retain a mobile-safe eight-system SVG map, shortest-route planning from SOL and a clear 3D retry action instead of ending at a dead loader.
- The fallback is explicitly navigation-only, preserves the approved 6.0 LY/Dijkstra route graph, adds no render loop, polling, backend or user-data path, and releases its temporary WebGL capability-probe context before the main renderer starts.
- Added a V4.1 candidate offline-resilience slice: after one successful online load, a Service Worker caches the active shell plus the pinned Three.js `0.185.1` dependency so later reloads can fall back to the most recently cached version when the network is unavailable.
- Added a low-noise control-panel status for offline readiness (`準備中`／`已準備`／`離線可用`／`未準備`) and an explicit startup recovery screen with reload action if the 3D engine does not reach ready state within about 9 seconds.
- Online navigation and local runtime files remain network-first so Vercel/static deploy updates are not permanently shadowed by cache; only the fixed Three.js dependency is cache-first.
- The offline layer introduces no backend, account, analytics, user-data persistence, render-loop polling or flight-timing changes. First-ever use still requires a successful online launch.
- Added a destination photo-mode candidate for final exploration at all eight systems: the normal HUD, flight bar, telemetry, map controls, exploration card and diagnostics are hidden to leave a clean astronomical view while manual drag-look remains available.
- Photo mode can save the freshly rendered WebGL canvas as a local PNG named for the current destination; its own capture toolbar is hidden from the saved frame.
- Photo mode is available only during safe final exploration, automatically exits if flight resumes or WebGL context is lost, polls state at only 2 Hz, stores no data, and adds no backend or network request.
- Added a guided LUNA exploration vertical slice: three observation checkpoints (lunar basin, distant Earth parallax and orbital ring station) turn the existing free-look arrival scene into an intentional survey task.
- Completing all three LUNA observations unlocks one local-only discovery record (`地月視差層`); progress survives reloads and never leaves the device.
- The guided survey runs outside the render loop at 2 Hz, appears only during final LUNA exploration, and adds no backend, analytics, network request or rendering dependency.
- Added a local-only travel journal that records completed final-destination journeys, route, timestamp and actual elapsed travel time, with a quick re-plan action for past destinations.
- Travel journal history is capped at the latest 12 journeys, survives reloads through a versioned `localStorage` record, excludes aborted flights, and is sampled at only 2 Hz outside the render loop.
- Added mobile WebGL context-loss recovery: simulation time pauses while the GPU context is unavailable and resumes from the same flight phase after restoration.
- Added an in-app recovery status overlay and delayed guidance when automatic restoration takes longer than expected.
- Repeated context loss while using High quality temporarily falls back to Standard quality without overwriting the user's saved preference.
- Auto quality re-benchmarks after context restoration instead of treating the recovery pause as poor frame performance.

### Validation

- Arrival Debrief validation now rejects a duplicated `COORD` table, checks that journal distance comes from the core planner output, and derives ORION／TAU baselines directly from the production `index.html` star-system data instead of keeping a second hard-coded coordinate fixture.
- Added a focused Arrival Debrief validator covering syntax, trusted completion-event wiring, safe final-exploration gating, approved ORION/TAU route-distance baselines, zero polling/network/storage work, WebGL-loss hiding, next-destination handoff and offline-shell inclusion.
- Added a focused static-fallback validator covering WebGL capability detection/context release, fallback startup paths, exact eight-system route baselines, reachability, zero render-loop/polling work and explicit fallback limitations.
- Added a focused offline-resilience validator covering service-worker/bootstrap syntax, exact core-cache scope, pinned Three.js caching, network-first navigation, cache-first fixed dependency fallback, readiness reporting, absence of render-loop polling, and inclusion in `npm run check`.
- Added a focused photo-mode validator covering bootstrap loading, JavaScript syntax, final-exploration gating, bounded 2 Hz polling, clean-HUD state, capture-toolbar exclusion, fresh-frame PNG extraction, local file output, automatic safe exit, and absence of network/storage paths.
- Added a focused guided-survey validator covering JavaScript syntax, exact three-point scope, LUNA-only explore gating, local persistence, all-three completion gate, bounded 2 Hz polling and absence of network/backend calls.
- Added syntax and structural checks for the travel journal loader, versioned storage, bounded sampling and completed-route gate.
- The active simulator may now evolve independently while releases/v4.0-stable.html remains hash-locked as the regression baseline.
- Added structural checks for WebGL context loss/restoration handlers and the paused simulation clock.

## [4.0.0] - 2026-08-25

### Added

- Dynamic Web Audio engine, warp, turn, arrival and destination ambience
- Intermediate fly-by and final destination exploration mode
- Automatic orbit with temporary manual camera takeover
- Auto, smooth, standard and high quality profiles
- Startup performance benchmark and continuous adaptive DPR／particle control
- Optional performance HUD for FPS, DPR, particles, draw calls and triangles
- 2.5D holographic star map with 3D coordinate projection
- Per-leg distance, AZ, EL, estimated time and live ship progress
- Visited-system state and completed／active route display

### Preserved

- Eight-system route network
- Actual direction-based quaternion turns
- Multi-leg automatic travel
- Full warp entry／cruise／exit effects
- Continuous arrival movement
- Distinct 3D astronomical destinations
- Procedural realistic Earth

## [3.2.0] - 2026-08-25

### Fixed

- Removed the stop-then-sudden-forward motion between warp exit, deceleration and approach
- Introduced one continuous Hermite arrival trajectory across all three phases

### Improved

- Procedural Earth surface, ocean, land, ice caps, clouds, atmosphere and city lights
- More natural material, bump, roughness and lighting for other planet types

## [3.1.0] - 2026-08-25

### Fixed

- Restored the visible warp-entry effect after the true-3D scene rewrite

### Added

- Radial high-speed star streaks
- Warp-entry flash, halo and FOV expansion
- Instanced warp tunnel rings
- Warp-exit convergence and destination reveal

## [3.0.0] - 2026-08-25

### Changed

- Rebuilt the visual layer as a true Three.js 3D scene
- Direction changes now derive from actual star-map coordinates
- Added smooth quaternion turns and bank animation

### Added

- Eight curated 3D destination systems
- Manual look-around while not travelling
- Intermediate-system reorientation before the next leg

## [2.0.0] - 2026-08-25

### Added

- Mobile-first navigation simulator
- Eight star-map destinations with simulated coordinates
- Current-location marker and destination selection
- Automatic route planning with multiple warp legs
- Distance-related travel duration
- Automatic launch-to-arrival sequence
- Different destination colour and scenery treatments

## [1.0.0] - 2026-08-25

### Added

- Interactive warp starfield
- Pointer／mouse directional control
- Adjustable speed and star density
- Acceleration mode
- Motion blur／meteor trails
- Retractable controls
- GPU WebGL rendering with adaptive quality
