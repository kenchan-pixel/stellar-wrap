# NADIR WELL｜玄淵觀測站 · Fixed Black-Hole Vista

> 狀態：Approved product direction implementation。依 D-015，NADIR 不再以自由旋轉模型作主要體驗；使用與 Real Space／Frontier Scenic 一致的單角度英雄景觀、統一航線入口及高畫質留影。

## Vertical Slice

### Goal／使用效果

修正「黑洞第一眼不像黑洞」的核心視覺問題。玩家進入 NADIR 後，不需要旋轉或找角度，固定構圖已清楚呈現事件視界、薄吸積盤、光子環及引力透鏡，觀測站只作尺度參照。

### Scope

- 將 `frontier-nadir.html` 收斂為固定單角度 NADIR renderer；保留 `WarpFrontierNadir` API 供 `frontier-scenic.html` 統一外殼使用。
- 黑洞主體改為：
  - 純黑事件視界 silhouette；
  - 薄、橢圓透視的程序化吸積盤；
  - 細光子環；
  - 吸積盤背面光被壓成事件視界上下方的引力透鏡弧；
  - 一側較冷亮、另一側較暖暗的 Doppler 不對稱；
  - 少量彎曲星光作局部 lensing 提示。
- 移除容易令人聯想到傳送門的巨大雙向錐形噴流。
- 觀測站移到畫面次要位置，不遮擋事件視界。
- 保持單一 renderer、無 post-processing、無外部圖像資產；正常 DPR ≤1.25，留影暫時 ≤1.60。
- 固定鏡頭不可拖動、不可自由 orbit；只有場景內非常輕微的吸積盤 shader filament 流動，不改玩家視角。

### Acceptance Criteria

1. 390×844 及 360×800 最終景觀第一眼可辨認為黑洞，而非黑球、霓虹圓環或傳送門。
2. 中央黑影、細 photon ring、水平吸積盤及上下 lensing arc 同時可見；Doppler 亮度／色溫不對稱清楚但不誇張。
3. 不存在巨型 `ConeGeometry` 噴流；觀測站不與事件視界重疊。
4. `WarpFrontierNadir.state()` 固定回報 `autoOrbit:false`、`vista:'overview'`、`fixed:true`，並提供 draw call／triangle 診斷。
5. `frontier-scenic.html` 原有統一四按鈕介面、四目的地航線 selector、capture delegation 完全保留。
6. 高畫質留影 backing buffer 大於正常 render，完成後準確恢復原 DPR。
7. 不新增 storage、backend、analytics、第二 renderer、重大 dependency 或 Real Space route/timing 改動。

### Out of Scope

- 不實作完整 general-relativity ray tracer 或全畫面 gravitational-lensing post-process。
- 不新增黑洞 scanner／checklist gameplay。
- 不改 AURELIA、VESPER、EIDOLON 視覺。
- 不建立 Frontier Fiction 假距離或 Dijkstra 航線。
- 不改 Real Space V4+ travel phases、route authority 或 destination data。

### Validation Evidence

完成 gate 必須包含：

- focused source contract：event horizon／photon ring／lensed back arc／Doppler asymmetry／no giant jets／single renderer／bounded DPR；
- `frontier-scenic` production Chromium 390×844、360×800；
- NADIR final fixed screenshot 人工檢查；
- capture boost + DPR restore；
- draw calls／triangles 記錄；
- 全 repo `npm run check`、V4 stable hash、approved Real Space routes 及完整 flight-state chain 保持綠燈。

### Risks／補充人手檢查

- Shader additive glow 在不同手機色域可能有少量亮度差異；實體 iPhone Safari 長時間熱力、frame pacing 及 PNG Save Sheet 只屬補充驗證，不是此切片 blocker。

### Completion Signal

NADIR 在固定手機英雄構圖中已清楚讀成黑洞；主視覺不再依賴玩家旋轉模型，且統一 Frontier Scenic、capture、效能及 V4+ 回歸 gate 全部通過並推送至 persistent Draft PR。
