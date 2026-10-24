/* 可选的页面桥接：仅提供跨页面跳转和设备类型上报。 */
(function () {
  'use strict';

  if (!window.gotoNode) {
    window.gotoNode = function (id, fallback) {
      if (!id) {
        if (typeof fallback === 'function') fallback();
        return false;
      }
      if (window.parent === window) {
        if (typeof fallback === 'function') fallback();
        return false;
      }
      window.parent.postMessage({ type: 'gotoNode', id: String(id) }, '*');
      return true;
    };
  }

  const report = () => {
    const declared = document.querySelector('meta[name="device"]')?.content;
    const device = declared === 'mobile' ? 'mobile' : 'pc';
    if (window.parent !== window) window.parent.postMessage({ type: 'page-device', device }, '*');
  };
  if (document.readyState === 'complete') report();
  else window.addEventListener('load', report, { once: true });
})();
