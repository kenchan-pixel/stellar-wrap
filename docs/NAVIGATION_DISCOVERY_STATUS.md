# Navigation Discovery Status｜探索感知星圖

## 狀態

- **V5 候選方案／自主演進 Vertical Slice**
- 目的：把已存在的探索成果帶回航行決策畫面，令星圖不只顯示「去邊度」，亦清楚顯示「邊度已探索／未探索」。
- 不改 V4.1.0 路線、座標、Dijkstra、相機、renderer、航行時間或 3D 場景。

## Goal／使用效果

使用者打開「星圖 / 航行」時，不需要先展開 Star Atlas 再記住哪些星區已完成探索：

1. 已收錄 discovery 的外站，星圖節點直接顯示 `✓`。
2. 路線卡顯示目前 `x / 7` 外站探索進度。
3. 點選一個目的地後，路線卡直接顯示「已收錄『發現名稱』」或「尚未完成本站探索」。
4. SOL 明確標示為母港，不會被錯誤視為缺少第八個 discovery。
5. 完成新 discovery 後，同一分頁的星圖狀態即時更新，不需要 reload。

這形成較完整的循環：

`星圖選站 → 航行 → 探索 → 收錄 discovery → 回到星圖時看見探索成果`

## Data authority

本功能只讀既有 `WarpStarAtlas.snapshot().discoveries`：

- 不建立新 `localStorage` key。
- 不複製七個探索模組的 progress state。
- 不建立第二套路線、座標、距離或推薦邏輯。
- 選站與航線仍完全由現有 `index.html`／`WarpSim.select()`／Dijkstra planner 擁有。

## Runtime／效能邊界

核心星圖每次 `mapDraw()` 都會重建 SVG 節點，因此此層只觀察 `#map` 的**直接子節點**變動，再用 microtask 合併同一輪 redraw 的多次通知，重加 discovery 標記。

- 零 `setInterval` polling。
- 零 `requestAnimationFrame`。
- 零 network／backend／analytics。
- 零額外 persistence。
- 不進入 60 Hz WebGL render loop。
- SVG 只新增小型文字 check marker 及 stroke，沒有新 canvas／texture／particle 工作。

## Acceptance Criteria

- 八個現有星區仍由核心星圖產生，本模組不複製座標或 route graph。
- 已完成 discovery 的外站節點顯示一個 `✓`；未完成外站不偽造完成狀態。
- 路線卡顯示正確 `x / 7` 外站 discovery 數。
- 點選已完成目的地時顯示實際 discovery 名稱。
- 點選未完成目的地時明確顯示「尚未完成本站探索」。
- SOL 顯示母港狀態，不要求人工補一個 discovery。
- `stellarwarp:discovery-change` 後同一分頁即時更新數量、路線卡及星圖 marker。
- 核心 `mapDraw()` 重建 SVG 後 marker 會自動恢復，不需要修改核心航行 renderer。
- 手機控制面板仍可捲動，新增狀態列不加入新操作按鈕或觸控負擔。
- prepared offline shell 包含此模組。
- `npm run check` 通過；V4.0 immutable snapshot 及已批准路線不變。

## Out of Scope

- 多站 itinerary／Expedition。
- 自動推薦「下一個未探索星區」。
- 自動排序最佳探索路線或自動起航。
- 新獎勵、經驗值、貨幣或任務鏈。
- 修改 Star Atlas discovery 儲存方式。
- 修改核心 SVG 星圖投影、路線網絡或航行狀態機。

## Manual verification

手機 Safari 直向至少確認：

1. 390px 左右寬度下，`✓` 不遮擋星區名稱或節點。
2. 連續快速點選不同星區，探索狀態與 route card 目的地一致。
3. 完成一個新 discovery 後，不 reload 直接開星圖，marker／`x / 7` 已更新。
4. 7 / 7 時七個外站全部有 marker，SOL 仍保持母港語意。
5. 星圖關閉／重開、多次 route redraw 後 marker 不重複累積。
6. prepared offline session 斷網重開後，已快取模組可讀取本機探索進度。
7. 實機 FPS／DPR 不應有可感知變化；本切片不宣稱已證明 60 fps。
