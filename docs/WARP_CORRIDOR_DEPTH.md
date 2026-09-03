# Warp Corridor + Warp-to-Approach Depth Bridge｜Vertical Slice v2

## Goal / intended player outcome

令完整旅程由「進入曲速 → 曲速巡航 → 脫離 → 減速 → 接近目的地」有連續空間尺度，而唔係曲速有透視、到接近階段又突然變回平面提示。

第一段 `#journeyCorridorDepth` 保留中央消失點、左右 rail、rungs 同 near frame；第二段新增 `#journeyApproachDepth`，在真正 3D 目的地出現前，以 far／mid／near 三層低成本視覺平面圍繞既有 Approach Vista，令目的地由遠至近逐步建立景深。

## Scope

- 保留現有 Warp Corridor Perspective Depth：5 個 pointer-transparent DOM elements，只在 `warpEntry / warp / warpExit` 活躍。
- 同一個 `journey-corridor-depth.js` 新增 **Warp-to-Approach Depth Bridge**：3 個 pointer-transparent DOM elements（far／mid／near）。
- Approach Depth 只在既有 `warpExit / decelerate / approach` 活躍；`observe` 前完全清走，真正 Three.js 目的地場景保持唯一主景觀。
- 八個 Real Space 目的地各有固定 anchor／tilt／skew，身份只讀 `Journey Atmosphere` 現有 `data-system`；不複製星圖座標、航線或距離資料。
- far／mid／near 在相同 phase 使用不同 scale／rotation，形成視差層次；只用 `transform`、`opacity`、border／gradient。
- `prefers-reduced-motion` 停止 transition／animation，但保留靜態深度 cue。
- 不增加新 shell file；prepared offline shell 繼續快取同一 `journey-corridor-depth.js`。

## Acceptance Criteria

- [ ] Runtime 只 mount 1 個 `#journeyCorridorDepth`（exactly 5 children）及 1 個 `#journeyApproachDepth`（exactly 3 children）。
- [ ] 九條既有 direct corridor 保持不同 perspective orientation；八個既有 Real Space destination 都有獨立 approach anchor／tilt identity。
- [ ] Warp depth 只在 `warpEntry / warp / warpExit` active，`decelerate / approach / observe` inactive。
- [ ] Approach depth 在 `warpExit / decelerate / approach` active，`observe` inactive；final observation 時 opacity 必須回到 0。
- [ ] `SOL → LUNA` production Chromium 390×844、360×800 均要實際驗證：
  - warp cruise：`SOL>LUNA`、5 corridor elements、opacity ≥0.65、無水平 overflow；
  - approach：LUNA、3 approach elements、opacity ≥0.52、far／mid／near 有三個不同 rendered transforms；
  - observation：approach layer inactive 並 fully faded。
- [ ] Corridor fade-out 同 approach fade-in 不得改 `WarpSim` phase timing、arrival clock、camera authority 或 route authority。
- [ ] 不新增 Three.js renderer／scene object、network、storage、timer、`requestAnimationFrame`、dependency、`filter` 或 `backdrop-filter`。
- [ ] 完整 `npm run check`、V4 stable hash、route／flight／Hermite、安全及既有 browser gates 保持綠色。

## Out of Scope

- 不增加新星圖節點、航線、距離模型或 Frontier route authority。
- 不重寫既有 warp particles、tunnel rings、threshold flash、Transit Corridor Vistas 或真正 Three.js destination geometry。
- 不永久提高 DPR、不加入 post-processing framework、不用較慢 simulation timing 換畫質。
- 不以 headless Chromium FPS 宣稱手機 60 fps。

## Validation evidence

Exact-head acceptance 由 GitHub Actions、390×844／360×800 production Chromium runtime、warp screenshot、LUNA approach screenshot、PR review receipt 共同證明。

物理 iPhone Safari 長時間熱力／frame pacing、細線／半透明混色仍屬補充證據，不係自動完成 gate。

## Risks / manual checks

- iPhone Safari／不同 GPU 對 1 px border、半透明 gradient 同色域混合可能有差異；需實機時可補驗對比度。
- 新 approach depth 應保持在目的地輪廓周邊，避免讀成大型 HUD／瞄準器；browser screenshot 需確認中央真正接近景觀仍清楚。
- CSS transition 為 compositor-oriented，但長時間熱力仍需物理手機先可量度。

## Completion Signal

玩家由曲速走廊脫離後，會自然由中央透視速度感交接到目的地 far／mid／near 接近層次，再在 `observe` 前完全讓位俾真正 3D 地標。整段新增視覺只服從既有 corridor／destination／phase presentation authority，無新增模擬、renderer、持久化或網絡權威。
