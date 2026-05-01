/**
 * Elens Design Tokens
 *
 * 这是设计系统的单一数据源。所有样式值都从这里导出。
 * 修改这里的值后，运行 `npm run sync-tokens` 同步到预览文件和文档。
 */

import type {
  ComponentTokens,
  DerivedSemanticTokens,
  ResolvedThemeConfig,
  ThemeBuildResult,
  ThemeConfig,
} from './types'

export const tokens = {
  // 背景色
  colors: {
    bg: {
      panel: '#111113',
      dropdown: 'rgba(30,30,30,1)',
      field: 'rgba(255,255,255,0.08)',
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
    panel: '16px',
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
      iconGlyphSize: '20px',
      iconGlyphSizeSm: '16px',
      textHeight: '24px',
      textHeightMd: '28px',
      textHeightLg: '32px',
    },
    input: {
      height: '24px',
      paddingX: '6px',
    },
    panel: {
      width: '320px',
      offset: '16px',
      headerPadding: '12px 16px',
      bodyPadding: '4px 16px 16px',
    },
    toolbar: {
      buttonGap: '6px',
      padding: '6px',
    },
    tooltip: {
      maxWidth: '320px',
      padding: '6px 10px',
    },
    dropdown: {
      minWidth: '150px',
      optionHeight: '24px',
      optionHeightLg: '28px',
      menuItemGap: '1px',
      padding: '8px',
    },
    menuItem: {
      heightLg: '32px',
      fontSizeLg: '13px',
    },
    annotate: {
      minHeight: '64px',
      maxHeight: '120px',
      padding: '12px',
    },
    buttonStyle: {
      textPaddingX: '12px',
    },
  },
} as const

export type DesignTokens = typeof tokens

export function resolveThemeConfig(input: ThemeConfig = {}): ResolvedThemeConfig {
  const accent = input.brand?.accent ?? input.accentColor ?? '#008AFF'

  return {
    brand: {
      accent,
    },
    surface: {
      base: input.surface?.base ?? tokens.colors.bg.panel,
    },
    contrast: input.contrast ?? 'normal',
    density: input.density ?? 'compact',
    radiusScale: input.radiusScale ?? 'normal',
    motion: input.motion ?? 'normal',
    typography: {
      fontFamily: input.typography?.fontFamily ?? tokens.typography.fontFamily,
      baseFontSize: input.typography?.baseFontSize ?? Number.parseInt(tokens.typography.fontSize.base, 10),
    },
    component: {
      panel: {
        width: input.component?.panel?.width ?? tokens.components.panel.width,
        radius: input.component?.panel?.radius ?? tokens.radius.panel,
      },
      field: {
        height: input.component?.field?.height ?? (input.density === 'comfortable' ? tokens.components.button.textHeightMd : tokens.components.input.height),
        radius: input.component?.field?.radius ?? ({
          sharp: tokens.radius.md,
          normal: tokens.radius.lg,
          soft: tokens.radius.xl,
        }[input.radiusScale ?? 'normal']),
      },
      dropdown: {
        optionHeight: input.component?.dropdown?.optionHeight ?? (input.density === 'comfortable' ? tokens.components.dropdown.optionHeightLg : tokens.components.dropdown.optionHeight),
      },
      toolbar: {
        buttonGap: input.component?.toolbar?.buttonGap ?? tokens.components.toolbar.buttonGap,
      },
    },
    zIndex: input.zIndex ?? 2147483647,
  }
}

type RgbColor = {
  r: number
  g: number
  b: number
}

const WHITE: RgbColor = { r: 255, g: 255, b: 255 }
const BLACK: RgbColor = { r: 0, g: 0, b: 0 }
const SUCCESS: RgbColor = { r: 0, g: 184, b: 148 }
const DANGER: RgbColor = { r: 231, g: 76, b: 60 }

