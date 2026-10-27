import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const h = React.createElement;
const allIds = (nodes) => nodes.flatMap((node) => [node.id, ...allIds(node.children || [])]);
const findNode = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const nested = findNode(node.children || [], id);
    if (nested) return nested;
  }
  return null;
};
const ancestors = (nodes, target, stack = []) => {
  for (const node of nodes) {
    if (node.id === target) return stack;
    const nested = ancestors(node.children || [], target, [...stack, node.id]);
    if (nested) return nested;
  }
  return null;
};
const firstPage = (nodes) => {
  for (const node of nodes) {
    if (node.htmlPath) return node;
    const nested = firstPage(node.children || []);
    if (nested) return nested;
  }
  return null;
};
const filterTree = (nodes, keyword) => {
  if (!keyword) return nodes;
  return nodes.flatMap((node) => {
    const children = filterTree(node.children || [], keyword);
    return node.title.toLowerCase().includes(keyword) || children.length ? [{ ...node, children }] : [];
  });
};
const safe = (fn) => { try { return fn(); } catch { return undefined; } };

function TreeNode({ node, depth, activeId, expanded, searching, onSelect, onToggle }) {
  const children = node.children || [];
  const open = searching || expanded[node.id] !== false;
  const page = Boolean(node.htmlPath);
  return h('div', { className: 'tree-node' },
    h('div', { className: `tree-row${activeId === node.id ? ' active' : ''}`, style: { paddingLeft: `${6 + depth * 12}px` }, onClick: () => page ? onSelect(node) : onToggle(node.id), role: page ? 'button' : undefined, tabIndex: page ? 0 : undefined },
      h('span', { className: `toggle${children.length ? '' : ' empty'}`, onClick: (event) => { event.stopPropagation(); onToggle(node.id); } }, children.length ? (open ? '▾' : '▸') : '·'),
      h('span', { className: `icon ${page ? 'page' : 'folder'}` }, page ? '📄' : '📁'), node.title),
    children.length ? h('div', { className: `tree-children${open ? '' : ' collapsed'}` }, children.map((child) => h(TreeNode, { key: child.id, node: child, depth: depth + 1, activeId, expanded, searching, onSelect, onToggle }))) : null);
}

function IconButton({ label, hidden, children, onClick }) {
  return h('button', { className: `icon-btn${hidden ? ' active' : ''}`, title: `${hidden ? '显示' : '隐藏'}${label}`, 'aria-label': `${hidden ? '显示' : '隐藏'}${label}`, onClick }, children);
}
function PanelIcon({ side }) {
  const x = side === 'left' ? 6.5 : side === 'right' ? 13.5 : 10;
  return h('svg', { viewBox: '0 0 20 20', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true }, h('rect', { x: 3, y: 4, width: 14, height: 12, rx: 1.5 }), h('line', { x1: x, y1: 4, x2: x, y2: 16, strokeWidth: 2 }));
}

