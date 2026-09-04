# SOL Orbital Observation Frame v2｜近地軌道透視觀測框架

## Status

- Product direction: approved Phase A Cinematic / Capture Quality.
- Current implementation surface: `autonomous-evolution` Draft PR.
- This slice deepens the existing SOL final-exploration composition only. It does not change route, camera, flight timing, global DPR ceilings, persistence, backend or release authority.

## Goal / intended player outcome

Make the home-system vista read as a large human orbital observation position rather than an isolated Earth sphere with a flat decorative rail. In High quality and Photo Capture, the player should see a coherent depth stack:

**large near gantry → smaller far gantry lane → Earth atmosphere / aurora / city-lit globe → distant Moon**.

The artificial foreground must create obvious perspective scale in mobile portrait without covering the Earth or forcing the whole live journey to run at higher resolution.

## Scope

The focused SOL layer still attaches to the existing Earth scene authority and still adds exactly three High-only render objects:

1. **16 instanced observation masts** arranged as an asymmetric lower orbital foreground arc. v2 keeps the same instance count but gives alternating near/far masts a deliberate **1.46 : 0.72 height-scale hierarchy** so the structure reads in perspective rather than as a flat fence.
2. **20 instanced navigation lights** reuse the same one-draw bank, with the near lane visibly larger and warm while the far lane is smaller and cool.
3. One **30-segment LineSegments brace cage** keeps the same draw count but changes the six cross links into a mix of straight and diagonal chevrons between slightly different near/far radii.

Runtime diagnostics preserve the existing stable `orbital-observation-frame-v1` compatibility marker and expose `orbital-perspective-gantry-v2` plus a live mast scale ratio only while the High-tier gantry is actually active. The structure reuses the current Earth/Moon anchors. It has no independent renderer, camera, animation loop, storage, network request, analytics path or external visual asset.

## Performance budget

Focused extension only:

- owned render objects: **3**
- additional draw calls: **3**
- measured mesh triangles: **352**
  - observation masts: 16 × 12 = 192 triangles
  - navigation lights: 20 × 8 = 160 triangles
  - LineSegments braces: no mesh triangles
- observation masts: **16**
- navigation lights: **20**
- brace line segments: **30**
- live foreground near/far depth span: **>6.0 and ≤6.8 local units**
- near/far mast height-scale ratio: **>2.0×** (`1.46 / 0.72 ≈ 2.03`)

Together with the existing shared SOL High layer, the destination remains bounded to **+7 draw calls** above Standard for this accepted composition. Standard／Low own zero objects from this focused extension. v2 raises visual scale by transforms, silhouette and brace layout rather than additional geometry, DPR or renderer passes.

## Lifecycle / capture contract

The frame may exist only when all are true:

- `current === 'SOL'`;
- final exploration is active;
- no flight is active;
- WebGL context is healthy;
- quality is `high`.

High → Low/Standard, departure, or teardown must remove and dispose all owned geometry/materials. Returning to High or revisiting SOL must rebuild from the current Earth/Moon scene anchors without accumulation.

The stable `visualPass` compatibility marker remains available for diagnostics, but inactive Standard／Low／departure snapshots must clear the live v2 fields to `gantryProfile: null` and `mastScaleRatio: 0`. This prevents stale High-tier perspective state from being mistaken for an active composition after disposal.

Destination Photo Mode continues to own capture. A direct Standard → Photo Capture quality boost must create the focused SOL frame before PNG extraction, then restore the previous quality and dispose the extension after capture.

## Acceptance Criteria

- SOL Standard has zero focused-frame objects and clears live v2 diagnostics to `gantryProfile: null` / `mastScaleRatio: 0`.
- SOL High exposes `orbital-perspective-gantry-v2`, exactly 3 objects, 16 masts, 20 lights, 30 brace segments and 352 measured mesh triangles.
- The v2 mast transform hierarchy reports a live scale ratio above **2.0×** and no more than **2.1×**, while the existing live depth span remains >6.0 and ≤6.8 local units.
- Production Chromium regression-locks the live v2 profile/ratio during direct Photo Capture, normal High exploration, High rebuild and SOL revisit, and proves those fields clear at Standard／Low／departure.
- Real renderer diagnostics show **+7 draw calls** from Standard to the combined shared SOL High + focused frame. High → Low must clear both High layers and reduce renderer work; restoring Standard must return to the original Standard draw count. Low is intentionally allowed to use fewer base draws/DPR under the existing adaptive-quality authority.
- Direct Standard → High Photo Capture includes both the shared SOL cinematic layer and the focused frame before PNG extraction.
- High → Low disposal, Low → High rebuild and SOL → another system → SOL revisit all pass without accumulation.
- Production Chromium at **390×844** and **360×800** remains viewport-contained and emits distinct Standard / High evidence.
- Existing V4+ travel, arrival, Frontier, Gallery, offline and security contracts remain green.

## Out of Scope

- No new SOL scanner/checklist mechanic.
- No change to Earth/Moon core positions, route topology, LY authority, arrival timing or exploration camera authority.
- No permanent DPR increase, post-processing dependency, external texture, shadow system or second render loop.
- Physical iPhone thermal/frame-pacing inspection remains supplementary evidence, not an automated completion gate.

## Completion Signal

The SOL High/Photo vista reads as a bounded inhabited orbital observation position with a materially stronger near/far perspective hierarchy, and the exact production-browser gate proves that hierarchy is genuinely live during capture/exploration and absent after disposal, while Standard/Low cost, the V4 travel chain and existing renderer authority remain unchanged.