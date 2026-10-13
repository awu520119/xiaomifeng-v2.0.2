/* desc-enhance.js — 描述区增强。
 *
 * 由 build_desc.py 把这段 <script> 内联到 desc/<id>.html 的 </body> 之前。
 *
 * 行为：
 *   - <pre><code>：在 <pre> 内插入头部行（语言 chip + 悬浮复制图标），
 *     鼠标悬浮 pre 才显示复制图标，点复制全部代码 + 顶部 toast 反馈。
 *   - 右侧 TOC：固定宽度 300px（不可拖拽）；点击平滑滚动到对应 heading；
 *     滚动时高亮当前 heading 对应项。
 *   - 大纲状态完全由父 viewer 控制（viewer 是 source of truth）；本 iframe 只响应
 *     'desc-toc-toggle' 命令并把 layout 切到 toc-collapsed。
 *
 * 大纲初始恒折叠：不读 localStorage（旧版本记忆已废弃），避免大纲在窄 iframe 里
 * 显示出来挤占文档宽度。
 */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const COPY_ICON_PATH = 'M9 9h10v10H9zM5 5h10V3H5a2 2 0 0 0-2 2v10h2z';

  function enhance() {
    // 1) 代码块头部 + 复制图标
    document.querySelectorAll('main.desc pre > code').forEach(enhanceCodeBlock);

    // 2) 右侧 TOC：点击滚动 + 滚动时高亮当前 heading
    setupToc();
  }

  function setupToc() {
    const layout = document.querySelector('.desc-layout');
    if (!layout) return;

    const tocLinks = layout.querySelectorAll('.toc-nav a[href^="#"]');

    // 默认折叠；父 viewer 接管后通过 postMessage 切换。
    restoreTocState(layout);

    // 父 viewer 右侧 panel-header 的大纲按钮 → postMessage('desc-toc-toggle') →
    // 本 iframe 切 layout.toc-collapsed。**viewer 是 source of truth**，本 iframe 只执行。
    window.addEventListener('message', (ev) => {
      // 只接受父 viewer 的命令（与 viewer 端 isTrustedFrame 的安全模型对齐）
      if (ev.source !== window.parent) return;
      const data = ev.data;
      if (!data || typeof data !== 'object') return;
      if (data.type !== 'desc-toc-toggle' || typeof data.visible !== 'boolean') return;
      layout.classList.toggle('toc-collapsed', !data.visible);
    });

    // 大纲头部"展开/折叠全部"按钮
    const toggleAllBtn = layout.querySelector('.toc-toggle-all');
    // 用纯 DOM 遍历替代 :has()（:has() 在 Chrome<105 / Safari<15.4 / Firefox<121 会抛 SyntaxError）
    const expandableItems = () => Array.from(
      layout.querySelectorAll('.toc-item')
    ).filter((item) => Array.from(item.children).some((el) => el.classList.contains('toc-list')));
    const allExpanded = () => {
      const items = expandableItems();
      if (!items.length) return false;
      return items.every((item) => item.classList.contains('is-expanded'));
    };
    const updateToggleAllText = () => {
      if (!toggleAllBtn) return;
      toggleAllBtn.textContent = allExpanded() ? '全部折叠' : '全部展开';
    };
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', () => {
        const shouldExpand = !allExpanded();
        expandableItems().forEach((item) => {
          item.classList.toggle('is-expanded', shouldExpand);
        });
        updateToggleAllText();
      });
      updateToggleAllText();
    }

    // 单项折叠 / 展开（chevron 点击）
    layout.querySelectorAll('[data-toc-chevron]').forEach((chevron) => {
      chevron.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const item = chevron.closest('.toc-item');
        if (item && Array.from(item.children).some((el) => el.classList.contains('toc-list'))) {
          item.classList.toggle('is-expanded');
          updateToggleAllText();
        }
      });
    });

    // 没有 toc 链接就直接结束
    if (!tocLinks.length) return;

    // 点击 → 在 main.desc 内平滑滚动 + 同步 URL hash
    const main = layout.querySelector('main.desc');
    if (main) {
      tocLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
          const id = link.getAttribute('data-toc-id') || link.getAttribute('href').slice(1);
          const target = id && document.getElementById(id);
          if (!target) return;
          e.preventDefault();
          // offset 16 与 CSS scroll-margin-top 保持一致
          const mainRect = main.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const desired = (targetRect.top - mainRect.top) + main.scrollTop - 16;
          main.scrollTo({ top: desired, behavior: 'smooth' });
          // 保留当前 entry 的 state（避免把顶层 {node} 状态覆盖成 null，后退/前进时失效）
          try { history.replaceState(window.history.state, '', '#' + id); } catch (_) {}
        });
      });
    }

    // 滚动监听 → 高亮当前 heading
    const headings = Array.from(
      document.querySelectorAll('main.desc h1[id], main.desc h2[id], main.desc h3[id], main.desc h4[id], main.desc h5[id], main.desc h6[id]')
    );
    if (!headings.length || !main) return;

    const idToLink = new Map();
    tocLinks.forEach((link) => {
      const id = link.getAttribute('data-toc-id') || link.getAttribute('href').slice(1);
      if (id) idToLink.set(id, link);
    });

    const setActive = (link, on) => {
      if (!link) return;
      const li = link.closest('.toc-item');
      if (li && li.classList) li.classList.toggle('is-active', !!on);
    };

    // scroll-margin-top 把标题锚定在容器顶 16px；getBoundingClientRect 有 subpixel 偏差，
    // 阈值必须留容差，否则滚动定位后的 16.5px 会被判为「未到达」，高亮停在上一个标题。
    const cssTopOfHeading = 16;
    const headingTolerance = 4;
    const updateActive = () => {
      const mainRect = main.getBoundingClientRect();
      const containerTop = mainRect.top;
      // 已滚到底时最后一个标题必然应高亮；否则文档末尾章节不足一屏时，
      // 它的 heading 永远滚不到容器顶阈值，会回落到选中上一个节点。
      const atBottom = main.scrollTop + main.clientHeight >= main.scrollHeight - 2;
      let activeId = '';
      if (atBottom && headings.length) {
        activeId = headings[headings.length - 1].id;
      } else {
        // 初始不高亮任何项：仅当某标题滚到容器顶附近才高亮（避免开头有引导段时误选中首标题）
        for (const h of headings) {
          if (h.getBoundingClientRect().top - containerTop <= cssTopOfHeading + headingTolerance) {
            activeId = h.id;
          } else {
            break;
          }
        }
      }
      tocLinks.forEach((l) => setActive(l, false));
      setActive(idToLink.get(activeId), true);
    };

    let raf = 0;
    main.addEventListener(
      'scroll',
      () => {
        if (!raf) raf = requestAnimationFrame(() => { updateActive(); raf = 0; });
      },
      { passive: true }
    );
    // 不在初始化时立即调用 updateActive()：DOMContentLoaded 阶段布局未完全定型，
    // getBoundingClientRect 会算错标题位置（曾误选中末尾标题）。高亮只随滚动触发，
    // 打开页面初始无高亮，用户滚动到某章节后正确高亮。
  }

  function restoreTocState(layout) {
    // 大纲默认隐藏：viewer 是 source of truth，本 iframe 启动时始终折叠（不占宽度）。
    // 显式展示大纲由父 viewer 通过 'desc-toc-toggle' 消息切换。
    layout.classList.add('toc-collapsed');
  }

  function enhanceCodeBlock(codeEl) {
    const pre = codeEl.parentElement;
    if (!pre || pre.dataset.enhanceBound === '1') return;
    pre.dataset.enhanceBound = '1';
    pre.classList.add('desc-code');
    // position:relative 已在 CSS 定义（main.desc pre），不再内联设置

    // 抽语言：class="language-bash" → "bash"；类名不存在则显示 'text'
    let lang = '';
    codeEl.className && codeEl.className.split(/\s+/).forEach((c) => {
      if (c.startsWith('language-')) lang = c.slice('language-'.length);
    });

    const head = document.createElement('div');
    head.className = 'desc-code-head';

    const langChip = document.createElement('span');
    langChip.className = 'desc-lang';
    langChip.textContent = lang || 'text';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'desc-copy-trigger';
    copyBtn.setAttribute('aria-label', '复制代码');
    copyBtn.title = '复制代码';

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<path fill="currentColor" d="${COPY_ICON_PATH}"/>`;
    copyBtn.appendChild(svg);

    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copy(copyBtn, codeEl.innerText);
    });

    head.appendChild(langChip);
    head.appendChild(copyBtn);
    pre.insertBefore(head, codeEl);
  }

  async function copy(btn, text) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    };
    let ok = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(text); ok = true; } catch (_) { ok = false; }
    }
    if (!ok) ok = fallback();
    showToast(ok ? '复制成功 ✓' : '复制失败');
  }

  function showToast(text) {
    const main = document.querySelector('main.desc');
    if (!main) return;
    const old = main.querySelector('.desc-copy-toast');
    if (old) old.remove();
    const toast = document.createElement('span');
    toast.className = 'desc-copy-toast';  // 成功/失败统一黑底，语义由文案承载
    toast.textContent = text;
    main.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 400);
    }, 1400);
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  ready(enhance);
})();
