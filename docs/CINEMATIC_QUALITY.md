# Cinematic High-tier Quality｜V5.5 第一個垂直切片

## Goal

先以 `TAU｜金牛塵海` 驗證真正 3D High-tier 畫質提升：高畫質探索及 Photo Capture Boost 應比標準畫質有明顯更細緻的氣態巨行星表面、大氣邊緣、環帶分層及環塵深度，同時不改變航線、航行時間、相機 authority 或抵達軌跡。

## Scope

- 只提升 TAU 的 High tier；自動／流暢／標準維持現有持續負載。
- 在既有 TAU 3D scene root 上加入 4 個 bounded render objects：
  1. 跟隨原行星表面旋轉的高細節氣帶／風暴薄層。
  2. Fresnel 式粉紫／冰藍大氣邊緣。
  3. 具細環帶、間隙及色差的 shader ring overlay。
  4. 96 粒固定上限的環塵 points layer。
- 只在 `TAU + final exploration + High quality + WebGL healthy` 顯示。
- Photo Capture Boost 暫時切到 High 時同樣啟用，因此高畫質 PNG 會包含新增的真 3D 細節。
- 沿用固定 Three.js `0.185.1`；沒有新增第三方依賴、圖片資產、後端、網絡服務或資料儲存。

## Acceptance Criteria

1. 390×844 及 360×800 真 production WebGL 均可由 Standard 切換到 High，High 狀態顯示完整 TAU scene。
2. High 額外負載固定為最多 4 draw objects、約 11k triangles 及 96 ring-dust points；低於 High 時全部隱藏。
3. 新模組不建立第二 renderer、第二 camera、獨立 `requestAnimationFrame` 或 flight state。
4. Renderer prototype 只用一次取得現有 live scene，捕捉後立即恢復原 `render()`；不留下每幀 wrapper。
5. 不改 `index.html` 的 route graph、flight phases、Hermite arrival、DPR 上限或 simulation timing。
6. `npm run check`、V4 immutable baseline、Photo Capture Boost、offline shell 及既有探索回歸全部保持通過。

## Performance Budget

- 額外 draw objects：4（僅 High TAU final exploration）
- 額外三角形：約 11k
- 額外 Points：96
- 狀態同步：4 Hz，render loop 之外
- 無 shadow map、post-processing chain、額外 canvas renderer 或無上限粒子
- 日常 Auto／Standard 航行不承擔這組額外 draw cost

## Out of Scope

- 提高全域 High DPR 1.60／1.90 上限
- 一次重畫全部八站
- 新科幻目的地、Landing Page 或 Gallery
- 改 flight timing／路線／相機
- 宣稱未量度的實體手機長時間 60 fps／熱力結果

## Completion Signal

TAU 在同一手機 viewport 下由 Standard 切換 High 後，真 Browser 證據顯示新增 3D 氣帶、大氣、細環及環塵層已啟用；切回低畫質後立即停用，而完整 V4+ 航行及現有探索／攝影能力維持綠燈。
