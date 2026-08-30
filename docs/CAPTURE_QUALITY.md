# Capture Quality｜高畫質留影

## Goal

令目的地攝影真正使用較高 WebGL backing resolution，並提供實用但不污染成品的構圖輔助，讓到站景觀更值得保存，同時不把整段手機航程永久推到最高 GPU 負載。

## Vertical Slice｜Photo Capture Boost v1

### 使用效果

- 使用者仍可用自動／流暢／標準畫質探索及構圖。
- 按「高畫質留影」後，系統短暫切換至既有 High renderer tier。
- 等待兩個實際渲染幀，再從該高 DPR canvas 產生 PNG。
- 完成或失敗後都恢復原本畫質模式。
- 留影期間按鈕暫停，避免重複 capture／畫質切換互相競爭。

### Acceptance Criteria

1. 只在安全最終探索狀態可留影；航行中／WebGL context lost 不可開始。
2. 非 High 模式留影時，WebGL canvas backing width／height 必須實際高於原本畫質，而 CSS viewport 尺寸不變。
3. PNG width／height 必須等於提升後的 canvas backing size，不是把低解像截圖事後放大。
4. PNG 完成、失敗或安全狀態中止後，原本畫質模式必須恢復。
5. 不新增 renderer、camera authority、flight timing、storage key、network request、backend 或 render-loop 工作。
6. 390×844 及 360×800 真 Chromium production-page runtime 均需通過 capture／restore gate。

### Out of Scope

- 本切片不提高 High tier 本身現有 1.60 mobile／1.90 desktop DPR 上限。
- 不加入 4K 強制輸出、離屏第二 renderer、超採樣後處理或大型 post-processing dependency。
- 不改任何目的地 3D 幾何、材質、航線、曲速時間或相機行為。

## Vertical Slice｜Photo Composition Guides v1

### Goal / intended player outcome

進入目的地攝影模式後，使用者毋須靠估就可快速整理畫面重心；格線只在構圖時可見，實際 PNG 保持乾淨。

### Scope

- 在既有 Photo Mode 加入三種 session-only 構圖狀態：`三分線 → 中心線 → 關`，預設三分線。
- 三分線使用兩條垂直及兩條水平線；中心模式使用十字線及中心圓標。
- 使用既有 Photo Mode toolbar 加入 44 px 觸控高度的「格線」按鈕；390 px 以下 toolbar 可換行，不壓縮核心「返回／高畫質留影」操作。
- 格線是單一 pointer-transparent DOM overlay；不攔截 WebGL canvas 拖動／觸控。
- `photoCapturing` 狀態必須隱藏格線與 toolbar，再由既有 WebGL canvas 產生 PNG；完成後恢復使用者當次構圖模式。
- 不加入新 storage key；模式只存在目前頁面 session。

### Acceptance Criteria

1. 安全目的地探索進入 Photo Mode 時，預設三分格線可見。
2. 真 Browser 可信觸控可依序切換三分線、中心線、關閉，再回到三分線。
3. 格線覆蓋手機 viewport、`pointer-events:none`，中央 hit target 仍為現有 `#space` WebGL canvas。
4. 390×844 及 360×800 toolbar 均完全留在 viewport，格線按鈕實際高度不少於 44 px，無頁面橫向溢出。
5. Capture Boost 進入 `photoCapturing` 時格線 opacity 為 0；PNG backing dimensions 仍等於 High tier canvas，完成後原畫質及格線模式恢復。
6. 不改 renderer、camera、航線、飛行時間、destination geometry、quality DPR 上限或 capture authority。
7. 不新增 network、backend、analytics、persistence、Three.js object 或 render-loop 工作。

### Out of Scope

- 黃金比例、對角線、水平儀或自動主體識別。
- 把格線烙印到 PNG、相片濾鏡、色彩後製或相片編輯器。
- 儲存個人格線偏好或跨裝置同步。
- Frontier Fiction 專屬構圖 preset；既有 AURELIA／NADIR guided vistas 保持獨立。

### Performance / risk

構圖格線只在靜態 Photo Mode 以少量 DOM/CSS 線條顯示，不進入 60 Hz renderer loop、無 GPU geometry、無額外 polling。Safari 字體與 1 px 線條抗鋸齒可能與 Chromium 略有差異；實體手機檢查屬補充證據，不是完成 gate。

