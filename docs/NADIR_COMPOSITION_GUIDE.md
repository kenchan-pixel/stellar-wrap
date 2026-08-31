# NADIR WELL｜玄淵觀測站 · Fixed Black-Hole Vista

> 狀態：Approved product direction implementation。依 D-015，NADIR 使用與 Frontier Scenic 一致的固定單角度英雄景觀，不以自由旋轉模型作主要體驗。

## Vertical Slice｜Gravitational-Lensing Silhouette Pass

### Goal／使用效果

令 NADIR 第一眼更像黑洞，而不是黑球、霓虹圓環或傳送門。固定手機構圖要清楚讀到：純黑事件視界、近乎 edge-on 的吸積盤、上下引力透鏡冠，以及一冷亮／一暖暗的非對稱光弧；觀測站只作尺度參照。

### Scope

- `frontier-nadir.html` 維持單一固定 renderer 及既有 `WarpFrontierNadir` Scenic API。
- 黑洞視覺升級至 `NADIR_FIXED_LENSING_V3`：
  - 純黑事件視界保持主要 silhouette；
  - 吸積盤收窄並更接近 edge-on，保留程序化 filament 流動；
  - 背面吸積光改以低成本 screen-plane lensing crown 彎到事件視界上下方；
  - 移除「完整發光圓圈」語言，光子層拆成兩段不對稱 partial arcs；
  - approaching side 偏冷白／較亮，receding side 偏暖／較暗；
  - 中央星場留出乾淨區，少量星光沿上下曲線偏折，避免粒子蓋住核心 silhouette；
  - 觀測站縮小並維持次要位置。
- 正常 DPR ≤1.25；留影只短暫提升至 ≤1.60，完成後恢復。
- 無自由拖動、auto-orbit、巨型噴流、post-processing 或第二 renderer。

### Acceptance Criteria

1. 390×844 及 360×800 最終景觀清楚呈現中央黑影、水平吸積盤及上下 lensing crown。
2. 光子層不可形成完整 neon ring；兩段 partial arcs 要有明顯亮度／色溫不對稱。
3. 中央黑洞周邊星點密度低於遠景，局部偏折星光不能蓋過事件視界。
4. `WarpFrontierNadir.state()` 固定回報 `autoOrbit:false`、`vista:'overview'`、`fixed:true`，並暴露 `lensingCrown`、`partialPhotonArc`、`portalRing:false` 與 render cost。
5. `frontier-scenic.html` 四目的地選擇、固定景觀交接與 capture delegation 不變。
6. 高畫質留影 backing buffer 必須實際升級，完成後準確恢復 normal DPR。
7. 保持單一 renderer；NADIR child ≤18 draw calls／≤24k triangles；不新增 storage、backend、analytics、重大 dependency 或 Real Space route/timing authority。

### Out of Scope

- 不實作 general-relativity ray tracer 或全畫面 gravitational-lensing post-process。
- 不新增 scanner／checklist、Frontier 假距離／Dijkstra 航線或新目的地。
- 不改 AURELIA、VESPER、EIDOLON 或 Real Space V4+ 航行狀態機。

### Validation Evidence

完成 gate：focused source contract、全 repo `npm run check`、390×844／360×800 production Chromium fixed-scenic screenshots、capture DPR raise/restore、draw call／triangle evidence、V4 stable hash／route graph／flight-state regressions、exact-head review。

### Risks／補充人手檢查

不同手機 GPU／色域的 additive glow 可能有亮度差異；實體 iPhone Safari 長時間熱力、frame pacing 及 PNG Save Sheet 仍屬補充證據，不是此切片 blocker。

### Completion Signal

NADIR 的固定英雄構圖不再依賴完整發光圓圈建立辨識度；事件視界、edge-on disk、上下 lensing crown 與 Doppler 非對稱在兩個手機驗收尺寸均清楚可見，且 Frontier Scenic／capture／效能及 V4+ 回歸 gate 全部通過並推送至 persistent Draft PR。
