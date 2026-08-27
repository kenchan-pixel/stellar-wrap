# 離線啟動與啟動恢復｜V4.1 候選

## 1. 目的

改善手機網絡不穩、地鐵／飛機模式或 CDN 暫時不可用時的啟動可靠性，同時維持現有零後端、零帳戶、零分析追蹤架構。

這個切片不改變航行、相機、音效、畫質或 60 Hz render loop。它只負責：

- 首次成功在線載入後，保存目前 active app 核心檔案；
- 保存已批准固定版本 Three.js `0.185.1`；
- 後續重新開啟時，如沒有網絡，使用最近一次成功快取；
- 清楚顯示「已準備／離線可用／未準備」狀態；
- 3D 引擎長時間未能啟動時顯示可理解的重新載入後備畫面。

## 2. 使用效果

控制面板會加入「離線啟動」狀態：

- **準備中：** 首次在線載入，Service Worker 正建立快取。
- **已準備：** 本機已有核心程式與 Three.js 快取。
- **離線可用：** 瀏覽器目前離線，但所需快取已存在。
- **未準備：** 裝置尚未完成首次快取，需先連線成功開啟一次。

若主程式約 9 秒仍未進入 ready 狀態，原本一直停留的 loading 畫面會轉成啟動恢復提示並提供「重新載入」。

## 3. 快取範圍

Service Worker 只處理：

- `/`／`index.html`
- `travel-journal.js`
- `exploration-survey.js`
- `photo-mode.js`
- `offline-bootstrap.js`
- `https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js`

不攔截、不建立任何 API、analytics、帳戶、圖片上傳或第三方追蹤快取。

## 4. 更新策略

- 導航及同源核心程式：**network-first**。在線時優先取得最新 Vercel／靜態部署版本，成功後刷新本機快取；離線時才使用舊快取。
- Three.js：版本已固定，因此使用 **cache-first**；未命中才向 jsDelivr 取得同一固定版本。
- Service Worker 更新使用 `updateViaCache: none`，避免舊 HTTP cache 阻礙新的 worker。
- 新 worker 啟用後清除舊 `stellar-wrap-shell-*` cache。

因此在線使用不應被舊快取長期鎖死，而離線模式會使用最近一次成功在線載入的版本。

## 5. 限制

- **第一次使用仍需要網絡。** Service Worker 必須在一次成功在線啟動後先保存 Three.js；不宣稱真正「首次離線啟動」。
- 瀏覽器可在儲存空間不足、使用者清除網站資料或私隱模式下移除快取。
- iOS Safari 的主畫面安裝、儲存保留期限及背景更新行為仍需實機驗證。
- 本切片不是完整 PWA 安裝功能；manifest／App Icon／安裝提示仍屬後續候選。

## 6. 驗收

### 自動

```bash
npm run check
```

聚焦 validator 必須確認：

- Service Worker 及 bootstrap 可通過語法檢查；
- 固定 Three.js URL 與核心檔案均在快取清單；
- navigation 使用 network-first；
- Three.js 使用 cache-first；
- ready 狀態要求本機 shell 及 Three.js 均已存在；
- bootstrap 沒有新增 localStorage 使用；
- Service Worker 沒有 interval／animation frame 工作。

### 人手

1. iPhone Safari 在線開啟一次，確認「離線啟動」變成「已準備」。
2. 關閉頁面，開啟飛行模式，再重新開啟同一網址。
3. 確認 WebGL 場景、星圖、音效首次互動及一條 `SOL → LUNA` 航程可正常使用。
4. 恢復網絡並重新載入，確認可回到最新 online 版本而非永久停留舊 cache。
5. 清除網站資料後離線開啟，確認畫面不假稱已準備，並提示需先在線成功開啟一次。
6. 在線時阻擋 jsDelivr／模擬依賴失敗，確認約 9 秒後 loading 畫面提供清楚重試操作。

## 7. 完成訊號

- Offline module、Service Worker、focused validator 及 SOT 文件已在 Draft PR；
- exact HEAD GitHub Actions 綠燈；
- V4.0 stable／archive hash 不變；
- owner 完成 iPhone Safari online→offline→online 實機驗收後，才可把此候選標記為已通過驗證。
