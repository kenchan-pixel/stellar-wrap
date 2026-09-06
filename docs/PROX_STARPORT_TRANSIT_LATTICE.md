# PROX Starport Transit Lattice｜比鄰星港立體進港航道

## Status

- Product direction: approved Cinematic / Capture Quality sequence.
- Implementation surface: persistent `autonomous-evolution` Draft PR.
- This slice refines only High-tier final-exploration presentation at PROX.
- Inherited baseline: Starport Transit Lattice v2 opposing traffic-lane parallax remains unchanged.

## Goal / intended user outcome

Make PROX feel like the player is entering an engineered orbital starport instead of only observing glowing traffic arcs. High quality and Photo Capture now reshape the existing foreground gantry into **three nested docking gates** joined by long perspective rails, creating a strong near → mid → far tunnel around the existing parallax traffic lanes, lava world and starport. The result should read as a deliberate docking approach and produce a stronger capture composition without raising the sustained renderer budget.

## Scope

- Reuse the existing PROX outer starport torus at `(15, -6, -82)`, radius `20`, as the sole motion/placement authority.
- Preserve the v2 pair of bounded partial-torus traffic lanes, their opposing far↔near sweep, **36 approach beacons**, shader treatment and lifecycle unchanged.
- Re-author the same **18-beam** instanced gantry instead of adding geometry:
  - **12 beams** form three nested trapezoidal docking gates at local `z = 6.2`, `3.4`, and `0.6`.
  - **4 longitudinal corner rails** connect the near and far gate corners.
  - **2 centre perspective rails** reinforce the tunnel axis.
- The gate cascade spans **5.6 local units** from near to far. Near width is `26.0` versus far width `17.6`, a bounded perspective ratio of about **1.48×**.
- Keep the inherited lane-local depth span at about **3.5 local units**, within the existing **3.6** lane-depth budget and radial perspective scale **0.94 → 1.08**.
- The foreground gantry still leads the farthest traffic element by about **8.0 units**, bounded by the existing **8.2** overall depth budget without moving the camera.
- Keep complementary cool-white/cyan and warm-amber traffic signals so the industrial structure stays distinct from the red-dwarf / lava palette.
- Create the complete lattice only during safe final PROX exploration at the existing `high` renderer tier.
- Observe the existing WebGL backing-canvas size so a direct Standard → High Photo Capture builds the same enhanced docking gates before PNG extraction.

## Acceptance Criteria

1. Standard and Low exploration add zero PROX transit-lattice objects.
2. High remains the **same 4 objects / 2,520 triangles / 4 draw calls**, with **36 approach beacons** and **18 instanced gantry beams**.
3. The 18 existing gantry beams resolve into **three nested docking gates plus six perspective rails**, not additional meshes.
4. Gate depth remains bounded to **5.6 local units** with about **1.48×** near/far width ratio; the camera and core starport transform do not move.
5. The inherited two traffic lanes retain their opposing far↔near sweeps, roughly **3.5 local units** of depth and **0.94–1.08** radial scale.
6. The transparent DoubleSide traffic-lane meshes remain one renderer pass each; the complete gate cascade remains one instanced draw rather than 18 separate meshes.
7. Gates, lanes and beacons stay attached to the **existing starport** ring and inherit its motion instead of adding another animation authority.
8. Direct Photo Capture from Standard sees the full High lattice at PNG extraction, then restores Standard and disposes all owned objects.
9. High → Low, departure, rebuild and revisit do not accumulate objects.
10. Real production Chromium at **390×844** and **360×800** produces distinct Standard/High evidence while preserving the CSS viewport.
11. Actual renderer diagnostics still confirm the combined PROX High increment is the existing shared cinematic **4 draws** plus this slice's **4 draws**, then returns to the lower-tier baseline.
12. The production-browser gate must derive the three frame groups, `17.6 / 22.0 / 26.0` live widths, `5.6` live depth span and all **six** near↔far perspective rails from the actual `InstancedMesh` matrices. `PROFILE` values are expected design bounds only and are not accepted as rendered-geometry evidence.

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
- Foreground structure: unchanged at **18 beams in one InstancedMesh**; v3 only redistributes those instances into the three-gate cascade.
- Gate geometry is authored once at build time and adds no per-frame geometry mutation.
- Traffic-lane parallax continues to use the two already-budgeted torus meshes; it adds no object, draw call, texture or per-frame geometry update.
- Standard／Low sustained cost: **zero owned lattice objects**.
- State fallback sampling remains bounded to 4 Hz and is outside the renderer loop.
- Owned geometry/materials are disposed on downgrade, departure and teardown.
- The backing-canvas observer is event-driven and disconnected on teardown.

## Validation evidence required

- Source/static validation for the three gate frames, six longitudinal perspective rails, bounded **5.6 / 1.48×** geometry, unchanged triangle/draw budget, inherited lane parallax, lifecycle, offline-shell integration and absence of persistence/network/render-loop authority.
- Production Chromium screenshots at both phone viewports through the existing PROX browser gate; High must show the new gate cascade while Standard remains free of the High-only extension.
- Actual renderer `DRAW` delta measurement; profile constants alone are not accepted as performance evidence.
- Live rendered-geometry proof must read the built gantry's actual instance matrices and reconstruct frame depths, widths and rail spans; authored constants or pre-build segment arrays alone are insufficient.
- Direct Photo Capture probe at PNG extraction to prove the enhanced High lattice is active after the backing-canvas quality change.
- Downgrade, rebuild, departure and revisit lifecycle checks remain green.

## Risks / supplementary manual checks

Physical iPhone Safari remains useful supplementary evidence for long-duration heat, frame pacing, transparent additive blending, thin-beam readability and Save Sheet behaviour. Lack of that human/device evidence is not a completion blocker when the bounded production-browser gates are green.

## Completion signal

The slice is complete when exact PR HEAD passes repository validation plus both real-browser phone gates, PROX High keeps the same bounded renderer cost while the same 18 gantry beams visibly form the documented three-stage docking corridor, lower tiers restore to zero owned objects, and exact-head review has no actionable P0/P1 finding.
