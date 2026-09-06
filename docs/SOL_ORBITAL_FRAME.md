# SOL Orbital Observation Frame v4｜近地軌道夜側觀測構圖

## Status

- Product direction: approved Phase A Cinematic / Capture Quality.
- Current implementation surface: `autonomous-evolution` Draft PR.
- This slice deepens the existing SOL final-exploration / Photo Capture composition only. It does not change route, camera, flight timing, global DPR ceilings, persistence, backend or release authority.

## Goal / intended player outcome

Make SOL feel like a watchable orbital vista rather than a bright globe with foreground rails. High quality and Photo Capture should now read as one coherent depth stack:

**paired near/far observation lattice → terminator-aware city-lit Earth + atmosphere / aurora → distant Moon**.

The accepted v2 perspective hierarchy and v3 eight-bay lattice remain intact. v4 adds one bounded Earth-local night layer so populated regions glow only on the dark side of the globe and naturally disappear across the day/night terminator. This gives the flagship home-system capture a stronger sense of scale, rotation and inhabited-world identity without increasing global DPR or adding a render loop.

## Scope

The focused SOL layer attaches only to existing core scene authority and owns exactly four High-only render objects:

1. **16 instanced observation masts** remain one draw and eight paired near/far bays. Each pair shares one orbital angle and preserves the accepted **1.46 : 0.72** height-scale hierarchy.
2. **20 instanced navigation lights** remain one draw, arranged as ten aligned near/far marker pairs.
3. One **30-segment LineSegments lattice** remains one draw, preserving the connected near/far rails, rungs and diagonal truss.
4. One **Earth night-side city layer** is a `SphereGeometry(48, 32)` attached to the existing rotating Earth surface. A deterministic **512×256** procedural light atlas provides warm/cool city clusters. A small shader compares the live Earth world normal to the existing SOL star direction and fades light emission across the day/night terminator.

The new diagnostic profile is `earth-night-terminator-v4`. Existing `orbital-observation-frame-v1`, `orbital-perspective-gantry-v2` and `orbital-observation-lattice-v3` markers stay stable.

## Terminator / scene-authority contract

The v4 shader does not invent a second Sun or planet transform.

- Earth position/radius remain the existing `SOL` core anchors.
- The city layer is a child of the existing rotating Earth surface, so geographic light clusters inherit the same planet rotation.
- Solar direction is derived from the existing SOL star local position `[-78, 38, -220]`, transformed through the current system root at the existing bounded 4 Hz sync.
- The shader receives only the normalized live SOL star direction and uses it to fade city emission on the illuminated hemisphere.
- While v4 is active, the existing core Earth material's unmasked `emissiveIntensity` is saved exactly and temporarily set to `0`, so the legacy all-hemisphere `EARTH.lights` path cannot leak city light onto the day side.
- High → Low/Standard, Photo Capture restore, departure, recapture and teardown restore the exact saved core emissive intensity before the focused layer is discarded.
- No requestAnimationFrame, extra camera, extra renderer, shadow pass, external texture or network request is introduced.

This keeps the effect coherent when the existing exploration system slowly orbits the scene while preserving the Standard/Low baseline exactly outside the v4 lifetime.

## Performance budget

Focused v4 extension:

- owned render objects: **4**
- additional draw calls: **4**
- measured mesh triangles: **3,328**
  - observation masts: 16 × 12 = 192 triangles
  - navigation lights: 20 × 8 = 160 triangles
  - Earth night layer: **2,976** triangles
  - LineSegments lattice: no mesh triangles
- procedural city-light texture: **512×256**, created only while High is active
- observation bays: **8**
- observation masts: **16**
- navigation lights: **20**
- brace line segments: **30**
- live foreground near/far depth span: **>6.0 and ≤6.8 local units**
- near/far mast height-scale ratio: **>2.0×** (`1.46 / 0.72 ≈ 2.03`)

Together with the unchanged shared SOL cinematic layer, the accepted final-exploration delta is **+8 draw calls** above Standard. Standard／Low own zero objects from this focused layer. The city texture, shader material and geometry are explicitly disposed on downgrade/departure; suppressing the existing base emission adds no draw call, geometry, texture or per-frame renderer work.

