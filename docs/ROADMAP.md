# Roadmap｜由曲速展示到星際探索

## 0. 使用規則

本 Roadmap 區分候選、暫定推薦及已批准基線。尚未批准的內容不可直接寫入核心程式或用來重定義產品。

## 已批准基線｜V4.0 Stable

- 8 個固定星區及 2.5D 星圖
- 3D 座標方向、6.0 LY 航段及多段路線
- 完整曲速航行狀態機
- 連續抵達軌跡
- 8 個獨特 3D 天文景觀
- 程序化仿真地球
- 動態聲音
- 中途飛掠及最終到站探索
- 自動畫質及診斷 HUD
- 手機優先、60 Hz 優先

## 已批准演進方向｜Cinematic Quality → Modes → Frontier Fiction

目前自主演進的產品優先次序已收斂為：

1. **Cinematic / Capture Quality**：先推高真實 3D 景觀、航程與到站構圖的觀賞及記錄價值，同時保留手機流暢度；優先 adaptive quality、低成本細節與靜態／攝影時短暫畫質提升，不以永久暴力提高 DPR 作主要方法。
2. **Landing Page + Mode Architecture**：畫質基礎成熟後才加入探索入口；第一版不可只是空殼，必須同時帶至少一個真正有內容的模式／目的地。
3. **Real Space / Frontier Fiction / Gallery**：保留現有寫實天文探索線，新增原創科幻探索線及攝影記錄入口。
4. **Frontier Fiction**：只使用原創名稱、空域、視覺身份與世界觀，可借鑑廣泛科幻 archetype，但不直接重製知名作品場景或資產。

近期功能 weighting：畫質、旅程奇觀、目的地辨識度、攝影／記錄價值、世界擴張優先；額外 checklist／scanner 類任務除非能明顯提升目的地體驗，否則降優先。

---

## V4.1｜穩定化與可維護性

**狀態：暫定推薦**

目標：不改變使用效果，令穩定版更容易維護、測試及部署。

> Draft 驗證中：`autonomous-evolution` 已加入 **WebGL context lost／restore 恢復**，以及一個 **online-first 離線啟動候選**。後者會在首次成功在線載入後快取 active shell 與固定 Three.js `0.185.1`，之後斷網重新開啟時使用最近成功快取；它不代表完整 PWA／安裝體驗已獲批准。

候選工作：

1. 把星區資料、路線規劃、抵達曲線及狀態機逐步拆成模組。
2. 加入 route planner 與 arrival profile 單元測試。
3. 加入手機尺寸自動截圖及關鍵畫面回歸基線。
4. 研究把 Three.js 固定版本放入 repo，支援真正首次離線啟動。
5. 加入 PWA manifest、App Icon 與安裝提示；先以現有離線快取候選驗證 online→offline→online 可靠性。
6. 建立實機效能記錄格式及已驗證裝置清單。
7. 加入 WebGL context lost／restore 處理。
8. 加入簡單的錯誤畫面及不支援 WebGL 的靜態後備。

### V4.1 離線恢復垂直切片｜目前 Draft

- Service Worker 只快取 active shell、候選 client modules 及固定 Three.js `0.185.1`。
- 在線時 navigation／同源 runtime 使用 network-first，成功後刷新快取；離線才回退到最近成功版本。
- 固定 Three.js 依賴使用 cache-first，避免每次重開都依賴 CDN。
- 控制面板顯示離線準備狀態；約 9 秒仍未啟動時，loading 畫面轉成可操作的 reload 後備。
- 不加後端、帳戶、分析追蹤、使用者資料儲存、render-loop polling 或 flight timing 改動。
- 第一次使用仍需要網絡；真正首次離線啟動／完整安裝 PWA 仍屬後續工作。

**驗證目的：** 先確認手機在一次成功在線載入後，斷網重開仍可完成基本星圖與航程，而恢復網絡後又能取得最新部署，不被舊快取永久鎖死。

完整驗收見 [OFFLINE.md](OFFLINE.md)。

**完成標準：** V4.0 全部核心回歸通過，穩定快照 hash 不變；離線候選的實機 online→offline→online 仍屬補充裝置證據，不應阻塞與其無關的自主演進。

---

## V5｜探索層

**狀態：候選方案；產品方向一致**

