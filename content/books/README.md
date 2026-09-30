# 公开示例与个人词书

`manifest.json` 和 `sources/` 仅保存可公开分发的原创示例，随仓库提供。克隆后即可检查和构建，不依赖特定电脑路径。

```bash
npm run check-books
npm run sync-books
npm run sync-books -- --replace-existing
```

检查不写文件。同步校验 ID、元数据、释义和重复词条，已有种子默认保留；明确覆盖才更新已有卡片。同步后重新构建。

个人歌曲词书、Markdown、CSV 和学习 JSON 备份保存在仓库之外，例如自己的 Obsidian 内容库。CSV / Markdown 使用「内容库 → 导入内容」；JSON 备份使用「学习记录 → 数据管理」合并恢复。

仓库内临时个人文件只能放在被忽略的 `.private/`，不要放到 `sources/`、`public/` 或 `src/data/seed.json`。忽略规则不能保护已被 Git 跟踪的文件。

如需检查个人源，可自行创建本地清单和 seed，并指定独立输出：

```bash
node scripts/sync-books.mjs --manifest .private/manifest.json --seed .private/seed.json --source-dir .private/sources --check
```

该输出不会进入公开网站。个人学习优先使用界面导入；不要将个人词书用 `--discover --apply` 加入公开清单。
