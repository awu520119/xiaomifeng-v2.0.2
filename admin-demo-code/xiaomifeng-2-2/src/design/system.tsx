import type { ThemeConfig } from 'antd';
import design from '../../design/system.json';

export function createAdminTheme(): ThemeConfig {
  const { colors, typography, components } = design;
  return {
    token: {
      colorPrimary: colors.primary,
      colorText: colors.text,
      colorTextSecondary: colors.textSecondary,
      colorTextPlaceholder: colors.textPlaceholder,
      colorBorder: colors.border,
      colorSplit: colors.split,
      colorBgLayout: colors.background,
      colorBgContainer: colors.surface,
      colorError: colors.error,
      colorSuccess: colors.success,
      borderRadius: components.borderRadius,
      controlHeight: components.controlHeight,
      fontSize: typography.fontSize,
      lineHeight: typography.lineHeight,
      fontFamily: typography.fontFamily,
    },
    components: {
      Layout: { bodyBg: colors.background, headerBg: colors.background, siderBg: colors.navigationBackground },
      Menu: {
        darkItemBg: colors.navigationBackground, darkSubMenuItemBg: colors.navigationSubmenuBackground,
        darkItemColor: colors.navigationText, darkItemSelectedBg: colors.navigationSelectedBackground,
        darkItemSelectedColor: colors.navigationSelectedText, itemBorderRadius: components.menuItemBorderRadius,
        itemHeight: components.menuItemHeight,
      },
      Table: {
        headerBg: colors.tableHeaderBackground, headerColor: colors.textSecondary,
        cellPaddingBlock: components.tableCellPaddingBlock,
        cellPaddingInline: components.tableCellPaddingInline,
      },
      Pagination: { itemSize: components.paginationItemSize },
      Drawer: { paddingLG: components.drawerPadding },
    },
  };
}

export function applyAdminDesignVariables(): void {
  const root = document.documentElement;
  root.style.setProperty('--admin-color-primary', design.colors.primary);
  root.style.setProperty('--admin-color-text', design.colors.text);
  root.style.setProperty('--admin-color-text-secondary', design.colors.textSecondary);
  root.style.setProperty('--admin-color-text-placeholder', design.colors.textPlaceholder);
  root.style.setProperty('--admin-color-border', design.colors.border);
  root.style.setProperty('--admin-color-split', design.colors.split);
  root.style.setProperty('--admin-color-background', design.colors.background);
  root.style.setProperty('--admin-color-surface', design.colors.surface);
  root.style.setProperty('--admin-color-table-header', design.colors.tableHeaderBackground);
  root.style.setProperty('--admin-font-family', design.typography.fontFamily);
  root.style.setProperty('--admin-content-padding', `${design.layout.contentPadding}px`);
  root.style.setProperty('--admin-header-height', `${design.layout.headerHeight}px`);
}
