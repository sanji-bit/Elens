import type { BoxEdges, Change, ChangeContext, ChangeIdentity, ChangePatch, ChangeSnapshot, ChangeTarget, InspectorInfo, StyleDiff } from './types'

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

function buildSelectorCandidates(element: HTMLElement, info: InspectorInfo): { primary: string; fallbacks: string[] } {
  const candidates: string[] = []

  const push = (value: string | null | undefined): void => {
    if (!value) return
    const trimmed = value.trim()
    if (!trimmed || candidates.includes(trimmed)) return
    candidates.push(trimmed)
  }

  const testId = element.getAttribute('data-testid')
  if (testId) push(`[data-testid="${testId}"]`)

  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) push(`${info.tagName}[aria-label="${ariaLabel}"]`)

  if (element.id) push(`#${element.id}`)

  const classList = Array.from(element.classList).filter(Boolean)
  if (classList.length > 0) {
    push(`${info.tagName}.${classList.slice(0, 2).join('.')}`)
  }

  if (info.accessibility.name && info.accessibility.name !== '—') {
    push(`${info.tagName}[role="${info.accessibility.role}"]`)
  }

  push(info.domPath)

  return {
    primary: candidates[0] ?? info.domPath,
    fallbacks: candidates.slice(1),
  }
}

function getDataAttributes(element: HTMLElement): Record<string, string> {
  return Array.from(element.attributes).reduce<Record<string, string>>((acc, attr) => {
    if (attr.name.startsWith('data-')) acc[attr.name] = attr.value
    return acc
  }, {})
}

function getSiblingText(element: Element | null): string {
  if (!(element instanceof HTMLElement)) return ''
  return truncate((element.innerText || element.textContent || '').trim(), 80)
}

export function buildChangeIdentity(element: HTMLElement, info: InspectorInfo): ChangeIdentity {
  return {
    id: info.id === '—' ? '' : info.id,
    className: info.className === '—' ? '' : info.className,
    role: info.accessibility.role,
    accessibleName: info.accessibility.name,
    dataAttributes: getDataAttributes(element),
  }
}

export function buildChangeContext(element: HTMLElement): ChangeContext {
  return {
    parentTag: element.parentElement?.tagName.toLowerCase() ?? '',
    previousSiblingText: getSiblingText(element.previousElementSibling),
    nextSiblingText: getSiblingText(element.nextElementSibling),
  }
}

export function buildChangeTarget(element: HTMLElement, info: InspectorInfo): ChangeTarget {
  return {
    tagName: info.tagName,
    text: info.text,
    domPath: info.domPath,
    selector: buildSelectorCandidates(element, info),
    identity: buildChangeIdentity(element, info),
    context: buildChangeContext(element),
    box: {
      x: Math.round(info.rect.left),
      y: Math.round(info.rect.top),
      width: Math.round(info.rect.width),
      height: Math.round(info.rect.height),
    },
  }
}

export function buildChangePatch(type: Change['type'], diffs?: StyleDiff[], comment = ''): ChangePatch {
  const styleDiffs = (diffs ?? []).filter(diff => diff.property !== 'textContent')
  const textDiff = diffs?.find(diff => diff.property === 'textContent')
  const moveMatch = type === 'move' ? comment.match(/position\s+(\d+)\s+→\s+(\d+)/) : null

  return {
    styleDiffs,
    ...(textDiff ? {
      textDiff: {
        from: textDiff.original,
        to: textDiff.modified,
      },
    } : {}),
    ...(moveMatch ? {
      moveDiff: {
        fromIndex: Number(moveMatch[1]),
        toIndex: Number(moveMatch[2]),
      },
    } : {}),
  }
}

