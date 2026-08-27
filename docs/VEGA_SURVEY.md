# VEGA Gate Calibration｜織女星門校準觀測

## 狀態

- **V5 候選方案／自主演進 Vertical Slice**
- 目的：證明 guided exploration 可以用目的地獨有內容擴展至第二個星區，而不是把 LUNA 任務原樣複製到所有地方。
- 不代表 V5 整體已批准。

## Goal／使用效果

完整抵達 VEGA 後，玩家不只自由看雙層星門，而會以藍白主星作尺度基準，依次觀察近側內環與雙環共線窗口。三點完成後解鎖本機發現「雙環共振窗口」，並由 Star Atlas 顯示。

## Scope

1. **藍白主星日冕**：建立場景光源及尺度基準。
2. **近側星門內環**：觀察環面厚度、透視及與主星視差。
3. **雙環共線窗口**：微調視角令近遠兩環接近同軸，確認立體穿越走廊。
4. 三點完成後解鎖 `雙環共振窗口`。
5. 進度只保存於 `stellar-warp-vega-survey-v1` 本機記錄。
6. Star Atlas 只讀 `WarpVegaSurvey.progress()`，不複製 discovery 狀態。

## Acceptance Criteria

- 只在 `VEGA + exploring + !flying + !contextLost` 時顯示。
- 三個固定觀測點各自可完成，未完成三點前不解鎖 discovery。
- Reload 後完成進度保留。
- LUNA survey 與 VEGA survey 不會同時顯示。
- 不改變相機、auto orbit、航行狀態、route planner、renderer 或 60 Hz loop。
- 只以 2 Hz 讀取狀態。
- 無 backend、analytics、額外 network request。
- Offline shell 包含 `vega-survey.js`。
- Star Atlas 在同一 session 及 reload 後都可顯示 VEGA discovery。

## Out of Scope

- 自動把相機拉去觀測點。
- 以圖像辨識判定玩家是否真正對準地標。
- 新航線、星門能力、戰鬥或資源系統。
- 把相同三點模板批量複製到其餘 6 個星區。

## Manual verification

iPhone Safari 直向：

1. `LUNA → VEGA` 或其他合法路線完整抵達 VEGA。
2. 確認主畫面中央景觀仍可見，校準卡不造成捲動陷阱。
3. 依次完成「主星／內環／對位」，按鈕狀態及下一點切換正常。
4. 三點完成後顯示「雙環共振窗口」。
5. 打開 Star Atlas，VEGA 卡顯示同一 discovery。
6. Reload 後觀測及 discovery 保留。
7. `WarpVegaSurvey.reset()` 後清除 VEGA 測試進度，不影響 LUNA／旅行日誌。
8. 航行開始或 WebGL context lost 時，VEGA survey 即時隱藏。
9. 已準備 offline cache 後斷網重開，VEGA survey 仍可載入。
