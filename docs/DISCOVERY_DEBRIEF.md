# Discovery Completion Handoff｜探索完成交接

## 狀態

- **V5 候選垂直切片**
- 目的：完成目的地探索後，立即把「發現已收錄」變成清楚的旅程節點，而不是只在任務卡內改一行文字。
- 本輪加入 **Discovery Field Notes + Photo Handoff**：發現會附上簡短分類與觀測註記，並可直接進入既有攝影模式留影。
- 不改 V4.1.0 航線、相機、renderer、航行時間或 3D 場景。

## Goal／使用效果

當使用者在 LUNA、VEGA、CYG、ORION、TAU、SIRIUS 或 PROX 完成該站 discovery，探索卡底部顯示一次簡潔完成摘要：目的地、發現名稱、目的地專屬 field note，以及目前 `x / 7` 外站發現進度。

摘要提供三個下一步：

1. **留影記錄**：進入既有 Destination Photo Mode，保留當前 3D 場景供使用者構圖／儲存 PNG。
2. **查看星區圖鑑**：開啟現有控制面板並展開 Star Atlas。
3. **下一目的地**：只打開現有星圖，不自動起航。

完整流程變成：

`抵達 → 開始探索 → 完成發現 → 理解發現 → 留影／收錄圖鑑／選下一站`

## Data authority

- 發現是否完成仍由現有各目的地模組及 `WarpStarAtlas.snapshot().discoveries` 擁有。
- 七個外站的 **field-note metadata** 是 Star Atlas 的靜態展示資料（name／kind／note），不是新進度來源。
- Discovery Debrief 只由 `WarpStarAtlas.snapshot().systems` 讀取 field note；不建立第二套 discovery store。
- `留影記錄` 只呼叫既有 `WarpPhotoMode.enter()`；不建立第二套 screenshot／canvas／download 流程。
- 本功能不建立新 localStorage、database、backend 或 analytics。
- 新版掃描器已有 `stellarwarp:discovery-change` 時會即時反應；LUNA／VEGA 舊式模組由 Star Atlas 現有資料以 1 Hz 有界 fallback 偵測。
- 首次讀取只建立已知 discovery baseline，所以 reload 不會把舊發現誤當成新完成事件。

## Acceptance Criteria

- 七個外站各有一份固定、目的地專屬 field-note profile；SOL 維持母港語意，不造一個假 discovery 湊數。
- 新 discovery 在安全最終探索狀態完成時顯示 completion handoff。
- 顯示正確目的地、發現名稱、分類／觀測註記及 `x / 7` 進度。
- 「留影記錄」只在既有 Photo Mode API 可用時啟用；成功進入後才收起 completion handoff。
- 「查看星區圖鑑」開啟現有控制面板、展開 Star Atlas 並帶到圖鑑。
- 「下一目的地」只開啟現有導航面板，不建立第二套 route planner。
- 航行中、WebGL context lost、錯誤目的地或非探索狀態不顯示 completion handoff。
- reload 已存在的 discovery 不會自動重新彈出完成摘要。
- 手機所有主要 action 最少 44 px；Photo action 全闊顯示，不把三個 action 擠成窄欄。
- prepared offline shell 繼續包含此模組；本輪只改既有 cache 內檔案，不增加新 runtime dependency。
- 不新增 persistence、network、backend、dependency 或 per-frame work。
- V4.0 immutable snapshot、既有路線、相機、完整 flight phases 及 arrival profile 保持不變。

## Out of Scope

- 新增獎勵、貨幣、經驗值、成就系統或任務鏈。
- 改寫七個探索模組成單一 framework。
- 自動起航下一站或推薦最佳探索順序。
- 新增獨立 screenshot engine、相機自動對準 discovery、額外高解像度 render pass。
- 修改 3D 場景、核心相機、航行時間或 renderer。

## Validation

- `node --check discovery-debrief.js` 及 `node --check star-atlas.js`。
- focused validator 檢查：恰好七個 field-note profiles、Star Atlas metadata authority、安全 gate、44 px／全闊 Photo action、既有 Photo Mode handoff、offline inclusion、零新 persistence/network/render-loop。
- no-dependency runtime 驗證：persisted baseline 不重播、LUNA／VEGA 類 legacy discovery fallback、field-note 顯示、即時 discovery event、Photo Mode 只進入一次、圖鑑／下一目的地 action 保留，以及航行中拒絕顯示。
- 完整 `npm run check` 必須全綠，V4.0 hash、既有路線及 flight phases 保持。

## Manual verification

1. iPhone Safari 完成任一 discovery，確認名稱＋field note 容易閱讀且不令探索卡過高／造成 scroll trap。
2. 按「留影記錄」，確認 completion handoff 消失、現有 Photo Mode 正常隱藏 HUD，畫面仍停留於剛完成探索的目的地。
3. Photo Mode 返回後，原本探索卡可正常繼續操作；不應自動重新彈出 discovery completion。
4. 完成 LUNA 或 VEGA，確認最遲約 1 秒內出現摘要及正確 field note。
5. 「查看星區圖鑑」應展開／捲到 Star Atlas；「下一目的地」只打開既有星圖。
6. prepared offline reload 後完成 discovery，確認 field note 與 Photo handoff 仍存在。
7. 實機確認新增文字及按鈕沒有可感知 FPS／DPR 影響；本輪沒有新增 timer 或 renderer-loop 工作。
