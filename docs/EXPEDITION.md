# Exploration Expedition｜多目的地探索行程

## 狀態

- **V5 候選垂直切片**
- 目的：把一次一站的獨立航程串成可持續數個目的地、可跨 reload 保留的探索行程。
- 不改變 V4.1.0 核心航線、相機、航行時間、3D 場景或 60 Hz renderer。
- 不代表 V5 整體已批准。

## Goal／使用效果

使用者可在航行控制面板建立最多 6 個目的地的有序探索行程。每次真正完成下一個目的地後，行程才自動推進；Arrival Debrief 會直接顯示並可規劃下一站。

這令 Stellar Wrap 由「每次完成一程就重新想下一站」變成一段有連續性的星際遠征，同時仍保留使用者每段起航前檢查路線及手動按「啟動航行」的控制。

## Data authority

探索行程只保存：

- 目的地 ID 次序
- 已完成游標 `cursor`

它**不保存亦不計算**：

- 星區座標
- 航線圖
- 段距離
- Dijkstra 路線
- 航行時間

每次按「規劃下一站」只會把目的地交給既有 `WarpSim.select(id)`；真正路線仍由核心 planner 計算。

## 行為

1. 在「探索行程」加入目的地，最多 6 個且不可重複。
2. 目前所在星區不可加入為新的待航目的地。
3. 行程只在既有 `stellarwarp:journey-complete` 真正完成事件到達**目前下一站**時推進。
4. 到其他星區或中止航程不會誤推進行程。
5. 完成一站後 Arrival Debrief 顯示下一個行程目的地。
6. 按 Debrief 的「規劃下一站」只建立原有 planner 航線；不自動起航。
7. 航行中或 WebGL context lost 時不容許行程重新規劃。
8. 行程以 `stellar-warp-expedition-v1` 保存在本機 `localStorage`，reload 後保留。
9. Service Worker prepared offline shell 包含 `expedition.js`。

## Performance boundary

- 零 `requestAnimationFrame`。
- 零定時 polling。
- 只在使用者操作、journey completion、storage change、panel open 或 WebGL context event 時更新 DOM。
- 不新增 backend、analytics、account 或 network request。
- 桌面版沿用既有 `--ui-xs / --ui-sm / --ui-md` responsive tokens；手機仍使用 mobile-first 基線。

## Acceptance Criteria

- 可按次序建立 1–6 個不同目的地。
- reload 後目的地次序及完成進度保留。
- 完成非下一站的航程不推進 cursor。
- 中止航程不推進 cursor。
- 完成真正下一站後只推進一次。
- Arrival Debrief 在行程仍有下一站時顯示目的地名稱並可直接規劃。
- 「規劃下一站」必須使用 `WarpSim.select()`，不得建立第二套 route graph／distance authority。
- 航行中、WebGL context lost、或下一站等於目前位置時禁止規劃。
- 手機直向控制面板可展開、加入、移除、規劃及清除而不形成水平 overflow。
- Desktop >=900 px 文字使用既有 responsive typography。
- prepared offline session 可重新載入行程模組及本機進度。
- V4.0 immutable snapshot、SOL→ORION／SOL→TAU 路線及完整 flight state machine 不變。

## Out of Scope

- 自動替使用者排序「最佳」多站路線。
- 自動起航或連續無確認啟動下一程。
- 燃料、資源、經濟、風險、戰鬥或獎勵。
- 雲端同步或跨裝置行程。
- 新星區或新 route graph。

## Manual verification

建議先以三站行程 `LUNA → VEGA → CYG` 驗證：

1. SOL 建立三站行程，reload 後仍顯示相同次序。
2. 按「規劃 LUNA」，確認原有 route card 顯示 SOL→LUNA；行程本身不計算距離。
3. 啟航並完整抵達 LUNA；行程自動變成 1/3，Debrief 顯示「規劃下一站 · 織女星門」。
4. 從 Debrief 規劃 VEGA，確認只建立航線、不自動起航。
5. 中止一次 VEGA 航程，確認仍為 1/3。
6. 完成 VEGA、CYG，最後顯示 3/3 行程完成。
7. 航行中及 `WarpSim.loseContext()` 期間嘗試規劃下一站，必須被阻止。
8. iPhone Safari 直向確認行程卡、select、按鈕及 stop rows 無 overflow／scroll trap。
9. >=900 px Desktop 確認字體與 Star Atlas／Journal 同級可讀。
10. prepared offline cache 後斷網 reload，行程資料與操作仍存在。

## Completion signal

當自動檢查全綠、persistent Draft PR 已包含 implementation／offline cache／focused regression checks，而且上述手機實機流程沒有操作阻塞，才可視為此候選切片完成驗收。
