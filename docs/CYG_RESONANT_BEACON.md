# CYG Resonant Beacon Capture Pass｜天鵝航標共振光場

> 狀態：Draft candidate／`autonomous-evolution` 自主演進切片。

## Goal／使用效果

令 CYG 的 High／攝影畫質由「較清晰的雙星與航標」提升成更有辨識度的雙星共振景觀：主星與伴星表面出現面向彼此的高能帶，主星外層 halo 形成不對稱磁場瓣，外圍航標環則呈現分段雙軌與固定 lock wedge。使用者在 High tier 或 Photo Capture Boost 留影時，應能一眼看出 CYG 的雙星＋人工航標身份，而 Standard／Low 航行負載完全不增加。

## Scope

- 只修改既有 `cyg-cinematic-quality.js` High-only 四個擁有物件的材質／程序化紋理。
- 主星／伴星 512×256 程序化紋理加入互相呼應的 resonance hot-band；沒有外部圖片資產。
- 既有 binary halo shader 改成藍—紫不對稱磁場瓣及高緯細帶；仍使用原本一個 sphere mesh。
- 既有 beacon track shader 改成 18 段雙軌訊號結構及一個高亮 lock wedge；仍使用原本一個 torus mesh。
- 既有幾何、物件數、renderer、scene、camera、quality gate、capture gate、dispose/rebuild lifecycle 全部保留。

## Acceptance Criteria

1. CYG cinematic layer 仍只在安全最終探索、`qualityMode==='high'`、`current==='CYG'` 時啟用。
2. High layer 仍為 exactly 4 owned objects、12,992 measured triangles、4 draw calls；Standard／Low 為 0 owned cinematic objects。
3. 主星與伴星程序化紋理包含互補 resonance band，而不是只提高 opacity。
4. binary halo shader 包含 longitude／latitude driven asymmetric lobes；beacon shader 包含 segmented rail + lock wedge。
5. 390×844 與 360×800 production Chromium 的 Standard／High screenshots 明顯不同，High 畫面可見更強雙星／航標身份。
6. High→Low disposal、Low→High rebuild、離站→重返 CYG recapture/rebuild 全部保持通過。
7. 不新增 `requestAnimationFrame`、獨立 render loop、儲存、網絡、analytics、後端或 dependency。
8. V4+ route／flight／Hermite、Photo Capture Boost、offline、WebGL recovery 及其他 cinematic regressions 維持綠燈。

## Out of Scope

- 不改 CYG 核心場景座標、航線、arrival timing 或相機 authority。
- 不新增幾何／sprite／post-processing pass；本切片刻意保持原 4 draw／12,992 triangle budget。
- 不改 Standard／Low 畫質；正常航行及低效能裝置成本不增加。

## Validation Evidence

本切片以既有 `validate-cyg-cinematic-quality.mjs` 與 production Chromium gate 驗證：

- exact object／triangle／draw-call budget；
- 兩個手機直向 viewport；
- Standard vs High screenshot 差異；
- dispose／rebuild／revisit lifecycle；
- source-level no-storage／no-network／no-independent-render-loop contract。

## Risks／補充人手檢查

- 不同 Safari／GPU 的 additive blending 與色域可能令藍紫磁場瓣亮度略有差異。
- 實體 iPhone Safari 長時間熱力及 Capture Boost 瞬時 fill-rate 仍屬補充驗證，不是本切片完成 blocker。

## Completion Signal

CYG High／留影畫面在維持原 4 draw／12,992 triangle budget 下，具有更強雙星共振與人工航標辨識度；兩個 production phone viewport、完整 repo validation、exact-head review 均通過並推送到 persistent Draft PR。
