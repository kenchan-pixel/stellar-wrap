# Discovery Completion Handoff｜探索完成交接

## 狀態

- V5 候選垂直切片
- 目的：完成目的地探索後，立即把「發現已收錄」變成清楚的旅程節點，而不是只在任務卡內改一行文字。
- 不改 V4.1.0 航線、相機、renderer、航行時間或 3D 場景。

## Goal／使用效果

當使用者在 LUNA、VEGA、CYG、ORION、TAU、SIRIUS 或 PROX 完成該站 discovery，探索卡底部顯示一次簡潔完成摘要：目的地、發現名稱及目前 `x / 7` 外站發現進度，並提供「查看星區圖鑑」及「下一目的地」。

這形成完整流程：

`抵達 → 開始探索 → 完成發現 → 收錄圖鑑／選下一站`

## Data authority

- 發現資料仍由現有各目的地模組及 `WarpStarAtlas.snapshot().discoveries` 擁有。
- 本功能不建立新 localStorage、database、backend 或第二套 discovery state。
- 新版掃描器已有 `stellarwarp:discovery-change` 時會即時反應；LUNA／VEGA 舊式模組由 Star Atlas 現有資料以 1 Hz 有界 fallback 偵測，避免加入 renderer-loop 工作。
- 首次讀取只建立已知 discovery baseline，所以 reload 不會把舊發現誤當成新完成事件。

## Acceptance Criteria

- 新 discovery 在安全最終探索狀態完成時顯示 completion handoff。
- 顯示正確目的地、發現名稱及 `x / 7` 進度。
- 「查看星區圖鑑」開啟現有控制面板、展開 Star Atlas 並帶到圖鑑。
- 「下一目的地」只開啟現有導航面板，不建立第二套 route planner。
- 航行中、WebGL context lost、錯誤目的地或非探索狀態不顯示 completion handoff。
- reload 已存在的 discovery 不會自動重新彈出完成摘要。
- 手機主要按鈕最少 44 px；桌面使用既有 responsive typography tokens。
- prepared offline shell 包含此模組。
- 不新增 persistence、network、backend、dependency 或 per-frame work。

## Out of Scope

- 新增獎勵、貨幣、經驗值、成就系統或任務鏈。
- 改寫七個探索模組成單一 framework。
- 自動起航下一站。
- 修改 3D 場景、相機、航行時間或 renderer。

## Validation

- `node --check discovery-debrief.js`
- focused validator 檢查安全 gate、Star Atlas authority、44 px、desktop tokens、offline inclusion、零 persistence/network/render-loop。
- no-dependency runtime 驗證 persisted baseline 不會重播、LUNA／VEGA 類 legacy discovery 由 1 Hz fallback 偵測、即時 discovery event → 完成摘要 → 查看圖鑑／下一目的地，以及航行中拒絕顯示。
- 完整 `npm run check` 必須全綠，V4.0 hash、既有路線及 flight phases 保持。

## Manual verification

1. iPhone Safari 完成任一 scanner discovery，確認摘要出現在任務後方而不遮 3D 主視野。
2. 完成 LUNA 或 VEGA，確認最遲約 1 秒內出現摘要。
3. 「查看星區圖鑑」應正確展開／捲到 Star Atlas，沒有 scroll trap。
4. 「下一目的地」只打開既有星圖，不自動起航。
5. prepared offline reload 後完成 discovery，確認功能仍存在。
6. 實機確認沒有可感知 FPS／DPR 影響；此切片只有事件處理及 1 Hz discovery diff。
