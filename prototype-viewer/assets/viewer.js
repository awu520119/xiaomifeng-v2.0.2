/* viewer.js — 三栏查看器 Vue 应用。
 *
 * 由 index.html 引入；本文件挂载到 #app。逻辑：
 *   - 目录树（TreeNode 递归组件）+ 折叠状态管理
 *   - 三栏宽度拖拽（Pointer Events + setPointerCapture）
 *   - URL ?node=xxx 同步选中节点 + popstate 监听
 *   - 跨页跳转 gotoNode（postMessage 桥接，业务页走 viewer-bridge.js）
 *   - 大纲显示状态（tocVisible）：viewer 端 source of truth，写 localStorage 持久化
 *   - 移动端 phone frame 自适应缩放（<meta name="device"> 上报）
 *
 * 注意：本脚本依赖全局 Vue / window.NAV_DATA；
 * index.html 必须按 vue → nav.js → 本脚本 的顺序加载（nav.js 先注入 NAV_DATA）。
 */
(function () {
  'use strict';

  const Vue = window.Vue;
  if (!Vue) {
    console.error('[viewer] Vue 未加载');
    return;
  }

  const { createApp, ref, reactive, computed, provide, inject, onMounted, watch } = Vue;

  // ===== 公共小工具 =====
  /**
   * file:// 下 URL / URLSearchParams / history.pushState 偶发抛错，包裹一层让失败时静默回退。
   * 原来每处都写 ``try { ... } catch (_) {}``，共 5 处。
   */
  const safe = (fn, fallback) => {
    try { return fn(); } catch (_) { return typeof fallback === 'function' ? fallback() : fallback; }
  };
  /** 模块级 phone-frame rAF 句柄（之前挂在函数对象属性上，跨调用不一致） */
  let phoneRafId = 0;
  /** 拖拽状态：原来挂在 ``divider.__dragging`` DOM 属性上，跨 frame 不安全 */
  const draggingMap = new WeakMap();
  /** 中栏最小宽度：右栏拖拽 / 窗口变小时不能把中间原型 iframe 挤没 */
  const CENTER_MIN_WIDTH = 240;

  // 共享给 TreeNode 子树的折叠状态：expanded[id] === true 表示展开；缺省视为展开
  const EXPANDED_KEY = Symbol('expanded');
  // 搜索中标记：搜索时强制展开（不改写 expanded 记忆，清空搜索后自动恢复原折叠状态）
  const SEARCHING_KEY = Symbol('searching');
  // 单文件分享版中 React 页使用 Blob URL：既不重复内嵌应用，又让 HashRouter 获得合法基址。
  const embeddedReactUrls = new Map();

  const TreeNode = {
    name: 'TreeNode',
    props: {
      node: { type: Object, required: true },
      depth: { type: Number, default: 0 },
      activeId: { type: String, default: '' }
    },
    emits: ['select'],
    setup() {
      const expanded = inject(EXPANDED_KEY, reactive({}));
      const searching = inject(SEARCHING_KEY, ref(false));
      return { expanded, searching };
    },
    computed: {
      hasPage() { return !!this.node.htmlPath; },
      hasChildren() { return !!(this.node.children && this.node.children.length); },
      isActive() { return this.activeId === this.node.id; },
      isExpanded() {
        // 搜索中强制展开，让命中项及其祖先可见；清空搜索后回落 expanded 记忆。
        // 注意：setup() 返回的 ref 在实例上已自动解包，这里用 this.searching 而不是 .value
        if (this.searching) return true;
        return this.expanded[this.node.id] !== false;
      }
    },
    methods: {
      onToggle(ev) {
        ev.stopPropagation();
        if (this.hasChildren) {
          // 直接改共享 expanded（inject 的对象）；不要 $emit 向上转发，
          // 否则顶层 onToggleNode 会用另一套逻辑把它覆盖回去，导致箭头展开/折叠无效。
          this.expanded[this.node.id] = !this.isExpanded;
        }
      },
      onClick() {
        // 默认行为：点击页面节点直接选中；点击分组只切换展开
        if (this.hasPage) {
          this.$emit('select', this.node);
        } else if (this.hasChildren) {
          this.onToggle({ stopPropagation() {} });
        }
      },
      handleChildSelect(child) { this.$emit('select', child); }
    },
    template: `
      <div class="tree-node">
        <div class="tree-row" :class="{ active: isActive }" :style="{ paddingLeft: (6 + depth * 12) + 'px' }" @click="onClick">
          <span class="toggle" :class="{ empty: !hasChildren }" @click="onToggle">{{ hasChildren ? (isExpanded ? '▾' : '▸') : '·' }}</span>
          <span class="icon" :class="hasPage ? 'page' : 'folder'">{{ hasPage ? '📄' : '📁' }}</span>
          <span>{{ node.title }}</span>
        </div>
        <div class="tree-children" :class="{ collapsed: !isExpanded }" v-if="hasChildren">
          <tree-node
            v-for="child in node.children"
            :key="child.id"
            :node="child"
            :depth="depth + 1"
            :active-id="activeId"
            @select="handleChildSelect"></tree-node>
        </div>
      </div>
    `
  };

  function findFirstLeaf(nodes) {
    for (const n of nodes) {
      if (n.htmlPath) return n;
      if (n.children && n.children.length) {
        const inner = findFirstLeaf(n.children);
        if (inner) return inner;
      }
    }
    return null;
  }

  function collectAllIds(nodes, out) {
    for (const n of nodes) {
      out.push(n.id);
      if (n.children) collectAllIds(n.children, out);
    }
    return out;
  }

  function collectAncestorIds(nodes, targetId, acc = []) {
    for (const n of nodes) {
      if (n.id === targetId) return acc;
      if (n.children) {
        const hit = collectAncestorIds(n.children, targetId, [...acc, n.id]);
        if (hit) return hit;
      }
    }
    return null;
  }

  const app = createApp({
    components: { TreeNode },
    setup() {
      const projectName = (window.NAV_DATA && window.NAV_DATA.projectName) || 'PRD 原型';
      const tree = (window.NAV_DATA && window.NAV_DATA.tree) || [];
      const lastSyncAt = (window.NAV_DATA && window.NAV_DATA.lastSyncAt) || '';
      const activeId = ref('');
      const leftCollapsed = ref(false);
      const centerCollapsed = ref(false);
      // 默认隐藏右侧描述栏；用户需要时可点击顶栏第三个图标按钮展开
      const rightCollapsed = ref(true);
      // 大纲显示状态：viewer 是 source of truth（按钮在右侧 panel-header）。
      // 默认恒隐藏、不持久化（每次打开项目大纲都收起、不占宽度）。
      // 点击按钮 → toggle tocVisible + applyTocExtra + postMessage('desc-toc-toggle') 给 desc iframe。
      //   - applyTocExtra 把右栏 grid 列宽从 600px 撑到 900px，**整段右栏向左扩 300px**；
      //   - desc iframe 内部 main.desc { flex:1 } + aside.toc-wrap { width:300px }，
      //     所以描述区内容宽度仍然保持 600px 不变（在新右栏的左 600px 范围里），
      //     大纲区贴在新右栏右边。
      const tocVisible = ref(false);
      // 大纲默认宽度：与 desc iframe 内 aside.toc-wrap 的 --toc-width 默认值一致（300px，固定）
      const TOC_DEFAULT_WIDTH = 300;
      // 折叠状态：默认全部展开（缺省键视为 true）
      const expanded = reactive({});

      // ===== 左侧目录搜索：头部搜索栏 → 模糊匹配 → 保留命中节点及其祖先链（直到顶层） =====
      const searchKeyword = ref('');
      // 搜索中标记：传给 TreeNode 强制展开命中项祖先（不改写 expanded 记忆，清空即恢复）
      const isSearching = computed(() => !!searchKeyword.value.trim());
      const filteredTree = computed(() => {
        const kw = searchKeyword.value.trim().toLowerCase();
        if (!kw) return tree;
        const filter = (nodes) => {
          const out = [];
          for (const n of nodes) {
            const selfMatch = (n.title || '').toLowerCase().includes(kw);
            const kids = (n.children && n.children.length) ? filter(n.children) : [];
            // 命中节点自身保留；子级始终按条件过滤 —— 满足条件的父页面，其不满足条件的
            // 子页面不展示；仅作为祖先链保留的节点同理只挂命中的后代分支。
            if (selfMatch || kids.length) {
              out.push({ ...n, children: kids });
            }
          }
          return out;
        };
        return filter(tree);
      });

      // ===== 三栏折叠 → grid-template-columns（数据驱动）=====
      // 列序：L (左栏) | 3 (左 divider) | C (中间) | 3 (右 divider) | R (右栏)
      //  - 中栏压成 0 时，用 100% - 其它列之和 替代（不能用 calc(1fr + var())，Chromium 有 bug）。
      //  - 全部 0 时也保留中栏 1fr（topbar grid-column: 1 / -1 还要占满）。
      //  - 右栏宽度 = --right-width + --desc-toc-extra：TOC 显示时右栏整体向左扩 300px，
      //    描述区内容在 desc iframe 内 flex:1 自然保持在原宽度（不会跟着被拉宽）。
      //  - CSS 变量定义在 :root，inline style 也写到 :root —— var() 才能解析到正确值。
      const gridCols = computed(() => {
        const leftW = leftCollapsed.value ? 0 : 'var(--left-width)';
        const leftDivW = leftCollapsed.value ? 0 : 3;
        // 中栏最小 240px：即使 JS 钳制未及时触发（如极端窄窗），CSS 也保证原型 iframe 不被挤没
        const centerW = centerCollapsed.value ? 0 : `minmax(${CENTER_MIN_WIDTH}px, 1fr)`;
        const rightDivW = (rightCollapsed.value || centerCollapsed.value) ? 0 : 3;
        let rightW;
        if (rightCollapsed.value) {
          rightW = 0;
        } else if (centerCollapsed.value) {
          // 中栏收起时右栏吃满剩余（避免总宽超屏）；右栏已含完整宽度，
          // 再叠加 --desc-toc-extra 会超过窗口，故这里不叠加。
          rightW = leftCollapsed.value ? '100%' : 'calc(100% - var(--left-width) - 3px)';
        } else {
          rightW = 'calc(var(--right-width) + var(--desc-toc-extra))';
        }
        return `${leftW} ${leftDivW}px ${centerW} ${rightDivW}px ${rightW}`;
      });

      // ===== 设备缓存（自动识别）=====
      // 业务页 <meta name="device"> 通过 viewer-bridge.js postMessage 上报，写入 deviceCache[htmlPath]。
      // 切换节点时优先查 cache；未命中走 pc 等待 postMessage。第二次访问同节点直接命中缓存，无闪烁。
      const deviceCache = reactive({});
      const effectiveDevice = computed(() => {
        const node = currentNode.value;
        if (node && node.htmlPath && deviceCache[node.htmlPath]) {
          return deviceCache[node.htmlPath];
        }
        return 'pc';
      });

      // ===== Phone frame 自适应缩放（mobile 模式下中栏高度 < 812 时整体缩小） =====
      const applyPhoneScale = () => {
        // 用 rAF 合并多次重排请求，避免抖动
        if (phoneRafId) cancelAnimationFrame(phoneRafId);
        phoneRafId = requestAnimationFrame(() => {
          phoneRafId = 0;
          const wrap = document.querySelector('.iframe-wrap');
          if (!wrap) return;
          const inner = wrap.querySelector('.frame-inner');
          if (!inner) return;
          // 从移动页切回 PC 页时：.frame-inner 是常驻节点，transform 是内联样式，
          // 不会随节点切换自动重置 —— 必须显式清掉残留缩放，否则 PC 页被缩小的 phone frame 渲染。
          if (!wrap.classList.contains('mobile')) {
            if (inner.style.transform) inner.style.transform = '';
            return;
          }
          // 高度与宽度同时适配：取较小比例，避免窄中栏下手机框被横向裁切。
          const cs = getComputedStyle(wrap);
          const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
          const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
          const availH = wrap.clientHeight - padY;
          const availW = wrap.clientWidth - padX;
          const scale = Math.min(1, Math.max(0.4, Math.min(availH / 812, availW / 375)));
          inner.style.transform = `scale(${scale})`;
        });
      };

      const findNode = (nodes, id) => {
        for (const n of nodes) {
          if (n.id === id) return n;
          if (n.children) {
            const inner = findNode(n.children, id);
            if (inner) return inner;
          }
        }
        return null;
      };
      const currentNode = computed(() => findNode(tree, activeId.value));

      // 常规查看器加载相对文件；单文件分享版会在全局注入页面/说明的 srcdoc，
      // iframe 因此仍保留独立文档上下文，且业务页可继续通过 postMessage 与查看器联动。
      const prototypeSrc = computed(() => {
        const path = currentNode.value && currentNode.value.htmlPath;
        const page = path && window.PROTOTYPE_EMBEDDED_PAGES?.[path];
        if (!path || !page) return path || '';
        if (page.reactHash === undefined) return '';
        let url = embeddedReactUrls.get(path);
        if (!url) {
          // 单文件环境的 Blob URL 是 blob:null，HashRouter 无法使用；注入初始路由后，
          // React 应用会自动切到 MemoryRouter。
          const routeScript = `<script>window.__PROTOTYPE_INITIAL_ROUTE__=${JSON.stringify(page.reactHash)};<${'/script'}>`;
          url = URL.createObjectURL(new Blob([routeScript, window.PROTOTYPE_EMBEDDED_REACT_APP_HTML], { type: 'text/html' }));
          embeddedReactUrls.set(path, url);
        }
        return url;
      });
      const prototypeSrcdoc = computed(() => {
        const path = currentNode.value && currentNode.value.htmlPath;
        const page = path && window.PROTOTYPE_EMBEDDED_PAGES?.[path];
        if (!page) return null;
        if (page.reactHash !== undefined) return null;
        return page.srcdoc || null;
      });
      const descSrc = computed(() => {
        const id = currentNode.value && currentNode.value.id;
        return id && !window.PROTOTYPE_EMBEDDED_DESCS?.[id] ? `desc/${id}.html` : '';
      });
      const descSrcdoc = computed(() => {
        const id = currentNode.value && currentNode.value.id;
        return (id && window.PROTOTYPE_EMBEDDED_DESCS?.[id]) || null;
      });

      const onSelectNode = (node) => {
        if (!node || activeId.value === node.id) return;
        activeId.value = node.id;
        safe(() => {
          const url = new URL(window.location.href);
          url.searchParams.set('node', node.id);
          history.pushState({ node: node.id }, '', url.toString());
        });
      };

      // allExpanded 实时反映真实折叠状态（避免手动折叠某节点后按钮文案失真）
      const allExpanded = computed(() => {
        const ids = collectAllIds(tree, []);
        return ids.every((id) => expanded[id] !== false);
      });
      const toggleAll = () => {
        const shouldExpand = !allExpanded.value;
        for (const id of collectAllIds(tree, [])) {
          expanded[id] = shouldExpand;
        }
      };

      // 大纲状态同步：把 viewer 端 tocVisible 广播给 desc iframe（desc-enhance.js 监听
      // 'desc-toc-toggle'，切 layout.toc-collapsed class）。按钮点击和 iframe 重新加载
      // （切换页面）后都要调用一次 —— 否则切换页面后新 iframe 内大纲默认折叠，
      // 而 viewer 端仍按展开占宽，右栏右侧会出现一块空白的大纲区。
      const syncDescToc = () => {
        const iframe = document.querySelector('.panel.right .desc-body iframe');
        if (iframe && iframe.contentWindow) {
          safe(() => iframe.contentWindow.postMessage({ type: 'desc-toc-toggle', visible: tocVisible.value }, '*'));
        }
      };
      // 大纲状态切换：viewer 端按钮是 source of truth → 翻转 tocVisible + applyTocExtra +
      // syncDescToc 通知 desc iframe。不持久化：每次打开项目大纲默认隐藏、不占宽度。
      const toggleToc = () => {
        tocVisible.value = !tocVisible.value;
        applyTocExtra();
        clampRightWidth();
        syncDescToc();
      };

      // applyTocExtra 把 tocVisible 反映到 --desc-toc-extra CSS 变量；
      // 右栏 grid 列宽 = calc(var(--right-width) + var(--desc-toc-extra))，
      // 0 = 仅文档 600px；300 = 文档 600px + 大纲 300px = 900px。
      // CSS 变量在 :root 上，inline style 也写到 :root —— 这才能让 var() 解析到正确的值。
      const applyTocExtra = () => {
        document.documentElement.style.setProperty(
          '--desc-toc-extra',
          tocVisible.value ? `${TOC_DEFAULT_WIDTH}px` : '0px'
        );
      };

      // 右栏宽度兜底钳制：窗口缩小 / 大纲展开后，若右栏会把中栏挤没则自动收窄。
      // 右栏实际占宽 = --right-width + --desc-toc-extra（大纲叠加），所以钳制的是两者之和。
      // 让文档区（right-width）让位给大纲（toc-extra 300px 是刚性的），最小可压到 0；
      // 配合 gridCols 里中栏列 minmax(240px, 1fr) 的 CSS 双保险，中栏永不被挤没。
      // 关键：钳制只临时压窄 CSS 变量，用户拖拽过的宽度记录在 userRightWidth ——
      // 窗口重新变大时恢复到用户意图，而不是被钉死在钳制后的窄值上。
      let userRightWidth = 600;
      const clampRightWidth = () => {
        const root = document.documentElement;
        const leftW = leftCollapsed.value ? 0 : (parseInt(getComputedStyle(root).getPropertyValue('--left-width')) || 280);
        const tocExtra = parseInt(getComputedStyle(root).getPropertyValue('--desc-toc-extra')) || 0;
        // 中栏可用的总宽度 = 窗口 - 左栏 - 左右分隔条(6px)；右栏(含大纲)不得超过它 - 中栏最小宽
        const rightTotalMax = window.innerWidth - leftW - 6 - CENTER_MIN_WIDTH;
        const rightTotal = tocExtra + (parseInt(getComputedStyle(root).getPropertyValue('--right-width')) || 600);
        if (rightTotal > rightTotalMax) {
          const newRight = Math.max(0, rightTotalMax - tocExtra);
          root.style.setProperty('--right-width', newRight + 'px');
        } else if (userRightWidth > 220) {
          // 空间足够：恢复用户意图宽度（若被钳制过）
          root.style.setProperty('--right-width', userRightWidth + 'px');
        }
      };
      // 窗口尺寸变化（缩小）时重新钳制，避免右栏把中栏挤没
      window.addEventListener('resize', clampRightWidth);

      /**
       * 跨页面跳转 API：iframe 内可调用 ``parent.postMessage({type:'gotoNode', id}, '*')``；
       * 同源场景（如控制台）也可直接 ``window.gotoNode('<id>')``。
       * 自动展开祖先分组 + 选中节点 + 切换中间/右侧 iframe。
       * 说明：file:// 各 frame 视为独立 null origin，跨 frame 函数调用会被拒，
       *       所以必须通过 postMessage 桥接。
       */
      const gotoNode = (id) => {
        if (!id) return false;
        const node = findNode(tree, id);
        if (!node) {
          console.warn('[viewer] gotoNode: 节点不存在 -', id);
          return false;
        }
        const ancestors = collectAncestorIds(tree, id) || [];
        for (const aId of ancestors) expanded[aId] = true;
        if (activeId.value !== id) {
          activeId.value = id;
          safe(() => {
            const url = new URL(window.location.href);
            url.searchParams.set('node', id);
            history.pushState({ node: id }, '', url.toString());
          });
        }
        return true;
      };
      window.gotoNode = gotoNode;
      // 只接受来自「已知业务/描述 iframe」的消息，避免同页任意 frame 伪造 gotoNode / page-device
      const isTrustedFrame = (win) => {
        const c = document.querySelector('.center .frame-inner iframe');
        const d = document.querySelector('.panel.right .desc-body iframe');
        return (c && c.contentWindow === win) || (d && d.contentWindow === win);
      };
      window.addEventListener('message', (ev) => {
        const data = ev.data;
        if (!data || typeof data !== 'object') return;
        if (!isTrustedFrame(ev.source)) return;
        if (data.type === 'gotoNode' && typeof data.id === 'string') {
          gotoNode(data.id);
        } else if (data.type === 'page-device') {
          // 业务页 viewer-bridge.js 上报 <meta name="device">。
          // 只接受「当前中栏 iframe」的上报：若用户在慢加载的页面 onload 前已切到
          // 其它节点，旧页面迟到的上报会被忽略，避免 device 写进新节点的缓存。
          const node = currentNode.value;
          const centerFrame = document.querySelector('.center .frame-inner iframe');
          if (typeof data.device === 'string' && node && node.htmlPath &&
              centerFrame && centerFrame.contentWindow === ev.source) {
            deviceCache[node.htmlPath] = data.device;
            applyPhoneScale();
          }
        }
      });

      // Pointer Events：统一处理鼠标 / 触摸 / 笔；setPointerCapture 保证即便鼠标越过 iframe 也不丢事件
      const startDrag = (side, ev) => {
        if (ev.button !== 0) return;  // 只响应主键（左键/触摸），右键/中键不触发拖拽
        ev.preventDefault();
        const root = document.documentElement;
        const viewer = document.querySelector('.viewer');
        const divider = ev.currentTarget;
        const startX = ev.clientX;
        // CSS 变量定义在 :root，拖拽产生的 inline style 也写到 :root 上，
        // getComputedStyle(<html>) 才能拿到当前实际值。
        const startLeft = parseInt(getComputedStyle(root).getPropertyValue('--left-width')) || 280;
        const startRight = parseInt(getComputedStyle(root).getPropertyValue('--right-width')) || 600;
        const minLeft = 180, maxLeft = 600;
        const minRight = 220;
        // 右栏可拖上限：为中间 iframe 保留最小宽度（左右分隔条 3+3 占位）。
        // 右栏实际占宽 = --right-width + --desc-toc-extra，所以上限要先减去大纲宽 tocExtra，
        // 保证拖动后中栏 ≥ CENTER_MIN_WIDTH。
        const leftW = leftCollapsed.value ? 0 : startLeft;
        const tocExtra = parseInt(getComputedStyle(root).getPropertyValue('--desc-toc-extra')) || 0;
        const maxRight = Math.max(minRight, window.innerWidth - leftW - CENTER_MIN_WIDTH - 6 - tocExtra);

        // 状态机：单一 isDragging 标志（用 WeakMap，不挂在 DOM 属性上）。
        if (draggingMap.get(divider)) return;
        draggingMap.set(divider, true);
        divider.classList.add('dragging');
        // cursor 锁定写在 .viewer 上（不是 body），与 viewer.css 的 .viewer.viewer-dragging 选择器一致
        viewer && viewer.classList.add('viewer-dragging');
        safe(() => divider.setPointerCapture && divider.setPointerCapture(ev.pointerId));

        let raf = 0;
        let pendingDelta = 0;
        const apply = () => {
          raf = 0;
          if (!pendingDelta) return;
          if (side === 'left') {
            let w = startLeft + pendingDelta;
            w = Math.max(minLeft, Math.min(maxLeft, w));
            root.style.setProperty('--left-width', w + 'px');
          } else {
            let w = startRight - pendingDelta;
            w = Math.max(minRight, Math.min(maxRight, w));
            root.style.setProperty('--right-width', w + 'px');
            userRightWidth = w;  // 记录用户拖拽意图，供 clampRightWidth 恢复
          }
          pendingDelta = 0;
        };

        let active = true;
        const stop = () => {
          if (!active) return;
          active = false;
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
          window.removeEventListener('pointermove', onMove, true);
          window.removeEventListener('pointerup', onUp, true);
          window.removeEventListener('pointercancel', onCancel, true);
          draggingMap.delete(divider);
          divider.classList.remove('dragging');
          viewer && viewer.classList.remove('viewer-dragging');
          safe(() => divider.releasePointerCapture && divider.releasePointerCapture(ev.pointerId));
          apply();
        };
        const onMove = (e) => {
          if (!active) return;
          pendingDelta = e.clientX - startX;
          if (!raf) raf = requestAnimationFrame(apply);
        };
        const onUp = () => stop();
        const onCancel = () => stop();

        // capture 阶段监听，iframe / 第三方监听器也无法拦截
        window.addEventListener('pointermove', onMove, true);
        window.addEventListener('pointerup', onUp, true);
        window.addEventListener('pointercancel', onCancel, true);
      };

      onMounted(() => {
        // 1) 大纲默认隐藏：applyTocExtra 让 --desc-toc-extra 置 0，右栏不预留大纲宽度。
        applyTocExtra();
        clampRightWidth();

        // 2) 节点初始选择：URL > 第一个叶子
        const readNodeFromUrl = () => {
          const id = safe(() => {
            const sp = new URLSearchParams(window.location.search);
            return sp.get('node');
          });
          return (id && findNode(tree, id)) ? id : null;
        };
        const fromUrl = readNodeFromUrl();
        const first = findFirstLeaf(tree);
        if (fromUrl) activeId.value = fromUrl;
        else if (first) activeId.value = first.id;

        // 3) popstate：浏览器后退/前进触发 → 同步 activeId，**不 pushState**
        window.addEventListener('popstate', (ev) => {
          const id = ev.state && ev.state.node ? ev.state.node : readNodeFromUrl();
          if (id && findNode(tree, id)) activeId.value = id;
        });

        // 4) 中栏尺寸变化时重新计算 phone frame 缩放（mobile 模式下）
        const center = document.querySelector('.center');
        if (center && typeof ResizeObserver !== 'undefined') {
          new ResizeObserver(applyPhoneScale).observe(center);
        }
        // 5) device 切换时（手动 override 或 postMessage 上报）也重算 scale
        watch(effectiveDevice, applyPhoneScale, { flush: 'post' });
      });

      provide(EXPANDED_KEY, expanded);
      provide(SEARCHING_KEY, isSearching);

      return {
        projectName, tree, lastSyncAt, activeId, leftCollapsed, centerCollapsed, rightCollapsed, expanded,
        gridCols,
        currentNode, prototypeSrc, prototypeSrcdoc, descSrc, descSrcdoc,
        onSelectNode, allExpanded, toggleAll, startDrag, gotoNode,
        effectiveDevice,
        tocVisible, toggleToc, onDescLoad: syncDescToc,
        searchKeyword, filteredTree
      };
    }
  });
  app.mount('#app');
})();
