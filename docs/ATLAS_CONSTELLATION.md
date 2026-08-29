# Exploration Constellation｜探索星環

## Status

- V5 候選／Autonomous Evolution Vertical Slice
- 只增加 Star Atlas 的探索進度與紀錄導覽層；不改 V4+ 路線、飛行、相機、3D scene、音效或 discovery completion authority。

## Goal / intended user outcome

當使用者打開星區圖鑑時，先以一個手機可快速理解的「探索星環」看到七個外站的旅程與發現進度，而不是要逐張卡掃描才知道整體探索狀態。

每個外站現在有三個清楚狀態：**未到訪 → 已到訪但發現未完成 → 已收錄發現**。中央雙層進度環同時顯示 `x / 7 到訪` 與 `x / 7 發現`，讓使用者一眼分辨「未去過」和「去過但仍值得探索」；目前所在外站仍以獨立定位外框標示。

星環亦作為圖鑑索引：點選任何外站節點會帶到該站既有 Star Atlas 紀錄卡。使用者可在同一紀錄卡使用原有「規劃前往」操作，把探索紀錄自然交回既有導航流程；星環本身不計算路線、不直接啟航。

## Scope

- 七個既有外站：LUNA、VEGA、CYG、ORION、TAU、SIRIUS、PROX。
- 星環是**探索收集／圖鑑導覽視覺化，不是航線圖或物理座標圖**；畫面固定標示「非航線比例」。
- 到訪狀態只讀 `WarpStarAtlas.snapshot().visited`；發現狀態只讀 `WarpStarAtlas.snapshot().discoveries`，不新增第二套進度儲存。
- 未到訪節點保持低對比；已到訪但未完成 discovery 的節點使用藍色旅程狀態；已完成 discovery 使用綠色收錄狀態。
- 中央外圈表示 discovery 完成度，內圈表示 external visit 完成度；文字同步顯示兩個 `x / 7`。
- 目前位置只讀 `WarpSim.state().current`，只用作 visual highlight。
- 七個節點為手機可點選的 44 px 級按鈕；點選後只聚焦並捲到既有 Star Atlas 紀錄卡。
- 鍵盤 Enter／Space 與觸控／pointer 使用相同 handoff；由使用者啟動時會把 DOM focus 帶到對應既有紀錄卡，observer-driven rebuild 只恢復 visual selection，不偷走焦點。
- 路線規劃仍只由紀錄卡原有 `規劃前往` → `WarpSim.select()` 處理；星環節點不呼叫 planner、不自動啟航。
- Star Atlas 重新建立 cards 時，以 direct-child `MutationObserver` 恢復目前圖鑑焦點；無 polling 或 render-loop work。
- 使用固定 DOM / CSS；沒有 Canvas、WebGL、粒子或 animation loop。
- 透過既有 exploration presentation bootstrap 載入；prepared offline shell 一併快取。

## Acceptance Criteria

1. 恰好顯示七個外站節點，SOL 不被偽造成第八個 discovery／external visit。
2. 到訪及 discovery 均從既有 Star Atlas snapshot 取得；不新增 localStorage key、第二套 journal 或 discovery authority。
3. 未到訪、已到訪但未發現、已發現三個節點狀態可視覺及語意分辨。
4. fresh SOL state 顯示 `0 / 7 到訪`、`0 / 7 發現`；若目前位置已在外站，該站應已由 Star Atlas visit authority 計入到訪。
5. discovery 全部完成時顯示 `7 / 7 發現` 及 completed visual state；七站均到訪時 visit ring 同樣達到 `7 / 7`。
6. 未完成節點不得預先顯示其 discovery 名稱或 field note。
7. 目前所在外站有額外定位外框，但不影響 visit／discovery completion。
8. 視覺明確標示「非航線比例」，不得被理解成第二套 route graph 或座標 authority。
9. 每個節點為可鍵盤／觸控操作的按鈕，手機點擊高度最少約 44 px；選中節點有可見及 `aria-pressed` 狀態。
10. 點選節點只聚焦並捲到對應既有 Star Atlas card；不會直接呼叫 `WarpSim.select()`。
11. 對應 card 的既有「規劃前往」仍可正常把目的地交給核心 planner；目前位置、航行中及 context-loss 的既有禁止規則保持不變。
12. Star Atlas 因 discovery／journey 更新重建 card 後，已選圖鑑焦點會恢復，不產生額外 polling 或 observer focus steal。
13. <=360 px 手機寬度仍保持節點可辨認、不互撞中央雙層進度環或 panel 邊界；元件只在 Star Atlas 展開後佔用 panel 內容，不新增 3D 主畫面常駐 overlay。
14. 同一分頁 discovery／journey 更新後立即更新；沒有新 polling timer。
15. 不新增 network、backend、analytics、`requestAnimationFrame` 或 per-frame work。
16. 新 module 維持在 Service Worker prepared shell cache，離線已準備 session 可載入。

## Out of Scope

- 改變核心 2.5D navigation map。
- 由星環節點直接計算路線、規劃航線或啟航。
- 新增真實／模擬天文座標、距離、route edge 或旅行推薦。
- 新增 discovery、任務、獎勵、成就或持久資料。
- 改變 destination cards 的資料 authority、flight state、camera、renderer 或 exploration completion logic。

## Validation evidence

- Focused validator 驗證 JavaScript syntax、七站固定 scope、既有 Star Atlas visit／discovery authority、目前位置 highlight、三態 runtime progression、雙進度環數值、未完成 discovery 不洩漏名稱、<=360 px CSS、offline shell integration，以及零 polling／storage／network／render-loop work。
- Production Chromium gate 於 390×844 及 360×800 驗證七個 44 px 級按鈕、`5 / 7 到訪 + 3 / 7 發現` 的三態視覺／語意、雙層進度環、節點／中央進度環／panel 幾何、PROX 節點 → 對應 Star Atlas card 鍵盤焦點與捲動、card rebuild 後 visual focus 恢復，以及只有原有 card `規劃前往` 才會呼叫 planner。
- Exact-HEAD `npm run check` 與 GitHub Actions 必須成功。
- UI 變更保存 exact-head browser screenshot 供自主檢查；實機 iPhone 只作補充證據。

## Risks / supplementary checks

- 確認藍色「已到訪待探索」與綠色「已發現」在不同螢幕／亮度仍容易分辨。
- 確認雙層中央進度環不令 `x / 7` 資訊過密，細屏仍可快速理解。
- 確認點選節點後捲到 card 的距離自然，不造成 panel 捲動迷失。
- VoiceOver 應先讀到整體到訪／發現摘要，再將七個節點當成獨立圖鑑導覽按鈕；節點不應被描述成航線控制。
- Physical iPhone Safari 字體、VoiceOver 手感及長時間 FPS／熱力仍可作補充驗證，但不是此 DOM 導覽切片的停工條件。

## Completion signal

- 使用者展開 Star Atlas 時可立即分辨「未到訪／去過但未完成探索／已收錄發現」，同時看到七站到訪與 discovery 的整體進度；再可由星環跳到任何外站的既有圖鑑紀錄並按原有「規劃前往」回到核心導航。V4+ 航行、路線及探索 authority 完全不變。