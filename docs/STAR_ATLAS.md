# Star Atlas｜星區圖鑑候選垂直切片

## 狀態

- **V5 候選方案／自主演進 Vertical Slice**
- 不改變 V4+ 核心航行、路線、相機、3D 場景、音效或 60 Hz render loop。
- 不代表其餘 V5 功能已自動批准。

## Goal／使用效果

把旅行日誌轉化成可操作的「星區圖鑑」，令完成航程後有清楚的全星圖探索進度，而不是只看到一串歷史旅程。

使用者可在航行控制面板：

1. 一眼看到 `已到訪 / 8` 星區進度，以及 `已發現 / 7` 外站探索進度。
2. 展開八個固定星區卡，分辨目前位置、已到訪及未到訪。
3. 查看最近保留日誌中每個星區涉及的旅程次數及最近時間。
4. 查看各站探索模組產生的本機發現紀錄：LUNA `地月視差層`、VEGA `雙環共振窗口`、CYG `雙星航標三角場`、ORION `三線發射殼層`、TAU `三層環隙共振`、SIRIUS `雙星相位中繼窗`、PROX `紅矮星港三點進場網`。
5. 已收錄 discovery 的卡片同時顯示簡短 **field note**：分類＋一段目的地專屬觀測註記，令發現不只是名稱 badge。
6. 在安全待命／探索狀態直接按「規劃前往」，交回原有 `WarpSim.select()`／Dijkstra planner 建立航線。
7. 八站全部到訪後看到「全星區巡航完成」；七個外站發現全部收錄後另外看到「探索檔案完成」。
8. 旅行日誌亦會把每次已完成航程與**目前探索成果**連在一起：外站顯示 `發現 · 名稱` 或 `探索未完成`，摘要同步顯示 `x / 7 發現`。

SOL 是旅程出發母港，因此目前不強行加入一個人工 discovery 來湊數；外站探索集合明確為其餘七個目的地。

## Discovery Field Notes

Star Atlas 為七個外站保存靜態展示 metadata：

- `name`：與現有 discovery 名稱一致。
- `kind`：例如發射光譜、行星環結構、人工星門、導航訊號。
- `note`：一段短、目的地專屬、清楚標明為模擬／科幻觀測語意的說明。

Field note **不代表新的科學數據模型**，亦不影響 discovery 是否完成。只有當既有探索模組回報 discovery 已完成時，對應卡片才顯示 note。

## Data authority

Star Atlas **不建立第二套航行或持久資料來源**：

- 累積到訪資料：由旅行日誌同一個 `stellar-warp-travel-journal-v1` 記錄保存 `visited` IDs。
- 目前位置／航行狀態：只讀 `WarpSim.state()`。
- 各站 discovery completion：只讀各自 exploration module 的 `progress()`；Star Atlas 自己不保存 discovery。
- LUNA：`WarpLunaSurvey`；VEGA：`WarpVegaSurvey`；CYG：`WarpCygBeacon`；ORION：`WarpOrionSpectrum`；TAU：`WarpTauRings`；SIRIUS：`WarpSiriusRelay`；PROX：`WarpProxAlignment`。
- Field-note profile 是 `SYSTEMS` 內的靜態 presentation metadata，不是 localStorage／進度 state；`snapshot().systems` 只提供拷貝予其他 UI 消費。
- 旅行日誌中的探索成果標記只讀 `WarpStarAtlas.snapshot().discoveries`；**不把 discovery 複製進 journal storage**。
- 航線規劃：只呼叫既有 `WarpSim.select(destination)`；Star Atlas 自己不計算座標、距離或路線。
- 不新增自己的 localStorage key、資料庫、帳戶、後端、analytics 或 network request。

## Performance boundary

- Star Atlas 只在 DOM 層工作。
- 最多每 1 秒重新取樣一次；資料未改變時不重建卡片。
- Field note 只在既有 card render 時建立文字節點，不新增 timer、observer 或 WebGL 工作。
- 旅行日誌沿用既有 2 Hz 航程取樣；探索成果只在既有 render／event／storage 流程讀取。
- 不使用 `requestAnimationFrame`，不進入 WebGL 60 Hz render loop。

## Acceptance Criteria

- 八個現有星區全部存在且只出現一次。
- 七個外站恰好各有一份 destination-specific field-note profile；SOL 沒有假 discovery。
- Field note 只在對應 discovery 真正完成後顯示；未完成卡片不預先洩漏 discovery 內容。
- 手機雙欄卡的 note 最多約三行，避免圖鑑高度失控；<=360 px 仍可退成單欄。
- 完成旅程後，到訪數及相關星區卡更新；中止航程不會新增 visited ID。
- 中途站只要存在於已完成 route，也會永久加入 visited 集合。
- 最近 12 筆日誌淘汰舊旅程時，曾到訪星區仍保留，不會令 8/8 進度倒退。
- `SOL` 在沒有任何日誌時仍為 1 / 8。
- 七個外站各自完成 exploration slice 後，圖鑑只讀並顯示對應 discovery；未完成時不偽造發現。
- 發現摘要固定顯示 `x / 7 發現`；只有七個外站 discovery 都完成才顯示探索檔案完成。
- 同一分頁完成 discovery 後，旅行日誌及 Star Atlas 不需 reload 即更新；reload／storage 更新亦重新讀取既有 authority。
- Journal storage schema 不增加 discovery 欄位。
- 航行中、WebGL context lost、或目標等於目前位置時不可重新規劃。
- 「規劃前往」只使用原有 planner，沒有第二套 route graph／座標表。
- Offline shell 包含 Star Atlas 及所有目前候選 discovery modules。
- `npm run check` 通過，V4.0 immutable snapshot hash 不變。

## Out of Scope

- 把 discovery 結果或 field note 複製寫入每筆旅行日誌。
- 為 SOL 人工增加一個探索發現只為達到 8 / 8 discovery。
- 把 field note 當成真實天文學測量或物理模型。
- 新星區、新航線、航路推薦或自動啟航。
- 雲端同步、帳戶、分享、排行榜或跨裝置進度。
- 大型成就／經濟／任務系統。

## Manual verification

手機 Safari 直向至少核實：

1. 新 session 顯示 `1 / 8`，SOL 為目前位置且沒有 discovery field note。
2. 完成任一外站 discovery，確認卡片才出現 `發現 · 名稱`＋分類／note，未完成卡不洩漏內容。
3. note 在 390 px 級手機雙欄卡不會推高版面到難以掃讀；360 px 以下單欄正常。
4. 完成各站 discovery 時，對應卡片在同一分頁即時更新，發現總數同步增加。
5. 展開旅行日誌，確認 outcome 與 Star Atlas 的 `x / 7` 一致。
6. reload 後各站已完成 discovery、field note 及旅行日誌 outcome 仍正確顯示。
7. 七個外站 discovery 全部完成時顯示 `7 / 7 發現` 及「探索檔案完成」。
8. 由圖鑑按另一星區「規劃前往」只建立原有航線，不會自動起航。
9. Prepared offline cache 後斷網重開，Star Atlas 及 field notes 可由已快取 runtime 正常呈現。
