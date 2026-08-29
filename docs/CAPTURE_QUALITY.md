# Capture Quality｜高畫質留影

## Goal

令目的地攝影真正使用較高 WebGL backing resolution，讓到站景觀更值得保存，同時不把整段手機航程永久推到最高 GPU 負載。

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

## 下一個畫質切片候選

在本 Capture Boost 穩定後，再獨立提升 High tier 的**實際 3D visual ceiling**：優先程序化星體材質解析度、表面／大氣細節、遠景層次與抵達構圖；每項需以手機 fill-rate、draw call、記憶體及真 Browser 畫面證據限制成本，而不是只提高 DPR。
