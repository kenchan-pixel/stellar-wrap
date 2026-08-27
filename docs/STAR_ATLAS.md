# Star Atlas｜星區圖鑑候選垂直切片

## 狀態

- **V5 候選方案／自主演進 Vertical Slice**
- 不改變 V4+ 核心航行、路線、相機、3D 場景、音效或 60 Hz render loop。
- 不代表其餘 V5 功能已自動批准。

## Goal／使用效果

把已存在的旅行日誌轉化成可操作的「星區圖鑑」，令完成航程後有清楚的全星圖探索進度，而不是只看到一串歷史旅程。

使用者可在航行控制面板：

1. 一眼看到 `已到訪 / 8` 星區進度。
2. 展開八個固定星區卡，分辨目前位置、已到訪及未到訪。
3. 查看最近保留日誌中每個星區涉及的旅程次數及最近時間。
4. 查看由各站探索模組產生的本機發現紀錄；目前包括 LUNA「地月視差層」及 VEGA「雙環共振窗口」。
5. 在安全待命／探索狀態直接按「規劃前往」，交回原有 `WarpSim.select()`／Dijkstra planner 建立航線。
6. 八站全部到訪後看到「全星區巡航完成」狀態。

## Data authority

Star Atlas **不建立第二套航行或持久資料來源**：

- 累積到訪資料：由現有旅行日誌同一個 `stellar-warp-travel-journal-v1` 記錄保存 `visited` IDs；最近 12 次 entries 仍按原上限裁切，但已到訪星區不會因此消失。
- 舊版日誌沒有 `visited` 欄位時，會先由仍保留的歷史 entries 推導並向後相容；不猜測已經被舊版 12 筆上限淘汰的更早歷史。
- 目前位置／航行狀態：只讀 `WarpSim.state()`。
- LUNA 發現：只讀 `WarpLunaSurvey.progress()`。
- VEGA 發現：只讀 `WarpVegaSurvey.progress()`。
- 航線規劃：只呼叫既有 `WarpSim.select(destination)`；Star Atlas 自己不計算座標、距離或路線。
- 不新增自己的 `localStorage` key、資料庫、帳戶、後端、analytics 或 network request；每站探索模組只保存該站自己的本機觀測進度。

## Performance boundary

- Star Atlas 只在 DOM 層工作。
- 最多每 1 秒重新取樣一次；資料未改變時不重建卡片。
- 不使用 `requestAnimationFrame`，不進入 WebGL 60 Hz render loop。
- 收起時仍只做同一低頻狀態簽名檢查。
- VEGA guided survey 與 LUNA 一樣只以 2 Hz 讀取安全探索狀態，不改 renderer、相機或航行 timing。

## Acceptance Criteria

- 八個現有星區全部存在且只出現一次。
- 完成旅程後，到訪數及相關星區卡會更新；中止航程不會新增 visited ID。
- 中途站只要存在於已完成 route，也會永久加入 visited 集合。
- 最近 12 筆日誌淘汰舊旅程時，曾到訪星區仍保留，不會令 8/8 進度倒退。
- `SOL` 在沒有任何日誌時仍為 1 / 8。
- LUNA 三觀測點全完成後，圖鑑顯示「地月視差層」；未完成時不偽造發現。
- VEGA 三個星門校準觀測全完成後，圖鑑顯示「雙環共振窗口」；未完成時不偽造發現。
- 航行中、WebGL context lost、或目標等於目前位置時不可重新規劃。
- 「規劃前往」只使用原有 planner，沒有第二套 route graph／座標表。
- 8 / 8 時顯示全星區巡航完成。
- 手機窄畫面可退成單欄卡片，控制面板仍可正常捲動。
- Offline shell 包含 `star-atlas.js` 及 `vega-survey.js`；已準備的離線 session 不會因新增探索模組而缺檔。
- `npm run check` 通過，V4.0 immutable snapshot hash 不變。

## Out of Scope

- 新星區、新航線、航路推薦或自動啟航。
- 雲端同步、帳戶、分享、排行榜或跨裝置進度。
- 新增第二套集中式 discovery 儲存；各站 discovery 由各自探索模組提供，再由圖鑑只讀聚合。
- 把圖鑑擴展成大型成就／經濟／任務系統。

## Manual verification

手機 Safari 直向至少核實：

1. 新 session 顯示 `1 / 8`，SOL 為目前位置。
2. 完成 `SOL → LUNA` 後，SOL／LUNA 都標示已到訪，圖鑑進度更新。
3. 完成 LUNA 三點觀測後，「地月視差層」出現在 LUNA 卡。
4. 由 LUNA 前往 VEGA，完整抵達後只顯示 VEGA 校準觀測；完成三點後「雙環共振窗口」出現在 VEGA 卡。
5. 在 VEGA 按另一未到訪星區「規劃前往」，只建立原有航線，不會自動起航。
6. 航行中及 WebGL 恢復期間所有圖鑑規劃按鈕不可用，文字狀態正確。
7. 長途 `SOL → ORION` 完成後，中途 LUNA／VEGA／CYG 亦計入到訪。
8. 完成超過 12 次旅程後，已到訪星區仍不因舊日誌淘汰而消失。
9. 收起／展開圖鑑、旅行日誌及其他控制在直向畫面沒有捲動陷阱。
10. 已準備 offline cache 後斷網重開，Star Atlas、LUNA 及 VEGA 探索模組仍可載入及讀取本機進度。
