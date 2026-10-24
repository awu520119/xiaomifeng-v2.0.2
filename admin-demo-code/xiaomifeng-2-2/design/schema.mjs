import { readFileSync } from 'node:fs';

const path = new URL('./system.json', import.meta.url);
const config = JSON.parse(readFileSync(path, 'utf8'));
const fail = (message) => { throw new Error(`design/system.json: ${message}`); };
const object = (value, name) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
};
const number = (value, name, min, max) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${name} must be between ${min} and ${max}`);
};
const color = (value, name) => {
  if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) fail(`${name} must be a six-digit hex color`);
};

if (config.version !== 1) fail('unsupported version');
for (const section of ['colors', 'typography', 'layout', 'components']) object(config[section], section);
for (const key of ['primary', 'text', 'textSecondary', 'textPlaceholder', 'border', 'split', 'background', 'surface', 'error', 'success']) color(config.colors[key], `colors.${key}`);
for (const key of ['navigationBackground', 'navigationSubmenuBackground', 'navigationSelectedBackground', 'tableHeaderBackground']) color(config.colors[key], `colors.${key}`);
if (typeof config.colors.navigationText !== 'string' || typeof config.colors.navigationSelectedText !== 'string') fail('navigation text colors are required');
if (typeof config.typography.fontFamily !== 'string' || !config.typography.fontFamily.trim()) fail('typography.fontFamily is required');
number(config.typography.fontSize, 'typography.fontSize', 10, 24);
number(config.typography.lineHeight, 'typography.lineHeight', 1, 2.5);
for (const [key, min, max] of [['sidebarWidth', 160, 320], ['sidebarCollapsedWidth', 56, 120], ['headerHeight', 40, 96], ['contentPadding', 0, 64]]) number(config.layout[key], `layout.${key}`, min, max);
for (const [key, min, max] of [['borderRadius', 0, 16], ['controlHeight', 24, 56], ['menuItemHeight', 28, 64], ['menuItemBorderRadius', 0, 16], ['tableCellPaddingBlock', 0, 32], ['tableCellPaddingInline', 0, 32], ['paginationItemSize', 24, 48], ['drawerPadding', 0, 48]]) number(config.components[key], `components.${key}`, min, max);
console.log('design/system.json 校验通过');
