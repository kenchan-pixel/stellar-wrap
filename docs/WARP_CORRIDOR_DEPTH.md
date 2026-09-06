# Warp Corridor Cinematic Handoff｜Vertical Slice v7

## Goal / intended player outcome

令完整旅程嘅速度感唔只靠星線數量，而係由 `warpEntry → warp → warpExit → decelerate → approach` 有清楚嘅空間收放：進入曲速時速度視窗收窄、巡航時穩定打開、脫離時向外擴散，再交棒畀既有 Shockfront 同 Tangent Parallax approach。玩家應感到自己真正穿過一條高速空間通道，而唔係只睇一層固定暗角。

今輪加入 **Velocity Aperture Expansion v6**。它保留既有 `velocity-aperture-v5` architecture，只改兩個零 child pseudo-elements 嘅 phase-driven transform；不新增 DOM、canvas、Three.js geometry、draw call、triangle、particle、renderer、DPR 或模擬工作。

Inherited baseline：**Tangent Parallax Bands（Vertical Slice v6）**、Peripheral Starflow、Corridor horizon／rails／rungs、Warp Exit Shockfront、八目的地 approach anchors 全部保持不變。

## Scope

- `warp-velocity-aperture.js` architecture token 維持 **`velocity-aperture-v5`**；新增 motion treatment token **`velocity-aperture-expansion-v6`**，避免把視覺調整誤當架構替換。
- Aperture root 保持 **z-index 4**；`#journeyTransit` 保持 **z-index 5**，所以 corridor cues 永遠位於 attenuation layer 上方。
- 兩個現有 pseudo-elements 保持零 DOM child：
  - `warpEntry`：中央 attenuation `0.88 × 0.80`，外圍 rim `0.92 × 0.86`，形成較緊入口。
  - `warp`：中央 `1.00 × 0.94`，外圍 `1.04 × 1.00`，形成穩定巡航視窗。
  - `warpExit`：中央 `1.16 × 1.08`，外圍 `1.20 × 1.12`，形成向外釋放嘅脫離感。
- 原有 root／pseudo opacity 保持 v5 驗證值，避免同時大改亮度與尺度而難以判斷回歸。
- Transform 只由現有 phase CSS transition 觸發；無 `requestAnimationFrame`、timer、polling、network、storage、filter／backdrop-filter 或新 renderer work。
- `prefers-reduced-motion` 會移除 aperture transform transition；仍保留各 phase 靜態構圖，不製造持續動畫。
- `decelerate` 開始 aperture root 仍完全退場，由 Shockfront、Tangent Parallax Bands 及真正 3D destination 接管畫面。

## Acceptance Criteria

- [ ] `warpVelocityAperture` runtime 仍 exactly 0 children、`aria-hidden=true`、pointer-transparent，無新增 canvas。
- [ ] `velocity-aperture-v5` architecture 與 `velocity-aperture-expansion-v6` motion treatment 同時可由 source／diagnostic snapshot 核對。
- [ ] Entry／Cruise／Exit 三個 phase 使用上述 bounded anisotropic scales；Cruise v5 opacity contract 維持 root `1.0`、central `.62`、rim `.65`，Exit 保持 `.55 / .42 / .25`。
- [ ] 390×844、360×800 production Chromium 真實完成 `SOL → LUNA`；Warp Aperture、Corridor、Shockfront、Approach、Observe phase 全部按既有路線連續交接，無黑畫面或水平 overflow。
- [ ] Cruise screenshot 仍見中央較安靜、周邊高速星流與上層 corridor cues；Warp Exit screenshot 應見 aperture 已向外打開，而唔係維持巡航時同一固定形狀。
- [ ] Corridor/transit stacking 維持 `4 < 5`，horizon、rails、rungs 保持可讀；`decelerate` 前 aperture 清走。
- [ ] Tangent Parallax Bands v6、八 Real Space destinations、Photo／Gallery、offline、route、continuous arrival、V4 stable hash 及安全檢查保持 green。
- [ ] 今輪增加 **0 Three.js draw call、0 triangle、0 particle、0 canvas、0 DOM child**；不改 route、camera、flight timing、arrival clock、DPR ceiling 或 persistence schema。

## Out of Scope

- 不新增 warp 粒子、隧道環、post-processing、bloom、blur 或第二 renderer。
- 不改 Star Map、Dijkstra、6.0 LY routing、航行時間或 Hermite arrival profile。
- 不新增目的地、scanner／checklist、帳戶、backend 或網絡依賴。
- 不調高全局 DPR；Photo Capture 仍只使用既有短暫 High tier。
- 不以 headless Chromium 宣稱實機穩定 60 fps。

## Validation evidence

Focused `validate-warp-velocity-aperture.mjs` 鎖定 v5 architecture、v6 motion treatment、三段 bounded scales、opacity、stacking、零 child／零 canvas、reduced-motion，以及無 timer／render-loop／network／storage／Three.js／filter authority。

現有 production browser gates 繼續以 390×844、360×800 真 Chromium／WebGL 跑完整 `SOL → LUNA`。`validate-warp-velocity-aperture-browser.mjs` 驗證 cruise aperture、真 WebGL canvas 數量、`z-index 4 < 5`、corridor 可讀性、warpExit opacity 同 deceleration 清場；`validate-warp-corridor-depth-browser.mjs` 同一航程再捕捉 Warp、Warp Exit Shockfront、Approach Tangent Parallax 及 Observe handoff screenshots，作今輪實際視覺核對。

## Risks / manual checks

- 兩個 full-frame pseudo-elements 有額外 transform compositing，但沒有新 layer 數量、filter 或 pixel-density 成本；手機長時間 thermal／frame pacing 仍需作 supplementary physical-device evidence。
- 不同 Safari／GPU 對 radial gradient 及透明混色可能略有差異；今輪保持 v5 原 opacity 以限制風險。
- `prefers-reduced-motion` 只顯示 phase 靜態尺度，避免過場 interpolation。

## Completion Signal

由起飛進入曲速時，速度 aperture 明顯較緊；巡航時打開成穩定消失點視窗；脫離曲速時兩層 aperture 以不同尺度向外釋放，之後在 deceleration 前完全清走，Shockfront → Tangent Parallax → 真 3D destination 連續接手。Exact-head CI、兩個手機 viewport 真 Browser gate及 exact-head review 均通過，而且沒有 actionable P0/P1/P2。
