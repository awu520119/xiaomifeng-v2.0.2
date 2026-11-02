// 将 Vite 构建产物内联为可离线双击打开的完整项目单页。
// 默认输出 dist/admin-share.html；评审页通过 --review=<name> 或 --review=all 输出。
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBuildHtml, pageHtml } from './build-html.mjs';
import { readConfig, reviewTargets } from './publication.mjs';

const root = dirname(fileURLToPath(import.meta.url)) + '/..';
const dist = join(root, 'dist');
const review = process.argv.find((arg) => arg.startsWith('--review='))?.split('=')[1];
const html = readBuildHtml(root);

const shareFile = join(dist, 'admin-share.html');
writeFileSync(shareFile, html);
console.log(`已生成：${shareFile}`);

if (review) {
  for (const target of reviewTargets(readConfig(root, { requireViewer: false }), review)) {
    const output = join(dist, target.file);
    writeFileSync(output, pageHtml(html, target));
    console.log(`已生成评审页：${output}`);
  }
}
