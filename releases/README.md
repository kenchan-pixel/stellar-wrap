# Stable release snapshots

本資料夾只保存已接受版本的不可覆寫 HTML 快照。

發佈規則：

1. 新版本通過自動及人手驗收後，複製 active `index.html` 為新的版本檔案。
2. 不可修改或重用既有版本檔名。
3. 更新 `CHANGELOG.md` 及 `docs/RELEASE_INVENTORY.md` 的 bytes／SHA-256。
4. 執行 `npm run check` 並保存實機驗收證據。
5. `index.html` 可進入下一開發版本；既有 release snapshot 必須保持不變。
