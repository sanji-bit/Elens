/**
 * 同步设计 Tokens 脚本
 *
 * 从 src/design-tokens.ts 读取 tokens，生成：
 * 1. design-system-preview.html 的 CSS 变量部分
 * 2. DESIGN_SYSTEM.md 文档（可选）
 *
 * 运行方式: npx tsx scripts/sync-tokens.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Tokens 定义 - 与 src/design-tokens.ts 保持同步
const tokens = {
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
    text: {
      primary: 'rgba(255,255,255,0.85)',
      secondary: 'rgba(255,255,255,0.7)',
      tertiary: 'rgba(255,255,255,0.45)',
      muted: 'rgba(255,255,255,0.35)',
      faint: 'rgba(255,255,255,0.25)',
    },
    border: {
      default: 'rgba(255,255,255,0.1)',
      subtle: 'rgba(255,255,255,0.08)',
      input: 'rgba(255,255,255,0.15)',
      hover: 'rgba(255,255,255,0.12)',
    },
    semantic: {
      accent: '#0C8CE9',
      margin: '#E17055',
      move: '#FF00FF',
      success: 'rgba(0,184,148,0.9)',
      successBg: 'rgba(0,184,148,0.18)',
      purple: '#6C5CE7',
      purpleBg: 'rgba(108,92,231,0.22)',
    },
  },
  shadows: {
    panel: '0 20px 50px rgba(0,0,0,0.55)',
    dropdown: '0px 10px 16px rgba(0,0,0,0.35), 0px 2px 5px rgba(0,0,0,0.35)',
    toolbar: '0px 2px 8px rgba(0,0,0,0.24), 0px 1px 24px rgba(0,0,0,0.24)',
    inset: 'inset 0px 0.5px 0px rgba(255,255,255,0.08), inset 0px 0px 0.5px rgba(255,255,255,0.35)',
  },
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
}

function generateCSSVariables(): string {
  const { colors, shadows, radius, spacing, typography, animation } = tokens

  return `    :root {
      /* 背景色 */
      --bg-panel: ${colors.bg.panel};
      --bg-dropdown: ${colors.bg.dropdown};
      --bg-field: ${colors.bg.field};
      --bg-hover: ${colors.bg.hover};
      --bg-hover-strong: ${colors.bg.hoverStrong};
      --bg-active: ${colors.bg.active};
      --bg-toolbar: ${colors.bg.toolbar};

      /* 文字色 */
      --text-primary: ${colors.text.primary};
      --text-secondary: ${colors.text.secondary};
      --text-tertiary: ${colors.text.tertiary};
      --text-muted: ${colors.text.muted};
      --text-faint: ${colors.text.faint};

      /* 边框色 */
      --border-default: ${colors.border.default};
      --border-subtle: ${colors.border.subtle};
      --border-input: ${colors.border.input};

      /* 语义色 */
      --accent: ${colors.semantic.accent};
      --margin: ${colors.semantic.margin};
      --move: ${colors.semantic.move};
      --success: ${colors.semantic.success};
      --success-bg: ${colors.semantic.successBg};
      --purple: ${colors.semantic.purple};
      --purple-bg: ${colors.semantic.purpleBg};

      /* 阴影 */
      --shadow-panel: ${shadows.panel};
      --shadow-dropdown: ${shadows.dropdown};
      --shadow-toolbar: ${shadows.toolbar};

      /* 圆角 */
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

      /* 间距 */
      --space-1: ${spacing[1]};
      --space-2: ${spacing[2]};
      --space-3: ${spacing[3]};
      --space-4: ${spacing[4]};
      --space-5: ${spacing[5]};
      --space-6: ${spacing[6]};
      --space-8: ${spacing[8]};
      --space-10: ${spacing[10]};

      /* 动效 */
      --duration-fast: ${animation.duration.fast};
      --duration-normal: ${animation.duration.normal};
      --duration-slow: ${animation.duration.slow};
      --duration-slower: ${animation.duration.slower};
      --ease-default: ${animation.ease.default};
      --ease-out: ${animation.ease.out};
    }`
}

function updatePreviewFile(): void {
  const previewPath = path.join(__dirname, '../design-system-preview.html')
  let content = fs.readFileSync(previewPath, 'utf-8')

  // 找到 :root 块并替换
  const rootRegex = /:root\s*\{[^}]+\}/s
  const newRoot = generateCSSVariables()

  if (rootRegex.test(content)) {
    content = content.replace(rootRegex, newRoot)
    fs.writeFileSync(previewPath, content)
    console.log('✅ Updated design-system-preview.html')
  } else {
    console.log('❌ Could not find :root block in preview file')
  }
}

function main(): void {
  console.log('🔄 Syncing design tokens...')
  updatePreviewFile()
  console.log('✨ Done!')
}

main()