The improvement is therefore bounded geometry/detail, not a permanent DPR increase or unbounded GPU effect.

## Lifecycle / capture contract

The focused layer may exist only when all are true:

- `current === 'SOL'`;
- final exploration is active;
- no flight is active;
- WebGL context is healthy;
- quality is `high`.

High → Low/Standard, departure, or teardown removes all four owned objects and disposes owned geometry, materials and the procedural city texture. The temporary suppression of the core Earth emissive path is restored first. Returning to High or revisiting SOL rebuilds from current Earth/Moon anchors without accumulation.

Destination Photo Mode remains the sole capture authority. A direct Standard → Photo Capture quality boost must create both the existing observation lattice and the v4 night-side Earth layer before PNG extraction, suppress the unmasked core emission for that High capture window, then restore the prior tier and exact prior core emissive intensity after capture.

## Acceptance Criteria

- SOL Standard owns **0** focused objects, has no night layer, keeps the original core Earth city emissive intensity, and clears all v2/v3/v4 live diagnostics.
- SOL High reports `earth-night-terminator-v4`, exactly **4 objects / 4 draw calls / 3,328 measured triangles**, including exactly **2,976** night-layer triangles and one **512×256** light atlas.
- While v4 is active, the existing unmasked core Earth emissive contribution is actually suppressed to zero and the exact previous value is retained for restoration.
- A production-browser semantic check uses the live procedural atlas and v4 mask to prove **night visibility > terminator visibility > day visibility**, with day-side city visibility equal to zero.
- The live SOL sun-direction diagnostic is normalized and follows the current system-root orientation.
- The accepted eight-bay composition remains **16 masts / 20 lights / 30 brace segments**, with mast scale ratio >2.0× and ≤2.1× and depth span >6.0 and ≤6.8.
- Real renderer diagnostics prove **+8 draw calls** from Standard to combined shared SOL High + focused v4.
- Direct Standard → High Photo Capture includes the v4 night layer before PNG extraction, uses the larger existing High backing buffer, then restores Standard, restores the exact base Earth emissive intensity, and disposes the layer.
- High → Low, Low → High, SOL → LUNA and LUNA → SOL all prove suppression/restoration plus disposal/rebuild with no object accumulation.
- Production Chromium at **390×844** and **360×800** remains viewport-contained and emits distinct Standard / High screenshots.
- Exact-run screenshots are visually inspected for visible Earth, a readable night/day boundary and city-light contrast, coherent lattice depth, no black frame and no horizontal clipping.
- Existing V4+ travel, arrival, Frontier, Gallery, offline and security contracts remain green.

## Out of Scope

- No new SOL scanner, checklist or discovery mechanic.
- No change to Earth/Moon core positions, star-map topology, LY authority, arrival timing or exploration camera.
- No global DPR increase, post-processing dependency, shadow system, external texture or second render loop.
- No attempt at cartographically exact city placement; the procedural clusters are a cinematic approximation aligned to the existing procedural Earth atlas.
- Physical iPhone thermal/frame-pacing inspection remains supplementary evidence rather than an automated completion gate.

## Risks / supplementary checks

The main visual risk is over-bright city emission competing with the atmosphere/aurora or foreground lattice. The night layer therefore appears only on High/Photo, stays one low-cost additive draw, is terminator-masked, and uses a slightly raised Earth-local shell to avoid z-fighting. The base material suppression is scoped strictly to the v4 active lifetime and is regression-tested for exact restoration.

Primary acceptance evidence is production Chromium at both required phone viewports plus real renderer diagnostics, direct-capture lifecycle checks and the semantic day/night visibility check. iPhone Safari blending, sustained thermals and subjective touch feel remain supplementary.

## Completion Signal

SOL High/Photo visibly reads as an inhabited Earth viewed from a coherent eight-bay orbital structure: the accepted v2/v3 depth frame remains intact, the legacy unmasked city-light path is disabled only while v4 owns the High/Photo city layer, city lights stay on the night hemisphere through a live SOL terminator, the focused budget remains bounded to **4 draws / 3,328 triangles**, exact-head CI and both phone viewport checks pass, screenshots show no clipping/black-frame regression, and exact-head PR review has no actionable P0/P1/P2.