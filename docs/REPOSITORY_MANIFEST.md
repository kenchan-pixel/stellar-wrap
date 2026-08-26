# Repository preparation manifest

## Prepared state

- Prepared: 2026-08-25 HKT
- Target owner: `kenchan-pixel`
- Target repository: `stellar-wrap`
- Default branch: `main`
- Recommended visibility: Private
- Current product baseline: V4.0 Stable
- Remote status at preparation time: local Git repository complete; remote GitHub creation／push still requires a GitHub write-capable session

## Initial commit history

| Commit | Purpose |
|---|---|
| `9285b7f` | Preserve V1–V3.2 evolution and V4.0 runnable stable baseline |
| `305a93b` | Add PRD, architecture, flight model, star map, performance, decisions, roadmap and handoff |
| `e0ac8da` | Add automated validation, GitHub workflow, security and collaboration guardrails |
| `505dbe3` | Add GitHub publishing, deployment and immutable archive／release guidance |

This manifest is added in a subsequent documentation commit. Use `git log --oneline --decorate --graph --all` as the authoritative history after import.

## Stable application identity

- Active entry: `index.html`
- Immutable snapshot: `releases/v4.0-stable.html`
- Size: 75,193 bytes each
- SHA-256: `8fe7850e0d3c3d8f782571c429a7e3293b86ef2dc119cbbd86c9852f7c10a6a5`
- Required relationship: both files must remain byte-for-byte identical until active development resumes

## Included scope

- Complete V4.0 application source
- Immutable V4.0 stable snapshot
- V1.0, V2.0, V3.0, V3.1 and V3.2 historical runnable files
- Historical previews and flight-state-machine image
- Product, architecture, navigation, performance, testing, decisions, roadmap and handoff documents
- Agent／contributor rules, security policy, changelog and third-party notice
- Zero-dependency local static server
- Structural, JavaScript, route graph, stable hash and basic secret validation
- GitHub Actions workflow and issue／PR templates

## Verified checks

At repository preparation:

- `npm run check`: 229 checks passed on the final prepared working tree
- `git fsck --full --strict`: no errors
- Working tree: clean
- Eight approved star systems: present and connected
- Approved SOL → ORION and SOL → TAU routes: unchanged
- V4.0 stable hash: unchanged
- Common token／private-key patterns: not detected by the repository guardrail

## Human verification still required

Automated checks cannot prove visual or physical-device performance. Before declaring a public production release, manually verify:

- iPhone Safari portrait controls and safe areas
- actual-direction turning across a large heading change
- visible warp entry, cruise and exit
- continuous deceleration and constant-speed approach
- SOL → ORION full multi-leg journey
- all eight destination landmarks
- Web Audio unlock and mute behaviour
- 10-minute frame pacing, DPR, heat and WebGL stability
