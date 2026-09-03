# NADIR Gravitational Caustic Depth v2

**Status:** Autonomous evolution Draft vertical slice

## Goal

Make NADIR WELL read as a deep extreme-object observatory rather than a flat portal-like ring, while keeping the approved fixed Frontier composition and bounded mobile rendering cost.

## Scope

- Preserve the existing event-horizon silhouette, thin accretion disk, upper/lower lensing crown, Doppler asymmetry, observatory station and fixed scenic camera.
- Add one bounded parabolic caustic shader sheet behind the event horizon.
- Add one 36-segment lensed-star streak bank, one 28-point photon bank and one six-instance far beacon bank to strengthen foreground/background separation.
- Reuse the existing normal `1.25` and capture `1.60` DPR ceilings and the existing local PNG capture flow.
- Keep one WebGL renderer, no camera rotation controls and no new persistence, network, backend, route or flight authority.

## Acceptance Criteria

- Existing `NADIR_FIXED_LENSING_V4` contract remains valid and `portalRing` remains false.
- Runtime exposes `NADIR_CAUSTIC_DEPTH_V2`, caustic sheet, lensed streaks and depth beacons.
- 390×844 and 360×800 production Chromium both show the fixed scene without viewport overflow.
- Runtime render cost stays bounded to at most 20 draw calls and 20,000 triangles in the acceptance harness.
- Static capture temporarily raises the backing buffer, returns a non-empty PNG, then restores the original DPR/backing dimensions.
- Existing V4 route, travel, arrival and Real Space exploration behavior is unchanged.

## Out of Scope

- General-relativistic ray tracing or physically exact black-hole simulation.
- Free-orbit Frontier cameras, new route authority, gameplay/scanner mechanics, persistent image galleries, cloud storage or new dependencies.
- Permanent DPR increases or simulation timing changes.

## Validation

Run `npm run check`. The focused validator also executes production Chromium at 390×844 and 360×800 and stores screenshots under `artifacts/frontier-destination-handoff/` for the CI evidence bundle.

## Risks / supplementary checks

Physical iPhone Safari colour judgement, sustained frame pacing and thermal behaviour remain useful supplementary evidence. They are not completion gates for this bounded slice when automated production WebGL evidence is green.
