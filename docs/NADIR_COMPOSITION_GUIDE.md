# NADIR WELL｜玄淵觀測站 · Cinematic Composition Guide｜構圖導覽

> 狀態：Draft candidate／自主演進驗證中。此切片深化既有 Frontier Fiction 黑洞前線，不新增世界、航線、儲存、renderer 或相機 authority。

## Vertical Slice

### Goal／使用效果

令 NADIR WELL 由單純自由環視，升級成有三個為手機直向與高畫質留影而設的精心構圖。使用者抵達自由探索後，可一按固定黑洞、觀測站或噴流主題視角；仍可拖動畫面返回自由探索，或重新開啟自動環繞。

### Scope

- 在既有故事卡內加入三個 44 px 構圖按鈕，只在 `explore` 階段顯示。
- 三個固定視角：
  - `引力井全景`：事件視界、吸積盤、透鏡環及觀測站同框，突出整體尺度。
  - `觀測環切線`：以偏置觀測站作前景，強化站體與引力井之間的危險距離感。
  - `噴流軸線`：以雙向噴流作直向主軸，利用事件視界負空間形成高對比構圖。
- 選擇構圖時暫停既有自動環繞，只調整現有 `world` yaw／pitch target 及 `well` roll target；不建立第二 camera、renderer 或場景。
- 玩家拖動畫面時立即清除 guided state；重新開啟自動環繞亦回到自由模式。
- 桌面雙擊可把 yaw／pitch 及黑洞本體 roll 平滑返回 neutral 構圖。
- 原有 `高畫質留影` 直接保存目前 guided 構圖，完成後恢復原本 DPR 並保留選定視角。

### Acceptance Criteria

1. 三個構圖入口只在 NADIR 最終探索出現，全部至少 44 px 高，390×844 與 360×800 不產生橫向溢出。
2. 三個構圖使用不同 yaw／pitch／roll target，真 Browser 畫面證據必須可區分，不能只改文字。
3. 選擇構圖會停止自動環繞；手動拖動或重新開啟自動環繞會清除 guided state。
4. 導覽只改既有物件 transform；guided 前後 draw calls 與 triangles 不增加。
5. 原有接近、抵達、自由探索、模式返回、AURELIA 跳轉及高畫質留影全部保留。
6. 留影仍使用既有短暫 1.60 mobile DPR tier，PNG 完成後恢復原本 DPR，並保留當前 guided 構圖。
7. 不新增 localStorage、sessionStorage、IndexedDB、網絡請求、後端、analytics、dependency、post-processing 或第二 renderer。

### Out of Scope

- 不新增 Frontier Fiction 世界。
- 不改 NADIR 幾何面數、材質數量、抵達時間或世界設定。
- 不建立自動循環攝影巡遊或影片錄製。
- 不改 Real Space 路線、Dijkstra、V4 flight phases、八站景觀或模擬 timing。

### Validation Evidence

Focused validator 應以 production NADIR runtime 驗證：

- exactly 3 個 guided preset 與 44 px 手機觸控面積；
- 390×844、360×800 真 Chromium trusted touch；
- `free → overview → station → jet → manual drag → free → auto orbit` state transitions；
- 三個構圖 screenshot evidence 及不同 live orientation；
- guided state 前後 draw calls／triangles 完全不增加；
- guided composition 期間高畫質 capture backing buffer 真正提升並恢復；
- capture 後仍保留 selected guided state；
- 無 storage／network／第二 renderer authority。

### Risks／補充人手檢查

- 不同手機 GPU／色域可能令吸積盤 additive glow 與黑色事件視界的對比有差異。
- 實體 iPhone Safari 的拖動手感、長時間 frame pacing／熱力與 PNG save sheet 仍值得補充驗證，但不是此 transform-only 切片的完成 blocker。

### Completion Signal

NADIR WELL 抵達後可快速取得三個明顯不同、可直接高畫質留影的黑洞前線構圖；真手機尺寸 Browser、trusted touch、capture、效能邊界及完整 repo validation 通過後推送 persistent Draft PR。
