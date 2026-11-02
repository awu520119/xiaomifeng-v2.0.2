// Optional bridge for manually maintained HTML pages. No UI framework required.
(() => {
  window.gotoNode = (id, fallback) => {
    if (!id || window.parent === window) {
      if (typeof fallback === 'function') fallback();
      return false;
    }
    window.parent.postMessage({ type: 'gotoNode', id: String(id) }, '*');
    return true;
  };
  const report = () => {
    if (window.parent === window) return;
    const device = document.querySelector('meta[name="device"]')?.content === 'mobile' ? 'mobile' : 'pc';
    window.parent.postMessage({ type: 'page-device', device }, '*');
  };
  if (document.readyState === 'complete') report();
  else window.addEventListener('load', report, { once: true });
})();
