# xiaomifeng-v2.2

## 后台原型

源码位于 `admin-demo-code/xiaomifeng-2-2/`。设计配置 `design/system.json` 使用版本 3，公共主题由 `src/design/system.tsx` 映射；`npm run export:html` 校验配置、构建并生成 `dist/admin-share.html`。工具版本为 5。

`prototype-pages.json` 登记当前主题管理和运维管理页面及说明。业务源码和 PRD 继续在后台项目维护；发布后运行 `npm run export:html` 可重新生成独立分享文件。

## 原型查看器

查看器位于 `prototype-viewer/`，工具版本为 5。手动内容保存在 `nav.manual.json`、`pages/`、`desc/*.md`，外部发布内容保存在 `.published/`。日常运行 `bash prototype-viewer/update.sh`，同步、校验并生成离线 `share/prototype-viewer.html`。脚本优先使用项目 `.venv`，也可使用已安装依赖的 Python 环境；运行 `python3 scripts/doctor.py --browser` 检查发布环境。

查看器使用预构建的 `assets/viewer.js`，日常无需 Node。仓库中旧 `shell/` 和 `react-app/` 保留为历史源码，不能代表当前查看器工具版本；需要修改外壳时应以当前 prototype-viewer 技能包中的源码为基准。
