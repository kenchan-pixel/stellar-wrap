# CYG Resonant Beacon Depth Cage v2｜天鵝航標立體共振籠

> 狀態：Draft candidate／`autonomous-evolution` 自主演進切片。

## Goal／使用效果

令 CYG High／攝影畫質由「雙星＋一個平面航標環」提升成更有前後景深的人工導航地標：使用者應清楚看到 **藍紫雙星 → 既有共振環 → 近／遠兩層航標柱及交錯深度籠**。留影時要更像抵達一個有尺度、有入口感的星際航標，而不是只在遠景加一圈發光材質。

## Scope

- 保留既有 `cyg-cinematic-quality.js` 的雙星程序化 resonance hot-band、非對稱 binary halo 及 segmented beacon track。
- 在既有外圍 19-unit beacon torus 上新增 exactly **18 個 `InstancedMesh` 共振航標柱**；一半偏近、一半偏遠，全部繼承原有 beacon transform／旋轉 authority。
- 新增一個 `LineSegments` 深度籠：兩層環軌共 36 段，加 6 條前後交叉連結，共 **42 line segments**。
- 新幾何只在安全最終 CYG 探索＋High／Photo Capture Boost 啟用；Standard／Low 完全不保留 owned CYG cinematic objects。
- 不新增 renderer、camera、route authority、獨立 animation loop、持久儲存、runtime network、後端或 dependency。

## Acceptance Criteria

1. CYG v2 只在 `exploring && !flying && !contextLost && qualityMode==='high' && current==='CYG'` 啟用。
2. High exactly **6 owned objects / 13,208 measured mesh triangles / 6 incremental draw calls**；Standard／Low exactly 0 owned CYG cinematic objects。
3. 新增 exactly **18 instanced resonance pylons**，實際近／遠 local-depth span >7.5 且不超過 **8.2-unit budget**。
4. 新增 exactly **42 line-segment cage segments**，並與 pylons 一同掛在既有 outer beacon torus；不得建立第二套 motion authority。
5. Production renderer diagnostics 必須量到 Standard → High **+6 DRAW**，High → Low 回到原本 baseline，而不是只信 profile constant。
6. Direct Standard → High Photo Capture 必須在 PNG `toBlob()` 前已包含完整 v2；capture 完成後恢復原 quality 並 dispose v2 objects。
7. High→Low disposal、Low→High rebuild、CYG departure → revisit recapture/rebuild 全部通過，無累積 object／GPU resource。
8. Production Chromium **390×844、360×800** 均保持 `explore`、無 horizontal overflow；Standard／High screenshots 必須不同，並保留雙星／航標構圖。
9. 完整 V4+ route／turn／warp／Hermite arrival、Photo、Frontier、Gallery、offline、secret/security regressions 維持綠燈。

## Out of Scope

- 不改 CYG core scene coordinates、route graph、flight timing、arrival curve、camera controls 或探索任務。
- 不永久提高 DPR，不加入 post-processing framework 或額外 renderer。
- 不修改 Standard／Low 視覺成本。
- 不新增目的地或 scanner/checklist mechanic。

## Performance Budget

既有 v1 四個 High objects：

- primary detail：4,992 triangles
- companion detail：2,976 triangles
- binary halo：2,976 triangles
- beacon track：2,048 triangles

合計 **12,992 triangles / 4 draws**。

v2 新增：

- 18 × BoxGeometry pylon：**216 triangles / 1 draw**（單一 `InstancedMesh`）
- 42 段 depth cage：**0 mesh triangles / 1 draw**（單一 `LineSegments`）

總計：**13,208 measured mesh triangles / 6 draws**。這個提升用 bounded instancing／lines 換取真實前後景深，而不是提高全局 DPR。

## Validation Evidence

Focused validation必須同時驗證：

- source contract、exact object／triangle／draw budget；
- real renderer DRAW delta；
- 18 pylons、42 cage segments、live depth span；
- Standard → temporary High Photo Capture → Standard restore；
- disposal／rebuild／revisit lifecycle；
- 390×844、360×800 production Chromium screenshots及 viewport containment；
- zero storage／network／independent render loop。

Exact-head Actions／artifact／visual inspection evidence在該 cycle 完成後寫入 persistent Draft PR receipt，而不是預先宣稱成功。

## Risks／補充人手檢查

- Line blending／細航標柱在 Safari 不同 GPU、色域及手機亮度下可能略有對比差異。
- 實體 iPhone Safari 長時間熱力、frame pacing、Capture Boost 瞬時 fill-rate 仍屬補充驗證，不是本切片自動完成 blocker。

## Completion Signal

CYG High／留影畫面具有明確近／遠航標結構與更強入口尺度，同時維持 bounded 6 draw／13,208 triangle、完整 quality lifecycle、V4+ 航行不變；兩個 production phone viewport、exact-head CI、visual inspection及 PR review 全部完成後，本切片才算完成。