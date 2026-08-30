# PROX Starport Transit Lattice｜比鄰星港進場光軌

## Status

- Product direction: approved Cinematic / Capture Quality sequence.
- Implementation surface: persistent `autonomous-evolution` Draft PR.
- This slice changes only High-tier final-exploration presentation at PROX.

## Goal / intended user outcome

Make PROX read immediately as an active orbital starport rather than only a lava planet with a luminous ring. In High quality and Photo Capture, the existing rotating starport gains layered traffic lanes and approach beacons that create industrial depth and a stronger photographic silhouette.

## Scope

- Reuse the existing PROX outer starport torus at `(15, -6, -82)`, radius `20`, as the sole motion/placement authority.
- Attach two bounded partial-torus traffic lanes to that starport so they inherit its existing rotation.
- Add **36 approach beacons** as one bounded point layer around the same authority.
- Use complementary cool-white/cyan and warm-amber signals to separate traffic depth from the red dwarf / lava palette.
- Create the lattice only during safe final PROX exploration at the existing `high` renderer tier.
- Observe the existing WebGL backing-canvas size so a direct Standard → High Photo Capture builds the lattice before PNG extraction.

## Acceptance Criteria

1. Standard and Low exploration add zero PROX transit-lattice objects.
2. High adds exactly **3 objects**, **2,304 mesh triangles**, **36 approach beacons** and **3 draw calls**.
3. The two transparent DoubleSide traffic-lane meshes render in one renderer pass each.
4. The lattice remains attached to the existing starport ring and inherits its motion instead of adding another animation authority.
5. Direct Photo Capture from Standard sees the High lattice at PNG extraction, then restores Standard and disposes all lattice objects.
6. High → Low, departure, rebuild and revisit do not accumulate objects.
7. Real production Chromium at **390×844** and **360×800** shows different Standard/High frame evidence and preserves the CSS viewport.
8. Actual renderer diagnostics confirm the combined PROX High increment is the existing shared cinematic **4 draws** plus this slice's **3 draws**, then returns to the lower-tier baseline.

## Out of Scope

- Route, coordinates, travel timing, arrival curve or camera authority changes.
- New destination, exploration checklist, storage, backend, analytics or network path.
- Higher global DPR ceilings, post-processing framework or second renderer.
- Independent traffic animation loop; the existing starport motion remains authoritative.

## Performance / lifecycle boundary

- Added High-only mesh budget: **2,304 triangles**.
- Added High-only point budget: **36 points**.
- Added High-only renderer budget: **3 draw calls**.
- Standard／Low sustained cost: **zero owned lattice objects**.
- State fallback sampling remains bounded to 4 Hz and is outside the renderer loop.
- Owned geometry/materials are disposed on downgrade, departure and teardown.
- The backing-canvas observer is event-driven and disconnected on teardown.

## Validation evidence required

- Source/static validation for anchor matching, geometry budget, single-pass transparency, lifecycle, offline-shell integration and absence of persistence/network/render-loop authority.
- Production Chromium screenshots at both phone viewports.
- Actual renderer `DRAW` delta measurement; profile constants alone are not accepted as performance evidence.
- Direct Photo Capture probe at PNG extraction to prove the High lattice is already active after the backing-canvas quality change.

## Risks / supplementary manual checks

Physical iPhone Safari remains useful supplementary evidence for long-duration heat, frame pacing, transparent additive blending and Save Sheet behaviour. Lack of that human/device evidence is not a completion blocker when the bounded production-browser gates are green.

## Completion signal

The slice is complete when exact PR HEAD passes repository validation plus both real-browser phone gates, the screenshots show a distinct PROX High traffic-lattice treatment, lower tiers restore to zero owned objects, and exact-head review has no actionable P0/P1 findings.
