# Mobile Explore Hub｜手機到站探索列

## Goal / intended player outcome

最終目的地抵達後，3D 天文景觀應繼續是主畫面。手機直向預設只保留一個細小「探索」入口；只有使用者主動需要功能時，才展開五個探索工具或單一內容面板。當使用者真正進入「探索」任務時，內容面板會改成低位 Instrument Tray，保留畫面上半部作天文景觀參照，避免做探索時再次被大型側欄遮住。

## Scope

- 只在 **手機寬度 `< 900px` + 最終目的地探索** 啟用；中途站 fly-by 保留原有卡片及自動續航行為。
- 左側預設只顯示一個最少 46 px 高的 `探索` handle；按下後才展開 `概覽`、`探索`、`發現`、`攝影`、`星圖` 五個工具。
- 五個工具只作暫時選擇層：選定內容模式後工具列立即收回，只留下細小 `探索` handle 及當前單一內容面板。
- `概覽` 顯示目的地基本資料、Arrival Debrief 及自動環繞控制。
- `探索` 顯示現有 Landmark Guide 及當前目的地既有探索模組；不複製任何探索進度或完成邏輯。
- **Exploration Focus Tray：** 手機 `探索` pane 開啟時，現有 `#exploreCard` 由側向 drawer 改為底部工具托盤，正常手機高度上限為 `42vh / 360px`，360 px 窄屏上限為 `44vh / 352px`；上方大部分視野保留給 3D 景觀。
- Focus Tray 只隱藏已可在 `概覽` 看到的重複 `#exploreDesc`，Landmark Guide、目的地任務、進度、控制及完成判定全部保留。
- `發現` 顯示既有 Discovery Debrief；未完成時只讀 Star Atlas 現有狀態提供簡短提示。
- `攝影` 直接重用 `WarpPhotoMode.enter()`；`星圖` 直接重用現有 `#openPanel`。
- 點擊 3D 畫面、關閉鍵或 Escape 會收起內容面板及工具選單，回到單一 handle 的 scenery-first 狀態。
- Arrival Debrief 的「開始探索」可由 compact 狀態直接打開正確探索內容，不要求先展開工具列。
- 所有工具按鈕維持最少 44 px 可點高度。
- 視覺收起狀態與輔助導覽狀態保持一致：收起的內容面板、未展開的五工具群組，以及 Photo Mode 隱藏的 rail，都同步套用 `aria-hidden` + `inert`。
- Focus Tray 只以 CSS 讀取 Explore Hub 已有的 `data-hub-pane="explore"` 狀態；不建立第二套 pane、任務、相機或導航 authority。

## Acceptance Criteria

1. 最終到站後預設只見單一 `探索` handle；原本大型 `#exploreCard` 及五個工具按鈕都不會長期遮住景觀。
2. 點擊 handle 才展開五個工具；再次點擊可收起，`aria-expanded` 必須同步反映狀態。
3. 選定 `概覽`／`探索`／`發現` 後，五工具群組收起並離開輔助／焦點導覽，只打開一個內容面板。
4. 手機 `探索` pane 必須使用底部 Focus Tray，而不是佔據大部分畫面寬度的高身側欄；390×844 以 `42vh` 上限，360×800 以 `44vh` 上限驗證。
5. Focus Tray 必須尊重 `--safeL / --safeR / --safeB`，並保留至少約 56–58% 垂直畫面不被托盤覆蓋。
6. `概覽` 與 `發現` 保持既有 drawer 行為；只有 `探索` pane 使用 Instrument Tray。
7. LUNA、VEGA、CYG、ORION、TAU、SIRIUS、PROX 的既有探索模組仍由原模組負責狀態、儲存及完成判定。
8. Photo Mode、Star Map、Arrival Debrief、Discovery Debrief 繼續使用現有 authority。
9. 中途 fly-by 不使用 Explore Hub，避免破壞 `observe → turn` 自動續航。
10. 桌面版維持原有 responsive exploration card，不因手機資訊架構改動而縮成 tray。
11. Reduced Motion 關閉 drawer／tool-group／Focus Tray transition；Photo Mode 會隱藏及 inert 整個 rail。
12. 收起的內容面板及五工具群組不得留在 VoiceOver／鍵盤／Switch Control 的可導覽範圍；展開後才恢復。
13. 不新增 timer、`requestAnimationFrame`、storage、network、backend、Three.js 物件、route/timing/camera authority。

## Out of Scope

- 不改探索任務內容、難度、完成條件或 7 個發現紀錄。
- 不新增目的地、航線、旅行時間或相機行為。
- 不重寫現有模組為新 UI framework。
- 不改桌面探索資訊架構。
- 不改 V4.1.0 release snapshot。

## Performance boundary

Explore Hub 仍只使用固定 DOM 控制。Compact／expanded 狀態由使用者操作、`MutationObserver` 及既有事件驅動；Focus Tray 本身只注入 CSS，直接讀取既有 `data-hub-pane` 狀態，沒有 observer、per-frame、固定頻率 polling 或延時 timer。動畫只改 `transform` / `opacity`，手機 60 Hz 優先規則不變。

## Validation evidence required

- `npm run check` 包含 Explore Hub 及 Exploration Focus Tray focused validator。
- 零依賴 production-module MiniDOM harness 於 390×844 及 360×800 驗證 compact rail、pane state、Arrival／Photo／Map handoff、transit／desktop cleanup 及 accessibility 狀態；這層只證明互動與 authority，不冒充瀏覽器排版證據。
- **真實 production-page browser harness** 以 headless Chrome 載入實際 `index.html`，在 390×844 及 360×800 透過真正 `探索` 控制開啟各 pane，使用 `getBoundingClientRect()`／`getComputedStyle()` 驗證 Focus Tray 的 42/44vh 高度上限、safe-area 邊界、56–58% 未遮擋高度，以及 `概覽`／`發現` 仍保持原本 drawer 幾何。
- Browser harness 只使用 Node 內建功能、現有 `scripts/serve.mjs` 與 Chrome DevTools Protocol；不新增 runtime dependency 或產品權限。
- Exact-HEAD GitHub Actions 必須成功；Preview 若可用應檢查，但 CI／headless Chrome 仍不等同實機 iPhone、VoiceOver 或 sustained 60 fps 驗收。

## Manual checks still required

- iPhone Safari 直向：確認進入「探索」後上半部仍能清楚看到地標，托盤高度足夠操作但不壓迫景觀。
- LUNA、CYG、ORION、PROX 各測一種不同控制密度的任務，確認 slider／按鈕／進度可在托盤內自然捲動。
- 360 px 級窄屏：確認 safe area、Home Indicator、關閉鍵及 rail 不互相重疊。
- iPhone VoiceOver／Switch Control：確認 pane 切換後焦點順序合理，隱藏的重複目的地文字不造成資訊損失。
- Photo Mode／Star Map：確認 handoff 後五工具及內容面板均已收起。
- `SOL → ORION` 多段航程：確認中途 fly-by 不會誤啟用 hub／tray。
- prepared-offline session：確認 `exploration-focus-tray.js` 隨 shell cache 載入。
- 實機 FPS／DPR／熱力仍需 owner 裝置量度；CI 不代表已證明 60 fps。

## Completion signal

Focus Tray 實作、兩個手機 production-module state viewport、兩個真實 production-page browser layout viewport、完整 repository validation、prepared offline integration 及 exact-HEAD review 全部通過，persistent Draft PR 保持未合併狀態；實機遮景、單手操作、VoiceOver 及 sustained FPS 仍屬 owner manual gate。
