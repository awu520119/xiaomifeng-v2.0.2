export function gotoViewerNode(id: string, fallback: () => void) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'gotoNode', id }, '*');
    return;
  }
  fallback();
}
