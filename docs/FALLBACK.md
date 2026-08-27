# V4.1 靜態導航後備

## 1. Goal

當瀏覽器不支援 WebGL，或固定 Three.js／3D 主程式約 9 秒仍未完成啟動時，不再只留下黑畫面或單一 reload 錯誤。使用者仍可查看八站星圖及由 SOL 出發的最短航線，並清楚知道完整 3D 航程未啟動。

## 2. 使用效果

- **WebGL 不可用：** 啟動時立即進入靜態導航後備，不等待 9 秒。
- **3D 啟動逾時：** 約 9 秒後由 loading 畫面切換到靜態導航後備。
- 顯示八個已批准 V4 星區及 6.0 LY 直航網絡。
- 可選擇七個目的地，查看由 SOL 出發的 Dijkstra 最短路線、航段數及總距離。
- 保留「重新嘗試 3D」操作；重新載入成功後回到正常完整體驗。
- 若主 3D 程式在逾時後其實成功 ready，原有 `.ready #loading` 行為會自動把後備層隱藏。

## 3. 不會做的事

靜態後備**不會模擬 3D 航程**，亦不會假裝已完成：

- 真實方向轉向
- 加速／曲速進入／巡航／脫離
- 連續減速及抵達
- 動態聲音
- 目的地 3D 探索
- 攝影模式或觀測任務

它只是一個「仍然可用的導航參考」，不是低畫質版飛行模式。

## 4. 架構與效能邊界

- 實作位於 `offline-bootstrap.js`，因此即使 Three.js module 載入失敗，後備仍可由普通 JavaScript 啟動。
- 星圖資料只包含現有八站的 ID、名稱、3D 模擬座標及 2D 投影座標。
- 航線仍使用 6.0 LY 建邊及 Dijkstra 最短距離；validator 會鎖定 `SOL → ORION` 與 `SOL → TAU` 基線。
- 沒有 `requestAnimationFrame`、`setInterval`、新網絡請求、後端、analytics 或使用者資料儲存。
- 不改 `index.html` 的 renderer、flight state machine、camera、audio、adaptive quality 或任何 timing。

## 5. Acceptance Criteria

- 不支援 WebGL 的瀏覽器可立即看到可操作的靜態星圖，而不是無限 loading。
- Three.js／主 3D 程式未能在約 9 秒 ready 時顯示同一後備。
- 八站全部存在且全部由 SOL 可達。
- `SOL → ORION` 仍為 `SOL → LUNA → VEGA → CYG → ORION`。
- `SOL → TAU` 仍為 `SOL → SIRIUS → TAU`。
- 後備明確標示「只提供星圖與路線參考」，不可誤導為完整航行。
- V4.0 stable snapshot 及 archive 不修改。

## 6. 手動驗收

1. 在瀏覽器 DevTools 禁用／阻擋 WebGL，重新載入，確認後備立即出現。
2. 選 ORION 及 TAU，核對路線與距離顯示。
3. 阻擋 jsDelivr Three.js，但保留 WebGL，確認約 9 秒後後備出現。
4. 在正常裝置重新載入，確認 3D ready 後後備完全不顯示。
5. 手機直向確認後備可捲動、選單與重試按鈕可按，並避開安全區。

## 7. Completion Signal

Focused validator、主 repository validation、GitHub Actions 及 Preview 均通過；實機／DevTools WebGL failure path 仍需人手確認後，才可標記為已通過驗證。