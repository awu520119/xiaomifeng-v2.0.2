// Validation for the shared design configuration; no UI or server dependencies.
const range = (min, max) => ({ range: [min, max] });
const choices = (...values) => ({ choices: values });
const schema = {
  version: { value: 3 },
  name: 'text',
  colors: Object.fromEntries(
    [
      'primary',
      'success',
      'warning',
      'error',
      'text',
      'muted',
      'placeholder',
      'border',
      'divider',
      'page',
      'surface',
      'helper',
      'input',
      'primaryLight',
      'primaryBorder',
      'successBg',
      'successBorder',
      'warningBg',
      'warningBorder',
      'errorBg',
      'errorBorder',
    ].map((key) => [key, 'color']),
  ),
  typography: {
    family: 'text',
    size: range(12, 20),
    lineHeight: range(18, 36),
    titleSize: range(16, 32),
    titleWeight: range(400, 800),
    helperSize: range(11, 16),
    drawerTitleSize: range(14, 24),
  },
  layout: {
    pagePadding: range(8, 48),
    pageGap: range(4, 32),
    cardPadding: range(8, 32),
    scrollMode: choices('table', 'page'),
  },
  navigation: {
    mode: choices('dark', 'light'),
    darkBackground: 'color',
    darkSubmenu: 'color',
    darkItemText: 'color',
    darkText: 'color',
    darkMuted: 'color',
    width: range(180, 320),
    collapsedWidth: range(56, 100),
    itemHeight: range(32, 56),
    showBrand: 'boolean',
    brand: 'text',
    subtitle: 'text',
  },
  header: {
    visible: 'boolean',
    height: range(44, 88),
    background: 'color',
    showAccount: 'boolean',
    border: 'boolean',
  },
  controls: {
    height: range(28, 44),
    radius: range(0, 16),
    cardRadius: range(0, 20),
    cardShadow: 'boolean',
    queryWidth: range(200, 420),
    queryButtonWidth: range(32, 60),
  },
  table: {
    paddingBlock: range(6, 24),
    paddingInline: range(8, 24),
    headerBackground: 'color',
    headerText: 'color',
    paginationGap: range(8, 32),
  },
  form: {
    itemGap: range(8, 32),
    columnGap: range(8, 32),
    columns: choices(1, 2),
    labelPosition: choices('vertical', 'horizontal'),
  },
  drawer: {
    formWidth: range(480, 1000),
    detailWidth: range(480, 1200),
    padding: range(12, 40),
    headerHeight: range(48, 80),
    headerTint: 'boolean',
    footerShadow: 'boolean',
  },
};

export function validateDesign(config) {
  const errors = [];
  function visit(value, rule, path) {
    let valid;
    if (rule === 'text')
      valid = typeof value === 'string' && value.trim().length > 0 && value.length <= 240;
    else if (rule === 'color') valid = typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
    else if (rule === 'boolean') valid = typeof value === 'boolean';
    else if (rule.range)
      valid = Number.isInteger(value) && value >= rule.range[0] && value <= rule.range[1];
    else if (rule.choices) valid = rule.choices.includes(value);
    else if (Object.hasOwn(rule, 'value')) valid = value === rule.value;
    else {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${path || '设计配置'} 必须是对象`);
        return;
      }
      for (const key of Object.keys(value))
        if (!Object.hasOwn(rule, key)) errors.push(`未知设计参数：${path ? `${path}.` : ''}${key}`);
      for (const [key, child] of Object.entries(rule))
        visit(value[key], child, path ? `${path}.${key}` : key);
      return;
    }
    if (!valid) errors.push(`${path} 的值无效`);
  }
  visit(config, schema, '');
  if (config?.typography?.lineHeight < config?.typography?.size)
    errors.push('正文行高不能小于字号');
  if (errors.length)
    throw new Error(
      errors.slice(0, 5).join('；') + (errors.length > 5 ? `（另有 ${errors.length - 5} 项）` : ''),
    );
  return structuredClone(config);
}
