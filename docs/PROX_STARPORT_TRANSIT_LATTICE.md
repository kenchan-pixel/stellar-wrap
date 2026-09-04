# PROX Starport Transit Lattice｜比鄰星港立體進港航道

## Status

- Product direction: approved Cinematic / Capture Quality sequence.
- Implementation surface: persistent `autonomous-evolution` Draft PR.
- This slice refines only High-tier final-exploration presentation at PROX.

## Goal / intended user outcome

Make PROX feel like the player is looking through a real orbital traffic corridor rather than at two flat glowing arcs. High quality and Photo Capture keep the existing foreground docking gantry, but the two traffic lanes now sweep in opposite directions through real local depth: one moves from far to near while the crossing lane moves from near to far. The result is a stronger near → mid → far composition around the existing lava world and starport without raising the sustained renderer budget.

## Scope

- Reuse the existing PROX outer starport torus at `(15, -6, -82)`, radius `20`, as the sole motion/placement authority.
- Retain the two bounded partial-torus traffic lanes, **36 approach beacons** and **18-beam** instanced docking gantry.
- Deform the two existing lane geometries once at build time; no extra mesh is created.
- Each lane performs one smooth opposing far↔near sweep with `1.62` local depth amplitude and bounded radial perspective scale **0.94 → 1.08**.
- The resulting lane-local depth span is about **3.5 local units**, within a **3.6** lane-depth budget and inside the existing overall foreground depth budget.
- The foreground gantry still leads the farthest traffic element by about **8.0 units**, bounded by the existing **8.2** overall depth budget without moving the camera.
- Keep complementary cool-white/cyan and warm-amber traffic signals so the industrial traffic structure stays distinct from the red-dwarf / lava palette.
- Create the complete lattice only during safe final PROX exploration at the existing `high` renderer tier.
- Observe the existing WebGL backing-canvas size so a direct Standard → High Photo Capture builds the same enhanced lattice before PNG extraction.

## Acceptance Criteria

1. Standard and Low exploration add zero PROX transit-lattice objects.
2. High remains the **same 4 objects / 2,520 triangles / 4 draw calls**, with **36 approach beacons** and **18 instanced gantry beams**.
3. The two traffic lanes visibly use opposing far↔near depth sweeps rather than remaining planar partial arcs.
4. Lane deformation remains bounded to roughly **3.5 local units** of depth and **0.94–1.08** radial scale; it does not move the camera or alter the core starport transform.
5. The transparent DoubleSide traffic-lane meshes remain one renderer pass each; the gantry remains one instanced draw rather than 18 separate meshes.
6. Gantry, lanes and beacons stay attached to the **existing starport** ring and inherit its motion instead of adding another animation authority.
7. Direct Photo Capture from Standard sees the full High lattice at PNG extraction, then restores Standard and disposes all owned objects.
8. High → Low, departure, rebuild and revisit do not accumulate objects.
9. Real production Chromium at **390×844** and **360×800** produces distinct Standard/High evidence while preserving the CSS viewport.
10. Actual renderer diagnostics still confirm the combined PROX High increment is the existing shared cinematic **4 draws** plus this slice's **4 draws**, then returns to the lower-tier baseline.

## Out of Scope

- Route, coordinates, travel timing, arrival curve or camera authority changes.
- New destination, exploration checklist, storage, backend, analytics or network path.
- Higher global DPR ceilings, post-processing framework or second renderer.
- Independent traffic or gantry animation loop; the existing starport motion remains authoritative.
- Replacing the underlying PROX landmark or raising sustained Standard/Low GPU cost.

## Performance / lifecycle boundary

- Added High-only mesh budget: unchanged at **2,520 measured triangles** total, including **216 instanced gantry triangles**.
- Added High-only point budget: unchanged at **36 points**.
- Added High-only renderer budget: unchanged at **4 draw calls**.
- Added foreground structure: unchanged at **18 beams in one InstancedMesh**.
- Traffic-lane parallax uses the two already-budgeted torus meshes; it adds no object, draw call, texture or per-frame geometry update.
- Standard／Low sustained cost: **zero owned lattice objects**.
- State fallback sampling remains bounded to 4 Hz and is outside the renderer loop.
- Owned geometry/materials are disposed on downgrade, departure and teardown.
- The backing-canvas observer is event-driven and disconnected on teardown.

## Validation evidence required

- Source/static validation for the opposing depth-sweep formula, bounded scale/depth constants, unchanged geometry/draw budget, lifecycle, offline-shell integration and absence of persistence/network/render-loop authority.
- Production Chromium screenshots at both phone viewports through the existing PROX browser gate.
- Actual renderer `DRAW` delta measurement; profile constants alone are not accepted as performance evidence.
- Direct Photo Capture probe at PNG extraction to prove the enhanced High lattice is active after the backing-canvas quality change.
- Downgrade, rebuild, departure and revisit lifecycle checks remain green.

## Risks / supplementary manual checks

Physical iPhone Safari remains useful supplementary evidence for long-duration heat, frame pacing, transparent additive blending, parallax readability and Save Sheet behaviour. Lack of that human/device evidence is not a completion blocker when the bounded production-browser gates are green.

## Completion signal

The slice is complete when exact PR HEAD passes repository validation plus both real-browser phone gates, PROX High keeps the same bounded renderer cost while the two traffic lanes gain the documented opposing depth sweep, lower tiers restore to zero owned objects, and exact-head review has no actionable P0/P1 finding.
