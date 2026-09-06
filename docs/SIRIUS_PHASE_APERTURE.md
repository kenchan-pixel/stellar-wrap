# SIRIUS Phase Aperture｜Depth-Convergent Pylon Cage

## Status

- Product direction: approved Cinematic High-tier / Capture Quality evolution.
- Current implementation surface: `autonomous-evolution` Draft PR.
- Base visual pass: `phase-aperture-v3`.
- Base architecture: `dual-star-pylon-weave-v3`.
- Current perspective treatment: **`depth-convergent-pylon-cage-v1`**.

## Goal / intended player outcome

Make SIRIUS High / Photo Capture read as a deep engineered relay throat rather than a set of equally weighted glowing nodes around a flat ring. The existing 16 low-poly phase pylons now form eight opposing depth stations: distant pairs stay tighter and smaller, while nearer pairs spread outward and become taller/wider. On a portrait phone this should create an immediate far→near convergence cue around the central relay opening without adding geometry, draws, particles, post-processing or camera authority.

## Scope

- Reuse the existing SIRIUS outer relay torus at `(0, -4, -82)`, radius `17.5`, as the sole transform authority.
- Retain the existing upper/lower transmission arcs and tilted inner iris at explicit depth positions `-3.2 / 0.8 / 3.0`.
- Reuse exactly the existing 16 zero-subdivision octahedral pylon instances in one `InstancedMesh`; no new object or draw call.
- Author those 16 pylons as **8 opposing depth pairs** distributed across the existing **10.8 local-unit** depth budget (`-5.4 → +5.4`).
- Correlate silhouette with depth: major scale remains **3.0 → 5.2**, transverse width remains **0.74 → 1.15**, and radial spread scales **0.84 → 1.12** from far to near.
- Preserve the bounded `0.34` pylon base radius, existing three aperture meshes, additive single-pass materials and current High / transient Photo Boost gating.
- Standard/Low continue to own zero SIRIUS phase-aperture extension objects.
- Dispose all owned geometry/materials on downgrade or departure and rebuild on High re-entry/revisit without accumulation.
- Expose the convergence treatment and live radial-scale range through the existing diagnostic snapshot.

## Performance budget

The perspective change only rewrites the matrices of the already-owned 16 instances when the High layer is built:

- extension objects: **4**
- phase pylons: **16 instances / one instanced draw**
- pylon base radius: **0.34**, zero-subdivision octahedron
- measured extension triangles: **4,064**
- extension draw calls: **4**
- pylon major-scale budget: **3.0–5.2**
- pylon depth budget: **10.8 local units**
- pylon radial perspective scale: **0.84→1.12**
- shared SIRIUS High layer remains **4 objects / 12,992 triangles / 4 draws**
- combined shared + phase-aperture High delta remains **8 draw calls** over Standard

No second renderer, camera controller, `requestAnimationFrame`, new network request, persistence store, backend, dependency, DPR increase or flight-timing change is introduced. The existing bounded 4 Hz lifecycle sampler remains unchanged.

## Acceptance Criteria

1. Standard/Low SIRIUS exploration has zero phase-aperture extension objects and zero active pylon scale/convergence diagnostics.
2. High/Photo keeps `visualPass === 'phase-aperture-v3'` and `architecture === 'dual-star-pylon-weave-v3'`, while reporting `perspectiveTreatment === 'depth-convergent-pylon-cage-v1'`.
3. Active state remains exactly **4 objects / 16 instances / 4,064 triangles / 4 draws** with all extension materials single-pass.
4. Eight opposing pylon pairs span exactly the existing **10.8-unit** relay depth; far-to-near major scale remains **3.0→5.2** and radial spread remains **0.84→1.12**.
5. The central relay opening stays visually readable; the perspective treatment must not turn the pylon cage into an opaque wall or hide the dual-star relay identity.
6. Production Chromium at **390×844** and **360×800** shows a stronger near/far engineered throat than Standard, with no black frame or horizontal clipping and final phase still `explore`.
7. Direct Standard→High Photo Capture includes the live phase-aperture layer before PNG extraction, then restores Standard and releases extension resources.
8. High→Low disposal, Low→High rebuild, SIRIUS departure and revisit rebuild preserve the same counts, depth/scale budgets and no accumulation.
9. Actual renderer diagnostics keep the combined shared + aperture High delta at exactly **8 calls** and return to Standard after disposal.
10. Existing route planning, flight phases, continuous arrival timing, camera authority, DPR ceilings, storage, offline behaviour, network/backend paths and dependencies remain unchanged.

## Out of Scope

- New relay-calibration gameplay, scanner or checklist interaction.
- New destination, route authority or travel-time model.
- New camera preset/controller.
- Animated pylon simulation or independent render loop.
- Post-processing/bloom dependency.
- Permanent High quality, global DPR increase or simulation timing changes.

## Validation evidence contract

`scripts/validate-sirius-phase-aperture.mjs` locks the unchanged renderer/geometry budget, eight-pair depth-station construction, monotonic far→near scale/radial convergence, lifecycle and authority boundaries. The existing production `scripts/validate-sirius-phase-aperture-browser.mjs` continues to prove live 390×844 / 360×800 WebGL, exact draw restoration, full 10.8-unit depth span, 3.0–5.2 pylon major scale, direct Photo Capture, downgrade/rebuild/departure/revisit and exact-run Standard/High screenshots. Screenshot inspection is the visual acceptance evidence for the stronger relay-throat read.

## Risks / manual checks

The change adds no geometry or draw calls, so the main residual risks are composition/readability and additive-blending variance across mobile GPUs rather than new sustained GPU load. Physical iPhone Safari long-duration thermal/frame pacing, colour blending and thin-structure readability remain supplementary evidence, not completion blockers.

## Completion signal

SIRIUS High / Photo frames show a clearly depth-convergent artificial relay cage around the existing aperture, with far pylons tighter/smaller and near pylons wider/larger; both phone browser gates, capture, lifecycle cleanup and exact renderer budget remain green; V4+ route/camera/timing authority is untouched.
