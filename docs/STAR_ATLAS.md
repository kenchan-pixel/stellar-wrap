# Star Atlas｜星區圖鑑候選垂直切片

## 狀態

- **V5 候選方案／自主演進 Vertical Slice**
- 不改變 V4+ 核心航行、路線、相機、3D 場景、音效或 60 Hz render loop。
- 不代表其餘 V5 功能已自動批准。

## Goal／使用效果

把旅行日誌轉化成可操作的「星區圖鑑」，令完成航程後有清楚的全星圖探索進度，而不是只看到一串歷史旅程。

使用者可在航行控制面板：

1. 一眼看到 `已到訪 / 8` 星區進度。
2. 展開八個固定星區卡，分辨目前位置、已到訪及未到訪。
3. 查看最近保留日誌中每個星區涉及的旅程次數及最近時間。
4. 查看各站探索模組產生的本機發現紀錄；目前包括 LUNA `地月視差層`、VEGA `雙環共振窗口`、CYG `雙星航標三角場`、ORION `三線發射殼層`、TAU `三層環隙共振`。
5. 在安全待命／探索狀態直接按「規劃前往」，交回原有 `WarpSim.select()`／Dijkstra planner 建立航線。
6. 八站全部到訪後看到「全星區巡航完成」狀態。

## Data authority

Star Atlas **不建立第二套航行或持久資料來源**：

- 累積到訪資料：由旅行日誌同一個 `stellar-warp-travel-journal-v1` 記錄保存 `visited` IDs。
- 目前位置／航行狀態：只讀 `WarpSim.state()`。
- 各站 discovery：只讀各自 exploration module 的 `progress()`；Star Atlas 自己不保存 discovery。
- LUNA：`WarpLunaSurvey`；VEGA：`WarpVegaSurvey`；CYG：`WarpCygBeacon`；ORION：`WarpOrionSpectrum`；TAU：`WarpTauRings`。
- 航線規劃：只呼叫既有 `WarpSim.select(destination)`；Star Atlas 自己不計算座標、距離或路線。
- 不新增自己的 `localStorage` key、資料庫、帳戶、後端、analytics 或 network request。

## Performance boundary

- Star Atlas 只在 DOM 層工作。
- 最多每 1 秒重新取樣一次；資料未改變時不重建卡片。
- 不使用 `requestAnimationFrame`，不進入 WebGL 60 Hz render loop。
- 每站探索模組只以低頻狀態取樣或事件回應運作，不可成為第二個 renderer loop。

## Acceptance Criteria

- 八個現有星區全部存在且只出現一次。
- 完成旅程後，到訪數及相關星區卡更新；中止航程不會新增 visited ID。
- 中途站只要存在於已完成 route，也會永久加入 visited 集合。
- 最近 12 筆日誌淘汰舊旅程時，曾到訪星區仍保留，不會令 8/8 進度倒退。
- `SOL` 在沒有任何日誌時仍為 1 / 8。
- LUNA／VEGA／CYG／ORION／TAU 各自完成其 exploration slice 後，圖鑑只讀並顯示對應 discovery；未完成時不偽造發現。
- 航行中、WebGL context lost、或目標等於目前位置時不可重新規劃。
- 「規劃前往」只使用原有 planner，沒有第二套 route graph／座標表。
- 8 / 8 時顯示全星區巡航完成。
- 手機窄畫面可退成單欄卡片，控制面板仍可正常捲動。
- Offline shell 包含 Star Atlas 及所有目前候選 discovery modules；prepared offline session 不會因新增探索模組而缺檔。
- `npm run check` 通過，V4.0 immutable snapshot hash 不變。

## Out of Scope

- 新星區、新航線、航路推薦或自動啟航。
- 雲端同步、帳戶、分享、排行榜或跨裝置進度。
- 新增第二套集中式 discovery 儲存。
- 把圖鑑擴展成大型成就／經濟／任務系統。

## Manual verification

手機 Safari 直向至少核實：

1. 新 session 顯示 `1 / 8`，SOL 為目前位置。
2. 完成各站 discovery 時，對應卡片在同一分頁即時更新。
3. reload 後各站已完成 discovery 仍正確顯示。
4. 由圖鑑按另一星區「規劃前往」只建立原有航線，不會自動起航。
5. 航行中及 WebGL 恢復期間所有圖鑑規劃按鈕不可用。
6. 完成超過 12 次旅程後，已到訪星區仍不因舊日誌淘汰而消失。
7. 收起／展開圖鑑、旅行日誌及探索控制在直向畫面沒有捲動陷阱。
8. Prepared offline cache 後斷網重開，Star Atlas 及已快取 exploration modules 可載入及讀取本機進度。
