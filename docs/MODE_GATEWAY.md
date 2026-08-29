# Mode Gateway + Frontier Fiction First Destination

## Status

- **Candidate vertical slice on `autonomous-evolution`**
- Product direction is already approved by `docs/ROADMAP.md`.
- This document records the implementation boundary and acceptance contract; it does not make the candidate a release baseline.

## Goal / intended user outcome

Give Stellar Wrap a real exploration entrance instead of a single-mode boot path, while shipping the entrance together with one immediately viewable original science-fiction destination.

The first gateway exposes:

- **Continue Journey** — return to the current / restored Real Space state without replanning.
- **Real Space** — enter the existing eight-system map and approved V4+ travel experience.
- **Frontier Fiction** — open the first original fiction destination, `AURELIA ARC｜曙光環域`.
- **Gallery / Captures** — show the existing local journey / visited / discovery summary and the current local-only PNG boundary.

## Architecture boundary

Real Space remains authoritative in `index.html`:

- existing eight-system `N` data;
- existing 6.0 LY Dijkstra graph;
- existing real-direction turn / flight phase / Hermite arrival authority;
- existing Travel Journal and Star Atlas data.

Frontier Fiction does **not** add AURELIA to the Real Space `N` / `G` graph. It is a separate static `frontier.html` runtime with one Three.js renderer and one camera. This avoids creating a second route authority or silently changing established shortest paths.

`mode-gateway.js` is a presentation layer only. It reads existing Travel Journal / Star Atlas summaries, creates no storage key, sends no analytics, and does not copy discovery data into another store.

## AURELIA ARC｜曙光環域

Original science-fiction destination based on the broad archetype of a megastructure habitat, without copying a named franchise location or asset.

Visual identity:

- large inhabited torus with structural spokes;
- artificial dawn / night illumination around the ring;
- central energy core;
- distant warm star, moon and debris field;
- short cinematic approach followed by free-look exploration;
- bounded local high-resolution PNG capture.

The scene is procedural and uses no third-party image or audio asset. Three.js stays pinned to `0.185.1`.

## Performance contract

- Frontier page uses one renderer / one main scene / one camera.
- Normal mobile DPR is capped at `1.25`; capture DPR is capped at `1.60`.
- No shadow maps, backend, analytics, polling network request or account system.
- Visibility change pauses effective frame updates.
- Browser acceptance must measure actual renderer draw calls / triangles instead of trusting only declared constants.
- V4 Real Space simulation timing is untouched.

## Acceptance Criteria

1. Root Real Space runtime presents a mobile-safe mode gateway with four actions and 44 px or larger touch targets.
2. Continue Journey dismisses the gateway without changing route / current location authority.
3. Real Space dismisses the gateway and opens the existing star-map panel.
4. Gallery reads existing local journey / visited / discovery data and clearly states that PNG files remain local downloads.
5. Frontier Fiction opens a distinct standalone AURELIA runtime rather than inserting a ninth node into the Real Space graph.
6. AURELIA performs a visible approach → arrival → exploration sequence and ends in manual drag-look / optional auto-orbit exploration.
7. AURELIA has a real megastructure scene with measured, bounded renderer work on 390×844 and 360×800 production Chromium viewports.
8. Frontier capture temporarily increases the real backing buffer, exports PNG data, then restores normal DPR.
9. `npm run check`, immutable V4 regression checks, existing route / flight / Photo Mode / trusted-touch Focus Tray gates all remain green.
10. Mode and Frontier runtime files are included in the existing offline shell without changing the established cache-generation contract.

## Out of Scope

- Adding AURELIA to the Real Space Dijkstra network.
- Multiple Frontier Fiction destinations in this slice.
- Fiction economy, combat, quests, accounts, cloud save or analytics.
- Cloud image gallery / upload.
- Copying famous science-fiction IP locations, branding or recognizable protected assets.
- Claiming physical-device sustained 60 fps or thermal acceptance without device measurements.

## Supplementary device evidence

Physical iPhone Safari touch feel, long-session thermal load, sustained frame pacing, and PNG save-sheet behavior remain useful supplementary checks. They are not the completion gate for this candidate when the exact production browser path and existing V4 regression suite are green.