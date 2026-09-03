# AURELIA Inhabited Hero Vista

## Goal / 使用效果

令 `AURELIA ARC｜曙光環域` 在 Frontier 固定單角度景觀中第一眼讀成「有人居住的巨構棲息環」，而不只是發光金屬圓環。手機直向應同時看清外殼、內側居住帶、城市窗格、中央能源核心與少量外圍停泊結構，提升抵達及留影價值。

本切片服從已批准 D-015：Frontier 玩家入口維持固定英雄構圖、統一目的地介面；不重新引入自由旋轉模型作主要體驗。

## Scope

- AURELIA 原有單一 Three.js renderer／camera、程序化星場、棲息環、核心、碎屑與 capture API 保留。
- 新增三個 bounded draw-bearing detail objects：
  1. 內側 habitat ribbon：`TorusGeometry(19.8, 0.65, 6, 128)`；
  2. 56 個 instance city blocks，共用一個 BoxGeometry／Material；
  3. 8 個 instance docking spines，共用一個 BoxGeometry／Material。
- 新增幾何預算合計 2,304 triangles；正常固定景觀仍受 Frontier backend 的 `≤18 draw calls / ≤24,000 triangles` 總上限保護。
- 固定抵達構圖稍為拉遠至 `world z = -64`、`camera FOV = 56`，令手機直向更完整看到環體 silhouette 及中央核心。
- `WarpFrontier.state()` 暴露 `AURELIA_HABITAT_V2` detail profile、物件／城市／停泊 spine／triangle 預算，供 exact-head browser 驗證。

## Acceptance Criteria

1. 390×844 及 360×800 的固定 `overview` 要比上一版更完整呈現棲息環，不以巨大近距 torus 填滿畫面。
2. 內側居住帶與城市窗格在實際 renderer 截圖可辨認，中央能源核心仍保持主要尺度參照。
3. 新 detail 固定為 3 個 draw-bearing objects、2,304 triangles；不得增加第二 renderer、post-processing dependency 或獨立 animation loop。
4. AURELIA normal DPR 保持 ≤1.25；高畫質留影短暫升至 ≤1.60，完成後準確恢復 fixed `overview`、`autoOrbit=false` 及原 backing buffer。
5. Frontier Landing、01–04 destination selector、確認流程、handoff、其他三個 Frontier renderer 及 Real Space V4+ route／flight／arrival authority 不變。
6. `npm run check` 全綠；現有 four-backend production Chromium gate 必須在兩個手機 viewport 實際量度 renderer cost、capture growth／restore 並輸出 AURELIA 截圖。

## Out of Scope

- 不新增 Frontier LY、Dijkstra、飛行時間或第二套 route authority。
- 不新增目的地、scanner／checklist、自由旋轉入口、構圖 preset UI 或 auto-orbit 控制。
- 不提高永久 DPR、不加入大型材質／後處理依賴、不改 V4 模擬 timing。

## Validation / Risks

自動驗證可證明 renderer 數量、幾何／draw budget、DPR、capture restore、固定 scenic state 及 viewport containment。CI 截圖需由 agent 自行視覺檢查 habitat ribbon／city lights／整體 framing。

實體 iPhone Safari 長時間熱力、frame pacing 及個別 GPU 色彩混合只屬 supplementary evidence，不是本切片完成 blocker。

## Completion Signal

AURELIA 在兩個手機驗收尺寸均清楚讀成有內側城市層次的環形人工棲息地，固定英雄構圖更完整，renderer/capture/V4+ 回歸 gate 全綠，並推送到 persistent Draft PR。
