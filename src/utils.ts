import type { BoxEdges, Change, ChangeContext, ChangeIdentity, ChangeLocatorHints, ChangePatch, ChangeSelector, ChangeSnapshot, ChangeSourceContext, ChangeTarget, InspectableElement, InspectorInfo, LayersTreeBuildResult, LayersTreeNode, OutputDetail, StyleDiff } from './types'

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

export function buildDomPath(element: Element): string {
  const parts: string[] = []
  let current: Element | null = element

  while (current && current.tagName.toLowerCase() !== 'body') {
    const tag = current.tagName.toLowerCase()
    const id = 'id' in current && typeof current.id === 'string' && current.id ? `#${current.id}` : ''
    const classNames = Array.from(current.classList)
      .slice(0, 2)
      .map(cls => `.${cls}`)
      .join('')

    let selector = `${tag}${id}${classNames}`

    if (!id && current.parentElement) {
      const currentTagName = current.tagName
      const siblings = Array.from(current.parentElement.children).filter(
        child => child.tagName === currentTagName,
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

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const VISUAL_HIT_ANCESTOR_LIMIT = 4
const VISUAL_HIT_DESCENDANT_LIMIT = 300

type HitTestRoot = Document | ShadowRoot

function isInspectableElement(element: Element): element is InspectableElement {
  return element.namespaceURI === HTML_NAMESPACE || element.namespaceURI === SVG_NAMESPACE
}

function isDocumentBackground(root: HitTestRoot, element: Element): boolean {
  if (!('documentElement' in root)) return false
  return element === root.documentElement || element === root.body
}

function getElementsFromPoint(root: HitTestRoot, x: number, y: number): Element[] {
  if (typeof root.elementsFromPoint === 'function') return root.elementsFromPoint(x, y)
  const element = root.elementFromPoint(x, y)
  return element ? [element] : []
}

function getAccessibleFrameDocument(element: Element): Document | null {
  if (element.namespaceURI !== HTML_NAMESPACE || element.tagName.toLowerCase() !== 'iframe') return null
  try {
    return (element as HTMLIFrameElement).contentDocument
  } catch {
    return null
  }
}

function containsViewportPoint(rect: DOMRect, x: number, y: number): boolean {
  return rect.width > 0
    && rect.height > 0
    && x >= rect.left
    && x <= rect.left + rect.width
    && y >= rect.top
    && y <= rect.top + rect.height
}

function getElementComputedStyle(element: Element): CSSStyleDeclaration {
  return element.ownerDocument?.defaultView?.getComputedStyle(element) ?? window.getComputedStyle(element)
}

function isPointerEventsNone(element: Element): boolean {
  return getElementComputedStyle(element).pointerEvents === 'none'
}

function isPointerTransparentVisualCandidate(element: Element, x: number, y: number, ignoreSelector: string): element is InspectableElement {
  if (!isInspectableElement(element) || element.closest(ignoreSelector)) return false
  if (!containsViewportPoint(element.getBoundingClientRect(), x, y)) return false
  const style = getElementComputedStyle(element)
  if (style.pointerEvents !== 'none' || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false
  const opacity = Number.parseFloat(style.opacity || '1')
  return !Number.isFinite(opacity) || opacity > 0
}

function pickDeeperVisualCandidate(current: InspectableElement | null, candidate: InspectableElement): InspectableElement {
  if (!current || current.contains(candidate)) return candidate
  if (candidate.contains(current)) return current
  const currentRect = current.getBoundingClientRect()
  const candidateRect = candidate.getBoundingClientRect()
  return candidateRect.width * candidateRect.height <= currentRect.width * currentRect.height ? candidate : current
}

function findPointerTransparentVisualCandidate(hitElement: Element, x: number, y: number, ignoreSelector: string): InspectableElement | null {
  let scope: Element | null = hitElement
  let scanned = 0

  for (let level = 0; scope && level < VISUAL_HIT_ANCESTOR_LIMIT && scanned < VISUAL_HIT_DESCENDANT_LIMIT; level += 1) {
    let candidate: InspectableElement | null = null
    for (const descendant of scope.querySelectorAll('*')) {
      scanned += 1
      if (isPointerTransparentVisualCandidate(descendant, x, y, ignoreSelector)) {
        candidate = pickDeeperVisualCandidate(candidate, descendant)
      }
      if (scanned >= VISUAL_HIT_DESCENDANT_LIMIT) break
    }
    if (candidate) return candidate
    scope = scope.parentElement
  }

  return null
}

function findInspectableElementFromPoint(
  root: HitTestRoot,
  x: number,
  y: number,
  ignoreSelector: string,
  visitedRoots: Set<HitTestRoot>,
): InspectableElement | null {
  if (visitedRoots.has(root)) return null
  visitedRoots.add(root)

  for (const element of getElementsFromPoint(root, x, y)) {
    if (element.closest(ignoreSelector)) continue
    if (isDocumentBackground(root, element)) continue

    const frameDocument = getAccessibleFrameDocument(element)
    if (frameDocument) {
      const rect = element.getBoundingClientRect()
      const frameElement = findInspectableElementFromPoint(
        frameDocument,
        x - rect.left,
        y - rect.top,
        ignoreSelector,
        visitedRoots,
      )
      if (frameElement) return frameElement
    }

    const shadowElement = element.shadowRoot
      ? findInspectableElementFromPoint(element.shadowRoot, x, y, ignoreSelector, visitedRoots)
      : null
    if (shadowElement) return shadowElement

    const visualElement = findPointerTransparentVisualCandidate(element, x, y, ignoreSelector)
    if (visualElement) return visualElement

    // `elementsFromPoint()` may still include a visual layer whose CSS says
    // `pointer-events: none`. It is not the node the user actually clicked;
    // keep looking at the next hit instead of selecting that overlay.
    if (isInspectableElement(element) && !isPointerEventsNone(element)) return element
  }

  return null
}

/**
 * Prefer the browser's real event target/path. Coordinate hit testing is only
 * a fallback for synthetic events and pointer-transparent visual layers.
 */
export function getInspectableElementFromEvent(event: Event, ignoreAttribute: string): InspectableElement | null {
  const ignoreSelector = `[${ignoreAttribute}="true"]`
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []

  for (const value of path) {
    if (!value || typeof value !== 'object') continue
    const element = value as Element
    if (typeof element.closest === 'function' && element.closest(ignoreSelector)) continue
    if (isDocumentBackground(document, element)) continue
    if (!isInspectableElement(element) || isPointerEventsNone(element)) continue
    return element
  }

  const target = event.target
  if (target && typeof target === 'object') {
    const element = target as Element
    if ((!element.closest || !element.closest(ignoreSelector)) && isInspectableElement(element) && !isPointerEventsNone(element)) {
      return element
    }
  }

  if (event instanceof MouseEvent) {
    return getInspectableElementFromPoint(event.clientX, event.clientY, ignoreAttribute)
  }
  return null
}

export function getInspectableElementFromPoint(x: number, y: number, ignoreAttribute: string): InspectableElement | null {
  return findInspectableElementFromPoint(
    document,
    x,
    y,
    `[${ignoreAttribute}="true"]`,
    new Set(),
  )
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

export function extractInspectorInfo(element: InspectableElement): InspectorInfo {
  const style = window.getComputedStyle(element)
  const rect = element.getBoundingClientRect()
  const text = element instanceof HTMLElement
    ? (element.innerText || element.textContent || '—')
    : (element.textContent || '—')

  const accessibility = element instanceof HTMLElement
    ? {
        name: getAccessibleName(element),
        role: getAccessibleRole(element),
        keyboardFocusable: isKeyboardFocusable(element),
      }
    : {
        name: '',
        role: 'graphics-symbol',
        keyboardFocusable: false,
      }

  return {
    element,
    tagName: element.tagName.toLowerCase(),
    id: element.id || '—',
    className: element.className?.toString().trim() || '—',
    text: truncate(text, 160),
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
      backgroundColor: style.backgroundColor,
      backgroundOpacity: String(getColorOpacityPercent(style.backgroundColor)),
      borderColor: style.borderColor,
      borderStyle: style.borderStyle,
      boxShadow: style.boxShadow,
      opacity: style.opacity,
      overflow: style.overflow,
    },
    accessibility,
  }
}

function rgbStringToHex(value: string): string | null {
  const match = value.match(/rgba?\(\s*(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/i)
  if (!match) return null
  const r = Math.round(Number(match[1]))
  const g = Math.round(Number(match[2]))
  const b = Math.round(Number(match[3]))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`
}

export function rgbToHex(rgb: string): string {
  const hex = rgbStringToHex(rgb) ?? cssColorToHex(rgb) ?? canvasColorToHex(rgb)
  return hex ?? rgb
}

export function formatColorHexDisplay(value: string): string {
  return rgbStringToHex(value) ?? cssColorToHex(value) ?? canvasColorToHex(value) ?? '—'
}

function canvasColorToHex(value: string): string | null {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.clearRect(0, 0, 1, 1)
  context.fillStyle = '#000000'
  context.fillStyle = value
  if (context.fillStyle === '#000000' && value.trim().toLowerCase() !== '#000000' && value.trim().toLowerCase() !== 'black') {
    return null
  }
  context.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0, a = 255] = context.getImageData(0, 0, 1, 1).data
  if (a === 0) return null
  return `#${[r, g, b].map(channel => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

export function cssColorToHex(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'transparent') return null
  const probe = document.createElement('div')
  probe.style.position = 'absolute'
  probe.style.pointerEvents = 'none'
  probe.style.opacity = '0'
  probe.style.color = trimmed
  if (!probe.style.color) return null
  document.body.appendChild(probe)
  const normalized = window.getComputedStyle(probe).color
  probe.remove()
  if (!normalized || normalized === 'transparent' || normalized === 'rgba(0, 0, 0, 0)' || normalized === 'rgba(0,0,0,0)') return null
  const hex = rgbStringToHex(normalized)
  if (hex) return hex
  return canvasColorToHex(normalized) ?? canvasColorToHex(trimmed)
}

export function normalizeColorValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'transparent' || trimmed === 'rgba(0, 0, 0, 0)' || trimmed === 'rgba(0,0,0,0)') {
    return null
  }

  const probe = document.createElement('div')
  probe.style.position = 'absolute'
  probe.style.pointerEvents = 'none'
  probe.style.opacity = '0'
  probe.style.color = trimmed
  if (!probe.style.color) return null

  document.body.appendChild(probe)
  const normalized = window.getComputedStyle(probe).color
  probe.remove()

  if (!normalized || normalized === 'transparent' || normalized === 'rgba(0, 0, 0, 0)' || normalized === 'rgba(0,0,0,0)') {
    return null
  }
  if (normalized.startsWith('#')) return normalized.toUpperCase()
  const hex = rgbStringToHex(normalized)
  if (hex) return hex
  return cssColorToHex(normalized) ?? canvasColorToHex(normalized) ?? canvasColorToHex(trimmed)
}

export function collectPageColors(root: ParentNode = document): string[] {
  const counts = new Map<string, number>()
  const walkerRoot = root instanceof Document ? root.body : root
  if (!walkerRoot) return []

  const walker = document.createTreeWalker(walkerRoot, NodeFilter.SHOW_ELEMENT)
  let visited = 0
  let current: Node | null = walker.currentNode

  while (current && visited < 1500) {
    visited += 1
    if (current instanceof HTMLElement) {
      const rect = current.getBoundingClientRect()
      if (!((rect.width === 0 && rect.height === 0) || current.offsetParent === null)) {
        const style = window.getComputedStyle(current)
        if (!(style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)) {
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
      }
    }
    current = walker.nextNode()
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([color]) => color)
}

export function getColorOpacityPercent(value: string): number {
  const trimmed = value.trim()
  const commaAlpha = trimmed.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+%?)\s*\)/i)
  const slashAlpha = trimmed.match(/(?:rgba?|hsla?|lab|oklab|lch|oklch)\([^)]*\/\s*([\d.]+%?)\s*\)/i)
  const alphaValue = commaAlpha?.[1] ?? slashAlpha?.[1]
  if (!alphaValue) return 100
  const numeric = Number.parseFloat(alphaValue)
  if (!Number.isFinite(numeric)) return 100
  const alpha = alphaValue.endsWith('%') ? numeric / 100 : numeric
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

function hasMeaningfulText(element: HTMLElement): boolean {
  return truncate(element.innerText || element.textContent || '', 60).length > 0
}

function isTextNode(node: ChildNode): node is Text {
  return node.nodeType === Node.TEXT_NODE
}

function getTextNodeContent(node: Text): string {
  return node.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

function getTextNodeSiblingIndex(node: Text): number {
  const parent = node.parentElement
  if (!parent) return 0
  const textNodes = Array.from(parent.childNodes).filter((child): child is Text => isTextNode(child) && getTextNodeContent(child).length > 0)
  return Math.max(0, textNodes.indexOf(node))
}

function buildTextTreeNodeId(node: Text, parentId: string): string {
  return `${parentId}|text:${getTextNodeSiblingIndex(node)}`
}

function getLayerSelectionElement(element: HTMLElement | SVGElement): InspectableElement {
  return element
}

function buildTextLayerTreeNode(node: Text, options: { depth: number; parentId: string; parentElement: HTMLElement | SVGElement }): LayersTreeNode | null {
  const text = getTextNodeContent(node)
  if (!text) return null
  const label = `"${truncate(text, 40)}"`
  return {
    id: buildTextTreeNodeId(node, options.parentId),
    kind: 'text',
    element: options.parentElement,
    selectionElement: getLayerSelectionElement(options.parentElement),
    textNode: node,
    parentId: options.parentId,
    depth: options.depth,
    label,
    secondaryLabel: 'text',
    searchText: `${label} ${text}`.toLowerCase(),
    hasChildren: false,
    childrenLoaded: true,
    children: [],
  }
}

function isLayerElement(node: ChildNode): node is HTMLElement | SVGElement {
  return node instanceof HTMLElement || node instanceof SVGElement
}

function getTreeNodeSiblingIndex(element: HTMLElement | SVGElement): number {
  const parent = element.parentElement
  if (!parent) return 0
  const siblings = Array.from(parent.children).filter((child): child is HTMLElement | SVGElement => isLayerElement(child) && child.tagName === element.tagName)
  return Math.max(0, siblings.indexOf(element))
}

export function buildTreeNodeId(element: HTMLElement | SVGElement): string {
  return `${buildDomPath(element)}|${getTreeNodeSiblingIndex(element)}`
}

export function getLayerNodeLabel(element: HTMLElement | SVGElement): string {
  const tag = element.tagName.toLowerCase()
  const id = 'id' in element && element.id ? `#${element.id}` : ''
  const className = Array.from(element.classList).filter(Boolean).slice(0, 1).map(name => `.${name}`).join('')
  return `${tag}${id}${className}`
}

export function getLayerNodeSecondaryLabel(element: HTMLElement | SVGElement): string {
  const ariaLabel = element.getAttribute('aria-label')?.trim()
  if (ariaLabel) return truncate(ariaLabel, 60)
  if ('id' in element && element.id) return `id="${element.id}"`
  const className = element.className?.toString().trim()
  if (className) return truncate(`class="${className}"`, 60)
  const text = truncate(element.textContent || '', 60)
  return text
}

export function shouldIncludeInLayersTree(element: HTMLElement | SVGElement, ignoreAttribute: string): boolean {
  if (element.hasAttribute(ignoreAttribute) || element.closest(`[${ignoreAttribute}="true"]`)) return false
  if (element.classList.contains('ei-root') || Array.from(element.classList).some(name => name.startsWith('ei-'))) return false
  if (element instanceof SVGElement) return true
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
  const rect = element.getBoundingClientRect()
  const hasSize = rect.width > 0 || rect.height > 0
  if (!hasSize && !hasMeaningfulText(element) && element.children.length === 0) return false
  return true
}

export function buildLayerTreeNode(element: HTMLElement | SVGElement, options: { ignoreAttribute: string; depth: number; parentId: string | null; loadChildren?: boolean; maxChildren?: number }): LayersTreeNode | null {
  if (!shouldIncludeInLayersTree(element, options.ignoreAttribute)) return null

  const id = buildTreeNodeId(element)
  const label = getLayerNodeLabel(element)
  const secondaryLabel = getLayerNodeSecondaryLabel(element)
  const children: LayersTreeNode[] = []
  const maxChildren = options.maxChildren ?? Number.POSITIVE_INFINITY
  let hasChildren = false

  for (const child of Array.from(element.childNodes)) {
    let childNode: LayersTreeNode | null = null
    if (isLayerElement(child)) {
      if (!shouldIncludeInLayersTree(child, options.ignoreAttribute)) continue
      hasChildren = true
      if (!options.loadChildren || children.length >= maxChildren) continue
      childNode = buildLayerTreeNode(child, {
        ignoreAttribute: options.ignoreAttribute,
        depth: options.depth + 1,
        parentId: id,
        loadChildren: false,
        maxChildren,
      })
    } else if (isTextNode(child) && getTextNodeContent(child as Text).length > 0) {
      hasChildren = true
      if (!options.loadChildren || children.length >= maxChildren) continue
      childNode = buildTextLayerTreeNode(child as Text, {
        depth: options.depth + 1,
        parentId: id,
        parentElement: element,
      })
    }
    if (childNode) children.push(childNode)
  }

  return {
    id,
    kind: 'element',
    element,
    selectionElement: getLayerSelectionElement(element),
    parentId: options.parentId,
    depth: options.depth,
    label,
    secondaryLabel,
    searchText: `${label} ${secondaryLabel} ${buildDomPath(element)}`.toLowerCase(),
    hasChildren,
    childrenLoaded: Boolean(options.loadChildren),
    children,
  }
}

export function loadLayerTreeNodeChildren(node: LayersTreeNode, ignoreAttribute: string, maxChildren = Number.POSITIVE_INFINITY, includeElement?: InspectableElement): void {
  if (node.kind === 'text') return
  const children = node.childrenLoaded ? [...node.children] : []
  let hasChildren = node.hasChildren
  for (const child of Array.from(node.element.childNodes)) {
    let childNode: LayersTreeNode | null = null
    if (isLayerElement(child)) {
      if (!shouldIncludeInLayersTree(child, ignoreAttribute)) continue
      hasChildren = true
      const shouldIncludeChild = child === includeElement || (includeElement ? child.contains(includeElement) : false)
      if (children.some(existing => existing.element === child)) continue
      if (children.length >= maxChildren && !shouldIncludeChild) continue
      childNode = buildLayerTreeNode(child, {
        ignoreAttribute,
        depth: node.depth + 1,
        parentId: node.id,
        loadChildren: false,
        maxChildren,
      })
    } else if (!node.childrenLoaded && isTextNode(child) && getTextNodeContent(child as Text).length > 0) {
      hasChildren = true
      if (children.length >= maxChildren) continue
      childNode = buildTextLayerTreeNode(child as Text, {
        depth: node.depth + 1,
        parentId: node.id,
        parentElement: node.element,
      })
    }
    if (childNode) children.push(childNode)
  }
  node.children = children
  node.hasChildren = hasChildren
  node.childrenLoaded = true
}

export function buildDocumentLayersTree(root: HTMLElement, options: { ignoreAttribute: string; maxNodes?: number; loadAll?: boolean } ): LayersTreeBuildResult | null {
  const maxNodes = options.maxNodes ?? Number.POSITIVE_INFINITY
  let nodeCount = 0
  let truncated = false

  function walk(element: HTMLElement | SVGElement, depth: number, parentId: string | null): LayersTreeNode | null {
    if (nodeCount >= maxNodes) {
      truncated = true
      return null
    }
    if (!shouldIncludeInLayersTree(element, options.ignoreAttribute)) return null

    nodeCount += 1
    const id = buildTreeNodeId(element)
    const label = getLayerNodeLabel(element)
    const secondaryLabel = getLayerNodeSecondaryLabel(element)
    const children: LayersTreeNode[] = []

    for (const child of Array.from(element.childNodes)) {
      if (isLayerElement(child)) {
        const nextNode = walk(child, depth + 1, id)
        if (nextNode) children.push(nextNode)
      } else if (isTextNode(child)) {
        const textNode = buildTextLayerTreeNode(child as Text, {
          depth: depth + 1,
          parentId: id,
          parentElement: element,
        })
        if (textNode) children.push(textNode)
      }
      if (truncated && nodeCount >= maxNodes) break
    }

    return {
      id,
      kind: 'element',
      element,
      selectionElement: getLayerSelectionElement(element),
      parentId,
      depth,
      label,
      secondaryLabel,
      searchText: `${label} ${secondaryLabel} ${buildDomPath(element)}`.toLowerCase(),
      hasChildren: children.length > 0,
      childrenLoaded: true,
      children,
    }
  }

  if (options.loadAll) {
    const tree = walk(root, 0, null)
    if (!tree) return null
    return { root: tree, truncated, nodeCount }
  }

  const tree = buildLayerTreeNode(root, {
    ignoreAttribute: options.ignoreAttribute,
    depth: 0,
    parentId: null,
    loadChildren: true,
    maxChildren: maxNodes,
  })
  if (!tree) return null
  return { root: tree, truncated: tree.hasChildren && tree.children.length >= maxNodes, nodeCount: tree.children.length + 1 }
}

export function filterLayersTree(node: LayersTreeNode, query: string): LayersTreeNode | null {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return node
  const matchedChildren = node.children
    .map(child => filterLayersTree(child, normalized))
    .filter((child): child is LayersTreeNode => Boolean(child))
  const matchedSelf = node.searchText.includes(normalized)
  if (!matchedSelf && matchedChildren.length === 0) return null
  return {
    ...node,
    hasChildren: matchedChildren.length > 0,
    childrenLoaded: true,
    children: matchedChildren,
  }
}

function formatEdges(edges: BoxEdges): string {
  return `${edges.top} ${edges.right} ${edges.bottom} ${edges.left}`
}

function buildSelectorCandidates(element: InspectableElement, info: InspectorInfo): ChangeSelector {
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

function getDataAttributes(element: Element): Record<string, string> {
  return Array.from(element.attributes).reduce<Record<string, string>>((acc, attr) => {
    if (attr.name.startsWith('data-')) acc[attr.name] = attr.value
    return acc
  }, {})
}

function getSiblingText(element: Element | null): string {
  if (!(element instanceof HTMLElement)) return ''
  return truncate((element.innerText || element.textContent || '').trim(), 80)
}

export function buildChangeIdentity(element: InspectableElement, info: InspectorInfo): ChangeIdentity {
  return {
    id: info.id === '—' ? '' : info.id,
    className: info.className === '—' ? '' : info.className,
    role: info.accessibility.role,
    accessibleName: info.accessibility.name,
    dataAttributes: getDataAttributes(element),
  }
}

export function buildChangeContext(element: InspectableElement): ChangeContext {
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

function buildSourceContext(element: InspectableElement): ChangeSourceContext {
  if (!(element instanceof HTMLElement)) {
    return {
      framework: 'unknown',
      componentNames: [],
      componentTree: [],
      sourceFilePaths: [],
    }
  }
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

function buildLocatorHints(element: InspectableElement, info: InspectorInfo, selector: ChangeSelector, sourceContext: ChangeSourceContext): ChangeLocatorHints {
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

export function buildChangeTarget(element: InspectableElement, info: InspectorInfo): ChangeTarget {
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
    ...(type === 'delete' ? {
      deleteDiff: {
        action: 'delete' as const,
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

function formatElementTitle(info: InspectorInfo, componentTree?: string[]): string {
  const text = info.text && info.text !== '—' ? ` [${truncate(info.text, 40)}]` : ''
  const role = info.accessibility.role && info.accessibility.role !== 'generic' ? `${info.accessibility.role} ` : ''
  const components = componentTree?.length ? `${componentTree.map(name => `<${name}>`).join(' ')} ` : ''
  return `${components}${role}${info.tagName}${text}`.trim()
}

function formatSourceLine(a: Change): string | null {
  return a.target.sourceContext.sourceFilePaths[0] ?? null
}

function formatLocation(a: Change): string {
  return a.target.selector.primary || a.info.domPath
}

function formatFeedback(a: Change): string {
  const patchLines: string[] = []
  if (a.patch.textDiff) patchLines.push(`Text: ${a.patch.textDiff.from} → ${a.patch.textDiff.to}`)
  if (a.patch.moveDiff) patchLines.push(`Move: position ${a.patch.moveDiff.fromIndex} → ${a.patch.moveDiff.toIndex}`)
  if (a.patch.deleteDiff) patchLines.push('Delete: remove this element from the source structure')
  a.patch.styleDiffs.forEach(diff => patchLines.push(`${diff.property}: ${diff.original} → ${diff.modified}`))
  return [a.comment, ...patchLines].filter(Boolean).join('; ') || 'No written feedback.'
}

function formatClasses(className: string): string | null {
  if (!className || className === '—') return null
  return className.split(/\s+/).filter(Boolean).join(', ')
}

function formatPosition(info: InspectorInfo): string {
  return `${Math.round(info.rect.left)}px, ${Math.round(info.rect.top)}px (${Math.round(info.rect.width)}×${Math.round(info.rect.height)}px)`
}

function formatComputedStyles(info: InspectorInfo): string {
  const border = `${info.boxModel.borderWidth.top} solid ${info.visual.borderColor}`
  return [
    `color: ${info.typography.color}`,
    `background-color: ${info.visual.backgroundColor}`,
    `font-size: ${info.typography.fontSize}`,
    `font-weight: ${info.typography.fontWeight}`,
    `font-family: ${info.typography.fontFamily}`,
    `line-height: ${info.typography.lineHeight}`,
    `text-align: ${info.typography.textAlign}`,
    `width: ${info.boxModel.width}`,
    `height: ${info.boxModel.height}`,
    `padding: ${formatEdges(info.boxModel.padding)}`,
    `border: ${border}`,
    `border-radius: ${info.boxModel.borderRadius}`,
    `display: ${info.layout.display}`,
    `position: ${info.layout.position}`,
    `flex-direction: ${info.layout.flexDirection}`,
    `justify-content: ${info.layout.justifyContent}`,
    `align-items: ${info.layout.alignItems}`,
    `opacity: ${info.visual.opacity}`,
    `box-shadow: ${info.visual.boxShadow}`,
  ].join('; ')
}

function buildCompactMarkdownLine(index: number, a: Change): string {
  const source = formatSourceLine(a)
  const sourceText = source ? ` (${source})` : ''
  return `${index + 1}. **${formatElementTitle(a.info)}**${sourceText}: ${formatFeedback(a)}`
}

function buildMarkdownSection(lines: string[], index: number, a: Change, detail: OutputDetail): void {
  const info = a.info
  const componentTree = detail === 'detailed'
    ? a.target.sourceContext.componentTree
    : detail === 'forensic'
      ? a.target.sourceContext.componentNames
      : a.target.sourceContext.componentTree.slice(-6)

  lines.push(`### ${index + 1}. ${formatElementTitle(info, componentTree)}`)
  if (detail === 'forensic') lines.push(`**Full DOM Path:** ${info.domPath}`)
  else lines.push(`**Location:** ${formatLocation(a)}`)

  const source = formatSourceLine(a)
  if (source) lines.push(`**Source:** ${source}`)
  if (a.target.sourceContext.componentTree.length) lines.push(`**React:** ${a.target.sourceContext.componentTree.map(name => `<${name}>`).join(' ')}`)

  if (detail === 'detailed' || detail === 'forensic') {
    const classes = formatClasses(info.className)
    if (classes) lines.push(detail === 'forensic' ? `**CSS Classes:** ${classes}` : `**Classes:** ${classes}`)
    lines.push(detail === 'forensic'
      ? `**Position:** x:${Math.round(info.rect.left)}, y:${Math.round(info.rect.top)} (${Math.round(info.rect.width)}×${Math.round(info.rect.height)}px)`
      : `**Position:** ${formatPosition(info)}`)
  }

  if (detail === 'forensic') {
    lines.push(`**Annotation at:** ${Math.round(info.rect.left + info.rect.width / 2)}px from left, ${Math.round(info.rect.top + info.rect.height / 2)}px from top`)
    lines.push(`**Computed Styles:** ${formatComputedStyles(info)}`)
    lines.push(`**Accessibility:** name="${info.accessibility.name}", role="${info.accessibility.role}", focusable=${info.accessibility.keyboardFocusable}`)
    if (a.target.context.previousSiblingText || a.target.context.nextSiblingText) {
      lines.push(`**Nearby Elements:** previous="${a.target.context.previousSiblingText}", next="${a.target.context.nextSiblingText}"`)
    }
  }

  lines.push(`**Feedback:** ${formatFeedback(a)}`)
}

export function buildMarkdownExport(changes: Change[], detail: OutputDetail = 'standard'): string {
  const entries = buildExportChangeEntries(changes)
  if (entries.length === 0) return '# Page Feedback\n\nNo feedback yet.'

  const route = getRoute()
  if (detail === 'compact') {
    return [`## Page Feedback: ${route}`, '', ...entries.map((entry, index) => buildCompactMarkdownLine(index, entry.primary))].join('\n')
  }

  const lines: string[] = [`## Page Feedback: ${route}`]
  lines.push(`**Viewport:** ${window.innerWidth}×${window.innerHeight}`)
  if (detail === 'forensic') {
    lines.push('', '**Environment:**')
    lines.push(`- Viewport: ${window.innerWidth}×${window.innerHeight}`)
    lines.push(`- URL: ${window.location.href}`)
    lines.push(`- User Agent: ${window.navigator.userAgent}`)
    lines.push(`- Timestamp: ${new Date().toISOString()}`)
    lines.push(`- Device Pixel Ratio: ${window.devicePixelRatio}`)
    lines.push('', '---')
  }
  lines.push('')

  for (const [i, entry] of entries.entries()) {
    const a = entry.primary
    buildMarkdownSection(lines, i, a, detail)
    if (entry.isGrouped) {
      lines.push(`**Scope:** matching peer layers`)
      lines.push(`**Match rule:** same signature, or same child signature inside matching parent cards`)
    }
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
      ...(change.patch.deleteDiff ? { deleteDiff: change.patch.deleteDiff } : {}),
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

export function buildAIPayload(changes: Change[], detail: OutputDetail = 'standard'): string {
  const levelLabel = `${detail.slice(0, 1).toUpperCase()}${detail.slice(1)}`
  return [
    `Use this ${levelLabel} page feedback to update the source code. Prefer the Source/React fields first, then Location if source metadata is missing. Keep the change local unless the feedback explicitly asks for a broader pattern.`,
    '',
    buildMarkdownExport(changes, detail),
  ].join('\n')
}

export { getPageState, getRoute }
