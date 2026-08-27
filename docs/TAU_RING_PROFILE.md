# TAU Ring Resonance Mapper｜金牛塵海行星環共振掃描

## 狀態

- **V5 候選垂直切片**
- 只增加 TAU 最終到站探索行為；不改 V4.1 航線、方向、相機、航行時間、3D 場景或 60 Hz renderer。
- 不代表 V5 整體已批准。

## Goal／使用效果

令金牛塵海不再只靠觀看巨行星與天然行星環。完整抵達 TAU 後，使用者可沿天然行星環做一次簡短徑向剖面掃描，找出三個受衛星／軌道共振塑形的密度特徵，完成後在 Star Atlas 留下一個 TAU 專屬發現。

這個互動用 0–100 的本地掃描索引表示由內環到外環的位置，不假裝提供真實公里尺度或天文量測。

## Scope

- 新增 `tau-ring-profiler.js`。
- 只在 `TAU + exploring + !flying + !contextLost` 顯示。
- 0–100 徑向探針包含三個固定異常：
  - 23：內環稀薄帶
  - 56：衛星共振隙
  - 82：外環密度波
- 接近異常半徑 ±3 才可記錄。
- 每個異常只可記錄一次；完成三個後解鎖 `三層環隙共振`。
- 進度保存到版本化本機記錄 `stellar-warp-tau-rings-v1`。
- 發現完成後以既有 `stellarwarp:discovery-change` 事件即時刷新 Star Atlas。
- Prepared offline shell 包含 TAU 模組並升至 cache v9。

## Acceptance Criteria

- 非 TAU、航行中、WebGL context lost 或未進入最終探索時不顯示，直接 diagnostic capture 亦不得改寫進度。
- 23／56／82 三個異常在 ±3 邊界內可記錄，邊界外不可記錄。
- 同一異常不能重複增加進度。
- 三個異常完成後只解鎖一個 `三層環隙共振`。
- reload 後三個完成狀態與 TAU discovery 保留。
- Star Atlas 同一分頁即時顯示 TAU 發現，storage change 亦可刷新。
- 手機直向控制不形成水平 overflow；range 可觸控，主要動作按鈕高度最少 40 px。
- Desktop >=900 px 使用既有 shared typography tokens。
- 零 backend、零 analytics、零新 network request、零 `requestAnimationFrame`；只以 2 Hz 讀取安全探索狀態。
- V4.0 immutable snapshot、SOL→ORION／SOL→TAU 路線、完整 V4.1 flight state machine 不變。

## Out of Scope

- 修改 TAU 3D 行星環幾何或加入真實物理環粒子模擬。
- 真實公里／光學深度／軌道力學科學計算。
- 新航線、燃料、資源、獎勵、戰鬥或跨星區任務鏈。
- 雲端同步或跨裝置 discovery。

## Validation evidence

自動驗證應覆蓋：

- JavaScript syntax。
- 三個唯一 0–100 異常半徑及 ±3 capture window。
- Safe final-exploration mutation guard。
- 版本化 localStorage persistence。
- 2 Hz 狀態取樣及零 network／render-loop work。
- Star Atlas aggregation／import／storage key。
- Service Worker offline shell inclusion。
- 實際 production range `input`＋button `click` 流程、unsafe-state rejection 及 fresh-process reload。

## Risks／manual checks

- iPhone Safari 直向拖動 0–100 range 時，確認觸控手感、文字密度及無水平 overflow。
- 完整航程抵達 TAU 後，確認剖面卡不遮擋中央巨行星／行星環主要景觀。
- 真實 WebGL context loss 時卡片應即時收起，恢復後可繼續未完成掃描。
- Prepared offline 後斷網 reload，確認模組及本機進度仍可使用。
- 物理手機 FPS／DPR／熱力仍需人手驗證；此 slice 不作 60 fps 宣稱。

## Completion signal

Implementation、focused runtime validation、offline integration、Star Atlas aggregation、Changelog／本文件及 persistent Draft PR 全部更新，exact HEAD CI 綠燈且沒有 P0/P1/P2 blocker；剩餘只有實機視覺／觸控／性能驗收。
