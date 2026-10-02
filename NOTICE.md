# 资源与许可说明

- Gatsby 代码和文档：MIT，见 `LICENSE`。
- `src/data/seed.json`、`content/books/sources/*.json`：本项目原创教学示例，MIT；不包含个人歌曲词书或影视字幕摘录。
- `public/gatsby-logo.svg`、`public/gatsby-scene.svg`、`public/gatsby.ico`：由 `scripts/prepare_art.py` 从原创几何图形生成，MIT，无需外部原图。
- Nunito Variable：通过 `@fontsource-variable/nunito` 打包，字体采用 OFL-1.1；全文见 `public/Nunito-OFL.txt`，发行文件保留该文件。
- React、React DOM、Lucide：各依赖采用其原始许可（MIT / ISC），不因本项目 MIT 许可而改变。
- Windows EXE 内含 CPython，按 PSF 及其附带第三方条款分发；打包时保留构建解释器的完整 `LICENSE.txt`。PyInstaller 许可包含 bootloader 例外及运行时钩子条款，也随包保留。

个人导入内容不属于软件分发示例，使用者应自行保存来源和授权信息。软件许可不授予第三方歌词、字幕、图片或其他作品的使用权。

发布网页或 EXE 时保留本文件、项目 LICENSE、字体许可和依赖版权声明。Vite 默认保留第三方打包声明；不要在额外压缩步骤中删除许可注释。

网页构建会输出 `LICENSE`、`NOTICE.md`、`THIRD-PARTY-LICENSES.txt` 和 `Nunito-OFL.txt`。EXE 同时嵌入许可，并在 `dist/licenses/` 提供可阅读的副本；分发 EXE 时一并提供该目录。
