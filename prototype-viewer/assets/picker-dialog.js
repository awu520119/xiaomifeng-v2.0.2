/* picker-dialog.js —— 弹窗单选 / 多选工厂。
 *
 * 把 templates/pc/list.html 和 templates/pc/form.html 里重复 60+ 行的
 * 「公司弹窗」「门店弹窗」抽到一个函数工厂：
 *   - createPicker({ title, multi, source, display, valueField, onConfirm })
 *   - 返回 { dialog, filtered, open, close, confirm } 让业务页 setup 里直接用
 *
 * source 由业务页提供（一般写在 setup 里的 ref 假数据，或者接口数据）。
 *
 * 用法（list.html 简化为）：
 *   const companyPicker = ScaffoldPicker.createPicker({
 *     title: '选择公司',
 *     multi: false,
 *     source: allCompanies.value,  // 业务页 setup 里 ref([...]) 的源数据
 *     onConfirm(items) { query.companyId = items[0].id; query.companyName = items[0].name; },
 *   });
 *   const openCompanyDialog = () => companyPicker.open(query.companyId);
 *   const confirmCompany = () => companyPicker.confirm();
 *
 * 模板必须显式包含 picker-list / picker-row 样式（业务页 <style> 提供）。
 *
 * 注意：工厂仅返回数据 + 控制函数；渲染模板 `<el-dialog>` / `<el-input>` 等仍由 caller
 * 写在页面里（保持 Vue template 静态可分析）。这里只提供「数据 + 控制流」。
 */
(function () {
  'use strict';

  /**
   * @param {object} opts
   * @param {string} opts.title         dialog title
   * @param {boolean} opts.multi        true=多选 / false=单选
   * @param {Array}  opts.source        数据源 [{id, name, ...}]
   * @param {function} opts.display     (item) => string；默认取 .name
   * @param {string}  [opts.valueField='id']
   * @param {function(items, refs)} opts.onConfirm  确认回调；items=当前选中，refs=query form 引用
   * @param {object}  [opts.refs]       透传给 onConfirm 的引用对象（一般是 reactive(query)）
   * @returns {{
   *   dialog: import('vue').UnwrapNestedRefs<{visible: boolean, keyword: string, selected: any}>,
   *   filtered: import('vue').ComputedRef<Array>,
   *   open: (initial?: any) => void,
   *   clear: () => void,
   *   confirm: () => void,
   * }}
   */
  function createPicker(opts) {
    if (!opts || !opts.title) throw new Error('createPicker: title required');
    if (!Array.isArray(opts.source)) throw new Error('createPicker: source must be Array');
    if (typeof opts.onConfirm !== 'function') throw new Error('createPicker: onConfirm required');

    const display = opts.display || ((it) => it.name);
    const valueField = opts.valueField || 'id';

    // 不在 ES module 里，用 Vue 全局
    const Vue = window.Vue;
    if (!Vue) throw new Error('createPicker: window.Vue not found, please load vue.global.prod.js first');

    const dialog = Vue.reactive({ visible: false, keyword: '', selected: opts.multi ? [] : null });
    const filtered = Vue.computed(() => {
      const kw = dialog.keyword.trim().toLowerCase();
      if (!kw) return opts.source;
      return opts.source.filter((it) => String(display(it)).toLowerCase().includes(kw));
    });

    function open(initial) {
      if (opts.multi) {
        dialog.selected = Array.isArray(initial) ? [...initial] : [];
      } else {
        dialog.selected = initial == null ? null : initial;
      }
      dialog.keyword = '';
      dialog.visible = true;
    }

    function clear() {
      dialog.selected = opts.multi ? [] : null;
    }

    function pick(item) {
      if (opts.multi) {
        const idx = dialog.selected.indexOf(item[valueField]);
        if (idx >= 0) dialog.selected.splice(idx, 1);
        else dialog.selected.push(item[valueField]);
      } else {
        dialog.selected = item[valueField];
      }
    }

    function confirm() {
      const ids = opts.multi ? [...dialog.selected] : (dialog.selected == null ? [] : [dialog.selected]);
      const items = ids
        .map((id) => opts.source.find((it) => it[valueField] === id))
        .filter(Boolean);
      opts.onConfirm(items, opts.refs);
      dialog.visible = false;
    }

    return {
      dialog,
      filtered,
      open,
      clear,
      pick,
      confirm,
      // 仅供模板渲染时拿的 helper
      isChecked: (item) => opts.multi
        ? dialog.selected.includes(item[valueField])
        : dialog.selected === item[valueField],
    };
  }

  window.ScaffoldPicker = Object.freeze({ createPicker });
})();