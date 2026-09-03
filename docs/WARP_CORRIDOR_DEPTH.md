# Warp Corridor Perspective Depth｜Vertical Slice

## Goal / intended player outcome

令曲速航程本身更有空間尺度，而唔只靠星線、光環同平面路線裝飾。玩家由 `warpEntry → warp → warpExit` 應該睇到一個由中央消失點向手機畫面邊緣擴張嘅透視走廊，強化速度、前後景同「正在穿越一條真實航道」嘅感覺。

## Scope

- 在既有 `Journey Atmosphere`／`#journeyTransit` 之內加入一個 bounded 透視深度層。
- 只使用 5 個 pointer-transparent DOM presentation elements：中央 horizon、左右 rail、rungs、near frame。
- 九條已存在 direct corridor 共用同一視覺系統，但各自有不同 tilt／shift／skew，方向身份由既有 `data-corridor` 提供。
- `warpEntry` 收窄進場、`warp` 展開並以 compositor transform／background-position 表現前進、`warpExit` 放大淡出。
- `decelerate` 前完全清走，保持 Approach Vista 及真 3D destination scene 權威。
- `prefers-reduced-motion` 停止新 animation，但保留靜態 corridor depth cue。
- prepared offline shell 直接以現有 `sw.js CORE` authority 包含新 module；不建立第二份 file list。

## Acceptance Criteria

- [ ] runtime 只 mount 1 個 `#journeyCorridorDepth`，內含 exactly 5 個視覺元素。
- [ ] 九條現有 direct corridor 都有穩定且可辨認嘅 perspective orientation。
- [ ] layer 只於 `warpEntry / warp / warpExit` 可見；`decelerate / approach / observe` 為 0 opacity。
- [ ] 不改 `WarpSim` route、Dijkstra、座標、phase timing、arrival clock 或 camera authority。
- [ ] 不新增 Three.js renderer／scene object、network、storage、timer、requestAnimationFrame 或 dependency。
- [ ] 不使用 `filter`／`backdrop-filter`；主要 motion 只用 transform、opacity、background-position。
- [ ] 390×844 及 360×800 production Chromium 實際完成 `SOL → LUNA`，在 `warp` 期讀到 active depth layer、`SOL>LUNA` corridor identity、5 個 bounded elements，無水平 overflow。
- [ ] 兩個手機 viewport 都輸出 real runtime screenshot，視覺上要見到中央消失點、兩側透視 rail/rungs，同時唔遮擋主要曲速中心。
- [ ] 完整 `npm run check`、V4 stable hash、route/flight/Hermite、安全及既有 browser gates 保持綠色。

## Out of Scope

- 不增加新星圖節點、航線、距離模型或 Frontier route authority。
- 不重寫既有 warp particles、tunnel rings、threshold flash 或 corridor landmark flybys。
- 不永久提高 DPR、不加入 post-processing framework、不用較慢 simulation timing 換畫質。
- 不以 headless Chromium FPS 宣稱手機 60 fps。

## Validation evidence

完成後由 exact-head GitHub Actions、390×844／360×800 production Chromium runtime、screenshots、PR review receipt 填寫。物理 iPhone Safari 長時間熱力／frame pacing 屬補充證據，不係自動完成 gate。

## Risks / manual checks

- 不同 Safari／GPU 對細線與半透明 gradient contrast 可能有差異；需要時可在實機補驗亮度，但唔阻塞有完整 browser/runtime 證據嘅 cycle。
- CSS animation 由 compositor 執行，但長時間裝置熱力仍需物理手機先可以量度。

## Completion Signal

玩家在曲速三階段能明顯感受到「向中央消失點穿越、近景由兩側掠過」嘅走廊尺度；新層完全服從既有 corridor／phase presentation authority，進入減速前消失，並且無新增模擬、renderer、持久化或網絡權威。
