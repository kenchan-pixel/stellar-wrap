# SIRIUS Phase Aperture v3｜雙星相位柱籠

## Status

- Product direction: approved Cinematic High-tier / Capture Quality evolution.
- Current implementation surface: `autonomous-evolution` Draft PR.
- Visual pass: `phase-aperture-v3`.
- Current increment: **Dual-Star Pylon Weave**.

## Goal / intended player outcome

Make SIRIUS read immediately as a purpose-built interstellar relay instead of a blue-white binary system surrounded by decorative rings. High quality and temporary Photo/Capture Boost now turn the existing 16 phase nodes into a visible two-depth **engineered pylon cage** around the relay aperture. The pylons provide human-readable scale and foreground/background separation while the existing relay remains the only transform/spin authority.

## Scope

- Reuse the existing SIRIUS outer relay torus at `(0, -4, -82)`, radius `17.5`, as the sole transform authority.
- Retain the existing upper/lower transmission arcs and tilted inner iris at explicit near/mid/far depths `-3.2 / 0.8 / 3.0`.
- Reuse exactly the existing 16 low-poly octahedral instances and the existing two elliptical near/far rails; do not add another object or draw call.
- Convert those small isotropic nodes into anisotropic phase pylons with major scales **3.0–5.2**, stronger near/far orientation separation and brighter cardinal pylons.
- Preserve the existing bounded beacon/pylon depth span of approximately **10.8 local units**.
- Keep all transparent materials `forceSinglePass=true`.
- Keep the extension restricted to safe final SIRIUS exploration and `qualityMode === 'high'`, including the existing transient Photo Preview / Photo Capture Boost path.
- Standard/Low continue to own zero SIRIUS phase-aperture extension objects.
- Dispose all owned geometry/materials on downgrade or departure and rebuild on High re-entry/revisit without accumulation.
- Add live diagnostics for the v3 architecture and pylon scale range so runtime acceptance cannot pass on source text or screenshot difference alone.

## Performance budget

The v3 visual upgrade intentionally adds **zero GPU geometry or draw-call cost** over v2:

- extension objects: **4**
- phase pylons: **16 instanced nodes in one draw**
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
4. Live pylon major-scale range is exactly **3.0–5.2**, with budget max **5.2**; disposal resets the range to `0 / 0`.
5. Upper/lower/iris layers retain explicit near/mid/far positions and the two-rail pylon cage retains >10 and ≤10.8 units of depth separation.
6. Production Chromium at **390×844** and **360×800** shows a visibly different High frame while preserving the central relay aperture, viewport containment and final `explore` phase.
7. Direct Standard→High Photo Capture includes the v3 architecture and pylon scale/depth contract before PNG extraction, then restores Standard and releases extension resources.
8. High→Low disposal, Low→High rebuild, SIRIUS departure and revisit rebuild all preserve the exact v3 diagnostics without accumulation.
9. Actual renderer diagnostics still measure the combined shared + v3 High delta as exactly **8 calls** and return to the Standard baseline after disposal.
10. Existing route planning, flight phases, continuous arrival timing, camera authority, DPR ceilings, storage, offline behaviour, network/backend paths and dependencies remain unchanged.

## Out of Scope

- New relay-calibration gameplay, scanner or checklist interaction.
- New destination, route authority or travel-time model.
- New camera preset/controller.
- Animated pylon simulation or independent render loop.
- Post-processing/bloom dependency.
- Permanent High quality, global DPR increase or simulation timing changes.

## Validation evidence contract

`scripts/validate-sirius-phase-aperture.mjs` checks the v3 transform, budget, lifecycle and authority boundaries. `scripts/validate-sirius-phase-aperture-browser.mjs` must prove the live architecture, pylon scale range, near/mid/far depth, two-rail depth span, actual renderer draw delta, direct capture inclusion/restoration, disposal/rebuild/revisit, and both required phone viewports. Screenshot evidence remains a separate visual check for whether the pylon cage is actually readable around the relay.

## Risks / manual checks

The pylon treatment uses the same 16 instanced low-poly nodes and no extra draw calls, so the primary residual risk is subjective additive-blending/readability variance across mobile GPUs. Physical iPhone Safari long-duration thermal/frame pacing, colour blending and thin-structure readability remain supplementary evidence rather than completion blockers.

## Completion signal

SIRIUS High/photo frames show a clearly engineered dual-depth pylon cage around the existing nested phase aperture, with unchanged GPU budget; live browser diagnostics prove the v3 architecture and bounded scale/depth contract through capture, downgrade, rebuild and revisit; exact-head repository validation remains green; V4+ travel authority is untouched.
