# SIRIUS Relay Calibration｜天狼中繼站雙星相位校準

## 狀態

- **V5 候選垂直切片**
- 目標：把 SIRIUS 由純觀景變成與「雙星＋人工中繼環」場景語意一致的主動探索。
- 不改 V4.1.0 航線、3D 相機、航行時間、renderer 或自動畫質。
- 不代表 V5 整體已批准。

## Goal／使用效果

完整抵達 SIRIUS 並進入最終探索後，使用者可同時調整「載波索引」及「相位索引」，尋找三個穩定中繼握手窗口。三個窗口全部鎖定後，解鎖本機發現紀錄 **「雙星相位中繼窗」**，並即時顯示於 Star Atlas。

兩個 0–100 軸只用作簡化互動，不代表實際頻率、角度或物理量。

## Scope

- 新增 `sirius-relay-calibration.js`。
- 三個固定雙軸窗口：
  - 主星載波窗：`24 / 72`
  - 伴星補償窗：`53 / 37`
  - 環站握手窗：`82 / 61`
- 載波及相位均需在目標 ±4 內才可鎖定。
- 進度以 `stellar-warp-sirius-relay-v1` 保存於本機 `localStorage`。
- 每次鎖定前重新讀取 `WarpSim.state()`；航行中、WebGL context lost、非 SIRIUS 或非最終探索時不得修改進度。
- 完成後發出既有 `stellarwarp:discovery-change`，由 Star Atlas 聚合。
- 兩個 range 及主要動作按鈕提供 44 px 手機觸控高度。
- 模組加入 prepared offline shell cache v10。
- 零 backend、零額外 network request、零 `requestAnimationFrame`；安全狀態只以 2 Hz 讀取。

## Acceptance Criteria

- 只有真正位於 SIRIUS 最終探索時顯示。
- 三個窗口必須同時滿足兩軸 ±4；同一窗口不可重複增加進度。
- 隱藏或 diagnostic `lock()` 在航行／context loss／錯誤星區時失敗並且不寫資料。
- 三個窗口完成後只解鎖一個「雙星相位中繼窗」。
- 同頁 Star Atlas 即時顯示發現；fresh-process reload 可由本機進度恢復。
- 手機直向兩個 range 及鎖定按鈕可觸控，不造成水平 overflow。
- Desktop >=900 px 使用既有 shared typography tokens。
- prepared offline shell 包含 SIRIUS 模組。
- V4.0 immutable snapshot、SOL→ORION／SOL→TAU 路線及完整 V4.1 flight state machine 不變。

## Out of Scope

- 將索引包裝成真實天文／電訊工程數值。
- 修改 SIRIUS 雙星、冰質物體或環站的 3D 幾何。
- 自動控制相機指向握手窗口。
- 新航線、資源／經濟、獎勵、戰鬥、任務鏈或雲端同步。
- Renderer、camera、route graph 或 travel timing 改動。

## Validation

Focused validator 必須覆蓋：

- JavaScript 語法。
- 三組唯一雙軸窗口及 ±4 gate。
- 真實 production range `input`＋button `click`。
- unsafe flight／context-loss mutation rejection。
- 本機 persistence 及 fresh-process reload。
- Production Star Atlas 同頁及 reload discovery integration。
- 44 px mobile touch baseline。
- Offline shell inclusion。
- 零 network／render-loop work。

## Risks／manual checks

1. iPhone Safari 直向實際拖動兩個 slider，確認不會誤觸、擠迫或形成 scroll trap。
2. 真正完成一程到 SIRIUS，確認校準卡不遮擋雙星與中繼環主要視野。
3. 在已調校但未鎖定時觸發真實 WebGL context loss，確認卡收起，恢復後可安全繼續。
4. prepared-offline Safari reload 後確認模組與 discovery 都存在。
5. 仍需實機量度 FPS／DPR／熱力；本切片不聲稱由 CI 證明 60 fps。

## Completion signal

Implementation、Star Atlas aggregation、offline integration、focused production DOM/event runtime、Changelog／本文件及 persistent Draft PR 全部更新；exact HEAD CI 綠燈且沒有 P0/P1/P2 blocker，剩餘只需實機視覺／觸控／效能驗收。
