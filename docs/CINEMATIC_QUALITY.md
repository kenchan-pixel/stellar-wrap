# Cinematic High-tier Quality｜高畫質 3D 景觀層

## Status

- Product direction: approved.
- Current implementation surface: `autonomous-evolution` Draft PR.
- This document describes bounded High-tier destination layers only. It does not change route, camera, flight timing, DPR ceilings, persistence, backend or release baseline.

## Goal

Raise the real 3D visual ceiling so destinations are worth watching, revisiting and recording, while keeping Standard／Low／Auto free from the extra sustained GPU cost.

The current destination slices now cover all eight existing systems:

1. **SOL｜地球近軌** — Earth atmosphere / cloud / Moon / aurora depth.
2. **LUNA｜月環基地** — primary lunar surface / distant Earth / orbital-ring depth.
3. **VEGA｜織女星門** — blue-white primary / ice world / warp-gate depth.
4. **CYG｜天鵝航標** — blue-violet binary / resonant-beacon near-far depth cage.
5. **ORION｜獵戶前哨** — red-supergiant / rocky-outpost / nebula depth.
6. **TAU｜金牛塵海** — ringed gas giant depth.
7. **SIRIUS｜天狼中繼站** — blue-white primary / ice body / relay-ring depth.
8. **PROX｜比鄰星港** — lava fissure / hot atmosphere / red-dwarf / starport depth, plus a focused High-only traffic-lattice extension around the existing rotating starport.

## Runtime contract

The cinematic layers reuse the existing Three.js `0.185.1`, renderer, camera, scene and `WarpSim.setQuality()` authority.

Extra objects are created only when all are true:

- current destination is a supported cinematic target;
- final destination exploration is active;
- flight is not active;
- WebGL context is healthy;
- selected quality is `high`.

When any condition stops being true, the modules remove and dispose their owned geometry, materials and procedural textures. Returning to High or revisiting a supported destination rebuilds them from the current core scene.

There is no second renderer, requestAnimationFrame loop, storage key, network request, analytics path or external visual asset. CYG uses its dedicated cinematic module; ORION, SIRIUS and PROX may use focused destination extensions loaded after the shared cinematic layer. Each follows the same safe-state authority and bounded lifecycle contract outside the renderer loop.

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

## VEGA budget

High adds four owned objects to the existing blue-white star / ice world / double warp-gate scene:

- higher-frequency blue-white granulation attached to the existing primary star;
- additive stellar halo around that primary without creating another star authority;
- crystalline frost / fracture detail attached to the existing ice-world surface;
- segmented luminous energy track attached to the existing outer 24-unit warp-gate torus, inheriting its core counter-rotation rather than adding another animation authority.

Budget:

- additional draw calls: **4**
- additional triangles: **12,992**

The 12,992 figure is the actual indexed `BufferGeometry` triangle count of the four High-only VEGA meshes (4,992 + 2,976 + 2,976 + 2,048). Runtime evidence measures geometry index／position counts and must match the declared budget. Below High, owned VEGA objects return to zero.

## CYG budget

CYG uses a dedicated High-only module attached to the existing moving blue-violet binary / outer beacon scene. The current v2 owns six objects:

- higher-frequency blue-white granulation attached to the existing primary star, following the core binary motion;
- violet granulation attached to the existing companion star;
- a bounded additive blue-violet asymmetric halo attached to the existing primary;
- a segmented luminous energy track attached to the existing outer 19-unit beacon torus;
- **18 instanced near/far resonance pylons** attached to that same outer torus;
- one **42-segment LineSegments depth cage** joining the near/far beacon layers.

Budget:

- additional draw calls: **6**
- measured mesh triangles: **13,208**
- instanced pylons: **18**
- depth-cage line segments: **42**
- live pylon near/far span: **>7.5 and ≤8.2 local units**

The mesh triangle count is 12,992 from the retained four v1 meshes plus 216 triangles from the single 18-instance box-pylon mesh. The LineSegments cage adds one draw but no mesh triangles. Production-browser acceptance measures the actual renderer `DRAW` delta instead of trusting only the profile constant, and direct Standard → High Photo Capture must include the v2 before PNG extraction. Below High, owned CYG objects return to zero. Exact slice details live in `docs/CYG_RESONANT_BEACON.md`.

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

## PROX shared budget

The shared High layer adds four owned objects to the existing red-dwarf / lava-planet / starport composition:

- higher-frequency incandescent fissure detail attached to the existing lava-planet surface;
- additive orange-red atmospheric / heat limb around the lava planet;
- a bounded red-dwarf halo that strengthens the distant light source without adding another star;
- segmented luminous starport track attached to the existing orbital torus, inheriting the core starport rotation instead of adding another animation authority.

Shared budget:

- additional draw calls: **4**
- additional triangles: **12,992**

The 12,992 figure is the actual indexed `BufferGeometry` triangle count of the four High-only PROX shared meshes (4,992 + 2,976 + 2,976 + 2,048).

### PROX Starport Transit Lattice extension

A focused High-only extension makes the starport read as an active industrial orbital structure:

- two partial-torus traffic lanes attach to the existing 20-unit outer starport torus and inherit its core rotation;
- **36** bounded cyan/amber approach beacons create layered traffic depth without another animation loop;
- direct Photo Capture is synchronized from the existing backing-canvas quality change so Standard → High capture includes the lattice before PNG extraction.

Extension budget:

- additional draw calls: **3**
- additional mesh triangles: **2,304**
- additional points: **36**

Therefore the PROX destination-specific High enhancement above the untouched core scene is bounded to **7 draw calls** and **15,296 mesh triangles** across the shared cinematic layer plus this extension. Standard／Low own zero objects from both layers after disposal. Exact extension acceptance is recorded in `docs/PROX_STARPORT_TRANSIT_LATTICE.md`.

## Capture handoff

Destination Photo Mode already performs a temporary switch to the existing High renderer tier before exporting a PNG. The cinematic modules listen to that same quality authority, so a high-quality capture at any of the eight existing destinations receives its destination-specific 3D layers automatically. Focused extensions that depend on the High backing-canvas transition also observe that existing canvas size change; after capture restores the previous quality tier, their extra objects are disposed.

## Acceptance

Automated source validation must prove:

- exact pinned Three.js reuse;
- High-only safe-exploration gating;
- bounded object / triangle / point budgets;
- runtime triangle evidence derives from actual `BufferGeometry` rather than echoing the declared budget;
- no extra render loop, storage or network authority;
- explicit disposal of owned textures, materials and geometries;
- offline-shell inclusion.

Real Chromium at **390×844** and **360×800** must prove the shared seven-destination layer and the dedicated CYG layer independently:

1. Standard has zero extra cinematic objects for the tested destination layer.
2. High object and measured geometry counts match that destination's documented budget.
3. Standard and High evidence screenshots are not identical.
4. High → Low disposes all owned objects.
5. Low → High rebuilds the layer.
6. Destination → another system → destination rebuilds successfully without accumulation.
7. CSS viewport remains unchanged and phase remains final exploration.
8. Focused destination extensions additionally prove real renderer draw delta, direct Photo Capture inclusion/restoration and any documented live depth budget.

Focused extensions add their own exact renderer-delta, direct-capture and lifecycle gates where applicable; profile constants alone are not accepted as renderer-cost evidence.

## Performance boundary

These slices intentionally improve actual scene content instead of raising global DPR. Long-duration physical-device thermal behaviour and sustained frame pacing remain useful supplementary evidence, but lack of manual testing does not block unrelated autonomous evolution when bounded real-browser evidence is green.
