# Stellar Warp Explorer｜星際曲速航行模擬器

> 手機優先、沉浸式、流暢的 3D 星際旅行模擬器。使用者可從全息星圖選擇目的地，系統會按實際方位與距離規劃一段或多段曲速航程，自動完成轉向、加速、進入曲速、巡航、脫離曲速、連續減速與到站探索。

[![Validate](https://github.com/kenchan-pixel/stellar-wrap/actions/workflows/validate.yml/badge.svg)](https://github.com/kenchan-pixel/stellar-wrap/actions/workflows/validate.yml)

## 專案狀態

- **目前 release baseline：V4.1.0**（2026-08-27；見 `releases/v4.1.0.md`）
- **不可覆寫回歸快照：V4.0 Stable**（`releases/v4.0-stable.html`）
- **Active app：** `index.html` 現為 V4.1.0 基線；後續功能仍透過 branch／PR 演進
- **產品方向：** 由曲速特效展示，持續發展成完整星際探索體驗
- **主要平台：** 手機瀏覽器，兼容桌面瀏覽器
- **架構：** 無建置流程的靜態 Three.js WebGL 應用
- **效能原則：** 優先維持流暢轉向與航行節奏；畫質可自動降階，但動畫時間不可因效能調節而改變

## 現有體驗

- 8 個具固定 `X / Y / Z` 模擬座標的星區
- 2.5D 全息星圖、目前位置、航向與航段進度
- 單段安全曲速距離上限 6.0 LY
- Dijkstra 最短路徑規劃，多段航行可自動經中途站續航
- 依照實際 3D 方位平滑轉向，包含合理艦身傾側
- 航行距離會影響曲速巡航時間
- 完整航行狀態：轉向 → 亞光速加速 → 進入曲速 → 曲速巡航 → 脫離曲速 → 連續減速 → 定速接近 → 到站觀景
- 每個星區都有獨立 3D 天文景觀與環境色調
- 地球具程序化海洋、陸地、冰帽、雲層、城市夜光與大氣邊緣
- 中途站短暫飛掠；最終目的地進入可拖動、自動環繞的探索模式
- Web Audio 動態引擎、曲速、轉向與環境聲
- 自動／流暢／標準／高畫質模式及效能診斷 HUD
- WebGL context lost 時凍結航程並於恢復後由原位置續航
- 本機旅行日誌保存完成航程、路線、活躍時間、距離及累積 LY
- LUNA 三點觀測探索及本機發現紀錄
- 最終目的地攝影模式及本機 PNG capture
- 成功在線啟動一次後支援離線重新啟動；3D 啟動失敗時提供靜態導航 fallback
- 完整抵達後顯示 Arrival Debrief，包括目的地、航段、路線、距離及活躍航行時間
- 以 60 Hz 裝置上的 16.67 ms 幀預算為優先目標

> V4.1.0 已經 owner 實機驗收並由 PR #4 合併成 release baseline。這只確認目前已發佈行為，不等同預先批准更廣泛的 V5 roadmap。

### 離線恢復

成功在線開啟一次後，Service Worker 會保存 active shell 及固定 Three.js `0.185.1`，之後斷網重新開啟可回退到最近成功快取。控制面板會顯示離線準備狀態；若 3D 引擎約 9 秒仍未 ready，loading 畫面會提供清楚的重新載入操作。

這不是完整 PWA，也不宣稱第一次使用可離線。詳見 [離線啟動與恢復](docs/OFFLINE.md)。

## 立即運行

應用只需要一個靜態檔案伺服器：

```bash
npm run serve
```

然後開啟：

```text
http://localhost:8080
```

亦可使用 Python：

```bash
python3 -m http.server 8080
```

> 首次開啟需要網絡載入已鎖定版本的 Three.js。完成一次成功快取後，後續重新開啟可在沒有網絡時使用最近成功版本。瀏覽器亦只會在使用者首次互動後允許播放聲音。

## 操作

1. 按右下角「星圖 / 航行」。
2. 在星圖點選目的地。
3. 檢查航段、距離、方位角、高度角及預計時間。
4. 按「啟動航行」。
5. 系統會自動完成整段旅程；中途站可立即續航。
6. 抵達最終目的地後，可拖動畫面觀察或暫停自動環繞。

非航行狀態下：

- 拖動：環視星區
- 雙擊：視角回正
- 星圖面板：調整曲速倍率、星體密度、畫質、聲音與診斷資料

## 專案結構

```text
.
├── index.html                         # V4.1.0 active app；後續 branch 可演進
├── travel-journal.js                  # V4.1.0：本機旅行日誌與完成航程記錄
├── exploration-survey.js              # V4.1.0：LUNA guided survey
├── photo-mode.js                      # V4.1.0：目的地乾淨觀景與本機 PNG capture
├── offline-bootstrap.js               # V4.1.0：離線準備狀態、Service Worker 註冊、啟動後備
├── sw.js                              # V4.1.0：active shell + pinned Three.js offline cache
├── releases/v4.1.0.md                # V4.1.0 release／實機驗收紀錄
├── releases/v4.0-stable.html         # 不可覆寫的 V4.0 穩定版快照
├── archive/                           # V1–V3.2 演進版本
├── docs/
│   ├── PRD.md                         # 產品目標及範圍
│   ├── ARCHITECTURE.md                # 技術架構及資料流
│   ├── FLIGHT_MODEL.md                # 航行狀態機與時間模型
│   ├── STAR_MAP.md                    # 星圖、座標及航線網絡
│   ├── PERFORMANCE.md                 # 60 Hz 效能策略
│   ├── TESTING.md                     # 自動及實機驗收
│   ├── DECISIONS.md                   # 已批准設計決定
│   ├── ROADMAP.md                     # 後續發展方向
│   ├── OFFLINE.md                     # 離線啟動策略及驗收
│   ├── HANDOFF.md                     # AI／開發者交接入口
│   ├── PUBLISHING.md                  # GitHub 發佈及靜態部署
│   └── REPOSITORY_MANIFEST.md         # 初始 repo 內容、提交及驗證清單
├── scripts/
│   ├── serve.mjs                      # 零依賴本機伺服器
│   ├── validate.mjs                   # 結構、語法、基線及秘密掃描
│   ├── validate-survey.mjs            # LUNA guided survey 聚焦驗證
│   ├── validate-photo-mode.mjs        # Destination photo mode 聚焦驗證
│   └── validate-offline.mjs           # Offline resilience 聚焦驗證
├── AGENTS.md                          # AI agent 工作規則
└── .github/workflows/validate.yml     # GitHub Actions 驗證
```

## 文件入口

- [產品需求與願景](docs/PRD.md)
- [架構與資料流](docs/ARCHITECTURE.md)
- [航行狀態機](docs/FLIGHT_MODEL.md)
- [八站星圖與路線](docs/STAR_MAP.md)
- [60 Hz 效能基線](docs/PERFORMANCE.md)
- [測試與完成標準](docs/TESTING.md)
- [批准決定](docs/DECISIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [離線啟動與恢復](docs/OFFLINE.md)
- [開發交接](docs/HANDOFF.md)
- [GitHub 發佈與部署](docs/PUBLISHING.md)
- [Repository 準備清單](docs/REPOSITORY_MANIFEST.md)

## 開發守則

- 所有新要求均視為在已批准功能上**疊加修正**，不可因重構刪走原有體驗。
- `releases/v4.0-stable.html` 是不可修改的回歸基線；V4.1.0 release baseline 由 `releases/v4.1.0.md` 記錄其 immutable Git commit。
- 先證明核心航程完整，再增加新星區、任務或遊戲系統。
- 手機直向畫面及實機流暢度優先於桌面特效數量。
- 不加入分析追蹤、秘密、API key 或不必要後端。
- 任何影響航行方向、時間或抵達動作的修改，必須完成多段航線實機驗收。

## 依賴及授權

- Three.js `0.185.1`，由 jsDelivr 以固定版本載入；首次成功在線載入後可保存同一版本作 offline fallback。
- 星體紋理、雲層、星雲及聲音均於瀏覽器程序化生成；沒有內嵌第三方圖片或音訊資產。
- 本專案目前未授予開源授權；除非擁有人另行批准，保留所有權利。
