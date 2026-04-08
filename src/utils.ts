import type { BoxEdges, Change, InspectorInfo } from './types'

export function truncate(value: string, max = 140): string {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

export function px(value: number): string {
  return `${Math.round(value * 100) / 100}px`
}

export function pickEdgeBox(style: CSSStyleDeclaration, prefix: 'margin' | 'padding' | 'border'): BoxEdges {
  if (prefix === 'border') {
    return {
      top: style.borderTopWidth,
      right: style.borderRightWidth,
      bottom: style.borderBottomWidth,
      left: style.borderLeftWidth,
    }
  }

  return {
    top: style[`${prefix}Top` as keyof CSSStyleDeclaration] as string,
    right: style[`${prefix}Right` as keyof CSSStyleDeclaration] as string,
    bottom: style[`${prefix}Bottom` as keyof CSSStyleDeclaration] as string,
    left: style[`${prefix}Left` as keyof CSSStyleDeclaration] as string,
  }
}

export function buildDomPath(element: HTMLElement): string {
  const parts: string[] = []
  let current: HTMLElement | null = element

  while (current && current.tagName.toLowerCase() !== 'body') {
    const tag = current.tagName.toLowerCase()
    const id = current.id ? `#${current.id}` : ''
    const classNames = Array.from(current.classList)
      .slice(0, 2)
      .map(cls => `.${cls}`)
      .join('')

    let selector = `${tag}${id}${classNames}`

    if (!id && current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter(
        child => child.tagName === current!.tagName,
      )
      if (siblings.length > 1) {
        selector += `:nth-of-type(${siblings.indexOf(current) + 1})`
      }
    }

    parts.unshift(selector)
    current = current.parentElement
  }

  return ['body', ...parts].join(' > ')
}

export function getInspectableElementFromPoint(x: number, y: number, ignoreAttribute: string): HTMLElement | null {
  const elements = document.elementsFromPoint(x, y)

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue
    if (element.closest(`[${ignoreAttribute}="true"]`)) continue
    if (element === document.documentElement || element === document.body) continue
    return element
  }

  return null
}

const IMPLICIT_ROLES: Record<string, string> = {
  a: 'link', button: 'button', h1: 'heading', h2: 'heading', h3: 'heading',
  h4: 'heading', h5: 'heading', h6: 'heading', img: 'img', input: 'textbox',
  select: 'combobox', textarea: 'textbox', nav: 'navigation', main: 'main',
  header: 'banner', footer: 'contentinfo', aside: 'complementary', form: 'form',
  table: 'table', ul: 'list', ol: 'list', li: 'listitem', dialog: 'dialog',
  article: 'article', section: 'region',
}

const NATIVELY_FOCUSABLE = new Set(['a', 'button', 'input', 'select', 'textarea', 'summary'])

function getAccessibleName(element: HTMLElement): string {
  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) return ariaLabel.trim()

  const labelledBy = element.getAttribute('aria-labelledby')
  if (labelledBy) {
    const text = labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent?.trim() || '').filter(Boolean).join(' ')
    if (text) return text
  }

  if (element instanceof HTMLImageElement && element.alt) return element.alt
  if (element.title) return element.title

  const innerText = (element.innerText || element.textContent || '').trim()
  return truncate(innerText, 80)
}

function getAccessibleRole(element: HTMLElement): string {
  const explicit = element.getAttribute('role')
  if (explicit) return explicit
  const tag = element.tagName.toLowerCase()
  if (tag === 'input') {
    const type = (element as HTMLInputElement).type || 'text'
    if (type === 'checkbox') return 'checkbox'
    if (type === 'radio') return 'radio'
    if (type === 'range') return 'slider'
    if (type === 'submit' || type === 'button' || type === 'reset') return 'button'
    return 'textbox'
  }
  return IMPLICIT_ROLES[tag] || 'generic'
}

function isKeyboardFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled')) return false
  const tabIndex = element.tabIndex
  if (tabIndex >= 0) return true
  const tag = element.tagName.toLowerCase()
  if (NATIVELY_FOCUSABLE.has(tag) && tabIndex !== -1) return true
  return false
}

export function extractInspectorInfo(element: HTMLElement): InspectorInfo {
  const style = window.getComputedStyle(element)
  const rect = element.getBoundingClientRect()

  return {
    element,
    tagName: element.tagName.toLowerCase(),
    id: element.id || '—',
    className: element.className?.toString().trim() || '—',
    text: truncate(element.innerText || element.textContent || '—', 160),
    domPath: buildDomPath(element),
    rect: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    },
    typography: {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      color: style.color,
      textAlign: style.textAlign,
      textTransform: style.textTransform,
      textDecoration: style.textDecoration,
    },
    boxModel: {
      width: px(rect.width),
      height: px(rect.height),
      margin: pickEdgeBox(style, 'margin'),
      padding: pickEdgeBox(style, 'padding'),
      borderWidth: pickEdgeBox(style, 'border'),
      borderRadius: style.borderRadius,
      boxSizing: style.boxSizing,
    },
    layout: {
      display: style.display,
      position: style.position,
      gap: style.gap,
      flexDirection: style.flexDirection,
      justifyContent: style.justifyContent,
      alignItems: style.alignItems,
      flexWrap: style.flexWrap,
      gridTemplateColumns: style.gridTemplateColumns,
      gridTemplateRows: style.gridTemplateRows,
    },
    visual: {
      backgroundColor: style.backgroundImage && style.backgroundImage !== 'none' ? style.backgroundImage : style.backgroundColor,
      backgroundOpacity: String(getColorOpacityPercent(style.backgroundColor)),
      borderColor: style.borderColor,
      borderStyle: style.borderStyle,
      boxShadow: style.boxShadow,
      opacity: style.opacity,
      overflow: style.overflow,
    },
    accessibility: {
      name: getAccessibleName(element),
      role: getAccessibleRole(element),
      keyboardFocusable: isKeyboardFocusable(element),
    },
  }
}

