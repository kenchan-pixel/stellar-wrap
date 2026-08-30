# Mode Gateway + Frontier Fiction Destinations

## Status

- **Candidate vertical slice on `autonomous-evolution`**
- Product direction is approved by `docs/ROADMAP.md`; each destination and mode enhancement remains candidate until merged/released.
- This document records implementation and acceptance boundaries only.

## Goal / intended user outcome

Give Stellar Wrap a useful mobile exploration entrance while expanding Frontier Fiction through a small number of visually distinct original destinations, and make Gallery / Captures a useful record surface rather than a decorative summary.

The top-level gateway remains exactly four actions:

- **Continue Journey** — return to current/restored Real Space state without replanning.
- **Real Space** — existing eight-system map and approved V4+ travel.
- **Frontier Fiction** — original science-fiction exploration line.
- **Gallery / Captures** — read-only Journey Gallery, discovery archive and current-dock Photo Mode handoff using existing local authorities.

The compact always-visible Frontier strip keeps three established worlds, while a fourth **featured expedition** is presented as a separate full-width destination so 360 px phones do not compress four dense cards into one row:

1. `AURELIA ARC｜曙光環域` — artificial ring habitat / megastructure.
2. `NADIR WELL｜玄淵觀測站` — extreme-object frontier observatory around a fictional black-hole-like gravity well.
3. `VESPER YARD｜暮環採集場` — industrial gas-giant harvesting zone with atmospheric skimmers, refinery ring and cargo traffic.
4. `EIDOLON GATE｜遺光門廊` — featured ancient deep-space gate / ruin expedition with fractured rings, surviving glyph light and relic debris.

## Architecture boundary

Real Space remains authoritative in `index.html`: existing eight-system `N` data, 6.0 LY Dijkstra graph, true-direction turns, flight phases, Hermite arrival, Travel Journal and Star Atlas.

Frontier Fiction does **not** add AURELIA, NADIR, VESPER or EIDOLON to the Real Space `N` / `G` graph. None becomes a Real Space node or changes established shortest paths. Each Frontier destination is a separate static Three.js runtime with one renderer and one camera. `mode-gateway.js` is presentation/navigation only; it creates no persistence key and no second route/discovery authority.

## Gallery / Captures｜Journey Gallery + Capture Handoff

### Goal

Turn the fourth gateway action into a genuinely useful record surface: players can review where they travelled, what they discovered and how far they have travelled, then jump directly into the existing Photo Mode when currently docked in a safe Real Space exploration state.

### Scope

- Read completed journeys only through `WarpTravelJournal.entries()` and `visited()`.
- Read discoveries and their existing metadata only through `WarpStarAtlas.snapshot()`.
- Show four compact summary metrics: completed journeys, Real Space systems visited, external discoveries and cumulative recorded LY.
- Show at most the five most recent completed journeys with destination, route, date/time, recorded distance, active flight time and current discovery outcome.
- Show the existing seven external-system discovery records as collected / pending cards; do not duplicate their persistence.
- Offer `拍攝目前停泊點` only when the live Real Space state is final exploration, not flying, and not in WebGL context loss; this action delegates to the existing `WarpPhotoMode.enter()` authority.
- Keep downloaded PNG files device-local. The browser cannot silently re-read previously downloaded PNGs, so this slice deliberately does not invent a fake image library or new file/storage permission.
- Keep all four top-level mode actions and all four Frontier destinations unchanged.

### Acceptance Criteria

1. Gallery remains read-only over existing Travel Journal / Star Atlas data and introduces no new storage, network, account or backend authority.
2. A populated Gallery renders recent journey cards, exactly seven external discovery cards, cumulative LY and discovery outcomes without horizontal overflow at 390×844 or 360×800.
3. Recent journey rendering is bounded to five records even though the underlying journal may retain up to twelve.
4. Close and capture controls retain at least 44 px mobile touch height.
5. Current-dock capture is disabled outside safe final exploration.
6. In a safe final-exploration state, trusted phone touch on the Gallery capture action hands off to the existing Photo Mode and closes the gateway.
7. The Gallery does not claim downloaded PNG files are stored inside the app; PNG save/download remains the existing device-local behavior.
8. Continue Journey, Real Space, Frontier Fiction, AURELIA/NADIR/VESPER/EIDOLON, V4+ route/flight/Hermite behavior, Cinematic High-tier, Photo Capture Boost, Focus Tray, offline and WebGL recovery remain unchanged.

### Out of Scope

- New image persistence, browser file-system permissions, cloud upload or a thumbnail database.
- Editing, tagging or deleting downloaded PNG files.
- A second journey/discovery store.
- Frontier route history or Frontier progression persistence.

## AURELIA ARC｜曙光環域

Original megastructure habitat: inhabited torus, structural spokes, artificial dawn/night illumination, central energy core, distant warm star, debris field, short approach → arrival → exploration sequence, drag-look/auto-orbit and bounded local PNG capture.

