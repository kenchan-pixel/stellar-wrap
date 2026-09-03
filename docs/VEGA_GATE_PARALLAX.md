# VEGA Gate Parallax Aperture｜織女星門視差孔徑

## Goal / intended outcome

令 VEGA 在 High tier／Photo Capture 的雙層星門由「發光圓環」提升成可讀出前後厚度、能量孔徑與尺度節點的立體入口。玩家抵達時應先讀到近側相位軌、中央孔徑膜、遠側相位軌三層深度，再由 24 個相位節點提供尺度參照；Standard／Low 保持零額外 GPU 成本。

## Scope

- 只在真正 VEGA 最終探索、非航行、非 WebGL context lost、`qualityMode === high` 時建立。
- 重用現有 VEGA 星門 `(17,-1,-82), radius 24` 作唯一場景 anchor，不建立第二個 destination/camera authority。
- 星門內加入一個低透明、單 pass 的 luminous aperture membrane。
- 星門前後各加入一段 partial phase rail，沿星門 local Z 分離形成真實視差，而不是 DOM／screen-space overlay。
- 加入 24 個低面數 instanced phase nodes，分布在近／遠兩條深度 lane，作尺度與視差參照。
- Photo Capture Boost 由 Standard 切到 High 時同步建立；PNG 完成後跟隨既有畫質恢復而釋放。
- 新增 `WarpVegaGateDepth.snapshot()` 只供驗收診斷，不成為航線、相機或持久化 authority。

## Acceptance Criteria

- VEGA High 額外固定為 **4 objects / 4 draw calls / 2,560 triangles / 24 instanced phase nodes**。
- 24 個 phase nodes 的 live local depth span 至少 4.8，且不超過 5.8 budget。
- Standard／Low 額外成本為 0；High → Low、離站、重訪都能 dispose／rebuild，Draw Call 回到原 baseline。
- 由 Standard 直接按 Photo Capture，PNG extraction 時 VEGA gate-depth layer 及 shared cinematic layer 必須已在 High 真正建立；capture 完成後恢復原畫質。
- 真 production Chromium 必須在 **390×844** 及 **360×800** 驗證：High 與 Standard 畫面不同、無水平 overflow、探索 phase 保持、renderer 實測 draw delta 正確。
- 不改 flight timing、route authority、camera control、DPR 上限、Three.js 版本或 V4.1 travel flow。

## Out of Scope

- 不新增 VEGA scanner／任務／資源循環。
- 不修改既有 `vega-survey.js` 探索資料或 persistence。
- 不加入 post-processing、shadow map、第二個 renderer、外部紋理或額外網絡請求。
- 不模擬真正物理 wormhole／gravitational lensing；本切片只提供 bounded cinematic aperture cue。

## Validation evidence

Focused validator 會檢查：

- Three.js 維持 `0.185.1`；
- VEGA gate anchor 仍來自現有 `(17,-1,-82), radius 24`；
- 幾何／instancing budget、single-pass transparency、High-only gate、4 Hz fallback、Photo backing-size observer；
- 無額外 render loop、persistence、network／analytics；
- 390×844 及 360×800 真 Chromium：Standard → direct Photo Capture → High → Low → rebuild → departure → revisit；
- `#perfHud` 實測 shared High 4 draws + 本切片 4 draws，不能只信 profile 常數。

## Risks / manual checks

- Additive transparency 在 Safari／不同 GPU 的亮度與色彩飽和度可能略有差異；iPhone 長時間熱力、frame pacing 及主觀星門亮度屬補充證據，不阻塞自主演進。
- 孔徑膜與相位軌是視覺化空間 cue，不宣稱物理準確的星門機制。

## Completion signal

- `npm run check` 及 VEGA focused real-browser gate 綠燈；
- exact PR HEAD GitHub Actions 成功；
- 兩個手機 viewport 證據截圖已產生並檢視；
- Draft PR 更新本切片 scope／證據，無新增 actionable P0/P1。
