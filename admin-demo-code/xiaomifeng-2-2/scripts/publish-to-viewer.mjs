// Build a package; the viewer owns committing and restoring its files.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readBuildHtml, pageHtml } from './build-html.mjs';
import { readConfig, fragment } from './publication.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error || result.status !== 0)
    throw new Error(`${command} ${args.join(' ')} 未成功执行`);
}
function main() {
  const config = readConfig(root);
  const viewer = resolve(root, config.viewer.projectPath);
  const marker = JSON.parse(readFileSync(join(viewer, '.prototype-viewer.json'), 'utf8'));
  if (marker.schemaVersion !== 1 || marker.toolkitVersion !== 5)
    throw new Error('查看器工具版本不兼容，请按维护说明升级到版本 5');
  const venv = join(viewer, '.venv/bin/python');
  const python = existsSync(venv) ? venv : 'python3';
  run(python, ['scripts/doctor.py', '--browser'], viewer);
  const stage = mkdtempSync(join(tmpdir(), 'admin-publication-'));
  try {
    mkdirSync(join(stage, 'pages'));
    const html = readBuildHtml(root);
    for (const page of config.pages)
      writeFileSync(
        join(stage, 'pages', `${page.id}.html`),
        pageHtml(html, page, { viewer: true }),
      );
    run(
      python,
      [
        'scripts/package_docs.py',
        join(root, 'docs'),
        join(stage, 'desc'),
        JSON.stringify(config.pages.map((page) => page.doc)),
      ],
      viewer,
    );
    writeFileSync(
      join(stage, 'nav.fragment.json'),
      JSON.stringify(fragment(config), null, 2) + '\n',
    );
    run(python, ['scripts/receive_publication.py', '.', stage], viewer);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
  console.log(`✅ 已发布 ${config.pages.length} 个页面到 ${viewer}`);
}
try {
  main();
} catch (error) {
  console.error(`❌ 发布失败：${error.message}`);
  process.exit(1);
}