> `autonomous-evolution` 已累積旅行日誌、目的地探索、Star Atlas、Arrival Debrief、攝影模式等候選能力。後續新增內容不再以「每站再加一個 scanner」為預設；優先令既有目的地更值得觀看、重遊與記錄。

目標：令「到站」由純觀賞畫面變成有身份、有記錄價值的探索體驗，但不加入戰鬥或複雜經濟。

候選功能：

- 精心設計而非大量重複的觀測／探索內容
- 發現卡及簡短世界資料
- 已到訪星區與已發現項目圖鑑
- 旅程日誌：起點、路線、距離、時間、目的地、發現
- 到站航程摘要及下一段探索／導航交接
- 星區攝影模式、乾淨截圖及高畫質留影
- 可選「快速飛掠」或「深入探索」
- 輕量成就，例如完成全星圖環遊

**限制：** 發現內容必須增強地方特色，不可變成大量重複隨機文字；探索 UI 不應重新遮擋主要 3D 景觀。

### V5 第一個垂直切片｜目前 Draft

**LUNA：月環基地觀測任務**

- 只在完整抵達 LUNA 並進入最終探索時出現。
- 三個固定觀測點：近距撞擊盆地、遠方地球視差、月球軌道環站。
- 玩家仍使用原有拖動／自動環繞觀景；觀測任務只提供方向提示及完成標記，不接管核心相機。
- 三個觀測點全部完成後，解鎖一個本機發現紀錄「地月視差層」。
- 進度只存 `localStorage`，不加後端、不加網絡請求、不進入 60 Hz render loop。

**驗證目的：** 先確認「到站後有明確事情做」是否比純自由觀景更有探索感；此類 checklist 任務現已降優先，除非能明顯提升地點特色。

### V5 第二個垂直切片｜目前 Draft

**Destination Photo Mode + Capture Quality：乾淨觀景與高畫質留影**

- 所有八個星區的最終到站探索都可進入，不在中途飛掠、航行或 WebGL context lost 時出現。
- 進入後暫時隱藏 HUD、航行進度、控制面板、探索卡及診斷 HUD，保留原有 3D 場景與拖動觀景。
- 「高畫質留影」會短暫使用既有 High renderer tier，等待至少兩個已渲染畫面後，再從實際高 DPR WebGL backing buffer 產生本機 PNG。
- PNG 完成、失敗或安全狀態中止後恢復留影前的畫質模式；不把整段航程永久推到 High。
- 不保存額外偏好、不寫新的 `localStorage`、不傳送圖片、不加入後端、第二個 renderer 或額外網絡請求。
- 若恢復航行或 WebGL context lost，模式安全退出，避免 UI 與模擬狀態脫節。

**驗證目的：** 令「抵達值得留下影像」成為真實產品價值，而不是只把目前低／標準 DPR 畫面原樣存檔。真 production Chromium 必須證明 backing buffer 實際升級、PNG 使用提升後尺寸及原畫質可靠恢復；詳細合約見 [CAPTURE_QUALITY.md](CAPTURE_QUALITY.md)。

### V5 第三個垂直切片｜目前 Draft

**Arrival Debrief：到站航程摘要與下一步交接**

- 只由旅行日誌已驗證的「真正完成最終目的地」事件觸發；中途飛掠及中止航程不會出現。
- 在原有到站探索卡內顯示目的地、航段數、完整路線、總距離及活躍航行時間。
- 提供「繼續探索」及「下一目的地」兩個直接下一步；後者只打開現有星圖，不建立第二套導航邏輯。
- WebGL context lost 時收起；零 polling、零 render-loop 工作、零新持久儲存、零 backend／network request。
- 加入既有 Service Worker shell cache，保持已準備離線 session 的候選功能完整。

**驗證目的：** 確認長途多段航程完成後有清楚收結及下一步，是否比直接停在到站卡更有旅程完成感，同時不令手機探索介面變得擠迫。

詳細驗收見 [ARRIVAL_DEBRIEF.md](ARRIVAL_DEBRIEF.md)。

---

## V5.5｜Cinematic High-tier Quality Pass

**狀態：已批准演進方向；分垂直切片執行**

目標：在不破壞 60 Hz 優先原則下，提高 High tier 與攝影狀態的真實 3D visual ceiling。

優先項目：

