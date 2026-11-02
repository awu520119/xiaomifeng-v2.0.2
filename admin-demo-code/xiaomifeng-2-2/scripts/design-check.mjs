import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateDesign } from '../design/schema.mjs';
const file = fileURLToPath(new URL('../design/system.json', import.meta.url));
const design = validateDesign(JSON.parse(readFileSync(file, 'utf8')));
console.log(`设计配置通过：${design.name}`);
