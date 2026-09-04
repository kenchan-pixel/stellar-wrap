# ORION Prominence Observatory｜獵戶日珥觀測前景

## Status

- Product direction: approved Cinematic High-tier / Capture Quality evolution.
- Current implementation surface: `autonomous-evolution` Draft PR.
- Visual pass: `prominence-observatory-v2`.
- Crown treatment: `braided-prominence-weave-v1`.

## Goal / user outcome

Make ORION read as a place the player has actually reached: a near-field rocky observatory silhouette sits in front of the extreme red supergiant and its asymmetric prominence crown. High quality and Photo Capture should therefore show a clear **foreground outpost → braided crown → active red giant → nebula depth** composition rather than a distant glowing sphere alone.

The current refinement specifically raises the red giant's capture value without spending more geometry: each of the two existing prominence arcs now renders as a multi-strand braided plasma ribbon with fixed bright knots, warmer edge colour and a wider asymmetric crown silhouette. The treatment is deliberately static in shader space, so it adds no animation loop or simulation authority.

## Scope

- Retain the existing two partial-torus prominence arcs around the ORION red supergiant at `(28, 8, -137)`, radius `30`.
- Retain the same bounded torus topology and measured triangle budget, while rendering three interlaced emissive strands plus compact bright knots inside each existing arc material.
- Widen and separate the two existing arc transforms so the crown frames more of the red giant instead of reading as two similar thin loops; no camera or base-star transform changes.
- Reuse the existing rocky outpost root at `(-26, -12, -90)`, radius `10` as the only foreground placement authority.
- Keep exactly **16 observatory masts** as one `THREE.InstancedMesh`; all masts share one box geometry/material and one incremental draw call.
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
3. The two transparent DoubleSide prominence meshes remain explicitly single-pass; the 16 masts remain one instanced draw.
4. The existing two torus meshes now produce visibly separated braided plasma strands and bright knots through shader treatment, with no additional mesh, texture fetch or render loop.
5. The widened asymmetric arc transforms keep the red-supergiant disc readable while producing a more substantial crown silhouette in both required phone viewports.
6. Live mast diagnostics show a local depth span below **2.2 units** and a foreground lead of more than **56 units**, bounded by **58 units**, relative to the red-supergiant center.
7. Existing shared ORION High remains 4 objects / 10,944 triangles / 4 draws; the actual renderer diagnostic therefore rises by exactly **+7 draws** from Standard to combined High and returns to baseline after downgrade.
8. Direct Standard → High Photo Capture sees the complete extension before PNG extraction and restores Standard afterward.
9. High → Low disposal, Low → High rebuild and ORION departure/revisit rebuild without accumulation.
10. Production Chromium passes at **390×844 and 360×800**, preserves the final `explore` viewport and emits distinct Standard/High evidence.
11. Route planning, flight phases, Hermite arrival timing, camera authority, renderer count, DPR ceilings, persistence, network/backend paths and dependencies remain unchanged.

## Out of Scope

- New camera composition presets or camera-controller authority.
- Time-driven prominence simulation or a new `requestAnimationFrame` loop.
- Additional torus meshes, post-processing / bloom dependency, or added draw calls for the crown refinement.
- Permanent High quality or global DPR increase.
- Changes to ORION spectrograph, discovery state, route metadata or the base outpost model.

## Performance / lifecycle boundary

- Added extension geometry remains **3,264 measured triangles**.
- Added extension renderer budget remains **3 draw calls**.
- Added foreground detail remains **16 mast instances in one InstancedMesh**.
- Braided prominence refinement reuses the two existing shader materials and existing partial-torus meshes: **0 incremental objects / 0 incremental triangles / 0 incremental draw calls** versus the prior observatory pass.
- Standard／Low sustained extension cost: **zero owned objects**.
- State synchronization remains bounded to 4 Hz and outside the renderer loop.
- Owned geometry/materials are disposed on downgrade, departure and teardown.
- No new persistence, network, backend, analytics or dependency authority.

## Validation evidence required

- Focused source validation for the existing star/outpost anchors, two bounded torus meshes, 16-instance geometry budget, single-pass transparency, lifecycle and authority boundaries.
- Production Chromium at both required phone viewports.
- Actual renderer `DRAW` delta measurement rather than profile constants alone.
- Direct Photo Capture probe at PNG extraction.
- Live `observatoryMasts`, `mastDepthSpan` and `foregroundDepthLead` diagnostics in High, capture and revisit states.
- Standard/High screenshots for both phone viewports; High evidence should preserve the full red-giant disc and foreground observatory while showing the stronger asymmetric braided crown.

## Risks / supplementary manual checks

Physical iPhone Safari remains useful supplementary evidence for long-duration thermal/frame pacing, additive-blending appearance, thin-strand contrast and Save Sheet behaviour. These checks are not completion blockers when exact production Chromium, renderer-budget and lifecycle gates are green.

## Completion signal

ORION High/photo frames visibly combine a wider braided active-star crown with the near-field observatory silhouette, producing stronger destination identity and photographic spectacle without increasing the existing geometry/draw budget. Standard/Low remain unchanged and all approved travel/performance authorities stay intact.
