# ORION Prominence Crown｜獵戶紅超巨星日珥冠

## Status

- Product direction: approved Cinematic High-tier / Capture Quality evolution.
- Current implementation surface: `autonomous-evolution` Draft PR.
- Visual pass: `prominence-crown-v1`.

## Goal / user outcome

Make ORION's red supergiant read as an extreme active star rather than only a glowing sphere. In High quality and the existing transient Photo Capture Boost path, two luminous stellar-ejection arcs break the circular silhouette and make arrival / capture frames materially more distinctive.

## Scope

- Reuse the existing ORION red-supergiant mesh at `(28, 8, -137)` with radius `30` as the only star authority.
- Add exactly two partial torus prominence meshes as children of that star.
- Give the arcs distinct 3D orientations plus a tapered additive shader with strand and hot-knot variation.
- Keep the existing shared ORION High layer intact: red-supergiant granulation, corona, rocky-outpost surface detail and 84 bounded nebula filament points.
- Gate the extension to safe final exploration, `qualityMode === 'high'`, and current destination `ORION`.
- Standard／Low: zero prominence-extension objects.
- High: exactly 2 prominence-extension objects, measured **3,072 triangles / 2 draw calls**.
- Existing shared ORION High plus this extension: 6 owned visual objects, **14,016 triangles / 6 draw calls** in total.
- Synchronize state at bounded 4 Hz outside the renderer loop.
- Dispose owned geometry/materials when dropping below High or leaving ORION; rebuild on High re-entry and destination revisit.
- Load after the existing shared cinematic modules and include the module in the prepared offline shell.

The `prominence crown` intentionally uses an `asymmetric` silhouette so the star reads differently from a generic spherical glow without introducing another animation or camera authority.

## Acceptance Criteria

1. Standard ORION exploration has zero prominence-extension objects.
2. High ORION exploration has exactly 2 extension objects, 3,072 measured triangles and 2 draw calls.
3. The existing shared ORION High layer remains 4 objects / 10,944 triangles / 4 draw calls; the combined bounded High-only cost is therefore 14,016 triangles / 6 draw calls.
4. Real production-WebGL Standard and High evidence differ while the CSS viewport and final `explore` phase remain unchanged.
5. High → Low disposes the extension; Low → High rebuilds it; ORION → another system → ORION recaptures and rebuilds without accumulation.
6. The existing shared cinematic browser gate continues covering ORION at 390×844 and 360×800, with focused prominence runtime evidence at 390×844.
7. Route planning, flight phases, arrival timing, camera authority, renderer count, DPR ceilings, storage, network/backend paths and dependencies remain unchanged.

## Out of Scope

- New camera composition presets or camera-controller authority.
- Animated prominence simulation or a new `requestAnimationFrame` loop.
- Post-processing / bloom dependency.
- Permanent High quality or global DPR increase.
- Changes to ORION spectrograph, discovery state or route metadata.

## Validation evidence

The focused source/runtime validator is `scripts/validate-orion-prominence.mjs`; the production-WebGL gate is `scripts/validate-orion-prominence-browser.mjs`. Exact CI run, screenshots and commit SHA are recorded in the persistent Draft PR receipt for each delivered cycle rather than hard-coded here.

## Risks / supplementary manual checks

Additive intensity can vary slightly with mobile GPU and colour management. Physical iPhone Safari long-duration thermal/frame pacing and colour-blending judgement remain useful supplementary checks, but are not completion gates for this bounded slice.

## Completion signal

ORION High/photo frames show a clearly non-circular active-star silhouette with two luminous ejection arcs, while Standard/Low remains unchanged and all approved travel/performance authorities stay intact.
