# Discovery Completion Handoff｜探索完成交接

## 狀態

- **V5 候選垂直切片**
- 目的：完成目的地探索後，立即把「發現已收錄」變成清楚的旅程節點，而不是只在任務卡內改一行文字。
- 已加入 **Discovery Field Notes + Photo Handoff**：發現附上簡短分類與觀測註記，並可直接進入既有攝影模式留影。
- 已加入 **Expedition Continuation｜探索遠征續行**：完成一站後，直接指出並預選下一個尚未完成探索的外站，減少「完成 → 開圖 → 再找未探索站」的操作斷點。
- 本輪修正 completion event 早於 Star Atlas snapshot 時的進度一致性，避免第七個 discovery 顯示 `6 / 7` 但同時已進入 `探索檔案完成` 的矛盾狀態。
- 不改 V4.1.0 航線、相機、renderer、航行時間或 3D 場景。

## Goal／使用效果

當使用者在 LUNA、VEGA、CYG、ORION、TAU、SIRIUS 或 PROX 完成該站 discovery，探索卡底部顯示一次簡潔完成摘要：目的地、發現名稱、目的地專屬 field note，以及目前 `x / 7` 外站發現進度。

摘要提供三個下一步：

1. **留影記錄**：進入既有 Destination Photo Mode，保留當前 3D 場景供使用者構圖／儲存 PNG。
2. **查看星區圖鑑**：開啟現有控制面板並展開 Star Atlas。
3. **下一個未探索 · {星區}**：按現有七外站 catalog 的循環順序找出下一個尚未收錄 discovery 的站，呼叫既有 `WarpSim.select(destination)` 建立正式航線，再打開原有星圖供使用者檢查及自行按「啟動航行」。

當七個外站 discovery 全部完成，第三個 action 會變成不可按的 **「探索檔案完成」**，進度同時必須顯示 **`7 / 7`**，不會再製造虛假下一站或出現終局／計數矛盾。

完整流程變成：

`抵達 → 開始探索 → 完成發現 → 理解發現 → 留影／收錄圖鑑／一鍵預選下一個未探索站 → 人手確認啟航`

## Data authority

- 發現是否完成仍由現有各目的地模組及 `WarpStarAtlas.snapshot().discoveries` 擁有。
- 七個外站的 **field-note metadata** 是 Star Atlas 的靜態展示資料（name／kind／note），不是新進度來源。
- Discovery Debrief 只由 `WarpStarAtlas.snapshot().systems` 讀取 field note；不建立第二套 discovery store。
- 即時 completion event 可以比 Star Atlas snapshot 早一個更新節拍；Debrief 會把已接受的當前 completion 視為較新證據，使用 bounded、單調不倒退的顯示計數，並在 `stellarwarp:atlas-change` 後重新與 Star Atlas 對齊。
- 「下一個未探索」每次由 live Star Atlas discovery snapshot 即時計算，不保存 itinerary、mission progress 或推薦結果。
- 探索續行順序只沿用現有七個外站 catalog 的固定展示次序；**不複製座標、6.0 LY edge table、Dijkstra 或 route graph**。
- 真正航線仍只由 core `WarpSim.select(destination)`／現有 route planner 計算；本功能不會直接 `launch()`，使用者仍需在星圖確認後啟航。
- `留影記錄` 只呼叫既有 `WarpPhotoMode.enter()`；不建立第二套 screenshot／canvas／download 流程。
- 本功能不建立新 localStorage、database、backend 或 analytics。
- 新版掃描器已有 `stellarwarp:discovery-change` 時會即時反應；LUNA／VEGA 舊式模組由 Star Atlas 現有資料以 1 Hz 有界 fallback 偵測。
- 首次讀取只建立已知 discovery baseline，所以 reload 不會把舊發現誤當成新完成事件。

## Acceptance Criteria