const contrastScales = {
  soft: {
    textPrimary: 0.78,
    textSecondary: 0.58,
    textTertiary: 0.38,
    textMuted: 0.28,
    textFaint: 0.18,
    field: 0.045,
    hover: 0.065,
    hoverStrong: 0.095,
    active: 0.115,
    borderDefault: 0.075,
    borderSubtle: 0.055,
    borderInput: 0.11,
    borderHover: 0.095,
  },
  normal: {
    textPrimary: 0.85,
    textSecondary: 0.7,
    textTertiary: 0.45,
    textMuted: 0.35,
    textFaint: 0.25,
    field: 0.08,
    hover: 0.08,
    hoverStrong: 0.12,
    active: 0.14,
    borderDefault: 0.1,
    borderSubtle: 0.08,
    borderInput: 0.15,
    borderHover: 0.12,
  },
  strong: {
    textPrimary: 0.95,
    textSecondary: 0.82,
    textTertiary: 0.6,
    textMuted: 0.48,
    textFaint: 0.34,
    field: 0.08,
    hover: 0.11,
    hoverStrong: 0.16,
    active: 0.2,
    borderDefault: 0.15,
    borderSubtle: 0.11,
    borderInput: 0.22,
    borderHover: 0.18,
  },
} as const

function clamp(value: number, min = 0, max = 255): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeHex(value: string): string {
  const hex = value.trim().replace('#', '')

  if (hex.length === 3) {
    return hex
      .split('')
      .map((char) => char + char)
      .join('')
  }

  return hex.slice(0, 6)
}

function parseHexColor(value: string): RgbColor | null {
  const hex = normalizeHex(value)

  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return null
  }

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

function parseRgbColor(value: string): RgbColor | null {
  const match = value.trim().match(/^rgba?\(([^)]+)\)$/i)

  if (!match) {
    return null
  }

  const colorParts = match[1]

  if (colorParts == null) {
    return null
  }

  const parts = colorParts.split(',').slice(0, 3)

  if (parts.length < 3) {
    return null
  }

  const [r, g, b] = parts.map((part) => Number.parseFloat(part.trim()))

  if (r == null || g == null || b == null || [r, g, b].some((channel) => Number.isNaN(channel))) {
    return null
  }

  return {
    r: clamp(r),
    g: clamp(g),
    b: clamp(b),
  }
}

function parseColor(value: string): RgbColor | null {
  const normalized = value.trim().toLowerCase()

  if (normalized === 'black') {
    return BLACK
  }

  if (normalized === 'white') {
    return WHITE
  }

  if (normalized.startsWith('#')) {
    return parseHexColor(normalized)
  }

  if (normalized.startsWith('rgb')) {
    return parseRgbColor(normalized)
  }

  return null
}

function toRgba(color: RgbColor, alpha: number): string {
  return `rgba(${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)},${alpha})`
}

function toRgb(color: RgbColor): string {
  return `rgb(${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)})`
}

function mixColor(base: RgbColor, target: RgbColor, weight: number): RgbColor {
  const clampedWeight = Math.min(1, Math.max(0, weight))

  return {
    r: clamp(base.r + (target.r - base.r) * clampedWeight),
    g: clamp(base.g + (target.g - base.g) * clampedWeight),
    b: clamp(base.b + (target.b - base.b) * clampedWeight),
  }
}

