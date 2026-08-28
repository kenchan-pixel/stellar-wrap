# Arrival Debrief｜到站航程摘要

## 狀態

- **產品層：V5 候選垂直切片**
- 不屬於已批准 V4.0 基線。
- 目的係驗證「完成一段真實航程後，有清楚收結與下一步」會否提升長途旅行的完成感及探索連續性。

## Goal／使用效果

完整抵達最終目的地後，在原有到站探索卡內顯示一張精簡航程摘要：

- 最終目的地
- 完成航段數
- 實際航線
- 總航線距離
- 旅行日誌已量度的活躍航行時間
- 當前目的地探索狀態
- 「開始探索／查看發現／自由探索」與「下一目的地」兩個直接下一步

Arrival Debrief 會在真正到站時固定佔用 `#exploreDesc` 之後的第一個內容位置，避免獨立動態載入的 Landmark Guide 或目的地掃描器把航程收結推到手機卡片底部。外站尚未完成探索時，主操作直接帶到該站既有探索介面；已完成時顯示 Star Atlas 已收錄的發現名稱並可直接回看。SOL 保持母港自由探索，不虛構額外 discovery。

旅行日誌亦會在每次新完成旅程顯示該次距離，並在摘要顯示目前已保存旅程的累積距離。摘要不新增另一個大型浮層，亦不遮擋中央 3D 視野。

## Scope

1. 旅行日誌只有在既有完成條件通過後，才發出 `stellarwarp:journey-complete` 本頁事件。
2. `arrival-debrief.js` 只接收這個已驗證完成事件，不另建第二套航程完成判斷。
3. 顯示前再次確認：目前位置等於航線終點、正在最終探索、沒有航行、沒有 WebGL context lost。
4. **航線距離只有一個 runtime authority：** 核心 planner 仍使用 `index.html` 的正式八站 `N[].p`／`D()` 計算；旅行日誌在起航時讀取既有 planner 已顯示的 `#routeMeta` 距離快照，完成後隨旅程紀錄保存。Arrival Debrief 只顯示該 planner-owned snapshot，不再複製座標或自行重算。
5. 舊旅行日誌紀錄沒有 `distance` 欄位仍可讀取；只有新完成旅程會開始保存 planner 距離，不清除舊資料。
6. 「下一目的地」只打開既有星圖；不改 Dijkstra、路線資料或飛行狀態。
7. 外站探索狀態只讀取既有 `WarpStarAtlas.snapshot().discoveries`，不建立第二份 discovery state；同頁 `stellarwarp:discovery-change` 會刷新目前仍顯示的 Debrief。
8. 外站主探索操作只 `scrollIntoView()` 到既有目的地探索模組，不自動改 slider、不代玩家完成觀測、不接管相機或航行控制。
9. Debrief 以 `#exploreDesc` 的 immediate-next sibling 作單一排序權限；只監察該直接父層的 `childList`。若 LUNA／VEGA 或其他獨立模組較遲插入內容，Debrief 會在下一個 DOM mutation microtask 把自己移回第一個內容位置，避免載入次序改變手機閱讀流程。
10. 排序監察不觀察 subtree、不 polling、不進入 `requestAnimationFrame`，因此目的地卡內部的 2 Hz 更新不會觸發重新排序工作。
11. 主操作按鈕維持最少 44 px 高度；桌面版沿用既有 responsive typography。
12. WebGL context lost 時即時收起摘要。
13. 模組零 polling、零 `requestAnimationFrame`、零後端、零網絡請求；旅行日誌繼續沿用原有 2 Hz 有界取樣及本機儲存。
14. 模組仍包含於既有 Service Worker shell cache，保持一次成功在線載入後的離線候選體驗完整。

## Acceptance Criteria

