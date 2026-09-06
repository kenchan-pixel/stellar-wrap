# Warp Corridor Velocity Aperture + Peripheral Starflow + Warp-to-Approach Depth Bridge｜Vertical Slice v6

## Goal / intended player outcome

令完整旅程由「進入曲速 → 曲速巡航 → 脫離 → 減速 → 接近目的地」有更清楚嘅前中後景層次。v5 已用 **Velocity Aperture** 將高速 WebGL 星流分成遠景消失點、中景 corridor 同周邊近景速度線；v6 進一步強化最後一段 arrival handoff：現有三層 Approach Depth 由同心輪廓升級成 **Tangent Parallax Bands｜切線視差光帶**，每個目的地以左右不對稱嘅側光切線、不同旋轉及不同縮放速度，令目的地由 `warpExit → decelerate → approach` 感覺由遠處平面逐步變成立體接近目標，而唔係幾個同心圈一齊放大。

v6 不增加任何 DOM child、Three.js geometry、draw call、triangle、particle 或 canvas；只重用既有 `approachDepthFar / Mid / Near` 三個 bounded presentation plane，在原有 destination anchor 同 phase transition 上加低成本 CSS gradient treatment。真正 3D destination、route、camera、flight timing、DPR、Photo Capture 及 V4+ authority 全部不變。

## Scope

- 保留 v5 `warp-velocity-aperture.js`、v4 Peripheral Starflow、Corridor horizon／rails／rungs、Warp Exit Shockfront 及三層 Approach Depth 架構。
- `journey-corridor-depth.js` 既有三個 Approach planes 維持 exactly 3 children；不新增 presentation node。
- Far／Mid／Near planes 各自加入 bounded radial tangent highlight + low-opacity directional gradient，形成三層唔同尺度嘅側光切線。
- 每個 Real Space destination 仍使用既有 `--approach-x / y / tilt / skew`，另外指定 `--approach-tangent-a / b`，左右交替分佈，避免所有目的地都以相同中央對稱構圖接近。
- `SOL / VEGA / ORION / SIRIUS` 主要切線偏左，`LUNA / CYG / TAU / PROX` 主要切線偏右；次層以相反位置補光，保持中央目標可讀。
- Approach root 喺 `approach` phase 由 `.58` 提升至 `.64`，Far／Mid／Near base opacity 分別調至 `.38 / .48 / .56`，但 `observe` 前仍完全退場。
- 所有效果只由 phase-triggered CSS transition 驅動；不新增 animation loop、timer、network、storage、filter／backdrop-filter、dependency 或 renderer work。
- ≤520 px portrait 仍使用原有 bounded plane dimensions；root `overflow:hidden`，不增加頁面水平 overflow。

## Acceptance Criteria

- [ ] `journeyApproachDepth` runtime 仍 exactly 3 children，`aria-hidden=true`、pointer-transparent；Corridor root 仍 exactly 5 children。
- [ ] 八個 Real Space systems 全部保留獨立 destination anchor／tilt，並有明確 `--approach-tangent-a / b` 配置。
- [ ] Far／Mid／Near 三層各有獨立 tangent highlight treatment，而不是複製同一 gradient；三層仍以不同 transform／scale 推進。
- [ ] `warpExit → decelerate → approach` 仍係唯一 Approach active handoff；`observe` root opacity 0，真正 3D destination 保持最終畫面權威。
- [ ] 390×844、360×800 production Chromium 必須實際完成 `SOL → LUNA` flight transition，Approach screenshot 可見非中央對稱嘅三層側光切線，同時 destination anchor、Shockfront、三層 plane 仍在手機 viewport 內且無水平 overflow。
- [ ] 現有 Warp Corridor production browser gate必須保持：corridor cruise → shockfront → deceleration → approach → observe 連續狀態、三層 transform、Shockfront anchor、viewport bounds 全綠。
- [ ] `npm run check`、V4 stable hash、route／flight／Hermite、安全、offline、Photo／Gallery 及既有 destination browser gates保持綠色。
- [ ] v6 增加 **0 Three.js draw call、0 triangle、0 particle、0 canvas、0 DOM child**；不改 flight timing、route、camera、arrival clock 或 DPR ceiling。
- [ ] module 繼續不含新增 `setInterval`、`setTimeout`、`requestAnimationFrame`、network、storage、Three.js authority、filter／backdrop-filter。

## Out of Scope

- 不改 WebGL warp particle geometry、LineSegments、particle count 或 tunnel ring count。
- 不新增目的地、航線、scanner/checklist、探索規則或 persistence schema。
- 不增加全域 DPR、bloom/post-processing dependency 或第二 renderer。
- 不改既有 destination High/Photo geometry budgets；今輪只處理旅程尾段嘅 approach composition。
- 不以 headless Chromium FPS 代表真實 iPhone 長時間 60 fps。

## Validation evidence

Focused `validate-warp-corridor-depth.mjs` 繼續鎖定 exactly 5 corridor children、exactly 3 Approach children、八目的地／九 corridor、phase authority、Shockfront、mobile bounds、reduced-motion，以及無 timer／renderer／network／storage／filter work。Production `validate-warp-corridor-depth-browser.mjs` 會繼續喺 390×844、360×800 真 Chromium／WebGL 完成 `SOL → LUNA`，實測 corridor cruise、warp exit、deceleration、approach、observe，並輸出 exact-run corridor／Shockfront／Approach screenshots；v6 視覺驗收以同一 Approach screenshot 直接檢查三層 asymmetric tangent highlights 是否形成更清楚嘅側光深度，而非新增另一套測試假 runtime。

物理 iPhone Safari 長時間熱力／frame pacing、OLED 對低亮度 gradient 嘅主觀閱讀仍屬補充證據，不係自動完成 gate。

## Risks / manual checks

- CSS radial／linear gradient 喺不同 GPU 可能有少量 banding；因此 opacity 保持低、bounds 固定，唔用 blur/filter 補救。
- v6 刻意增加 approach 階段嘅側光可讀性，但唔應遮住真正 destination；如某部 OLED 覺得過亮，後續只調 bounded opacity，唔增加 renderer workload。
- Headless SwiftShader 能證明 layout、state、compositing、screenshot 及無 overflow，但實機長時間 thermal／frame pacing 仍只可作 supplementary evidence。

## Completion Signal

玩家由 warp exit 進入減速後，Shockfront 先建立接近感；三層 Approach planes 隨即以不同尺度、旋轉及左右交錯嘅 tangent highlights 展開，畫面由「同心圈放大」變成有側光、前中後景同方向感嘅立體接近構圖。到 `observe` 所有 presentation planes 完全退場，真正 3D destination 接手。整個 v6 不增加 DOM child 或任何 Three.js／GPU geometry budget，亦不改 V4+ 航行、相機、路線、DPR、儲存或網絡權威。