# Mobile Explore Hub｜手機到站探索列

## Goal / intended player outcome

最終目的地抵達後，3D 天文景觀應繼續是主畫面。手機直向預設只保留一個細小「探索」入口；只有使用者主動需要功能時，才展開五個探索工具或單一內容抽屜，避免探索功能本身再次變成常駐遮擋。

## Scope

- 只在 **手機寬度 `< 900px` + 最終目的地探索** 啟用；中途站 fly-by 保留原有卡片及自動續航行為。
- 左側預設只顯示一個最少 46 px 高的 `探索` handle；按下後才展開 `概覽`、`探索`、`發現`、`攝影`、`星圖` 五個工具。
- 五個工具只作暫時選擇層：選定內容模式後工具列立即收回，只留下細小 `探索` handle 及當前單一內容抽屜，避免同時出現兩組大型控制。
- `概覽` 顯示目的地基本資料、Arrival Debrief 及自動環繞控制。
- `探索` 顯示現有 Landmark Guide 及當前目的地既有探索模組；不複製任何探索進度或完成邏輯。
- `發現` 顯示既有 Discovery Debrief；未完成時只讀 Star Atlas 現有狀態提供簡短提示。
- `攝影` 直接重用 `WarpPhotoMode.enter()`；`星圖` 直接重用現有 `#openPanel`。
- 點擊 3D 畫面、關閉鍵或 Escape 會收起內容抽屜及工具選單，回到單一 handle 的 scenery-first 狀態。
- Arrival Debrief 的「開始探索」可由 compact 狀態直接打開正確探索內容，不要求先展開工具列。
- 所有工具按鈕維持最少 44 px 可點高度。
- 視覺收起狀態與輔助導覽狀態保持一致：收起的內容抽屜、未展開的五工具群組，以及 Photo Mode 隱藏的 rail，都同步套用 `aria-hidden` + `inert`。

## Acceptance Criteria

1. 最終到站後預設只見單一 `探索` handle；原本大型 `#exploreCard` 及五個工具按鈕都不會長期遮住景觀。
2. 點擊 handle 才展開五個工具；再次點擊可收起，`aria-expanded` 必須同步反映狀態。
3. 選定 `概覽`／`探索`／`發現` 後，五工具群組收起並離開輔助／焦點導覽，只打開一個內容抽屜。
4. LUNA、VEGA、CYG、ORION、TAU、SIRIUS、PROX 的既有探索模組仍由原模組負責狀態、儲存及完成判定。
5. Photo Mode、Star Map、Arrival Debrief、Discovery Debrief 繼續使用現有 authority。
6. 中途 fly-by 不使用 Explore Hub，避免破壞 `observe → turn` 自動續航。
7. 桌面版維持原有 responsive exploration card，不因手機資訊架構改動而縮成窄 rail。
8. Reduced Motion 關閉 drawer／tool-group transition；Photo Mode 會隱藏及 inert 整個 rail。
9. 收起的內容抽屜及五工具群組不得留在 VoiceOver／鍵盤／Switch Control 的可導覽範圍；展開後才恢復。
10. 不新增 timer、`requestAnimationFrame`、storage、network、backend、Three.js 物件、route/timing/camera authority。

## Out of Scope

- 不改探索任務內容、難度、完成條件或 7 個發現紀錄。
- 不新增目的地、航線、旅行時間或相機行為。
- 不重寫現有模組為新 UI framework。
- 不改桌面探索資訊架構。
- 不改 V4.1.0 release snapshot。

## Performance boundary

Explore Hub 仍只使用固定 DOM 控制。新增的 compact／expanded 狀態由使用者操作、`MutationObserver` 及既有事件驅動；沒有 per-frame、固定頻率 polling 或延時自動收起 timer。抽屜及工具群組動畫只改 `transform` / `opacity` / bounded `max-height`，手機 60 Hz 優先規則不變。`aria-hidden`／`inert` 只在既有 UI 狀態轉換時更新。

## Validation evidence required

- `npm run check` 包含 Explore Hub focused validator。
- Production runtime harness 仍需於 390×844 及 360×800 驗證既有五工具、內容 pane、Arrival、Photo、Map、transit、desktop 及 accessibility 狀態。
- Focused contract 額外鎖定 compact handle、`aria-expanded`、tool-group `aria-hidden/inert`、單一 surface handoff，以及零 timer／polling／storage／network authority。

## Manual checks still required

- iPhone Safari 直向：確認預設單一 handle 明顯減少遮景，位置不擋主要地標，而且單手容易點擊。
- 展開五工具時：確認短暫選單不超出安全區；選定功能後會自然收回，不與內容抽屜形成雙重遮擋。
- iPhone VoiceOver／Switch Control：確認 compact 時只讀到 handle，不會讀到五個隱藏工具；展開／收起後焦點順序合理。
- LUNA 及任一較長任務站：確認內容抽屜可捲動、模式切換不會遺失進度。
- Photo Mode／Star Map：確認 handoff 後五工具及內容抽屜均已收起。
- `SOL → ORION` 多段航程：確認中途 fly-by 不會誤啟用 hub。
- prepared-offline session：確認 `explore-hub.js` 仍由 shell cache 載入。
- 實機 FPS／DPR／熱力仍需 owner 裝置量度；CI 不代表已證明 60 fps。

## Completion signal

Scenery-first compact handle 已推送至 persistent Draft PR；focused validator、完整 repository CI 及 Preview 通過，exact-HEAD review 無 P0/P1/P2 blocker。實機遮景、單手操作及 VoiceOver／Switch Control 體驗仍屬 owner manual gate。