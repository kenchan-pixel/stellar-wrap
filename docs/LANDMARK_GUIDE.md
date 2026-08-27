# Destination Landmark Guide｜目的地場景導覽

## 狀態

- **V5 候選垂直切片**
- 不改變 V4.1.0 核心航行、相機、3D 場景、路線或 60 Hz render loop。
- 目的：令使用者抵達後能理解「眼前物件是甚麼」，尤其分清天然行星環、人工軌道環、人工星門及航標環。

## Goal／使用效果

每個最終目的地進入探索模式後，探索卡會顯示一個精簡「場景導覽」。使用者可點三個地標名稱，查看：

- 地標屬 **天然／人工／混合**。
- 物件在場景中的角色及尺度意義。
- 該星區的環狀結構屬甚麼性質。

這直接處理現有視覺語義容易混淆的情況，例如：

- SOL 地球附近兩條發光環 = **人工近地軌道／導航基建**，不是天然行星環。
- VEGA 兩個發光環 = **人工雙層曲速星門**。
- TAU 的寬闊環帶 = **天然行星環**。

## Scope

- 新增 `landmark-guide.js`。
- 覆蓋現有 8 個星區，每站固定 3 個主要地標。
- 只在 `exploring && !flying && !contextLost` 的最終探索狀態顯示。
- 每站保留一個 `ring` 語義摘要，明確分辨天然／人工環狀結構。
- 使用者點選地標只切換 DOM 文字；不接管相機、不改 flight state。
- 2 Hz 讀取 `WarpSim.state()`，不進入 render loop。
- 不保存進度、不建立 discovery、不寫 `localStorage`。
- 不加入網絡、後端、分析追蹤或新依賴。
- 加入既有 Service Worker active shell，確保已準備的離線 session 同樣可讀場景導覽。

## Acceptance Criteria

1. 八個已批准星區全部有且只有 3 個主要場景地標。
2. SOL 明確寫明地球周圍發光環是人工軌道基建，不是土星式天然環。
3. VEGA 明確寫明兩環共同構成雙層曲速星門。
4. TAU 明確寫明其寬闊環帶是天然行星環，並與 SOL／VEGA 的人工環作區分。
5. 中途飛掠、航行中或 WebGL context lost 時不顯示場景導覽。
6. 切換目的地時自動回到該站第一個地標，不沿用上一站選擇。
7. 手機直向保持三個短地標按鈕；窄於 350 px 時仍不造成橫向溢出。
8. 不新增 `requestAnimationFrame`、renderer work、storage、network 或 backend path。
9. Offline shell 包含 `landmark-guide.js`。
10. V4.0 immutable snapshot、八站路線及完整 travel state machine 維持不變。

## Out of Scope

- 改畫或刪除現有 3D 環狀模型。
- 以電腦視覺驗證使用者目前鏡頭是否真的對準地標。
- HUD 上對 3D 物件做實時 world-to-screen 標籤追蹤。
- 新增掃描獎勵、成就、經濟、任務鏈或新的持久資料。
- 把場景導覽文字當成真實天文資料庫；它描述的是本模擬器內的場景語義。

## Performance boundary

- 狀態取樣固定 500 ms 一次。
- 點選地標時只重建 3 個小型按鈕及一段說明。
- 無 WebGL API、Three.js import、動畫 loop、網絡請求或持久資料寫入。
- 新增成本主要是少量 DOM/CSS，對 60 Hz renderer 沒有 per-frame 負載。

## Manual verification

至少人手核實：

1. iPhone Safari 直向：SOL／VEGA／TAU 的場景導覽不遮擋中央主要地標，按鈕可正常點擊。
2. SOL 顯示「人工近地軌道環」；VEGA 顯示「人工雙層曲速星門」；TAU 顯示「天然行星環」。
3. `SOL → LUNA → VEGA` 多段航行：中途飛掠不出現導覽，到最終站才出現。
4. 開啟／恢復 WebGL context loss：導覽在中斷期間隱藏，恢復探索後重新出現。
5. 已準備 offline cache 後斷網重開，場景導覽仍可載入。
6. 桌面寬屏配合 `responsive-ui.js`，新增導覽文字仍可舒適閱讀。

## Completion signal

- GitHub Actions `npm run check` 全通過。
- Vercel Preview Ready。
- Exact PR HEAD review 無未解決 P0／P1 finding。
- 上述手機／視覺項目仍需擁有人實機確認後，才可視為體驗已通過驗證。
