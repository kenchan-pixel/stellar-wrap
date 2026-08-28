# Mobile Explore Hub｜手機到站探索列

## Goal / intended player outcome

最終目的地抵達後，3D 天文景觀應繼續是主畫面，而不是由多個探索模組長期覆蓋。手機直向改用一條窄左側探索列，使用者需要時才展開單一探索抽屜。

## Scope

- 只在 **手機寬度 `< 900px` + 最終目的地探索** 啟用；中途站 fly-by 保留原有卡片及自動續航行為。
- 左側探索列提供：`概覽`、`探索`、`發現`、`攝影`、`星圖`。
- `概覽` 顯示目的地基本資料、Arrival Debrief 及自動環繞控制。
- `探索` 顯示現有 Landmark Guide 及當前目的地既有探索模組；不複製任何探索進度或完成邏輯。
- `發現` 顯示既有 Discovery Debrief；未完成時只讀 Star Atlas 現有狀態提供簡短提示。
- `攝影` 直接重用 `WarpPhotoMode.enter()`；`星圖` 直接重用現有 `#openPanel`。
- 抽屜預設收起；同一按鈕再按一次、點擊 3D 畫面、關閉鍵或 Escape 都可收起。
- 所有探索列按鈕維持最少 44 px 可點高度。

## Acceptance Criteria

1. 最終到站後預設只見窄探索列，原本大型 `#exploreCard` 不會自動長期遮住景觀。
2. 每次只顯示一個內容模式；切換模式不會搬移或複製探索資料來源。
3. LUNA、VEGA、CYG、ORION、TAU、SIRIUS、PROX 的既有探索模組仍由原模組負責狀態、儲存及完成判定。
4. Photo Mode、Star Map、Arrival Debrief、Discovery Debrief 繼續使用現有 authority。
5. 中途 fly-by 不使用 Explore Hub，避免破壞 `observe → turn` 自動續航。
6. 桌面版維持原有 responsive exploration card，不因手機資訊架構改動而縮成窄 rail。
7. Reduced Motion 關閉 drawer transition；Photo Mode 會隱藏 rail。
8. 不新增 `setInterval`、`requestAnimationFrame`、storage、network、backend、Three.js 物件、route/timing/camera authority。

## Out of Scope

- 不改探索任務內容、難度、完成條件或 7 個發現紀錄。
- 不新增目的地、航線、旅行時間或相機行為。
- 不重寫現有模組為新 UI framework。
- 不改 V4.1.0 release snapshot。

## Performance boundary

Explore Hub 只新增固定 5 個按鈕及一個小型狀態節點。狀態同步使用 `MutationObserver`、既有事件及使用者操作；沒有 per-frame 或固定頻率 polling。抽屜動畫只改 `transform` / `opacity`，手機 60 Hz 優先規則不變。

## Manual checks still required

- iPhone Safari 直向：確認 rail 不遮主要地標，五個按鈕容易點擊。
- LUNA 及任一較長任務站：確認抽屜可捲動、模式切換不會遺失進度。
- Discovery 完成瞬間：確認發現摘要仍正確顯示，但不強制打開大卡。
- Photo Mode 進出後：確認 rail 正確隱藏／恢復。
- `SOL → ORION` 多段航程：確認中途 fly-by 不會誤啟用 hub。
- prepared-offline session：確認新 `explore-hub.js` 已由 shell cache 載入。
- 實機 FPS／DPR／熱力仍需 owner 裝置量度；CI 不代表已證明 60 fps。

## Completion signal

Focused validator、完整 `npm run check`、exact-HEAD CI 及 Preview 均通過，PR exact-head review 無 P0/P1/P2 blocker；實機視覺仍屬 owner manual gate。
