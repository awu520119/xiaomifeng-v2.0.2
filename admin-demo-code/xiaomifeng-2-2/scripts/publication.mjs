import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export const safeId = /^[a-z][a-z0-9-]*$/;
const fail = (message) => {
  throw new Error(message);
};

export function documentPath(root, value) {
  if (
    typeof value !== 'string' ||
    !value.endsWith('.md') ||
    value.includes('\\') ||
    value.split('/').some((part) => !part || part === '.' || part === '..') ||
    isAbsolute(value)
  )
    fail('doc 必须是 docs/ 内的 Markdown 相对路径');
  const base = resolve(root, 'docs');
  const target = resolve(base, value);
  if (existsSync(target)) {
    const realRoot = realpathSync(root);
    const realBase = realpathSync(base);
    const baseRel = relative(realRoot, realBase);
    if (isAbsolute(baseRel) || baseRel === '..' || baseRel.startsWith(`..${sep}`))
      fail('docs 路径越界');
    const rel = relative(realBase, realpathSync(target));
    if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) fail('doc 路径越界');
  }
  return target;
}

export function readConfig(root, { requireViewer = true } = {}) {
  const configPath = join(root, 'prototype-pages.json');
  if (!existsSync(configPath)) fail(`找不到 ${configPath}`);
  let config;
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (error) {
    fail(`页面清单不是合法 JSON：${error.message}`);
  }
  if (!safeId.test(config?.sourceId || '')) fail('sourceId 必须是 kebab-case');
  if (
    requireViewer &&
    (typeof config?.viewer?.projectPath !== 'string' || !config.viewer.projectPath)
  )
    fail('viewer.projectPath 未配置');
  if (!Array.isArray(config.groups) || !Array.isArray(config.pages))
    fail('必须配置 groups 与 pages 数组');
  const groups = new Set();
  for (const group of config.groups) {
    if (
      !safeId.test(group?.id || '') ||
      !group.title ||
      !Number.isInteger(group.order) ||
      groups.has(group.id)
    )
      fail('groups 中存在非法或重复项');
    groups.add(group.id);
  }
  const pages = new Set();
  for (const page of config.pages) {
    if (!safeId.test(page?.id || '') || pages.has(page.id) || groups.has(page.id))
      fail('pages 中存在非法或重复 id');
    documentPath(root, page.doc);
    if (!page.title || !groups.has(page.parent) || !Number.isInteger(page.order))
      fail(`页面 ${page.id} 的 parent、title 或 order 无效`);
    if (
      !['screen', 'drawer'].includes(page.mode) ||
      typeof page.hash !== 'string' ||
      !page.hash.startsWith('#/')
    )
      fail(`页面 ${page.id} 的 mode 或 hash 无效`);
    if (
      page.ready !== undefined &&
      (!page.ready ||
        typeof page.ready !== 'object' ||
        Array.isArray(page.ready) ||
        typeof page.ready.selector !== 'string' ||
        !page.ready.selector.trim() ||
        (page.ready.text !== undefined &&
          (typeof page.ready.text !== 'string' || !page.ready.text.trim())) ||
        Object.keys(page.ready).some((key) => !['selector', 'text'].includes(key)))
    )
      fail(`页面 ${page.id} 的 ready 必须包含 selector 和可选 text`);
    pages.add(page.id);
  }
  return config;
}

export function fragment(config) {
  const groups = config.groups.map((group) => ({
    ...group,
    id: `${config.sourceId}--${group.id}`,
    children: [],
  }));
  const byId = new Map(config.groups.map((group, index) => [group.id, groups[index]]));
  for (const page of config.pages) {
    const id = `${config.sourceId}--${page.id}`;
    byId.get(page.parent).children.push({
      id,
      title: page.title,
      order: page.order,
      templateType: page.mode,
      routeHash: page.hash,
      ...(page.ready ? { ready: page.ready } : {}),
      htmlPath: `.published/${config.sourceId}/pages/${page.id}.html`,
      mdPath: `.published/${config.sourceId}/desc/${page.doc}`,
      children: [],
    });
  }
  return { sourceId: config.sourceId, tree: groups };
}

// Review filenames use the same stable IDs as the manifest.
export function reviewTargets(config, review) {
  const targets = config.pages.map((page) => ({
    ...page,
    file: `review-${page.id}.html`,
  }));
  if (review === 'all') return targets;
  const target = targets.find((page) => page.id === review);
  if (!target)
    throw new Error(
      `不支持的评审页：${review}。可用值：all, ${targets.map((page) => page.id).join(', ')}`,
    );
  return [target];
}
