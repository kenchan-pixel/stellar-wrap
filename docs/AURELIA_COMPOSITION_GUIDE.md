# AURELIA ARC｜曙光環域 · Cinematic Composition Guide｜構圖導覽

> 狀態：Draft candidate／自主演進驗證中。這個切片深化既有 Frontier Fiction 旗艦目的地，不新增世界、航線、儲存或第二套相機 authority。

## Vertical Slice

### Goal／使用效果

令 AURELIA ARC 不只「可以拖動畫面看」，而是有三個為手機直向與留影而設的精心構圖入口。使用者抵達自由探索後，可一按將既有巨構平滑轉到可辨認的視角，再直接使用原有高畫質留影；仍可隨時拖動返回自由觀察或恢復自動環繞。

### Scope

- 在既有探索故事卡內加入三個 44 px 構圖按鈕，只在 `explore` 階段顯示。
- 三個固定視角：
  - `環域全景`：強調完整棲息環、中央核心及周邊空域的尺度。
  - `夜側港弧`：把環面傾斜到夜側城市光帶與外圍碎屑更容易同框的位置。
  - `核心視窗`：把中央能源核心與內環結構放入更強的近景層次。
- 選擇構圖時暫停既有自動環繞，只調整現有 habitat 的 yaw／pitch／roll target；不建立第二部 camera 或 renderer。
- 玩家開始手動拖動或重新開啟自動環繞時，構圖導覽回到自由模式。
- 桌面雙擊及手機雙擊式雙點（double-tap）都必須把 yaw／pitch 連同 habitat roll 一起平滑返回原始 neutral 構圖（roll `0.1`），不可保留 Night／Core 的傾斜角度。
- 手機 double-tap 透過既有 canvas pointer-event authority 判斷；只接受短時間、近距離、沒有拖動的兩次 touch tap，不新增另一套 gesture／camera authority。
- 原有 `高畫質留影` 直接保存目前構圖，完成後仍恢復原本 DPR。

### Acceptance Criteria

1. 三個構圖入口只在 AURELIA 最終探索出現，全部至少 44 px 高，360×800 與 390×844 不產生橫向溢出。
2. 三個構圖使用不同 yaw／pitch／roll target，畫面證據必須可區分，不能只是改文字。
3. 選擇構圖會停止自動環繞，避免已選畫面繼續漂走；重新開啟自動環繞會清除 guided state。
4. 導覽只調整既有 `habitat` transform，不新增 WebGL draw call、triangle、mesh、shader、貼圖或 post-processing。
5. 原有拖動、模式選擇、Real Space 返回及高畫質留影全部保留；桌面 double-click／手機 trusted double-tap 都必須清除 guided state，並將 yaw／pitch／roll 全部返回原始 neutral 構圖。
6. 手機 double-tap 必須由真 touch input 驗證，不可用 mouse double-click 或直接呼叫 `resetView()` 代替。
7. 留影時仍使用既有短暫 1.60 mobile DPR capture tier，完成後恢復正常 DPR，並保留選定構圖。
8. 不新增 localStorage、sessionStorage、IndexedDB、網絡請求、後端、analytics、dependency 或第二 renderer。

### Out of Scope

- 不新增第五個 Frontier Fiction 世界。
- 不建立自動循環觀光影片／計時導覽。
- 不改 AURELIA 幾何複雜度、程序化材質、抵達時間或探索規則。
- 不改 Real Space 路線、Dijkstra、V4 flight phases 或八站景觀。

### Validation Evidence

Focused validator 應以 production AURELIA runtime 驗證：

- exactly 3 個構圖 preset 與 44 px 手機觸控面積；
- 390×844、360×800 真 Chromium trusted touch；
- `free → night → core → trusted touch double-tap neutral reset → free auto-orbit` state transitions；
- double-tap 必須由兩組真 `Input.dispatchTouchEvent` tap sequence 驅動，不能使用 mouse event；
- reset 後 `vista=free`，yaw／pitch 回到 0、roll 回到原始 `0.1`，不可只驗證 DOM 文案；
- 三個構圖截圖互相不同；
- guided state 前後 draw calls／triangles 完全不增加；
- guided composition 期間高畫質 capture backing buffer 真正提升並恢復；
- 無 storage／network／第二 renderer authority。

### Risks／補充人手檢查

- 不同手機 GPU／色域可能令夜側城市光帶的亮度感受有差異。
- iPhone Safari 對雙點節奏的主觀手感仍值得補充檢查；技術完成 gate 以真 touch pointer path、兩個手機 viewport 及完整 reset state 為準。
- iPhone Safari 實體長時間 frame pacing／熱力仍是有價值的補充證據，但本切片只改既有 pointer gesture 與物件 transform，不應成為完成阻塞條件。

### Completion Signal

AURELIA 由單純自由拖動景觀升級成可快速取得三個明顯不同、可直接高畫質留影的旗艦構圖；guided 構圖後，桌面雙擊及手機 trusted double-tap 都能完整回正至 neutral yaw／pitch／roll。真手機尺寸 Browser、capture、效能邊界及完整 repo validation 通過後推送 persistent Draft PR。
