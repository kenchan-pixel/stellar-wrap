# Journey Atmosphere｜航程地方感垂直切片

> 狀態：Draft candidate／自主演進驗證中。這是對已批准 V4.1.0 航行體驗的呈現層增量，不代表新增 V5 產品範圍已獲批准。

## Vertical Slice

### Goal／使用效果

令「飛去不同星區」在真正抵達前已經有可辨認的地方感，而不是所有航段只共享同一套藍色曲速畫面。使用者應可由航程邊緣色調、實際航道景觀、曲速光暈、區域紋理、接近階段的目的地輪廓與簡短航區提示，感受到正在穿越不同空間，而不是只在到站一刻先換景。

### Scope

- `journey-atmosphere.js` 只讀既有 `WarpSim.state()` 的 `current`、`route`、`phase`、`flying`、`contextLost`。
- 每個已批准星區提供一份純展示用目的地 identity：名稱、簡短景觀 signature、顏色與周邊紋理。
- 航行中以現有 route/current 判斷「本航段下一站」，不複製座標、6.0 LY edge table、Dijkstra 或 flight state machine。
- 既有 `warpHalo`、`warpEdge`、`warpFlash` 只透過 CSS variables／selectors 改用目的地色調；Three.js renderer、曲速線、隧道、相機及 timing authority 不變。
- 增加一個位於畫面上緣的細小航道提示，顯示當前真實航段及視覺 signature；只讀、不可操作、不中斷中央 3D 視野。
- 以 250 ms／4 Hz 有界取樣更新 presentation state；不進入 `requestAnimationFrame`。
- prepared-offline shell 繼續快取同一模組。

## Transit Corridor Vistas｜曲速航道景觀

### Goal／使用效果

令曲速巡航本身都有「沿途景觀」。不再只靠目的地色調表達地方感，而是按實際本航段 `from → to` 顯示獨特、低成本、位於畫面邊緣的航道 motif。使用者在長多段旅程中，應可感到每段航路正在穿越不同空間，而不是每次 warp cruise 都完全相同。

目前九條既有可直航邊各有一個 presentation identity：

| 航段 | 航道景觀 | 視覺語意 |
|---|---|---|
| SOL ↔ LUNA | 地月影錐 | 地球反照、月影弧線 |
| SOL ↔ SIRIUS | 冰藍剪切層 | 遠距藍白光、冰晶航跡 |
| SOL ↔ PROX | 紅矮星風交界 | 磁弧微光、赤色粒流 |
| LUNA ↔ VEGA | 星門引導弧 | 月背暗域、藍白導引環 |
| LUNA ↔ PROX | 月背碎岩航帶 | 冷灰碎岩、紅光漸入 |
| VEGA ↔ CYG | 藍紫導引束 | 星門餘輝、雙星導引線 |
| CYG ↔ ORION | 獵戶發射雲絲 | 藍紫航標、赤紅雲絲 |
| TAU ↔ SIRIUS | 冰晶塵海交界 | 粉紫塵層、冰藍碎光 |
| SIRIUS ↔ PROX | 中繼碎星帶 | 中繼環餘光、赤矮星塵 |

以上名稱只描述本產品的科幻模擬航道，不宣稱是真實天文航路或物理現象。

### Implementation Boundary

- 航道 identity 只由既有 active leg 的 `from/to` 映射取得；它**不參與** route validity、距離、Dijkstra、航行時間或目前位置計算。
- 九條映射只覆蓋 `docs/STAR_MAP.md` 現有九條可直航邊；反向航行共用同一景觀 identity，不建立第二份方向資料。
- `#journeyTransit` 只含三個固定 presentation element（far／mid／near）。不新增 canvas、Three.js mesh、shader、粒子系統或 scene authority。
- `warpEntry` 只淡入，`warp` 最清楚，`warpExit` 退場；進入 `decelerate` 前完全讓位給 Approach Vista。
- 動態只用 CSS `transform/opacity`；`prefers-reduced-motion` 會停用新增 drift animation。
- 不新增 storage、network、backend、dependency、timer、observer、`filter`、`backdrop-filter` 或 `requestAnimationFrame`；仍只沿用原本 4 Hz presentation sampler。
- 若出現未知／未配置航段，航道景觀 fail closed 隱藏，但核心航線與飛行不受影響。

