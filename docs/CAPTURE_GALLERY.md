# Capture Gallery v1 — Local High-Quality Capture Archive

Status: V5 candidate on the persistent autonomous-evolution Draft PR. This is not a V4.1 release-baseline change until the owner merges it.

## Goal / user outcome

Turn `Gallery / Captures` into a real capture surface instead of a records-only shell. A successful Real Space high-quality Photo Mode capture should still download normally and also remain visible on the same device for later review, re-save or deletion.

## Scope

- Reuse the existing `photo-mode.js` capture path; do not create a second camera, renderer or screenshot pass.
- Observe the exact PNG blob produced by the existing Photo Mode `canvas.toBlob()` flow, including the final 9:16 / 1:1 crop when selected.
- Keep at most the latest **6** captures in a dedicated IndexedDB store.
- Add a mobile-first `CAPTURE ARCHIVE｜本機留影` section inside the existing `Gallery / Captures` records view.
- Show destination, capture time, pixel dimensions and frame format with a real thumbnail.
- Allow `再次儲存` and `刪除`; both actions remain local-only.
- Include the module in the prepared offline shell.

## Acceptance criteria

1. A real Photo Mode capture at a safe final Real Space destination still downloads through the existing path and is added to Capture Archive without taking a second screenshot.
2. Square and 9:16 captures archive the final framed PNG dimensions rather than the pre-crop source.
3. Captures survive a fresh page reload in the same browser profile.
4. The archive is strictly bounded to six records; the oldest record is pruned transactionally when a seventh is added.
5. Gallery thumbnails fit 390×844 and 360×800 portrait viewports with no horizontal overflow; re-save and delete controls remain at least 44 px high.
6. IndexedDB failure or quota failure must not break or block the existing PNG download.
7. No new Three.js object, draw call, triangle, route authority, flight timing, camera state, backend or network request is added.
8. Object URLs used for previews are revoked on rerender/page exit.

## Out of scope

- Cloud sync, accounts, upload/share endpoints or cross-device gallery sync.
- Frontier Fiction captures; its fixed scenic pages keep their existing independent capture behavior for now.
- Editing, filters, tagging, albums, social sharing or a second image-generation pipeline.
- Changing the approved V4.1 navigation, warp, arrival or exploration timing.

## Persistence / privacy

Capture Archive uses a new IndexedDB database, `stellar-wrap-capture-gallery`, solely for the local PNG blob and minimal display metadata. It does not copy Travel Journal or Star Atlas authority and performs no network transmission. Storage is bounded to six images to limit quota and mobile storage exposure.

## Validation

`node scripts/validate-capture-gallery.mjs` provides static contract checks plus real production Chromium coverage at 390×844 and 360×800. The browser gate performs a real TAU Photo Mode capture, verifies quality restoration, framed PNG persistence, reload continuity, archive layout/touch targets, six-item pruning and deletion, and writes screenshots to `artifacts/capture-gallery/`.

## Risks / supplementary manual checks

Physical iPhone Safari checks remain useful for IndexedDB quota behaviour, long-session storage pressure and native download UX, but are supplementary evidence rather than the completion gate for this slice.

## Completion signal

The slice is complete when exact-head CI passes, both mobile Chromium viewports produce valid archive screenshots, persistence/reload and six-item bounds pass, the Draft PR receipt points at the exact validated SHA, and exact-head review has no unresolved P0/P1 finding.
