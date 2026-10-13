// 将页面、PRD 与目录片段安全发布到配套 prototype-viewer。
import {
  closeSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync,
  readFileSync, readdirSync, renameSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(root, 'prototype-pages.json');
const safeId = /^[a-z][a-z0-9-]*$/;

function fail(message) {
  throw new Error(`发布失败：${message}`);
}

function readConfig() {
  if (!existsSync(configPath)) fail(`找不到 ${configPath}`);
  let config;
  try { config = JSON.parse(readFileSync(configPath, 'utf8')); } catch (error) { fail(`页面清单不是合法 JSON：${error.message}`); }
  if (!safeId.test(config?.sourceId || '')) fail('sourceId 必须是 kebab-case');
  if (typeof config?.viewer?.projectPath !== 'string' || !config.viewer.projectPath) fail('viewer.projectPath 未配置');
  if (!Array.isArray(config.groups) || !Array.isArray(config.pages)) fail('必须配置 groups 与 pages 数组');
  const groups = new Set();
  for (const group of config.groups) {
    if (!safeId.test(group?.id || '') || !group.title || !Number.isInteger(group.order) || groups.has(group.id)) fail('groups 中存在非法或重复项');
    groups.add(group.id);
  }
  const pages = new Set();
  const docs = new Set();
  for (const page of config.pages) {
    if (!safeId.test(page?.id || '') || pages.has(page.id)) fail('pages 中存在非法或重复 id');
    if (!/^[^/\\]+\.md$/.test(page.doc || '') || docs.has(page.doc)) fail(`页面 ${page.id} 的 doc 必须是唯一的 Markdown 文件名`);
    if (!page.title || !groups.has(page.parent) || !Number.isInteger(page.order)) fail(`页面 ${page.id} 的 parent、title 或 order 无效`);
    if (!['screen', 'drawer'].includes(page.mode) || typeof page.hash !== 'string' || !page.hash.startsWith('#/')) fail(`页面 ${page.id} 的 mode 或 hash 无效`);
    if (page.mode === 'drawer' && !page.hash.startsWith('#/demo/export/')) fail(`抽屉页 ${page.id} 必须使用 #/demo/export/ 路由`);
    pages.add(page.id); docs.add(page.doc);
  }
  return config;
}

function inside(base, target) {
  const rel = relative(base, target);
  return rel && rel !== '..' && !rel.startsWith(`..${sep}`);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error || result.status !== 0) fail(`${command} ${args.join(' ')} 未成功执行`);
}

function inlineBuild() {
  const dist = join(root, 'dist');
  const assetDir = join(dist, 'assets');
  const index = join(dist, 'index.html');
  if (!existsSync(index)) fail('未找到 dist/index.html，请先执行 npm run build');
  const assets = existsSync(assetDir) ? new Set(readdirSync(assetDir)) : new Set();
  const asset = (file) => readFileSync(join(assetDir, file), 'utf8');
  let html = readFileSync(index, 'utf8');
  html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="\.\/assets\/([^"]+)"[^>]*>/g, (all, file) => {
    if (!assets.has(file)) fail(`构建资源缺失：${file}`);
    return `<style>${asset(file)}</style>`;
  });
  html = html.replace(/<script[^>]*type="module"[^>]*src="\.\/assets\/([^"]+)"[^>]*>\s*<\/script>/g, (all, file) => {
    if (!assets.has(file)) fail(`构建资源缺失：${file}`);
    return `<script type="module">\n${asset(file)}\n</script>`;
  });
  if (/<(?:script|link)\b[^>]*(?:src|href)="\.\/assets\//i.test(html)) fail('构建产物仍有未内联资源');
  if (!html.includes('<script type="module">')) fail('构建产物缺少已内联的入口脚本');
  return html;
}

