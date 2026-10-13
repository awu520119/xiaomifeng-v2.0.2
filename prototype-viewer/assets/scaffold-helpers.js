/* scaffold-helpers.js —— 模板 / 业务页常用的小工具集合。
 *
 * 现在导出：
 *   - ScaffoldHelpers.stamp()              → 当前时间戳 YYYY-MM-DD HH:mm:ss
 *   - ScaffoldHelpers.datePickerPopperOptions  → daterange 在抽屉/overflow 容器内的 popper 配置
 *   - ScaffoldHelpers.registerIcons(app, [...names], EP)  → 批量 app.component('X', X) 注册图标
 *
 * 用法（务必在 element-plus / icons-vue 之后引入）：
 *   <script src="../assets/element-plus.full.min.js"></script>
 *   <script src="../assets/icons-vue.iife.min.js"></script>
 *   <script src="../assets/scaffold-helpers.js"></script>
 *   <script>
 *     const app = createApp({ ... });
 *     app.use(ElementPlus);
 *     const { stamp, datePickerPopperOptions, registerIcons } = window.ScaffoldHelpers;
 *     registerIcons(app, ['Plus', 'Upload', 'Refresh'], ElementPlusIconsVue);
 *   </script>
 */
(function () {
  'use strict';

  /**
   * 生成 ``YYYY-MM-DD HH:mm:ss`` 格式的当前时间戳（精确到秒）。
   * 模板里「最后保存：xx」「数据更新于：xx」都用它，原来各自 copy 一份。
   */
  function stamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  /**
   * 抽屉 / overflow:hidden 容器内 daterange 的 popper 配置。
   * 解决「弹层被压在 480px 抽屉里错位」的问题。
   * 见 templates/pc/list.html / templates/pc/dashboard.html 的同类注释。
   */
  const datePickerPopperOptions = {
    placement: 'bottom-end',
    strategy: 'fixed',
    modifiers: [
      { name: 'preventOverflow', options: { boundary: typeof document !== 'undefined' ? document.body : null, padding: 8 } },
    ],
  };

  /**
   * 把 ElementPlusIconsVue 里的几个图标一次性注册到 app，省去模板里写 6~7 行
   * ``app.component('Plus', Plus)``。移动端 Vant 不需要这套。
   *
   * @param {object} app   Vue app 实例
   * @param {string[]} names  要注册的图标名（与 icons-vue 内置 key 对应）
   * @param {object} EP     ElementPlusIconsVue 全局
   */
  function registerIcons(app, names, EP) {
    if (!app || !EP) return;
    names.forEach((name) => {
      const icon = EP[name];
      if (icon && !app._context.components[name]) {
        app.component(name, icon);
      }
    });
  }

  window.ScaffoldHelpers = Object.freeze({
    stamp,
    datePickerPopperOptions,
    registerIcons,
  });
})();
