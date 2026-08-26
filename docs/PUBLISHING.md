# GitHub 發佈與靜態部署

## 1. Repository 目標

- GitHub 帳戶：`kenchan-pixel`
- Repository：`stellar-wrap`
- 建議初始可見度：Private
- 預設分支：`main`
- 初始版本：V4.0 Stable

本文件描述如何把已準備好的 Git 歷史發佈至 GitHub。只有在 GitHub 頁面可讀到提交及檔案後，才可記錄為「遠端 repo 已建立」。

## 2. 使用完整 Git 資料夾發佈

適合使用 GitHub Desktop：

1. 解壓完整 repository 封裝。
2. 在 GitHub Desktop 選擇 **File → Add local repository**。
3. 選擇包含 `.git`、`index.html` 及 `README.md` 的 `stellar-wrap` 資料夾。
4. 選擇 **Publish repository**。
5. 名稱保持 `stellar-wrap`，Owner 選 `kenchan-pixel`，勾選 Private。
6. 發佈後核實 `main` 有完整提交歷史及 GitHub Actions 驗證結果。

## 3. 使用 Git bundle 發佈

```bash
git clone stellar-wrap-git-history.bundle stellar-wrap
cd stellar-wrap
git remote add origin https://github.com/kenchan-pixel/stellar-wrap.git
git push -u origin main
```

使用這個方法前，先在 GitHub 建立一個**完全空白**的 private repository；不要初始化 README、`.gitignore` 或 licence。

## 4. 發佈後驗證

- [ ] Repository URL 是 `https://github.com/kenchan-pixel/stellar-wrap`
- [ ] Default branch 是 `main`
- [ ] V4.0 三個初始提交及其後文件提交完整存在
- [ ] `index.html` 與 `releases/v4.0-stable.html` 完全相同
- [ ] `npm run check` 通過
- [ ] GitHub Actions `Validate stable simulator` 通過
- [ ] Repository 保持 private，除非擁有人批准公開
- [ ] 沒有 token、私密資料或不明授權資產

## 5. 靜態部署候選

現階段應用沒有後端，可從 repository 根目錄直接作靜態部署：

- GitHub Pages
- Cloudflare Pages
- Vercel
- 一般 HTTPS 靜態空間

部署入口為 `index.html`，不需要 build command。首次載入 Three.js 仍需要連線到固定版本 CDN；完整離線支援屬 V4.1 候選工作。

## 6. 發佈 Gate

正式對外提供前需人手核實：

1. iPhone Safari 直向操作及安全區。
2. SOL → ORION 最長多段航線。
3. 曲速進入、巡航、脫離及連續抵達。
4. 聲音首次互動解鎖、靜音及背景切換。
5. 自動畫質下的 FPS、DPR、熱力與 10 分鐘穩定性。
6. 公開授權與名稱是否已批准。
