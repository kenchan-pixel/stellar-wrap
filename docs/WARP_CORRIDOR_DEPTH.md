# Warp Corridor Velocity Aperture + Peripheral Starflow + Warp-to-Approach Depth Bridge｜Vertical Slice v5

## Goal / intended player outcome

令完整旅程由「進入曲速 → 曲速巡航 → 脫離 → 減速 → 接近目的地」有更清楚嘅前中後景層次。現有真 Three.js 星流喺手機直向畫面會形成大量由消失點向外延伸嘅高亮長線；速度感強，但中景同中央航向有機會同近景線條黏埋一層。v5 加入 **Velocity Aperture｜速度景深光圈**：在不改粒子、draw call、DPR 或模擬時間下，壓低中央／中景星流亮度、保留周邊近景速度線，令消失點、Corridor rails/rungs 同周邊 Starflow 分成更清楚嘅三層。

v5 保留 v4 Warp Corridor Perspective Depth、Peripheral Starflow、三層 Approach Depth 同 Warp Exit Shockfront。新 `velocity-aperture-v5` 只係一個零-child presentation root；視覺全部由兩個 pseudo-element 完成，直接覆蓋既有 WebGL 星流而不建立第二個 renderer 或粒子系統。

## Scope

- 新增 `warp-velocity-aperture.js`，由既有 Exploration Focus Tray loader 載入。
- Runtime 只 mount 1 個 `#warpVelocityAperture`，exactly 0 child；兩層效果只用 `::before / ::after`。
- `::before` 係 bounded 中央／中景 attenuation field：desktop `48% × 34%` ellipse；≤520 px portrait `50% × 35%` ellipse；最深色值固定 `rgba(1,3,9,.68)`，不使用 filter 或 backdrop-filter。
- `::after` 係低亮度周邊 depth rim：`72% × 56%` ellipse 加左右 route-colour edge tint，保留近景速度線閱讀，而唔新增線條。
- Phase contract：`warpEntry` 弱淡入；`warp` full root opacity，中央 attenuation pseudo opacity `.62`、周邊 rim `.65`；`warpExit` 收弱；`decelerate / approach / observe` 完全透明，交返畫面權威畀 Shockfront、Approach Vista 同真正 3D destination。
- 不使用 animation loop、timer、network、storage、新 dependency、Three.js geometry、post-processing 或第二個 canvas。
- Prepared offline shell 升級至 v19，包含新 module；離線就緒仍要求完整現行 `CORE` + 固定 Three.js。

## Acceptance Criteria

- [ ] Runtime `#warpVelocityAperture` exactly 1 個、0 child、`aria-hidden=true`、pointer-transparent；`WarpWarpVelocityAperture.snapshot()` 回報 `architecture: velocity-aperture-v5`。
- [ ] `warpEntry / warp / warpExit` 係唯一 active phases；`decelerate / approach / observe` 必須 opacity 0。
- [ ] Warp cruise 中央 attenuation field 保持 bounded：desktop `48% × 34%`、portrait `50% × 35%`；pseudo opacity `.62`。
- [ ] Warp cruise peripheral rim 保持 bounded：`72% × 56%`；pseudo opacity `.65`；不遮住中央 vanishing-point horizon／rails／rungs。
- [ ] 現有 v4 Peripheral Starflow 左右兩層仍保留 route-specific tilt/skew、不同 parallax rate；v5 不增加 DOM child。
- [ ] 現有 Shockfront／Approach depth phase handoff 不變：`warpExit → decelerate → approach`，`observe` 前退場。
- [ ] `SOL → LUNA` production Chromium 390×844、360×800 仍要實際完成 route／flight state transitions，同一 Warp Starflow screenshot 應見中央／中景亮度被分級、周邊近景速度線保留、無水平 overflow。
- [ ] `npm run check`、V4 stable hash、route／flight／Hermite、安全、offline 及既有 browser gates 保持綠色。
- [ ] 新 layer 增加 **0 Three.js draw call、0 triangle、0 particle、0 canvas**；不改 `MAX_WARP`、tunnel rings、camera authority、phase timing、arrival clock、DPR ceiling 或 route authority。
- [ ] 新 module 不含 `setInterval`、`requestAnimationFrame`、`fetch`、local/session storage、Three.js import、filter/backdrop-filter。

## Out of Scope

- 不重寫核心 WebGL warp particle geometry／LineSegments buffer；不改 particle count 或 tunnel ring count。
- 不新增星圖節點、航線、目的地、Frontier content、scanner/checklist 或探索規則。
- 不提高全域 DPR、不加入 bloom/post-processing framework、不以較慢 simulation timing 換畫質。
- 不改現有 Photo Capture、Gallery、Travel Journal、Arrival Debrief 或 persistence schema。
- 不以 headless Chromium FPS 宣稱真實 iPhone 60 fps。

## Validation evidence

Exact-head acceptance 由完整 GitHub Actions、focused `validate-warp-velocity-aperture.mjs`、既有 Warp Corridor／Warp Starflow production Chromium gates、390×844／360×800 exact-run Warp Starflow screenshots、offline manifest validation、PR exact-head review receipt共同證明。

視覺驗收重點：中央消失點附近唔應該再同大量高亮中景線條讀成同一平面；中景會被低成本深色光圈稍為壓低，而畫面周邊仍保留高速近景線，形成「遠景消失點 → 中景 corridor → 近景 starflow」三級閱讀。去到 `warpExit` 後，Velocity Aperture 必須收走，讓 Shockfront 同真正 destination 接手。

物理 iPhone Safari 長時間熱力／frame pacing、不同 GPU 對半透明 gradient 混色仍屬補充證據，不係自動完成 gate。

## Risks / manual checks

- CSS gradient 喺不同手機 GPU 可能有少量 banding／混色差異；因此 production Chromium screenshot 只係最低可重複 visual gate。
- 新 layer 無 filter、無動畫 loop、無新 DOM child hierarchy，但實機長時間 compositor／熱力仍只能由物理手機補充量度。
- 中央 attenuation 如果喺特定 OLED／亮度設定顯得過深，後續只需調整 bounded opacity，唔應以增加 renderer workload 修正。

## Completion Signal

玩家進入 warp cruise 後，既有真 WebGL 星流仍提供高速穿越感，但畫面會由 v5 Velocity Aperture 將中央／中景亮度壓成較安靜嘅遠景層，周邊星流保持最強近景速度感，原有 horizon／rails／rungs 因而更易讀。到 `warpExit` 光圈退場，再由既有 Shockfront → Approach Depth → 真 3D destination 連續接手。整個 v5 增加零 Three.js draw／triangle／particle／canvas，亦不改航行、相機、路線、DPR、持久化或網絡權威。