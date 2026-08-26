# AGENTS.md｜AI development contract

## Goal

Develop Stellar Warp Explorer into a mobile-first, immersive and smooth interstellar exploration experience. Preserve the approved V4.0 travel experience while extending it through small, verifiable vertical slices.

## Required reading

Before editing code, read in order:

1. `docs/PRD.md`
2. `docs/DECISIONS.md`
3. `docs/FLIGHT_MODEL.md`
4. `docs/STAR_MAP.md`
5. `docs/PERFORMANCE.md`
6. `docs/TESTING.md`
7. `docs/HANDOFF.md`
8. Relevant source and current tests

Do not redefine the project using only the latest issue or conversation. New instructions are incremental unless the owner explicitly changes an approved decision.

## Hard constraints

- Mobile portrait is the primary interface.
- Keep the central travel view unobstructed.
- Preserve actual coordinate-based direction and smooth quaternion turning.
- Preserve distance-related travel time and multi-leg routing.
- Preserve visible warp entry, cruise and exit effects.
- Preserve the continuous arrival profile; no stop-then-jump motion.
- Preserve intermediate fly-by followed by a new direction-based turn.
- Preserve all eight distinct astronomical destinations and realistic Earth treatment.
- Preserve dynamic audio, destination exploration, holographic map and adaptive quality.
- Prioritise frame pacing over particle density or DPR.
- Do not edit `archive/` or an existing file under `releases/`.
- Do not add secrets, analytics, accounts, backend services or trackers without an approved product decision.

## Work method

- One task = one branch／worktree／pull request.
- Do not merge; the owner merges.
- Separate behavioural changes from structural refactors.
- Prefer the smallest maintainable change that produces a user-visible result.
- Do not add speculative enterprise architecture.
- Update docs when behaviour, data contracts, routes, performance budgets or approved decisions change.
- Add tests before or with changes to route planning, coordinate conversion, timing or arrival curves.

## Verification

Always run:

```bash
npm run check
```

For visual or flight changes, manually test at least:

- one short direct route
- one long multi-leg route
- one route with a large direction change
- mobile portrait controls
- warp entry and exit
- continuous arrival
- destination exploration
- adaptive quality／diagnostics

Do not claim stable 60 fps without measurements from the target physical device.

## Output required in every handoff

- Goal completed
- Source-of-truth documents read
- User-visible behaviour changed
- Files changed
- Automated checks and exact results
- Manual routes／devices tested
- Regression and security risks
- Items needing owner visual or product confirmation
- Suggested next step only when it follows from evidence
