# NADIR Observatory Depth v3

**Status:** Autonomous evolution Draft vertical slice

## Goal

Make NADIR WELL feel like an inhabited extreme-object research frontier rather than only a beautiful black-hole phenomenon. The fixed portrait vista should read in three layers: foreground interferometer hardware, the event horizon/lensing system, and far depth beacons/stars.

## Scope

- Preserve `NADIR_FIXED_LENSING_V4`: event-horizon silhouette, thin accretion disk, upper/lower lensing crown, Doppler asymmetry, caustic sheet and fixed scenic camera.
- Replace the former single small station treatment with `NADIR_INTERFEROMETER_FRAME_V1`: three instanced collector rings, twelve instanced truss beams and twelve receiver cassettes arranged as near/mid/far observatory silhouettes.
- Expand the existing beacon bank from six to ten instances to strengthen depth without adding another draw call.
- Keep the same five observatory-related draw groups by replacing the old ring/glow/spine/pod/beacon groups rather than layering an unbounded new structure on top.
- Reuse the existing normal `1.25` and capture `1.60` DPR ceilings and local PNG capture flow.
- Keep one WebGL renderer, no camera rotation controls and no new persistence, network, backend, route or flight authority.

## Acceptance Criteria

- Runtime keeps `NADIR_FIXED_LENSING_V4` and exposes `NADIR_OBSERVATORY_DEPTH_V3` plus `NADIR_INTERFEROMETER_FRAME_V1`.
- Diagnostics report exactly 3 collector rings, 12 truss beams, 12 receiver pods and 10 depth beacons.
- Event horizon, lensing crown, photon crown, caustic sheet and no-portal/no-jet identity remain intact.
- 390×844 and 360×800 production Chromium both render the fixed scene without viewport overflow.
- Runtime render cost stays at or below 20 draw calls and 20,000 triangles in the acceptance harness.
- Static capture returns a non-empty higher-resolution PNG then restores the original DPR/backing dimensions.
- Existing V4 route, travel, arrival, mode gateway and other Frontier destinations remain unchanged.

## Out of Scope

- General-relativistic ray tracing or physically exact black-hole simulation.
- Free-orbit Frontier cameras, scanner/checklist gameplay, new route authority, persistent galleries, cloud storage or new dependencies.
- Permanent DPR increases or simulation timing changes.

## Validation

Run `npm run check`. The focused NADIR validator executes production Chromium at 390×844 and 360×800 and stores exact-run screenshots under `artifacts/frontier-destination-handoff/` for CI evidence review.

## Completion signal

The slice is complete when static contracts, both production WebGL phone viewports, capture/restore, full repository validation and exact-head review are green on the persistent Draft PR.

## Risks / supplementary checks

Physical iPhone Safari colour judgement, sustained frame pacing and thermal behaviour remain useful supplementary evidence. They are not completion gates when the bounded production WebGL evidence is green.
