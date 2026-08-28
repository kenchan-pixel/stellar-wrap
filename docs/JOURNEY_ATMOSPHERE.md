# Journey Atmosphere｜航程地方感垂直切片

> 狀態：Draft candidate／自主演進驗證中。這是對已批准 V4.1.0 航行體驗的呈現層增量，不代表新增 V5 產品範圍已獲批准。

## Vertical Slice

### Goal／使用效果

令「飛去不同星區」在真正抵達前已經有可辨認的地方感，而不是所有航段只共享同一套藍色曲速畫面。使用者應可由航程邊緣色調、曲速光暈、區域紋理與簡短航區提示，感受到正在進入月域、藍白星門、雙星航標、赤紅星雲、粉紫塵海、冰藍中繼站或赤矮星港等不同空間。

### Scope

- 新增 `journey-atmosphere.js`，只讀既有 `WarpSim.state()` 的 `current`、`route`、`phase`、`flying`、`contextLost`。
- 每個已批准星區提供一份純展示用航區 identity：航區名稱、簡短景觀 signature、顏色與周邊紋理。
- 航行中以現有 route/current 判斷「本航段下一站」，不複製座標、6.0 LY edge table、Dijkstra 或 flight state machine。
- 既有 `warpHalo`、`warpEdge`、`warpFlash` 只透過 CSS variables／selectors 改用目的地色調；Three.js renderer、曲速線、隧道、相機及 timing authority 不變。
- 增加一個位於畫面上緣的細小航區提示，顯示當前航段及目的地 signature；只讀、不可操作、不中斷中央 3D 視野。
- 以 250 ms／4 Hz 有界取樣更新 presentation state；不進入 `requestAnimationFrame`。
- prepared-offline shell 同步快取此模組。

### Acceptance Criteria

1. 八個既有星區都有獨立 journey profile；不同目的地不能只顯示同一段文字。
2. `SOL → LUNA → VEGA → CYG → ORION` 航程在 CYG 出發時必須識別下一站為 ORION，提示顯示第 4/4 航段，而不是另行計算路線。
3. VEGA、CYG、ORION、TAU、SIRIUS、PROX 至少具有可辨認的周邊色調／紋理差異；SOL／LUNA 維持較乾淨的地月航域風格。
4. `turn`／`accelerate` 只提供低強度預告；`warpEntry`／`warp` 最強；`warpExit` → `decelerate` → `approach` 逐步降低但保持目的地 identity，沒有改變原本 phase 時間。
5. WebGL context lost、idle、exploration 或非法 route state 時，新增 overlay／提示必須 fail closed 並隱藏。
6. 中央 canvas、核心地標、相機、航行方向、抵達 Hermite profile、聲音、星圖、探索及自動畫質不可被接管或刪減。
7. 模組不可使用 persistence、backend、network request、額外 dependency 或 `requestAnimationFrame`。
8. `npm run check` 必須包含 focused journey-atmosphere validator；V4.0 immutable hash、既有 route／flight／arrival checks 保持通過。

### Out of Scope

- 本輪不新增第 9 個星區；新增 location 仍需要座標、route graph、三方向抵達構圖及手機星圖驗證。
- 不改 Three.js 曲速 particle geometry／shader，不增加大量透明粒子、bloom、後處理或新 dependency。
- 不改飛行 timing、warp multiplier、方向、相機 FOV 曲線、arrival profile 或 route planner。
- 不新增駕駛艙式大型 HUD、任務、掃描器、discovery persistence 或遊戲經濟。

### Validation Evidence

自動驗證應覆蓋：

- `journey-atmosphere.js` JavaScript syntax。
- 八個 journey profiles。
- 多段 route 由既有 current／route 正確解出下一站及航段編號。
- ORION／VEGA 等目的地 identity 真正切換。
- context lost／idle／malformed route fail closed。
- 無 storage、network、render-loop、route graph、Three.js scene authority。
- Service Worker 新 cache generation 包含 journey atmosphere。
- `npm run check` 納入 focused validator。

### Risks／需人手確認

- CSS 漸層在 iPhone Safari／不同色域螢幕上的實際亮度可能不同；需確認不會洗白主景觀。
- 需在 390×844 類手機直向確認航區提示不與現有 HUD、flight bar、diagnostics 或中途 explore card 撞位。
- 需實機跑 `SOL → LUNA`、`SOL → ORION`、`ORION → TAU`，確認每個中途站轉向後 identity 跟下一航段同步，沒有延遲到錯站。
- 需實機觀察 warp entry／exit 是否仍保留原有清晰星線、隧道與連續抵達效果。
- 需以實機 diagnostics 比較前後 FPS／DPR／熱力；本切片只可宣稱「無新增 render-loop work」，不可宣稱已達穩定 60 fps。
- prepared-offline reload 需確認新模組由 v13 shell 正常載入。

### Completion Signal

- `autonomous-evolution` exact HEAD 的完整 `npm run check` 成功。
- Vercel Preview／部署檢查沒有程式 build failure。
- Exact-HEAD review 沒有未解 P0／P1；若出現 substantive review finding，下一輪優先修正而不是再擴展新景觀。
- Draft PR 保持未合併、未 production deploy，等待 owner 實機視覺驗收。
