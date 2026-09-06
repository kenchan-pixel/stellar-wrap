# EIDOLON Rift-Relic Hero Vista

## Goal / 使用效果

令 `EIDOLON GATE｜遺光門廊` 由偏暗、輪廓單薄的古文明環門，提升成手機直向一眼可辨的「仍在殘存運作中的深空遺跡」英雄景觀。固定構圖要同時看到破碎巨環、活躍中央裂隙、殘存符印節點、結構肋骨與遠方遺光航標，提升抵達及留影價值。

本切片服從 D-015：Frontier Fiction 仍由策展好的固定景觀主導；不把自由旋轉重新變回主要操作，不建立 Frontier 假航線權威，亦不改 Real Space V4.1 航行、方向、時間或到站探索。

## Scope

- 保留 EIDOLON 單一 Three.js renderer／camera、既有破碎雙環、星場、碎片、三個舊構圖 preset 與高畫質留影 API。
- 新增一個 bounded `EIDOLON_RIFT_V2` detail profile：
  - 18 個共用 BoxGeometry 的外環 memory ribs，以 InstancedMesh 建立更清楚的破損巨構 silhouette；
  - 24 個共用 OctahedronGeometry 的琥珀 sigil nodes，以 InstancedMesh 形成內環殘存符印節點；
  - 48 段共用 LineSegments 的紫色 phase arcs，避免每段獨立 draw call；
  - 一個低成本 CircleGeometry + ShaderMaterial 中央 rift，使用程序化角向／徑向光紋，不載入外部圖片或 post-processing dependency。
- 提高現有 stone／pylon 的可讀性、冷暖主光對比與 veil glow，但不增加 shadow maps。
- 抵達最終 hero distance 由 `-78` 收近至 `-72`，只改善 EIDOLON 最終構圖，不改 phase duration／flight timing。
- `WarpFrontierEidolon.state()` 暴露 detail profile、18／24／48 detail count 及 rift flag，供 runtime evidence 檢查。
- 把既有 `validate-frontier-eidolon.mjs` 正式接入 `npm run check`，令 390×844／360×800、三個 preset、capture settle、DPR restore、draw／triangle budget 成為每次完整驗證的一部分。

## Relic Sentinel Depth v3

### Goal / intended outcome

在不增加 renderer draw 或幾何預算下，把既有外環結構真正分成近景／遠景，令手機直向的 `overview`、`veil` 與 `beacon` 構圖有更清楚的巨構深度，而中央裂隙仍然保持視覺主角。

### Scope

- 保留核心 `EIDOLON_RIFT_V2`，另以 `EIDOLON_SENTINEL_DEPTH_V3` 標示今次景深處理，不改既有 rift、sigil、phase arc 或 capture authority。
- 重用現有 18 個 memory ribs：交錯放置於 local Z `+4.1 / -3.5`，形成固定 `7.6` local-unit 深度跨度；近景 scale `1.18`、遠景 scale `0.84`，透視比例約 `1.405×`。
- 同一個 InstancedMesh 內以 per-instance colour 把近景肋骨偏暖琥珀、遠景肋骨偏冷紫，不新增材質或 draw call。
- 重用現有 8 個 pylon instance，交錯前後移動及輕微 scale hierarchy；原有破損 pylon 比例保留。
- 更新 EIDOLON 到站／自由觀測／三個 guided vista 文案，令新前後景結構有一致敘事身份。
- Runtime diagnostics 額外暴露 sentinel profile、rib count、depth span 與 scale ratio，供 production browser acceptance 驗證。

### Performance / authority invariants

- 不新增 Three.js draw-bearing object、geometry、material、shader、animation loop、storage、network、route、camera 或 flight-timing authority。
- 目標維持目前實測 `15 draws / 4,492 triangles`，硬上限仍是 `≤16 draws / ≤22,000 triangles`。
- normal DPR 仍 `≤1.25`；Capture Boost 暫時 `≤1.60`，輸出後必須還原原本 backing buffer／DPR。
- Real Space V4+ 的 star-map planning → 3D turn → acceleration → warp entry/cruise/exit → deceleration/approach → arrival → exploration 完全不變。

## Acceptance Criteria

1. 390×844 及 360×800 的 Scenic fixed `overview` 均可清楚看到：破碎巨環輪廓、中央紫／琥珀裂隙、內環符印節點、近／遠 memory ribs 與至少一個遠方遺光 cue。
2. 維持單一 renderer、無外部圖片、無新 dependency、無第二 animation loop、無 storage／network／backend authority。
3. detail counts 固定為 18 memory ribs + 24 sigil nodes + 48 phase arc segments；兩組實體細節使用 InstancedMesh，phase arcs 合併為單一 LineSegments。
4. `EIDOLON_SENTINEL_DEPTH_V3` 必須在 runtime 回報 18 ribs、7.6 depth span、約 1.405× near/far scale ratio，capture 前後均不失效。
5. 既有 EIDOLON guided preset 行為不回歸：overview／veil／beacon、10 px deliberate drag、1.2 s capture settle、0.006 rad convergence 均維持。
6. EIDOLON 仍受既有 `≤16 draw calls / ≤22,000 triangles` 及 normal DPR 1.25／capture DPR 1.60 邊界保護，而且 v3 不增加原有 draw／triangle 成本。
7. Scenic shell 仍為固定景觀；Real Space V4+ route／turn／warp／continuous arrival／exploration 不改。
8. `npm run check`、production Chromium mobile evidence 及 exact-head review 完成後才算切片完成。

## Out of Scope

- 不新增第五個 Frontier 世界或任何 scanner／checklist 任務。
- 不建立 Frontier LY、Dijkstra、ETA 或假航行物理。
- 不加入 bloom/post-processing 套件、外部紋理、永久高 DPR 或大型 shader pipeline。
- 不改 Real Space 八站資料、航行 state machine、Hermite arrival、音訊、旅行日誌或攝影 authority。

## Validation Evidence / Risks

自動驗證應證明 EIDOLON focused runtime gate 已納入完整 `npm run check`，兩個手機 viewport 可進入 guided composition、完成高畫質留影並恢復 normal DPR，同時維持 draw／triangle budget。Shared Frontier backend gate 應再驗證 Scenic shell 的 fixed overview／capture handoff。

Agent 必須自行檢查 exact-head screenshots：中央裂隙是否明顯但不把黑幕變成廉價 portal、近／遠 memory ribs 是否真正增加巨構尺度、冷暖分層是否仍屬輔助細節，以及 UI 沒有遮住主要景觀。

實體 iPhone Safari 的長時間熱力、frame pacing、不同 GPU 的 additive blend 與原生中文字型仍屬 supplementary evidence，不是完成 blocker。

## Completion Signal

EIDOLON 在兩個手機驗收尺寸都由「偏暗的雙環模型」提升成具有可辨近／遠巨構層次、值得留影的活躍古文明遺跡；focused + full repo validation、實際 WebGL screenshot、capture restore、performance budget 與 exact-head review 全部有證據，並推送到 persistent Draft PR。
