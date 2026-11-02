// Shared by standalone export and viewer publication. No dependency on the viewer skill.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';

const mimeTypes = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
const isInline = (value) => /^(data:|#)/i.test(value);
const escapeScript = (text) =>
  text.replace(/<\/script/gi, () => `<${String.fromCharCode(92)}/script`);
const escapeStyle = (text) => text.replace(/<\/style/gi, () => `<${String.fromCharCode(92)}/style`);
export const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

export function readBuildHtml(projectRoot) {
  const dist = resolve(projectRoot, 'dist');
  const index = resolve(dist, 'index.html');
  if (!existsSync(index)) throw new Error('未找到 dist/index.html，请先执行 npm run build');
  function assetPath(value, base = dist) {
    if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(value) || value.startsWith('/'))
      throw new Error(`离线资源必须是构建目录内的相对路径：${value}`);
    const file = resolve(base, decodeURIComponent(value.split(/[?#]/)[0]));
    const rel = relative(dist, file);
    if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`) || !existsSync(file))
      throw new Error(`构建资源缺失或越界：${value}`);
    return file;
  }
  function dataUri(value, base = dist) {
    if (isInline(value)) return value;
    const file = assetPath(value, base);
    return `data:${mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream'};base64,${readFileSync(file).toString('base64')}`;
  }
  function inlineCss(file) {
    return escapeStyle(
      readFileSync(file, 'utf8').replace(
        /url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g,
        (all, _quote, value) => (isInline(value) ? all : `url("${dataUri(value, dirname(file))}")`),
      ),
    );
  }
  let html = readFileSync(index, 'utf8');
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    const href = attr(tag, 'href');
    if (!href || isInline(href)) return tag;
    const rel = attr(tag, 'rel');
    if (rel === 'stylesheet') return `<style>${inlineCss(assetPath(href))}</style>`;
    if (rel === 'modulepreload') throw new Error('构建包含分包，请禁用代码分割后再导出单文件');
    if (rel?.includes('icon')) return tag.replace(href, dataUri(href));
    return tag;
  });
  html = html.replace(/<script\b[^>]*>\s*<\/script>/gi, (tag) => {
    const src = attr(tag, 'src');
    if (!src) return tag;
    let code = readFileSync(assetPath(src), 'utf8');
    if (/\b(?:from\s*|import\s*\(\s*)["']\.{1,2}\//.test(code))
      throw new Error('构建包含外部分包，请禁用代码分割后再导出单文件');
    // Vite emits imported image URLs as quoted assets/* paths in the entry bundle.
    code = code.replace(/(["'])(\.\/assets\/[^"']+|assets\/[^"']+)\1/g, (_all, _quote, value) =>
      JSON.stringify(dataUri(value)),
    );
    const type = attr(tag, 'type') === 'module' ? ' type="module"' : '';
    return `<script${type}>${escapeScript(code)}</script>`;
  });
  html = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = attr(tag, 'src');
    return src && !isInline(src) ? tag.replace(src, dataUri(src)) : tag;
  });
  if (/<(?:script|link)\b[^>]*(?:src|href)=["'](?:\.\/assets\/|assets\/|https?:\/\/)/i.test(html))
    throw new Error('构建产物仍有未内联的脚本或样式');
  return html;
}

export function pageHtml(html, page, { viewer = false } = {}) {
  const route = JSON.stringify(page.hash).replace(/</g, '\\u003c');
  const boot = `<script>window.__PROTOTYPE_INITIAL_ROUTE__=${route};if(!location.hash)location.hash=window.__PROTOTYPE_INITIAL_ROUTE__;</script>`;
  if (!/<body\b[^>]*>/i.test(html)) throw new Error('构建产物缺少 body，无法注入页面路由');
  // The viewer supplies navigation; standalone exports retain the business sidebar.
  if (viewer)
    html = html.replace(
      /<\/head>/i,
      '<style data-viewer-layout>.app-sider{display:none!important}</style></head>',
    );
  return html
    .replace(/<body\b[^>]*>/i, (tag) => `${tag}${boot}`)
    .replace(/<title>.*?<\/title>/is, `<title>${escapeHtml(page.title)}</title>`);
}
