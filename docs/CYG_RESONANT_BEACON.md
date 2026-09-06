# CYG Resonant Beacon Perspective v3｜天鵝航標前景透視門

> 狀態：Draft candidate／`autonomous-evolution` 自主演進切片。

## Goal／使用效果

令 CYG High／攝影畫質由「有近遠層次的航標籠」再提升成具有明確**前景入口、視線引導及尺度感**的抵達構圖。使用者應由畫面外圍近景線條被引導至既有 19-unit 共振環，再看到藍紫雙星，令 CYG 留影更像穿越一個大型星際航標門，而不是只觀看遠處環形物件。

## Scope

- 保留既有雙星程序化 resonance hot-band、非對稱 binary halo、segmented beacon track 及 18 個 instanced resonance pylons。
- 保留 v2 的 36 段近／遠環軌與 6 條交叉連結，並在**同一個 `LineSegments` draw**內增加 exactly **12 條 foreground perspective leads**。
- 12 條 leads 由既有 near cage 向相機方向延伸至較大的 26.5-unit foreground aperture，形成由近景收束至航標環的透視線；總 line segments 由 42 增至 **54**。
- 前後完整 cage local-depth span 目標 >13.4 並受 **14.5-unit budget** 約束；既有 pylon near/far span 繼續受 8.2-unit budget 約束。
- 新構圖只在安全最終 CYG 探索＋High／Photo Capture Boost 啟用；Standard／Low 完全不保留 owned CYG cinematic objects。
- 不新增 renderer、camera、route authority、獨立 animation loop、持久儲存、runtime network、後端或 dependency。

## Acceptance Criteria

1. CYG v3 只在 `exploring && !flying && !contextLost && qualityMode==='high' && current==='CYG'` 啟用。
2. High 維持 exactly **6 owned objects / 13,208 measured mesh triangles / 6 incremental draw calls**；Standard／Low exactly 0 owned CYG cinematic objects。
3. 維持 exactly **18 instanced resonance pylons**，實際 pylon depth span >7.5 且不超過 8.2。
4. Depth cage exactly **54 line segments**：原 42 段 + exactly **12 foreground perspective leads**；完整 cage depth span >13.4 且不超過 **14.5**。
5. Perspective leads 必須由 near cage 連至更大、更靠近相機的 foreground aperture，並與既有 cage 共用同一 `LineSegments` material／draw call；不得增加 draw count。
6. Production renderer diagnostics 必須量到 Standard → High **+6 DRAW**，High → Low 回到原本 baseline。
7. Direct Standard → High Photo Capture 必須在 PNG `toBlob()` 前包含完整 v3；capture 完成後恢復原 quality 並 dispose v3 objects。
8. High→Low disposal、Low→High rebuild、CYG departure → revisit recapture/rebuild 全部通過，無累積 object／GPU resource。
9. Production Chromium **390×844、360×800** 均保持 `explore`、無 horizontal overflow；Standard／High screenshots 必須不同。
10. 完整 V4+ route／turn／warp／Hermite arrival、Photo、Frontier、Gallery、offline、secret/security regressions 維持綠燈。

## Out of Scope

- 不改 CYG core scene coordinates、route graph、flight timing、arrival curve、camera controls 或探索任務。
- 不永久提高 DPR，不加入 post-processing framework 或額外 renderer。
- 不修改 Standard／Low 視覺成本。
- 不新增目的地或 scanner/checklist mechanic。

## Performance Budget

既有 v2 保持：

- primary detail：4,992 triangles
- companion detail：2,976 triangles
- binary halo：2,976 triangles
- beacon track：2,048 triangles
- 18 × BoxGeometry pylon：216 triangles / 1 draw
- depth cage：0 mesh triangles / 1 draw

v3 只將同一 depth-cage geometry 由 42 增至 **54 line segments**，新增 12 條線但**不新增 object、mesh triangle 或 draw call**。

總計仍為 **13,208 measured mesh triangles / 6 draws**。完整 perspective cage depth 受 **14.5 local-unit** 上限約束；這個提升以 bounded line geometry 換取更強的前景／中景／遠景構圖，而不是提高全局 DPR。

## Validation Evidence

Focused validation必須同時驗證：

- source contract、exact object／triangle／draw budget；
- exactly 12 foreground perspective leads、54 total cage segments；
- live pylon depth及完整 cage depth span；
- real renderer DRAW delta 維持 +6；
- Standard → temporary High Photo Capture → Standard restore；
- disposal／rebuild／revisit lifecycle；
- 390×844、360×800 production Chromium screenshots及 viewport containment；
- zero storage／network／independent render loop。

Exact-head Actions／artifact／visual inspection evidence在該 cycle 完成後寫入 persistent Draft PR receipt，而不是預先宣稱成功。

## Risks／補充人手檢查

- 近景 additive line 在不同 Safari GPU、手機亮度及色域下可能有對比差異；自動 screenshot 主要證明構圖存在、無黑畫面及無 overflow，不能完全代表 OLED 實機觀感。
- 實體 iPhone Safari 長時間熱力、frame pacing、Capture Boost 瞬時 fill-rate 仍屬補充驗證，不是本切片自動完成 blocker。

## Completion Signal

CYG High／留影畫面具明確 foreground aperture → resonance beacon → binary stars 的三層視線引導，同時維持 bounded 6 draw／13,208 triangle、完整 quality lifecycle、V4+ 航行不變；兩個 production phone viewport、exact-head CI、visual inspection及 PR review 全部完成後，本切片才算完成。