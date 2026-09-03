# SIRIUS Phase Aperture v2｜天狼中繼相位孔徑

## Status

- Product direction: approved Cinematic High-tier / Capture Quality evolution.
- Current implementation surface: `autonomous-evolution` Draft PR.
- Visual pass: `phase-aperture-v2`.
- Current increment: **Spatial Depth Weave**.

## Goal / user outcome

Make SIRIUS feel like a purpose-built interstellar relay whose structure has real depth, not merely a blue-white system with decorative rings. High quality and the existing transient Photo Preview / Photo Capture Boost path reveal a layered **phase aperture lattice**: two intersecting transmission arcs, a tilted inner iris and a 16-node parallax beacon cage. The existing relay remains the transform / spin authority, so the depth follows the station naturally without a second animation controller.

### Spatial Depth Weave｜本輪增量

The earlier v2 geometry was bounded and efficient, but most of its actual local Z positions remained close to the relay plane. The Spatial Depth Weave turns the same four objects into a visibly deeper capture composition without adding geometry or draw calls:

- the upper transmission arc is pulled forward to `z = -3.2`, the lower arc sits behind at `z = 3.0`, and the inner iris occupies the mid-depth layer at `z = 0.8`;
- the three layers use more strongly separated crossing-plane rotations, so the aperture reads as a nested 3D mechanism rather than concentric line art;
- the 16 instanced beacons alternate between two elliptical near/far orbital rails. Their bounded local-Z formula spans roughly **10.8 units**, creating real parallax around the relay silhouette;
- the diagnostic snapshot exposes the three layer depths and the measured beacon depth span so the spatial contract can be regression-checked without inventing a second camera or renderer authority.

This is a capture-quality / destination-identity change only. It does not alter route planning, arrival composition authority, simulation timing, camera controls, quality thresholds or the existing High-tier budget.

## Scope

- Reuse the existing SIRIUS outer relay torus at `(0, -4, -82)`, radius `17.5`, as the only relay transform / spin authority.
- Retain the two partial torus phase-aperture meshes on opposing 3D planes.
- Keep one bounded inner torus iris on a third plane so the station reads as a nested transmission aperture from the curated arrival camera.
- Keep 16 low-poly octahedral phase beacons in one `InstancedMesh` draw. The current Spatial Depth Weave distributes them across alternating near/far elliptical rails instead of a single shallow ellipse.
- The beacon lattice remains static relative to the existing relay parent. There is no time uniform, new animation timer or independent `requestAnimationFrame`; any motion comes from the already-authoritative relay transform.
- Use bounded additive materials only. Transparent aperture materials and the beacon material explicitly expose `forceSinglePass`, avoiding accidental double submission.
- Keep the existing shared SIRIUS High layer intact: blue-white primary granulation, halo, ice-body frost detail and segmented relay track.
- Gate the extension to safe final exploration, `qualityMode === 'high'`, and current destination `SIRIUS`.
- Standard／Low: zero phase-aperture extension objects.
- High: exactly **4 extension objects**: 3 torus meshes + 1 instanced beacon mesh, measured **4,064 triangles / 4 draw calls / 16 beacon instances**.
- Existing shared SIRIUS High plus this extension: 8 owned High-detail objects, **17,056 triangles / 8 incremental draw calls** over the lower-tier scene.
- Triangle diagnostics multiply instanced geometry by the live instance count, so the beacon budget is not under-reported.
- Synchronize state with the existing bounded 4 Hz fallback outside the renderer loop.
- Also observe only the existing WebGL canvas `width` / `height` backing attributes. Core quality changes already resize that backing canvas, so this event-driven trigger activates/deactivates the High extension before the next animation frame. This guarantees that a one-shot Photo Capture started from Standard / Low includes the v2 aperture at PNG extraction instead of waiting up to 250 ms for the fallback sampler.
- Dispose all owned geometry/materials on quality downgrade or departure; rebuild on High re-entry and destination revisit without accumulation.
- No new dependency, storage, network/backend path, renderer, camera authority, route authority or flight timing change.

The v2 pass is intentionally a **destination-identity / capture-quality** upgrade rather than another scanner or checklist mechanic. Its extra cost exists only in High / Photo Preview / Photo Capture states.

## Acceptance Criteria

