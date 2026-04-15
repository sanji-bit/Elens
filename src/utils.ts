import type { BoxEdges, Change, ChangeContext, ChangeIdentity, ChangeLocatorHints, ChangePatch, ChangeSelector, ChangeSnapshot, ChangeSourceContext, ChangeTarget, InspectorInfo, OutputDetail, StyleDiff } from './types'

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
      width: style.width && style.width !== 'auto' ? style.width : px(rect.width),
      height: style.height && style.height !== 'auto' ? style.height : px(rect.height),
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
      rowGap: style.rowGap,
      columnGap: style.columnGap,
      isFlex: style.display === 'flex' || style.display === 'inline-flex',
      isGrid: style.display === 'grid' || style.display === 'inline-grid',
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

export function normalizeColorValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'transparent' || trimmed === 'rgba(0, 0, 0, 0)' || trimmed === 'rgba(0,0,0,0)') {
    return null
  }

  const probe = document.createElement('div')
  probe.style.color = ''
  probe.style.color = trimmed
  if (!probe.style.color) return null

  const normalized = probe.style.color
  if (normalized.startsWith('#')) return normalized.toUpperCase()
  if (normalized.startsWith('rgb')) return rgbToHex(normalized)
  return normalized
}

export function collectPageColors(root: ParentNode = document): string[] {
  const elements = Array.from(root.querySelectorAll('*')).filter((node): node is HTMLElement => node instanceof HTMLElement)
  const counts = new Map<string, number>()

  for (const element of elements.slice(0, 1500)) {
    const rect = element.getBoundingClientRect()
    if ((rect.width === 0 && rect.height === 0) || element.offsetParent === null) continue

    const style = window.getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue

    const values = [
      style.color,
      style.backgroundColor,
      style.borderTopColor,
      style.borderRightColor,
      style.borderBottomColor,
      style.borderLeftColor,
    ]

    for (const value of values) {
      const normalized = normalizeColorValue(value)
      if (!normalized) continue
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([color]) => color)
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

function buildSelectorCandidates(element: HTMLElement, info: InspectorInfo): ChangeSelector {
  const candidates: string[] = []
  const testing: string[] = []
  const semantic: string[] = []
  const stable: string[] = []
  const structural: string[] = []
  const unstable: string[] = []

  const pushUnique = (bucket: string[], value: string | null | undefined): void => {
    if (!value) return
    const trimmed = value.trim()
    if (!trimmed || bucket.includes(trimmed)) return
    bucket.push(trimmed)
  }

  const pushCandidate = (value: string | null | undefined): void => {
    if (!value) return
    const trimmed = value.trim()
    if (!trimmed || candidates.includes(trimmed)) return
    candidates.push(trimmed)
  }

  const add = (bucket: string[], value: string | null | undefined): void => {
    pushUnique(bucket, value)
    pushCandidate(value)
  }

  for (const attr of ['data-testid', 'data-test', 'data-cy']) {
    const value = element.getAttribute(attr)
    if (value) add(testing, `[${attr}="${value}"]`)
  }

  const ariaLabel = element.getAttribute('aria-label')
  if (ariaLabel) add(semantic, `${info.tagName}[aria-label="${ariaLabel}"]`)

  const explicitRole = element.getAttribute('role')
  if (explicitRole) add(semantic, `${info.tagName}[role="${explicitRole}"]`)

  if (element.id) add(stable, `#${element.id}`)

  const classList = Array.from(element.classList).filter(Boolean)
  if (classList.length > 0) {
    add(structural, `${info.tagName}.${classList.slice(0, 2).join('.')}`)
  }

  add(unstable, info.domPath)

  return {
    primary: candidates[0] ?? info.domPath,
    fallbacks: candidates.slice(1),
    testing,
    semantic,
    stable,
    structural,
    unstable,
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

function getReactFiberKey(element: HTMLElement): string | undefined {
  return Object.keys(element).find(key => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$'))
}

function getReactPropsKey(element: HTMLElement): string | undefined {
  return Object.keys(element).find(key => key.startsWith('__reactProps$'))
}

function getComponentNameFromFiber(fiber: unknown): string {
  const candidate = fiber as { type?: unknown; elementType?: unknown }
  const type = candidate.type || candidate.elementType
  if (typeof type === 'string') return type
  if (typeof type === 'function') {
    const named = type as { displayName?: string; name?: string }
    return named.displayName || named.name || ''
  }
  if (type && typeof type === 'object') {
    const named = type as { displayName?: string; name?: string; render?: { displayName?: string; name?: string } }
    return named.displayName || named.name || named.render?.displayName || named.render?.name || ''
  }
  return ''
}

function getSourceFileFromFiber(fiber: unknown): string {
  const candidate = fiber as { _debugSource?: { fileName?: string; lineNumber?: number; columnNumber?: number } }
  const source = candidate._debugSource
  if (!source?.fileName) return ''
  const suffix = source.lineNumber ? `:${source.lineNumber}${source.columnNumber ? `:${source.columnNumber}` : ''}` : ''
  return `${source.fileName}${suffix}`
}

function buildSourceContext(element: HTMLElement): ChangeSourceContext {
  const componentNames: string[] = []
  const sourceFilePaths: string[] = []
  let framework: ChangeSourceContext['framework'] = 'unknown'
  let current: HTMLElement | null = element

  while (current) {
    const fiberKey = getReactFiberKey(current)
    if (fiberKey) {
      framework = 'react'
      let fiber = (current as unknown as Record<string, unknown>)[fiberKey]
      let depth = 0
      while (fiber && depth < 12) {
        const name = getComponentNameFromFiber(fiber)
        if (name && !componentNames.includes(name)) componentNames.push(name)

        const file = getSourceFileFromFiber(fiber)
        if (file && !sourceFilePaths.includes(file)) sourceFilePaths.push(file)

        fiber = (fiber as { return?: unknown }).return
        depth += 1
      }
    }

    current = current.parentElement
  }

  return {
    framework,
    componentNames,
    componentTree: componentNames,
    sourceFilePaths,
  }
}

function buildLocatorHints(element: HTMLElement, info: InspectorInfo, selector: ChangeSelector, sourceContext: ChangeSourceContext): ChangeLocatorHints {
  const terms: string[] = []
  const textAnchors: string[] = []
  const attributeAnchors: string[] = []
  const componentHints = sourceContext.componentNames.slice(0, 8)

  const push = (bucket: string[], value: string | null | undefined): void => {
    if (!value) return
    const trimmed = value.trim()
    if (!trimmed || bucket.includes(trimmed)) return
    bucket.push(trimmed)
  }

  push(terms, selector.primary)
  for (const value of [...selector.testing, ...selector.semantic, ...selector.stable]) push(terms, value)

  if (info.text && info.text !== '—') {
    const text = truncate(info.text, 80)
    push(textAnchors, text)
    push(terms, text)
  }

  for (const attr of ['data-testid', 'data-test', 'data-cy', 'aria-label', 'name', 'type', 'href']) {
    const value = element.getAttribute(attr)
    if (!value) continue
    push(attributeAnchors, `${attr}="${value}"`)
    push(terms, value)
  }

  for (const name of componentHints.slice(0, 4)) push(terms, name)

  const confidence: ChangeLocatorHints['confidence'] = sourceContext.sourceFilePaths.length > 0
    ? 'high'
    : selector.testing.length > 0 || (selector.semantic.length > 0 && selector.stable.length > 0)
      ? 'medium'
      : 'low'

  return {
    bestCodeSearchTerms: terms.slice(0, 12),
    textAnchors,
    attributeAnchors,
    componentHints,
    confidence,
  }
}

export function buildChangeTarget(element: HTMLElement, info: InspectorInfo): ChangeTarget {
  const selector = buildSelectorCandidates(element, info)
  const sourceContext = buildSourceContext(element)

  return {
    tagName: info.tagName,
    text: info.text,
    domPath: info.domPath,
    selector,
    identity: buildChangeIdentity(element, info),
    context: buildChangeContext(element),
    locatorHints: buildLocatorHints(element, info, selector, sourceContext),
    sourceContext,
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

function buildMarkdownSection(lines: string[], a: Change, detail: OutputDetail): void {
  const info = a.info
  lines.push(`- **Selector**: \`${a.target?.selector?.primary || info.domPath}\``)

  if (detail !== 'compact' && a.target?.locatorHints?.confidence) {
    lines.push(`- **Locator confidence**: ${a.target.locatorHints.confidence}`)
  }

  if ((detail === 'standard' || detail === 'detailed' || detail === 'forensic') && a.target?.locatorHints?.bestCodeSearchTerms?.length) {
    lines.push(`- **Code search hints**: ${a.target.locatorHints.bestCodeSearchTerms.map(term => `\`${term}\``).join(', ')}`)
  }

  if ((detail === 'detailed' || detail === 'forensic') && a.target?.sourceContext?.componentTree?.length) {
    lines.push(`- **Component tree**: ${a.target.sourceContext.componentTree.join(' → ')}`)
  }

  if ((detail === 'detailed' || detail === 'forensic') && a.target?.sourceContext?.sourceFilePaths?.length) {
    lines.push(`- **Source files**: ${a.target.sourceContext.sourceFilePaths.join(', ')}`)
  }

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
    if (detail !== 'compact') {
      lines.push(`- **Font**: ${info.typography.fontSize} / ${info.typography.fontWeight} ${info.typography.fontFamily.split(',')[0]?.trim().replace(/['"]/g, '')}`)
      lines.push(`- **Color**: ${rgbToHex(info.typography.color)}`)
      lines.push(`- **Background**: ${info.visual.backgroundColor}`)
    }
  }

  if (a.comment) lines.push(`- **Note**: ${a.comment}`)
}

export function buildMarkdownExport(changes: Change[], detail: OutputDetail = 'standard'): string {
  const entries = buildExportChangeEntries(changes)
  if (entries.length === 0) return '# UI Changes\n\nNo changes yet.'
  const lines: string[] = [`# UI Changes (${entries.length} items)\n`]

  for (const [i, entry] of entries.entries()) {
    const a = entry.primary
    lines.push(annotationHeading(i, a.info))
    if (entry.isGrouped) {
      lines.push('- Scope: matching peer layers')
      lines.push('- Match rule: same signature, or same child signature inside matching parent cards')
    }
    buildMarkdownSection(lines, a, detail)
    lines.push('')
  }

  return lines.join('\n')
}

type ExportChangeEntry = {
  primary: Change
  members: Change[]
  isGrouped: boolean
}

function buildExportChangeEntries(changes: Change[]): ExportChangeEntry[] {
  const entries: ExportChangeEntry[] = []
  const grouped = new Map<string, Change[]>()

  changes.forEach((change) => {
    if (change.type === 'design' && change.meta.groupKey) {
      const key = `${change.meta.route ?? ''}::${change.meta.groupKey}`
      const bucket = grouped.get(key) ?? []
      bucket.push(change)
      grouped.set(key, bucket)
      return
    }
    entries.push({ primary: change, members: [change], isGrouped: false })
  })

  grouped.forEach((members) => {
    const primary = members[0]
    if (!primary) return
    entries.push({ primary, members, isGrouped: members.length > 1 })
  })

  return entries.sort((a, b) => a.primary.timestamp - b.primary.timestamp)
}

function toBaseChange(entry: ExportChangeEntry, index: number) {
  const change = entry.primary
  return {
    id: change.id || String(index + 1),
    kind: change.type,
    comment: change.comment,
    ...(entry.isGrouped ? {
      scope: {
        mode: 'matching peer layers',
        rule: 'same signature, or same child signature inside matching parent cards',
        note: 'Apply this as a matching rule, not as a fixed instance count.',
      },
    } : {}),
    patch: {
      styleDiffs: change.patch.styleDiffs.map(diff => ({
        property: diff.property,
        from: diff.original,
        to: diff.modified,
      })),
      ...(change.patch.textDiff ? { textDiff: change.patch.textDiff } : {}),
      ...(change.patch.moveDiff ? { moveDiff: change.patch.moveDiff } : {}),
    },
  }
}

export function buildJSONExport(changes: Change[], detail: OutputDetail = 'detailed'): string {
  const now = new Date().toISOString()

  const session = detail === 'compact'
    ? undefined
    : {
        url: window.location.href,
        route: getRoute(),
        title: document.title,
        ...(detail !== 'standard' ? {
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          pageState: getPageState(),
        } : {}),
        timestamp: now,
      }

  const entries = buildExportChangeEntries(changes)

  const data = {
    ...(session ? { session } : {}),
    changes: entries.map((entry, index) => {
      const change = entry.primary
      const base = toBaseChange(entry, index)
      const compactTarget = {
        tagName: change.target.tagName,
        text: change.target.text,
        selector: change.target.selector.primary,
      }
      const standardTarget = {
        tagName: change.target.tagName,
        text: change.target.text,
        domPath: change.target.domPath,
        selector: {
          primary: change.target.selector.primary,
          fallbacks: change.target.selector.fallbacks,
        },
        identity: change.target.identity,
        locatorHints: {
          bestCodeSearchTerms: change.target.locatorHints.bestCodeSearchTerms,
          confidence: change.target.locatorHints.confidence,
        },
      }

      const detailedTarget = change.target
      const forensicTarget = {
        ...change.target,
        forensic: {
          textAnchors: change.target.locatorHints.textAnchors,
          attributeAnchors: change.target.locatorHints.attributeAnchors,
          componentHints: change.target.locatorHints.componentHints,
        },
      }

      return {
        ...base,
        target: detail === 'compact'
          ? compactTarget
          : detail === 'standard'
            ? standardTarget
            : detail === 'forensic'
              ? forensicTarget
              : detailedTarget,
        ...(detail === 'detailed' || detail === 'forensic' ? {
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
        } : {}),
      }
    }),
  }
  return JSON.stringify(data, null, 2)
}

export function buildAIPayload(changes: Change[], detail: OutputDetail = 'detailed'): string {
  if (detail === 'compact') return buildMarkdownExport(changes, 'compact')

  const payload = buildJSONExport(changes, detail)
  const levelLabel = `${detail.slice(0, 1).toUpperCase()}${detail.slice(1)}`

  return [
    `You are an AI coding assistant. Update the source code to match the approved UI changes below. Output detail: ${levelLabel}.`,
    '',
    'What these fields mean:',
    '- route/pageState: current page and UI state when the change was made.',
    '- target.selector: prioritized DOM selectors. Prefer testing, semantic, and stable selectors over structural or unstable selectors.',
    '- target.sourceContext: framework, component names/tree, and source file paths when available.',
    '- target.locatorHints: best terms to search in the codebase, text anchors, attribute anchors, component hints, and locator confidence.',
    '- target.identity/context: element identity, nearby text, parent tag, and sibling context for verification.',
    '- scope: when present, apply the change as a selector/matching rule instead of a fixed instance count. Matching peer layers can include the same child layer inside repeated parent cards.',
    '- patch: the exact style/text/move change.',
    '- beforeSnapshot/afterSnapshot: high-level visual state before and after the edit.',
    '',
    'Instructions:',
    '1. First use target.sourceContext.sourceFilePaths and target.sourceContext.componentTree when present.',
    '2. If source files are missing, search target.locatorHints.bestCodeSearchTerms in order.',
    '3. Use target.selector.testing, semantic, and stable selectors before structural or unstable fallbacks.',
    '4. Verify the match with target.identity, text, box, and nearby context before editing.',
    '5. Prefer changing component styles, props, or source code rather than applying runtime-only fixes.',
    '6. Treat these changes as intentional and already approved.',
    '7. If a change looks local, keep it local; do not generalize without evidence.',
    '8. Preserve existing architecture and coding style.',
    '',
    'Approved UI change payload:',
    '```json',
    payload,
    '```',
  ].join('\n')
}

export { getPageState, getRoute }
