# Mode Gateway + Frontier Fiction Destinations

## Status

- **Candidate vertical slice on `autonomous-evolution`**
- Product direction is approved by `docs/ROADMAP.md`; each destination remains candidate until merged/released.
- This document records implementation and acceptance boundaries only.

## Goal / intended user outcome

Give Stellar Wrap a useful mobile exploration entrance while expanding Frontier Fiction through a small number of visually distinct original destinations rather than a large low-detail catalogue.

The top-level gateway remains exactly four actions:

- **Continue Journey** — return to current/restored Real Space state without replanning.
- **Real Space** — existing eight-system map and approved V4+ travel.
- **Frontier Fiction** — original science-fiction exploration line.
- **Gallery / Captures** — existing local journey/visited/discovery summary; PNG files remain local downloads.

The compact always-visible strip keeps three established worlds, while a fourth **featured expedition** is presented as a separate full-width destination so 360 px phones do not compress four dense cards into one row:

1. `AURELIA ARC｜曙光環域` — artificial ring habitat / megastructure.
2. `NADIR WELL｜玄淵觀測站` — extreme-object frontier observatory around a fictional black-hole-like gravity well.
3. `VESPER YARD｜暮環採集場` — industrial gas-giant harvesting zone with atmospheric skimmers, refinery ring and cargo traffic.
4. `EIDOLON GATE｜遺光門廊` — featured ancient deep-space gate / ruin expedition with fractured rings, surviving glyph light and relic debris.

## Architecture boundary

Real Space remains authoritative in `index.html`: existing eight-system `N` data, 6.0 LY Dijkstra graph, true-direction turns, flight phases, Hermite arrival, Travel Journal and Star Atlas.

Frontier Fiction does **not** add AURELIA, NADIR, VESPER or EIDOLON to the Real Space `N` / `G` graph. None becomes a Real Space node or changes established shortest paths. Each Frontier destination is a separate static Three.js runtime with one renderer and one camera. `mode-gateway.js` is presentation/navigation only; it creates no persistence key and no second route/discovery authority.

## AURELIA ARC｜曙光環域

Original megastructure habitat: inhabited torus, structural spokes, artificial dawn/night illumination, central energy core, distant warm star, debris field, short approach → arrival → exploration sequence, drag-look/auto-orbit and bounded local PNG capture.

## NADIR WELL｜玄淵觀測站

Original extreme-object destination with black central silhouette, layered accretion structures, cool lensing rings, bounded jets, segmented observation hardware and local high-resolution capture.

## VESPER YARD｜暮環採集場

Original industrial-atmosphere destination around a fictional teal gas giant: luminous storm bands, refinery ring, skimmers, extraction tethers, cargo traffic and dedicated cloud-top arrival composition.

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

## Acceptance Criteria

1. Top-level landing continues to expose exactly four useful mode actions with ≥44 px touch targets.
2. Continue/Real Space preserve the existing Real Space location/route authority.
3. Gallery remains read-only over existing local journey/discovery sources.
4. The three-card compact strip remains AURELIA, NADIR and VESPER; EIDOLON is a separate featured expedition with a ≥44 px touch target.
5. EIDOLON remains outside Real Space routing and exposes its own approach, near-field arrival and free-exploration state.
6. Trusted phone-sized touch can enter EIDOLON and toggle its exploration control.
7. Production Chromium at 390×844 and 360×800 proves viewport containment and bounded EIDOLON renderer work (≤16 draw calls / ≤22,000 triangles).
8. EIDOLON high-resolution capture increases the actual backing buffer, produces non-trivial PNG data and restores the previous DPR with `preserveDrawingBuffer:false`.
9. Existing AURELIA, NADIR, VESPER, V4+ route/flight/Hermite, Cinematic High-tier, Photo Capture Boost, Focus Tray, offline and WebGL-recovery regressions stay green.
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
