# VEGA Gate Parallax Aperture｜相位柱環 v2

## Goal / intended outcome

令 VEGA 在 High tier／Photo Capture 的雙層星門由「有深度的發光圓環」再提升成真正有工程尺度的人工入口。玩家除咗讀到近側相位軌、中央孔徑膜、遠側相位軌，亦會見到 24 個由既有低面數節點拉伸成形的近／遠相位柱，形成一圈有前後層次的結構 collar；Standard／Low 保持零額外 GPU 成本。

## Scope

- 只在真正 VEGA 最終探索、非航行、非 WebGL context lost、`qualityMode === high` 時建立。
- 重用現有 VEGA 星門 `(17,-1,-82), radius 24` 作唯一場景 anchor，不建立第二個 destination/camera authority。
- 保留既有 luminous aperture membrane、近／遠 partial phase rail 及 24 個 instanced phase nodes。
- **相位柱環 v2** 不新增 geometry object：直接把原有 24 個 Octahedron instances 沿局部 X 軸拉長，近側維持 radial silhouette、遠側旋轉 90° 形成 tangential silhouette，令星門有可讀的工程骨架同近／遠視差。
- 原有 node local-Z 分層、24-instance count、4-object lifecycle、2,560-triangle budget 完全保留；今次屬同一 instanced draw 內的 transform／material tuning，**零新增 draw call**。
- Photo Capture Boost 由 Standard 切到 High 時同步建立；PNG 完成後跟隨既有畫質恢復而釋放。
- `WarpVegaGateDepth.snapshot()` 額外暴露 `architecture: phase-pylon-collar-v2` 只供驗收診斷，不成為航線、相機或持久化 authority。

## Acceptance Criteria

- VEGA High 額外固定維持 **4 objects / 4 draw calls / 2,560 triangles / 24 instanced phase pylons**；v2 不准用增加 object／draw／triangle 數量換輪廓。
- 24 個 phase pylons 的 live local depth span 至少 4.8，且不超過 5.8 budget；近／遠 lane 保持不同 local-Z，並用 radial／tangential 方向形成可辨認的 collar。
- Standard／Low 額外成本為 0；High → Low、離站、重訪都能 dispose／rebuild，Draw Call 回到原 baseline。
- 由 Standard 直接按 Photo Capture，PNG extraction 時 VEGA gate-depth layer 及 shared cinematic layer 必須已在 High 真正建立；capture 完成後恢復原畫質。
- 真 production Chromium 必須在 **390×844** 及 **360×800** 驗證：High 與 Standard 畫面不同、無水平 overflow、探索 phase 保持、renderer 實測 draw delta 正確；exact-run High 截圖需確認相位柱環可讀而唔遮死中央孔徑。
- 不改 flight timing、route authority、camera control、DPR 上限、Three.js 版本或 V4.1 travel flow。

## Out of Scope

- 不新增 VEGA scanner／任務／資源循環。
- 不修改既有 `vega-survey.js` 探索資料或 persistence。
- 不加入 post-processing、shadow map、第二個 renderer、外部紋理或額外網絡請求。
- 不模擬真正物理 wormhole／gravitational lensing；本切片只提供 bounded cinematic megastructure cue。

## Validation evidence

Focused validator 會檢查：

- Three.js 維持 `0.185.1`；
- VEGA gate anchor 仍來自現有 `(17,-1,-82), radius 24`；
- 24 個既有 instances 使用 bounded anisotropic pylon transforms，近／遠方向互補，而 geometry／instance count 不變；
- 幾何／instancing budget、single-pass transparency、High-only gate、4 Hz fallback、Photo backing-size observer；
- 無額外 render loop、persistence、network／analytics；
- 390×844 及 360×800 真 Chromium：Standard → direct Photo Capture → High → Low → rebuild → departure → revisit；
- `#perfHud` 實測 shared High 4 draws + 本切片 4 draws，不能只信 profile 常數。

## Risks / manual checks

- 拉長後的 additive pylon silhouette 在 Safari／不同 GPU 可能比 Chromium 更亮；iPhone 長時間熱力、frame pacing 同柱環亮度屬補充證據，不阻塞自主演進。
- 相位柱只係視覺尺度 cue，不宣稱物理準確的星門支撐結構；若實機見到中央孔徑被柱環搶走焦點，後續只應先調 opacity／scale，而唔增加更多 geometry。

## Completion signal

- `npm run check` 及 VEGA focused real-browser gate 綠燈；
- exact PR HEAD GitHub Actions 成功；
- 兩個手機 viewport High／Standard 證據截圖產生並由 agent 自行檢視，確認柱環明顯提升星門工程尺度而中央孔徑仍清楚；
- Draft PR 更新本切片 scope／證據，無新增 actionable P0/P1/P2。
