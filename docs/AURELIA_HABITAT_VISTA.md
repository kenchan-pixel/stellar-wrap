# AURELIA Inhabited Horizon v3

## Status
Approved autonomous vertical slice on the persistent `autonomous-evolution` branch. This document is the current AURELIA visual SOT and supersedes the earlier inhabited-habitat v2 detail baseline without changing Frontier route authority or the Real Space simulator.

## Goal / intended user outcome
Make AURELIA read immediately as a populated artificial world rather than a luminous engineering ring. The fixed scenic overview and capture should show a recognisable inhabited horizon: city structures growing out of the habitat ribbon, a sun-facing mirror wing, docking infrastructure, and the existing central energy core in one coherent composition.

## Scope
- Preserve the existing habitat ribbon, 56 city-light blocks, eight docking spines, core, star, moon, debris, fixed scenic camera, free backend controls, and capture path.
- Add 32 bounded skyline towers around both faces of the inhabited ribbon using one shared box geometry/material and one `InstancedMesh` draw.
- Add 12 bounded sunward solar-mirror vanes using one shared box geometry/material and one `InstancedMesh` draw.
- Keep the new infrastructure attached to the existing `habitat` transform so guided vistas, the fixed scenic overview, manual backend rotation, and capture remain coherent.
- Update arrival/exploration copy so the new city crown and mirror wing are legible landmarks rather than unexplained geometry.
- Expose the live v3 detail profile and bounded counts through `WarpFrontier.state().habitatDetail`.

## Performance / architecture boundary
AURELIA remains one WebGL renderer with the existing DPR policy: normal mobile DPR <= 1.25 and capture DPR <= 1.60. The v3 pass adds exactly two draw-bearing objects and 528 low-poly triangles over v2. The AURELIA detail layer is therefore bounded to five detail objects / 2,832 detail triangles; the full scenic backend must remain <= 18 renderer draws and <= 24,000 triangles. No shadows, post-processing, extra renderer, timer, storage, analytics, network request, or new route/camera authority is added.

## Acceptance criteria
1. The AURELIA runtime reports `AURELIA_HABITAT_V3`, 32 skyline towers, 12 solar vanes, five detail objects, and 2,832 detail triangles.
2. The fixed Frontier scenic overview remains the primary entry and still holds `autoOrbit=false` plus `vista=overview`.
3. AURELIA remains inside the shared Frontier backend caps of 18 draws and 24,000 triangles.
4. 390×844 and 360×800 real Chromium views render non-empty AURELIA screenshots with the city-crown / mirror-wing silhouette visible and no horizontal layout regression.
5. High-quality capture raises the real backing buffer and restores the exact normal DPR/buffer afterwards.
6. The existing AURELIA free-view backend, overview/night/core presets, pointer interaction, and Real Space/mode-selection exits remain intact.
7. No persistence, background network authority, new dependency, or second renderer is introduced.

## Out of scope
- New Frontier destinations, lore progression, scanner/checklist mechanics, or route simulation.
- Increasing normal live DPR or changing travel/arrival timing.
- Replacing the existing fixed scenic camera or D-015 Frontier presentation hierarchy.
- Real Space V4+ behavior, coordinates, route graph, or Photo Mode changes.

## Validation evidence required
- `npm run check` on the exact pushed PR HEAD.
- Focused AURELIA static contract.
- Existing Frontier backend real-browser gate at 390×844 and 360×800, including real capture/restore evidence and renderer diagnostics.
- Direct inspection of the exact-run AURELIA mobile screenshots.
- Exact-head Draft PR review with no unresolved P0/P1 finding before later unrelated scope.

## Risks / supplementary manual checks
Physical iPhone Safari color blending, thermal behavior, and long-session frame pacing remain useful supplementary evidence. They are not blockers because this slice is bounded, the shared renderer budgets are measured in CI, and mobile runtime/capture behavior is validated autonomously in Chromium.

## Completion signal
The slice is complete when the v3 source, current SOT, focused contract, exact-head repository validation, both mobile browser gates, screenshot inspection, and Draft PR evidence are all pushed to the persistent PR without changing `main` or production deployment.
