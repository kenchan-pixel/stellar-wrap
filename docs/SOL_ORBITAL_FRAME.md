# SOL Orbital Observation Frame v3｜近地軌道八艙格觀測框架

## Status

- Product direction: approved Phase A Cinematic / Capture Quality.
- Current implementation surface: `autonomous-evolution` Draft PR.
- This slice deepens the existing SOL final-exploration composition only. It does not change route, camera, flight timing, global DPR ceilings, persistence, backend or release authority.

## Goal / intended player outcome

Make the home-system vista read as a coherent human orbital observation structure rather than an isolated Earth sphere surrounded by unrelated rails. In High quality and Photo Capture, the player should see a deliberate depth stack:

**paired near/far observation lattice → Earth atmosphere / aurora / city-lit globe → distant Moon**.

The v3 composition turns the existing foreground budget into an eight-bay（八艙格）truss: each structural station now has a large near mast and smaller far mast at the same orbital angle, with aligned depth lights and triangulated braces. The foreground should therefore read as one inhabited orbital frame instead of scattered fence pieces, while keeping the Earth unobstructed and preserving the same mobile GPU budget.

## Scope

The focused SOL layer still attaches to the existing Earth scene authority and still adds exactly three High-only render objects:

1. **16 instanced observation masts** remain one draw, but are authored as **8 paired near/far bays**. Each pair shares one orbital angle, using the accepted **1.46 : 0.72 height-scale hierarchy** so perspective is expressed through silhouette and scale instead of extra geometry.
2. **20 instanced navigation lights** remain one draw and are now arranged as **10 aligned near/far marker pairs** across the same observation arc. Near markers stay larger/warm and far markers smaller/cool, so the eye can follow the structure's depth without adding particle volume.
3. One **30-segment LineSegments lattice** remains one draw. The same segment budget is reorganized into near/far longitudinal rails, eight cross-depth rungs and diagonal triangulation, making the framework read as a connected truss rather than disconnected braces.

Runtime diagnostics preserve the stable `orbital-observation-frame-v1` compatibility marker and accepted `orbital-perspective-gantry-v2` perspective marker, while adding `orbital-observation-lattice-v3` and a live `bays: 8` field only while the High-tier frame is active. The structure reuses the current Earth/Moon anchors. It has no independent renderer, camera, animation loop, storage, network request, analytics path or external visual asset.

## Performance budget

Focused extension only — **unchanged from v2**:

- owned render objects: **3**
- additional draw calls: **3**
- measured mesh triangles: **352**
  - observation masts: 16 × 12 = 192 triangles
  - navigation lights: 20 × 8 = 160 triangles
  - LineSegments lattice: no mesh triangles
- observation bays: **8**
- observation masts: **16**
- navigation lights: **20**
- brace line segments: **30**
- live foreground near/far depth span: **>6.0 and ≤6.8 local units**
- near/far mast height-scale ratio: **>2.0×** (`1.46 / 0.72 ≈ 2.03`)

Together with the existing shared SOL High layer, the destination remains bounded to **+7 draw calls** above Standard for this accepted composition. Standard／Low own zero objects from this focused extension. v3 improves spatial coherence by transform placement and brace topology; it adds no mesh, draw call, DPR increase, renderer pass or per-frame geometry work.

## Lifecycle / capture contract

The frame may exist only when all are true:

- `current === 'SOL'`;
- final exploration is active;
- no flight is active;
- WebGL context is healthy;
- quality is `high`.

High → Low/Standard, departure, or teardown must remove and dispose all owned geometry/materials. Returning to High or revisiting SOL must rebuild from the current Earth/Moon scene anchors without accumulation.

The stable `visualPass` compatibility marker and accepted v2 `gantryProfile` remain available for existing diagnostics. The new `latticeProfile` / `bays` diagnostics are live only while the frame is active. Inactive Standard／Low／departure snapshots must still clear `gantryProfile: null` and `mastScaleRatio: 0`, with the v3 lattice fields also inactive/zero. This prevents stale High-tier composition state from being mistaken for a live frame after disposal.

Destination Photo Mode continues to own capture. A direct Standard → Photo Capture quality boost must create the focused SOL frame before PNG extraction, then restore the previous quality and dispose the extension after capture.

## Acceptance Criteria

- SOL Standard has zero focused-frame objects and no live lattice; accepted inactive diagnostics remain cleared.
- SOL High preserves `orbital-perspective-gantry-v2`, exposes `orbital-observation-lattice-v3`, and reports 8 bays, exactly 3 objects, 16 masts, 20 lights, 30 brace segments and 352 measured mesh triangles.
- The 16 masts resolve into eight shared-angle near/far structural pairs; the 20 navigation lights resolve into ten aligned depth-marker pairs; the 30-line brace budget forms continuous rails, depth rungs and diagonal triangulation.
- The mast transform hierarchy keeps a live scale ratio above **2.0×** and no more than **2.1×**, while live near/far depth remains >6.0 and ≤6.8 local units.
- Existing production-Chromium acceptance continues to exercise direct Photo Capture, normal High exploration, High rebuild and SOL revisit, and proves inactive Standard／Low／departure cleanup.
- Real renderer diagnostics remain **+7 draw calls** from Standard to the combined shared SOL High + focused frame. High → Low must clear both High layers; restoring Standard must return to the original Standard draw count.
- Direct Standard → High Photo Capture includes both the shared SOL cinematic layer and the focused frame before PNG extraction.
- Production Chromium at **390×844** and **360×800** remains viewport-contained and emits distinct Standard / High evidence; exact-run screenshots are visually inspected for Earth visibility, coherent paired truss depth, no black frame and no horizontal clipping.
- Existing V4+ travel, arrival, Frontier, Gallery, offline and security contracts remain green.

## Out of Scope

- No new SOL scanner/checklist mechanic.
- No change to Earth/Moon core positions, route topology, LY authority, arrival timing or exploration camera authority.
- No permanent DPR increase, post-processing dependency, external texture, shadow system or second render loop.
- No extra mesh count or draw-call budget versus v2.
- Physical iPhone thermal/frame-pacing inspection remains supplementary evidence, not an automated completion gate.

## Risks / supplementary checks

The main risk is visual balance: a more coherent foreground truss must still frame the Earth rather than dominate it. Automated browser screenshots at both required phone viewports are the primary acceptance evidence for this slice; iPhone Safari blending, long-session thermal behavior and subjective touch feel remain supplementary.

## Completion Signal

The SOL High/Photo vista visibly reads as one eight-bay orbital observation lattice with paired near/far scale, aligned lights and triangulated bracing; Earth and Moon remain the hero composition; the focused GPU budget stays exactly 3 draws / 352 mesh triangles; exact-head CI and both production-browser phone viewports pass; and the exact-head PR review has no unresolved actionable P0/P1/P2.