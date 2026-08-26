# Contributing

## Branches

Use a focused branch per task:

```text
feat/<short-goal>
fix/<short-problem>
refactor/<bounded-area>
docs/<topic>
```

Do not develop directly on `main`.

## Before changing code

1. Read `docs/PRD.md` and `docs/DECISIONS.md`.
2. Identify which flight phase, star-system data or UI layer is affected.
3. Compare the expected behaviour with `releases/v4.0-stable.html`.
4. Define acceptance criteria, including manual mobile checks where necessary.

## Coding principles

- Keep time-based animation independent of frame rate.
- Reuse geometry, textures and materials where practical.
- Avoid per-frame object allocation in the render loop.
- Do not silently change coordinates, route limits or timing constants.
- Keep DOM overlays small and outside the primary focal area.
- Respect `prefers-reduced-motion` and touch interaction.
- Use fixed dependency versions.
- Avoid new build tools unless they solve a verified maintenance problem.

## Verification

```bash
npm run check
```

For a local preview:

```bash
npm run serve
```

Then complete the relevant checklist in `docs/TESTING.md`.

## Pull requests

Use the repository PR template. Include screenshots or a screen recording for visual changes and state the physical device used for performance claims.

The default review action is comment. The owner decides whether to merge, release, publish or change an approved product decision.

## Releases

- Never overwrite an existing release snapshot.
- Copy the accepted runnable entry file to a new versioned file under `releases/`.
- Add the version, size and SHA-256 to `docs/RELEASE_INVENTORY.md`.
- Update `CHANGELOG.md`.
- Run automated validation and complete relevant manual routes.
