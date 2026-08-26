# Gatsby · 你的英语学习室

一个以桌面阅读和练习为主的英语学习平台。导入自己的单词、歌曲笔记、对白和文章，通过翻卡、拼写与语境填空学习，并保存复习进度。

**Gatsby 是应用名称，技术栈是 React + TypeScript + Vite，不使用 Gatsby 框架。** 可部署为静态网站，无需数据库或后端账号系统。

![Gatsby 原创夜色书页图形](public/gatsby-scene.svg)

## 快速开始

使用 Node.js 22.12+（22.x）或 24+；推荐 Node.js 22 LTS，仓库提供 `.nvmrc`。

```bash
git clone https://github.com/AzureOutsider/EnglishStudy.git
cd EnglishStudy
npm ci
npm run dev
```

打开 `http://127.0.0.1:5173`。可先练习四本原创示例词书，或在「内容库」导入自己的内容。发音需先在顶部喇叭入口选择并试听英语声音。

## 部署网站

```bash
npm ci
npm run build
```

将 **`web-dist/`** 发布到静态托管服务。网页部署只需要 Node.js，不需要 Python，构建产物不提交到 Git。

| 平台 | 构建命令 | 发布目录 |
| --- | --- | --- |
| Netlify | `npm run build` | `web-dist` |
| Vercel | `npm run build` | `web-dist` |
| GitHub Pages | 自带 Actions 工作流 | `web-dist` |

Netlify、Vercel 配置随仓库提供。GitHub Pages 启用步骤、子路径说明及自行托管示例见 [部署说明](docs/deployment.md)。导航使用应用内部状态，当前无需 SPA 路由重写。

本地检查生产构建运行 `npm run preview`。`dev` 和 `preview` 只监听本机，不作为公网生产服务。

## Windows 本地使用

源码仓库不包含 EXE。在 Windows 安装 Node.js 和 Python 3.10+，自行打包：

```powershell
npm ci
powershell -ExecutionPolicy Bypass -File .\build_exe.ps1
```

脚本使用独立 `.venv-build` 环境与固定版本 PyInstaller，生成 `dist/Gatsby.exe`。双击 EXE 打开 `http://127.0.0.1:8765`，使用 EXE 不需要 Node.js 或 Python；关闭服务窗口即停止服务。

分发自行打包的 EXE 时，同时提供 `dist/licenses/` 中的项目、字体、前端依赖及 Python / PyInstaller 许可。

也可先执行 `npm run build`，再运行 `python server.py`，或在 Windows 双击 `启动学习平台.bat`。Python 服务只用于本机，端口占用时不会自动换端口。

## 功能与使用

- **学习轮次**：选择来源和 5 / 10 / 15 / 20 个单元，到期内容优先；忘记的卡片稍后重现，拼错的单元加入队尾继续练习。
- **进度保存**：轮次、答案状态、队列和复习记录保存在浏览器中，刷新后可继续。
- **内容管理**：导入、编辑、删除、重置进度，实时预览卡片和问题；首页可选择及排序 1–3 本词书。
- **学习记录**：复习统计、七日趋势、薄弱单元、历史轮次、日目标，以及 JSON 备份和恢复。
- **阅读体验**：英文 Nunito 随应用打包，无在线字体请求；学习注释 18px、英语例句 22px、辅助文字至少 14px。

### 内容导入

支持 UTF-8 的 Markdown 列表、CSV、TXT、SRT、VTT、ASS，单个文件最多 5 MB，也可粘贴逐行内容：

```text
linger | 逗留；久久不散 | The scent lingered in the kitchen. | 注意词尾发音
```

预览显示英文、释义、例句、笔记和原始行号，分页不会截断保存内容。缺少英文、重复词条、CSV 引号或字幕时间轴错误会阻止保存；缺少释义、多余列和重复字幕需要确认警告。文件或保存失败会保留输入。

