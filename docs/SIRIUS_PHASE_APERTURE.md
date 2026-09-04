# SIRIUS Phase Aperture v3｜雙星相位柱籠

## Status

- Product direction: approved Cinematic High-tier / Capture Quality evolution.
- Current implementation surface: `autonomous-evolution` Draft PR.
- Visual pass: `phase-aperture-v3`.
- Current increment: **Dual-Star Pylon Weave — Readability Closure**.

## Goal / intended player outcome

Make SIRIUS read immediately as a purpose-built interstellar relay instead of a blue-white binary system surrounded by decorative rings. High quality and temporary Photo/Capture Boost turn the existing 16 phase nodes into a visible two-depth **engineered pylon cage** around the relay aperture. The pylons must read as actual artificial scale markers at phone portrait size, not as sparse sub-pixel light flecks, while the existing relay remains the only transform/spin authority.

## Scope

- Reuse the existing SIRIUS outer relay torus at `(0, -4, -82)`, radius `17.5`, as the sole transform authority.
- Retain the existing upper/lower transmission arcs and tilted inner iris at explicit near/mid/far depths `-3.2 / 0.8 / 3.0`.
- Reuse exactly the existing 16 low-poly octahedral instances and the existing two elliptical near/far rails; do not add another object or draw call.
- Preserve the pylon major-scale range at **3.0–5.2** and the approximately **10.8 local-unit** near/far depth span.
- Readability closure: enlarge the same zero-subdivision octahedron base radius from `0.22` to **`0.34`**, strengthen transverse scales to **0.74–1.15**, and use higher-contrast cyan/white instance colours. This changes silhouette only; topology, instance count and renderer cost are unchanged.
- Keep all transparent materials `forceSinglePass=true`.
- Keep the extension restricted to safe final SIRIUS exploration and `qualityMode === 'high'`, including the existing transient Photo Preview / Photo Capture Boost path.
- Standard/Low continue to own zero SIRIUS phase-aperture extension objects.
- Dispose all owned geometry/materials on downgrade or departure and rebuild on High re-entry/revisit without accumulation.
- Keep live diagnostics for the v3 architecture, pylon scale range, depth span and base radius so the approved bounded treatment is auditable.

## Performance budget

The readability closure intentionally adds **zero GPU geometry or draw-call cost** over the prior v3 implementation:

- extension objects: **4**
- phase pylons: **16 instanced nodes in one draw**
- pylon base radius: **0.34**, zero-subdivision octahedron
- measured extension triangles: **4,064**
- extension draw calls: **4**
- pylon major-scale budget: **≤5.2**
- pylon depth budget: **≤10.8 local units**
- shared SIRIUS High layer remains **4 objects / 12,992 triangles / 4 draws**
- combined shared + phase-aperture High delta remains **8 draw calls** over Standard

No second renderer, camera, timer, `requestAnimationFrame`, network request, persistence store, backend or dependency is introduced.

## Acceptance Criteria

1. Standard/Low SIRIUS exploration has zero phase-aperture extension objects and zero pylon scale diagnostics.
2. High/Photo state reports `visualPass === 'phase-aperture-v3'` and `architecture === 'dual-star-pylon-weave-v3'`.
3. Active v3 state has exactly **4 objects / 16 instances / 4,064 triangles / 4 draws** and all live extension materials are single-pass.
4. Live pylon major-scale range remains exactly **3.0–5.2**, with budget max **5.2**; disposal resets the range to `0 / 0`.
5. The pylon mesh uses the bounded **0.34** base radius and 0.74–1.15 transverse-scale treatment without changing topology or instance count.
6. Upper/lower/iris layers retain explicit near/mid/far positions and the two-rail pylon cage retains >10 and ≤10.8 units of depth separation.
7. Production Chromium at **390×844** and **360×800** shows the individual phase pylons as readable artificial silhouettes around the relay aperture, while preserving the central opening, viewport containment and final `explore` phase.
8. Direct Standard→High Photo Capture includes the v3 architecture and pylon scale/depth contract before PNG extraction, then restores Standard and releases extension resources.
9. High→Low disposal, Low→High rebuild, SIRIUS departure and revisit rebuild all preserve the exact v3 diagnostics without accumulation.
10. Actual renderer diagnostics still measure the combined shared + v3 High delta as exactly **8 calls** and return to the Standard baseline after disposal.
11. Existing route planning, flight phases, continuous arrival timing, camera authority, DPR ceilings, storage, offline behaviour, network/backend paths and dependencies remain unchanged.

## Out of Scope

- New relay-calibration gameplay, scanner or checklist interaction.
- New destination, route authority or travel-time model.
- New camera preset/controller.
- Animated pylon simulation or independent render loop.
- Post-processing/bloom dependency.
- Permanent High quality, global DPR increase or simulation timing changes.

## Validation evidence contract

`scripts/validate-sirius-phase-aperture.mjs` locks the v3 transform, unchanged budget, readable 0.34-radius pylon silhouette treatment, lifecycle and authority boundaries. `scripts/validate-sirius-phase-aperture-browser.mjs` proves the live architecture, pylon scale range, near/mid/far depth, two-rail depth span, actual renderer draw delta, direct capture inclusion/restoration, disposal/rebuild/revisit, and both required phone viewports. Exact-run screenshots remain the visual acceptance evidence for whether the individual pylons are actually readable around the relay.

## Risks / manual checks

The pylon treatment uses the same 16 instanced low-poly nodes and no extra draw calls, so the primary residual risk is additive-blending/brightness variance across mobile GPUs. Physical iPhone Safari long-duration thermal/frame pacing, colour blending and thin-structure readability remain supplementary evidence rather than completion blockers.

## Completion signal

SIRIUS High/photo frames show a clearly engineered dual-depth pylon cage with individually readable artificial pylons around the existing nested phase aperture, at the same renderer/triangle budget; exact-run phone screenshots and live browser diagnostics prove the bounded v3 treatment through capture, downgrade, rebuild and revisit; exact-head repository validation remains green; V4+ travel authority is untouched.
