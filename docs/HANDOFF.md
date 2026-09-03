# 開發與 AI Agent 交接

## 1. Goal

持續發展一個手機優先、沉浸式、流暢的星際旅行模擬器。使用者可由星圖選站，系統按實際方向與距離規劃多段曲速旅程，並在每個目的地呈現獨特 3D 天文景觀。長期目標是完整星際探索體驗，而非單純曲速特效展示。

## 2. Source of Truth 次序

開始工作前必須按次序閱讀：

1. `docs/PRD.md`
2. `docs/DECISIONS.md`
3. `docs/FLIGHT_MODEL.md`
4. `docs/STAR_MAP.md`
5. `docs/PERFORMANCE.md`
6. `docs/TESTING.md`
7. `docs/ROADMAP.md`
8. 現行 `index.html`
9. `releases/v4.0-stable.html` 只作回歸比較，不可修改

最新對話或單一 issue 只視為增量要求，不能自動覆蓋以上已批准基線。

## 3. Current Baseline

- 目前 release baseline：V4.1.0（owner 已完成實機驗收；見 `releases/v4.1.0.md`）
- V4.1.0 runtime baseline commit：`e852096e65194543b97355efc48894339d550be7`
- Active app：`index.html`；後續 client modules 透過 branch／PR 疊加演進
- 不可覆寫回歸快照：`releases/v4.0-stable.html`
- V4.0 regression SHA-256：`8fe7850e0d3c3d8f782571c429a7e3293b86ef2dc119cbbd86c9852f7c10a6a5`
- Three.js：`0.185.1`
- 架構：靜態無後端；單一主要 WebGL renderer／scene，加 bounded client presentation／feature modules
- 星區：8
- 單段上限：6.0 LY
- 主要目標：手機 60 Hz 流暢度優先

## 4. 不可破壞項目

- 星圖選站及多段自動規劃
- 按 3D 座標實際方向轉向
- 中途站先飛掠，再轉向下一段
- 距離相關曲速時間
- 明顯的曲速進入、巡航及脫離效果
- 脫離後連續減速、定速接近及最後煞停
- 8 個目的地獨特 3D 景觀
- 仿真地球的海陸、雲、大氣及夜光
- 動態聲音
- 到站探索
- 2.5D 星圖航段資訊
- 自動畫質及診斷 HUD
- 手機安全區與不遮擋中央視野

## 5. 建議工作方式

- 一個 task 對應一個 branch／worktree／PR。
- 不直接修改 `main`。
- 先描述使用效果，再處理內部技術。
- 重構與功能改變分開 PR。
- 先加入或更新測試，再修改核心航行邏輯。
- 每次改動均執行 `npm run check`。
- 視覺改動至少測試一條直航及一條最長多段航線。
- 擁有人負責最後 merge；AI 不應自行宣稱已批准產品決定。

## 6. Pull Request 必須交付

```text
Goal
Background / SOT read
Changed user behaviour
Files changed
Regression risks
Automated checks
Manual routes and devices tested
Screenshots / video where relevant
Items requiring owner confirmation
```

## 7. Known Risks

- `index.html` 核心仍然較大，修改容易產生跨區塊回歸。
- WebGL 視覺不能只靠 DOM／語法測試證明。
- CDN 第一次成功載入仍需要網絡；prepared offline shell 只支援成功在線啟動後的後續離線重開。
- iOS Safari 的音訊、DPR、熱力及 WebGL 行為需實機核實。
- 程序化材質在不同 GPU／色彩管理下可能有差異。
- 大幅新增透明粒子容易增加 fill-rate，令手機掉幀。
- 新星區若只考慮單一抵達方向，其他路線可能出現不自然構圖。

## 8. Next Recommended Task

優先依 `docs/ROADMAP.md` 的已批准演進次序執行：**Cinematic / Capture Quality → Landing / Modes → Frontier Fiction**。在目前 Cinematic Quality 階段，先補強目的地、曲速 corridor、approach／arrival 構圖及攝影價值；避免把額外 scanner／checklist 當成預設下一步。

任何新切片仍需以 current branch／PR review、CI、實際 source evidence 作優先級 gate；若有 P0／P1 或實際 regression，先修 blocker，唔應被 roadmap feature 覆蓋。

## 9. Release 原則

- Patch：錯誤修正及不改產品範圍的小改良，例如 `v4.1.1`
- Minor：加入相容的新功能，例如後續 `v4.x`
- Major：探索層或架構／體驗有重大改變，例如 `v5.0.0`
- 每個 release 必須有固定 HTML 快照、CHANGELOG、hash、測試證據及可回復版本
