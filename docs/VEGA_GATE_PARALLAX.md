# VEGA Gate Parallax Aperture｜相位門檻柱 v3

## Goal / intended outcome

令 VEGA 在 High tier／Photo Capture 的雙層星門由「有工程骨架的發光圓環」再提升成真正有穿越深度的星際門檻。玩家除咗讀到近／遠相位軌、中央孔徑膜同原有相位柱 collar，亦會見到 8 條由同一批 instanced pylons 重新配置出的軸向門檻柱，由星門平面向近／遠景伸出並帶輕微 radial cant，令入口有更明顯的前後穿透感同巨大尺度；Standard／Low 保持零額外 GPU 成本。

## Scope

- 只在真正 VEGA 最終探索、非航行、非 WebGL context lost、`qualityMode === high` 時建立。
- 重用現有 VEGA 星門 `(17,-1,-82), radius 24` 作唯一場景 anchor，不建立第二個 destination/camera authority。
- 保留既有 luminous aperture membrane、近／遠 partial phase rail 及 24 個 instanced phase pylons。
- **相位門檻柱 v3** 不新增 geometry object：24 個既有 Octahedron instances 中固定 8 個以 `i % 3 === 0` 轉為 axial threshold spokes；其餘 16 個保留 v2 的 radial／tangential collar。
- 8 個門檻柱沿 local-Z 拉伸至 `10.0×`，並按環上角度作約 `0.31 rad` radial cant；live geometry depth 約 10.0 local units，budget 上限 10.2。原有 pylon centre depth span 仍維持在 5.8 內。
- 24-instance count、4-object lifecycle、2,560-triangle budget、4 draw calls 完全保留；v3 只改 instance transforms，同一 instanced draw 內完成，**零新增 draw call／triangle／object**。
- Photo Capture Boost 由 Standard 切到 High 時同步建立；PNG 完成後跟隨既有畫質恢復而釋放。
- `WarpVegaGateDepth.snapshot()` 暴露 `architecture: phase-threshold-spokes-v3`、`thresholds`、`thresholdDepthSpan` 只供驗收診斷，不成為航線、相機或持久化 authority。

## Acceptance Criteria

- VEGA High 額外固定維持 **4 objects / 4 draw calls / 2,560 triangles / 24 instanced pylons**；v3 不准用增加 object／draw／triangle 數量換深度。
- 其中固定 **8 條 threshold spokes**；live scaled geometry depth 至少 9.7 且不超過 **10.2** budget，原有 pylon centre depth span仍至少 4.8 且不超過 5.8。
- 8 條 threshold spokes 必須有 radial cant，避免由 curated arrival camera 看起來只係正對鏡頭的點；中央 aperture 仍保持可讀，不可被柱體封死。
- Standard／Low 額外成本為 0；High → Low、離站、重訪都能 dispose／rebuild，Draw Call 回到原 baseline。
- 由 Standard 直接按 Photo Capture，PNG extraction 時 VEGA v3 layer 及 shared cinematic layer 必須已在 High 真正建立；capture 完成後恢復原畫質。
- 真 production Chromium 必須在 **390×844** 及 **360×800** 驗證：High 與 Standard 畫面不同、無水平 overflow、探索 phase 保持、renderer 實測 draw delta 正確，並由 runtime snapshot 證明 8 條門檻柱同約 10-unit 真 geometry depth。
- exact-run High 截圖需確認星門入口比 v2 更有近／遠穿透感、工程尺度更清晰，而中央孔徑仍是主要視覺焦點。
- 不改 flight timing、route authority、camera control、DPR 上限、Three.js 版本或 V4.1 travel flow。

## Out of Scope

- 不新增 VEGA scanner／任務／資源循環。
- 不修改既有 `vega-survey.js` 探索資料或 persistence。
- 不加入 post-processing、shadow map、第二個 renderer、外部紋理或額外網絡請求。
- 不模擬真正物理 wormhole／gravitational lensing；本切片只提供 bounded cinematic megastructure depth cue。
- 不增加新的 Mesh／Line／Sprite；如果 v3 視覺過強，優先調整 instance transform／opacity，而唔增加 geometry。

## Validation evidence

Focused validator 會檢查：

- Three.js 維持 `0.185.1`；
- VEGA gate anchor 仍來自現有 `(17,-1,-82), radius 24`；
- 24 個既有 instances 中只有 8 個變成 axial threshold spokes，其餘 16 個保留 v2 collar；
- threshold spoke axial scale `10.0×`、radial cant 約 `0.31 rad`，runtime 以實際 scaled geometry extents 計算 `thresholdDepthSpan`，而唔只量 instance centre；
- 幾何／instancing budget、single-pass transparency、High-only gate、4 Hz fallback、Photo backing-size observer；
- 無額外 render loop、persistence、network／analytics；
- 390×844 及 360×800 真 Chromium：Standard → direct Photo Capture → High → Low → rebuild → departure → revisit；
- `#perfHud` 實測 shared High 4 draws + 本切片 4 draws；runtime 必須量到 24 pylons／8 threshold spokes／至少 9.7 local-unit threshold geometry depth。

## Risks / manual checks

- 軸向柱在 Safari／不同 GPU 的 additive blending 可能較 Chromium 更亮；iPhone 長時間熱力、frame pacing 同門檻柱亮度屬補充證據，不阻塞自主演進。
- v3 深度主要靠同一 instanced mesh 的 transform，GPU geometry 成本不變，但前景重疊面積可能令局部 overdraw 稍增；如實機見到掉幀，先收窄 axial scale／opacity，唔應增加新 renderer 或改航行 timing。
- 門檻柱只係視覺尺度 cue，不宣稱真實工程結構或物理星門模型。

## Completion signal

- `npm run check` 及 VEGA focused real-browser gate 綠燈；
- exact PR HEAD GitHub Actions 成功；
- 兩個手機 viewport High／Standard 證據截圖產生並由 agent 自行檢視，確認 8 條門檻柱提升星門近／遠穿透感而中央 aperture 仍清楚；
- runtime 實測維持 4 VEGA draws／2,560 triangles，Standard／Low 回到零額外 VEGA cost；
- Draft PR 更新本切片 scope／證據，無新增 actionable P0/P1/P2。