个人词书、歌曲笔记和学习备份保存在本地，使用界面导入。公开仓库仅包含原创示例，不附带个人歌曲词书或影视字幕。只导入自己有权使用的内容。

### 发音

使用浏览器 Web Speech API。按口音筛选、试听后选择主声音、备用声音与 0.5–1.5× 语速，设置包含在 JSON 备份中。

应用与卡片在后台准备声音列表，不生成、下载或预加载音频。主声音缺失、出错或点击后 2 秒内未开始时，尝试一次不同的备用声音；备用也有 2 秒启动预算，并标注实际来源。换卡、切页、连续点击和主动停止会取消旧播放；设置中的试听不自动换声。

声音由浏览器和系统提供，不请求 Free Dictionary。在线声音可能需要网络，本地声音可作为断网备用；设备间声音和音质可能不同，请以试听为准。Web Speech 不可用时，其他学习功能仍可使用。

### 快捷键

`1` 不记得，`2` 记得，`Enter` / `→` 下一张，`R` 再来一次，`P` 发音；拼写框 `Enter` 提交；`Esc` 暂存离开或关闭弹窗；`Ctrl+1–4` 切页，`Ctrl+K` 搜索，`?` 帮助。输入时不会触发字母类全局快捷键。

## 数据与隐私

学习内容、进度和设置保存在浏览器 `localStorage`，没有账号、服务器学习数据库或跨设备同步。项目代码不上传学习记录；在线系统声音可能将待朗读文本交给浏览器的语音服务。

数据属于**同一浏览器、同一源（协议、域名、端口）**。换设备、浏览器、域名或端口需在「学习记录 → 数据管理」导出 JSON，再在新环境恢复。同一域名下的不同路径也共享存储，不同实例建议使用不同域名或子域名。

定期导出备份，尤其在升级和重要编辑前。清理站点数据会丢失本地记录，浏览器内快照不能代替外部备份。读取异常时保留原始数据并提供诊断；重置需要确认，会恢复原创示例并删除当前实例的个人内容和进度。

目前主要支持桌面浏览器，尚未提供完整移动端体验。首次访问网站需要网络；不提供离线网页缓存承诺。

## 开发与检查

```bash
npm test
npm run check-books
npm run check-public
npm run check-contrast
npm run build
python -m unittest discover -s tests -p "test_*.py"
```

Python 测试需先完成构建。GitHub Actions 在 Linux 和 Windows 上执行这些检查。贡献流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

```text
src/                   React 界面、学习状态、导入与发音
content/books/         公开原创示例及同步清单
public/                原创图形、图标和字体许可
scripts/               词书同步、对比度检查、原创素材生成
tests/                 前端、旧版状态和本地服务测试
docs/                  部署、设计、验证及旧版说明
server.py              本机 Python 静态服务
build_exe.ps1          Windows EXE 打包
```

### 示例词书维护

`content/books/manifest.json` 登记公开示例，源文件使用相对路径。`npm run check-books` 只检查；`npm run sync-books` 添加尚未进入种子的词书，已有内容默认不覆盖。确认覆盖时使用 `npm run sync-books -- --replace-existing`，然后重新构建。

只将有明确公开许可的内容登记到清单。个人词书不要同步到受 Git 跟踪的种子目录，见 [词书维护说明](content/books/README.md)。

## 旧版平台

`main` 为 Gatsby；`legacy/english-study` 保留旧版代码，见 [旧版说明](docs/legacy.md)。升级读取旧版存储键并保存快照；已有个人词书不会因公开示例替换而删除。旧版不会自动读取新版进度，跨版本迁移使用 JSON 备份。

## 许可

项目代码、原创示例词书及自有 SVG / ICO 图形采用 [MIT](LICENSE)。Nunito 字体采用 OFL-1.1，全文在 `public/Nunito-OFL.txt`。第三方资源见 [NOTICE.md](NOTICE.md)。用户导入内容不因使用本软件而改变其权利归属。
