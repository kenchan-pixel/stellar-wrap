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

Below those four actions, a compact Frontier destination strip now exposes two original worlds:

1. `AURELIA ARC｜曙光環域` — artificial ring habitat / megastructure.
2. `NADIR WELL｜玄淵觀測站` — extreme-object frontier observatory around a fictional black-hole-like gravity well.

## Architecture boundary

Real Space remains authoritative in `index.html`: existing eight-system `N` data, 6.0 LY Dijkstra graph, true-direction turns, flight phases, Hermite arrival, Travel Journal and Star Atlas.

Frontier Fiction does **not** add AURELIA to the Real Space `N` / `G` graph. NADIR follows the same boundary: neither Frontier destination becomes a Real Space node or changes established shortest paths. Each Frontier destination is a separate static Three.js runtime with one renderer and one camera. `mode-gateway.js` is presentation/navigation only; it creates no persistence key and no second route/discovery authority.

## AURELIA ARC｜曙光環域

Original megastructure habitat: inhabited torus, structural spokes, artificial dawn/night illumination, central energy core, distant warm star, debris field, short approach → arrival → exploration sequence, drag-look/auto-orbit and bounded local PNG capture.

## NADIR WELL｜玄淵觀測站

Original extreme-object destination built from a broad science-fiction archetype without reproducing a named franchise or real observatory.

Visual identity:

- black central event-horizon silhouette;
- layered amber/gold accretion structures;
- three cool gravitational-lensing rings;
- bounded bipolar jets;
- offset segmented observation ring and pods;
- sparse foreground debris and deep star field;
- dedicated approach → arrival → free-exploration composition;
- local high-resolution capture.

NADIR intentionally contrasts AURELIA: AURELIA is a luminous inhabited megastructure; NADIR is a dark extreme-object observation frontier.

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
4. Frontier destination strip exposes exactly AURELIA and NADIR without inserting either into Real Space routing.
5. NADIR has a visibly distinct approach, arrival and free-exploration scene.
6. Trusted phone-sized touch can enter NADIR and toggle its exploration control.
7. Production Chromium at 390×844 and 360×800 proves viewport containment and bounded NADIR renderer work (≤16 draw calls / ≤22,000 triangles).
8. NADIR high-resolution capture increases the actual backing buffer, produces non-trivial PNG data and restores the previous DPR with `preserveDrawingBuffer:false`.
9. Existing AURELIA, V4+ route/flight/Hermite, Cinematic High-tier, Photo Capture Boost, Focus Tray, offline and WebGL-recovery regressions stay green.
10. Both Frontier pages remain in the existing v15 offline shell contract.

## Out of Scope

- Adding Frontier destinations to the Real Space Dijkstra graph.
- A general Frontier route planner or persistence system.
- More than these two Frontier worlds in this slice.
- Combat, economy, quests, accounts, cloud save/upload or analytics.
- Copying famous science-fiction locations, branding or recognizable protected assets.
- Forced 4K, post-processing framework or permanent maximum DPR.

## Supplementary device evidence

Physical iPhone Safari touch feel, sustained frame pacing/thermal load, cross-GPU transparent blending and PNG save-sheet behavior remain useful supplementary evidence; they do not block unrelated autonomous evolution when exact production-browser and repository regression gates are green.
