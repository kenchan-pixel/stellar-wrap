# ORION Nebula Spectrograph｜獵戶前哨星雲窄帶光譜

## 狀態

- **V5 候選垂直切片**
- 只擴展 ORION 最終到站探索；不改 V4.1.0 航線、方向、相機、航行時間、3D 場景或 60 Hz renderer。
- 不代表 V5 整體已批准。

## Goal／使用效果

令 ORION「獵戶前哨」由純觀景變成一個短而有科學感的窄帶觀測任務。使用者抵達後以 470–680 nm 波長控制掃描發射星雲，尋找三條常見可見光發射線：Hβ 約 486 nm、[O III] 約 501 nm、Hα 約 656 nm。只有進入譜線附近 ±4 nm 才可記錄；三條完成後解鎖本機發現紀錄「三線發射殼層」，並同步顯示在星區圖鑑。

這個切片不是另一個固定三按鈕 checklist：使用者需要主動掃描波長、根據訊號強度逼近峰值，再逐條記錄。

> 波長採用簡化整數值作互動，概念參考常見窄帶天文觀測：ESO 公開資料常以 Hβ 約 486 nm、[O III] 約 500 nm、Hα 約 655–656 nm 分離星雲發射結構。這裡是科幻模擬互動，不是對真實 Orion／Betelgeuse 系統的物理模型。

## Scope

- 新增 `orion-spectrograph.js`，只在 ORION 最終到站的安全探索狀態顯示。
- 波長範圍 470–680 nm，1 nm 步進。
- 三個固定譜線峰值：486、501、656 nm。
- 訊號強度隨與最近未記錄譜線的波長差改變。
- ±4 nm 內才開放「記錄譜線」；同一譜線不可重複記錄。
- 完成進度以版本化 `localStorage` 保存，reload 後保留。
- 三條完成後解鎖「三線發射殼層」，Star Atlas 同頁即時更新。
- prepared offline shell 包含此模組。
- 手機保持主要介面；桌面沿用現有 `--ui-*` typography tokens。

## Acceptance Criteria

- 非 ORION、航行中、WebGL context lost 或非最終探索時不顯示。
- 三個譜線 ID／波長唯一，全部位於 470–680 nm。
- 只有與未記錄譜線相差不超過 ±4 nm 才可記錄。
- 未完成三條前不得解鎖發現紀錄。
- reload 後記錄進度保留。
- 同一頁完成後 Star Atlas 不需 reload 即顯示 ORION 發現。
- 不新增 backend、analytics、network request 或 `requestAnimationFrame`。
- 只以 2 Hz 讀取核心狀態作顯示 gate；波長掃描由使用者 input event 驅動。
- 不修改 V4.0 immutable snapshot、route graph、flight state machine、arrival profile、renderer 或 camera authority。

## Out of Scope

- 令 3D 星雲本身隨窄帶濾鏡重新著色。
- 模擬真實光譜儀的解析度、曝光時間、噪聲或物理校準。
- 隨機譜線、獎勵經濟、排行榜或雲端同步。
- 擴展到其餘未有探索互動的星區；先驗證 ORION 使用效果。

## Validation

Focused validator：`scripts/validate-orion-spectrum.mjs`。

它檢查 JavaScript 語法、三條唯一譜線、470–680 nm 範圍、±4 nm capture gate、版本化 persistence、ORION-only safe explore gate、2 Hz bounded state sampling、Star Atlas integration、offline shell inclusion、desktop readability tokens，以及沒有 render-loop／network path。

## Manual verification

建議以批准的最長路線 `SOL → LUNA → VEGA → CYG → ORION` 完整抵達：

1. 到 ORION 前 spectrograph 不可出現。
2. 抵達後掃描波長；離峰值較遠時「記錄譜線」保持 disabled。
3. 分別在約 486、501、656 nm 記錄三條線；確認每次只完成一條未記錄譜線。
4. 第三條完成後顯示「三線發射殼層」。
5. 打開 Star Atlas，ORION 卡同頁即出現相同發現名稱。
6. reload 後確認三條記錄仍存在。
7. `WarpOrionSpectrum.reset()` 清除測試進度後可重新驗收。
8. iPhone Safari 直向確認 slider 易操作、沒有水平 overflow，新增模組不遮擋中央主要 3D 視野。
9. prepared offline 後斷網 reload，ORION spectrograph 仍可載入。

## Completion signal

自動檢查全綠、Draft PR Preview Ready、exact-HEAD review 無 P0/P1/P2 blocker，並留下上述 iPhone 實機操作作 owner manual gate，即視為此候選垂直切片完成本輪交付。
