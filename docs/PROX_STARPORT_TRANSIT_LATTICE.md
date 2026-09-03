# PROX Starport Transit Lattice｜比鄰星港前景泊位桁架

## Status

- Product direction: approved Cinematic / Capture Quality sequence.
- Implementation surface: persistent `autonomous-evolution` Draft PR.
- This slice changes only High-tier final-exploration presentation at PROX.

## Goal / intended user outcome

Make PROX feel like the player is actually approaching an industrial orbital facility rather than looking at traffic lights around a distant ring. High quality and Photo Capture now add a strong foreground docking gantry in front of the existing transit lanes and beacon field, creating an intentional near → mid → far composition while retaining the lava world and original starport identity.

## Scope

- Reuse the existing PROX outer starport torus at `(15, -6, -82)`, radius `20`, as the sole motion/placement authority.
- Retain the two bounded partial-torus traffic lanes and **36 approach beacons** from Transit Lattice v1.
- Add one bounded **18-beam instanced docking gantry** as the near-field industrial silhouette; all beams share one box geometry/material and one draw call.
- Place the gantry between local `z=2.8` and `z=6.2`, in front of the beacon field, to provide a measured foreground depth lead of about **8.0 units** without moving the camera.
- Keep complementary cool-white/cyan and warm-amber traffic signals so the industrial structure remains distinct from the red dwarf / lava palette.
- Create the complete v2 lattice only during safe final PROX exploration at the existing `high` renderer tier.
- Observe the existing WebGL backing-canvas size so a direct Standard → High Photo Capture builds v2 before PNG extraction.

## Acceptance Criteria

1. Standard and Low exploration add zero PROX transit-lattice objects.
2. High adds exactly **4 objects**, **2,520 measured triangles**, **36 approach beacons**, **18 instanced gantry beams** and **4 draw calls**.
3. The two transparent DoubleSide traffic-lane meshes render in one renderer pass each; the gantry is one instanced draw rather than 18 separate meshes.
4. The gantry, lanes and beacons remain attached to the existing starport ring and inherit its motion instead of adding another animation authority.
5. Live diagnostics show beacon depth separation plus a foreground lead close to **8.0 units**, bounded by **8.2 units**.
6. Direct Photo Capture from Standard sees the full High v2 lattice at PNG extraction, then restores Standard and disposes all owned objects.
7. High → Low, departure, rebuild and revisit do not accumulate objects.
8. Real production Chromium at **390×844** and **360×800** shows different Standard/High frame evidence and preserves the CSS viewport.
9. Actual renderer diagnostics confirm the combined PROX High increment is the existing shared cinematic **4 draws** plus this slice's **4 draws**, then returns to the lower-tier baseline.

## Out of Scope

- Route, coordinates, travel timing, arrival curve or camera authority changes.
- New destination, exploration checklist, storage, backend, analytics or network path.
- Higher global DPR ceilings, post-processing framework or second renderer.
- Independent traffic or gantry animation loop; the existing starport motion remains authoritative.
- Replacing the underlying PROX landmark or raising sustained Standard/Low GPU cost.

## Performance / lifecycle boundary

- Added High-only mesh budget: **2,520 measured triangles** total for the v2 extension, including **216 instanced gantry triangles**.
- Added High-only point budget: **36 points**.
- Added High-only renderer budget: **4 draw calls**.
- Added foreground structure: **18 beams in one InstancedMesh**.
- Standard／Low sustained cost: **zero owned lattice objects**.
- State fallback sampling remains bounded to 4 Hz and is outside the renderer loop.
- Owned geometry/materials are disposed on downgrade, departure and teardown.
- The backing-canvas observer is event-driven and disconnected on teardown.

## Validation evidence required

- Source/static validation for anchor matching, v2 geometry/depth budgets, instancing, single-pass transparency, lifecycle, offline-shell integration and absence of persistence/network/render-loop authority.
- Production Chromium screenshots at both phone viewports.
- Actual renderer `DRAW` delta measurement; profile constants alone are not accepted as performance evidence.
- Live v2 diagnostics for **18 gantry beams**, beacon depth span and foreground-depth lead in High, direct capture and revisit states.
- Direct Photo Capture probe at PNG extraction to prove the complete High lattice is already active after the backing-canvas quality change.

## Risks / supplementary manual checks

Physical iPhone Safari remains useful supplementary evidence for long-duration heat, frame pacing, transparent additive blending, foreground-gantry contrast and Save Sheet behaviour. Lack of that human/device evidence is not a completion blocker when the bounded production-browser gates are green.

## Completion signal

The slice is complete when exact PR HEAD passes repository validation plus both real-browser phone gates, PROX High evidence contains the new foreground docking structure with measured near/mid/far depth, lower tiers restore to zero owned objects, and exact-head review has no actionable P0/P1 findings.
