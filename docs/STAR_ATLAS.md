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
3. 查看每個星區曾被多少次旅程涉及及最近相關旅程時間。
4. 查看已存在的本機發現紀錄；第一個來源為 LUNA「地月視差層」。
5. 在安全待命／探索狀態直接按「規劃前往」，交回原有 `WarpSim.select()`／Dijkstra planner 建立航線。
6. 八站全部到訪後看到「全星區巡航完成」狀態。

## Data authority

Star Atlas **不建立第二套航行或持久資料來源**：

- 到訪資料：由 `WarpTravelJournal.entries()` 已完成旅程推導；`SOL` 為起始星區。
- 目前位置／航行狀態：只讀 `WarpSim.state()`。
- LUNA 發現：只讀 `WarpLunaSurvey.progress()`。
- 航線規劃：只呼叫既有 `WarpSim.select(destination)`；Star Atlas 自己不計算座標、距離或路線。
- 不新增 `localStorage` key、資料庫、帳戶、後端、analytics 或 network request。

## Performance boundary

- Star Atlas 只在 DOM 層工作。
- 最多每 1 秒重新取樣一次；資料未改變時不重建卡片。
- 不使用 `requestAnimationFrame`，不進入 WebGL 60 Hz render loop。
- 收起時仍只做同一低頻狀態簽名檢查。

## Acceptance Criteria

- 八個現有星區全部存在且只出現一次。
- 完成旅程後，到訪數及相關星區卡會更新；中止航程不會因 Star Atlas 自己新增紀錄。
- 中途站只要存在於已完成 route，也會視為曾到訪，與現有旅行日誌的 visited 定義一致。
- `SOL` 在沒有任何日誌時仍為 1 / 8。
- LUNA 三觀測點全完成後，圖鑑顯示「地月視差層」；未完成時不偽造發現。
- 航行中、WebGL context lost、或目標等於目前位置時不可重新規劃。
- 「規劃前往」只使用原有 planner，沒有第二套 route graph／座標表。
- 8 / 8 時顯示全星區巡航完成。
- 手機窄畫面可退成單欄卡片，控制面板仍可正常捲動。
- Offline shell 包含 `star-atlas.js`；已準備的離線 session 不會因新增圖鑑而缺檔。
- `npm run check` 通過，V4.0 immutable snapshot hash 不變。

## Out of Scope

- 新星區、新航線、航路推薦或自動啟航。
- 雲端同步、帳戶、分享、排行榜或跨裝置進度。
- 新增第二套 discovery 儲存；後續發現應由各探索模組提供，再由圖鑑讀取。
- 把圖鑑擴展成大型成就／經濟／任務系統。

## Manual verification

手機 Safari 直向至少核實：

1. 新 session 顯示 `1 / 8`，SOL 為目前位置。
2. 完成 `SOL → LUNA` 後，SOL／LUNA 都標示已到訪，圖鑑進度更新。
3. 完成 LUNA 三點觀測後，「地月視差層」出現在 LUNA 卡。
4. 在 LUNA 按 VEGA「規劃前往」，只建立原有 LUNA → VEGA 航線，不會自動起航。
5. 航行中所有圖鑑規劃按鈕不可用。
6. 長途 `SOL → ORION` 完成後，中途 LUNA／VEGA／CYG 亦計入到訪。
7. 收起／展開圖鑑、旅行日誌及其他控制在直向畫面沒有捲動陷阱。
8. 已準備 offline cache 後斷網重開，Star Atlas 仍可載入及讀取本機日誌。
