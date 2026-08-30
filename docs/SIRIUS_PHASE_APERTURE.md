# SIRIUS Phase Aperture｜天狼中繼相位孔徑

## Status

- Product direction: approved Cinematic High-tier / Capture Quality evolution.
- Current implementation surface: `autonomous-evolution` Draft PR.
- Visual pass: `phase-aperture-v1`.

## Goal / user outcome

Make SIRIUS read immediately as a purpose-built interstellar relay station rather than a blue-white star system with ordinary rings. In High quality and the existing transient Photo Preview / Photo Capture Boost path, two intersecting luminous phase-aperture arcs add a strong artificial silhouette around the existing spinning outer relay ring, improving arrival identity and photographic value without raising the normal mobile rendering tier.

## Scope

- Reuse the existing SIRIUS outer relay torus at `(0, -4, -82)`, radius `17.5`, as the only relay transform / spin authority.
- Add exactly two partial torus phase-aperture meshes as children of that existing relay ring.
- Place the arcs on opposing 3D planes so the station reads as a layered transmission aperture instead of another flat ring.
- Use a bounded additive shader with tapered arc ends, segmented energy rails and bright synchronization nodes; no time uniform or independent animation loop is introduced.
- Keep the existing shared SIRIUS High layer intact: blue-white primary granulation, halo, ice-body frost detail and segmented relay track.
- Gate the extension to safe final exploration, `qualityMode === 'high'`, and current destination `SIRIUS`.
- Standard／Low: zero phase-aperture extension objects.
- High: exactly 2 phase-aperture objects, measured **3,072 triangles / 2 draw calls**.
- Existing shared SIRIUS High plus this extension: 6 owned visual objects, **16,064 triangles / 6 draw calls** in total.
- Synchronize state with a bounded 4 Hz fallback outside the renderer loop.
- Also observe only the existing WebGL canvas `width` / `height` backing attributes. Core quality changes already resize that backing canvas, so this event-driven trigger activates/deactivates the High extension before the next animation frame. This specifically guarantees that a one-shot Photo Capture started from Standard / Low can include the High aperture during PNG extraction rather than waiting up to 250 ms for the fallback sampler.
- The backing-canvas observer does not watch frame content, does not create a render loop, and is disconnected on teardown.
- Dispose owned geometry/materials on quality downgrade or departure; rebuild on High re-entry and destination revisit without accumulation.
- Load after the existing cinematic extensions and include the module in the prepared offline shell.

The phase aperture intentionally strengthens **artificial landmark identity** rather than adding another scanner/checklist mechanic. The extra cost exists only in High / Photo Preview / Photo Capture states.

## Acceptance Criteria

1. Standard SIRIUS exploration has zero phase-aperture extension objects.
2. High SIRIUS exploration has exactly 2 extension objects, 3,072 measured triangles and 2 draw calls.
3. The existing shared SIRIUS High layer remains 4 objects / 12,992 triangles / 4 draw calls; combined bounded High cost is therefore 16,064 triangles / 6 draw calls.
4. Real production-WebGL Standard and High screenshots differ while CSS viewport size and final `explore` phase remain unchanged at 390×844 and 360×800.
5. A direct Photo Capture initiated from Standard activates the aperture before the WebGL canvas `toBlob()` export at both phone viewports, then restores Standard and releases the extension.
6. High → Low disposes the extension; Low → High rebuilds it; SIRIUS → another system → SIRIUS rebuilds without accumulation.
7. Existing route planning, flight phases, arrival timing, camera authority, renderer count, DPR ceilings, storage, network/backend paths and dependencies remain unchanged.
8. The existing Photo Preview / Capture Boost path reveals the extra High detail without forcing permanent High quality.

## Out of Scope

- New route or relay-calibration gameplay.
- New camera presets or camera-controller authority.
- Animated aperture simulation, time uniforms or another `requestAnimationFrame` loop.
- Post-processing / bloom dependency.
- Permanent High quality or global DPR increase.
- Additional systems or a second station scene.

## Validation evidence

The focused source/runtime validator is `scripts/validate-sirius-phase-aperture.mjs`; the production-WebGL gate is `scripts/validate-sirius-phase-aperture-browser.mjs`. The browser gate explicitly probes the aperture state at the actual canvas `toBlob()` extraction during a direct Standard → transient High Photo Capture at both 390×844 and 360×800. Exact CI run, screenshots, artifact digest and commit SHA are recorded in the persistent Draft PR receipt for the delivered cycle.

## Risks / supplementary manual checks

Additive cyan/white intensity can vary slightly with mobile GPU and colour management. Physical iPhone Safari long-duration thermal/frame pacing and colour-blending judgement remain useful supplementary evidence, but are not completion gates for this bounded slice.

## Completion signal

SIRIUS High / photo frames show a recognizable intersecting relay aperture with stronger depth and artificial landmark identity; direct one-shot captures from the normal Standard tier include that High detail; Standard / Low remains unchanged outside the transient boost; and the approved V4+ travel/performance authorities stay intact.
