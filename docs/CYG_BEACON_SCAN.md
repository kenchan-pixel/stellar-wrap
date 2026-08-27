# CYG Beacon Triangulation｜天鵝航標訊號三角定位

## 狀態

- **V5 候選垂直切片**
- 只擴展到站探索，不改 V4.1.0 航線、方向、相機、航行時間、3D 場景或 60 Hz renderer。
- 不代表 V5 整體已批准。

## Goal／使用效果

令 CYG「天鵝航標」由純觀景變成一個真正需要操作的短探索任務。使用者抵達後可用 0–359° 感測器掃描方位，找出藍星、紫星及人工航標環三個訊號峰值；只有接近峰值 ±8° 才能鎖定。完成三個來源後解鎖本機發現紀錄「雙星航標三角場」，並同步顯示在星區圖鑑。

這個切片刻意與 LUNA／VEGA 的文字導覽不同：它要求使用者主動搜尋訊號峰值，而不是依次按三個完成鍵。

## Scope

- 新增 `cyg-beacon-scan.js`，只在 CYG 最終到站探索安全狀態顯示。
- 三個固定訊號峰值：42°、166°、292°。
- 以連續方位 slider 掃描，訊號強度隨與最近未鎖定峰值的角距離改變。
- ±8° 內才開放鎖定；三個訊號不可重複鎖定。
- 鎖定進度以版本化 `localStorage` 保存，reload 後保留。
- 全部完成後解鎖「雙星航標三角場」，Star Atlas 即時更新。
- prepared offline shell 包含此模組。
- 桌面版沿用現有 `--ui-*` 文字尺寸 tokens；手機保持主介面。

## Acceptance Criteria

- 非 CYG、航行中、WebGL context lost 或非最終探索時不顯示。
- 0°／359° 附近的角度比較必須正確處理環繞。
- 每個峰值只可在 ±8° 鎖定。
- 未鎖齊三個來源前不得解鎖發現紀錄。
- reload 後鎖定進度保留。
- 同一頁完成後 Star Atlas 不需 reload 即顯示 CYG 發現。
- 不新增 backend、analytics、network request 或 `requestAnimationFrame`。
- 只以 2 Hz 讀取核心狀態作顯示 gate；掃描本身由使用者 input event 驅動。
- 不修改 V4.0 immutable snapshot、route graph、flight state machine、arrival profile、renderer 或 camera authority。

## Out of Scope

- 自動把 3D 相機轉向訊號來源。
- 改變 CYG 既有雙星／航標 3D 場景。
- 隨機訊號、每日任務、獎勵經濟、排行或雲端同步。
- 擴展到其餘星區；先驗證 CYG 使用效果。

## Validation

Focused validator：`scripts/validate-cyg-beacon.mjs`。

它檢查語法、三訊號唯一性、0/359° wrap-around、±8° lock gate、版本化 persistence、CYG-only safe explore gate、2 Hz bounded state sampling、Star Atlas discovery integration、offline shell inclusion、desktop readability tokens，以及沒有 render-loop／network path。

## Manual verification

建議以 `SOL → LUNA → VEGA → CYG` 完整航程抵達：

1. 到 CYG 前 scanner 不可出現。
2. 抵達 CYG 後用 slider 掃描；離峰值較遠時鎖定鍵保持 disabled。
3. 分別掃到約 42°、166°、292° 並鎖定，確認每次只有一個來源完成。
4. 第三個完成後顯示「雙星航標三角場」。
5. 打開 Star Atlas，CYG 卡即時出現相同發現名稱。
6. reload 後確認三個鎖定仍存在。
7. `WarpCygBeacon.reset()` 清除測試進度後可重新驗收。
8. iPhone Safari 直向確認 slider 易操作、沒有水平 overflow，中央 3D 視野沒有被額外大型 overlay 遮擋。
9. prepared offline 後斷網 reload，CYG scanner 仍可載入。

## Completion signal

自動檢查全綠、Draft PR preview Ready、exact-HEAD review 無 P0/P1/P2 blocker，並留下上述 iPhone 實機操作作 owner manual gate，即視為此候選垂直切片完成本輪交付。
