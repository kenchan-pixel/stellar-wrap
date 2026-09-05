# Capture Gallery v6 — Direct Swipe Review + Return to World

Status: V5-candidate evolution on the persistent `autonomous-evolution` Draft PR. This is not a V4.1 release-baseline change until the owner merges it.

## Goal / intended user outcome

Make saved Real Space captures feel tactile and cinematic on a phone. While reviewing a stored PNG, a horizontal finger drag now moves the image with the gesture before the existing swipe threshold is crossed; completed navigation receives a short direction-aware arrival motion. This must work in both normal review and chrome-free Cinematic Focus without changing capture storage, route authority, renderer cost or approved travel timing.

## Scope

- Preserve the existing bounded local Capture Archive and its existing Photo Mode capture path; do not create a second camera, renderer or screenshot pass.
- Keep at most the latest **6** captures in the dedicated IndexedDB store.
- Preserve destination, time, pixel dimensions, frame metadata, real thumbnails, re-save, delete continuity and contextual world-return behaviour.
- Preserve explicit previous/next controls, Arrow Left/Right and the existing **48 px horizontal swipe navigation threshold**.
- Preserve Cinematic Focus Review in the existing full-screen viewer: `純影像觀看`, full-viewport stored PNG, stationary-tap chrome restore, `C` toggle and two-stage `Escape` lifecycle.
- Add **Direct Swipe Review** to the existing full-screen image stage:
  - after horizontal intent is established, the displayed PNG follows the finger up to a bounded ±76 px visual offset;
  - drag strength applies only a small bounded scale/opacity response and adds no new element or second image;
  - dragging toward an unavailable gallery edge receives 0.28 resistance instead of suggesting a wrap that cannot occur;
  - releasing below 48 px snaps the image back and changes neither capture nor focus state;
  - releasing at/above 48 px keeps the existing navigation order and uses a short 180 ms direction-aware arrival transition;
  - vertical intent does not move the image horizontally;
  - reduced-motion preference suppresses the transition/drag presentation while preserving navigation semantics.
- Continue to reserve a stationary ≤12 px image tap for focus-mode toggle, so direct dragging cannot be mistaken for a tap.
- Preserve v4 world-return behaviour:
  - same safe Real Space destination → `返回目前景觀`;
  - another destination → `WarpSim.select()` plus existing route panel;
  - active flight or WebGL context loss → disabled action.
- Replanning from a capture must never call `jumpTo`, start flight automatically, invent a route or bypass user-controlled launch.
- Capture focused real-Chromium evidence at both standing mobile portrait viewports.

## Acceptance criteria

1. A real Photo Mode capture at a safe final Real Space destination still downloads through the existing path and is archived without taking a second screenshot.
2. Square and 9:16 captures still archive the final framed PNG dimensions.
3. Captures survive a fresh page reload in the same browser profile.
4. Archive storage remains strictly bounded to six records.
5. Gallery and viewer fit 390×844 and 360×800 without horizontal overflow; normal controls remain at least 44 px high.
6. The stored PNG remains contained in both normal review and full-viewport Cinematic Focus.
7. Explicit previous/next, Arrow Left/Right and touch swipe all retain newest-first ordering and disabled non-wrapping edges.
8. In Cinematic Focus, title, pager and action rows remain out of layout and a stationary tap restores them.
9. `C` still toggles focus; `Escape` exits focus first and closes the viewer only on a subsequent press.
10. During a horizontal drag toward an available neighbour, the current image visibly tracks the pointer before release, with a bounded absolute offset no greater than 76 px and opacity no lower than 0.84.
11. A ≥48 px horizontal release navigates to the correct adjacent capture, clears inline drag state, keeps Cinematic Focus active when it was active, and records the correct next/previous presentation direction.
12. A horizontal release below 48 px returns the image to its origin, changes neither capture nor focus state, and leaves no dragging class or inline transform/opacity behind.
13. A vertical-intent gesture does not apply horizontal drag presentation.
14. Dragging toward a disabled first/last edge cannot wrap; visual displacement is resisted rather than implying a valid transition.
15. `prefers-reduced-motion: reduce` disables transition/animation presentation without changing the swipe threshold or destination ordering.
16. From a capture whose destination differs from the current safe docked system, `再次前往` closes Gallery, keeps current location unchanged, selects the photographed destination, opens the existing Real Space route panel and leaves `flying === false`.
17. The capture-to-world path contains no `jumpTo` and does not directly start or complete a journey.
18. When the photographed destination is already current, `返回目前景觀` returns to the live scene without route mutation.
19. During active flight or WebGL context loss, the contextual return action remains disabled.
20. Deleting one of several captures keeps the viewer on the nearest remaining image; deleting the last closes it and restores body scrolling.
21. IndexedDB/quota failure cannot block the existing PNG download.
22. No new Three.js object, draw call, triangle, route table, flight timing, camera state, backend, dependency or network request is added.
23. Object URLs continue to be revoked on rerender, image change, viewer close or page exit.

