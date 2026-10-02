# 旧版 English Study

`legacy/english-study` 保留原生 JavaScript 平台，`main` 使用 React + TypeScript + Vite。旧版历史示例也替换为原创示例。

在独立目录运行旧版，避免覆盖正在使用的 Gatsby：

```bash
git clone --branch legacy/english-study --single-branch https://github.com/AzureOutsider/EnglishStudy.git EnglishStudy-legacy
cd EnglishStudy-legacy
python server.py
```

打开本机服务地址。两版在相同地址使用时共享旧存储键；新版读取旧键时保存快照，不覆盖旧键。旧版不会自动看到新版进度，跨版本先导出 JSON，再在目标版本导入。

重写前私人词书和旧历史由维护者保存于仓库外，不随公开仓库分发。
