# 参与 Gatsby

使用 Node.js 22.12+（22.x）或 24+，从 `main` 创建功能分支，执行 `npm ci` 和 `npm run dev`。提交前运行：

```bash
npm test
npm run check-books
npm run check-public
npm run check-contrast
npm run build
python -m unittest discover -s tests -p "test_*.py"
```

Python 测试需先构建；纯前端开发不需要 Python。说明变更解决的问题和验证结果，行为变更应有相应测试。CI 在 Linux 和 Windows 上检查。

使用 GitHub Settings → Emails 提供的 noreply 邮箱提交，避免公开个人邮箱。不要提交密钥、`.env`、个人词书、学习备份、诊断报告、依赖或构建产物。示例须有明确公开许可，优先使用原创例句。

项目采用 MIT 许可，贡献代码和原创示例将按同一许可分发。第三方资源须保留许可和来源，见 `NOTICE.md`。
