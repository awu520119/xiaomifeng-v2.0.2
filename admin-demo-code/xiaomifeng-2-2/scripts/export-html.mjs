import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = new URL('../dist/', import.meta.url);
const index = readFileSync(new URL('index.html', dist), 'utf8');
const assets = new Set();
let html = index.replace(/<(link|script)\b[^>]*(?:href|src)="\.\/assets\/([^"]+)"[^>]*>(?:\s*<\/script>)?/g, (tag, kind, file) => {
  assets.add(file);
  const content = readFileSync(new URL(`assets/${file}`, dist), 'utf8');
  return kind === 'link' ? `<style>\n${content}\n</style>` : `<script type="module">\n${content}\n</script>`;
});

if (!assets.size || !html.includes('<script type="module">') || /(?:src|href)="(?:\.\/assets\/|https?:\/\/)/i.test(html)) {
  throw new Error('离线导出失败：资源未完整内联');
}
const output = join(fileURLToPath(dist), 'admin-share.html');
writeFileSync(output, html, 'utf8');
console.log(`已导出 ${output}`);
