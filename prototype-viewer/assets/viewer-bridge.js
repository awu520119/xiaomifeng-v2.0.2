/*!
 * viewer-bridge.js —— 由父级 viewer 注入到 iframe 内的全局短 API 桥接。
 *
 * 背景：file:// 协议下浏览器把每个本地文件视作独立 null origin，跨 frame 的
 * ``iframe.contentWindow.ElMessage = X`` 会被 SecurityError 拦截。Vue 响应式
 * proxy 经过 postMessage 会触发 DataCloneError，亦不可跨帧搬运。
 *
 * 因此业务页自己引入 ``element-plus.full.min.js`` 或 ``vant.min.js``、``viewer-bridge.js``，
 * 本脚本在框架已挂到 window 上后直接 alias：
 *   - PC（Element Plus）：``window.ElMessage`` / ``window.ElMessageBox``
 *   - 移动（Vant）：``window.showToast`` / ``window.showDialog`` / ``window.showConfirmDialog`` / ``window.showNotify``
 *   - 通用：``window.gotoNode(id, fallback?)`` 走 ``window.parent.postMessage`` 通知父级
 *
 * 时序：业务页 <head> 里依次引入 vue / 框架库 / viewer-bridge，全是同步
 * ``<script>``。到 viewer-bridge 执行时 window.ElementPlus 或 window.Vant 已经存在；
 * alias 必须同步执行，不能等 DOMContentLoaded —— 因为 Vue ``onMounted`` 微任务会在
 * DOMContentLoaded 之前触发。
 *
 * 兼容：单独打开 pages/*.html（无父 viewer）时，gotoNode 退到 fallback；Element Plus /
 * Vant 自身的 API 仍然可用（取决于页面引了哪个）。
 *
 * 设备声明上报：业务页 <head> 里的 ``<meta name="device">`` 会被读取并通过 postMessage
 * 上报给父 viewer，让父级决定 iframe 走 PC 满宽还是 375×812 phone frame。
 */
(function () {
  'use strict';

  function install() {
    // ===== Element Plus 短 API（PC 页：element-plus 已加载时可用）=====
    const ep = window.ElementPlus;
    if (ep) {
      if (ep.ElMessage && !window.ElMessage) {
        window.ElMessage = ep.ElMessage;
      }
      if (ep.ElMessageBox && !window.ElMessageBox) {
        window.ElMessageBox = ep.ElMessageBox;
      }
    }

    // ===== Vant 短 API（移动页：vant 已加载时可用；缺省 undefined 不影响 PC 页）=====
    // Vant 4 的 UMD bundle 暴露的全局名是 ``window.vant``（小写），不是 ``window.Vant``。
    // 这里兼容两种命名，并把 v4 暴露的小写名 alias 成大写 ``window.Vant``，
    // 方便业务页统一写 ``app.use(Vant)``，与 Element Plus 的 ``ElementPlus`` 命名风格保持一致。
    const v = window.Vant || window.vant;
    if (v) {
      window.Vant = window.vant = v;
      ['showToast', 'showDialog', 'showConfirmDialog', 'showNotify'].forEach((k) => {
        if (typeof v[k] === 'function' && !window[k]) window[k] = v[k];
      });
    }

    // ===== 通用：gotoNode 走 postMessage 通知父级 =====
    if (!window.gotoNode) {
      window.gotoNode = function (id, fallback) {
        if (id == null || id === '') {
          if (typeof fallback === 'function') fallback();
          return false;
        }
        try {
          window.parent.postMessage({ type: 'gotoNode', id: String(id) }, '*');
          return true;
        } catch (e) {
          if (typeof fallback === 'function') fallback();
          return false;
        }
      };
    }
  }

  // 同步 alias：element-plus / vant 在本脚本前已同步加载并定义 window.ElementPlus / window.Vant。
  install();

  // ===== 设备声明上报（PC/移动页都执行）：读 <meta name="device"> → postMessage 给父 =====
  // 缺省视为 'pc'。viewer 收到后用 deviceCache 缓存 + 切换 phone frame。
  (function reportDevice() {
    let device = 'pc';
    try {
      const meta = document.querySelector('meta[name="device"]');
      const v = meta && meta.getAttribute('content');
      if (v === 'mobile' || v === 'pc') device = v;
    } catch (_) { /* file:// 偶发 querySelector 异常，忽略 */ }

    const send = () => {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'page-device', device: device }, '*');
        }
      } catch (_) { /* postMessage 在某些 iframe sandbox 下会被拒，忽略 */ }
    };

    if (document.readyState === 'complete') {
      send();
    } else {
      window.addEventListener('load', send, { once: true });
    }
  })();
})();