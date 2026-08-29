# Warp Threshold Cinematics｜曲速閾值進出場

> 狀態：Draft candidate／自主演進驗證中。這是已批准 V4.1.0 航行體驗的呈現層增量，不改動航線、飛行狀態機、相機或抵達軌跡。

## Vertical Slice

### Goal／使用效果

令每一段航程由「加速 → 進入曲速 → 巡航 → 脫離曲速」更有跨越空間閾值的儀式感。使用者應在現有曲速隧道之外，看到一個會跟目的地色調同步的中空曲速窗：進入時由中央鎖定並擴張，巡航時退到低強度背景，脫離時反向收束，再自然交給既有 Approach Vista。

### Scope

- 完全沿用 `journey-atmosphere.js` 已寫入的 `data-phase`、`--journey-rgb` 及 `--journey-alt-rgb`；不建立第二套狀態取樣。
- 只在既有 `responsive-ui.js` 注入 CSS 呈現：使用 `#journeyAtmosphere::before`／`::after` 兩個 pseudo-elements，沒有新增 DOM、canvas、Three.js object 或 JavaScript timer。
- `warpEntry`：外圈與破環由中央快速鎖定、擴張，強化真正進入曲速的瞬間。
- `warp`：閾值退到低透明度，避免蓋過現有曲速隧道與 Transit Corridor Vistas。
- `warpExit`：環形效果反向收束並退場；`decelerate` 起完全隱藏，讓 Approach Vista 接手。
- 航道 HUD 在 `warpEntry`／`warpExit` 只做輕量邊框／亮度脈衝，不新增文字、駕駛艙面板或中央提示。
- 動畫只使用 `transform`／`opacity`；不使用 `filter`、`backdrop-filter`、新增粒子、shader、網絡、儲存、dependency 或 `requestAnimationFrame`。
- `prefers-reduced-motion` 會取消新增動畫，保留靜態低強度狀態。

### Acceptance Criteria

1. `warpEntry` 有可辨認的 destination-tinted 閾值擴張，而中央仍保持中空、不遮擋曲速 tunnel。
2. `warp` 階段閾值明顯退後，不與三層 Transit Corridor scenery 爭奪主視覺。
3. `warpExit` 有反向收束效果，並在 `decelerate`、`approach`、`observe` 完全退場。
4. 效果自動繼承八個 destination journey palette；不複製星區／route identity 資料。
5. 不增加 DOM node、JS timer、render loop、Three.js geometry、shader、filter、backend、network、storage 或 dependency。
6. Reduced Motion 取消新增 keyframe animation。
7. V4.0 immutable hash、既有 route／flight phase／Hermite arrival checks 維持通過。

### Out of Scope

- 不改原有 `warpHalo`／`warpFlash`／`warpEdge` 的 JavaScript timing。
- 不改 FOV、速度、flight phase duration、arrival clock 或相機。
- 不新增 location、route edge、3D 地標或探索玩法。
- 不宣稱已在實機證明 60 fps；手機 compositor／熱力仍需人手驗證。

### Validation Evidence

Focused validator 應確認：

- 兩個 pseudo-element threshold layers 存在而且 `pointer-events:none`。
- `warpEntry`、`warp`、`warpExit` 三個既有 phase 均有明確呈現 contract。
- `decelerate`／`approach`／`observe` 均清除 threshold。
- 新增 animation 只使用 transform／opacity，並有 Reduced Motion fallback。
- 新增 CSS 區塊沒有 filter／backdrop-filter、JS timer、rAF、Three.js 或網絡／儲存權限。
- `npm run check` 仍由現有 Journey Atmosphere focused validator覆蓋。

### Risks／需人手確認

1. iPhone Safari 直向：曲速窗是否足夠明顯但不洗白中央 tunnel／HUD。
2. `SOL → LUNA`：短航段的 entry／exit 是否仍有完整節奏，不會動畫未完成就突兀切相。
3. `SOL → ORION`：多段每次重新入曲速時 threshold 是否重新觸發，且目的地色調跟真正下一站同步。
4. `ORION → TAU`：赤紅 → 粉紫色域切換是否自然。
5. `warpExit → decelerate`：threshold 完全退場，再由 Approach Vista 接手，沒有視覺堆疊。
6. 開啟 Reduced Motion 後沒有新增旋轉／縮放動畫。
7. 實機 FPS／DPR／熱力；本切片不把 CI 當作 60 fps 證據。

### Completion Signal

一個完整、可見的曲速進出場 cinematic pass 已推送到 persistent Draft PR；核心航行權限不變，focused／full validation 綠燈，Exact-HEAD review 無 P0/P1 blocker，production 不自動部署或合併。
