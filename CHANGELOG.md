# Changelog

All notable changes to this project are recorded here. Dates use Hong Kong time.

## [Unreleased]

### Improved

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