function pageHtml(html, page) {
  const boot = `<script>if(!location.hash)location.hash=${JSON.stringify(page.hash)};</script>`;
  const staticStyle = '<style>body.prd-static-page .app-sider{display:none!important}body.prd-static-page .app-workspace{width:100%!important}</style>';
  return html
    .replace('<body>', `<body class="prd-static-page">${staticStyle}${boot}`)
    .replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`);
}

function fragment(config) {
  const groups = config.groups.map((group) => ({ ...group, id: `${config.sourceId}--${group.id}`, children: [] }));
  const byId = new Map(config.groups.map((group, index) => [group.id, groups[index]]));
  for (const page of config.pages) {
    const id = `${config.sourceId}--${page.id}`;
    byId.get(page.parent).children.push({
      id, title: page.title, order: page.order, templateType: page.mode, routeHash: page.hash,
      htmlPath: `.published/${config.sourceId}/pages/${page.id}.html`,
      mdPath: `.published/${config.sourceId}/desc/${page.doc}`,
      children: [],
    });
  }
  return { sourceId: config.sourceId, tree: groups };
}

function leafIds(fragmentData) {
  const ids = [];
  const walk = (nodes) => nodes.forEach((node) => { if (node.htmlPath) ids.push(node.id); walk(node.children || []); });
  walk(fragmentData?.tree || []);
  return ids;
}

function snapshotGenerated(viewer) {
  const files = new Map();
  for (const name of ['nav.json', 'nav.js']) {
    const path = join(viewer, name);
    if (existsSync(path)) files.set(name, readFileSync(path));
  }
  const desc = join(viewer, 'desc');
  const descriptions = new Map();
  if (existsSync(desc)) {
    for (const name of readdirSync(desc).filter((name) => name.endsWith('.html'))) {
      descriptions.set(name, readFileSync(join(desc, name)));
    }
  }
  return { files, descriptions };
}

function restoreGenerated(viewer, sourceId, snapshot) {
  for (const name of ['nav.json', 'nav.js']) {
    const path = join(viewer, name);
    if (snapshot.files.has(name)) writeFileSync(path, snapshot.files.get(name));
    else if (existsSync(path)) rmSync(path);
  }
  const desc = join(viewer, 'desc');
  for (const name of readdirSync(desc).filter((name) => name.endsWith('.html'))) {
    if (name.startsWith(`${sourceId}--`) && !snapshot.descriptions.has(name)) rmSync(join(desc, name));
  }
  for (const [name, content] of snapshot.descriptions) writeFileSync(join(desc, name), content);
}

function main() {
  const config = readConfig();
  const viewer = resolve(root, config.viewer.projectPath);
  if (!existsSync(join(viewer, '.prototype-viewer.json'))) fail(`目标不是受控查看器：${viewer}`);
  const publishedRoot = join(viewer, '.published');
  const target = join(publishedRoot, config.sourceId);
  if (!inside(publishedRoot, target)) fail('发布目标路径异常');
  for (const page of config.pages) {
    if (!existsSync(join(root, 'docs', page.doc))) fail(`找不到 PRD：docs/${page.doc}`);
  }
  const html = inlineBuild();
  mkdirSync(publishedRoot, { recursive: true });
  const lockPath = join(publishedRoot, '.publish-lock');
  let lock;
  try { lock = openSync(lockPath, 'wx'); } catch (error) {
    if (error.code === 'EEXIST') fail(`查看器已有发布任务；若确认没有任务运行，再检查 ${lockPath}`);
    fail(`无法创建发布锁：${error.message}`);
  }
  closeSync(lock);
  let stage;
  const backup = join(publishedRoot, `.${config.sourceId}-backup-${process.pid}`);
  let movedOriginal = false;
  let movedStage = false;
  let published = false;
  let snapshotGeneratedBefore;
  try {
    stage = mkdtempSync(join(publishedRoot, `.${config.sourceId}-stage-`));
    if (existsSync(backup)) fail(`备份目录已存在，请先检查：${backup}`);
    const previous = existsSync(join(target, 'nav.fragment.json')) ? JSON.parse(readFileSync(join(target, 'nav.fragment.json'), 'utf8')) : null;
    snapshotGeneratedBefore = snapshotGenerated(viewer);
    mkdirSync(join(stage, 'pages'));
    mkdirSync(join(stage, 'desc'));
    for (const page of config.pages) {
      writeFileSync(join(stage, 'pages', `${page.id}.html`), pageHtml(html, page), 'utf8');
      copyFileSync(join(root, 'docs', page.doc), join(stage, 'desc', page.doc));
    }
    writeFileSync(join(stage, 'nav.fragment.json'), `${JSON.stringify(fragment(config), null, 2)}\n`, 'utf8');
    run('python3', ['scripts/smoke_published.py', stage], viewer);
    if (existsSync(target)) { renameSync(target, backup); movedOriginal = true; }
    renameSync(stage, target);
    movedStage = true;
    run('python3', ['scripts/sync_project.py', '.', '--verbose'], viewer);
    const current = new Set(leafIds(fragment(config)));
    for (const id of leafIds(previous)) {
      if (!id.startsWith(`${config.sourceId}--`) || !safeId.test(id.slice(config.sourceId.length + 2))) {
        fail(`上次发布记录包含非法节点 id：${id}`);
      }
      if (!current.has(id)) rmSync(join(viewer, 'desc', `${id}.html`), { force: true });
    }
    published = true;
  } catch (error) {
    if (movedOriginal || movedStage) {
      try {
        if (movedStage) rmSync(target, { recursive: true });
        if (movedOriginal) renameSync(backup, target);
        restoreGenerated(viewer, config.sourceId, snapshotGeneratedBefore);
      } catch (rollbackError) {
        fail(`${error.message}；自动恢复失败：${rollbackError.message}。原发布备份保留在 ${backup}`);
      }
    }
    throw error;
  } finally {
    if (stage && existsSync(stage)) rmSync(stage, { recursive: true, force: true });
    rmSync(lockPath, { force: true });
  }
  if (published && existsSync(backup)) rmSync(backup, { recursive: true, force: true });
  console.log(`✅ 已发布 ${config.pages.length} 个页面到 ${viewer}`);
}

try { main(); } catch (error) { console.error(`❌ ${error.message}`); process.exit(1); }