- 七個外站各有一份固定、目的地專屬 field-note profile；SOL 維持母港語意，不造一個假 discovery 湊數。
- 新 discovery 在安全最終探索狀態完成時顯示 completion handoff。
- 顯示正確目的地、發現名稱、分類／觀測註記及 `x / 7` 進度。
- 若 completion event 比 Star Atlas snapshot 更早到達，顯示進度不得倒退到舊 snapshot；第七個 discovery 必須立即顯示 `7 / 7`，並在 Atlas catch-up 後保持 `7 / 7`。
- 「留影記錄」只在既有 Photo Mode API 可用時啟用；成功進入後才收起 completion handoff。
- 「查看星區圖鑑」開啟現有控制面板、展開 Star Atlas 並帶到圖鑑。
- 尚有未探索外站時，第三個 action 必須直接顯示下一個目標名稱，例如 `下一個未探索 · 金牛塵海`。
- 按第三個 action 只呼叫既有 `WarpSim.select(target)` 並打開現有導航面板；航線由 core planner 建立，**不得自動起航**。
- 下一站選擇必須重新讀取 live discovery snapshot；不可建立第二套 itinerary／route／mission persistence。
- 七個外站 discovery 全部完成後，第三個 action 顯示 `探索檔案完成` 並 disabled；不得選站或打開另一個假流程。
- 航行中、WebGL context lost、錯誤目的地或非探索狀態不顯示／不執行 completion continuation。
- reload 已存在的 discovery 不會自動重新彈出完成摘要。
- 手機所有主要 action 最少 44 px；Photo action 全闊顯示，不把三個 action 擠成窄欄。
- prepared offline shell 繼續包含此模組；本輪沒有新 runtime dependency。
- 不新增 persistence、network、backend、dependency 或 per-frame work。
- V4.0 immutable snapshot、既有路線、相機、完整 flight phases 及 arrival profile 保持不變。

## Out of Scope

- 新增獎勵、貨幣、經驗值、成就系統或任務鏈。
- 改寫七個探索模組成單一 framework。
- 自動起航下一站。
- 以最短距離、風險、景觀或其他評分建立「最佳探索路線」推薦；本輪只做簡單 catalog continuation。
- 新增獨立 screenshot engine、相機自動對準 discovery、額外高解像度 render pass。
- 修改 3D 場景、核心相機、航行時間、route graph 或 renderer。

## Validation

- `node --check discovery-debrief.js` 及完整 `npm run check`。
- focused validator 檢查：七個 field-note profiles、Star Atlas/debrief metadata handoff、安全 gate、44 px／全闊 Photo action、既有 Photo Mode、既有 `WarpSim.select()` handoff、terminal 7/7 狀態、事件領先 snapshot 時的 non-regressing progress、Atlas catch-up refresh、零 route/coordinate duplication、零新 persistence/network/render-loop。
- no-dependency runtime 驗證：persisted baseline 不重播、legacy discovery fallback、field-note 顯示、即時 discovery event、Photo Mode 只進入一次、圖鑑 action、`ORION → TAU` 下一未探索站預選、event-before-snapshot 的 `7 / 7` 終局一致性、Atlas catch-up 後仍維持 `7 / 7`，以及航行中拒絕顯示。
- V4.0 hash、既有 SOL→ORION／SOL→TAU route baseline、完整 flight phases 與 arrival profile 必須保持。

## Manual verification

1. iPhone Safari 完成任一 discovery，確認名稱＋field note 容易閱讀且不令探索卡過高／造成 scroll trap。
2. 完成 ORION 等非終局 discovery，確認 action 清楚顯示下一個未探索站，按一下後星圖已選中該站並顯示正常 core route，但**不會自行起航**。
3. 按「留影記錄」，確認 completion handoff 消失、現有 Photo Mode 正常隱藏 HUD，畫面仍停留於剛完成探索的目的地。
4. Photo Mode 返回後，原本探索卡可正常繼續操作；不應自動重新彈出 discovery completion。
5. 完成 LUNA 或 VEGA，確認最遲約 1 秒內出現摘要及正確 field note／下一未探索站。
6. 完成第 7 個外站 discovery 後，確認同一畫面立即顯示 `7 / 7`＋`探索檔案完成`；Star Atlas 稍後刷新後兩者仍一致，只保留圖鑑／留影選項，不會選出已完成目的地。
7. prepared offline reload 後完成 discovery，確認 field note、Photo handoff 與下一站預選仍存在。
8. 實機確認新增文字及按鈕沒有可感知 FPS／DPR 影響；本輪沒有新增 timer 或 renderer-loop 工作。
