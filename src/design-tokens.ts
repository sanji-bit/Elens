/**
 * Elens Design Tokens
 *
 * 这是设计系统的单一数据源。所有样式值都从这里导出。
 * 修改这里的值后，运行 `npm run sync-tokens` 同步到预览文件和文档。
 */

export const tokens = {
  // 背景色
  colors: {
    bg: {
      panel: '#111113',
      dropdown: 'rgba(30,30,30,1)',
      field: 'rgba(255,255,255,0.06)',
      hover: 'rgba(255,255,255,0.08)',
      hoverStrong: 'rgba(255,255,255,0.12)',
      active: 'rgba(255,255,255,0.14)',
      toolbar: 'black',
    },
    // 文字色
    text: {
      primary: 'rgba(255,255,255,0.85)',
      secondary: 'rgba(255,255,255,0.7)',
      tertiary: 'rgba(255,255,255,0.45)',
      muted: 'rgba(255,255,255,0.35)',
      faint: 'rgba(255,255,255,0.25)',
    },
    // 边框色
    border: {
      default: 'rgba(255,255,255,0.1)',
      subtle: 'rgba(255,255,255,0.08)',
      input: 'rgba(255,255,255,0.15)',
      hover: 'rgba(255,255,255,0.12)',
    },
    // 语义色
    semantic: {
      margin: '#E17055',
      move: '#FF00FF',
      success: 'rgba(0,184,148,0.9)',
      successBg: 'rgba(0,184,148,0.18)',
      purple: '#6C5CE7',
      purpleBg: 'rgba(108,92,231,0.22)',
    },
  },

  // 阴影
  shadows: {
    panel: '0 20px 50px rgba(0,0,0,0.55)',
    dropdown: '0px 10px 16px rgba(0,0,0,0.35), 0px 2px 5px rgba(0,0,0,0.35)',
    toolbar: '0px 2px 8px rgba(0,0,0,0.24), 0px 1px 24px rgba(0,0,0,0.24)',
    inset: 'inset 0px 0.5px 0px rgba(255,255,255,0.08), inset 0px 0px 0.5px rgba(255,255,255,0.35)',
  },

  // 圆角
  radius: {
    xs: '2px',
    sm: '3px',
    md: '4px',
    lg: '5px',
    xl: '8px',
    '2xl': '10px',
    '3xl': '12px',
    '4xl': '13px',
    panel: '18px',
    full: '9999px',
  },

  // 间距
  spacing: {
    1: '2px',
    2: '4px',
    3: '6px',
    4: '8px',
    5: '10px',
    6: '12px',
    8: '16px',
    10: '20px',
  },

  // 排版
  typography: {
    fontSize: {
      xs: '9px',
      sm: '10px',
      base: '11px',
      lg: '12px',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      none: '1',
      tight: '1.4',
      normal: '1.5',
      relaxed: '1.6',
    },
    letterSpacing: {
      tight: '0.005px',
      normal: '0.055px',
      wide: '0.08em',
      wider: '0.11px',
    },
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  // 动效
  animation: {
    duration: {
      fast: '100ms',
      normal: '120ms',
      slow: '150ms',
      slower: '160ms',
    },
    ease: {
      default: 'ease',
      out: 'ease-out',
    },
  },

  // 组件尺寸
  components: {
    button: {
      iconSize: '32px',
      iconSizeSm: '24px',
      textHeight: '24px',
      textHeightMd: '28px',
      textHeightLg: '32px',
    },
    input: {
      height: '24px',
    },
    panel: {
      width: '320px',
    },
    toolbar: {
      buttonGap: '6px',
      padding: '6px',
    },
    tooltip: {
      maxWidth: '320px',
    },
    dropdown: {
      minWidth: '150px',
      optionHeight: '24px',
      optionHeightLg: '28px',
    },
  },
} as const

export type DesignTokens = typeof tokens

/**
 * 生成 CSS 变量字符串
 * @param accentColor 可选的主题色，默认使用 tokens 中未定义（需要运行时传入）
 */
export function generateCSSVariables(accentColor: string): string {
  const { colors, shadows, radius, spacing, typography, animation, components } = tokens

  return `:root {
  /* Background Colors */
  --bg-panel: ${colors.bg.panel};
  --bg-dropdown: ${colors.bg.dropdown};
  --bg-field: ${colors.bg.field};
  --bg-hover: ${colors.bg.hover};
  --bg-hover-strong: ${colors.bg.hoverStrong};
  --bg-active: ${colors.bg.active};
  --bg-toolbar: ${colors.bg.toolbar};

  /* Text Colors */
  --text-primary: ${colors.text.primary};
  --text-secondary: ${colors.text.secondary};
  --text-tertiary: ${colors.text.tertiary};
  --text-muted: ${colors.text.muted};
  --text-faint: ${colors.text.faint};

  /* Border Colors */
  --border-default: ${colors.border.default};
  --border-subtle: ${colors.border.subtle};
  --border-input: ${colors.border.input};
  --border-hover: ${colors.border.hover};

  /* Semantic Colors */
  --accent: ${accentColor};
  --margin: ${colors.semantic.margin};
  --move: ${colors.semantic.move};
  --success: ${colors.semantic.success};
  --success-bg: ${colors.semantic.successBg};
  --purple: ${colors.semantic.purple};
  --purple-bg: ${colors.semantic.purpleBg};

  /* Shadows */
  --shadow-panel: ${shadows.panel};
  --shadow-dropdown: ${shadows.dropdown};
  --shadow-toolbar: ${shadows.toolbar};
  --shadow-inset: ${shadows.inset};

  /* Border Radius */
  --radius-xs: ${radius.xs};
  --radius-sm: ${radius.sm};
  --radius-md: ${radius.md};
  --radius-lg: ${radius.lg};
  --radius-xl: ${radius.xl};
  --radius-2xl: ${radius['2xl']};
  --radius-3xl: ${radius['3xl']};
  --radius-4xl: ${radius['4xl']};
  --radius-panel: ${radius.panel};
  --radius-full: ${radius.full};

  /* Spacing */
  --space-1: ${spacing[1]};
  --space-2: ${spacing[2]};
  --space-3: ${spacing[3]};
  --space-4: ${spacing[4]};
  --space-5: ${spacing[5]};
  --space-6: ${spacing[6]};
  --space-8: ${spacing[8]};
  --space-10: ${spacing[10]};

  /* Typography */
  --font-family: ${typography.fontFamily};
  --text-xs: ${typography.fontSize.xs};
  --text-sm: ${typography.fontSize.sm};
  --text-base: ${typography.fontSize.base};
  --text-lg: ${typography.fontSize.lg};
  --font-normal: ${typography.fontWeight.normal};
  --font-medium: ${typography.fontWeight.medium};
  --font-semibold: ${typography.fontWeight.semibold};
  --font-bold: ${typography.fontWeight.bold};
  --leading-none: ${typography.lineHeight.none};
  --leading-tight: ${typography.lineHeight.tight};
  --leading-normal: ${typography.lineHeight.normal};
  --leading-relaxed: ${typography.lineHeight.relaxed};
  --tracking-tight: ${typography.letterSpacing.tight};
  --tracking-normal: ${typography.letterSpacing.normal};
  --tracking-wide: ${typography.letterSpacing.wide};
  --tracking-wider: ${typography.letterSpacing.wider};

  /* Animation */
  --duration-fast: ${animation.duration.fast};
  --duration-normal: ${animation.duration.normal};
  --duration-slow: ${animation.duration.slow};
  --duration-slower: ${animation.duration.slower};
  --ease-default: ${animation.ease.default};
  --ease-out: ${animation.ease.out};

  /* Component Sizes */
  --btn-icon-size: ${components.button.iconSize};
  --btn-icon-size-sm: ${components.button.iconSizeSm};
  --btn-text-height: ${components.button.textHeight};
  --input-height: ${components.input.height};
  --panel-width: ${components.panel.width};
  --dropdown-min-width: ${components.dropdown.minWidth};
  --tooltip-max-width: ${components.tooltip.maxWidth};
}
`
}

/**
 * 导出 tokens 为 JSON 字符串
 */
export function exportTokensJSON(): string {
  return JSON.stringify(tokens, null, 2)
}