function Viewer() {
  const nav = window.NAV_DATA || {};
  const tree = nav.tree || [];
  const [activeId, setActiveId] = useState(() => {
    const requested = new URLSearchParams(location.search).get('node');
    return findNode(tree, requested)?.htmlPath ? requested : firstPage(tree)?.id || '';
  });
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [centerCollapsed, setCenterCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(true);
  const [tocVisible, setTocVisible] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [keyword, setKeyword] = useState('');
  const [device, setDevice] = useState({});
  const [phoneScale, setPhoneScale] = useState(1);
  const current = findNode(tree, activeId);
  const filtered = useMemo(() => filterTree(tree, keyword.trim().toLowerCase()), [tree, keyword]);
  const frameRef = useRef(null);
  const stageRef = useRef(null);
  const currentPath = current?.htmlPath || '';
  const embedded = window.PROTOTYPE_EMBEDDED_PAGES?.[currentPath];
  const description = current?.id ? window.PROTOTYPE_EMBEDDED_DESCS?.[current.id] : null;
  const currentDevice = (currentPath && device[currentPath]) || 'pc';
  const mobile = currentDevice === 'mobile';
  const route = embedded?.reactHash;
  const blobUrl = useMemo(() => {
    if (route === undefined || !window.PROTOTYPE_EMBEDDED_REACT_APP_HTML) return '';
    const boot = `<script>window.__PROTOTYPE_INITIAL_ROUTE__=${JSON.stringify(route)};<${'/script'}>`;
    return URL.createObjectURL(new Blob([boot, window.PROTOTYPE_EMBEDDED_REACT_APP_HTML], { type: 'text/html' }));
  }, [route]);
  const pageSrc = embedded ? (route === undefined ? '' : blobUrl) : currentPath;
  const pageSrcDoc = embedded && route === undefined
    ? embedded.srcdoc.replace(
      '/*__PROTOTYPE_SHARED_SCRIPT__*/',
      () => window.PROTOTYPE_EMBEDDED_SHARED_SCRIPT || '',
    )
    : undefined;

  const selectNode = useCallback((node, push = true) => {
    if (!node?.htmlPath) return;
    setActiveId(node.id);
    if (push) safe(() => { const url = new URL(location.href); url.searchParams.set('node', node.id); history.pushState({ node: node.id }, '', url); });
  }, []);
  const toggleGroup = (id) => setExpanded((state) => ({ ...state, [id]: state[id] === false }));
  const toggleAll = () => {
    const ids = allIds(tree);
    const expand = ids.some((id) => expanded[id] === false);
    setExpanded(Object.fromEntries(ids.map((id) => [id, expand])));
  };
  const gotoNode = useCallback((id) => {
    const node = findNode(tree, id);
    if (!node?.htmlPath) return false;
    setExpanded((state) => ({ ...state, ...Object.fromEntries((ancestors(tree, id) || []).map((ancestor) => [ancestor, true])) }));
    selectNode(node);
    return true;
  }, [tree, selectNode]);

  useEffect(() => {
    window.gotoNode = gotoNode;
    const onPop = (event) => {
      const id = event.state?.node || new URLSearchParams(location.search).get('node');
      if (findNode(tree, id)?.htmlPath) setActiveId(id);
    };
    const onMessage = (event) => {
      const sources = [frameRef.current?.contentWindow, stageRef.current?.contentWindow];
      if (!sources.includes(event.source) || !event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'gotoNode' && typeof event.data.id === 'string') gotoNode(event.data.id);
      if (event.data.type === 'page-device' && event.source === frameRef.current?.contentWindow && ['pc', 'mobile'].includes(event.data.device) && currentPath) setDevice((state) => ({ ...state, [currentPath]: event.data.device }));
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('message', onMessage);
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('message', onMessage); };
  }, [tree, currentPath, gotoNode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--desc-toc-extra', tocVisible ? '300px' : '0px');
    if (description && stageRef.current?.contentWindow) safe(() => stageRef.current.contentWindow.postMessage({ type: 'desc-toc-toggle', visible: tocVisible }, '*'));
  }, [tocVisible, description]);
  useEffect(() => {
    const update = () => {
      const wrap = document.querySelector('.iframe-wrap');
      if (!wrap || !mobile) { setPhoneScale(1); return; }
      const style = getComputedStyle(wrap);
      const availableH = wrap.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const availableW = wrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setPhoneScale(Math.min(1, Math.max(0.4, Math.min(availableH / 812, availableW / 375))));
    };
    const observer = new ResizeObserver(update);
    const center = document.querySelector('.center');
    if (center) observer.observe(center);
    window.addEventListener('resize', update);
    update();
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, [mobile, activeId, leftCollapsed, rightCollapsed, centerCollapsed]);

  const drag = (side, event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const root = document.documentElement;
    const initial = parseInt(getComputedStyle(root).getPropertyValue(side === 'left' ? '--left-width' : '--right-width'), 10) || (side === 'left' ? 280 : 600);
    const divider = event.currentTarget;
    divider.classList.add('dragging'); document.querySelector('.viewer')?.classList.add('viewer-dragging');
    const move = (next) => {
      const delta = next.clientX - startX;
      const min = side === 'left' ? 180 : 220;
      const max = side === 'left' ? 600 : Math.max(min, innerWidth - 240 - 300);
      const width = Math.max(min, Math.min(max, side === 'left' ? initial + delta : initial - delta));
      root.style.setProperty(side === 'left' ? '--left-width' : '--right-width', `${width}px`);
    };
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); divider.classList.remove('dragging'); document.querySelector('.viewer')?.classList.remove('viewer-dragging'); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop, { once: true }); window.addEventListener('pointercancel', stop, { once: true });
  };
  const gridCols = `${leftCollapsed ? '0' : 'var(--left-width)'} ${leftCollapsed ? '0' : '3'}px ${centerCollapsed ? '0' : 'minmax(240px, 1fr)'} ${(rightCollapsed || centerCollapsed) ? '0' : '3'}px ${rightCollapsed ? '0' : `calc(var(--right-width) + var(--desc-toc-extra))`}`;

  return h('div', { className: 'viewer' }, h('div', { className: `layout${leftCollapsed ? ' left-collapsed' : ''}${centerCollapsed ? ' center-collapsed' : ''}${rightCollapsed ? ' right-collapsed' : ''}`, style: { gridTemplateColumns: gridCols } },
    h('div', { className: 'topbar' }, h('div', { className: 'title' }, nav.projectName || '原型查看器'), current && h('span', { className: 'meta' }, `/${current.htmlPath}`), current?.templateType && h('span', { className: 'badge' }, current.templateType), h('div', { className: 'spacer' }), nav.lastSyncAt && h('span', { className: 'meta' }, `目录同步于 ${nav.lastSyncAt}`), h('div', { className: 'topbar-actions' },
      h(IconButton, { label: '左侧目录', hidden: leftCollapsed, onClick: () => setLeftCollapsed((v) => !v), children: h(PanelIcon, { side: 'left' }) }),
      h(IconButton, { label: '中间原型', hidden: centerCollapsed, onClick: () => setCenterCollapsed((v) => !v), children: h(PanelIcon, { side: 'center' }) }),
      h(IconButton, { label: '右侧说明', hidden: rightCollapsed, onClick: () => setRightCollapsed((v) => !v), children: h(PanelIcon, { side: 'right' }) }))),
    h('div', { className: 'panel left' }, h('div', { className: 'panel-header' }, h('span', null, '目录'), h('div', { className: 'actions' }, h('button', { onClick: toggleAll }, allIds(tree).length && allIds(tree).every((id) => expanded[id] !== false) ? '全部折叠' : '全部展开'))), h('div', { className: 'search-bar' }, h('input', { value: keyword, onChange: (event) => setKeyword(event.target.value), placeholder: '搜索页面名称', 'aria-label': '搜索页面名称' }), keyword && h('span', { className: 'search-clear', onClick: () => setKeyword(''), role: 'button', 'aria-label': '清空搜索' }, '×')), h('div', { className: 'tree' }, filtered.map((node) => h(TreeNode, { key: node.id, node, depth: 0, activeId, expanded, searching: Boolean(keyword.trim()), onSelect: selectNode, onToggle: toggleGroup })), keyword && !filtered.length && h('div', { className: 'tree-empty' }, '未找到匹配的页面'))),
    h('div', { className: 'divider', onPointerDown: (event) => drag('left', event) }),
    h('div', { className: 'panel center' }, current?.htmlPath ? h('div', { className: `iframe-wrap${mobile ? ' mobile' : ''}` }, h('div', { className: 'frame-inner', style: { transform: mobile ? `scale(${phoneScale})` : undefined } }, h('iframe', { ref: frameRef, title: current.title, src: pageSrc || undefined, srcDoc: pageSrcDoc, onLoad: () => safe(() => frameRef.current.contentWindow.postMessage({ type: 'desc-toc-toggle', visible: tocVisible }, '*')) }))) : h('div', { className: 'desc-empty' }, '请在左侧选择一个页面')),
    h('div', { className: 'divider', onPointerDown: (event) => drag('right', event) }),
    h('div', { className: 'panel right' }, h('div', { className: 'panel-header' }, h('span', null, '文档'), h('div', { className: 'actions' }, h('button', { className: `desc-toc-toggle${tocVisible ? '' : ' active'}`, onClick: () => setTocVisible((v) => !v), title: tocVisible ? '隐藏大纲' : '显示大纲', 'aria-label': tocVisible ? '隐藏大纲' : '显示大纲' }, '☷'))), current && current.mdPath ? h('div', { className: 'desc-body' }, h('iframe', { ref: stageRef, title: `${current.title}说明`, src: description ? undefined : `desc/${current.id}.html`, srcDoc: description || undefined, onLoad: () => safe(() => stageRef.current.contentWindow.postMessage({ type: 'desc-toc-toggle', visible: tocVisible }, '*')) })) : h('div', { className: 'desc-empty' }, current ? '该节点没有描述文档' : '请在左侧选择一个页面'))));
}

createRoot(document.getElementById('app')).render(h(Viewer));