1. Standard SIRIUS exploration has zero phase-aperture extension objects and zero incremental draw/triangle cost.
2. High SIRIUS exploration has exactly 4 extension objects, 16 instanced beacons, 4,064 measured triangles and 4 draw calls, with all live extension materials reporting `forceSinglePass === true`.
3. The upper／iris／lower aperture layers occupy explicit **near／mid／far** Z positions (`-3.2 / 0.8 / 3.0`) and the instanced beacon cage spans approximately 10.8 local depth units.
4. The beacon cage alternates across two bounded elliptical depth rails; it must not collapse back into a single flat X/Y ring.
5. The existing shared SIRIUS High layer remains 4 objects / 12,992 triangles / 4 draw calls; the production-browser gate reads the existing renderer diagnostic `DRAW` count and requires an actual **High − Standard delta of 8 calls**, rather than trusting duplicated profile constants.
6. Real production-WebGL Standard and High screenshots differ while CSS viewport size and final `explore` phase remain unchanged at 390×844 and 360×800.
7. A direct Photo Capture initiated from Standard activates all four v2 aperture objects before the WebGL canvas `toBlob()` export at both phone viewports, with live single-pass material state and all 16 beacon instances, then restores Standard and releases the extension.
8. High → Low disposes the extension and renderer `DRAW` returns to the lower-tier baseline; Low → High rebuilds it; SIRIUS → another system → SIRIUS rebuilds without accumulation.
9. Existing route planning, flight phases, continuous arrival timing, camera authority, renderer count, DPR ceilings, storage, network/backend paths and dependencies remain unchanged.
10. The existing Photo Preview / Capture Boost path reveals the deeper relay structure without forcing permanent High quality during normal mobile travel.

## Out of Scope

- New route or relay-calibration gameplay.
- A second station scene, new destination or Frontier route authority.
- New camera presets or camera-controller authority.
- Animated aperture simulation, time uniforms or another `requestAnimationFrame` loop.
- Post-processing / bloom dependency.
- Permanent High quality, global DPR increase or simulation-timing changes.

## Validation evidence

The focused source/runtime validator is `scripts/validate-sirius-phase-aperture.mjs`; the production-WebGL gate is `scripts/validate-sirius-phase-aperture-browser.mjs`. The focused validator checks the explicit near/mid/far layer positions, alternating two-rail beacon placement, bounded 10.8-unit depth target and diagnostic depth exposure. The production-browser gate now also asserts the **live depth diagnostics** during normal High exploration, direct Standard → transient High Photo Capture, High rebuild and destination revisit: `layerDepths = [-3.2, 3.0, 0.8]`, `budgetDepthSpan = 10.8`, and the measured beacon depth span must stay above 10 while remaining within that budget. This prevents the gate from passing on object counts alone if the new spatial weave disappears at runtime. At both 390×844 and 360×800 it additionally probes the aperture at the actual canvas `toBlob()` extraction, measures the real renderer `DRAW` count, requires exactly eight incremental High submissions for the four shared cinematic objects plus four phase-aperture v2 objects, captures Standard/High evidence, and verifies the count returns to the lower-tier baseline after disposal. Exact CI run, screenshots/artifact evidence and commit SHA are recorded in the persistent Draft PR receipt for the delivered cycle.

## Performance / risk

Spatial Depth Weave adds **zero triangles and zero draw calls** over the existing v2 aperture: the extension remains **4,064 triangles / 4 draws / 16 instanced nodes** and remains restricted to High / temporary capture states. The change alters only local transforms and instance placement. The widest beacon separation is bounded around the documented 10.8-unit depth envelope, so it does not introduce an unbounded fill-rate or memory path. Additive cyan/white intensity and perceived separation can vary slightly with mobile GPU, camera perspective and colour management. Physical iPhone Safari long-duration thermal/frame pacing and colour-blending judgement remain useful supplementary evidence, not completion gates for this bounded slice.

## Completion signal

SIRIUS High / photo frames show a clearly three-dimensional relay aperture with separated near/mid/far arcs and a braided two-depth beacon cage; direct one-shot captures from Standard include that detail; live browser diagnostics prove the intended spatial-depth contract; real renderer diagnostics prove the bounded 8-call total High delta with the shared cinematic layer; Standard / Low returns to zero extension cost; revisit rebuild remains clean; and the approved V4+ travel/performance authorities remain intact.
