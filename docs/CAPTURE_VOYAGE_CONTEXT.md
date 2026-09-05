# Capture Gallery｜Voyage Context v9

Status: V5-candidate evolution on the persistent `autonomous-evolution` Draft PR. This slice extends the existing Capture Gallery presentation only; it does not change the V4.1 release baseline, renderer, camera, route planner, flight timing or capture authority.

## Goal / intended user outcome

A saved Real Space capture should read like a travel memory, not an isolated PNG. When Stellar Wrap can confidently associate a local capture with a recently completed journey to the same destination, the Gallery card and full-screen viewer show the actual arrival route, recorded distance and active travel seconds beside the image.

Voyage Context v9 adds a compact visual route ribbon above that text: each actual journey stop becomes one node in order, connectors show the travelled sequence, and the photographed final destination is highlighted. This lets a user recognise a multi-leg trip at a glance without replacing the full route text.

Example: a TAU capture made shortly after `SOL → SIRIUS → TAU` shows a three-node ribbon plus `地球近軌 → 天狼中繼站 → 金牛塵海 · 11.4 LY · 37 秒`. If no trustworthy journey matches, the image remains unchanged and no route is invented.

## Scope

- Read capture metadata only from the existing `WarpCaptureGallery.list()` authority.
- Read completed journeys only from the existing `WarpTravelJournal.entries()` authority.
- Match only when the journey ends at the same Real Space system as the capture, every route id is known, and journey completion is no more than **12 小時** before the capture timestamp; up to 2 minutes of clock slop is allowed.
- If more than one journey qualifies, use the closest completion time to the capture.
- Add one compact `抵達航程` memory block to the local Gallery card and existing full-screen viewer.
- Render the matched route as an ordered, bounded DOM ribbon using the existing system IDs; the final photographed destination receives the stronger endpoint treatment.
- Keep the full Chinese route, distance and active seconds as readable text below the ribbon and as the block accessibility label.
- When the viewer moves through pager, keyboard or swipe, the route ribbon/context follows the current image and disappears for unmatched records.
- Keep the existing six-image archive, PNG bytes, framing metadata, Native Share, re-save, delete, Cinematic Focus and world-return behaviour unchanged.
- Include the module in the prepared offline shell.

## Authority / privacy boundary

Voyage Context is presentation-only. It **不新增持久化**：journey data is not copied into Capture Gallery IndexedDB, no localStorage/sessionStorage key is added, and no recipient/share history is stored. It also **不新增航線權限**：the module never selects a destination, launches travel, calls `jumpTo`, recommends a route or changes flight state.

The route ribbon is ordinary bounded DOM/CSS generated only when Gallery content is rendered or changes. There is no backend, upload, analytics, application network request, Three.js object, WebGL renderer, animation-frame loop or polling timer.

## Acceptance criteria

1. A capture whose destination and timestamp match a recent completed journey shows the real route, distance and active seconds on its Gallery card.
2. A matched capture also shows one ordered route-ribbon node per Travel Journal stop, with the final photographed destination visually distinguished.
3. The same ribbon/context is visible in the full-screen viewer and follows next/previous/swipe navigation.
4. A capture for another destination receives no journey label or ribbon.
5. A matching-destination journey older than 12 hours receives no label or ribbon.
6. Matching/presentation does not alter Capture Gallery records, Travel Journal entries, current location, selected route or flying state.
7. Both 390×844 and 360×800 mobile portrait layouts keep no horizontal overflow and retain the existing >=44 px viewer controls.
8. The module adds no persistence, network, renderer, timer or navigation authority.
9. Prepared offline readiness includes `capture-voyage-context.js`.
10. Existing Capture Gallery, Native Share, Photo Mode and V4+ travel validation remain green.

## Out of scope

Cloud sync, PNG metadata rewriting, route recommendations, automatic travel, instant relocation, Frontier Fiction archive unification, new capture/camera authority, and any V4.1 route/topology/timing change remain out of scope.

## Validation evidence contract

`scripts/validate-capture-voyage-context.mjs` runs in the normal `npm run check` gate. It seeds a valid completed `SOL → SIRIUS → TAU` Travel Journal journey, restores the production simulator, creates matched and unmatched local captures, and verifies the real Gallery/viewer DOM at 390×844 and 360×800. Because the route ribbon lives inside the same matched voyage block, these exact browser runs exercise its live layout while retaining the existing route-text, stale/unmatched fail-closed and no-state-mutation assertions. Exact-run Gallery and viewer screenshots are written to `artifacts/capture-gallery/` for visual inspection.

Full repository CI remains the completion gate. Physical iPhone Safari checks of typography, safe-area feel and touch ergonomics are useful supplementary evidence, not blockers when the autonomous browser/runtime gates are green.
