# 后台 Demo 项目说明

## 技术栈

React + TypeScript + Vite + Ant Design。项目使用 Hash 路由和本地 Mock 数据，可构建为纯静态文件。

## 开发前检查

先阅读 `src/App.tsx`、`src/pages/`、`src/mock/`、`src/theme.ts` 和实际路由。文档可能落后于代码，以代码现状为准。

## 常用命令

```bash
npm run dev
npm run check
npm run build
npm run preview
```

## 开发约定

- 优先使用 Ant Design 和 `@ant-design/icons`。
- 页面放在 `src/pages/`，Mock 数据放在 `src/mock/`。
- 稳定的设计值放在 `src/theme.ts`，页面特殊样式放在有作用域的页面类下。
- 默认不连接真实后端，不增加与演示无关的依赖和功能。
- 有实质进度后更新下方记录。

## 当前进度

- 已提供无业务侧栏的订单列表、“新增推广方”右抽屉和“线下对公结算详情”。
- 查询、重置、标签筛选、分页、表单校验、提交反馈、取消订单确认与页面返回均可交互。
- 构建产物由 `prototype-viewer/pages/*.html` 跳转加载，供三栏查看器离线展示。
- 页面视觉与内容已按 `xiaomifeng-share.html` 校准：64px 筛选卡、56px 列表工具栏、720px 新增推广方抽屉，以及带蓝色账单摘要区和 9 条订单明细的线下对公结算详情。
