# Arrival Debrief｜到站航程摘要

## 狀態

- **產品層：V5 候選垂直切片**
- 不屬於已批准 V4.0 基線。
- 目的只係驗證「完成一段真實航程後，有清楚收結與下一步」會否提升長途旅行的完成感及探索連續性。

## Goal／使用效果

完整抵達最終目的地後，在原有到站探索卡內顯示一張精簡航程摘要：

- 最終目的地
- 完成航段數
- 實際航線
- 總航線距離
- 旅行日誌已量度的活躍航行時間
- 「繼續探索」與「下一目的地」兩個直接下一步

摘要不新增另一個大型浮層，亦不遮擋中央 3D 視野。

## Scope

1. 旅行日誌只有在既有完成條件通過後，才發出 `stellarwarp:journey-complete` 本頁事件。
2. `arrival-debrief.js` 只接收這個已驗證完成事件，不另建第二套航程完成判斷。
3. 顯示前再次確認：目前位置等於航線終點、正在最終探索、沒有航行、沒有 WebGL context lost。
4. 航線距離使用與正式八站星圖相同的 X／Y／Z 座標計算。
5. 「下一目的地」只打開既有星圖；不改 Dijkstra、路線資料或飛行狀態。
6. WebGL context lost 時即時收起摘要。
7. 模組零 polling、零 `requestAnimationFrame`、零後端、零網絡請求、零新增持久儲存。
8. 模組加入既有 Service Worker shell cache，保持一次成功在線載入後的離線候選體驗完整。

## Acceptance Criteria

- 中止航程不會顯示到站摘要。
- 中途飛掠不會顯示到站摘要。
- 完整抵達最終目的地後只出現一張摘要。
- `SOL → ORION` 顯示 4 段、約 17.0 LY，路線為 `SOL → LUNA → VEGA → CYG → ORION`。
- `SOL → TAU` 顯示 2 段、約 11.4 LY，路線為 `SOL → SIRIUS → TAU`。
- 活躍航行時間沿用旅行日誌數值，因此切 App／鎖屏／WebGL recovery 的暫停時間不會被當成航行時間。
- 「繼續探索」只收起摘要；「下一目的地」打開現有星圖。
- LUNA 觀測任務及 Destination Photo Mode 仍可正常使用。
- 60 Hz render loop、相機、航向、航行 timing、arrival Hermite、音效及 Adaptive Quality 不作修改。

## Out of Scope

- 成就、XP、貨幣或獎勵系統
- 分享到社交平台
- 雲端旅行紀錄
- 修改旅行日誌資料格式
- 自動選擇下一目的地
- 改變已批准路線或航行時間

## 手動驗收

1. 手機直向完成 `SOL → LUNA`：摘要應在原有探索卡內，中央月面仍可見。
2. 按「繼續探索」：摘要消失，拖動／自動環繞保持正常。
3. 再完成一段航程，按「下一目的地」：現有星圖正常打開。
4. 完成 `SOL → ORION`：確認 4 段、約 17.0 LY 及完整路線可讀。
5. 中途站 fly-by：不得出現摘要。
6. 航行中止：不得出現摘要。
7. 摘要顯示時觸發 WebGL context lost：摘要應收起；恢復後不應虛構第二次完成事件。
8. 已準備離線後重開並完成 `SOL → LUNA`：摘要模組仍可用。
9. iPhone Safari 直向檢查 LUNA survey、photo-mode trigger 與摘要同時存在時，卡片沒有捲動陷阱或明顯遮景。

## Completion Signal

實作、專用 validator、offline cache 整合及 Draft PR exact-HEAD CI 全部通過；實機手機驗收仍由擁有人完成後才可提升決策狀態。
