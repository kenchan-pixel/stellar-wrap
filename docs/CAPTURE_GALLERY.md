# Capture Gallery v7 — Native Share + Direct Swipe Review

Status: V5-candidate evolution on the persistent `autonomous-evolution` Draft PR. This is not a V4.1 release-baseline change until the owner merges it.

## Goal / intended user outcome

Make saved Real Space captures useful beyond passive review. A player can keep the latest **6** captures locally, open the existing full-screen viewer, compare them by direct swipe, safely return to the photographed world, and—when the mobile browser supports file sharing—send the exact stored high-quality PNG to the operating-system share sheet with one explicit `分享留影` action.

Native Share is a handoff from the existing local archive. It does not create a second image, upload service, account, analytics path, camera or renderer. Preserve the existing Photo Mode capture path; **do not create a second camera** or screenshot authority.

## Scope

- Preserve the dedicated `stellar-wrap-capture-gallery` IndexedDB archive and its six-record limit.
- Preserve destination, timestamp, pixel dimensions, framing metadata, real thumbnails, re-save, delete and reload persistence.
- Preserve the immersive full-screen viewer, Cinematic Focus, previous/next controls, Arrow Left/Right, direct pointer drag, the 48 px swipe threshold, non-wrapping edges and delete continuity.
- Preserve world return:
  - same safe docked system → `返回目前景觀`;
  - another Real Space destination → existing `WarpSim.select()` route-planning handoff;
  - active flight / WebGL context loss → disabled.
- Add progressive native file sharing to each stored capture card:
  - show `分享留影` only when both `navigator.share` and `navigator.canShare` confirm PNG `File` sharing;
  - wrap the already-stored PNG Blob in one `File` with destination/frame/timestamp filename;
  - call the browser/OS share sheet only from the explicit user action;
  - share exactly one PNG with a short Stellar Wrap destination title/text;
  - a user-cancelled share sheet (`AbortError`) is a normal cancellation, not a product error;
  - when file sharing is unsupported, expose no dead share control and keep `再次儲存` unchanged.
- Cache `capture-share.js` in the prepared offline shell so capability-based sharing remains available after an already-prepared offline launch; the browser/selected destination app still decides whether the OS share itself can complete offline.

## Native Share acceptance criteria

1. A browser without Web Share file capability shows no `分享留影` button and retains the existing download/delete actions.
2. A browser whose `navigator.canShare({files})` accepts PNG files shows exactly one share action per capture card.
3. The share action has at least 44 px touch height and fits both 390×844 and 360×800 Gallery layouts without horizontal overflow.
4. Sharing reuses the existing stored PNG Blob; it does not invoke Photo Mode, canvas capture, renderer quality changes or a second screenshot.
5. The OS payload contains exactly one `image/png` File whose bytes start with the PNG signature and whose size matches the stored record.
6. The filename contains `stellar-wrap`, destination id, frame and timestamp; title/text identify the photographed destination.
7. Successful share does not add/remove/duplicate captures and does not mutate current system, selected route or flight state.
8. `AbortError` leaves the capture and Gallery intact and is treated as cancellation.
9. If capability changes to unsupported, stale share actions are removed on refresh rather than remaining enabled.
10. `capture-share.js` adds no Three.js object, WebGL renderer, animation loop, polling, route table, storage key, backend, analytics or app-owned network request.
11. Existing PNG download remains the universal fallback and must still work when Native Share is unavailable or cancelled.

## Existing archive / viewer acceptance

