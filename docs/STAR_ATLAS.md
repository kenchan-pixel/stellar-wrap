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
9. 有已完成航程的裝置 reload 後，會回到**最近真正完成的目的地**並進入該站探索；若核心尚未 ready，畫面保持「恢復上次停泊點…」遮罩，不會先短暫露出 SOL 再跳到外站。星圖亦重新套用旅行日誌的累積到訪標記。

SOL 是旅程出發母港，因此目前不強行加入一個人工 discovery 來湊數；外站探索集合明確為其餘七個目的地。

## Discovery Field Notes

Star Atlas 為七個外站保存靜態展示 metadata：

- `name`：與現有 discovery 名稱一致。
- `kind`：例如發射光譜、行星環結構、人工星門、導航訊號。
- `note`：一段短、目的地專屬、清楚標明為模擬／科幻觀測語意的說明。

Field note **不代表新的科學數據模型**，亦不影響 discovery 是否完成。只有當既有探索模組回報 discovery 已完成時，對應卡片才顯示 note。

## Reload World Continuity

- 最近位置只由旅行日誌**原始最新一筆** completed journey 推導；不建立第二個 `current location` storage key。位置 restore 會在寬鬆的日誌展示／migration parser 之前獨立做嚴格檢查：原 route 每一個 ID 都必須屬於現有八站、route 至少兩站、開始／完成時間必須有效且完成時間較後、活躍航行秒數必須大於 0。任一條件不成立即 fail closed，亦不會跳過損壞最新紀錄改用較舊紀錄猜測位置。
- 只要嚴格 parser 找到有效 restore candidate，Travel Journal 會在既有 startup loading 下面放置一層無互動「恢復上次停泊點…」遮罩。它不新增 timer；核心 authority 未 ready 時沿用原有 2 Hz sampler 重試，因此使用者不會在判定期間看到預設 SOL 場景。
- client core ready 後，Travel Journal 先透過 `WarpSim.isRouteValid(route)` 讀取 core 同一份 6.0 LY `G` route graph，逐段確認 persisted route 拓撲仍屬合法航線；Travel Journal 不複製座標或 edge table。只有 route 合法且仍是乾淨 SOL idle state，才呼叫既有 `WarpSim.jumpTo(destination)`，讓原有 scene／camera／exploration transition 成為唯一位置切換 authority。成功 transition 完成後才移除遮罩。
- 若 route topology、clean-state guard 或其他權威檢查 fail closed，遮罩會立即解除並保留真實 SOL／當前 runtime 狀態；不會因恢復失敗把 UI 永久鎖住。
- 若使用者已選航線、已在探索、正在飛行、WebGL context lost，或 runtime 已由其他機制切到非 SOL，restore 會放棄，不會遲到覆蓋使用者操作。
- fresh session、沒有有效 completed journey、含未知中途 route ID、已知 ID 但存在超過 6.0 LY／core graph 不相連的 route leg、時間次序不可能或其他損壞紀錄一律維持 SOL。
- 星圖的歷史 `visited` 只讀 `WarpTravelJournal.visited()`，並只**補上**持久到訪 class，不刪除 core 本 session 已建立的 live visited state。
- reload 不恢復半途航程；中止或未完成的 flight 沒有 journal completion，所以只會回到上一次真正停泊點。

## Data authority

Star Atlas **不建立第二套航行或持久資料來源**：

- 累積到訪資料：由旅行日誌同一個 `stellar-warp-travel-journal-v1` 記錄保存 `visited` IDs。
- 最近停泊位置：由同一記錄中原始最新一筆通過嚴格完整性／完成時間檢查，並再由 core `WarpSim.isRouteValid()` 對 authoritative 6.0 LY graph 驗證拓撲的 completed journey route destination 推導；寬鬆日誌顯示 parser 不具有位置 authority。
- 目前位置／航行狀態：只讀 `WarpSim.state()`；實際 reload restore 只使用既有 `WarpSim.jumpTo()`。
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
- 旅行日誌沿用既有 2 Hz 航程取樣；reload restore veil 只在有嚴格 restore candidate 時建立一個暫時 DOM 節點，並沿用同一 sampler 等待 core authority，**不新增 timer、observer 或 requestAnimationFrame**。
- 探索成果只在既有 render／event／storage 流程讀取。
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
- Journal storage schema 不增加 discovery 或另一個 current-location 欄位／key。
- 完成 TAU 等外站航程後 reload，runtime 由該站探索模式繼續；在 core route/scene authority 完成 restore 判定前不得先顯示預設 SOL，成功 `jumpTo()` 後才解除遮罩。
- reload 後星圖重新顯示所有 journal visited 星區；core 本 session 的 live visited 狀態不可被 overlay 刪除。
- fresh session 不建立 restore veil；損壞 history、含未知中途 ID 的 route、只含已知 ID 但存在不可能 direct leg（例如 `SOL → ORION`）、完成時間早於開始時間、已選航線或飛行中狀態不可被 reload restore 誤覆蓋；損壞最新紀錄不可自動 fallback 到較舊紀錄猜測目前位置。
- 權威 restore 判定 fail closed 後必須移除遮罩並保留 SOL／現有 runtime，不可形成永久 loading trap。
- 航行中、WebGL context lost、或目標等於目前位置時不可重新規劃。
- 「規劃前往」只使用原有 planner，沒有第二套 route graph／座標表。
- Offline shell 繼續使用已快取的 Travel Journal／Navigation runtime；沒有新增 runtime dependency。
- `npm run check` 通過，V4.0 immutable snapshot hash 不變。

## Out of Scope

- 恢復 reload 前未完成的飛行 phase／秒數／中途位置。
- 改動核心 loading screen、renderer、camera、route graph 或 flight timing。
- 把 discovery 結果或 field note 複製寫入每筆旅行日誌。
- 為 SOL 人工增加一個探索發現只為達到 8 / 8 discovery。
- 把 field note 當成真實天文學測量或物理模型。
- 新星區、新航線、航路推薦或自動啟航。
- 雲端同步、帳戶、分享、排行榜或跨裝置進度。
- 大型成就／經濟／任務系統。

## Manual verification

手機 Safari 直向至少核實：

1. fresh session 顯示 `1 / 8`，SOL 為目前位置且沒有 restore veil／discovery field note。
2. 完成 `SOL → TAU` 或另一外站航程，停在到站探索後 reload；確認 loading 之後直接看到同一外站探索，期間不先閃出 SOL；若 core 尚未 ready，只應短暫看到「恢復上次停泊點…」。
3. reload 後開星圖，確認之前 completed route 的所有 visited 星區仍有到訪標記；再揀新目的地確認航線由恢復後目前站開始。
4. reload 前只選了航線但未啟航／或沒有完成新航程時，不應把「選定目的地」誤當成目前位置。
5. 完成任一外站 discovery，確認卡片才出現 `發現 · 名稱`＋分類／note，未完成卡不洩漏內容。
6. note 在 390 px 級手機雙欄卡不會推高版面到難以掃讀；360 px 以下單欄正常。
7. 完成各站 discovery 時，對應卡片在同一分頁即時更新，發現總數同步增加。
8. 展開旅行日誌，確認 outcome 與 Star Atlas 的 `x / 7` 一致。
9. 七個外站 discovery 全部完成時顯示 `7 / 7 發現` 及「探索檔案完成」。
10. Prepared offline cache 後斷網重開，最近停泊點、Star Atlas、visited 標記及 field notes 可由已快取 runtime 正常呈現，亦不應先閃出 SOL。
