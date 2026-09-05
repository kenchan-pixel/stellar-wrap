# Capture Gallery v5 — Cinematic Focus Review + Return to World

Status: V5 candidate on the persistent autonomous-evolution Draft PR. This is not a V4.1 release-baseline change until the owner merges it.

## Goal / user outcome

Make saved Real Space captures feel worth rewatching, not merely managing. From the existing full-screen Capture Gallery viewer, the user can temporarily remove all review chrome and let the stored PNG occupy the full mobile viewport, then restore controls with a stationary image tap or keyboard. Existing swipe comparison and safe return-to-world handoff remain intact.

## Scope

- Preserve the v4 local Capture Archive and its existing Photo Mode capture path; do not create a second camera, renderer or screenshot pass.
- Observe the exact PNG blob produced by the existing Photo Mode `canvas.toBlob()` flow, including the final 9:16 / 1:1 crop when selected.
- Keep at most the latest **6** captures in the dedicated IndexedDB store.
- Keep the mobile-first `CAPTURE ARCHIVE｜本機留影` section inside the existing `Gallery / Captures` records view.
- Show destination, capture time, pixel dimensions and frame format with a real thumbnail.
- Let users tap or keyboard-activate a thumbnail to open an immersive local full-screen viewer using the stored PNG itself.
- Preserve explicit previous/next controls, 48 px horizontal swipe navigation, Arrow Left/Right navigation, re-save, in-viewer delete continuity and the v4 contextual world-return action.
- Add **Cinematic Focus Review** inside the same viewer:
  - an explicit ≥44 px `純影像觀看` control enters focus mode;
  - focus mode removes viewer title, pager and action chrome and lets the stored PNG use the complete viewport without cropping outside it;
  - a stationary image tap restores the review controls;
  - `C` toggles focus mode on keyboard;
  - `Escape` exits focus mode first, then closes the viewer on a second press;
  - horizontal swipe remains reserved for capture navigation and must not be mistaken for a focus-mode tap.
- Preserve v4 world-return behaviour:
  - if the capture matches the current safe Real Space destination, close Gallery and return to the existing live scene;
  - if the capture belongs to another Real Space destination, select that destination through `WarpSim.select()` and open the existing route-planning panel;
  - if flight is active or WebGL context is lost, disable the action instead of forcing a transition.
- Replanning from a capture must never call `jumpTo`, start flight automatically, invent a route, or bypass existing user-controlled launch behaviour.
- Include focused browser evidence in the standing CI artifact.

## Acceptance criteria

1. A real Photo Mode capture at a safe final Real Space destination still downloads through the existing path and is added to Capture Archive without taking a second screenshot.
2. Square and 9:16 captures archive the final framed PNG dimensions rather than the pre-crop source.
3. Captures survive a fresh page reload in the same browser profile.
4. The archive is strictly bounded to six records; the oldest record is pruned transactionally when a seventh is added.
5. Gallery thumbnails fit 390×844 and 360×800 portrait viewports with no horizontal overflow; archive controls remain at least 44 px high.
6. Tapping a stored thumbnail opens the actual stored PNG in a full-screen viewer at both mobile acceptance viewports; the image remains contained and all normal viewer controls remain at least 44 px high.
7. With two or more captures, explicit previous/next controls, real touch swipe and Arrow Left/Right move through the same newest-first capture order without closing the viewer. End controls disable rather than wrap unexpectedly.
8. The new `純影像觀看` control is at least 44 px high and enters Cinematic Focus Review at both 390×844 and 360×800.
9. In focus mode the title row, pager and action row are removed from layout, the image stage fills the complete viewport within ±1 px, the stored image remains fully contained, and no horizontal overflow is introduced.
10. A stationary image tap restores the normal viewer chrome; a ≥48 px horizontal swipe remains a navigation gesture rather than toggling focus mode.
11. Keyboard `C` enters/exits focus mode. `Escape` exits focus first without closing the viewer, and only a subsequent Escape closes it and restores body scrolling.
12. From a capture whose destination differs from the current docked system, `再次前往` closes the viewer/Gallery, keeps the current system unchanged, selects the photographed destination, opens the existing Real Space route panel, and leaves `flying === false`.
13. The capture-to-world path contains no `jumpTo` call and does not directly start or complete a journey.
14. When the photographed destination is already the current safe destination, the action becomes `返回目前景觀` and simply returns to the live scene without route mutation.
15. During active flight or WebGL context loss, the contextual return action is disabled with state-appropriate copy.
16. Deleting one of several captures keeps the viewer open on the nearest remaining image; deleting the last image closes it and restores page scrolling.
17. IndexedDB failure or quota failure must not break or block the existing PNG download.
18. No new Three.js object, draw call, triangle, route table, flight timing, camera state, backend or network request is added.
19. Object URLs used for archive previews and full-screen review are revoked on rerender, image change, viewer close or page exit.

## Out of scope

- Cloud sync, accounts, upload/share endpoints or cross-device gallery sync.
- Frontier Fiction captures; its fixed scenic pages keep their existing independent capture behavior for now.
- Editing, filters, tagging, albums, social sharing, pinch-to-zoom or a second image-generation pipeline.
- Automatic travel, instant relocation, new routing rules, or changes to approved V4.1 navigation, warp, arrival or exploration timing.
- Hiding browser/OS chrome; focus mode only owns the app's existing Capture Gallery viewer chrome.

## Persistence / privacy

Capture Archive continues to use the existing IndexedDB database, `stellar-wrap-capture-gallery`, solely for the local PNG blob and minimal display metadata. Cinematic Focus Review adds no persistence. It does not copy Travel Journal, Star Atlas or route authority and performs no network transmission. Storage remains bounded to six images to limit quota and mobile storage exposure. Full-screen review creates only one temporary object URL for the currently displayed local blob and revokes it on image change or close.

## Validation

- `node scripts/validate-capture-gallery.mjs` retains the end-to-end production Photo Mode capture, persistence, reload, viewer, download/delete and six-item-bound coverage.
- `node scripts/validate-capture-gallery-swipe.mjs` retains v4 real-Chromium coverage at 390×844 and 360×800 for previous/next, real touch swipe, keyboard navigation, same-current return, different-destination route handoff, active-flight/context-loss disabled states and deletion continuity.
- `node scripts/validate-capture-gallery-focus.mjs` adds focused production-Chromium coverage at 390×844 and 360×800 for the explicit focus control, full-viewport clean-image geometry, contained PNG, stationary-tap restore, keyboard `C`, two-stage Escape behaviour, ≥44 px control restoration, no horizontal overflow and retained screenshot evidence under `artifacts/capture-gallery-focus/`.

## Risks / supplementary manual checks

Physical iPhone Safari checks remain useful for IndexedDB quota behaviour, native download UX, safe-area feel, swipe/tap gesture feel, screen-edge visual composition and sustained thermal/frame pacing, but are supplementary evidence rather than the completion gate for this slice.

## Completion signal

The slice is complete when exact-head CI passes, both mobile Chromium viewports prove the focus-view geometry and control lifecycle, screenshots show a clean stored image without black frame or clipping, the existing v4 return-state suite remains green, the Draft PR receipt points at the exact validated SHA, and exact-head review has no unresolved P0/P1 finding.