export function buildChangeSnapshot(info: InspectorInfo): ChangeSnapshot {
  return {
    text: info.text,
    box: {
      width: info.boxModel.width,
      height: info.boxModel.height,
      margin: formatEdges(info.boxModel.margin),
      padding: formatEdges(info.boxModel.padding),
      borderRadius: info.boxModel.borderRadius,
    },
    typography: {
      fontFamily: info.typography.fontFamily,
      fontSize: info.typography.fontSize,
      fontWeight: info.typography.fontWeight,
      lineHeight: info.typography.lineHeight,
      letterSpacing: info.typography.letterSpacing,
      color: info.typography.color,
    },
    layout: {
      display: info.layout.display,
      gap: info.layout.gap,
      justifyContent: info.layout.justifyContent,
      alignItems: info.layout.alignItems,
    },
    visual: {
      backgroundColor: info.visual.backgroundColor,
      opacity: info.visual.opacity,
      borderColor: info.visual.borderColor,
      boxShadow: info.visual.boxShadow,
    },
  }
}

function getPageState(): Record<string, string | boolean | number> {
  return {
    theme: document.documentElement.getAttribute('data-theme') || document.body.getAttribute('data-theme') || 'unknown',
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    hasOpenDialog: Boolean(document.querySelector('dialog[open], [aria-modal="true"], [role="dialog"]')),
    hasPopover: Boolean(document.querySelector('[popover]:popover-open, [data-state="open"]')),
  }
}

function getRoute(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
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
    lines.push(`- **Selector**: \`${a.target?.selector?.primary || info.domPath}\``)

    if (a.patch.textDiff) {
      lines.push(`- **Text**: ${a.patch.textDiff.from} → ${a.patch.textDiff.to}`)
    }

    if (a.patch.moveDiff) {
      lines.push(`- **Move**: position ${a.patch.moveDiff.fromIndex} → ${a.patch.moveDiff.toIndex}`)
    }

    if (a.patch.styleDiffs.length > 0) {
      lines.push(`- **Style changes**:`)
      for (const d of a.patch.styleDiffs) {
        lines.push(`  - \`${d.property}\`: ${d.original} → ${d.modified}`)
      }
    }

    if (!a.patch.textDiff && !a.patch.moveDiff && a.patch.styleDiffs.length === 0) {
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
  const now = new Date().toISOString()
  const data = {
    session: {
      url: window.location.href,
      route: getRoute(),
      title: document.title,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      pageState: getPageState(),
      timestamp: now,
    },
    changes: changes.map((change, index) => ({
      id: change.id || String(index + 1),
      kind: change.type,
      comment: change.comment,
      target: change.target,
      patch: {
        styleDiffs: change.patch.styleDiffs.map(diff => ({
          property: diff.property,
          from: diff.original,
          to: diff.modified,
        })),
        ...(change.patch.textDiff ? { textDiff: change.patch.textDiff } : {}),
        ...(change.patch.moveDiff ? { moveDiff: change.patch.moveDiff } : {}),
      },
      beforeSnapshot: change.beforeSnapshot,
      afterSnapshot: change.afterSnapshot,
      snapshot: {
        selector: change.info.domPath,
        boundingBox: {
          x: Math.round(change.info.rect.left),
          y: Math.round(change.info.rect.top),
          width: Math.round(change.info.rect.width),
          height: Math.round(change.info.rect.height),
        },
      },
      meta: change.meta,
    })),
  }
  return JSON.stringify(data, null, 2)
}

export function buildAIPayload(changes: Change[]): string {
  const payload = buildJSONExport(changes)

  return [
    'You are an AI coding assistant. Update the source code to match the approved UI changes below.',
    '',
    'What these fields mean:',
    '- route/pageState: current page and UI state when the change was made.',
    '- target: how to identify the element reliably.',
    '- patch: the exact style/text/move change.',
    '- beforeSnapshot/afterSnapshot: high-level visual state before and after the edit.',
    '',
    'Instructions:',
    '1. Use target.selector, identity, text, and context together to locate the correct source element.',
    '2. Prefer changing component styles, props, or source code rather than applying runtime-only fixes.',
    '3. Treat these changes as intentional and already approved.',
    '4. If a change looks local, keep it local; do not generalize without evidence.',
    '5. Preserve existing architecture and coding style.',
    '',
    'Approved UI change payload:',
    '```json',
    payload,
    '```',
  ].join('\n')
}

export { getPageState, getRoute }
