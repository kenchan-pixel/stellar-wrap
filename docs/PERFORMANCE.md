# 60 Hz 效能基線

## 1. 目標

主要目標裝置為 60 Hz 手機。每幀理論預算：

```text
1000 ms / 60 = 16.67 ms
```

這不是所有裝置的絕對保證。設計要求是：當 GPU／CPU 不足時，優先降低畫質與粒子數，保持航行時間、轉向速度與相機動作一致。

## 2. Renderer 設定

- `powerPreference: high-performance`
- 關閉 antialias，由 DPR 及內容本身維持清晰度
- 關閉 stencil
- 不保留 drawing buffer
- ACES Filmic tone mapping
- 無即時陰影
- 單一 WebGL renderer／單一主要場景

## 3. 畫質模式

| 模式 | 手機 DPR 上限 | 桌面 DPR 上限 | 星體／曲速／隧道比例 | 用途 |
|---|---:|---:|---:|---|
| 自動 | 1.35 × adaptive | 1.65 × adaptive | 依 adaptive | 預設；按幀時間調整 |
| 流暢 | 1.00 | 1.15 | 約 58% | 較舊手機、發熱或省電 |
| 標準 | 1.25 | 1.45 | 約 80% | 穩定視覺與效能平衡 |
| 高畫質 | 1.60 | 1.90 | 100% | 高性能裝置或截圖 |

## 4. 自動畫質控制

### 啟動測試

- 開始後約 0.65 秒才收集樣本，避開初始化尖峰
- 約 2.8 秒完成初次判斷
- 以幀時間平均值選擇初始 adaptive quality

### 持續調節

- 使用 EMA 平滑幀時間，避免單幀尖峰造成頻繁切換
- 每約 3.5 秒評估一次
- EMA 大於約 19.1 ms：降低 adaptive quality
- EMA 小於約 15.7 ms：逐步回升
- adaptive 範圍約 0.60–1.00

### 可降低項目

- renderer pixel ratio
- 背景星數
- 曲速星線數
- 隧道環 instance 數
- 星區次要細節／粒子

### 不可降低項目

- 航行階段時間
- 轉向角度及方向
- 曲速距離公式
- 抵達連續軌跡
- UI 操作回應
- 最終目的地核心地標

## 5. GPU／CPU 策略

- 使用 typed arrays 及 `BufferGeometry` 更新曲速線
- 每幀只更新必要 position buffer
- 使用 `InstancedMesh` 顯示曲速隧道環
- 共用 sphere geometry 及程序化 textures
- 避免大量透明 DOM 疊層；HUD 只保留少量 blur panel
- 星體不使用 shadow maps
- 細小物件以 sprite／points 代替高面數 mesh
- 背景星只做極慢整體旋轉
- 隱藏頁面時暫停實際更新，避免背景耗電

## 6. 診斷 HUD

可在控制面板開啟：

- FPS
- DPR
- 背景星數
- 曲速線數
- Draw Call
- 三角形數量

診斷只作開發與實機驗證，不應長期開啟作一般體驗。

## 7. 實機驗收方法

至少使用：

- 一部主要目標 iPhone，Safari，直向
- 一部較舊或較低性能手機
- 桌面 Chromium 作除錯基準

每部裝置測試：

1. 冷啟動後等待自動畫質完成。
2. 執行 `SOL → ORION` 最長多段航程。
3. 保持診斷 HUD 開啟，記錄最低／常態 FPS、DPR、Draw Call。
4. 在 `warpEntry`、`warp`、`warpExit`、大型星體接近及自由拖動時觀察卡頓。
5. 連續航行 10 分鐘，檢查熱力、電量及記憶體是否惡化。
6. 切換流暢／標準／高畫質，確認時間節奏完全相同。

## 8. WebGL context 中斷與恢復

手機切換 App、GPU 記憶體壓力或瀏覽器重設圖像引擎時，WebGL context 可能短暫遺失。Active simulator 的恢復策略：

- context lost 時暫停模擬 clock，不讓航程在黑畫面期間偷偷前進。
- 顯示置中的短狀態提示；超過約 6.5 秒仍未恢復才提示重新整理頁面。
- context restored 後重設 frame timing，重新套用 renderer 尺寸及場景細節。
- Auto 畫質重新校準，避免把恢復停頓誤判成持續低效能。
- 60 秒內重複 context lost 且使用 High 畫質時，本次 session 暫降至 Standard；不覆寫已保存偏好。
- Three.js renderer 本身負責重建 WebGL 內部狀態；應用層負責暫停／續接模擬與 UI 回饋。

可使用公開診斷 API WarpSim.loseContext() / WarpSim.restoreContext() 配合瀏覽器開發工具作模擬測試。

## 9. 完成標準

- 主要裝置自動畫質下，大部分航程接近 60 fps
- 轉向及抵達沒有因畫質調節產生時間跳動
- 低效能裝置即使降至流暢模式，仍能完成全部航線
- Draw Call 與三角形數不會每次到站後持續上升
- 切換背景／鎖屏／返回頁面後動畫可正常恢復
- 沒有 WebGL context lost、音訊累積或明顯記憶體洩漏

## 10. 必須人手核實

自動測試不能證明：

- 視覺上是否真正流暢
- 手機是否長時間過熱
- 轉向方向是否符合人類對星圖的直覺
- 透明層、雲層、大氣及曲速隧道在不同 GPU 的混合效果
- Safari 的 AudioContext、全螢幕及觸控行為
