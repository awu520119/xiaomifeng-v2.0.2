import type { ThemeConfig } from 'antd';
import design from '../../design/system.json';

export function createAdminTheme(): ThemeConfig {
  const { colors, typography, controls, navigation, table, drawer } = design;
  return {
    token: {
      colorPrimary: colors.primary,
      colorText: colors.text,
      colorTextSecondary: colors.muted,
      colorTextTertiary: colors.helper,
      colorTextPlaceholder: colors.placeholder,
      colorBorder: colors.border,
      colorSplit: colors.divider,
      colorBgLayout: colors.page,
      colorBgContainer: colors.surface,
      colorError: colors.error,
      colorSuccess: colors.success,
      colorWarning: colors.warning,
      borderRadius: controls.radius,
      controlHeight: controls.height,
      fontSize: typography.size,
      lineHeight: typography.lineHeight / typography.size,
      fontFamily: typography.family,
    },
    components: {
      Layout: { bodyBg: colors.page, headerBg: design.header.background, siderBg: navigation.darkBackground },
      Menu: {
        darkItemBg: navigation.darkBackground, darkSubMenuItemBg: navigation.darkSubmenu,
        darkItemColor: navigation.darkItemText, darkItemSelectedBg: colors.primary,
        darkItemSelectedColor: navigation.darkText, itemBorderRadius: controls.radius,
        itemHeight: navigation.itemHeight,
      },
      Table: {
        headerBg: table.headerBackground, headerColor: table.headerText,
        cellPaddingBlock: table.paddingBlock,
        cellPaddingInline: table.paddingInline,
      },
      Pagination: { itemSize: controls.height },
      Input: { colorBgContainer: colors.input },
      Select: { colorBgContainer: colors.input },
      Drawer: { paddingLG: drawer.padding },
    },
  };
}

export function applyAdminDesignVariables(): void {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(design.colors)) root.style.setProperty(`--admin-color-${name}`, value);
  root.style.setProperty('--admin-color-primary', design.colors.primary);
  root.style.setProperty('--admin-color-text', design.colors.text);
  root.style.setProperty('--admin-color-text-secondary', design.colors.muted);
  root.style.setProperty('--admin-color-text-placeholder', design.colors.placeholder);
  root.style.setProperty('--admin-color-border', design.colors.border);
  root.style.setProperty('--admin-color-split', design.colors.divider);
  root.style.setProperty('--admin-color-background', design.colors.page);
  root.style.setProperty('--admin-color-surface', design.colors.surface);
  root.style.setProperty('--admin-color-table-header', design.table.headerBackground);
  root.style.setProperty('--admin-font-family', design.typography.family);
  root.style.setProperty('--admin-content-padding', `${design.layout.pagePadding}px`);
  root.style.setProperty('--admin-header-height', `${design.header.height}px`);
  root.style.setProperty('--admin-header-background', design.header.background);
  root.style.setProperty('--admin-card-padding', `${design.layout.cardPadding}px`);
  root.style.setProperty('--admin-card-radius', `${design.controls.cardRadius}px`);
  root.style.setProperty('--admin-page-gap', `${design.layout.pageGap}px`);
  root.style.setProperty('--admin-table-header-text', design.table.headerText);
  root.style.setProperty('--admin-form-gap', `${design.form.itemGap}px`);
}
