# TAU Ring Shadow Parallax｜牧衛弧 v2

## Goal / intended outcome

令 TAU「金牛塵海」在 High tier／Photo Capture 不再只靠高亮行星環表達深度，而能同時讀到「環面切過行星、近遠環層分離、近／遠牧衛沿環弧形成尺度參照」。v2 將原有 16 個低面數 shepherd moonlets 重新塑造成更可讀的近／遠牧衛弧，強化巨型行星環的尺度與前後景；Standard／Low 保持零額外 GPU 成本。

## Scope

- 只在真正 TAU 最終探索、非航行、非 WebGL context lost、`qualityMode === high` 時建立。
- 保留既有環影 shell、近側 forward-scatter 與遠側 back-scatter partial ring plane，不改 TAU 核心場景／相機 authority。
- **牧衛弧 v2** 重用原有 16 個 `OctahedronGeometry` instanced shepherds；不新增 geometry object，而是在同一 instanced draw 內加入 bounded anisotropic scale、近／遠互補方向及 per-instance 色調，令牧衛由細小亮點變成可辨認的尺度節點。
- 最大主要軸 scale 固定 **4.6**，最小主要軸不少於 **2.5**；近／遠 lane 仍沿 ring normal 保留既有 >4.2、≤5.2 深度跨度。
- 保持既有 **4 objects / 4 draw calls / 2,912 triangles / 16 instances**；v2 為 transform／instance-colour tuning，**零新增 draw call**。
- Photo Capture Boost 切換至 High 時同一幀同步建立；完成 PNG 後跟隨既有畫質恢復而釋放。
- `WarpTauRingDepth.snapshot()` 額外暴露 `architecture: shepherd-arc-v2`、live shepherd scale range，只供驗收診斷；不成為相機、航線或場景 authority。

## Acceptance Criteria

- TAU High 額外固定維持 **4 objects / 4 draw calls / 2,912 triangles / 16 instanced shepherds**。
- v2 shepherd major scale 為 **2.5–4.6**；major shepherd 能清楚提供尺度參照，但不得以新增 geometry／draw／DPR 換輪廓。
- 16 個 shepherds 的 live ring-normal depth span 至少 4.2，且不超過 5.2 budget；近／遠 lane 使用互補方向及色調，形成可辨認的 shepherd arc。
- Standard／Low 額外成本為 0；High → Low、離站、重訪都能 dispose／rebuild，Draw Call 回到原 baseline。
- 由 Standard 直接按 Photo Capture，PNG extraction 時 TAU shepherd arc v2 及 shared cinematic layer 必須已在 High 畫質真正建立；capture 完成後恢復原畫質。
- 真 production Chromium 必須在 **390×844** 及 **360×800** 驗證：High 與 Standard 畫面不同、無水平 overflow、探索 phase 保持、renderer 實測 draw delta 正確，並以 live diagnostics 證明 `shepherd-arc-v2` 與 bounded scale range。
- exact-run High 截圖需確認牧衛弧比 v1 細小亮點更易讀，同時不遮死氣態巨行星及主要行星環。
- 不改 flight timing、route authority、camera control、DPR 上限、Three.js 版本或 V4.1 travel flow。

## Out of Scope

- 不加入新的 TAU scanner／任務。
- 不修改既有 TAU `tau-ring-profiler.js` 探索資料或 persistence。
- 不加入 post-processing、shadow map、第二個 renderer、外部紋理／網絡請求。
- 不嘗試做完整物理光線追蹤式行星環陰影；牧衛弧只係 bounded cinematic scale cue。

## Validation evidence

Focused validator 會檢查：

- Three.js 仍固定 `0.185.1`；
- TAU 核心 anchor 仍來自現有 `(15,-5,-86), radius 23`；
- 原有 16 個 instances 保持同一 low-poly geometry／single draw，v2 只加入 bounded anisotropic scale、互補 orientation 及 per-instance colour；
- 幾何／instancing budget、High-only gate、4 Hz fallback、Photo backing-size observer；
- 無額外 render loop、persistence、network／analytics；
- 390×844 及 360×800 真 Chromium：Standard → direct Photo Capture → High → Low → rebuild → departure → revisit；
- browser gate 保留實際 draw／capture／lifecycle 驗證；v2 architecture 與 scale range 由 live `WarpTauRingDepth.snapshot()` 診斷及 exact-run 截圖共同驗證；
- `#perfHud` 實測 shared High 4 draws + 本切片 4 draws，不能只信 profile 常數。

## Risks / manual checks

- per-instance 近／遠色調與較實體的 shepherd silhouette 在 Safari／不同 GPU 可能有輕微 blending／gamma 差異；iPhone 長時間熱力、frame pacing 及牧衛亮度屬補充證據，不阻塞自主演進。
- 若實機見到牧衛太搶眼，優先調 opacity／major scale，不增加 instance／geometry／DPR。

## Completion signal

- `npm run check` 及 TAU focused real-browser gate 綠燈；
- exact PR HEAD GitHub Actions 成功；
- 兩個手機 viewport Standard／High 證據截圖已產生並由 agent 自行檢視；
- Draft PR 更新本切片 scope／證據，無新增 actionable P0/P1/P2。
