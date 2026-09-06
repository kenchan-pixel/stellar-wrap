# TAU Ring Shadow Parallax｜Resonance Gap Banding v3

## Goal / intended outcome

令 TAU「金牛塵海」在 High tier／Photo Capture 同時讀到「環面切過行星、近遠環層分離、牧衛弧提供尺度、環帶本身有清楚密度空隙與前後散射」。本輪 **Resonance Gap Banding v3** 不再增加物件，而係把原有近／遠兩個 ring-plane shader 由均勻發光環帶提升成有三條固定徑向 gap、近遠互補方位散射的行星環；手機直向應更接近大型真實環系統，而唔係一塊平面霓虹圓盤。

## Scope

- 只在真正 TAU 最終探索、非航行、非 WebGL context lost、`qualityMode === high` 時建立。
- 保留既有環影 shell、近側 forward-scatter、遠側 back-scatter、16 個 shepherd moonlets，同一 TAU 核心場景／相機 authority 完全不改。
- 保留 `shepherd-arc-v2` 架構：16 個 `OctahedronGeometry` instances、2.5–4.6 bounded major scale、近／遠 lane >4.2 且 ≤5.2 ring-normal depth span。
- 新增 `resonance-gap-banding-v1` 視覺 pass，只修改既有兩個 ring-plane ShaderMaterial：
  - 在 local ring radius 約 **36.8 / 43.4 / 50.1** 建立 **3 條** bounded resonance gaps；
  - near / far halves 使用相反 `uPhase`，令前側與後側環帶有不同的方位散射亮度，而非全環同亮；
  - gaps、原有細帶紋理與 forward scatter 在同一 fragment shader 內組合，沒有新增 mesh、material pass 或額外 renderer authority。
- 保持既有 **4 objects / 4 draw calls / 2,912 triangles / 16 instances**；本輪 shader tuning **零新增 draw call／triangle／particle／DPR**。
- Photo Capture Boost 切換至 High 時同一既有生命周期建立；完成 PNG 後跟隨既有畫質恢復而釋放。
- `WarpTauRingDepth.snapshot()` 暴露 `ringBandPass: resonance-gap-banding-v1` 及 active `ringGapBands: 3`，只供驗收診斷。

## Acceptance Criteria

- TAU High 額外固定維持 **4 objects / 4 draw calls / 2,912 triangles / 16 instanced shepherds**。
- 16 個 shepherd major scale 保持 **2.5–4.6**，depth span 至少 4.2 且不超過 5.2；v3 不以更多 geometry 換視覺效果。
- 兩個既有 ring-plane shader 必須包含 **3 條**固定徑向 resonance gaps，near / far 使用互補方位散射 phase；Standard／Low 完全不建立本 High-only TAU extension。
- `snapshot()` 在 active High 回報 `ringBandPass === 'resonance-gap-banding-v1'`、`ringGapBands === 3`；離開 High 時 `ringGapBands === 0`。
- High → Low、離站、重訪都能 dispose／rebuild，Draw Call 回到原 baseline。
- 由 Standard 直接按 Photo Capture，PNG extraction 時 TAU ring depth + shared cinematic layer 必須已在 High 真正建立；capture 完成後恢復原畫質。
- 真 production Chromium 必須在 **390×844** 及 **360×800** 驗證：High 與 Standard 畫面不同、無水平 overflow、探索 phase 保持、renderer 實測 draw delta 正確。
- exact-run High 截圖需確認：主要行星環仍清楚包圍氣態巨行星；三層暗 gap／環帶密度差異可讀；近側環帶比遠側有不同亮度分佈；牧衛弧仍提供尺度而不遮死行星本體。
- 不改 flight timing、route authority、camera control、DPR 上限、Three.js 版本或 V4.1 travel flow。

## Out of Scope

- 不加入新的 TAU scanner／任務。
- 不修改既有 TAU exploration persistence／Star Atlas authority。
- 不加入 post-processing、shadow map、第二個 renderer、外部紋理／網絡請求。
- 不宣稱三條 gap 是真實天文比例；它們是為 TAU 原創環系統建立的 bounded cinematic density structure。
- 不加入動態粒子碰撞、完整物理光線追蹤或逐幀 ring geometry 更新。

## Validation evidence

Focused validator 會檢查：

- Three.js 仍固定 `0.185.1`；
- TAU 核心 anchor 仍來自現有 `(15,-5,-86), radius 23`；
- 原有 4-object／2,912-triangle／4-draw／16-instance budget 不變；
- `resonance-gap-banding-v1`、3 個固定 local-radius gap、near/far opposing `uPhase` 與同一 shader 內的 forward-scatter modulation；
- 原有 shepherd arc v2 bounded scale／depth、High-only gate、4 Hz fallback、Photo backing-size observer；
- 無額外 render loop、persistence、network／analytics；
- 390×844 及 360×800 真 Chromium：Standard → direct Photo Capture → High → Low → rebuild → departure → revisit；
- browser gate 繼續用 `#perfHud` 實測 shared High 4 draws + TAU extension 4 draws，並產生 exact-run Standard／High screenshots 供視覺檢查。

## Risks / manual checks

- 三條 gap 與 forward-scatter 的對比在 Safari／不同 GPU 色彩管理可能略有差異；若實機見到環帶過暗，優先調 gap softness／scatter floor，而唔增加 draw／DPR。
- iPhone Safari 長時間熱力、frame pacing、additive blending 及細 gap 可讀性屬 supplementary evidence，不阻塞本輪自主演進。

## Completion signal

- `npm run check` 及 TAU focused real-browser gate 綠燈；
- exact PR HEAD GitHub Actions 成功；
- 兩個手機 viewport Standard／High 證據截圖由 agent 自行檢視，確認 ring-gap／near-far scatter 提升成立；
- Draft PR 更新本切片 scope／exact-head evidence，exact-head review 無 actionable P0/P1/P2。
