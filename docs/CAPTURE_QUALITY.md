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

## 下一個畫質切片候選

繼續提升 High tier 的**實際 3D visual ceiling**：優先程序化星體材質解析度、表面／大氣細節、遠景層次與抵達構圖；每項需以手機 fill-rate、draw call、記憶體及真 Browser 畫面證據限制成本，而不是只提高 DPR。
