# Cinematic High-tier Quality｜高畫質 3D 景觀層

## Status

- Product direction: approved.
- Current implementation surface: `autonomous-evolution` Draft PR.
- This document describes bounded High-tier destination layers only. It does not change route, camera, flight timing, DPR ceilings, persistence, backend or release baseline.

## Goal

Raise the real 3D visual ceiling so destinations are worth watching, revisiting and recording, while keeping Standard／Low／Auto free from the extra sustained GPU cost.

The current destination slices are deliberately curated rather than global:

1. **SOL｜地球近軌** — Earth atmosphere / cloud / Moon / aurora depth.
2. **LUNA｜月環基地** — primary lunar surface / distant Earth / orbital-ring depth.
3. **TAU｜金牛塵海** — ringed gas giant depth.
4. **ORION｜獵戶前哨** — red-supergiant / rocky-outpost / nebula depth.
5. **SIRIUS｜天狼中繼站** — blue-white primary / ice body / relay-ring depth.
6. **PROX｜比鄰星港** — lava fissure / hot atmosphere / red-dwarf / starport depth.

## Runtime contract

The cinematic module reuses the existing Three.js `0.185.1`, renderer, camera, scene and `WarpSim.setQuality()` authority.

Extra objects are created only when all are true:

- current destination is a supported cinematic target;
- final destination exploration is active;
- flight is not active;
- WebGL context is healthy;
- selected quality is `high`.

When any condition stops being true, the module removes and disposes its owned geometry, materials and procedural textures. Returning to High or revisiting a supported destination rebuilds them from the current core scene.

There is no second renderer, requestAnimationFrame loop, storage key, network request, analytics path or external visual asset.

## SOL budget

High adds four owned objects to the existing Earth / Moon scene:

- higher-frequency translucent cloud microstructure attached to the existing rotating cloud layer;
- additive blue atmospheric limb around Earth;
- higher-frequency lunar surface detail attached to the existing Moon surface;
- 72 bounded soft aurora points arranged in two high-latitude ribbons.

Budget:

- additional draw calls: **4**
- additional triangles: **10,944**
- additional aurora points: **72**

The cloud detail inherits the existing cloud mesh rotation because it is attached to that mesh. Aurora, atmosphere and lunar detail add no independent animation loop. Below High, owned SOL objects return to zero.

## LUNA budget

High adds four owned objects to the existing Moon / distant-Earth / orbital-ring scene:

- higher-frequency lunar surface detail on the primary Moon;
- extra cloud microstructure attached to the existing distant-Earth cloud mesh;
- additive atmospheric limb around the distant Earth;
- segmented luminous track attached to the existing orbital torus, inheriting its existing ring rotation rather than adding another animation authority.

Budget:

- additional draw calls: **4**
- additional triangles: **12,992**

The 12,992 figure is measured from the four actual indexed `BufferGeometry` meshes: 4,992 + 2,976 + 2,976 + 2,048 triangles. Below High, owned LUNA objects return to zero.

## TAU budget

High adds four owned objects:

- gas-band / storm surface layer;
- Fresnel atmosphere rim;
- higher-frequency ring structure;
- 96 bounded ring-dust points.

Budget:

- additional draw calls: **4**
- additional triangles: **8,352**
- additional points: **96**

Below High, owned TAU objects return to zero.

## ORION budget

High adds four owned objects:

- procedural granulation layer on the red supergiant;
- additive chromosphere / corona rim;
- higher-frequency rocky-outpost surface detail;
- 84 bounded warm nebula filament points for foreground / background depth.

Budget:

- additional draw calls: **4**
- additional triangles: **10,944**
- additional filament points: **84**

Below High, owned ORION objects return to zero.

## SIRIUS budget

High adds four owned objects:

- procedural blue-white granulation on the primary star;
- additive stellar halo around that primary;
- higher-frequency frost / fracture detail on the existing ice body;
- segmented luminous energy track attached to the existing outer relay torus, inheriting its existing rotation authority rather than adding another animation loop.

Budget:

- additional draw calls: **4**
- additional triangles: **12,992**

The 12,992 figure is the actual indexed `BufferGeometry` triangle count of the four High-only SIRIUS meshes (4,992 + 2,976 + 2,976 + 2,048), not a duplicated diagnostic constant. Runtime evidence measures geometry index／position counts and must match the declared budget.

Below High, owned SIRIUS objects return to zero.

## PROX budget

High adds four owned objects to the existing red-dwarf / lava-planet / starport composition:

- higher-frequency incandescent fissure detail attached to the existing lava-planet surface;
- additive orange-red atmospheric / heat limb around the lava planet;
- a bounded red-dwarf halo that strengthens the distant light source without adding another star;
- segmented luminous starport track attached to the existing orbital torus, inheriting the core starport rotation instead of adding another animation authority.

Budget:

- additional draw calls: **4**
- additional triangles: **12,992**

The 12,992 figure is the actual indexed `BufferGeometry` triangle count of the four High-only PROX meshes (4,992 + 2,976 + 2,976 + 2,048). Below High, owned PROX objects return to zero.

## Capture handoff

Destination Photo Mode already performs a temporary switch to the existing High renderer tier before exporting a PNG. The cinematic module listens to that same quality authority, so a high-quality capture at SOL, LUNA, TAU, ORION, SIRIUS or PROX receives the destination-specific 3D layers automatically. After capture restores the previous quality tier, the extra cinematic objects are disposed.

## Acceptance

Automated source validation must prove:

- exact pinned Three.js reuse;
- High-only safe-exploration gating;
- bounded object / triangle / point budgets;
- runtime triangle evidence derives from actual `BufferGeometry` rather than echoing the declared budget;
- no extra render loop, storage or network authority;
- explicit disposal of owned textures, materials and geometries;
- offline-shell inclusion.

Real Chromium at **390×844** and **360×800** must prove for SOL, LUNA, TAU, ORION, SIRIUS and PROX:

1. Standard has zero extra cinematic objects.
2. High has exactly four extra objects and the measured geometry count matches the documented triangle budget.
3. Standard and High evidence screenshots are not identical.
4. High → Low disposes all extra objects.
5. Low → High rebuilds the layer.
6. Destination → another system → destination rebuilds successfully without accumulation.
7. CSS viewport remains unchanged and phase remains final exploration.

## Performance boundary

These slices intentionally improve actual scene content instead of raising global DPR. Long-duration physical-device thermal behaviour and sustained frame pacing remain useful supplementary evidence, but lack of manual testing does not block unrelated autonomous evolution when bounded real-browser evidence is green.