- 程序化行星／恆星材質解析度與表面細節
- 大氣、halo、星環、站體 silhouette 與遠景層次
- 星場深度、曲速 corridor 與 approach／arrival 構圖
- Photo/Capture Boost 的靜態畫質，而非整程永久最高負載
- 以 bounded geometry/material reuse、adaptive quality、有限粒子與 GPU-efficient 手法控制成本

**不應做：** 只把 DPR 無上限推高、加入大型 post-processing dependency、改慢模擬時間換畫質、或移除已批准特效換 FPS。

**完成訊號：** 每一個切片都要有真 Browser 畫面證據及性能敏感程式檢查；實機長時間熱力／frame pacing 保留為補充驗證。

---

## V6｜Landing Page、模式架構與擴展星圖

**狀態：方向已批准；實作需與真內容綁定**

目標：由單一 Real Space 體驗擴展成有清楚入口及世界選擇的探索平台，同時保持現有航行體驗完整。

第一版目標入口：

- **Continue Journey**：直接返回最近進度／目前旅程
- **Real Space**：現有寫實／天文探索線
- **Frontier Fiction**：原創科幻探索線
- **Gallery / Captures**：旅程與攝影記錄

Landing Page 不可先做空殼；首個實作切片必須同時提供至少一個有實際 3D 景觀、抵達與探索價值的 Frontier Fiction 目的地。

星圖後續候選：

- 20–40 個精心設計星區，分成數個區域；不以數量取代品質
- 同一目的地可有最短、最安全、最多景觀等路線
- 星際風暴、塵海、引力井等航路特性
- 星門、補給站及觀測站形成不同網絡角色
- 航程預覽顯示景觀、時間及風險
- 長途旅程可保存並稍後繼續

**先決條件：** Cinematic High-tier Quality Pass 有明顯成果；手機入口不增加無價值點擊層；模式資料與現有 Real Space route authority 可清楚分界。

---

## V7｜Frontier Fiction 原創科幻探索

**狀態：方向已批准；內容逐站建立**

目標：加入高觀賞性、具自身世界觀的科幻空域，而不是重製知名作品場景。

首批 archetype 優先：

- 巨構／環形人工棲息地
- 黑洞或其他極端天體前線觀測站
- 工業小行星帶／氣體巨星採集區
- 古文明深空門廊／遺跡

每站要求：

- 原創名稱、空域、視覺身份、世界資料與資產
- 有自己旅程氣氛、approach／arrival vista、探索價值與攝影構圖
- 不直接使用受版權／商標保護作品的地名、角色、標誌或可辨識場景複製
- 不一次大量建立低細節地點

可後續包括：

- 輕量研究任務
- 航行紀錄與可分享旅程
- 動態宇宙事件
- 程序生成作輔助，而非取代人工設計地標
- 敘事線索及跨星區發現鏈

戰鬥、多人及重型資源管理仍不屬預設方向，除非產品目標明確更改。

---

## 不應優先的工作

- 只增加更多 bloom、粒子或鏡頭震動而無景觀層次提升
- 在沒有性能證據前追求永久 4K／120 fps
- 一次把單檔改寫成大型 React／遊戲引擎專案
- 在探索核心未完成前加入登入、後端及雲端同步
- 大量生成外觀相似的星球或低細節科幻地點
- 駕駛艙按鈕／scanner checklist 堆疊而遮擋宇宙視野
- 先做空 Landing Page，再等待內容日後補上
- 直接重製知名科幻 IP 的場景、名稱或標誌性資產

## 當前最建議下一步

1. **Cinematic High-tier Quality Pass**：以一個最能顯示差距的既有目的地做真 3D 畫質升級，優先表面／大氣／遠景／arrival composition，並以 390×844、360×800 真 Browser 截圖與現有性能界線驗證。
2. **Capture Quality 穩定性延伸**：在 High tier 本身提升後，重新驗證 Photo/Capture Boost 的 PNG 解像度、恢復原畫質及短暫 GPU 成本，不把整段航程鎖在 High。
3. **Landing Page + Frontier Fiction 首站一併實作**：只在至少一個原創科幻目的地已可真正觀看／抵達／探索時加入入口層。
4. **Gallery / Captures**：利用現有旅行日誌與本機影像能力逐步形成值得重看的記錄面，而不是先加帳戶／雲端。
5. V4.1 offline／實機熱力／VoiceOver 等裝置驗證持續作補充證據及風險觀察，不因未有人手測試而停止與其無關的自主產品演進。
