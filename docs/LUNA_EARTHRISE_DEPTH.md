# LUNA Earthrise Parallax Depth｜月環基地地球升起視差層

## Goal / intended player outcome

令 LUNA 的主要觀景由「月面 + 遠方地球 + 一個軌道環」提升成清楚可讀的三層深度構圖：近景月球地平線、中景軌道基建、遠景地球升起。重點係增加抵達後觀看、重遊及留影價值，而唔係加入另一個掃描／清單玩法。

## Scope

- 保留 V4.1 LUNA 原有月面、遠方地球、軌道環、自動環繞及自由拖動探索。
- 只在 LUNA 安全最終探索的 High／Photo Capture 狀態加入四個有界 3D 視覺層：
  - 月球地平線局部光緣；
  - 遠方地球方向性大氣／新月光緣；
  - 18 個 instanced 軌道航標；
  - 兩條前後錯開的軌道導引線。
- 航標分成近／遠兩條軌道，提供實際 Z 深度視差；地球光緣附著既有遠方地球 authority，地平線附著既有月球 root，軌道航標／導引線附著既有軌道環。
- 正常 Standard／Low 不保留此切片的 GPU objects；High 降階或離站時釋放，之後可按需要重建。
- Photo Capture Boost 仍只暫時切換既有 High tier；透過 canvas backing-size 變化即時同步，PNG 完成後恢復原畫質。

## Acceptance Criteria

- LUNA 原有 route／flight／arrival／exploration authority 完全不變。
- 新切片 High 狀態維持 **4 draw calls / 2,704 triangles / 18 instanced beacons**；Standard／Low 額外 objects、draw calls、triangles 全為 0。
- 近／遠航標的 live depth span 至少約 3.3、且不超過 3.8 local units；不可退化成平面單環。
- 真 production Chromium 在 **390×844** 及 **360×800** 均顯示完整 LUNA 構圖，無水平 overflow／裁切；Standard 與 High 畫面必須實際不同。
- 真 renderer diagnostics 證明 Shared LUNA Cinematic High 4 draws + 本切片 4 draws，總 High 增量為 8 draws，而非只相信常數。
- Standard 直接按 Photo Capture 時，PNG extraction 必須見到本切片及 shared cinematic layer 已在 High 生效；backing buffer 大於 CSS viewport，完成後恢復 Standard 並釋放本切片 objects。
- High→Low disposal、Low→High rebuild、LUNA→SOL→LUNA revisit rebuild 全部可重複通過。
- 不加入第二 renderer、獨立 animation loop、持久儲存、網絡請求、後端、分析追蹤或新 dependency。

## Out of Scope

- 不改自由相機／auto-orbit 操作。
- 不改星圖、路線權威、3D 座標、6.0 LY 上限、航行或 arrival timing。
- 不新增 scanner、任務、發現紀錄或經濟系統。
- 不永久提高 DPR，不加入大型 post-processing。
- 不修改 Frontier Fiction。

## Validation evidence contract

完成切片時需要：

1. `npm run check` 全套通過及 V4.0 stable hash 不變。
2. Focused static validator 驗證 anchors、GPU budget、High-only gate、資源生命週期、零新 persistence/network/render-loop authority。
3. Focused production Chromium 於 390×844、360×800 驗證實際 renderer DRAW、2,704 measured triangles、18 beacons、live orbital depth、Photo Capture backing buffer／恢復、disposal／rebuild／revisit。
4. 每個手機 viewport 保存 Standard／High 截圖並由自主流程實際檢查構圖及 viewport containment。
5. Exact-head PR review 無未解 P0/P1。

## Risks / supplementary manual checks

- iPhone Safari 長時間 High／Capture 的熱力、frame pacing、不同 GPU 上 Additive blending 色階仍值得實機補驗，但不是本切片完成 blocker。
- 自動截圖可證明構圖、尺寸及相對深度層存在，不能單獨宣稱真機穩定 60 fps。

## Completion signal

Exact HEAD 的 Actions 全綠、兩個 production phone viewport 視覺及實際 renderer budget gate 通過、Photo Capture 正確提升／恢復、High／Low／revisit 資源生命週期通過，且 PR 無 P0/P1 blocker，即視為此 Vertical Slice 完成。