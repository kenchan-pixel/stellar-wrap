# EIDOLON GATE｜遺光門廊 · Cinematic Composition Guide｜構圖導覽

> 狀態：Draft candidate／自主演進驗證中。這個切片深化既有 Frontier Fiction 第四目的地，不新增世界、航線、儲存、幾何或第二套相機 authority。

## Vertical Slice

### Goal／使用效果

令 EIDOLON GATE 由單純自由環視升級成更值得重遊與留影的古文明目的地。玩家抵達自由探索後，可一按切換三個為手機直向設計的電影構圖，再直接使用既有高畫質留影；仍可用真正拖動返回自由觀察或重新開啟自動環繞。

### Scope

- 在既有探索故事卡內加入三個只於 `explore` 顯示的 44 px 構圖入口：
  - `斷環全景`：完整呈現破碎雙環、殘存光紋與漂浮碎片，保留遺跡尺度。
  - `黑幕中軸`：把中央黑幕、錯位內環與紫色折光推到畫面中軸，強調未知機能。
  - `遺光殘標`：以遠方琥珀航標、前景殘骸及斜向門環建立失落航道構圖。
- 選擇構圖時停止既有自動環繞，只改現有 `world` yaw／pitch／roll target；不建立第二部 camera、renderer 或 scene。
- 靜止點按 canvas 不會取消已選構圖；只有拖動超過既有 10 px 容差才回到 free-look。
- 快速「選構圖 → 高畫質留影」會等待實際 yaw／pitch／roll 收斂至 `0.006 rad` 內；最多等待 `1.2 s`，若仍未完成則在 PNG 前把既有 transform 鎖到目標。
- 留影沿用既有 mobile capture DPR `1.60`，完成後恢復正常 DPR `1.25` 上限及保留選定構圖。

### Acceptance Criteria

1. 三個構圖入口只在 EIDOLON 最終探索出現，全部至少 44 px 高；390×844 與 360×800 不產生橫向溢出。
2. 三個 preset 使用明顯不同 yaw／pitch／roll，真 Browser 截圖必須可區分，而不是只改文案。
3. 選擇 preset 會停止 auto-orbit；靜止 touch 保留 preset，拖動超過 10 px 才退出 guided state。
4. 立即留影必須驗證實際 yaw／pitch／roll 已在目標 `0.006 rad` 容差內，不能保存過渡角度。
5. capture settle 最長 `1.2 s`；超時只把現有 transform 鎖到 preset，不建立新 renderer／camera authority。
6. guided state 前後 draw calls／triangles 不增加；既有 EIDOLON 場景幾何、星場、門環、光紋及碎片完全重用。
7. 留影 backing buffer 真正提升，PNG 完成後恢復原 DPR，並保留當前 guided vista。
8. 不新增 localStorage、sessionStorage、IndexedDB、網絡請求、後端、analytics、dependency、路線或 Real Space node。

### Out of Scope

- 不新增第五個 Frontier Fiction 世界。
- 不改 EIDOLON approach／arrival timing、程序化幾何密度或故事設定。
- 不改 AURELIA／NADIR／VESPER 構圖與 capture 行為。
- 不改 Real Space Dijkstra、V4 flight phases、Hermite arrival、八站景觀或 Photo Mode authority。
- 不加入自動影片、後處理框架、4K 強制輸出或長時間最高 DPR。

### Validation Evidence

Focused validator 應以 production EIDOLON runtime 驗證：

- exactly 3 個 preset、44 px trusted-touch 面積及 viewport containment；
- 390×844、360×800 真 Chromium；
- `overview → veil → beacon → stationary touch → deliberate drag → free` 狀態轉換；
- 三個構圖 screenshot 均為實際 WebGL 畫面；
- 快速切到 `黑幕中軸` 後，在畫面仍未收斂時立即 capture，證明三個 orientation axis 均在 `0.006 rad` 內才輸出；
- guided 前後 draw calls ≤16、triangles ≤22,000，且沒有新增場景物件；
- capture backing buffer 升級、PNG 非空及 normal DPR 恢復；
- 全 repo `npm run check` 與既有 V4+ route／flight／Hermite、Frontier、Photo／offline／WebGL gate 維持綠燈。

### Risks／補充人手檢查

- 不同手機 GPU／色域可能令紫色 veil glow 與琥珀 glyph 的對比有差異。
- 實體 iPhone Safari 的長時間熱力、frame pacing、touch feel 與 PNG save sheet 仍值得補充檢查，但不應阻塞已由真 production-browser 證明的本切片。

### Completion Signal

EIDOLON 具備三個可直接留影、可明顯辨識的手機電影構圖；快速 preset → capture 不會保存過渡角度；兩個手機 viewport、capture resolution、效能邊界及完整 repo validation 全部通過，並推送到 persistent Draft PR。
