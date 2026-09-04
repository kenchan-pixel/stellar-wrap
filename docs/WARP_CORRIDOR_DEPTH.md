# Warp Corridor + Warp-to-Approach Depth Bridge｜Vertical Slice v3

## Goal / intended player outcome

令完整旅程由「進入曲速 → 曲速巡航 → 脫離 → 減速 → 接近目的地」有連續空間尺度，而唔係曲速有透視、脫離曲速後突然變回平面提示。

v3 保留既有 Warp Corridor Perspective Depth 同三層 Approach Depth，並加入一個 **Warp Exit Shockfront｜曲速脫離衝擊環**：用同一 `#journeyApproachDepth` 的兩個 pseudo-element，在 `warpExit → decelerate → approach` 由細至大打開兩層偏心橢圓衝擊環，將曲速走廊收束自然交接到目的地 approach anchor，再於 `observe` 前完全消失。

## Scope

- 保留現有 `#journeyCorridorDepth`：5 個 pointer-transparent DOM elements，只在 `warpEntry / warp / warpExit` 活躍。
- 保留現有 `#journeyApproachDepth`：3 個 far／mid／near DOM elements，只在 `warpExit / decelerate / approach` 活躍。
- v3 新增 **2 個 CSS pseudo-elements**（`::before / ::after`），不新增實際 DOM child、Three.js object、renderer draw 或 scene authority。
- Shockfront 與既有 destination-specific `--approach-x / --approach-y / tilt / skew` 共用同一 anchor，所以八個 Real Space 目的地會沿各自接近方向展開，而不是固定中央瞄準圈。
- Shockfront 及三層 Approach Depth 在隱藏狀態已預先使用 `warpExit` 的 compact centred transform；進入 `warpExit` 時只淡入，不再由 `transform:none` 滑向 destination anchor。之後 `decelerate / approach` 的既有擴張 transform 及 timing 保持不變。
- `warpExit` 時 Shockfront 較集中而明顯；`decelerate` 擴張；`approach` 再放大及降低透明度；`observe` 完全清走。
- 手機 ≤520 px 使用較窄的 bounded ellipse size，避免 360 px 寬畫面大量裁切。
- `prefers-reduced-motion` 停止 transition／animation，但保留靜態深度 cue。
- 只用 transform、opacity、border、radial gradient；不使用 `filter`、`backdrop-filter`、timer、`requestAnimationFrame`、network、storage 或額外 dependency。

## Acceptance Criteria

- [ ] Runtime 仍只 mount 1 個 `#journeyCorridorDepth`（exactly 5 children）及 1 個 `#journeyApproachDepth`（exactly 3 children）；Shockfront 不增加 DOM child count。
- [ ] 九條既有 direct corridor 保持不同 perspective orientation；八個 Real Space destination 保持獨立 approach anchor／tilt identity。
- [ ] Warp depth 只在 `warpEntry / warp / warpExit` active，`decelerate / approach / observe` inactive。
- [ ] Approach depth 在 `warpExit / decelerate / approach` active，`observe` inactive。
- [ ] Shockfront `::before / ::after` 在 `warpExit` 首個可見取樣已以 compact transform 鎖定目的地 anchor，rendered centre 水平／垂直偏差均 ≤6 px；其後經 `decelerate` 擴張，到 `approach` 降低透明度，`observe` opacity 回到 0。
- [ ] `SOL → LUNA` production Chromium 390×844、360×800 均要實際驗證：
  - warp cruise：`SOL>LUNA`、5 corridor elements、opacity ≥0.65、無水平 overflow；
  - warp exit：兩層 Shockfront 首個可見取樣 rendered centre 均維持 LUNA anchor ±6 px，不能靠放寬 tolerance 通過；
  - approach：LUNA、3 approach elements、far／mid／near 有三個不同 rendered transforms；Shockfront 圍繞 LUNA 左側 approach anchor，而非覆蓋全畫面中央；
  - observation：approach layer及 Shockfront 均 fully faded。
- [ ] Shockfront 不得改 `WarpSim` phase timing、arrival clock、camera authority、route authority、DPR 或 Three.js renderer budget。
- [ ] 完整 `npm run check`、V4 stable hash、route／flight／Hermite、安全及既有 browser gates 保持綠色。

## Out of Scope

- 不增加新星圖節點、航線、距離模型或 Frontier route authority。
- 不重寫既有 warp particles、tunnel rings、threshold flash、Transit Corridor Vistas 或真正 Three.js destination geometry。
- 不永久提高 DPR、不加入 post-processing framework、不用較慢 simulation timing 換畫質。
- 不放寬既有 Shockfront rendered-centre `≤6 px` 驗收門檻去掩蓋 timing／transition 問題。
- 不以 headless Chromium FPS 宣稱手機 60 fps。

## Validation evidence

Exact-head acceptance 由 GitHub Actions、390×844／360×800 production Chromium runtime、warp screenshot、LUNA approach screenshot、PR review receipt共同證明。

視覺驗收重點係 Shockfront 是否由首個可見畫面已鎖定目的地 anchor、讀成「曲速能量／空間層次交接」，而唔係由偏移位置滑入的大型 HUD 或瞄準器；若首次 exact-run screenshot 過強或過弱，需在同一 cycle 調整。

物理 iPhone Safari 長時間熱力／frame pacing、細線／半透明混色仍屬補充證據，不係自動完成 gate。

## Risks / manual checks

- iPhone Safari／不同 GPU 對 1 px border、半透明 gradient 同色域混合可能有差異。
- Shockfront 係 compositor-oriented CSS presentation；長時間熱力仍需物理手機先可量度。
- Approach anchor 本身係視覺構圖資料，不代表真實航向、角度或距離。

## Completion Signal

玩家由曲速走廊脫離時，Shockfront 由首個可見畫面已鎖定 destination-specific 偏心 anchor，再於減速／接近期間自然擴張並淡出，最終完全讓位俾真正 3D 地標。整個 v3 改良增加零 DOM child、零 Three.js draw、零模擬／相機／路線／持久化／網絡權威，同時在兩個主要手機 viewport 有可見及可重複驗證的旅程奇觀提升。
