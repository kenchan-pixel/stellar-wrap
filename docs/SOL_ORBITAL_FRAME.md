# SOL Orbital Observation Frame｜近地軌道觀測框架

## Status

- Product direction: approved Phase A Cinematic / Capture Quality.
- Current implementation surface: `autonomous-evolution` Draft PR.
- This slice deepens the existing SOL final-exploration composition only. It does not change route, camera, flight timing, global DPR ceilings, persistence, backend or release authority.

## Goal / intended player outcome

Make the home-system vista read as a human orbital observation position rather than an isolated Earth sphere. In High quality and Photo Capture, the player should see a coherent depth stack:

**foreground orbital frame → Earth atmosphere / aurora / city-lit globe → distant Moon**.

The artificial foreground must be clearly readable in mobile portrait without covering the Earth or forcing the whole live journey to run at higher resolution.

## Scope

The focused SOL layer attaches to the existing Earth scene authority and adds exactly three High-only render objects:

1. **16 instanced observation masts** arranged as an asymmetric lower orbital foreground arc.
2. **20 instanced navigation lights** split across near/far lanes.
3. One **30-segment LineSegments brace cage** joining the two depth lanes.

The structure reuses the current Earth/Moon anchors. It has no independent renderer, camera, animation loop, storage, network request, analytics path or external visual asset.

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

Together with the existing shared SOL High layer, the destination remains bounded to **+7 draw calls** above Standard for this accepted composition. Standard／Low own zero objects from this focused extension.

## Lifecycle / capture contract

The frame may exist only when all are true:

- `current === 'SOL'`;
- final exploration is active;
- no flight is active;
- WebGL context is healthy;
- quality is `high`.

High → Low/Standard, departure, or teardown must remove and dispose all owned geometry/materials. Returning to High or revisiting SOL must rebuild from the current Earth/Moon scene anchors without accumulation.

Destination Photo Mode continues to own capture. A direct Standard → Photo Capture quality boost must create the focused SOL frame before PNG extraction, then restore the previous quality and dispose the extension after capture.

## Acceptance Criteria

- SOL Standard has zero focused-frame objects.
- SOL High exposes exactly 3 objects, 16 masts, 20 lights, 30 brace segments and 352 measured mesh triangles.
- Real renderer diagnostics show **+7 draw calls** from Standard to the combined shared SOL High + focused frame, then return to the original count after downgrade.
- Live focused-frame depth span is >6.0 and ≤6.8 local units.
- Direct Standard → High Photo Capture includes both the shared SOL cinematic layer and the focused frame before `toBlob()`.
- High → Low disposal, Low → High rebuild and SOL → another system → SOL revisit all pass without accumulation.
- Production Chromium at **390×844** and **360×800** remains viewport-contained and emits distinct Standard / High evidence.
- Existing V4+ travel, arrival, Frontier, Gallery, offline and security contracts remain green.

## Out of Scope

- No new SOL scanner/checklist mechanic.
- No change to Earth/Moon core positions, route topology, LY authority, arrival timing or exploration camera authority.
- No permanent DPR increase, post-processing dependency, external texture, shadow system or second render loop.
- Physical iPhone thermal/frame-pacing inspection remains supplementary evidence, not an automated completion gate.

## Completion Signal

The SOL High/Photo vista reads as a bounded inhabited orbital observation position with a visibly closer artificial foreground, while Standard/Low cost, the V4 travel chain and existing renderer authority remain unchanged.