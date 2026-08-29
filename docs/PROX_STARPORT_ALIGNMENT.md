# PROX Starport Alignment｜比鄰星港三點進場校準

## 狀態

- **V5 候選垂直切片**
- 不改變 V4.1.0 航線、相機、renderer、飛行時間或 60 Hz 模擬節奏。
- 目的：令最遠端 PROX 抵達後有一個與紅矮星、熔岩行星及人工星港身份一致的主動探索行為，並把目前七個外站發現串成可完成的 Star Atlas 探索檔案。

## Goal／使用效果

真正抵達 PROX 並進入最終探索後，使用者以兩個方向軸校準三個進場導航窗口：外圍交通標、熔岩側熱流窗、星港對接軸。完成三點後解鎖本機發現紀錄 `紅矮星港三點進場網`。

Star Atlas 同時顯示「已到訪星區」與「外站發現」進度；SOL 是出發母港，不計入七個外站發現。收集 LUNA、VEGA、CYG、ORION、TAU、SIRIUS、PROX 七個發現後顯示探索檔案完成提示。

## Scope

- 新增 `prox-starport-alignment.js`。
- 兩個 normalized 方向偏移軸：橫向、垂直，各為 -50 至 50。
- 三個固定窗口：`-28/24`、`6/-17`、`32/12`。
- 兩軸均落入目標 ±3 才可鎖定；每個窗口只可記錄一次。
- 鎖定時重新讀取 `WarpSim.state()`；航行、WebGL context lost、錯誤目的地或非最終探索狀態不得修改進度。
- 進度只以 `stellar-warp-prox-alignment-v1` 保存於本機 `localStorage`。
- 完成後透過既有 `stellarwarp:discovery-change` 事件更新 Star Atlas。
- Star Atlas 顯示 `x / 7 發現`，七個外站全部完成時顯示探索檔案完成提示。
- prepared offline shell 包含 PROX 模組並提升 cache generation。
- 手機兩個 range control 及主操作至少 44 px；桌面沿用既有 responsive typography tokens。

## Acceptance Criteria

- 只有 safe final PROX exploration 顯示校準介面。
- 三個窗口唯一且必須兩軸同時在 ±3 內才可鎖定。
- 重複鎖定不增加完成數。
- 飛行中或 context lost 時，UI 及 diagnostic `lock()` 都不能修改進度。
- 第三個窗口完成後只解鎖一個 `紅矮星港三點進場網`。
- 同一頁 Star Atlas 即時顯示 PROX 發現。
- 七個外站發現齊全時 Star Atlas 顯示 `7 / 7 發現` 與完成提示。
- fresh-process reload 可恢復 PROX 完成狀態及 Atlas 發現。
- prepared offline shell 包含 PROX 模組。
- V4.0 immutable snapshot、SOL→ORION／SOL→TAU、完整 V4.1 flight state machine 不變。

## Out of Scope

- 把 -50 至 50 解釋成真實角度、距離或軌道參數。
- 真正接管飛船相機或航行控制進行 docking。
- 修改 PROX 3D geometry、星港模型、route graph 或 travel timing。
- 為 SOL 強行加入一個探索發現；本切片明確把 SOL 視作出發母港。
- 獎勵、經濟、升級、任務鏈或雲端同步。

## Validation evidence required

- `node --check` 通過 PROX 模組。
- production Star Atlas + PROX DOM/event runtime：兩個 slider、±3 邊界、duplicate protection、unsafe-state rejection、same-tab discovery、7/7 completion、fresh-process persistence。
- `npm run check` 全綠。
- Service Worker validator 要求 PROX module 在 v11 shell。
- secret scan、V4 hash、approved routes、flight phases 保持綠色。

## Risks／manual checks

- iPhone Safari 直向兩個 slider 的實際手感與是否出現 horizontal overflow。
- PROX 最終場景中校準卡是否遮擋熔岩行星或外圍星港主要視線。
- 真實 WebGL context loss／restore 後卡片顯示及進度是否保持一致。
- prepared-offline Safari reload。
- 實機 FPS／DPR／熱力；CI 不可視作 60 fps 證明。

## Completion signal

當 PROX 三點校準可在 production runtime 完成、七個外站發現可形成一個清楚的 Star Atlas completion milestone、自動驗證與 Preview 全綠，而且無新的 P0/P1/P2 blocker，才算本候選切片完成。仍由 owner 決定是否接受／merge。
