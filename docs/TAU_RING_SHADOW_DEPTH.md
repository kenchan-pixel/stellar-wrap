# TAU Ring Shadow Parallax｜金牛塵海環影深度

## Goal / intended outcome

令 TAU「金牛塵海」在 High tier／Photo Capture 不再只像一個平面行星環貼在氣態巨行星前面，而能清楚看見「環面切過行星、近遠環層分離、細小牧衛沿環面形成尺度參照」的 3D 深度。Standard／Low 保持零額外 GPU 成本。

## Scope

- 只在真正 TAU 最終探索、非航行、非 WebGL context lost、`qualityMode === high` 時建立。
- 在既有 TAU 氣態巨行星上加入一層沿環面旋轉的**環影 shell**，用有限透明 shader 令環面對行星表面的遮光方向更易讀。
- 將高畫質環分成近側 forward-scatter 與遠側 back-scatter 兩個 partial 3D ring plane，沿同一環面法線作小幅前後分離。
- 加入 16 個低面數 instanced shepherd moonlets，分成近／遠兩條環面深度 lane，提供尺度及視差線索。
- Photo Capture Boost 切換至 High 時同一幀同步建立；完成 PNG 後跟隨既有畫質恢復而釋放。
- 新增 `WarpTauRingDepth.snapshot()` 只供驗收診斷；不成為相機、航線或場景 authority。

## Acceptance Criteria

- TAU High 額外固定為 **4 objects / 4 draw calls / 2,912 triangles / 16 instanced shepherds**。
- 16 個 shepherds 的 live ring-normal depth span 至少 4.2，且不超過 5.2 budget。
- Standard／Low 額外成本為 0；High → Low、離站、重訪都能 dispose／rebuild，Draw Call 回到原 baseline。
- 由 Standard 直接按 Photo Capture，PNG extraction 時 TAU ring-depth layer 及 shared cinematic layer 必須已在 High 畫質真正建立；capture 完成後恢復原畫質。
- 真 production Chromium 必須在 **390×844** 及 **360×800** 驗證：High 與 Standard 畫面不同、無水平 overflow、探索 phase 保持、renderer 實測 draw delta 正確。
- 不改 flight timing、route authority、camera control、DPR 上限、Three.js 版本或 V4.1 travel flow。

## Out of Scope

- 不加入新的 TAU scanner／任務。
- 不修改既有 TAU `tau-ring-profiler.js` 探索資料或 persistence。
- 不加入 post-processing、shadow map、第二個 renderer、外部紋理／網絡請求。
- 不嘗試做完整物理光線追蹤式行星環陰影；本切片是 bounded cinematic cue。

## Validation evidence

Focused validator 會檢查：

- Three.js 仍固定 `0.185.1`；
- TAU 核心 anchor 仍來自現有 `(15,-5,-86), radius 23`；
- 幾何及 instancing budget、single-pass 透明材質、High-only gate、4 Hz fallback、Photo backing-size observer；
- 無額外 render loop、persistence、network／analytics；
- 390×844 及 360×800 真 Chromium：Standard → direct Photo Capture → High → Low → rebuild → departure → revisit；
- `#perfHud` 實測 shared High 4 draws + 本切片 4 draws，不能只信 profile 常數。

## Risks / manual checks

- 透明 blending 在 Safari／不同 GPU 的色彩強度可能略有差異；實機 iPhone 長時間熱力、frame pacing 及環影主觀觀感屬補充證據，不阻塞自主演進。
- 環影是視覺化尺度／遮光 cue，不宣稱物理準確的光源與環粒子自遮蔽模型。

## Completion signal

- `npm run check` 及 TAU focused real-browser gate 綠燈；
- exact PR HEAD GitHub Actions 成功；
- 兩個手機 viewport 證據截圖已產生並人工檢視；
- Draft PR 更新本切片 scope／證據，無新增 actionable P0/P1。
