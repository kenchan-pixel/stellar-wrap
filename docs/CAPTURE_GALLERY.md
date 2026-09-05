# Capture Gallery v4 — Local High-Quality Capture Archive + Return to World

Status: V5 candidate on the persistent autonomous-evolution Draft PR. This is not a V4.1 release-baseline change until the owner merges it.

## Goal / user outcome

Make a saved Real Space capture useful as more than a static souvenir. From full-screen review, the user can compare local captures and then move directly back into the relevant exploration context: return to the current photographed scene when already docked there, or hand the photographed destination to the existing Real Space route planner without instant travel.

## Scope

- Preserve the v3 local Capture Archive and its existing Photo Mode capture path; do not create a second camera, renderer or screenshot pass.
- Observe the exact PNG blob produced by the existing Photo Mode `canvas.toBlob()` flow, including the final 9:16 / 1:1 crop when selected.
- Keep at most the latest **6** captures in the dedicated IndexedDB store.
- Keep the mobile-first `CAPTURE ARCHIVE｜本機留影` section inside the existing `Gallery / Captures` records view.
- Show destination, capture time, pixel dimensions and frame format with a real thumbnail.
- Let users tap or keyboard-activate a thumbnail to open an immersive local full-screen viewer using the stored PNG itself.
- Preserve explicit previous/next controls, 48 px horizontal swipe navigation, Arrow Left/Right navigation, Escape close, re-save and in-viewer delete continuity.
- Add one contextual world-return action to the full-screen viewer:
  - if the capture matches the current safe Real Space destination, close Gallery and return to the existing live scene;
  - if the capture belongs to another Real Space destination, select that destination through `WarpSim.select()` and open the existing route-planning panel;
  - if flight is active or WebGL context is lost, disable the action instead of forcing a transition.
- Replanning from a capture must never call `jumpTo`, start flight automatically, invent a route, or bypass existing user-controlled launch behaviour.
- Include the module in the prepared offline shell.

## Acceptance criteria

1. A real Photo Mode capture at a safe final Real Space destination still downloads through the existing path and is added to Capture Archive without taking a second screenshot.
2. Square and 9:16 captures archive the final framed PNG dimensions rather than the pre-crop source.
3. Captures survive a fresh page reload in the same browser profile.
4. The archive is strictly bounded to six records; the oldest record is pruned transactionally when a seventh is added.
5. Gallery thumbnails fit 390×844 and 360×800 portrait viewports with no horizontal overflow; archive controls remain at least 44 px high.
6. Tapping a stored thumbnail opens the actual stored PNG in a full-screen viewer at both mobile acceptance viewports; the image remains contained and all viewer controls remain at least 44 px high.
7. With two or more captures, explicit previous/next controls, real touch swipe and Arrow Left/Right move through the same newest-first capture order without closing the viewer. End controls disable rather than wrap unexpectedly.
8. From a capture whose destination differs from the current docked system, `再次前往` closes the viewer/Gallery, keeps the current system unchanged, selects the photographed destination, opens the existing Real Space route panel, and leaves `flying === false`.
9. The capture-to-world path contains no `jumpTo` call and does not directly start or complete a journey.
10. When the photographed destination is already the current safe destination, the action becomes `返回目前景觀` and simply returns to the live scene without route mutation.
11. During active flight or WebGL context loss, the contextual return action is disabled with state-appropriate copy.
12. Deleting one of several captures keeps the viewer open on the nearest remaining image; deleting the last image closes it and restores page scrolling.
13. IndexedDB failure or quota failure must not break or block the existing PNG download.
14. No new Three.js object, draw call, triangle, route table, flight timing, camera state, backend or network request is added.
15. Object URLs used for archive previews and full-screen review are revoked on rerender, image change, viewer close or page exit.

## Out of scope

- Cloud sync, accounts, upload/share endpoints or cross-device gallery sync.
- Frontier Fiction captures; its fixed scenic pages keep their existing independent capture behavior for now.
- Editing, filters, tagging, albums, social sharing, pinch-to-zoom or a second image-generation pipeline.
- Automatic travel, instant relocation, new routing rules, or changes to approved V4.1 navigation, warp, arrival or exploration timing.

## Persistence / privacy

Capture Archive uses the existing IndexedDB database, `stellar-wrap-capture-gallery`, solely for the local PNG blob and minimal display metadata. It does not copy Travel Journal, Star Atlas or route authority and performs no network transmission. Storage remains bounded to six images to limit quota and mobile storage exposure. Full-screen review creates only one temporary object URL for the currently displayed local blob and revokes it on image change or close.

## Validation

`node scripts/validate-capture-gallery.mjs` retains the end-to-end production Photo Mode capture, persistence, reload, viewer, download/delete and six-item-bound coverage. `node scripts/validate-capture-gallery-swipe.mjs` now covers v4 in real Chromium at 390×844 and 360×800: three-action viewer layout, ≥44 px controls, explicit previous/next navigation, true emulated touch swipe, keyboard navigation, capture-to-existing-route handoff while current location remains unchanged and flight remains stopped, in-viewer deletion continuity, final-image close behaviour, and screenshots under `artifacts/capture-gallery-swipe/`.

## Risks / supplementary manual checks

Physical iPhone Safari checks remain useful for IndexedDB quota behaviour, long-session storage pressure, native download UX, safe-area feel, swipe feel and sustained thermal/frame pacing, but are supplementary evidence rather than the completion gate for this slice.

## Completion signal

The slice is complete when exact-head CI passes, both mobile Chromium viewports produce valid capture-review and route-handoff screenshots, the handoff proves current location is preserved while the photographed destination is selected through the existing route planner, the Draft PR receipt points at the exact validated SHA, and exact-head review has no unresolved P0/P1 finding.
