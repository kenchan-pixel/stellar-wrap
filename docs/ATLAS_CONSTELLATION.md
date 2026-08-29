# Exploration Constellation｜探索星環

## Status

- V5 候選／Autonomous Evolution Vertical Slice
- 只增加 Star Atlas 的探索進度視覺層；不改 V4+ 路線、飛行、相機、3D scene、音效或 discovery completion authority。

## Goal / intended user outcome

當使用者打開星區圖鑑時，先以一個手機可快速理解的「探索星環」看到七個外站的發現進度，而不是要逐張卡掃描才知道整體探索狀態。已完成發現會亮起，目前所在外站會加上定位外框；中央以 `x / 7` 顯示整體完成度。

## Scope

- 七個既有外站：LUNA、VEGA、CYG、ORION、TAU、SIRIUS、PROX。
- 星環是**探索收集視覺化，不是航線圖或物理座標圖**；畫面固定標示「非航線比例」。
- 發現狀態只讀 `WarpStarAtlas.snapshot().discoveries`。
- 目前位置只讀 `WarpSim.state().current`，只用作 visual highlight。
- 使用固定 DOM / CSS；沒有 Canvas、WebGL、粒子或 animation loop。
- 透過既有 exploration presentation bootstrap 載入；prepared offline shell 一併快取。

## Acceptance Criteria

1. 恰好顯示七個外站節點，SOL 不被偽造成第八個 discovery。
2. fresh state 顯示 `0 / 7`；每個已完成 discovery 只亮起對應節點。
3. 七個 discovery 全部完成時顯示 `7 / 7` 及 completed visual state。
4. 未完成節點不得預先顯示其 discovery 名稱或 field note。
5. 目前所在外站有額外定位外框，但不影響 discovery completion。
6. 視覺明確標示「非航線比例」，不得被理解成第二套 route graph 或座標 authority。
7. <=360 px 手機寬度仍保持節點可辨認；元件只在 Star Atlas 展開後佔用 panel 內容，不新增 3D 主畫面常駐 overlay。
8. 同一分頁 discovery event 後立即更新；沒有新 polling timer。
9. 不新增 localStorage、network、backend、analytics、`requestAnimationFrame` 或 per-frame work。
10. 新 module 加入 Service Worker prepared shell cache，離線已準備 session 可載入。

## Out of Scope

- 改變核心 2.5D navigation map。
- 用星環節點直接規劃航線或啟航。
- 新增真實／模擬天文座標、距離、route edge 或旅行推薦。
- 新增 discovery、任務、獎勵、成就或持久資料。
- 改變 destination cards、flight state、camera、renderer 或 exploration completion logic。

## Validation evidence

- Focused validator 驗證 JavaScript syntax、七站固定 scope、Star Atlas authority、目前位置 highlight、0/7 → 3/7 → 7/7 runtime state、未完成 discovery 不洩漏名稱、<=360 px CSS、offline shell integration，以及零 polling／storage／network／render-loop work。
- Exact-HEAD `npm run check` 與 GitHub Actions 必須成功。
- UI 變更應以實際 preview / browser screenshot 在 390×844 及 360×800 自主檢查；實機 iPhone 只作補充證據。

## Risks / supplementary checks

- 確認細屏節點標籤不互相遮擋。
- 確認 0/7、部分完成、7/7 三種狀態的對比足夠，但不搶過 destination cards。
- VoiceOver 應讀到整體探索星環摘要；節點本身不是操作控制，不造成額外焦點負擔。

## Completion signal

- 使用者展開 Star Atlas 時可先看到一個清楚的七站探索星環，正確反映既有 discovery state，且 V4+ 航行、導航及探索 authority 完全不變。