## Out of scope

- Cloud sync, accounts, upload/share endpoints or cross-device gallery sync.
- Frontier Fiction capture-archive unification.
- Editing, filters, tagging, albums, social sharing, pinch-to-zoom, preloading a second full-resolution image or a second image-generation pipeline.
- Momentum/fling physics, carousel wrapping or changes to the 48 px navigation threshold.
- Automatic travel, instant relocation, new routing rules or changes to approved V4.1 navigation, warp, arrival or exploration timing.
- Hiding browser/OS chrome; focus mode only owns the app viewer chrome.

## Implementation / performance constraints

Direct Swipe Review is event-driven only. It uses the existing image node and pointer events, bounded `transform`/`opacity`, one-shot CSS arrival animation and at most a one-shot `requestAnimationFrame` when an adjacent record is applied. It adds no polling, render loop, second image, Three.js work or storage/network authority. Edge resistance is presentation-only and never changes gallery ordering or navigation eligibility.

## Persistence / privacy

Capture Archive continues to use `stellar-wrap-capture-gallery` IndexedDB solely for local PNG blobs and minimal display metadata. Direct Swipe Review adds no persistence and no network transmission. Storage remains bounded to six images.

## Validation

- `node scripts/validate-capture-gallery.mjs` retains end-to-end production Photo Mode capture, final PNG framing, persistence, reload, viewer, re-save/delete and six-item-bound coverage.
- `node scripts/validate-capture-gallery-swipe.mjs` retains real-Chromium 390×844 / 360×800 coverage for explicit navigation, touch swipe, keyboard navigation, contextual world return and deletion continuity.
- `node scripts/validate-capture-gallery-focus.mjs` retains Cinematic Focus geometry, contained PNG, stationary tap, keyboard and two-stage Escape evidence.
- `node scripts/validate-capture-gallery-focus-swipe.mjs` now proves, at **both 390×844 and 360×800**, that a real horizontal pointermove visibly tracks the image before release, a qualifying LUNA → SOL swipe preserves focus and clears drag state, a sub-threshold drag snaps back without navigation/focus change, and a stationary tap still restores chrome. The same test writes exact-run PNG evidence into the standing `artifacts/capture-gallery-focus/` CI artifact.

## Risks / supplementary manual checks

Physical iPhone Safari remains useful for native edge-gesture interaction, touch feel, IndexedDB quota behaviour, native download UX, safe-area composition, long-session thermals and frame pacing. These are supplementary checks rather than completion blockers because the interaction lifecycle and both primary portrait viewports are covered in real Chromium.

## Completion signal

The slice is complete when the exact implementation HEAD passes repository CI plus the focused drag/swipe Chromium gate at both mobile viewports, the new screenshots show a coherent contained image during direct manipulation with no black frame/clipping, the existing Capture Gallery/focus/world-return regressions remain green, Vercel Preview is ready, the Draft PR receipt points at the exact validated SHA, and exact-head review has no unresolved P0/P1 finding.