export function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return rgb
  const r = Number(match[1]), g = Number(match[2]), b = Number(match[3])
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`
}

export function getColorOpacityPercent(value: string): number {
  const match = value.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)/i)
  if (!match) return 100
  const alpha = Number(match[1])
  if (!Number.isFinite(alpha)) return 100
  return Math.round(Math.max(0, Math.min(1, alpha)) * 100)
}

export function buildCopyText(info: InspectorInfo): string {
  return [
    `${info.tagName}${info.id !== '—' ? `#${info.id}` : ''}`,
    `Text: ${info.text}`,
    `Path: ${info.domPath}`,
    `Font Family: ${info.typography.fontFamily}`,
    `Font Size: ${info.typography.fontSize}`,
    `Font Weight: ${info.typography.fontWeight}`,
    `Line Height: ${info.typography.lineHeight}`,
    `Text Color: ${info.typography.color}`,
    `Background: ${info.visual.backgroundColor}`,
    `Size: ${info.boxModel.width} × ${info.boxModel.height}`,
    `Padding: ${info.boxModel.padding.top} ${info.boxModel.padding.right} ${info.boxModel.padding.bottom} ${info.boxModel.padding.left}`,
    `Margin: ${info.boxModel.margin.top} ${info.boxModel.margin.right} ${info.boxModel.margin.bottom} ${info.boxModel.margin.left}`,
    `Display: ${info.layout.display}`,
    `Gap: ${info.layout.gap}`,
  ].join('\n')
}

function formatEdges(edges: BoxEdges): string {
  return `${edges.top} ${edges.right} ${edges.bottom} ${edges.left}`
}

function annotationHeading(idx: number, info: InspectorInfo): string {
  const tag = info.tagName
  const text = info.text && info.text !== '—' ? ` — "${truncate(info.text, 40)}"` : ''
  return `## ${idx + 1}. ${tag}${text}`
}

export function buildMarkdownExport(changes: Change[]): string {
  if (changes.length === 0) return '# UI Changes\n\nNo changes yet.'
  const lines: string[] = [`# UI Changes (${changes.length} items)\n`]

  for (const [i, a] of changes.entries()) {
    const info = a.info
    lines.push(annotationHeading(i, info))
    lines.push(`- **Selector**: \`${info.domPath}\``)

    if (a.type === 'design' && a.diffs && a.diffs.length > 0) {
      lines.push(`- **Changes**:`)
      for (const d of a.diffs) {
        lines.push(`  - \`${d.property}\`: ${d.original} → ${d.modified}`)
      }
    } else {
      lines.push(`- **Size**: ${info.boxModel.width} × ${info.boxModel.height}`)
      lines.push(`- **Font**: ${info.typography.fontSize} / ${info.typography.fontWeight} ${info.typography.fontFamily.split(',')[0]?.trim().replace(/['"]/g, '')}`)
      lines.push(`- **Color**: ${rgbToHex(info.typography.color)}`)
      lines.push(`- **Background**: ${info.visual.backgroundColor}`)

      const m = info.boxModel.margin
      const allZeroMargin = [m.top, m.right, m.bottom, m.left].every(v => parseFloat(v) === 0)
      if (!allZeroMargin) lines.push(`- **Margin**: ${formatEdges(m)}`)

      const p = info.boxModel.padding
      const allZeroPadding = [p.top, p.right, p.bottom, p.left].every(v => parseFloat(v) === 0)
      if (!allZeroPadding) lines.push(`- **Padding**: ${formatEdges(p)}`)

      if (info.layout.display !== 'block') lines.push(`- **Display**: ${info.layout.display}`)
    }

    if (a.comment) lines.push(`- **Note**: ${a.comment}`)
    lines.push('')
  }

  return lines.join('\n')
}

export function buildJSONExport(changes: Change[]): string {
  const data = {
    changes: changes.map((a, i) => ({
      id: String(i + 1),
      type: a.type,
      comment: a.comment,
      element: a.info.tagName,
      selector: a.info.domPath,
      boundingBox: {
        x: Math.round(a.info.rect.left),
        y: Math.round(a.info.rect.top),
        width: Math.round(a.info.rect.width),
        height: Math.round(a.info.rect.height),
      },
      styles: {
        fontSize: a.info.typography.fontSize,
        fontWeight: a.info.typography.fontWeight,
        fontFamily: a.info.typography.fontFamily,
        color: a.info.typography.color,
        backgroundColor: a.info.visual.backgroundColor,
        margin: formatEdges(a.info.boxModel.margin),
        padding: formatEdges(a.info.boxModel.padding),
        display: a.info.layout.display,
      },
      ...(a.diffs && a.diffs.length > 0 ? {
        diffs: a.diffs.map(d => ({
          property: d.property,
          from: d.original,
          to: d.modified,
        })),
      } : {}),
    })),
    url: window.location.href,
    timestamp: new Date().toISOString(),
  }
  return JSON.stringify(data, null, 2)
}
