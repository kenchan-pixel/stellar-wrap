# Capture Gallery v2 — Local High-Quality Capture Archive + Immersive Review

Status: V5 candidate on the persistent autonomous-evolution Draft PR. This is not a V4.1 release-baseline change until the owner merges it.

## Goal / user outcome

Turn `Gallery / Captures` into a real capture-and-review surface instead of a records-only shell. A successful Real Space high-quality Photo Mode capture should still download normally, remain visible on the same device, and be viewable at useful full-screen scale without leaving the simulator.

## Scope

- Reuse the existing `photo-mode.js` capture path; do not create a second camera, renderer or screenshot pass.
- Observe the exact PNG blob produced by the existing Photo Mode `canvas.toBlob()` flow, including the final 9:16 / 1:1 crop when selected.
- Keep at most the latest **6** captures in a dedicated IndexedDB store.
- Keep the mobile-first `CAPTURE ARCHIVE｜本機留影` section inside the existing `Gallery / Captures` records view.
- Show destination, capture time, pixel dimensions and frame format with a real thumbnail.
- Let users tap or keyboard-activate a thumbnail to open an immersive local full-screen viewer using the stored PNG itself.
- The viewer shows the destination and capture metadata, keeps the image contained within the portrait viewport, and provides 44 px minimum close, re-save and delete actions.
- Closing with the close control or Escape must release the viewer object URL and restore page scrolling.
- Allow `再次儲存` and `刪除` from the archive; the viewer reuses the same local-only download/delete authority.
- Include the module in the prepared offline shell.

## Acceptance criteria

1. A real Photo Mode capture at a safe final Real Space destination still downloads through the existing path and is added to Capture Archive without taking a second screenshot.
2. Square and 9:16 captures archive the final framed PNG dimensions rather than the pre-crop source.
3. Captures survive a fresh page reload in the same browser profile.
4. The archive is strictly bounded to six records; the oldest record is pruned transactionally when a seventh is added.
5. Gallery thumbnails fit 390×844 and 360×800 portrait viewports with no horizontal overflow; re-save and delete controls remain at least 44 px high.
6. Tapping a stored thumbnail opens the actual stored PNG in a full-screen viewer at both mobile acceptance viewports; the image remains contained, metadata remains legible, and viewer close/re-save/delete controls remain at least 44 px high.
7. Escape closes the viewer and the viewer releases its temporary object URL; deleting the open item safely closes the viewer before rerendering the archive.
8. IndexedDB failure or quota failure must not break or block the existing PNG download.
9. No new Three.js object, draw call, triangle, route authority, flight timing, camera state, backend or network request is added.
10. Object URLs used for archive previews and full-screen review are revoked on rerender, viewer close or page exit.

## Out of scope

- Cloud sync, accounts, upload/share endpoints or cross-device gallery sync.
- Frontier Fiction captures; its fixed scenic pages keep their existing independent capture behavior for now.
- Editing, filters, tagging, albums, social sharing, pinch-to-zoom or a second image-generation pipeline.
- Changing the approved V4.1 navigation, warp, arrival or exploration timing.

## Persistence / privacy

Capture Archive uses the existing IndexedDB database, `stellar-wrap-capture-gallery`, solely for the local PNG blob and minimal display metadata. It does not copy Travel Journal or Star Atlas authority and performs no network transmission. Storage remains bounded to six images to limit quota and mobile storage exposure. Full-screen review creates only a temporary object URL for the selected local blob and revokes it on close.

## Validation

`node scripts/validate-capture-gallery.mjs` provides static contract checks plus real production Chromium coverage at 390×844 and 360×800. The browser gate performs a real TAU Photo Mode capture, verifies quality restoration, framed PNG persistence, reload continuity, archive layout/touch targets, full-screen viewer layout and Escape close, six-item pruning and deletion, and writes archive + viewer screenshots to `artifacts/capture-gallery/`.

## Risks / supplementary manual checks

Physical iPhone Safari checks remain useful for IndexedDB quota behaviour, long-session storage pressure, native download UX, safe-area feel and sustained thermal/frame pacing, but are supplementary evidence rather than the completion gate for this slice.

## Completion signal

The slice is complete when exact-head CI passes, both mobile Chromium viewports produce valid archive and full-screen viewer screenshots, persistence/reload, viewer close and six-item bounds pass, the Draft PR receipt points at the exact validated SHA, and exact-head review has no unresolved P0/P1 finding.