function getLuminance(color: RgbColor): number {
  const channel = (value: number): number => {
    const normalized = value / 255
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
}

function getSurfacePalette(base: RgbColor, contrast: ResolvedThemeConfig['contrast']) {
  const isDarkSurface = getLuminance(base) < 0.32
  const contrastColor = isDarkSurface ? WHITE : BLACK
  const inverseColor = isDarkSurface ? BLACK : WHITE
  const blendTarget = isDarkSurface ? WHITE : BLACK
  const scale = contrastScales[contrast]

  const panel = toRgb(base)
  const dropdown = toRgb(mixColor(base, blendTarget, isDarkSurface ? 0.08 : 0.05))
  const toolbar = toRgb(mixColor(base, blendTarget, isDarkSurface ? 0.16 : 0.08))
  const ruler = toRgba(mixColor(base, blendTarget, isDarkSurface ? 0.06 : 0.12), 0.95)

  return {
    isDarkSurface,
    contrastColor,
    inverseColor,
    scale,
    panel,
    dropdown,
    toolbar,
    ruler,
    field: toRgba(contrastColor, scale.field),
    hover: toRgba(contrastColor, scale.hover),
    hoverStrong: toRgba(contrastColor, scale.hoverStrong),
    active: toRgba(contrastColor, scale.active),
    textPrimary: toRgba(contrastColor, scale.textPrimary),
    textSecondary: toRgba(contrastColor, scale.textSecondary),
    textTertiary: toRgba(contrastColor, scale.textTertiary),
    textMuted: toRgba(contrastColor, scale.textMuted),
    textFaint: toRgba(contrastColor, scale.textFaint),
    textInverse: toRgba(inverseColor, 0.92),
    borderDefault: toRgba(contrastColor, scale.borderDefault),
    borderSubtle: toRgba(contrastColor, scale.borderSubtle),
    borderInput: toRgba(contrastColor, scale.borderInput),
    borderHover: toRgba(contrastColor, scale.borderHover),
  }
}

export function deriveSemanticTokens(config: ResolvedThemeConfig): DerivedSemanticTokens {
  const accent = config.brand.accent
  const baseSurface = parseColor(config.surface.base) ?? parseColor(tokens.colors.bg.panel) ?? { r: 17, g: 17, b: 19 }
  const palette = getSurfacePalette(baseSurface, config.contrast)

  return {
    surface: {
      canvas: 'transparent',
      panel: palette.panel,
      dropdown: palette.dropdown,
      field: palette.field,
      hover: palette.hover,
      hoverStrong: palette.hoverStrong,
      active: palette.active,
      toolbar: palette.toolbar,
    },
    text: {
      primary: palette.textPrimary,
      secondary: palette.textSecondary,
      tertiary: palette.textTertiary,
      muted: palette.textMuted,
      faint: palette.textFaint,
      inverse: palette.textInverse,
    },
    border: {
      default: palette.borderDefault,
      subtle: palette.borderSubtle,
      input: palette.borderInput,
      hover: palette.borderHover,
      accent,
    },
    interactive: {
      accent,
      accentSoft: `color-mix(in srgb, ${accent} 12%, transparent)`,
      accentStrong: `color-mix(in srgb, ${accent} 24%, ${palette.isDarkSurface ? 'white' : 'black'})`,
      focusRing: accent,
      selection: `color-mix(in srgb, ${accent} 34%, var(--surface-hover))`,
      controlHandle: palette.textInverse,
      controlHandleBorder: `color-mix(in srgb, ${accent} 72%, ${palette.isDarkSurface ? 'white' : 'black'})`,
      controlHandleShadow: `0 2px 10px ${toRgba(BLACK, palette.isDarkSurface ? 0.3 : 0.18)}`,
    },
    feedback: {
      success: toRgba(SUCCESS, 0.9),
      successBg: toRgba(SUCCESS, 0.18),
      danger: toRgba(DANGER, 0.92),
      dangerBg: toRgba(DANGER, 0.18),
      purple: tokens.colors.semantic.purple,
      purpleBg: tokens.colors.semantic.purpleBg,
    },
    overlay: {
      margin: tokens.colors.semantic.margin,
      marginBg: `color-mix(in srgb, ${tokens.colors.semantic.margin} 45%, transparent)`,
      padding: tokens.colors.semantic.success,
      paddingStripe: `color-mix(in srgb, ${tokens.colors.semantic.success} 12%, transparent)`,
      content: `color-mix(in srgb, ${accent} 42%, cyan)`,
      move: accent,
      moveBg: `color-mix(in srgb, ${accent} 18%, transparent)`,
      guide: '#FF00FF',
      ruler: palette.ruler,
      labelText: toRgba(palette.contrastColor, 0.98),
      labelBg: accent,
    },
  }
}

export function deriveComponentTokens(_semantic: DerivedSemanticTokens, config: ResolvedThemeConfig): ComponentTokens {
  return {
    panel: {
      width: config.component.panel.width,
      radius: config.component.panel.radius,
      shadow: tokens.shadows.panel,
      offset: tokens.components.panel.offset,
      headerPadding: tokens.components.panel.headerPadding,
      bodyPadding: tokens.components.panel.bodyPadding,
    },
    field: {
      height: config.component.field.height,
      radius: config.component.field.radius,
      paddingX: tokens.components.input.paddingX,
    },
    button: {
      iconSize: tokens.components.button.iconSize,
      iconSizeSm: tokens.components.button.iconSizeSm,
      iconGlyphSize: tokens.components.button.iconGlyphSize,
      iconGlyphSizeSm: tokens.components.button.iconGlyphSizeSm,
      textHeight: tokens.components.button.textHeight,
      textHeightMd: tokens.components.button.textHeightMd,
      textHeightLg: tokens.components.button.textHeightLg,
      textPaddingX: tokens.components.buttonStyle.textPaddingX,
      radius: tokens.radius.xl,
    },
    dropdown: {
      minWidth: tokens.components.dropdown.minWidth,
      optionHeight: config.component.dropdown.optionHeight,
      optionHeightLg: tokens.components.dropdown.optionHeightLg,
      menuItemGap: tokens.components.dropdown.menuItemGap,
      padding: tokens.components.dropdown.padding,
    },
    menuItem: {
      heightLg: tokens.components.menuItem.heightLg,
      radiusLg: tokens.radius.xl,
      fontSizeLg: tokens.components.menuItem.fontSizeLg,
    },
    toolbar: {
      buttonGap: config.component.toolbar.buttonGap,
      padding: tokens.components.toolbar.padding,
    },
    tooltip: {
      maxWidth: tokens.components.tooltip.maxWidth,
      padding: tokens.components.tooltip.padding,
      radius: tokens.radius['3xl'],
    },
    annotate: {
      minHeight: tokens.components.annotate.minHeight,
      maxHeight: tokens.components.annotate.maxHeight,
      padding: tokens.components.annotate.padding,
      radius: tokens.radius.xl,
    },
  }
}

export function buildTheme(input: ThemeConfig = {}): ThemeBuildResult {
  const config = resolveThemeConfig(input)
  const semantic = deriveSemanticTokens(config)
  const components = deriveComponentTokens(semantic, config)

  return { config, semantic, components }
}

/**
 * 生成 CSS 变量字符串。
 * 第一阶段保留旧变量名，同时输出新语义变量名，避免现有 UI 回归。
 */
export function generateCSSVariables(theme: ThemeBuildResult): string {
  const { semantic, components, config } = theme
  const { shadows, radius, spacing, typography, animation } = tokens

  return `.ei-root,
.ei-capture-menu,
.ei-tooltip,
.ei-output-detail-menu,
.ei-dp-size-dropdown,
.ei-dp-fill-popover,
.ei-dp-font-dropdown,
.ei-dp-color-format-dropdown {
  /* Surface Colors */
  --surface-canvas: ${semantic.surface.canvas};
  --surface-panel: ${semantic.surface.panel};
  --surface-dropdown: ${semantic.surface.dropdown};
  --surface-field: ${semantic.surface.field};
  --surface-hover: ${semantic.surface.hover};
  --surface-hover-strong: ${semantic.surface.hoverStrong};
  --surface-active: ${semantic.surface.active};
  --surface-toolbar: ${semantic.surface.toolbar};

  /* Legacy Background Aliases */
  --bg-panel: ${semantic.surface.panel};
  --bg-dropdown: ${semantic.surface.dropdown};
  --bg-field: ${semantic.surface.field};
  --bg-hover: ${semantic.surface.hover};
  --bg-hover-strong: ${semantic.surface.hoverStrong};
  --bg-active: ${semantic.surface.active};
  --bg-toolbar: ${semantic.surface.toolbar};

  /* Text Colors */
  --text-primary: ${semantic.text.primary};
  --text-secondary: ${semantic.text.secondary};
  --text-tertiary: ${semantic.text.tertiary};
  --text-muted: ${semantic.text.muted};
  --text-faint: ${semantic.text.faint};
  --text-inverse: ${semantic.text.inverse};

  /* Border Colors */
  --border-default: ${semantic.border.default};
  --border-subtle: ${semantic.border.subtle};
  --border-input: ${semantic.border.input};
  --border-hover: ${semantic.border.hover};
  --border-accent: ${semantic.border.accent};

  /* Interactive Colors */
  --interactive-accent: ${semantic.interactive.accent};
  --interactive-accent-soft: ${semantic.interactive.accentSoft};
  --interactive-accent-strong: ${semantic.interactive.accentStrong};
  --interactive-focus-ring: ${semantic.interactive.focusRing};
  --interactive-selection: ${semantic.interactive.selection};
  --control-handle: ${semantic.interactive.controlHandle};
  --control-handle-border: ${semantic.interactive.controlHandleBorder};
  --control-handle-shadow: ${semantic.interactive.controlHandleShadow};
  --accent: ${semantic.interactive.accent};

  /* Overlay Colors */
  --overlay-margin: ${semantic.overlay.margin};
  --overlay-margin-bg: ${semantic.overlay.marginBg};
  --overlay-padding: ${semantic.overlay.padding};
  --overlay-padding-stripe: ${semantic.overlay.paddingStripe};
  --overlay-content: ${semantic.overlay.content};
  --overlay-move: ${semantic.overlay.move};
  --overlay-move-bg: ${semantic.overlay.moveBg};
  --overlay-guide: ${semantic.overlay.guide};
  --overlay-ruler: ${semantic.overlay.ruler};
  --overlay-label-text: ${semantic.overlay.labelText};
  --overlay-label-bg: ${semantic.overlay.labelBg};
  --margin: ${semantic.overlay.margin};
  --move: ${semantic.overlay.move};

  /* Feedback Colors */
  --success: ${semantic.feedback.success};
  --success-bg: ${semantic.feedback.successBg};
  --danger: ${semantic.feedback.danger};
  --danger-bg: ${semantic.feedback.dangerBg};
  --purple: ${semantic.feedback.purple};
  --purple-bg: ${semantic.feedback.purpleBg};

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
  --font-family: ${config.typography.fontFamily};
  --text-xs: ${typography.fontSize.xs};
  --text-sm: ${typography.fontSize.sm};
  --text-base: ${config.typography.baseFontSize}px;
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
  --duration-fast: ${config.motion === 'reduced' ? '0ms' : animation.duration.fast};
  --duration-normal: ${config.motion === 'reduced' ? '0ms' : animation.duration.normal};
  --duration-slow: ${config.motion === 'reduced' ? '0ms' : animation.duration.slow};
  --duration-slower: ${config.motion === 'reduced' ? '0ms' : animation.duration.slower};
  --ease-default: ${animation.ease.default};
  --ease-out: ${animation.ease.out};

  /* Component Sizes */
  --btn-icon-size: ${components.button.iconSize};
  --btn-icon-size-sm: ${components.button.iconSizeSm};
  --btn-icon-glyph-size: ${components.button.iconGlyphSize};
  --btn-icon-glyph-size-sm: ${components.button.iconGlyphSizeSm};
  --btn-text-height: ${components.button.textHeight};
  --btn-text-height-md: ${components.button.textHeightMd};
  --btn-text-height-lg: ${components.button.textHeightLg};
  --input-height: ${components.field.height};
  --field-radius: ${components.field.radius};
  --field-padding-x: ${components.field.paddingX};
  --panel-width: ${components.panel.width};
  --panel-radius: ${components.panel.radius};
  --panel-shadow: ${components.panel.shadow};
  --panel-offset: ${components.panel.offset};
  --panel-header-padding: ${components.panel.headerPadding};
  --panel-body-padding: ${components.panel.bodyPadding};
  --dropdown-min-width: ${components.dropdown.minWidth};
  --dropdown-option-height: ${components.dropdown.optionHeight};
  --dropdown-option-height-lg: ${components.dropdown.optionHeightLg};
  --dropdown-menu-item-gap: ${components.dropdown.menuItemGap};
  --dropdown-padding: ${components.dropdown.padding};
  --menu-item-height-lg: ${components.menuItem.heightLg};
  --menu-item-radius-lg: ${components.menuItem.radiusLg};
  --menu-item-font-size-lg: ${components.menuItem.fontSizeLg};
  --toolbar-button-gap: ${components.toolbar.buttonGap};
  --toolbar-padding: ${components.toolbar.padding};
  --tooltip-max-width: ${components.tooltip.maxWidth};
  --tooltip-padding: ${components.tooltip.padding};
  --tooltip-radius: ${components.tooltip.radius};
  --button-padding-x: ${components.button.textPaddingX};
  --button-radius: ${components.button.radius};
  --annotate-min-height: ${components.annotate.minHeight};
  --annotate-max-height: ${components.annotate.maxHeight};
  --annotate-padding: ${components.annotate.padding};
  --annotate-radius: ${components.annotate.radius};
}
`
}

/**
 * 导出 tokens 为 JSON 字符串
 */
export function exportTokensJSON(): string {
  return JSON.stringify(tokens, null, 2)
}