## Approach Vista｜目的地接近景觀預告

### Goal／使用效果

在 `warpExit → decelerate → approach` 期間，使用者應開始「睇到自己正去緊邊度」，而唔係等到最後一刻才突然見到目的地。每站會在畫面邊緣逐步浮現低成本、非互動的地標輪廓提示：

- SOL：藍色地球圓弧＋月球。
- LUNA：灰白月面＋遠方地球。
- VEGA：雙層星門輪廓＋藍白主星。
- CYG：雙星光源。
- ORION：紅巨星＋發射塵雲。
- TAU：環行星＋衛星。
- SIRIUS：藍白主星＋中繼環站。
- PROX：紅矮星＋熔岩行星。

這些輪廓只作「接近感／地方感」預告，不取代真正 Three.js 目的地場景。

### Implementation Boundary

- Approach Vista 只使用兩個固定 DOM presentation element（primary／secondary），不新增 canvas、Three.js mesh、粒子場或 shader。
- `warpExit` 只低透明度出現；`decelerate` 增強；`approach` 最清楚；進入 `observe` 立即淡出，讓真正 3D 地標重新成為唯一主景觀。
- 每站輪廓以小範圍 CSS radial gradient／border／transform 組成，刻意靠近畫面邊緣，避免遮擋中央航向與真正地標。
- 不使用 `filter`／`backdrop-filter`、bloom、blur 或新的全屏 compositing layer。
- 目的地身份仍由同一個 active-leg resolver 驅動；多段航程轉站時，Vista 與航區 HUD 同步改為真正下一站。
- `prefers-reduced-motion` 會取消新增 transition。
- 不新增 storage、network、backend、dependency、timer、observer 或 `requestAnimationFrame`；沿用原本 4 Hz journey presentation sampler。

### Acceptance Criteria

1. 八個既有星區都有獨立 destination journey profile；不同目的地不能只顯示同一段文字。
2. 現有九條可直航邊都有一個獨立 Transit Corridor identity，而且正反方向共用同一 identity。
3. `SOL → LUNA → VEGA → CYG → ORION` 在 CYG 出發時必須由既有 current／route 正確識別 `CYG → ORION`，顯示「獵戶發射雲絲」及第 4/4 航段，而不是另行計算路線。
4. 反向航段例如 `PROX → SIRIUS` 必須沿用 `SIRIUS ↔ PROX` 的「中繼碎星帶」，不可因 key 方向不同而失去景觀。
5. Transit Corridor 只在 `warpEntry → warp → warpExit` 出現；`decelerate`／`approach`／`observe` 必須退場，避免同 Approach Vista 疊加。
6. Transit Corridor 只含三個固定 DOM motif，不增加新 renderer loop、Three.js geometry、shader、filter 或大量透明粒子。
7. `turn`／`accelerate` 只提供低強度目的地航區預告；`warpEntry`／`warp` 保留原有曲速主視覺。
8. Approach Vista 只在既有 `warpExit → decelerate → approach` 漸進出現，`observe` 必須淡出，不延後、重設或改寫任何 phase。
9. 八站 Approach Vista 至少各有一個不同的 primary landmark treatment；TAU 保留環狀行星輪廓，VEGA／SIRIUS 保留人工環結構語意，CYG 保留雙星語意。
10. WebGL context lost、idle、exploration 或非法 route state 時，新增 overlay／提示／Transit／Vista 必須 fail closed 並隱藏。
11. 中央 canvas、核心地標、相機、航行方向、抵達 Hermite profile、聲音、星圖、探索及自動畫質不可被接管或刪減。
12. 模組不可使用 persistence、backend、network request、額外 dependency、`filter`／`backdrop-filter` 或 `requestAnimationFrame`。
13. `npm run check` 必須包含 focused journey-atmosphere validator；V4.0 immutable hash、既有 route／flight／arrival checks 保持通過。

