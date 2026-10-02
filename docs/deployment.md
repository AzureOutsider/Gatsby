# 网站部署

Gatsby 是 Vite 前端。推荐 Node.js 22 LTS，执行 `npm ci`、`npm run build`，发布目录为 `web-dist`。

## GitHub Pages

1. Fork 仓库，或使用自己的 GitHub 仓库。
2. 在 Settings → Pages → Build and deployment 将 Source 设为 **GitHub Actions**。
3. Actions 中选择 **Deploy GitHub Pages**，点击 Run workflow，选择 `main`。
4. 访问 deployment 输出的网址，通常为 `https://<用户名>.github.io/<仓库名>/`。

Pages 工作流只手动触发，避免未启用 Pages 时提交产生部署失败；更新后再次运行即可。需要自动部署时可在工作流的 `on` 中添加 `push: { branches: [main] }`。

Vite 使用 `base: "./"`，入口、脚本、样式、字体和图片支持仓库子路径。导航不修改 URL，无需 `404.html` 路由回退；页面状态不作为可分享的深链接保存。

## Netlify 与 Vercel

导入仓库，生产分支选 `main`，Node.js 版本为 **22.x**。`netlify.toml` 和 `vercel.json` 已指定 `npm run build` 和 `web-dist`。Vercel 选择 Vite，无需服务器函数、数据库或环境密钥。

## 自行托管

将 `web-dist` 的内容发布到 Nginx、Caddy 或其他静态 HTTP 服务。本机生产预览使用：

```bash
npm run build
npm run preview
```

不要以 `file://` 方式双击 `index.html`，模块与存储行为需要 HTTP。`server.py`、Vite dev/preview 按本机用途配置，公网部署使用正式静态托管，推荐 HTTPS。

## 检查与数据

- 入口、字体、Logo 和背景没有 404，控制台无资源错误。
- 用独立测试浏览器检查导入、翻卡、拼写、刷新继续及 JSON 备份恢复。
- 试听并选择设备可用的声音；在线声音受浏览器、系统和网络影响。
- 迁移域名、协议、浏览器或端口前导出 JSON；静态站点不保存服务器端学习数据。
- 同一源的部署路径共享 `localStorage`，不同实例建议使用独立域名或子域名。

## Windows EXE

Windows 安装 Node.js 22 LTS 和 Python 3.10+，运行 `build_exe.ps1`，脚本创建 `.venv-build` 并按 `requirements-build.txt` 安装 PyInstaller，生成 `dist/Gatsby.exe`。

在 Windows 自行打包，不提供跨平台生成 EXE 的承诺。首次安装工具需要网络，静态部署不需要 PyInstaller。发布 EXE 时注明平台与版本，保留许可证。仓库没有预置 EXE 下载文件。

EXE 会嵌入许可，`dist/licenses/` 也提供可阅读副本；分发时将该目录与 `Gatsby.exe` 一起打包。