## NADIR WELL｜玄淵觀測站

Original extreme-object destination with black central silhouette, layered accretion structures, cool lensing rings, bounded jets, segmented observation hardware and local high-resolution capture.

## VESPER YARD｜暮環採集場

Original industrial-atmosphere destination around a fictional teal gas giant: luminous storm bands, refinery ring, skimmers, extraction tethers, cargo traffic and dedicated cloud-top arrival composition.

During final exploration, VESPER now provides three session-only **Industrial Capture Vistas** that reuse the existing scene and camera transform rather than adding render cost:

- `雲頂主環` — the gas-giant cloud top, refinery ring and cargo field share one readable establishing frame.
- `撈取切線` — a tilted limb view places the extraction tethers and skimmers across the luminous atmosphere.
- `貨運夜弧` — an oblique night-side cargo composition uses the warm refinery arc against the teal cloud layers.

Selecting a vista pauses auto-orbit and applies a bounded yaw / pitch / roll composition. A stationary canvas touch keeps the selected vista; only a deliberate drag beyond the existing 10 px interaction tolerance returns to free-look. High-quality capture preserves the selected composition while using the existing temporary DPR boost and restores the normal DPR afterward. The guide is session-only and adds no renderer, Three.js object, storage, network or route authority.

## EIDOLON GATE｜遺光門廊

Original ancient deep-space gate / ruin destination. It completes the fourth preferred Frontier archetype without copying a named franchise or recognizable protected location.

Visual identity:

- two offset weathered gate rings plus a thin surviving amber glyph circuit;
- intentionally damaged / collapsed pylon sectors rather than a pristine portal;
- dark central veil and subtle violet lensing glow to imply unknown function without reproducing a known IP gate;
- 54 bounded glyph lights, sparse relic shards and one distant surviving beacon;
- dedicated ruin approach → near-field arrival → free-exploration composition;
- drag-look / optional auto-orbit and local high-resolution capture.

EIDOLON is presented as a featured expedition below the three compact destination cards. This keeps the mode entrance readable at 360 px while still making the new world directly discoverable from the landing experience.

## Performance contract

For each Frontier runtime:

- one renderer / one main scene / one camera;
- Three.js pinned to `0.185.1`;
- `preserveDrawingBuffer:false`;
- normal mobile DPR ≤ `1.25`; temporary capture DPR ≤ `1.60`;
- no shadow maps, backend, analytics, account, network polling or new persistent store;
- page visibility prevents effective frame updates;
- capture explicitly raises backing resolution, waits rendered frames, renders immediately, exports PNG, then restores normal DPR;
- production Chromium acceptance measures actual draw calls/triangles at 390×844 and 360×800.

The Mode Gateway / Journey Gallery is DOM-only presentation. It adds no render loop and no polling; records are rebuilt only when the gateway opens or existing journey/discovery/atlas events fire.

## Overall Acceptance Criteria

1. Top-level landing continues to expose exactly four useful mode actions with ≥44 px touch targets.
2. Continue/Real Space preserve the existing Real Space location/route authority.
3. Gallery provides Journey Gallery + discovery archive + current-dock Capture Handoff without creating a second persistence authority.
4. The three-card compact strip remains AURELIA, NADIR and VESPER; EIDOLON is a separate featured expedition with a ≥44 px touch target.
5. All four Frontier worlds remain outside Real Space routing and retain their standalone approach / arrival / exploration behavior.
6. Production Chromium at 390×844 and 360×800 proves viewport containment and trusted-touch interaction for affected gateway/gallery paths.
7. Existing Frontier capture flows remain bounded, temporarily increase backing resolution and restore prior DPR with `preserveDrawingBuffer:false`.
8. VESPER exposes exactly three ≥44 px Industrial Capture Vista actions; trusted touch can select each, stationary touch preserves it, deliberate drag returns to free-look, and capture keeps the selected composition without increasing scene geometry.
9. V4+ route/flight/Hermite, Cinematic High-tier, Photo Capture Boost, Focus Tray, offline and WebGL-recovery regressions stay green.
10. All four Frontier pages remain in the existing v15 offline shell contract.

## Out of Scope

- Adding Frontier destinations to the Real Space Dijkstra graph.
- A general Frontier route planner or persistence system.
- More than these four Frontier worlds in this slice.
- Combat, economy, quests, accounts, cloud save/upload or analytics.
- Copying famous science-fiction locations, branding or recognizable protected assets.
- Forced 4K, post-processing framework or permanent maximum DPR.

## Supplementary device evidence

Physical iPhone Safari touch feel, sustained frame pacing/thermal load, cross-GPU transparent blending and PNG save-sheet behavior remain useful supplementary evidence; they do not block unrelated autonomous evolution when exact production-browser and repository regression gates are green.