### Out of Scope

- 本輪不新增第 9 個星區；新增 location 仍需要座標、route graph、三方向抵達構圖及手機星圖驗證。
- 不改真正 Three.js 目的地 geometry；本輪改善「途中航道 → 接近目的地 → 真正 3D 地標」的視覺連續性。
- 不改 Three.js 曲速 particle geometry／shader，不增加大量透明粒子、bloom、後處理或新 dependency。
- 不改飛行 timing、warp multiplier、方向、相機 FOV 曲線、arrival profile 或 route planner。
- 不新增駕駛艙式大型 HUD、任務、掃描器、discovery persistence 或遊戲經濟。

### Validation Evidence

自動驗證應覆蓋：

- `journey-atmosphere.js` JavaScript syntax。
- 八個 destination profiles。
- 九個 Transit Corridor profiles 及正反方向解析。
- 多段 route 由既有 current／route 正確解出下一站及航段編號。
- CYG→ORION、LUNA→VEGA、PROX→SIRIUS 等實際航道 identity 真正切換。
- Transit DOM 只包含 bounded far／mid／near presentation layer，並只在 warp phases 出現。
- Approach Vista DOM 只包含 bounded primary／secondary presentation layer。
- 八站均有 destination-specific Vista treatment。
- Vista 的 phase contract 為 `warpExit → decelerate → approach` 漸進、`observe` 清除。
- context lost／idle／malformed route fail closed。
- 無 storage、network、render-loop、route graph authority、Three.js scene authority、blur/filter。
- Service Worker 仍快取 `journey-atmosphere.js`；因沒有新增 shell file，不需要無意義地再升 cache generation。
- `npm run check` 納入 focused validator。

### Risks／需人手確認

- CSS 漸層／邊線在 iPhone Safari／不同色域螢幕上的實際亮度可能不同；需確認不會洗白主景觀。
- 需在 390×844 類手機直向確認航道提示、Transit Corridor 及 Approach Vista 不與現有 HUD、flight bar、diagnostics 或中途 explore card 撞位。
- 需實機跑 `SOL → LUNA`、`SOL → ORION`、`ORION → TAU`，確認每個中途站轉向後 Corridor／identity／Vista 跟下一航段同步，沒有延遲到錯站。
- 特別確認 `CYG → ORION` 的赤紅雲絲、`LUNA → VEGA` 的導引環及 `SIRIUS ↔ PROX` 反向共用景觀在人眼上有差異，而中央曲速隧道仍然清楚。
- 需確認 Transit 在 `warpExit` 已淡出，`decelerate` 起只由 Approach Vista 接手，不會有兩套視覺疊住。
- 需確認 Approach Vista 在 `warpExit` 只作預告，`approach` 足夠清楚，而 `observe` 完全退場，不會遮住真正 3D landmark。
- 需實機觀察 warp entry／exit 是否仍保留原有清晰星線、隧道與連續抵達效果。
- 需以實機 diagnostics 比較前後 FPS／DPR／熱力；本切片只可宣稱「三個固定 DOM motif、無新增 render-loop／filter work」，不可宣稱已達穩定 60 fps。
- prepared-offline reload 需確認同一 v13 shell 仍正常載入更新後的 `journey-atmosphere.js` network-first／cache fallback 行為。

### Completion Signal

- `autonomous-evolution` exact HEAD 的完整 `npm run check` 成功。
- Vercel Preview／部署檢查沒有程式 build failure；如只是外部 rate limit，必須明確列為 preview evidence gap。
- Exact-HEAD review 沒有未解 P0／P1；若出現 substantive review finding，下一輪優先修正而不是再擴展新景觀。
- Draft PR 保持未合併、未 production deploy，等待 owner 實機視覺驗收。
