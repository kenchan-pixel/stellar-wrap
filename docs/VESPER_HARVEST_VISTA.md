# VESPER Atmospheric Harvest Depth v3

## Goal / 使用效果

令 `VESPER YARD｜暮環採集場` 在 Frontier 固定英雄構圖中，除咗有氣巨星風暴帶及發光工業環之外，仲有明確嘅前／後景採集結構深度：玩家喺手機直向抵達或留影時，可以一眼讀到「大型採集機械伸入氣巨星大氣層」嘅尺度，而唔只係一個平面環站。

本切片服從已批准 D-015：Frontier Fiction 仍以策展好的固定 Scenic 英雄構圖為主要體驗；Real Space V4.1 航線、轉向、曲速、連續抵達及自由到站探索完全不改。

## Scope

- 保留現有 `VESPER_HARVEST_V2` 基礎：單一 Three.js renderer／camera、`384×192` 程序化風暴貼圖、8 個 collector intakes、16 個 service lights、工業環、採集索、貨運群及 Capture API。
- 升級 runtime profile 為 `VESPER_HARVEST_V3`。
- 新增兩個 bounded static InstancedMesh detail objects：
  - 12 個 radial harvest booms，以低面數 BoxGeometry 從主環向外伸展；
  - 12 個 condenser vanes，置於採集臂外端形成可辨識冷凝／散熱翼 silhouette。
- 兩組新結構交替置於 `+3.6 / -3.2` local Z，形成固定 `6.8` local-unit 前後景跨度；沒有逐幀幾何更新。
- 新增成本固定為 2 draw calls／288 triangles；由現有約 15 draws／14,064 triangles 提升至預期約 17 draws／14,352 triangles，仍低於 Frontier backend `≤18 draws / ≤24,000 triangles` 上限。
- `WarpFrontierVesper.state()` 暴露 boom／vane 數量、depth span、detail object／triangle cost，供 exact-head browser gate 驗證。

## Acceptance Criteria

1. 390×844 及 360×800 fixed `overview` 均可見氣巨星、工業主環，以及有前後層次嘅採集臂／冷凝翼；畫面無黑屏、關鍵構圖無 viewport clipping。
2. VESPER 維持單一 renderer、單一 render loop、無外部圖片／額外 dependency／新增 network 或 storage authority。
3. 新增細節固定為 12 harvest booms + 12 condenser vanes，以兩個 InstancedMesh 控制成本；depth span 固定 6.8 local units。
4. 兩個手機 viewport 均通過現有 four-backend production Chromium gate：fixed overview、`autoOrbit=false`、renderer budget、Capture Boost、DPR/backing-buffer restore 及 screenshot evidence。
5. Capture 前後 `VESPER_HARVEST_V3` runtime diagnostics 必須保持一致，renderer 仍在 `≤18 draws / ≤24,000 triangles`。
6. Real Space V4+ route / flight / Hermite arrival、Frontier selector / confirmation / handoff，以及 AURELIA / NADIR / EIDOLON 均不得回歸。
7. `npm run check` 全綠。

## Out of Scope

- 不新增 Frontier LY、Dijkstra、飛行時間或第二套 route authority。
- 不新增目的地、scanner／checklist、自由旋轉主入口或新的導航層。
- 不永久提高 DPR、不加入 post-processing 套件或外部材質資產。
- 不修改 V4 模擬 timing、Real Space 相機 authority 或持久儲存。
- 不為新 boom／vane 建立獨立 animation loop 或逐幀 matrix 更新。

## Validation evidence

Exact-head 自動驗證需同時證明：V3 profile／12+12 detail counts／6.8 depth span／288-triangle detail cost、renderer 數量、無外部材質載入、draw／triangle budget、固定 Scenic state、Capture restore，以及 390×844／360×800 真 Chromium WebGL screenshot evidence。

視覺驗證重點：主環外圍採集臂應形成清楚近／遠層次，冷凝翼唔應被行星或主環完全吞沒，氣巨星仍然係構圖主體而唔係被機械遮擋。

## Risks / manual checks

新增幾何屬 static instancing，預期 GPU 成本只增加兩個 draw-bearing objects；最大風險係手機窄屏下新輪廓太密或遮住風暴主體，因此以真 Chromium 截圖及 renderer diagnostics 作本輪 completion gate。

實體 iPhone Safari 長時間熱力、frame pacing 及個別 GPU 色彩混合只屬 supplementary evidence，唔係完成 blocker。

## Completion Signal

兩個手機驗收尺寸都可立即辨認 VESPER 為有多層採集機械嘅氣巨星工業前線；V3 runtime／capture／renderer budget／V4+ 回歸 gate 全綠，並將 exact HEAD 推送至 persistent Draft PR。
