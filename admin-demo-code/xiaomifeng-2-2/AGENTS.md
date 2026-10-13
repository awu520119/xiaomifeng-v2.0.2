# 后台 Demo 项目约定

React + TypeScript + Vite + Ant Design；使用 Hash 路由和本地 Mock，可构建为静态文件。

- 开发前读取实际路由、`src/pages/`、`src/mock/` 和 `src/theme.ts`，以代码现状为准。
- 页面放在 `src/pages/`，Mock 放在 `src/mock/`，稳定设计值放在 `src/theme.ts`。
- 不连接真实后端，不增加演示无关的依赖和功能。
- 完成后运行 `npm run build`（包含类型检查），并更新下方进度。
- 配套查看器发布以 `prototype-pages.json` 为唯一清单：页面、PRD、Hash 路由和目录信息只在此维护；执行 `npm run publish:viewer` 将内容发布到目标查看器的受控 `.published/` 目录。

## 当前进度

- 已提供订单查询、列表、详情抽屉和取消确认示例。
