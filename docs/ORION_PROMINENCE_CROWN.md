# ORION Prominence Observatory｜獵戶日珥觀測前景

## Status

- Product direction: approved Cinematic High-tier / Capture Quality evolution.
- Current implementation surface: `autonomous-evolution` Draft PR.
- Visual pass: `prominence-observatory-v2`.

## Goal / user outcome

Make ORION read as a place the player has actually reached: a near-field rocky observatory silhouette sits in front of the extreme red supergiant and its asymmetric prominence crown. High quality and Photo Capture should therefore show a clear **foreground outpost → active red giant → nebula depth** composition rather than a distant glowing sphere alone.

## Scope

- Retain the existing two partial-torus prominence arcs around the ORION red supergiant at `(28, 8, -137)`, radius `30`.
- Reuse the existing rocky outpost root at `(-26, -12, -90)`, radius `10` as the only foreground placement authority.
- Add exactly **16 observatory masts** as one `THREE.InstancedMesh`; all masts share one box geometry/material and one incremental draw call.
- Distribute the masts over the camera-facing outpost hemisphere and align each mast to the local surface normal, creating a bounded silhouette without moving the camera.
- Keep the existing shared ORION High layer intact: red-supergiant granulation, corona, rocky-outpost surface detail and the bounded nebula filament field.
- Gate the complete extension to safe final exploration, `qualityMode === 'high'`, and current destination `ORION`.
- Standard／Low: zero prominence/observatory extension objects.
- High: exactly **3 extension objects / 3,264 measured triangles / 3 draw calls / 16 instanced masts**.
- Existing shared ORION High plus this extension: **7 owned visual objects / 14,208 triangles / 7 draw calls**.
- Synchronize state at bounded 4 Hz outside the renderer loop.
- Dispose owned geometry/materials when dropping below High or leaving ORION; rebuild on High re-entry and destination revisit.

## Acceptance Criteria

1. Standard ORION exploration has zero extension objects.
2. High ORION exploration has exactly 3 extension objects, 3,264 measured triangles, 3 extension draw calls and 16 observatory masts.
3. The two transparent DoubleSide prominence meshes are explicitly single-pass; the 16 masts remain one instanced draw.
4. Live mast diagnostics show a local depth span below **2.2 units** and a foreground lead of more than **56 units**, bounded by **58 units**, relative to the red-supergiant center.
5. Existing shared ORION High remains 4 objects / 10,944 triangles / 4 draws; the actual renderer diagnostic therefore rises by exactly **+7 draws** from Standard to combined High and returns to baseline after downgrade.
6. Direct Standard → High Photo Capture sees the complete extension before PNG extraction and restores Standard afterward.
7. High → Low disposal, Low → High rebuild and ORION departure/revisit rebuild without accumulation.
8. Production Chromium passes at **390×844 and 360×800**, preserves the final `explore` viewport and emits distinct Standard/High evidence.
9. Route planning, flight phases, Hermite arrival timing, camera authority, renderer count, DPR ceilings, persistence, network/backend paths and dependencies remain unchanged.

## Out of Scope

- New camera composition presets or camera-controller authority.
- Animated mast traffic, prominence simulation or a new `requestAnimationFrame` loop.
- Post-processing / bloom dependency.
- Permanent High quality or global DPR increase.
- Changes to ORION spectrograph, discovery state, route metadata or the base outpost model.

## Performance / lifecycle boundary

- Added extension geometry: **3,264 measured triangles**.
- Added extension renderer budget: **3 draw calls**.
- Added foreground detail: **16 mast instances in one InstancedMesh**.
- Standard／Low sustained extension cost: **zero owned objects**.
- State synchronization remains bounded to 4 Hz and outside the renderer loop.
- Owned geometry/materials are disposed on downgrade, departure and teardown.
- No new persistence, network, backend, analytics or dependency authority.

## Validation evidence required

- Focused source validation for the existing star/outpost anchors, 16-instance geometry budget, single-pass transparency, lifecycle and authority boundaries.
- Production Chromium at both required phone viewports.
- Actual renderer `DRAW` delta measurement rather than profile constants alone.
- Direct Photo Capture probe at PNG extraction.
- Live `observatoryMasts`, `mastDepthSpan` and `foregroundDepthLead` diagnostics in High, capture and revisit states.
- Standard/High screenshots for both phone viewports.

## Risks / supplementary manual checks

Physical iPhone Safari remains useful supplementary evidence for long-duration thermal/frame pacing, additive-blending appearance, small-structure contrast and Save Sheet behaviour. These checks are not completion blockers when exact production Chromium, renderer-budget and lifecycle gates are green.

## Completion signal

ORION High/photo frames visibly combine an asymmetric active-star crown with a near-field observatory silhouette, producing stronger place identity and near/far depth while Standard/Low remain unchanged and all approved travel/performance authorities stay intact.
