# Corridor Landmark Flybys｜航道奇景掠影

> 狀態：Draft candidate／自主演進驗證中。這是 V4.1.0 已批准旅程的呈現層增量；不新增星圖節點、航線權限、飛行狀態或探索規則。

## Vertical Slice

### Goal／使用效果

令曲速巡航由「隧道＋顏色＋細小航道圖案」進一步變成真正有沿途景觀的旅程。使用者經過九條現有直航走廊時，會在中央主視野以外看到大型、可辨識、具前後層次的航道奇景掠過，令不同航段像經過不同深空地貌，而不是同一段曲速效果換色。

### Scope

九條現有直航走廊各自取得一組大型周邊景觀語彙：

- `SOL ↔ LUNA`：地球反照／月影弧形地平線。
- `SOL ↔ SIRIUS`：冰藍剪切層與晶體狀光面。
- `SOL ↔ PROX`：紅矮星磁場弧及星風邊界。
- `LUNA ↔ VEGA`：大型星門引導環。
- `LUNA ↔ PROX`：月背碎岩／小行星剪影。
- `VEGA ↔ CYG`：藍紫交叉導引束。
- `CYG ↔ ORION`：赤紅發射星雲幕牆。
- `TAU ↔ SIRIUS`：塵海環波與冰晶邊界。
- `SIRIUS ↔ PROX`：破碎中繼環與紅矮星航標。

實作直接重用 `journey-atmosphere.js` 已有 `#journeyTransit[data-corridor]`、九條 corridor identity、destination palette 及 4 Hz 狀態取樣。新增景觀只使用 `::before`／`::after` 兩個 pseudo-elements；原有三個 Transit Corridor motif、Warp Threshold、Approach Vista、3D destination scene 全部保留。

### Acceptance Criteria

1. 九條既有直航 corridor 均有不同大型景觀輪廓；反向航程重用同一走廊 identity。
2. 景觀在 `warpEntry` 輕微建立、`warp` 清楚掠過、`warpExit` 退場。
3. 由 `decelerate` 起完全清除，避免與 Approach Vista／真正 3D 到站景觀重疊。
4. 中央瞄準／曲速 tunnel 保持可見，景觀主要停留畫面周邊，不新增大型 HUD。
5. 動畫只改 `transform`／`opacity`；不新增 JS timer、render loop、Three.js object、shader、filter、網絡、儲存或 dependency。
6. `prefers-reduced-motion` 停止新增掠影動畫，只保留低強度靜態景觀。
7. `npm run check`、V4.0 immutable hash、route／flight phase／Hermite arrival regression 全部維持通過。

### Out of Scope

- 不新增星圖節點或第九個目的地；本切片先把現有航道「變成地方」。
- 不改 6.0 LY 航段圖、Dijkstra、航段時間、FOV、相機、速度或 arrival clock。
- 不新增 WebGL geometry／particle system；真正 destination landmark 仍由核心 3D scene 負責。
- 不將奇景變成可互動探索任務或 persistence 資料。
- 不宣稱已證明實機 60 fps；手機 Safari fill-rate／熱力仍需實測。

### Validation Evidence

Focused validator 應證明：

- 只使用 existing `#journeyTransit` 的兩個 pseudo-elements，零新增 runtime DOM。
- 九條 corridor selector 齊全且唯一。
- `warpEntry → warp → warpExit` phase contract 存在；`decelerate／approach／observe` 明確清除。
- 動畫只使用 transform／opacity，Reduced Motion 可停用。
- 不包含 filter／backdrop-filter、JS timer、rAF、Three.js、network、storage 或 route/coordinate authority。
- Existing Journey Atmosphere 仍為 corridor identity 唯一來源。

### Risks／需人手確認

1. iPhone Safari 直向：大型弧面／雲幕是否夠明顯但不遮中央 tunnel、HUD 或目的地接近景觀。
2. `SOL → LUNA`：短航段能否看到完整奇景節奏，而不覺得太繁忙。
3. `SOL → ORION`：四段航程應逐段明顯換景，尤其 `VEGA → CYG → ORION`。
4. `ORION → SOL` 等反向長途：走廊景觀 identity 需一致，但下一站 palette 仍跟實際航段同步。
5. `warpExit → decelerate → approach`：航道奇景應完全退場，再由 Approach Vista 接手。
6. Reduced Motion、Low quality 及 Auto quality 下視覺仍清楚。
7. 實機 FPS／DPR／熱力；CI 只能證明結構及權限邊界，不能證明 60 fps。

### Completion Signal

九條既有航道已由純曲速走廊升級成有大型可辨識深空奇景的旅程層；改動已推送 persistent Draft PR，focused／full validation 通過，Exact-HEAD review 無 P0／P1 blocker，而 `main`、production 及 V4 穩定快照仍由擁有人控制。
