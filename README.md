# xiaomifeng-v2.2

## 后台原型

源码位于 `admin-demo-code/xiaomifeng-2-2/`。设计参数集中在 `design/system.json`，构建会先执行设计配置校验；`npm run export:html` 生成可离线打开的 `dist/admin-share.html`。

## 原型查看器

查看器位于 `prototype-viewer/`。外壳使用 `shell/` 中的 React 源码，预构建脚本保存在 `assets/viewer.js`；查看器日常打开无需 Node。维护外壳时在 `prototype-viewer/shell/` 运行 `npm ci --include=dev && npm run build`。手动 HTML 与说明源文件放在 `pages/`、`desc/*.md`，外部发布内容放在 `.published/`。更新后运行 `bash prototype-viewer/update.sh`，生成 `share/prototype-viewer.html`。
