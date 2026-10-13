import { readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const distDir = resolve('dist');
const indexPath = resolve(distDir, 'index.html');
let html = await readFile(indexPath, 'utf8');

const styleMatch = html.match(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)">/);
const scriptMatch = html.match(/<script type="module"[^>]*src="\.\/([^"]+)"><\/script>/);

if (!styleMatch || !scriptMatch) {
  throw new Error('未找到 Vite 构建后的 CSS 或 JS 资源引用');
}

const [css, js] = await Promise.all([
  readFile(resolve(distDir, styleMatch[1]), 'utf8'),
  readFile(resolve(distDir, scriptMatch[1]), 'utf8'),
]);

const safeJs = js.replace(/<\/script/gi, () => `<${String.fromCharCode(92)}/script`);

html = html
  .replace(styleMatch[0], () => `<style>${css}</style>`)
  .replace(scriptMatch[0], () => `<script type="module">${safeJs}</script>`);

await writeFile(indexPath, html, 'utf8');
// HTML 已经不再引用 Vite 生成的 assets；保留它们只会让分享包重复一份 JS/CSS。
await rm(resolve(distDir, 'assets'), { recursive: true, force: true });
console.log('dist/index.html 已内联 JS/CSS，并清理重复 assets，可通过 file:// 离线打开');