1. A real Photo Mode capture at a safe final Real Space destination still downloads through the existing path and is archived without taking a second screenshot.
2. Square and 9:16 captures still archive the final framed PNG dimensions.
3. Captures survive a fresh page reload in the same browser profile and storage remains strictly bounded to six records.
4. Gallery and viewer fit 390×844 and 360×800 without horizontal overflow; controls remain at least 44 px high.
5. Stored PNGs remain contained in normal review and full-viewport Cinematic Focus.
6. Explicit previous/next, Arrow Left/Right and touch swipe retain newest-first ordering with disabled non-wrapping edges.
7. Horizontal direct drag follows the finger only after horizontal intent, stays bounded to ±76 px, and sub-threshold release snaps back without changing the selected capture.
8. A ≥48 px horizontal release moves to the adjacent capture and uses the existing short direction-aware arrival motion.
9. Vertical intent does not create horizontal drag presentation; reduced-motion preference suppresses presentation animation without changing navigation semantics.
10. In Cinematic Focus, app viewer chrome stays out of layout; stationary tap restores it, `C` toggles focus and two-stage `Escape` exits focus before closing the viewer.
11. Replanning from a capture never calls `jumpTo`, never starts flight automatically and never bypasses the existing user-controlled route launch.
12. Deleting one of several captures keeps the viewer on the nearest remaining image; deleting the final capture closes it and restores body scrolling.
13. IndexedDB/quota failure cannot block the original PNG download path.
14. Object URLs are revoked on rerender, image change, viewer close and page exit.

## Out of scope

- Cloud sync, accounts, uploads owned by Stellar Wrap, public hosting, social graphs, share tracking or analytics.
- Automatic/background sharing; the OS sheet opens only from explicit user action.
- Cross-device archive sync, editing, filters, tagging, albums, pinch-to-zoom, carousel wrapping or momentum physics.
- Frontier Fiction capture-archive unification.
- New routing rules, automatic travel, instant relocation, new camera authority or changes to V4.1 warp/arrival timing.
- Hiding browser/OS chrome; Cinematic Focus owns only the app viewer chrome.

## Implementation / performance constraints

Native Share is a small event-driven presentation module. It decorates existing Capture Gallery cards via a bounded child-list observer, reads the selected record through `WarpCaptureGallery.list()`, creates one transient `File`, and hands it to the browser's existing Web Share API. It adds no polling, render loop, WebGL work, image recapture or persistence. Direct Swipe Review remains event-driven and uses the existing image node plus bounded transform/opacity presentation.

The share capability probe is local and synchronous. No application `fetch`, XHR, beacon or upload endpoint is introduced. After the explicit handoff, any delivery chosen in the OS share sheet is outside Stellar Wrap's network authority.

## Persistence / privacy

Capture Archive continues to store PNG blobs and minimal display metadata only in local IndexedDB. Native Share does not persist recipients, destinations, share status or telemetry. A file leaves the browser only after the user presses `分享留影` and chooses an OS share destination.

## Validation

- `node scripts/validate-capture-gallery.mjs` retains real Photo Mode capture, final PNG framing, persistence, viewer, re-save/delete and six-item-bound coverage.
- `node scripts/validate-capture-gallery-swipe.mjs` retains 390×844 / 360×800 viewer navigation, swipe, keyboard, world-return and deletion continuity.
- `node scripts/validate-capture-gallery-focus.mjs` and `validate-capture-gallery-focus-swipe.mjs` retain Cinematic Focus and direct-manipulation evidence.
- `node scripts/validate-capture-share.mjs` validates source boundaries plus real Chromium at both standing phone viewports. It proves progressive capability gating, 44 px layout, exact stored-PNG `File` handoff, no route/storage mutation, normal share-sheet cancellation and unsupported fallback; screenshots are written into the existing `artifacts/capture-gallery/` evidence bundle.
- Full `npm run check` remains the repository gate.

## Risks / supplementary manual checks

Physical iPhone Safari remains useful for the native share-sheet destination list, safe-area composition, Safari IndexedDB quota behaviour, touch feel and long-session thermal/frame pacing. These are supplementary checks rather than completion blockers: capability gating, payload identity and both primary portrait layouts are covered autonomously in Chromium, while the app retains the existing PNG download fallback.

## Completion signal

The slice is complete when the exact PR HEAD passes full repository CI and the focused Native Share Chromium gate at 390×844 and 360×800, exact-run screenshots show a coherent share action with no clipping/overflow, existing Capture Gallery/Photo/route regressions remain green, Vercel Preview is Ready, and exact-head review has no actionable P0/P1/P2 finding. The PR remains Draft, unmerged and not production-deployed.
