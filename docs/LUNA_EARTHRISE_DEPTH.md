# LUNA Earthrise Orbital Mast Perspective v3｜月環基地地球升起軌道桅杆透視

## Goal / intended player outcome

令 LUNA High／Photo Capture 的軌道基建由細小發光點提升成真正可讀的近／遠桅杆層，配合既有月球地平線、前景觀測桁架及遠方地球升起，形成更清楚的尺度參照與四層攝影構圖。重點係提高抵達後觀看、重遊及留影價值，不增加 scanner／checklist 玩法。

## Scope

- 保留 V4.1 LUNA 原有月面、遠方地球、軌道環、自動環繞及自由拖動探索。
- 保留 v2 四個有界 High／Photo 3D objects：月球地平線光緣、地球方向性新月光緣、18 個 instanced 軌道航標、雙軌導引線 + 12 段前景觀測桁架。
- v3 **不新增任何 object／draw／triangle**；直接重用既有 18 個零細分 `OctahedronGeometry` 航標 instance，把近軌與遠軌改成明顯不同的各向異性桅杆比例。
- 近軌桅杆主軸 scale 約 6.0–6.4，遠軌約 2.4–2.58；live near／far scale ratio 需 >2.4 並受 2.8 budget 約束。桅杆沿軌道半徑方向排列，近層使用較亮白色，遠層偏冷藍，令同一 draw 具更清楚的尺度與透視。
- v2 的 12 段前景桁架、約 6.8–7.4 local-unit foreground depth lead 及近／遠航標 Z-depth span 保持不變。
- 正常 Standard／Low 不保留本切片 GPU objects；High 降階或離站時釋放，之後按需要重建。
- Photo Capture Boost 仍只暫時切換既有 High tier，PNG 完成後恢復原畫質。

## Acceptance Criteria

- LUNA 原有 route／flight／arrival／exploration authority 完全不變。
- v3 High 仍維持 **4 draw calls / 2,704 triangles / 18 instanced orbital masts / 12 foreground gantry beams**；Standard／Low 額外 objects、draw calls、triangles 全為 0。
- Live `structureProfile` 為 `orbital-mast-perspective-v3`；近／遠桅杆 scale ratio >2.4 且 <=2.8，inactive 狀態清回 0／null。
- 近／遠航標 live depth span 至少約 3.3、且不超過 3.8 local units；前景桁架相對遠航標 depth lead 約 6.8–7.4 local units。
- 真 production Chromium 在 **390×844** 及 **360×800** 均顯示完整 LUNA 構圖，無水平 overflow／裁切；High 畫面應可辨認比 Standard 更強的軌道桅杆 silhouette、前景桁架、月球地平線及遠方 Earthrise。
- 真 renderer diagnostics 維持 Shared LUNA Cinematic High 4 draws + 本切片 4 draws，總 High 增量 8 draws；v3 不因桅杆透視增加新 draw。
- Standard 直接按 Photo Capture 時，本切片及 shared cinematic layer 必須在 PNG extraction 前進入 High；backing buffer 大於 CSS viewport，完成後恢復 Standard 並釋放本切片 objects。
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
2. Focused static validator 鎖定 `orbital-mast-perspective-v3`、近／遠各向異性 scale、沿半徑排列、既有 2,704-triangle／4-draw budget、High-only gate、資源生命週期及零新 persistence/network/render-loop authority。
3. 既有 focused production Chromium 於 390×844、360×800 驗證實際 renderer DRAW、2,704 measured triangles、18 instances、Photo Capture backing buffer／恢復、disposal／rebuild／revisit。
4. 每個手機 viewport 保存 Standard／High exact-run 截圖，由自主流程實際檢查桅杆層、前景桁架、地平線、軌道層與地球升起的構圖及 viewport containment。
5. Exact-head PR review 無未解 P0/P1。

## Risks / supplementary manual checks

- iPhone Safari 長時間 High／Capture 的熱力、frame pacing、不同 GPU 上 additive blending 色階仍值得實機補驗，但不是本切片完成 blocker。
- `OctahedronGeometry` 只以 transform 形成細長桅杆，刻意避免增加 geometry cost；個別窄屏 GPU 的薄結構可讀性仍可作補充實機觀察。
- 自動截圖可證明構圖、尺寸及相對深度線索存在，不能單獨宣稱真機穩定 60 fps。

## Completion signal

Exact HEAD Actions 全綠、兩個 production phone viewport 的實際 renderer／截圖證據通過、桅杆 profile 靜態合約通過、Photo Capture 正確提升／恢復、High／Low／revisit 資源生命週期通過，且 PR 無 P0/P1 blocker，即視為此 Vertical Slice 完成。