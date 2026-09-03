# VESPER Atmospheric Harvest Hero Vista

## Goal / 使用效果

令 `VESPER YARD｜暮環採集場` 在 Frontier 固定單角度景觀中第一眼讀成「正在抽取氣巨星大氣的工業前線」，而不是一粒平面青綠色行星配一個環站。手機直向應同時看到有層次的風暴帶、巨型橢圓風暴、橙白採集環、明確的採集入口與維修燈，提升抵達及留影辨識度。

本切片服從已批准 D-015：玩家仍只看策展好的固定英雄構圖；Real Space 的 V4.1 航線、轉向、曲速、連續抵達及自由到站探索完全不改。

## Scope

- 保留 VESPER 單一 Three.js renderer／camera、現有星場、氣巨星、工業環、貨運群、capture API 及 Scenic shell。
- 以瀏覽器即時產生的 `384×192` CanvasTexture 加入多層大氣條帶及一個橢圓巨型風暴；不下載外部貼圖。
- 新增兩個 bounded instanced detail objects：
  - 8 個採集入口／scoop intakes，共用低面數六角 CylinderGeometry；
  - 16 個工業維修燈，共用 BoxGeometry。
- `WarpFrontierVesper.state()` 暴露 `VESPER_HARVEST_V2`、storm texture 尺寸及兩組 detail count，供 exact-head 驗證。
- 仍受 Frontier backend 總上限 `≤18 draw calls / ≤24,000 triangles`、normal DPR `≤1.25`、capture DPR `≤1.60` 保護。

## Acceptance Criteria

1. 390×844 及 360×800 fixed `overview` 均清楚看到有層次的氣巨星風暴帶與工業採集結構。
2. VESPER 必須維持單一 renderer、無外部圖片／額外 dependency／第二 animation loop。
3. 新增工業細節固定為 8 個 collector intakes + 16 個 service lights，並以 InstancedMesh 控制 draw cost。
4. 兩個手機 viewport 均通過現有 four-backend production Chromium gate：fixed overview、`autoOrbit=false`、renderer budget、capture boost、DPR/backing-buffer restore 及 screenshot evidence。
5. Real Space V4+ route / flight / Hermite arrival、Frontier selector / confirmation / handoff、AURELIA / NADIR / EIDOLON 均不得回歸。
6. `npm run check` 全綠。

## Out of Scope

- 不新增 Frontier LY、Dijkstra、飛行時間或第二套 route authority。
- 不新增目的地、scanner／checklist、自由旋轉入口或新的導航層。
- 不永久提高 DPR、不加入 post-processing 套件或外部材質資產。
- 不修改 V4 模擬 timing、Real Space 相機 authority 或持久儲存。

## Validation / Risks

自動驗證可證明 profile／detail count、renderer 數量、無外部材質載入、draw／triangle budget、固定 scenic state、capture restore 與兩個手機 viewport 的實際 WebGL 畫面。

CI 截圖仍需由 agent 自行檢查：風暴帶／巨型風暴是否可辨、採集入口是否形成清楚 silhouette、工業環沒有被行星遮沒。實體 iPhone Safari 的長時間熱力、frame pacing 及個別 GPU 色彩混合屬 supplementary evidence，不是完成 blocker。

## Completion Signal

兩個手機驗收尺寸都可立即辨認 VESPER 為「氣巨星大氣採集工業區」，而非平面行星背景；renderer/capture/V4+ 回歸 gate 全綠，並推送至 persistent Draft PR。