- 中止航程不會顯示到站摘要或新增旅程。
- 中途飛掠不會顯示到站摘要。
- 完整抵達最終目的地後只出現一張摘要，並固定排在目的地 Landmark／掃描器之前，不受獨立 module import 完成次序影響。
- `SOL → ORION` 顯示 4 段、約 17.0 LY，路線為 `SOL → LUNA → VEGA → CYG → ORION`。
- `SOL → TAU` 顯示 2 段、約 11.4 LY，路線為 `SOL → SIRIUS → TAU`。
- Arrival Debrief 不包含獨立座標表；專用 validator 的 ORION／TAU 距離基線直接由 production `index.html` 的星區資料抽取後計算，日後正式座標改動不會由兩份 stale table 互相掩護。
- 新完成旅程的旅行日誌列出距離；日誌摘要可顯示已保存且有距離資料旅程的累積 LY。
- 舊有無距離紀錄繼續正常顯示，不會因 schema extension 被刪除。
- 活躍航行時間沿用旅行日誌數值，因此切 App／鎖屏／WebGL recovery 的暫停時間不會被當成航行時間。
- LUNA／VEGA／CYG／ORION／TAU／SIRIUS／PROX 未完成 discovery 時顯示「開始探索」，並直接捲到該站真正 production 探索模組。
- 執行式 390×844 regression 會刻意在 Debrief 已顯示後才載入七個外站各自的 production 探索模組，逐站確認 Debrief 仍在 `#exploreDesc` 後第一位、先於 Landmark／實際任務，且主操作可捲到真實任務。
- 同一站 discovery 完成後，Debrief 顯示 Star Atlas 收錄名稱並把主操作改成「查看發現」。
- SOL 顯示「自由探索」，不新增 discovery 或任務狀態。
- 「下一目的地」仍只打開現有星圖。
- LUNA 觀測任務、各外站探索器、Landmark Guide 及 Destination Photo Mode 仍可正常使用。
- 60 Hz render loop、相機、航向、航行 timing、arrival Hermite、音效及 Adaptive Quality 不作修改。

## Out of Scope

- 成就、XP、貨幣或獎勵系統
- 分享到社交平台
- 雲端旅行紀錄
- 建立第二套座標／route planner 模組
- 自動選擇下一目的地
- 自動完成目的地探索或代玩家調校掃描器
- 改變已批准路線或航行時間
- 改寫七個目的地模組的內部 UI／任務邏輯

## 手動驗收

1. 手機直向完成 `SOL → LUNA`：摘要應顯示約 2.8 LY，並位於 LUNA 觀測卡之前；中央月面仍可見。
2. LUNA discovery 未完成時按「開始探索」：摘要收起並直接捲到 LUNA 觀測任務，任務本身不被自動完成。
3. 完成 LUNA 三點觀測，再完成／重新觸發到站摘要：顯示「探索完成 · 已收錄『地月視差層』」及「查看發現」。
4. 特別在 VEGA 首次載入及重新整理後檢查：無論 Landmark Guide／VEGA module 誰先完成載入，Debrief 都必須在兩者之前。
5. 任一 CYG／ORION／TAU／SIRIUS／PROX 外站重複以上流程，確認直接 handoff 到正確 scanner／calibration card。
6. SOL 到站時顯示「自由探索」，沒有虛構探索完成紀錄。
7. 再完成一段航程：日誌摘要的累積 LY 應增加，重新整理後新旅程距離仍保留。
8. 若裝置已有舊版旅行紀錄：舊紀錄仍可正常顯示，即使該筆沒有距離。
9. 按「下一目的地」：現有星圖正常打開。
10. 完成 `SOL → ORION`：確認 4 段、約 17.0 LY 及完整路線可讀，而且 planner／日誌／debrief 距離一致。
11. 中途站 fly-by：不得出現摘要。
12. 航行中止：不得出現摘要或新增距離紀錄。
13. 摘要顯示時觸發 WebGL context lost：摘要應收起；恢復後不應虛構第二次完成事件。
14. 已準備離線後重開並完成 `SOL → LUNA`：摘要、探索 handoff 及旅程距離仍可用。
15. iPhone Safari 直向檢查 Debrief、Landmark Guide、destination scanner 及 photo-mode trigger 同時存在時，卡片沒有水平 overflow 或捲動陷阱；兩個 Debrief action 均有約 44 px 點擊高度。

## Completion Signal

實作、單一距離／discovery authority、七站 production DOM/event 載入次序 handoff regression、offline cache 相容及 Draft PR exact-HEAD CI 全部通過；實機手機驗收仍由擁有人完成後才可提升決策狀態。
