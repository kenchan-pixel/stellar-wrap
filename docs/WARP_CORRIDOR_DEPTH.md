# Warp Corridor Peripheral Starflow + Warp-to-Approach Depth Bridge｜Vertical Slice v4

## Goal / intended player outcome

令完整旅程由「進入曲速 → 曲速巡航 → 脫離 → 減速 → 接近目的地」有更強烈而連續的空間速度感。玩家進入曲速後，唔只見到中央透視軌道，而係會感到左右兩側近景星流高速掠過，形成真正「穿越空間」嘅前後景視差；脫離時再由既有 Shockfront 接手，引導視線到目的地。

v4 保留既有 Warp Corridor Perspective Depth、三層 Approach Depth 同 v3 Warp Exit Shockfront，並加入 **Peripheral Starflow｜周邊星流視差**：使用 `#journeyCorridorDepth` 兩個 pseudo-element 形成左右兩層 bounded velocity sheets，在 `warpEntry → warp → warpExit` 由淡入、巡航高速視差、再淡走，全程不增加 DOM child 或 Three.js renderer 成本。

## Scope

- 保留現有 `#journeyCorridorDepth`：exactly 5 個 pointer-transparent DOM elements，只在 `warpEntry / warp / warpExit` 活躍。
- v4 新增 `#journeyCorridorDepth::before / ::after` 兩層 peripheral starflow；兩側使用不同斜向 repeating gradient、不同 transform animation rate，建立 near/far parallax，而唔係再加中央 HUD 線。
- Starflow 使用現有 route-specific `--depth-tilt / --depth-skew`，因此九條 direct corridor 仍保留各自方向身份。
- `warpEntry` 只低透明度建立速度層；`warp` 提升至主要可見強度並以 0.78s／1.08s 不同速率移動；`warpExit` 快速退場；`decelerate / approach / observe` 完全清走。
- 手機 ≤520 px 將兩層寬度收窄至 52%，避免周邊效果侵佔中央目的地／航向視野。
- `prefers-reduced-motion` 停止兩層 animation，但保留較弱靜態星流，唔刪除空間深度 cue。
- 保留 v3 Shockfront：`#journeyApproachDepth` 仍 exactly 3 children，`::before / ::after` 由 `warpExit → decelerate → approach` 鎖定 destination-specific anchor、擴張並在 `observe` 前完全消失。
- 只用 bounded CSS gradient、clip-path、transform、opacity；不使用 `filter`、`backdrop-filter`、timer、`requestAnimationFrame`、network、storage、新 dependency 或額外 renderer。

## Acceptance Criteria

- [ ] Runtime 仍只 mount 1 個 `#journeyCorridorDepth`（exactly 5 children）及 1 個 `#journeyApproachDepth`（exactly 3 children）；Starflow／Shockfront 均只用 pseudo-element，不增加 DOM child count。
- [ ] 九條既有 direct corridor 保持不同 perspective orientation；八個 Real Space destination 保持獨立 approach anchor／tilt identity。
- [ ] Peripheral Starflow 在 `warpEntry` 只作弱提示，在 `warp` 兩層均達 CSS opacity 0.32 並使用不同 transform-only animation rate，在 `warpExit` 降至 0.12，`decelerate / approach / observe` opacity 為 0。
- [ ] 左右 Starflow 使用不同 gradient angle、不同視差速度，而且保持畫面周邊；中央 vanishing-point horizon、rails、rungs 仍清楚可見。
- [ ] Warp depth 只在 `warpEntry / warp / warpExit` active，`decelerate / approach / observe` inactive。
- [ ] Approach depth 在 `warpExit / decelerate / approach` active，`observe` inactive。
- [ ] v3 Shockfront `::before / ::after` 在 `warpExit` 首個可見取樣維持目的地 anchor ±6 px；其後經 `decelerate` 擴張、`approach` 柔化，`observe` opacity 回到 0。
- [ ] `SOL → LUNA` production Chromium 390×844、360×800 均要實際驗證：
  - warp cruise：`SOL>LUNA`、5 corridor children、root opacity ≥0.65、左右周邊星流可見、中央視野無遮蔽、無水平 overflow；
  - warp exit：既有兩層 Shockfront rendered centre 維持 LUNA anchor ±6 px；
  - approach：LUNA 3 層 approach depth 正常擴張；
  - observation：corridor／starflow／approach／Shockfront fully faded。
- [ ] `npm run check`、V4 stable hash、route／flight／Hermite、安全及既有 browser gates 保持綠色。
- [ ] Starflow 不改 `WarpSim` phase timing、arrival clock、camera authority、route authority、DPR 或 Three.js renderer budget。

## Out of Scope

- 不增加新星圖節點、航線、距離模型或 Frontier route authority。
- 不重寫既有 warp particles、tunnel rings、threshold flash、Transit Corridor Vistas 或真正 Three.js destination geometry。
- 不永久提高 DPR、不加入 post-processing framework、不用較慢 simulation timing 換畫質。
- 不增加 particle count、draw call 或 triangle count；今次係 bounded presentation-layer depth enhancement。
- 不放寬既有 Shockfront rendered-centre `≤6 px` 驗收門檻。
- 不以 headless Chromium FPS 宣稱手機 60 fps。

## Validation evidence

Exact-head acceptance 由完整 GitHub Actions、focused Warp Corridor static/browser gate、390×844／360×800 production Chromium runtime、兩個 viewport 的 warp screenshot、LUNA warp-exit／approach screenshot、PR exact-head review receipt共同證明。

視覺驗收重點係：曲速巡航時左右兩側應讀成「近景星流快速掠過」，而唔係額外 UI 格線；中央 horizon／route corridor 仍然係主透視方向。脫離曲速後 Peripheral Starflow 必須退場，讓 Shockfront 同真正 3D 目的地接手。

物理 iPhone Safari 長時間熱力／frame pacing、不同 GPU 對細線／半透明 gradient 混色仍屬補充證據，不係自動完成 gate。

## Risks / manual checks

- iPhone Safari／不同 GPU 對 repeating gradient、clip-path 同半透明混色可能有少量視覺差異。
- 兩層 Starflow 只 animation transform／opacity，但長時間實際 compositor／熱力成本仍需物理手機先可量度。
- headless Chromium 可證明 DOM、CSS、viewport、實際 render screenshot 同狀態切換，但唔代表真實 iPhone 60 fps。
- route-specific tilt/skew 係視覺構圖資料，不代表真實航向、角度或距離數值。

## Completion Signal

玩家進入曲速後，畫面中央仍由原有 horizon／rails 建立航向，而左右兩側會以兩個不同速度的 bounded Starflow 層產生明顯近景掠過感；到 `warpExit` 星流退場，既有 Shockfront 無跳接地接手並鎖定目的地 anchor，最後平滑過渡至真正 3D 地標。整個 v4 改良增加零 DOM child、零 Three.js draw／triangle、零模擬／相機／路線／持久化／網絡權威，並可在兩個主要手機 viewport 以真 production Chromium screenshot 重複驗證。