### Completion signal

使用者在手機目的地 Photo Mode 可即時使用三分／中心構圖輔助，觸控及畫面不被阻擋，而高畫質 PNG 不包含任何格線並正常恢復原有畫質。

## Vertical Slice｜Photo Frame Formats v1

### Goal / intended player outcome

讓目的地高畫質留影可以直接輸出適合手機觀看及分享的構圖，不必事後再用其他 App 裁切；同時保留原始畫幅選項，不犧牲既有 capture 行為。

### Scope

- Photo Mode 新增 session-only `畫幅：原幅 → 9:16 → 1:1` 44 px 觸控切換。
- `9:16` 與 `1:1` 在構圖時顯示中央裁切框，框外輕微壓暗；overlay 完全 `pointer-events:none`，不阻擋既有 WebGL 拖動。
- 留影仍先短暫切換至既有 High renderer tier並等待兩個實際渲染幀；先從高 DPR WebGL canvas 取得原始 PNG，再只做中央像素裁切。
- 裁切輸出直接使用原始高畫質像素，**不放大、不重採樣到虛構 4K**；若來源比目標畫幅窄，裁高度；若來源較寬，裁寬度。
- `9:16` 及 `1:1` 檔名分別帶 `-9x16`／`-square`，方便本機相片記錄辨識。
- Capture 中隱藏格線、裁切框及工具列；完成後恢復原畫質、格線及所選畫幅。
- 不新增相機 authority、第二 WebGL renderer、Three.js 幾何、storage key、network request、backend 或新的 polling/render-loop 工作。

### Acceptance Criteria

1. 進入 Photo Mode 預設仍為原始畫幅，既有留影輸出行為不變。
2. 390×844 及 360×800 真 Chromium 可信觸控可依序切換原幅、9:16、1:1，再返回原幅；兩個裁切框均完全留在 viewport 內，工具列無橫向溢出。
3. 9:16 預覽框實際寬高比約為 `9 / 16`；1:1 寬高相等。
4. 高畫質 9:16 留影輸出 width／height 必須等於由 High backing buffer 計算的中央 crop rectangle，兩個維度都不得大於來源 backing buffer。
5. Crop preview 與 composition guide 在 `photoCapturing` 期間都不可出現在成品；完成後兩者恢復。
6. 原本畫質模式在裁切 PNG 產生成功、失敗或中止後均可靠恢復；capture 期間 frame／guide／exit／capture 按鈕全部 disabled，避免競態。
7. 原幅、9:16、1:1 只存在目前頁面 session，不新增 persistence／analytics／network／backend。

### Out of Scope

- 任意自由裁切、拖動 crop window、旋轉、濾鏡、曝光／色彩編輯。
- 4:5／16:9／超寬畫幅；先驗證原幅、手機直向 9:16 及方形三種最常用結果。
- 相片 Gallery 的永久收藏／同步；Gallery 仍只使用既有本機記錄能力。
- 為了畫幅而改變飛行相機、目的地相機或 3D 場景位置。

### Performance / risk

新增成本只在使用者按留影後發生一次：已驗證的高畫質 WebGL PNG 先解碼為 bitmap，再在一個短生命週期 2D canvas 做中央裁切後輸出最終 PNG。日常探索與航程無額外 GPU geometry、draw call 或 60 Hz 工作。最大的補充風險是 iPhone Safari 在高畫質 PNG 解碼＋2D 裁切瞬間的記憶體峰值；實體裝置熱力／記憶體檢查仍屬補充證據，不作自主演進阻塞條件。

### Completion signal

使用者在任何 Real Space 最終目的地可於同一 Photo Mode 直接預覽及輸出原幅、9:16 或 1:1 高畫質 PNG；真手機尺寸 Chromium 證明畫幅、裁切像素、工具列安全區及原畫質恢復全部正確。

## 下一個畫質切片候選

繼續提升 High tier 的**實際 3D visual ceiling**或旅程／抵達構圖：優先程序化星體表面、大氣／halo、遠景層次與具有 destination identity 的 arrival spectacle；每項需以手機 fill-rate、draw call、記憶體及真 Browser 畫面證據限制成本，而不是只提高 DPR。