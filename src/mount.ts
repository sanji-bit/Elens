import CHECK_ICON_SVG from './assets/check-inline.svg?raw'
import ICON_CAPTURE_SCREEN from './assets/capture-screen.svg?raw'
import ICON_CAPTURE_WINDOW from './assets/capture-window.svg?raw'
import ICON_CHEVRON_DOWN from './assets/chevron-down-inline.svg?raw'
import COPY_ICON_SVG from './assets/copy-inline.svg?raw'
import ICON_SELECT_ELEMENT from './assets/select-element.svg?raw'
import ICON_STATE_CAPTURE from './assets/state-capture.svg?raw'
import ICON_CHANGES from './assets/toolbar-changes.svg?raw'
import ICON_DESIGN from './assets/toolbar-design.svg?raw'
import ICON_EXIT from './assets/toolbar-exit.svg?raw'
import ICON_GUIDES from './assets/toolbar-guides.svg?raw'
import ICON_INSPECTOR from './assets/toolbar-inspector.svg?raw'
import ICON_MOVE from './assets/toolbar-move.svg?raw'
import ICON_OUTLINES from './assets/toolbar-outlines.svg?raw'
import ICON_SCREENSHOT from './assets/toolbar-screenshot.svg?raw'
import type { Change, ElementInspectorInstance, ElementInspectorOptions, InspectorInfo, InspectorMode, OutputDetail, ThemeConfig } from './types'
import { buildDesignPanel, createStyleTracker, type StyleTracker } from './design'
import { buildTheme } from './design-tokens'
import { i18n } from './i18n'
import { createRuntimeStyles } from './runtime-styles'
import { clearPersistedTheme, getDefaultThemeConfig, loadPersistedTheme, mergeThemeConfig, persistTheme } from './theme-store'
import { buildAIPayload, buildChangePatch, buildChangeSnapshot, buildChangeTarget, buildCopyText, buildDomPath, buildJSONExport, buildMarkdownExport, extractInspectorInfo, getInspectableElementFromPoint, getRoute, rgbToHex, truncate } from './utils'

const IGNORE_ATTR = 'data-elens-ignore'
const MODE_STORAGE_KEY = 'elens-mode'
const CHANGES_STORAGE_KEY = 'elens-changes'

type PersistedChange = Omit<Change, 'element'>

function loadPersistedMode(): 'inspector' | 'design' | null {
  try {
    const value = window.localStorage.getItem(MODE_STORAGE_KEY)
    return value === 'inspector' || value === 'design' ? value : null
  } catch {
    return null
  }
}

function persistMode(mode: InspectorMode): void {
  if (mode !== 'inspector' && mode !== 'design') return
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode)
  } catch {
    // Ignore storage failures.
  }
}

function loadPersistedChanges(): PersistedChange[] {
  try {
    const value = window.localStorage.getItem(CHANGES_STORAGE_KEY)
    if (!value) return []
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistChanges(changes: Change[]): void {
  try {
    const serializableChanges = changes.map(({ element: _element, ...change }) => change)
    window.localStorage.setItem(CHANGES_STORAGE_KEY, JSON.stringify(serializableChanges))
  } catch {
    // Ignore storage failures.
  }
}

function clearPersistedChanges(): void {
  try {
    window.localStorage.removeItem(CHANGES_STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

function preloadImage(url: string): void {
  try {
    const image = new Image()
    image.src = url
  } catch {
    // Ignore preload failures.
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

const CHANGES_AVATAR_URL = new URL('./assets/changes-avatar.jpg', import.meta.url).href
const CHANGES_HOVER_DELETE_URL = new URL('./assets/changes-delete.svg', import.meta.url).href
const CHANGES_HOVER_COPY_URL = new URL('./assets/changes-copy.svg', import.meta.url).href
const CHANGES_HOVER_COPY_SUCCESS_URL = new URL('./assets/changes-copy-success.svg', import.meta.url).href
const CHANGES_HOVER_PREVIEW_AFTER_URL = new URL('./assets/changes-preview-after.svg', import.meta.url).href
const CHANGES_HOVER_PREVIEW_BEFORE_URL = new URL('./assets/changes-preview-before.svg', import.meta.url).href
const CHANGES_PANEL_CLOSE_URL = new URL('./assets/changes-panel-close.svg', import.meta.url).href
const CHANGES_PANEL_CHEVRON_URL = new URL('./assets/changes-panel-chevron.svg', import.meta.url).href
const CAPTURE_SCRIPT_URL = new URL('./assets/capture.js', import.meta.url).href
const CHANGES_HOVER_DELETE_ICON = `<img src="${CHANGES_HOVER_DELETE_URL}" alt="" />`
const CHANGES_HOVER_COPY_ICON = `<img src="${CHANGES_HOVER_COPY_URL}" alt="" />`
const CHANGES_HOVER_COPY_SUCCESS_ICON = `<img src="${CHANGES_HOVER_COPY_SUCCESS_URL}" alt="" />`
const CHANGES_HOVER_PREVIEW_AFTER_ICON = `<img src="${CHANGES_HOVER_PREVIEW_AFTER_URL}" alt="" />`
const CHANGES_HOVER_PREVIEW_BEFORE_ICON = `<img src="${CHANGES_HOVER_PREVIEW_BEFORE_URL}" alt="" />`
const CHANGES_PANEL_CLOSE_ICON = `<img src="${CHANGES_PANEL_CLOSE_URL}" alt="" />`
const CHANGES_PANEL_CHEVRON_ICON = `<img src="${CHANGES_PANEL_CHEVRON_URL}" alt="" />`

preloadImage(CHANGES_AVATAR_URL)
preloadImage(CHANGES_HOVER_DELETE_URL)
preloadImage(CHANGES_HOVER_COPY_URL)
preloadImage(CHANGES_HOVER_COPY_SUCCESS_URL)
preloadImage(CHANGES_HOVER_PREVIEW_AFTER_URL)
preloadImage(CHANGES_HOVER_PREVIEW_BEFORE_URL)
preloadImage(CHANGES_PANEL_CLOSE_URL)
preloadImage(CHANGES_PANEL_CHEVRON_URL)

// Toolbar icons — from Figma design, 20x20, stroke=currentColor

function styleRow(label: string, value: string, swatch?: string): HTMLDivElement {
  const row = el('div', 'ei-row')
  const labelEl = el('div', 'ei-label', label)
  const valueWrap = el('div', 'ei-value')
  if (swatch) {
    const chip = el('span', 'ei-swatch')
    chip.style.backgroundColor = swatch
    valueWrap.appendChild(chip)
  }
  const text = el('span', 'ei-text', value || '\u2014')
  text.title = value || '\u2014'
  valueWrap.appendChild(text)
  if (swatch) {
    const copyBtn = el('span', 'ei-copy-color')
    copyBtn.innerHTML = COPY_ICON_SVG
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      navigator.clipboard.writeText(value).then(() => {
        copyBtn.innerHTML = CHECK_ICON_SVG
        copyBtn.style.color = 'var(--success)'
        setTimeout(() => {
          copyBtn.innerHTML = COPY_ICON_SVG
          copyBtn.style.color = ''
        }, 1500)
      })
    })
    valueWrap.appendChild(copyBtn)
  }
  row.append(labelEl, valueWrap)
  return row
}

function isLikelyBackgroundElement(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  const area = rect.width * rect.height
  const viewportArea = window.innerWidth * window.innerHeight
  const text = (element.innerText || element.textContent || '').trim()
  const hasLabel = Boolean(element.getAttribute('aria-label') || element.getAttribute('title'))

  return area > viewportArea * 0.45 && text.length === 0 && !hasLabel
}

function getHTMLElementChildren(element: HTMLElement): HTMLElement[] {
  return Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
}

function getSiblingElement(element: HTMLElement, direction: 'prev' | 'next'): HTMLElement | null {
  const parent = element.parentElement
  if (!parent) return null
  const siblings = getHTMLElementChildren(parent)
  const index = siblings.indexOf(element)
  if (index === -1) return null
  const nextIndex = direction === 'prev' ? index - 1 : index + 1
  return siblings[nextIndex] ?? null
}

function getElementChain(element: HTMLElement): HTMLElement[] {
  const chain: HTMLElement[] = []
  let current: HTMLElement | null = element
  while (current) {
    chain.unshift(current)
    current = current.parentElement
  }
  return chain
}

function formatCrumbLabel(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase()
  const id = element.id ? `#${element.id}` : ''
  const className = element.className
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(name => `.${name}`)
    .join('')
  return `${tag}${id}${className}`
}

function formatBoxNumber(value: string): string {
  const trimmed = String(value || '').trim()
  const match = trimmed.match(/^-?\d+(?:\.\d+)?/)
  if (!match) return trimmed || '0'
  const num = Number.parseFloat(match[0])
  if (!Number.isFinite(num)) return trimmed || '0'
  return Number.isInteger(num) ? String(num) : String(Math.round(num * 100) / 100)
}

function parseBorderRadius(raw: string): [string, string, string, string] {
  const parts = raw.split(/\s+/).map(s => formatBoxNumber(s))
  const a = parts[0] ?? '0', b = parts[1] ?? a, c = parts[2] ?? a, d = parts[3] ?? b
  return [a, b, c, d]
}

function fmtEdge(v: string): string {
  const n = formatBoxNumber(v || '0px')
  return n === '0' ? '-' : n
}

function buildBoxDiagram(boxModel: InspectorInfo['boxModel']): HTMLDivElement {
  const diagram = el('div', 'ei-box-diagram')

  const mTop = el('div', 'ei-box-m ei-box-m-h')
  mTop.appendChild(el('div', 'ei-box-m-line'))
  mTop.appendChild(el('div', 'ei-box-m-badge', formatBoxNumber(boxModel.margin.top)))

  const bodyEl = el('div', 'ei-box-body')

  const mLeft = el('div', 'ei-box-m ei-box-m-v')
  mLeft.appendChild(el('div', 'ei-box-m-line'))
  mLeft.appendChild(el('div', 'ei-box-m-badge', formatBoxNumber(boxModel.margin.left)))

  const mRight = el('div', 'ei-box-m ei-box-m-v')
  mRight.appendChild(el('div', 'ei-box-m-line'))
  mRight.appendChild(el('div', 'ei-box-m-badge', formatBoxNumber(boxModel.margin.right)))

  const container = el('div', 'ei-box-container')
  const [rTL, rTR, rBR, rBL] = parseBorderRadius(boxModel.borderRadius || '0')

  function corner(pos: string, val: string): HTMLDivElement {
    const c = el('div', `ei-box-corner ei-box-corner-${pos}`)
    c.appendChild(el('div', 'ei-box-corner-mark'))
    c.appendChild(el('div', 'ei-box-corner-val', val))
    return c
  }

  function borderCell(value: string, label?: string): HTMLDivElement {
    const cell = el('div', 'ei-box-b-cell')
    if (label) cell.appendChild(el('div', 'ei-box-b-label', label))
    cell.appendChild(el('div', 'ei-box-b-val', fmtEdge(value)))
    return cell
  }

  const padArea = el('div', 'ei-box-pad')
  padArea.append(
    el('div', 'ei-box-pad-label', 'Padding'),
    el('div', 'ei-box-pad-val ei-box-pad-tv', formatBoxNumber(boxModel.padding.top)),
    el('div', 'ei-box-pad-val ei-box-pad-lv', formatBoxNumber(boxModel.padding.left)),
    (() => {
      const c = el('div', 'ei-box-content')
      c.textContent = `${formatBoxNumber(boxModel.width)} \u00D7 ${formatBoxNumber(boxModel.height)}`
      return c
    })(),
    el('div', 'ei-box-pad-val ei-box-pad-rv', formatBoxNumber(boxModel.padding.right)),
    el('div', 'ei-box-pad-val ei-box-pad-bv', formatBoxNumber(boxModel.padding.bottom)),
  )

  container.append(
    corner('tl', rTL), borderCell(boxModel.borderWidth.top, i18n.design.stroke), corner('tr', rTR),
    borderCell(boxModel.borderWidth.left), padArea, borderCell(boxModel.borderWidth.right),
    corner('bl', rBL), borderCell(boxModel.borderWidth.bottom), corner('br', rBR),
  )

  bodyEl.append(mLeft, container, mRight)

  const mBot = el('div', 'ei-box-m ei-box-m-h')
  mBot.appendChild(el('div', 'ei-box-m-line'))
  mBot.appendChild(el('div', 'ei-box-m-badge', formatBoxNumber(boxModel.margin.bottom)))

  const sizing = el('div', 'ei-box-sizing', boxModel.boxSizing)

  diagram.append(mTop, bodyEl, mBot, sizing)
  return diagram
}

export function mountElementInspector(options: ElementInspectorOptions = {}): ElementInspectorInstance {
  const defaultThemeConfig = getDefaultThemeConfig(options.theme, { zIndex: 2147483647 })
  let currentThemeConfig = options.persistTheme === false ? defaultThemeConfig : mergeThemeConfig(defaultThemeConfig, loadPersistedTheme() ?? {})
  let theme = buildTheme(currentThemeConfig)

  let currentMode: InspectorMode = 'off'
  let destroyed = false
  let lockedElement: HTMLElement | null = null
  let currentInfo: InspectorInfo | null = null
  let hoverLocked = false
  let outlinesEnabled = false
  let outlinesHoverElement: Element | null = null
  let currentTab: 'typography' | 'box' | 'layout' = 'typography'
  let rafId: number | null = null
  let latestPoint: { x: number; y: number } | null = null
  let panelAnchor: { x: number; y: number } | null = null
  let panelPosition: { left: number; top: number } | null = null
  let isDraggingPanel = false
  let changes: Change[] = []
  let changeIdCounter = 0
  let annotateInput: HTMLTextAreaElement | null = null
  let changesFilter: 'all' | 'style' | 'text' | 'move' | 'note' = 'all'
  let outputDetail: OutputDetail = 'standard'
  let activeChangeId: string | null = null
  let beforePreviewChangeIds = new Set<string>()
  let changeFlashTimeout: number | null = null
  let changeFlashElement: HTMLElement | null = null
  let toolbarExpanded = false
  let styleTracker: StyleTracker | null = null
  let moveChangeIdByElement = new WeakMap<HTMLElement, string>()
  // Guides mode state
  let guidesAnchorElement: HTMLElement | null = null
  let guidesAnchorRect: DOMRect | null = null
  let guideLines: Array<{id: string; type: 'horizontal' | 'vertical'; position: number; element: HTMLElement}> = []
  let rulerDragState: {type: 'horizontal' | 'vertical'; tempLine: HTMLElement; snappedPosition: number | null} | null = null
  let guideLineDragState: {id: string; type: 'horizontal' | 'vertical'; startPos: number; snappedPosition: number | null} | null = null
  let moveHandleEntries: Array<{ handle: HTMLButtonElement; element: HTMLElement }> = []
  let moveDragRaf = 0
  let pendingMovePointer: { x: number; y: number } | null = null
  let moveDragState: {
    element: HTMLElement
    container: HTMLElement
    siblings: HTMLElement[]
    startX: number
    startY: number
    started: boolean
    initialIndex: number
    lastIndex: number
    axis: 'x' | 'y'
    placement: 'before' | 'after'
    target: HTMLElement | null
    bounds: DOMRect
    elementRect: DOMRect
    dragOffsetX: number
    dragOffsetY: number
  } | null = null
  let suppressNextClick = false

  // --- DOM ---

  const root = el('div')
  root.className = 'ei-root'
  root.setAttribute(IGNORE_ATTR, 'true')

  const styleEl = document.createElement('style')
  const applyTheme = (nextThemeConfig: ThemeConfig, options: { persist?: boolean; reset?: boolean } = {}): void => {
    currentThemeConfig = options.reset ? defaultThemeConfig : mergeThemeConfig(defaultThemeConfig, nextThemeConfig)
    theme = buildTheme(currentThemeConfig)
    styleEl.textContent = createRuntimeStyles(theme)
    if (options.persist === false) return
    if (options.reset) {
      clearPersistedTheme()
      return
    }
    persistTheme(currentThemeConfig)
  }
  styleEl.textContent = createRuntimeStyles(theme)

  const highlight = el('div', 'ei-highlight')
  highlight.setAttribute(IGNORE_ATTR, 'true')
  highlight.style.display = 'none'
  const hlMargin = el('div', 'ei-hl-margin')
  const hlPadding = el('div', 'ei-hl-padding')
  const hlContent = el('div', 'ei-hl-content')
  hlPadding.appendChild(hlContent)
  hlMargin.appendChild(hlPadding)
  highlight.appendChild(hlMargin)

  const moveIndicator = el('div', 'ei-move-indicator')
  moveIndicator.setAttribute(IGNORE_ATTR, 'true')
  moveIndicator.dataset.visible = 'false'
  const moveBounds = el('div', 'ei-move-bounds')
  const moveBoundsLabel = el('div', 'ei-move-bounds-label', i18n.design.dragBounds)
  const moveHandles = el('div', 'ei-move-handles')
  const moveGuideLine = el('div', 'ei-move-guide-line')
  const moveGuideDot = el('div', 'ei-move-guide-dot')
  moveIndicator.append(moveBounds, moveBoundsLabel, moveHandles, moveGuideLine, moveGuideDot)

  // Guides overlay
  const guidesOverlay = el('div', 'ei-guides-overlay')
  guidesOverlay.setAttribute(IGNORE_ATTR, 'true')
  guidesOverlay.dataset.visible = 'false'

  // Rulers
  const topRuler = el('div', 'ei-ruler ei-ruler-top')
  topRuler.setAttribute(IGNORE_ATTR, 'true')
  const topRulerMarks = el('div', 'ei-ruler-marks')
  topRuler.appendChild(topRulerMarks)

  const leftRuler = el('div', 'ei-ruler ei-ruler-left')
  leftRuler.setAttribute(IGNORE_ATTR, 'true')
  const leftRulerMarks = el('div', 'ei-ruler-marks')
  leftRuler.appendChild(leftRulerMarks)

  // Reference lines container
  const referenceLinesContainer = el('div', 'ei-reference-lines')
  referenceLinesContainer.setAttribute(IGNORE_ATTR, 'true')

  
  // Distance measurement lines + labels
  const distanceLineH = el('div', 'ei-distance-line ei-distance-line-h')
  distanceLineH.setAttribute(IGNORE_ATTR, 'true')
  const distanceLineV = el('div', 'ei-distance-line ei-distance-line-v')
  distanceLineV.setAttribute(IGNORE_ATTR, 'true')
  const distanceLabelH = el('div', 'ei-distance-label ei-distance-label-h')
  distanceLabelH.setAttribute(IGNORE_ATTR, 'true')
  const distanceLabelV = el('div', 'ei-distance-label ei-distance-label-v')
  distanceLabelV.setAttribute(IGNORE_ATTR, 'true')
  const paddingOverlay = el('div', 'ei-padding-overlay')
  paddingOverlay.setAttribute(IGNORE_ATTR, 'true')
  paddingOverlay.dataset.visible = 'false'
  const paddingOutline = el('div', 'ei-padding-outline')
  paddingOutline.setAttribute(IGNORE_ATTR, 'true')
  paddingOutline.dataset.visible = 'false'
  const paddingContentOutline = el('div', 'ei-padding-content-outline')
  paddingContentOutline.setAttribute(IGNORE_ATTR, 'true')
  paddingContentOutline.dataset.visible = 'false'
  const paddingHighlight = el('div', 'ei-padding-highlight')
  paddingHighlight.setAttribute(IGNORE_ATTR, 'true')
  paddingHighlight.dataset.visible = 'false'
  const paddingTag = el('div', 'ei-padding-tag', 'div')
  paddingTag.setAttribute(IGNORE_ATTR, 'true')
  paddingTag.dataset.visible = 'false'
  const paddingCode = el('div', 'ei-padding-code', '</>')
  paddingCode.setAttribute(IGNORE_ATTR, 'true')
  paddingCode.dataset.visible = 'false'
  const paddingBands = {
    top: el('div', 'ei-padding-band'),
    right: el('div', 'ei-padding-band'),
    bottom: el('div', 'ei-padding-band'),
    left: el('div', 'ei-padding-band'),
  }
  const paddingBadges = {
    top: el('div', 'ei-padding-badge'),
    right: el('div', 'ei-padding-badge'),
    bottom: el('div', 'ei-padding-badge'),
    left: el('div', 'ei-padding-badge'),
  }
  ;(['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
    paddingBands[side].setAttribute(IGNORE_ATTR, 'true')
    paddingBands[side].dataset.side = side
    paddingBands[side].dataset.visible = 'false'
    paddingBadges[side].setAttribute(IGNORE_ATTR, 'true')
    paddingBadges[side].dataset.side = side
    paddingBadges[side].dataset.visible = 'false'
    paddingOverlay.appendChild(paddingBands[side])
    paddingOverlay.appendChild(paddingBadges[side])
  })
  paddingOverlay.append(paddingOutline, paddingContentOutline, paddingHighlight, paddingTag, paddingCode)

  guidesOverlay.append(topRuler, leftRuler, referenceLinesContainer, distanceLineH, distanceLineV, distanceLabelH, distanceLabelV, paddingOverlay)

  function clearMoveHandles(): void {
    moveHandleEntries = []
    moveHandles.innerHTML = ''
  }

  function updateMoveHandles(container: HTMLElement, siblings: HTMLElement[], activeElement: HTMLElement | null = null): void {
    clearMoveHandles()
    const containerRect = container.getBoundingClientRect()
    moveBounds.style.left = `${containerRect.left}px`
    moveBounds.style.top = `${containerRect.top}px`
    moveBounds.style.width = `${Math.max(containerRect.width, 0)}px`
    moveBounds.style.height = `${Math.max(containerRect.height, 0)}px`
    moveBoundsLabel.style.left = `${containerRect.left}px`
    moveBoundsLabel.style.top = `${containerRect.top - 22}px`

    siblings.forEach((sibling) => {
      const rect = sibling.getBoundingClientRect()
      const handle = el('button', 'ei-move-handle')
      handle.type = 'button'
      handle.dataset.active = sibling === activeElement ? 'true' : 'false'
      handle.dataset.elementPath = extractInspectorInfo(sibling).domPath
      handle.style.left = `${rect.left + rect.width / 2}px`
      handle.style.top = `${rect.top + rect.height / 2}px`
      moveHandles.appendChild(handle)
      moveHandleEntries.push({ handle, element: sibling })
    })
  }

  function getMoveHandleEntryFromTarget(target: EventTarget | null): { handle: HTMLButtonElement; element: HTMLElement } | null {
    if (!(target instanceof Element)) return null
    const handle = target.closest('.ei-move-handle') as HTMLButtonElement | null
    if (!handle) return null
    return moveHandleEntries.find(entry => entry.handle === handle) ?? null
  }

  function showMoveOverlay(element: HTMLElement): void {
    const container = getReorderContainer(element)
    if (!container) {
      hideMoveIndicator()
      return
    }
    updateMoveOverlay(container, moveDragState?.element ?? null)
  }

  // Design mode overlay elements
  const hlLabel = el('div', 'ei-hl-label')
  const hlCode = el('div', 'ei-hl-code', '</>')
  const hlPadBadges: Record<string, HTMLDivElement> = {}
  const hlPadLines: Record<string, HTMLDivElement> = {}
  const hlPadEdges: Record<string, HTMLDivElement> = {}
  const hlMarginBadges: Record<string, HTMLDivElement> = {}
  const hlMarginLines: Record<string, HTMLDivElement> = {}
  const hlMarginEdges: Record<string, HTMLDivElement> = {}
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    hlPadBadges[side] = el('div', 'ei-hl-pad-badge')
    hlPadLines[side] = el('div', `ei-hl-pad-line ei-hl-pad-line-${side === 'top' || side === 'bottom' ? 'v' : 'h'}`)
    hlPadEdges[side] = el('div', `ei-hl-pad-edge ei-hl-pad-edge-${side}`)
    hlPadding.appendChild(hlPadEdges[side])
    hlPadding.appendChild(hlPadLines[side])
    hlPadding.appendChild(hlPadBadges[side])
    // Margin badges and lines (attached to margin layer)
    hlMarginBadges[side] = el('div', 'ei-hl-margin-badge')
    hlMarginLines[side] = el('div', `ei-hl-margin-line ei-hl-margin-line-${side === 'top' || side === 'bottom' ? 'v' : 'h'}`)
    hlMarginEdges[side] = el('div', `ei-hl-margin-edge ei-hl-margin-edge-${side}`)
    hlMargin.appendChild(hlMarginEdges[side])
    hlMargin.appendChild(hlMarginLines[side])
    hlMargin.appendChild(hlMarginBadges[side])
  }
  hlPadding.appendChild(hlLabel)
  hlPadding.appendChild(hlCode)

  const tooltip = el('div', 'ei-tooltip')
  tooltip.setAttribute(IGNORE_ATTR, 'true')
  tooltip.style.display = 'none'

  // Toolbar
  const toolbar = el('div', 'ei-toolbar')
  toolbar.setAttribute(IGNORE_ATTR, 'true')
  toolbar.dataset.expanded = 'false'

  function makeToolbarBtn(icon: string, label: string): HTMLButtonElement {
    const btn = el('button', 'ei-toolbar-btn')
    btn.type = 'button'
    btn.innerHTML = icon
    btn.setAttribute(IGNORE_ATTR, 'true')
    const tip = el('span', 'ei-toolbar-tip', label)
    tip.setAttribute(IGNORE_ATTR, 'true')
    btn.appendChild(tip)
    return btn
  }

  const inspectorBtn = makeToolbarBtn(ICON_INSPECTOR, i18n.toolbar.inspector)
  const designBtn = makeToolbarBtn(ICON_DESIGN, i18n.toolbar.design)
  designBtn.classList.add('ei-toolbar-extra')
  const moveBtn = makeToolbarBtn(ICON_MOVE, i18n.toolbar.move)
  moveBtn.classList.add('ei-toolbar-extra')
  const changesBtn = makeToolbarBtn(ICON_CHANGES, i18n.toolbar.changes)
  changesBtn.classList.add('ei-toolbar-extra')
  // Screenshot button with dropdown
  const screenshotGroup = el('div', 'ei-toolbar-btn-group ei-toolbar-extra')
  screenshotGroup.setAttribute(IGNORE_ATTR, 'true')
  const screenshotBtn = makeToolbarBtn(ICON_SCREENSHOT, i18n.toolbar.screenshot)
  const screenshotDropdownBtn = el('button', 'ei-toolbar-btn ei-toolbar-dropdown-btn')
  screenshotDropdownBtn.type = 'button'
  screenshotDropdownBtn.innerHTML = ICON_CHEVRON_DOWN
  screenshotDropdownBtn.setAttribute(IGNORE_ATTR, 'true')
  const screenshotDropdownTip = el('span', 'ei-toolbar-tip', i18n.toolbar.captureOptions)
  screenshotDropdownTip.setAttribute(IGNORE_ATTR, 'true')
  screenshotDropdownBtn.appendChild(screenshotDropdownTip)
  screenshotGroup.append(screenshotBtn, screenshotDropdownBtn)

  // Dropdown menu for capture options
  const captureMenu = el('div', 'ei-capture-menu')
  captureMenu.setAttribute(IGNORE_ATTR, 'true')
  captureMenu.style.display = 'none'

  const outputDetailMenu = el('div', 'ei-output-detail-menu')
  outputDetailMenu.setAttribute(IGNORE_ATTR, 'true')
  outputDetailMenu.style.display = 'none'

  function makeCaptureMenuItem(icon: string, label: string): HTMLButtonElement {
    const item = el('button', 'ei-capture-menu-item')
    item.type = 'button'
    item.innerHTML = `
      <span class="ei-capture-menu-icon">${icon}</span>
      <span class="ei-capture-menu-label">${label}</span>
    `
    return item
  }

  const captureEntireScreenItem = makeCaptureMenuItem(ICON_CAPTURE_SCREEN, i18n.capture.entireScreen)
  const captureWindowItem = makeCaptureMenuItem(ICON_CAPTURE_WINDOW, i18n.capture.currentWindow)
  const selectElementItem = makeCaptureMenuItem(ICON_SELECT_ELEMENT, i18n.capture.selectElement)
  const stateCaptureItem = makeCaptureMenuItem(ICON_STATE_CAPTURE, i18n.capture.stateCapture)

  captureMenu.append(captureEntireScreenItem, captureWindowItem, selectElementItem, stateCaptureItem)

  const toolbarDivider = el('div', 'ei-toolbar-divider ei-toolbar-extra')
  toolbarDivider.appendChild(el('div', 'ei-toolbar-divider-line'))

  const exitBtn = makeToolbarBtn(ICON_EXIT, i18n.toolbar.exit)
  exitBtn.classList.add('ei-toolbar-extra')

  const guidesBtn = makeToolbarBtn(ICON_GUIDES, i18n.toolbar.guides)
  guidesBtn.classList.add('ei-toolbar-extra')

  const outlinesBtn = makeToolbarBtn(ICON_OUTLINES, i18n.toolbar.outlines)
  outlinesBtn.classList.add('ei-toolbar-extra')

  toolbar.append(inspectorBtn, designBtn, moveBtn, changesBtn, guidesBtn, outlinesBtn, screenshotGroup, toolbarDivider, exitBtn)
  root.append(captureMenu, outputDetailMenu)

  // Panel
  const panel = el('div', 'ei-panel')
  panel.setAttribute(IGNORE_ATTR, 'true')
  panel.style.display = 'none'

  const header = el('div', 'ei-panel-header')
  const dragHandle = el('button', 'ei-drag-handle')
  dragHandle.type = 'button'
  dragHandle.title = i18n.panel.dragPanel
  dragHandle.setAttribute(IGNORE_ATTR, 'true')
  dragHandle.append(el('span', 'ei-drag-bar'))
  const titleWrap = el('div')
  const titleEl = el('div', 'ei-panel-title', i18n.panel.inspectorTitle)
  const subtitle = el('div', 'ei-panel-subtitle', i18n.panel.ready)
  titleWrap.append(titleEl, subtitle)

  const markersContainer = el('div')
  markersContainer.setAttribute(IGNORE_ATTR, 'true')

  const actions = el('div', 'ei-actions')
  const copyBtn = el('button', 'ei-icon-btn', i18n.actions.copy)
  const unlockBtn = el('button', 'ei-icon-btn', i18n.actions.unlock)
  const changesCloseBtn = el('button', 'ei-changes-close') as HTMLButtonElement
  copyBtn.type = 'button'
  unlockBtn.type = 'button'
  changesCloseBtn.type = 'button'
  copyBtn.setAttribute(IGNORE_ATTR, 'true')
  unlockBtn.setAttribute(IGNORE_ATTR, 'true')
  changesCloseBtn.setAttribute(IGNORE_ATTR, 'true')
  changesCloseBtn.title = i18n.panel.closeChanges
  changesCloseBtn.ariaLabel = i18n.panel.closeChanges
  changesCloseBtn.innerHTML = CHANGES_PANEL_CLOSE_ICON
  actions.append(copyBtn, unlockBtn, changesCloseBtn)
  header.append(titleWrap, actions)

  const body = el('div', 'ei-body')
  panel.append(dragHandle, header, body)

  root.append(styleEl, highlight, moveIndicator, guidesOverlay, tooltip, panel, markersContainer, toolbar)
  document.body.appendChild(root)

  // --- Helpers ---

  function isInteractiveMode(): boolean {
    return currentMode === 'inspector' || currentMode === 'design' || currentMode === 'move' || currentMode === 'guides'
  }

  function isIgnoredEvent(event: Event): boolean {
    const target = event.target
    if (!(target instanceof Element)) return false
    if (target.closest('.ei-move-handle')) return false
    return Boolean(target.closest(`[${IGNORE_ATTR}="true"]`))
  }

  function isPanelEvent(event: Event): boolean {
    const target = event.target
    return target instanceof Node && panel.contains(target)
  }

  function isEditableTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    )
  }

  function setPanelVisible(visible: boolean): void {
    if (!visible) {
      panel.style.display = 'none'
      return
    }
    panel.style.display = panel.classList.contains('is-changes') ? 'flex' : 'block'
  }

  function setHighlightVisible(visible: boolean): void {
    highlight.style.display = visible ? 'block' : 'none'
  }

  function clampPanelPosition(left: number, top: number): { left: number; top: number } {
    const panelWidth = 380
    const estimatedHeight = Math.min(Math.max(panel.offsetHeight || 420, 260), window.innerHeight - 24)
    return {
      left: Math.max(12, Math.min(left, window.innerWidth - panelWidth - 12)),
      top: Math.max(12, Math.min(top, window.innerHeight - estimatedHeight - 12)),
    }
  }

  function positionPanel(anchor: { x: number; y: number } | null, info: InspectorInfo | null = currentInfo): void {
    if (panelPosition) {
      const next = clampPanelPosition(panelPosition.left, panelPosition.top)
      panelPosition = next
      panel.style.left = `${next.left}px`
      panel.style.top = `${next.top}px`
      return
    }

    if (!anchor) return

    const panelWidth = 380
    const gap = 16
    const estimatedHeight = Math.min(Math.max(panel.offsetHeight || 420, 260), window.innerHeight - 24)

    let left = anchor.x + gap
    let top = anchor.y + gap

    if (left + panelWidth > window.innerWidth - 12) {
      left = Math.max(12, anchor.x - panelWidth - gap)
    }

    if (top + estimatedHeight > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - estimatedHeight - 12)
    }

    if (info) {
      const rect = info.rect
      const overlapsHorizontally = left < rect.left + rect.width && left + panelWidth > rect.left
      const overlapsVertically = top < rect.top + rect.height && top + estimatedHeight > rect.top
      if (overlapsHorizontally && overlapsVertically) {
        const placeAbove = rect.top - estimatedHeight - gap
        const placeBelow = rect.top + rect.height + gap
        if (placeBelow + estimatedHeight <= window.innerHeight - 12) {
          top = placeBelow
        } else if (placeAbove >= 12) {
          top = placeAbove
        }
      }
    }

    const next = clampPanelPosition(left, top)
    panel.style.left = `${next.left}px`
    panel.style.top = `${next.top}px`
  }

  function isAllZeroMargin(m: { top: string; right: string; bottom: string; left: string }): boolean {
    return [m.top, m.right, m.bottom, m.left].every(v => formatBoxNumber(v) === '0')
  }

  function cleanupPanelExtras(): void {
    panel.querySelectorAll('.ei-annotate, .ei-ann-export').forEach(n => n.remove())
    panel.classList.remove('is-changes')
    changesCloseBtn.style.display = 'none'
    subtitle.style.display = 'none'
  }

  function getReorderableSiblings(element: HTMLElement): HTMLElement[] {
    const container = element.parentElement
    if (!container) return []
    return getHTMLElementChildren(container).filter(child => child.getAttribute(IGNORE_ATTR) !== 'true')
  }

  function getReorderContainer(element: HTMLElement): HTMLElement | null {
    const container = element.parentElement
    if (!container) return null
    return getReorderableSiblings(element).length >= 2 ? container : null
  }

  function getReorderAxis(container: HTMLElement): 'x' | 'y' {
    const style = window.getComputedStyle(container)
    if (style.display === 'grid') {
      const columns = style.gridTemplateColumns.split(/\s+/).filter(Boolean)
      return columns.length > 1 ? 'x' : 'y'
    }
    if (style.display === 'flex') {
      return style.flexDirection.startsWith('column') ? 'y' : 'x'
    }

    const children = getHTMLElementChildren(container).filter(child => child.getAttribute(IGNORE_ATTR) !== 'true')
    const firstChild = children[0]
    const secondChild = children[1]
    if (!firstChild || !secondChild) return 'y'
    const first = firstChild.getBoundingClientRect()
    const second = secondChild.getBoundingClientRect()
    const dx = Math.abs(second.left - first.left)
    const dy = Math.abs(second.top - first.top)
    return dx > dy ? 'x' : 'y'
  }

  function getInsertionTarget(
    siblings: HTMLElement[],
    pointerX: number,
    pointerY: number,
    dragged: HTMLElement,
    axis: 'x' | 'y',
  ): { target: HTMLElement | null; placement: 'before' | 'after'; index: number } {
    const otherSiblings = siblings.filter(sibling => sibling !== dragged)
    if (otherSiblings.length === 0) {
      return { target: null, placement: 'after', index: 0 }
    }

    if (axis === 'y') {
      const rows = otherSiblings
        .slice()
        .sort((a, b) => {
          const rectA = a.getBoundingClientRect()
          const rectB = b.getBoundingClientRect()
          const topDiff = rectA.top - rectB.top
          if (Math.abs(topDiff) > 8) return topDiff
          return rectA.left - rectB.left
        })

      for (const sibling of rows) {
        const rect = sibling.getBoundingClientRect()
        const midpoint = rect.top + rect.height / 2
        if (pointerY <= midpoint) {
          return { target: sibling, placement: 'before', index: siblings.indexOf(sibling) }
        }
      }
      return { target: null, placement: 'after', index: siblings.length - (siblings.includes(dragged) ? 1 : 0) }
    }

    const columns = otherSiblings
      .slice()
      .sort((a, b) => {
        const rectA = a.getBoundingClientRect()
        const rectB = b.getBoundingClientRect()
        const leftDiff = rectA.left - rectB.left
        if (Math.abs(leftDiff) > 8) return leftDiff
        return rectA.top - rectB.top
      })

    for (const sibling of columns) {
      const rect = sibling.getBoundingClientRect()
      const midpoint = rect.left + rect.width / 2
      if (pointerX <= midpoint) {
        return { target: sibling, placement: 'before', index: siblings.indexOf(sibling) }
      }
    }

    return { target: null, placement: 'after', index: siblings.length - (siblings.includes(dragged) ? 1 : 0) }
  }

  function applyMoveInsertion(
    container: HTMLElement,
    dragged: HTMLElement,
    target: HTMLElement | null,
    placement: 'before' | 'after',
  ): void {
    if (target) {
      if (placement === 'before') {
        if (dragged.nextElementSibling === target) return
        container.insertBefore(dragged, target)
        return
      }
      const nextSibling = target.nextElementSibling
      if (target === dragged || nextSibling === dragged) return
      container.insertBefore(dragged, nextSibling)
      return
    }

    if (container.lastElementChild !== dragged) {
      container.appendChild(dragged)
    }
  }

  function updateMoveGuide(bounds: DOMRect, pointerX: number, pointerY: number, axis: 'x' | 'y'): void {
    if (axis === 'x') {
      moveGuideLine.style.left = `${bounds.left}px`
      moveGuideLine.style.top = `${pointerY}px`
      moveGuideLine.style.width = `${Math.max(bounds.width, 0)}px`
      moveGuideDot.style.left = `${pointerX}px`
      moveGuideDot.style.top = `${pointerY}px`
      return
    }

    moveGuideLine.style.left = `${pointerX}px`
    moveGuideLine.style.top = `${bounds.top}px`
    moveGuideLine.style.width = `${Math.max(bounds.height, 0)}px`
    moveGuideLine.style.transform = 'rotate(90deg)'
    moveGuideDot.style.left = `${pointerX}px`
    moveGuideDot.style.top = `${pointerY}px`
  }

  function resetMoveGuide(): void {
    moveGuideLine.style.transform = 'none'
    moveGuideLine.style.width = '0px'
    moveGuideDot.style.left = '0px'
    moveGuideDot.style.top = '0px'
  }

  function updateMoveIndicator(
    _container: HTMLElement,
    _target: HTMLElement | null,
    _placement: 'before' | 'after',
    _axis: 'x' | 'y',
  ): void {
    moveIndicator.dataset.visible = 'true'
    setActiveMoveHandle(moveDragState?.element ?? null)
  }

  function updateMoveOverlay(container: HTMLElement, activeElement: HTMLElement | null = null): void {
    moveIndicator.dataset.visible = 'true'
    updateMoveHandles(container, getReorderableSiblings(activeElement ?? lockedElement ?? container), activeElement)
  }

  function hideMoveIndicator(): void {
    moveIndicator.dataset.visible = 'false'
    moveBounds.style.width = '0px'
    moveBounds.style.height = '0px'
    moveBoundsLabel.style.left = '0px'
    moveBoundsLabel.style.top = '0px'
    resetMoveGuide()
    clearMoveHandles()
  }

  function clampPointerToBounds(x: number, y: number, bounds: DOMRect): { x: number; y: number } {
    return {
      x: Math.max(bounds.left + 1, Math.min(x, bounds.right - 1)),
      y: Math.max(bounds.top + 1, Math.min(y, bounds.bottom - 1)),
    }
  }

  function getMoveBounds(container: HTMLElement): DOMRect {
    return container.getBoundingClientRect()
  }

  function syncMoveOverlay(): void {
    if (currentMode !== 'move' || !lockedElement) {
      hideMoveIndicator()
      return
    }
    showMoveOverlay(lockedElement)
  }

  function resetMoveDragHandleState(): void {
    moveHandleEntries.forEach(({ handle }) => {
      handle.dataset.active = 'false'
    })
  }

  function setActiveMoveHandle(element: HTMLElement | null): void {
    moveHandleEntries.forEach(({ handle, element: entryElement }) => {
      handle.dataset.active = element != null && entryElement === element ? 'true' : 'false'
    })
  }

  function startMoveDragFromHandle(entry: { handle: HTMLButtonElement; element: HTMLElement }, event: MouseEvent): void {
    const container = getReorderContainer(entry.element)
    if (!container) return
    const siblings = getReorderableSiblings(entry.element)
    const bounds = getMoveBounds(container)
    const elementRect = entry.element.getBoundingClientRect()
    lockedElement = entry.element
    panelAnchor = { x: event.clientX, y: event.clientY }
    moveDragState = {
      element: entry.element,
      container,
      siblings,
      startX: event.clientX,
      startY: event.clientY,
      started: false,
      initialIndex: siblings.indexOf(entry.element),
      lastIndex: siblings.indexOf(entry.element),
      axis: getReorderAxis(container),
      placement: 'before',
      target: null,
      bounds,
      elementRect,
      dragOffsetX: event.clientX - (elementRect.left + elementRect.width / 2),
      dragOffsetY: event.clientY - (elementRect.top + elementRect.height / 2),
    }
    showMoveOverlay(entry.element)
    setActiveMoveHandle(entry.element)
    event.preventDefault()
    event.stopPropagation()
  }

  function finishMoveDrag(): void {
    if (!moveDragState) return
    if (moveDragRaf) {
      window.cancelAnimationFrame(moveDragRaf)
      moveDragRaf = 0
    }
    pendingMovePointer = null

    // Clear all transforms and apply real DOM insertion
    moveDragState.element.style.transform = ''
    moveDragState.element.style.transition = ''

    moveDragState.siblings.forEach(sibling => {
      sibling.style.transform = ''
      sibling.style.transition = ''
    })

    if (moveDragState.started && moveDragState.target !== null || moveDragState.lastIndex !== moveDragState.initialIndex) {
      // Apply the actual DOM insertion
      applyMoveInsertion(moveDragState.container, moveDragState.element, moveDragState.target, moveDragState.placement)
      const newIndex = getReorderableSiblings(moveDragState.element).indexOf(moveDragState.element)
      delete moveDragState.element.dataset.eiMoving
      saveMoveChange(moveDragState.element, moveDragState.initialIndex, newIndex)
    }

    hideMoveIndicator()
    if (moveDragState.started) {
      const info = extractInspectorInfo(moveDragState.element)
      currentInfo = info
      renderMove(info)
      setTimeout(() => {
        suppressNextClick = false
      }, 0)
    }
    moveDragState = null
    resetMoveDragHandleState()
  }

  function cancelMoveDrag(): void {
    if (!moveDragState) return
    if (moveDragRaf) {
      window.cancelAnimationFrame(moveDragRaf)
      moveDragRaf = 0
    }
    pendingMovePointer = null

    // Clear all transforms
    moveDragState.element.style.transform = ''
    moveDragState.element.style.transition = ''
    moveDragState.siblings.forEach(sibling => {
      sibling.style.transform = ''
      sibling.style.transition = ''
    })

    delete moveDragState.element.dataset.eiMoving
    moveDragState = null
    resetMoveDragHandleState()
    syncMoveOverlay()
  }

  function flushMoveDrag(): void {
    moveDragRaf = 0
    if (!moveDragState || !pendingMovePointer) return

    const pointer = clampPointerToBounds(pendingMovePointer.x, pendingMovePointer.y, moveDragState.bounds)
    const dx = pointer.x - moveDragState.startX
    const dy = pointer.y - moveDragState.startY

    // Move dragged element with transform (follow mouse smoothly)
    moveDragState.element.style.transform = `translate(${dx}px, ${dy}px)`
    moveDragState.element.style.transition = 'none'

    updateMoveGuide(moveDragState.bounds, pointer.x, pointer.y, moveDragState.axis)
    const siblings = getReorderableSiblings(moveDragState.element)
    moveDragState.siblings = siblings
    const insertion = getInsertionTarget(
      siblings,
      pointer.x,
      pointer.y,
      moveDragState.element,
      moveDragState.axis,
    )
    moveDragState.target = insertion.target
    moveDragState.placement = insertion.placement

    const currentIndex = siblings.indexOf(moveDragState.element)
    const newIndex = insertion.index

    // Shift other elements with transform to make space (smooth visual feedback)
    const axis = moveDragState.axis
    const draggedElement = moveDragState.element
    const draggedSize = axis === 'y'
      ? moveDragState.elementRect.height
      : moveDragState.elementRect.width

    if (newIndex !== currentIndex) {
      siblings.forEach((sibling, idx) => {
        if (sibling === draggedElement) return
        sibling.style.transition = 'transform 80ms ease-out'

        let shift = 0
        if (currentIndex < newIndex) {
          // Moving forward: elements between current and new shift back
          if (idx > currentIndex && idx < newIndex) {
            shift = -draggedSize
          } else if (idx >= newIndex) {
            // No shift for elements after the new position
            shift = 0
          }
        } else if (currentIndex > newIndex) {
          // Moving backward: elements between new and current shift forward
          if (idx >= newIndex && idx < currentIndex) {
            shift = draggedSize
          }
        }

        sibling.style.transform = shift !== 0 ? `translate${axis === 'y' ? 'Y' : 'X'}(${shift}px)` : ''
      })
    }

    updateMoveIndicator(moveDragState.container, insertion.target, insertion.placement, axis)
  }

  function scheduleMoveDrag(): void {
    if (moveDragRaf) return
    moveDragRaf = window.requestAnimationFrame(flushMoveDrag)
  }

  function updateMoveDrag(event: MouseEvent): boolean {
    if (!moveDragState) return false
    hideTooltip()
    const dx = event.clientX - moveDragState.startX
    const dy = event.clientY - moveDragState.startY
    if (!moveDragState.started && Math.hypot(dx, dy) >= 2) {
      moveDragState.started = true
      suppressNextClick = true
      moveDragState.element.dataset.eiMoving = 'true'
    }
    if (!moveDragState.started) return true

    pendingMovePointer = { x: event.clientX, y: event.clientY }
    scheduleMoveDrag()
    return true
  }

  function describeMoveChange(element: HTMLElement, initialIndex: number, nextIndex: number): string {
    const from = initialIndex + 1
    const to = nextIndex + 1
    return `reorder: position ${from} → ${to}`
  }

  function saveMoveChange(element: HTMLElement, initialIndex: number, nextIndex: number): void {
    if (initialIndex === nextIndex) return
    const comment = describeMoveChange(element, initialIndex, nextIndex)
    const moveDiff = { fromIndex: initialIndex, toIndex: nextIndex }
    const existingId = moveChangeIdByElement.get(element)
    if (existingId) {
      updateChange(existingId, comment, [])
      const change = changes.find(c => c.id === existingId)
      if (change) {
        change.patch.moveDiff = moveDiff
        persistChangesState()
      }
      return
    }
    const changeId = addChange(element, comment, 'move', [])
    const change = changes.find(c => c.id === changeId)
    if (change) {
      change.patch.moveDiff = moveDiff
      persistChangesState()
    }
    moveChangeIdByElement.set(element, changeId)
  }

  // --- Tooltip ---

  function buildTooltipContent(info: InspectorInfo): void {
    tooltip.innerHTML = ''

    const head = el('div', 'ei-tt-head')
    head.append(
      el('span', 'ei-tt-tag', info.tagName),
      el('span', 'ei-tt-size', `${Math.round(info.rect.width)} \u00D7 ${Math.round(info.rect.height)}`),
    )
    tooltip.appendChild(head)

    const colorRow = el('div', 'ei-tt-row')
    const colorSwatch = el('span', 'ei-tt-swatch')
    colorSwatch.style.backgroundColor = info.typography.color
    colorRow.append(
      el('span', 'ei-tt-label', i18n.inspector.color),
      colorSwatch,
      el('span', 'ei-tt-val', rgbToHex(info.typography.color)),
    )
    tooltip.appendChild(colorRow)

    const fontRow = el('div', 'ei-tt-row')
    fontRow.append(
      el('span', 'ei-tt-label', i18n.inspector.font),
      el('span', 'ei-tt-val', `${info.typography.fontSize} ${truncate(info.typography.fontFamily, 36)}`),
    )
    tooltip.appendChild(fontRow)

    if (!isAllZeroMargin(info.boxModel.margin)) {
      const marginRow = el('div', 'ei-tt-row')
      const m = info.boxModel.margin
      marginRow.append(
        el('span', 'ei-tt-label', i18n.inspector.margin),
        el('span', 'ei-tt-val', `${m.top} ${m.right} ${m.bottom} ${m.left}`),
      )
      tooltip.appendChild(marginRow)
    }

    if (!isAllZeroMargin(info.boxModel.padding)) {
      const paddingRow = el('div', 'ei-tt-row')
      const p = info.boxModel.padding
      paddingRow.append(
        el('span', 'ei-tt-label', i18n.inspector.padding),
        el('span', 'ei-tt-val', `${p.top} ${p.right} ${p.bottom} ${p.left}`),
      )
      tooltip.appendChild(paddingRow)
    }

    const a11y = info.accessibility
    const divider = el('div', 'ei-tt-divider', i18n.inspector.accessibility)
    tooltip.appendChild(divider)

    if (a11y.name) {
      const nameRow = el('div', 'ei-tt-row')
      nameRow.append(el('span', 'ei-tt-label', i18n.inspector.name), el('span', 'ei-tt-val', truncate(a11y.name, 40)))
      tooltip.appendChild(nameRow)
    }

    const roleRow = el('div', 'ei-tt-row')
    roleRow.append(el('span', 'ei-tt-label', i18n.inspector.role), el('span', 'ei-tt-val', a11y.role))
    tooltip.appendChild(roleRow)

    const kbRow = el('div', 'ei-tt-row')
    const kbIcon = el('span', a11y.keyboardFocusable ? 'ei-tt-yes' : 'ei-tt-no')
    kbIcon.textContent = a11y.keyboardFocusable ? '\u2713' : '\u2718'
    kbRow.append(el('span', 'ei-tt-label', i18n.inspector.keyboardFocusable), kbIcon)
    tooltip.appendChild(kbRow)
  }

  function positionTooltip(x: number, y: number): void {
    const gap = 12
    const tooltipRect = tooltip.getBoundingClientRect()
    const tw = tooltipRect.width || 200
    const th = tooltipRect.height || 120
    let left = x + gap
    let top = y + gap

    if (left + tw > window.innerWidth - 8) left = x - tw - gap
    if (top + th > window.innerHeight - 8) top = y - th - gap
    if (left < 8) left = 8
    if (top < 8) top = 8

    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
  }

  function positionTooltipForElement(target: HTMLElement): void {
    const gap = 4
    const rect = target.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()
    const tw = tooltipRect.width || 200
    const th = tooltipRect.height || 40

    let left = rect.left + rect.width / 2 - tw / 2
    let top = rect.top - th - gap

    if (top < 8) top = rect.bottom + gap
    if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8
    if (left < 8) left = 8
    if (top + th > window.innerHeight - 8) top = window.innerHeight - th - 8
    if (top < 8) top = 8

    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
  }

  function showTextTooltipForElement(text: string, target: HTMLElement): void {
    tooltip.innerHTML = ''
    tooltip.textContent = text
    tooltip.style.display = 'block'
    positionTooltipForElement(target)
  }

  function updateTextTooltipForElement(target: HTMLElement): void {
    if (tooltip.style.display === 'none') return
    positionTooltipForElement(target)
  }

  function isActionTooltipVisible(text: string): boolean {
    return tooltip.style.display !== 'none' && tooltip.textContent === text
  }

  function refreshActionTooltip(button: HTMLButtonElement): void {
    const label = getActionButtonLabel(button)
    if (!isActionTooltipVisible(label)) return
    showTextTooltipForElement(label, button)
  }

  function hideTooltip(): void {
    tooltip.style.display = 'none'
  }

  function bindActionTooltip(button: HTMLButtonElement, getText: () => string): void {
    button.addEventListener('mouseenter', () => {
      showTextTooltipForElement(getText(), button)
    })
    button.addEventListener('mousemove', () => {
      updateTextTooltipForElement(button)
    })
    button.addEventListener('mouseleave', () => {
      hideTooltip()
    })
    button.addEventListener('blur', () => {
      hideTooltip()
    })
  }

  function setActionButtonLabel(button: HTMLButtonElement, label: string): void {
    button.ariaLabel = label
    button.dataset.tooltip = label
    refreshActionTooltip(button)
  }

  function getActionButtonLabel(button: HTMLButtonElement): string {
    return button.dataset.tooltip || button.ariaLabel || ''
  }

  function showTooltip(info: InspectorInfo, x: number, y: number): void {
    buildTooltipContent(info)
    tooltip.style.display = 'block'
    positionTooltip(x, y)
  }

  function showTextTooltip(text: string, x: number, y: number): void {
    tooltip.innerHTML = ''
    tooltip.textContent = text
    tooltip.style.display = 'block'
    positionTooltip(x, y)
  }

  // --- Change management ---

  function findChangeForElement(element: HTMLElement): Change | undefined {
    return changes.find(c => c.element === element)
  }

  function moveElementToIndex(element: HTMLElement, index: number): void {
    const container = element.parentElement
    if (!container) return
    const siblings = getReorderableSiblings(element)
    const otherSiblings = siblings.filter(sibling => sibling !== element)
    const clampedIndex = Math.max(0, Math.min(index, otherSiblings.length))
    const target = otherSiblings[clampedIndex] ?? null
    container.insertBefore(element, target)
  }

  function isInternalResetDiff(diff: NonNullable<Change['diffs']>[number]): boolean {
    const modified = diff.modified.trim()
    if (modified !== '') return false
    return ['border', 'border-style', 'border-color', 'border-width', 'outline', 'outline-offset', 'box-shadow'].includes(diff.property)
  }

  function getUserVisibleStyleDiffs(change: Change): NonNullable<Change['diffs']> {
    return change.patch.styleDiffs.filter(diff => !isInternalResetDiff(diff))
  }

  function mergeDiffs(existingDiffs: NonNullable<Change['diffs']> = [], nextDiffs: NonNullable<Change['diffs']> = []): NonNullable<Change['diffs']> {
    const merged = new Map<string, NonNullable<Change['diffs']>[number]>()

    existingDiffs.forEach((diff) => {
      merged.set(diff.property, diff)
    })

    nextDiffs.forEach((diff) => {
      const existing = merged.get(diff.property)
      if (existing) {
        if (diff.modified === existing.original) {
          merged.delete(diff.property)
          return
        }
        merged.set(diff.property, {
          property: diff.property,
          original: existing.original,
          modified: diff.modified,
        })
        return
      }
      if (diff.original !== diff.modified) {
        merged.set(diff.property, diff)
      }
    })

    return Array.from(merged.values())
  }

  function applyChangeToAfter(change: Change): void {
    if (change.patch.textDiff) change.element.textContent = change.patch.textDiff.to
    for (const diff of change.patch.styleDiffs) {
      change.element.style.setProperty(diff.property, diff.modified)
    }
    if (change.patch.moveDiff) {
      moveElementToIndex(change.element, Math.max(0, change.patch.moveDiff.toIndex))
    }
  }

  function resetChangeToBefore(change: Change): void {
    if (change.patch.textDiff) change.element.textContent = change.patch.textDiff.from
    for (const diff of change.patch.styleDiffs) {
      if (diff.original) change.element.style.setProperty(diff.property, diff.original)
      else change.element.style.removeProperty(diff.property)
    }
    if (change.patch.moveDiff) {
      moveElementToIndex(change.element, Math.max(0, change.patch.moveDiff.fromIndex))
    }
  }

  function clearAllChanges(): void {
    changes.forEach(resetChangeToBefore)
    changes = []
    changeIdCounter = 0
    clearPersistedChanges()
    activeChangeId = null
    beforePreviewChangeIds.clear()
    moveChangeIdByElement = new WeakMap<HTMLElement, string>()
    renderMarkers()
    if (currentMode === 'changes') renderChangesList()
    closeOutputDetailMenu()
  }

  function persistChangesState(): void {
    persistChanges(changes)
  }

  function findElementForPersistedChange(change: PersistedChange): HTMLElement | null {
    const selectors = [
      change.target?.selector?.primary,
      ...(change.target?.selector?.stable ?? []),
      ...(change.target?.selector?.semantic ?? []),
      ...(change.target?.selector?.structural ?? []),
      change.target?.domPath,
    ].filter((selector): selector is string => Boolean(selector))

    const candidates: HTMLElement[] = []
    const seen = new Set<HTMLElement>()

    selectors.forEach((selector) => {
      try {
        document.querySelectorAll(selector).forEach((node) => {
          if (!(node instanceof HTMLElement)) return
          if (seen.has(node)) return
          seen.add(node)
          candidates.push(node)
        })
      } catch {
        // Ignore invalid selectors.
      }
    })

    if (candidates.length === 0) return null
    if (candidates.length === 1) return candidates[0] ?? null

    const normalize = (value: string | null | undefined): string => (value || '').trim().replace(/\s+/g, ' ')
    const targetText = normalize(change.target?.text)
    const targetId = normalize(change.target?.identity?.id)
    const targetRole = normalize(change.target?.identity?.role)
    const targetAccessibleName = normalize(change.target?.identity?.accessibleName)
    const targetParentTag = normalize(change.target?.context?.parentTag)
    const targetPrevText = normalize(change.target?.context?.previousSiblingText)
    const targetNextText = normalize(change.target?.context?.nextSiblingText)
    const targetClasses = new Set(normalize(change.target?.identity?.className).split(/\s+/).filter(Boolean))
    const targetBox = change.target?.box

    const scoreCandidate = (element: HTMLElement): number => {
      let score = 0
      const text = normalize(element.innerText || element.textContent)
      const id = normalize(element.id)
      const role = normalize(element.getAttribute('role'))
      const accessibleName = normalize(element.getAttribute('aria-label') || element.getAttribute('title'))
      const parentTag = normalize(element.parentElement?.tagName.toLowerCase())
      const prevText = normalize((element.previousElementSibling as HTMLElement | null)?.innerText || element.previousElementSibling?.textContent)
      const nextText = normalize((element.nextElementSibling as HTMLElement | null)?.innerText || element.nextElementSibling?.textContent)
      const classes = new Set((element.className || '').split(/\s+/).filter(Boolean))

      if (element.tagName.toLowerCase() === change.target?.tagName.toLowerCase()) score += 20
      if (targetId && id === targetId) score += 200
      if (targetRole && role === targetRole) score += 30
      if (targetAccessibleName && accessibleName === targetAccessibleName) score += 40
      if (targetText && text === targetText) score += 80
      else if (targetText && text.includes(targetText)) score += 30
      if (targetParentTag && parentTag === targetParentTag) score += 20
      if (targetPrevText && prevText === targetPrevText) score += 35
      if (targetNextText && nextText === targetNextText) score += 35

      if (targetClasses.size > 0) {
        let classMatches = 0
        targetClasses.forEach((className) => {
          if (classes.has(className)) classMatches += 1
        })
        score += classMatches * 12
      }

      if (targetBox) {
        const rect = element.getBoundingClientRect()
        const dx = Math.abs(Math.round(rect.left) - targetBox.x)
        const dy = Math.abs(Math.round(rect.top) - targetBox.y)
        const dw = Math.abs(Math.round(rect.width) - targetBox.width)
        const dh = Math.abs(Math.round(rect.height) - targetBox.height)
        score += Math.max(0, 40 - Math.min(40, dx + dy))
        score += Math.max(0, 20 - Math.min(20, dw + dh))
      }

      return score
    }

    return candidates
      .map((element) => ({ element, score: scoreCandidate(element) }))
      .sort((a, b) => b.score - a.score)[0]?.element ?? null
  }

  function restorePersistedChanges(): void {
    const persistedChanges = loadPersistedChanges()
    if (persistedChanges.length === 0) return

    let maxId = 0
    const restoredChanges: Change[] = []

    persistedChanges.forEach((change) => {
      const element = findElementForPersistedChange(change)
      if (!element) return
      restoredChanges.push({ ...change, element })
      const numericId = Number.parseInt(change.id, 10)
      if (Number.isFinite(numericId)) {
        maxId = Math.max(maxId, numericId)
      }
    })

    changes = restoredChanges
    changeIdCounter = maxId
    restoredChanges.forEach(applyChangeToAfter)
    if (restoredChanges.length > 0) {
      renderMarkers()
      return
    }
    clearPersistedChanges()
  }

  function addChange(element: HTMLElement, comment: string, type: 'annotation' | 'design' | 'move' = 'annotation', diffs?: Change['diffs']): string {
    changeIdCounter++
    const info = extractInspectorInfo(element)
    const isoTimestamp = new Date().toISOString()
    const snapshot = buildChangeSnapshot(info)
    const change: Change = {
      id: String(changeIdCounter),
      type,
      element,
      comment,
      info,
      diffs,
      timestamp: Date.now(),
      target: buildChangeTarget(element, info),
      patch: buildChangePatch(type, diffs, comment),
      beforeSnapshot: snapshot,
      afterSnapshot: snapshot,
      meta: {
        sourceMode: type === 'move' ? 'move' : type === 'design' ? 'design' : 'inspector',
        status: 'confirmed',
        createdAt: isoTimestamp,
        updatedAt: isoTimestamp,
        route: getRoute(),
      },
    }
    changes.push(change)
    persistChangesState()
    options.onChangeAdd?.(change)
    renderMarkers()
    return change.id
  }

  function updateChange(id: string, comment: string, diffs: Change['diffs']): void {
    const change = changes.find(c => c.id === id)
    if (!change) return
    const info = extractInspectorInfo(change.element)
    if (!change.beforeSnapshot) {
      change.beforeSnapshot = buildChangeSnapshot(change.info)
    }
    const mergedDiffs = mergeDiffs(change.diffs ?? [], diffs ?? [])
    const styleComment = change.type === 'design'
      ? mergedDiffs
        .filter(d => !isInternalResetDiff(d))
        .map(d => `${d.property}: ${d.original} → ${d.modified}`)
        .join(', ')
      : comment
    const mergedComment = change.type === 'design'
      ? [styleComment, change.meta.note?.trim()].filter(Boolean).join('\n')
      : comment
    change.comment = mergedComment
    change.diffs = mergedDiffs
    change.info = info
    change.timestamp = Date.now()
    change.target = buildChangeTarget(change.element, info)
    change.patch = buildChangePatch(change.type, mergedDiffs, mergedComment)
    change.afterSnapshot = buildChangeSnapshot(info)
    change.meta.updatedAt = new Date().toISOString()
    change.meta.route = getRoute()
    persistChangesState()
    options.onChangeAdd?.(change)
    renderMarkers()
  }

  function removeChange(id: string): void {
    const change = changes.find(c => c.id === id)
    // Revert design styles when removing a design change
    if (change?.type === 'design' && change.diffs) {
      for (const diff of change.diffs) {
        change.element.style.removeProperty(diff.property)
      }
    }
    changes = changes.filter(c => c.id !== id)
    persistChangesState()
    options.onChangeRemove?.(id)
    renderMarkers()
  }

  function renderMarkers(): void {
    markersContainer.innerHTML = ''
    changes.forEach((c, i) => {
      if (!document.contains(c.element)) return
      const rect = c.element.getBoundingClientRect()
      const marker = el('div', 'ei-marker')
      marker.textContent = String(i + 1)
      marker.setAttribute(IGNORE_ATTR, 'true')
      marker.style.left = `${rect.left + rect.width - 12}px`
      marker.style.top = `${rect.top - 12}px`
      marker.addEventListener('click', (e) => {
        e.stopPropagation()
        setMode('inspector')
        lockedElement = c.element
        panelAnchor = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        renderInfo(extractInspectorInfo(c.element))
      })
      markersContainer.appendChild(marker)
    })
  }

  // --- Annotate input (inspector mode) ---

  function renderAnnotateInput(element: HTMLElement): HTMLDivElement {
    const wrap = el('div', 'ei-annotate')
    const textarea = document.createElement('textarea')
    textarea.className = 'ei-annotate-input'
    textarea.placeholder = '\u6DFB\u52A0\u6CE8\u91CA\u2026'
    textarea.setAttribute(IGNORE_ATTR, 'true')
    const existing = findChangeForElement(element)
    if (existing) textarea.value = existing.comment
    annotateInput = textarea

    textarea.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        submitAnnotation(element, textarea.value)
      }
    })

    const actionsRow = el('div', 'ei-annotate-actions')
    const submitBtn = el('button', 'ei-annotate-btn ei-annotate-btn-primary', existing ? i18n.actions.update : i18n.actions.add)
    submitBtn.type = 'button'
    submitBtn.setAttribute(IGNORE_ATTR, 'true')
    submitBtn.addEventListener('click', () => submitAnnotation(element, textarea.value))
    actionsRow.appendChild(submitBtn)

    wrap.append(textarea, actionsRow)
    return wrap
  }

  function submitAnnotation(element: HTMLElement, comment: string): void {
    const trimmed = comment.trim()
    if (!trimmed) return
    addChange(element, trimmed)
    lockedElement = null
    panelAnchor = null
    panelPosition = null
    annotateInput = null
    renderInfo(null)
  }

  // --- Changes list ---

  let isOutputDetailMenuOpen = false

  function getOutputDetailLabel(detail: OutputDetail): string {
    return i18n.outputDetail[detail]
  }

  function positionOutputDetailMenu(anchor: HTMLElement): void {
    const rect = anchor.getBoundingClientRect()
    outputDetailMenu.style.left = `${rect.left}px`
    outputDetailMenu.style.top = `${rect.top - outputDetailMenu.offsetHeight - 8}px`
  }

  function closeOutputDetailMenu(): void {
    if (!isOutputDetailMenuOpen) return
    isOutputDetailMenuOpen = false
    outputDetailMenu.style.display = 'none'
  }

  function openOutputDetailMenu(anchor: HTMLElement, onSelect: (detail: OutputDetail) => void): void {
    outputDetailMenu.innerHTML = ''
    const options: Array<{ value: OutputDetail; desc: string }> = [
      { value: 'compact', desc: i18n.outputDetail.compactDesc },
      { value: 'standard', desc: i18n.outputDetail.standardDesc },
      { value: 'detailed', desc: i18n.outputDetail.detailedDesc },
      { value: 'forensic', desc: i18n.outputDetail.forensicDesc },
    ]

    for (const option of options) {
      const item = el('button', 'ei-output-detail-item') as HTMLButtonElement
      item.type = 'button'
      if (option.value === outputDetail) item.classList.add('is-active')
      item.innerHTML = `<span class="ei-output-detail-name">${getOutputDetailLabel(option.value)}</span><span class="ei-output-detail-desc">${option.desc}</span>`
      item.addEventListener('click', () => {
        outputDetail = option.value
        closeOutputDetailMenu()
        onSelect(option.value)
      })
      outputDetailMenu.appendChild(item)
    }

    outputDetailMenu.style.display = 'block'
    isOutputDetailMenuOpen = true
    positionOutputDetailMenu(anchor)
  }

  function toggleOutputDetailMenu(anchor: HTMLElement, onSelect: (detail: OutputDetail) => void): void {
    if (isOutputDetailMenuOpen) closeOutputDetailMenu()
    else openOutputDetailMenu(anchor, onSelect)
  }

  function renderChangesList(): void {
    body.innerHTML = ''
    cleanupPanelExtras()
    panel.classList.add('is-changes')
    titleEl.textContent = i18n.panel.changesTitle
    subtitle.textContent = ''
    subtitle.style.display = 'none'
    copyBtn.style.display = 'none'
    unlockBtn.style.display = 'none'
    changesCloseBtn.style.display = 'inline-flex'
    changesCloseBtn.onclick = () => setMode('inspector')

    const currentRoute = getRoute()

    const typeKey = (change: Change): 'style' | 'text' | 'move' | 'note' => {
      if (change.type === 'move') return 'move'
      if (change.type === 'annotation') return 'note'
      return change.patch.textDiff ? 'text' : 'style'
    }

    const typeLabel = (change: Change): string => {
      const key = typeKey(change)
      if (key === 'text') return i18n.changes.text
      if (key === 'style') return i18n.changes.style
      if (key === 'move') return i18n.changes.move
      return i18n.changes.note
    }

    const sourceLabel = (change: Change): string => change.meta.sourceMode === 'design'
      ? i18n.toolbar.design
      : change.meta.sourceMode === 'move'
        ? i18n.toolbar.move
        : i18n.toolbar.inspector


    const selectorText = (change: Change): string => change.target?.selector?.primary || change.target?.domPath || change.info.domPath
    const routeText = (change: Change): string => change.meta.route || currentRoute
    const visibleChanges = changes.filter(change => changesFilter === 'all' || typeKey(change) === changesFilter)

    const flashChangeTarget = (element: HTMLElement): void => {
      if (changeFlashTimeout != null) {
        window.clearTimeout(changeFlashTimeout)
        changeFlashTimeout = null
      }
      if (changeFlashElement) {
        changeFlashElement.classList.remove('ei-change-flash-target')
      }
      changeFlashElement = element
      element.classList.add('ei-change-flash-target')
      changeFlashTimeout = window.setTimeout(() => {
        element.classList.remove('ei-change-flash-target')
        if (changeFlashElement === element) changeFlashElement = null
        changeFlashTimeout = null
      }, 1400)
    }

    const formatRelativeTime = (value: string): string => {
      const timestamp = Date.parse(value)
      if (!Number.isFinite(timestamp)) return 'just now'
      const delta = Math.max(0, Date.now() - timestamp)
      const minute = 60_000
      const hour = 60 * minute
      const day = 24 * hour
      if (delta < minute) return 'just now'
      if (delta < hour) return `${Math.max(1, Math.floor(delta / minute))} min ago`
      if (delta < day) return `${Math.max(1, Math.floor(delta / hour))} hour${delta >= 2 * hour ? 's' : ''} ago`
      return `${Math.max(1, Math.floor(delta / day))} day${delta >= 2 * day ? 's' : ''} ago`
    }

    const ensureButtonIconStack = (button: HTMLButtonElement): { current: HTMLSpanElement; next: HTMLSpanElement } => {
      let stack = button.querySelector('.ei-ann-action-icon-stack') as HTMLSpanElement | null
      let current = button.querySelector('.ei-ann-action-icon.is-current') as HTMLSpanElement | null
      let next = button.querySelector('.ei-ann-action-icon.is-next') as HTMLSpanElement | null
      if (!stack || !current || !next) {
        stack = el('span', 'ei-ann-action-icon-stack') as HTMLSpanElement
        current = el('span', 'ei-ann-action-icon is-current') as HTMLSpanElement
        next = el('span', 'ei-ann-action-icon is-next') as HTMLSpanElement
        stack.append(current, next)
        button.innerHTML = ''
        button.appendChild(stack)
      }
      return { current, next }
    }

    const setButtonIcon = (button: HTMLButtonElement, svg: string): void => {
      const { current, next } = ensureButtonIconStack(button)
      current.innerHTML = svg
      next.innerHTML = ''
      button.classList.remove('is-switching')
    }

    const swapButtonIcon = (button: HTMLButtonElement, svg: string): void => {
      const { current, next } = ensureButtonIconStack(button)
      next.innerHTML = svg
      button.classList.add('is-switching')
      window.setTimeout(() => {
        current.innerHTML = svg
        next.innerHTML = ''
        button.classList.remove('is-switching')
      }, 50)
    }

    const iconButton = (svg: string, label: string, className = 'ei-ann-action'): HTMLButtonElement => {
      const button = el('button', className) as HTMLButtonElement
      button.type = 'button'
      setActionButtonLabel(button, label)
      button.setAttribute(IGNORE_ATTR, 'true')
      setButtonIcon(button, svg)
      bindActionTooltip(button, () => getActionButtonLabel(button))
      return button
    }

    const setActionCopied = (button: HTMLButtonElement): void => {
      const original = (button.querySelector('.ei-ann-action-icon') as HTMLSpanElement | null)?.innerHTML || ''
      button.classList.add('is-success')
      swapButtonIcon(button, CHANGES_HOVER_COPY_SUCCESS_ICON)
      window.setTimeout(() => {
        button.classList.remove('is-success')
        swapButtonIcon(button, original)
      }, 1200)
    }

    const EYE_OPEN_ICON = CHANGES_HOVER_PREVIEW_AFTER_ICON
    const EYE_CLOSED_ICON = CHANGES_HOVER_PREVIEW_BEFORE_ICON
    const DELETE_ICON = CHANGES_HOVER_DELETE_ICON

    const syncActiveChangeCard = (): void => {
      body.querySelectorAll('.ei-ann-item').forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        node.classList.toggle('is-active', node.dataset.changeId === activeChangeId)
      })
    }

    const locateChangeTarget = (change: Change): void => {
      activeChangeId = change.id
      syncActiveChangeCard()
      lockedElement = change.element
      currentInfo = extractInspectorInfo(change.element)
      panelAnchor = null
      change.element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      flashChangeTarget(change.element)
      renderMarkers()
    }

    const clearActiveChangeCard = (): void => {
      activeChangeId = null
      syncActiveChangeCard()
    }

    const refreshChangesList = (): void => {
      renderChangesList()
      syncActiveChangeCard()
    }

    const formatSnapshotValue = (value: string): string => value && value !== '—' ? truncate(value, 32) : '—'

    const collectSnapshotRows = (change: Change): Array<{ label: string; before: string; after: string }> => {
      const rows = [
        { label: i18n.changes.textLabel, before: change.beforeSnapshot.text, after: change.afterSnapshot.text },
        { label: i18n.changes.font, before: change.beforeSnapshot.typography.fontSize, after: change.afterSnapshot.typography.fontSize },
        { label: i18n.changes.color, before: change.beforeSnapshot.typography.color, after: change.afterSnapshot.typography.color },
        { label: i18n.changes.background, before: change.beforeSnapshot.visual.backgroundColor, after: change.afterSnapshot.visual.backgroundColor },
        { label: i18n.changes.radius, before: change.beforeSnapshot.box.borderRadius, after: change.afterSnapshot.box.borderRadius },
        { label: i18n.changes.padding, before: change.beforeSnapshot.box.padding, after: change.afterSnapshot.box.padding },
        { label: i18n.changes.gap, before: change.beforeSnapshot.layout.gap, after: change.afterSnapshot.layout.gap },
      ]

      return rows
        .filter(row => row.before !== row.after)
        .slice(0, 6)
        .map(row => ({
          label: row.label,
          before: formatSnapshotValue(row.before),
          after: formatSnapshotValue(row.after),
        }))
    }

    const buildSummaryLines = (change: Change): string[] => {
      const lines: string[] = []

      if (change.patch.textDiff) {
        lines.push(`text: ${truncate(change.patch.textDiff.from, 26)} → ${truncate(change.patch.textDiff.to, 26)}`)
      }

      if (change.patch.moveDiff) {
        lines.push(`position: ${change.patch.moveDiff.fromIndex} → ${change.patch.moveDiff.toIndex}`)
      }

      const visibleStyleDiffs = getUserVisibleStyleDiffs(change)
      if (visibleStyleDiffs.length > 0) {
        lines.push(...visibleStyleDiffs.map(diff => `${diff.property}: ${truncate(diff.original, 22)} → ${truncate(diff.modified, 22)}`))
      }

      if (lines.length > 0) return lines
      return change.comment ? [change.comment] : [i18n.changes.noExtraNotes]
    }

    const noteText = (change: Change): string => {
      if (change.type === 'annotation') return change.comment
      return change.meta.note?.trim() ?? ''
    }

    type ChangeInfoRow = {
      property: string
      value: string
      checked: boolean
      muted: boolean
      colorValue?: string
    }

    const isMutedChangeValue = (value: string): boolean => ['auto', 'none', 'normal', 'initial', 'unset'].includes(value.trim().toLowerCase())
    const isColorChangeProperty = (property: string): boolean => /color|background|fill|stroke/i.test(property)
    const getColorPreviewValue = (property: string, value: string): string | undefined => {
      if (!isColorChangeProperty(property)) return undefined
      const trimmed = value.trim()
      if (/^#(?:[\da-f]{3,8})$/i.test(trimmed) || /^rgba?\(/i.test(trimmed) || /^hsla?\(/i.test(trimmed)) return trimmed
      return undefined
    }

    const collectChangeInfoRows = (change: Change): ChangeInfoRow[] => {
      const rows: ChangeInfoRow[] = []

      if (change.patch.textDiff) {
        rows.push({
          property: 'text',
          value: truncate(change.patch.textDiff.to, 32),
          checked: true,
          muted: false,
        })
      }

      if (change.patch.moveDiff) {
        rows.push({
          property: 'position',
          value: `${change.patch.moveDiff.fromIndex} → ${change.patch.moveDiff.toIndex}`,
          checked: true,
          muted: false,
        })
      }

      getUserVisibleStyleDiffs(change).forEach((diff) => {
        const value = truncate(diff.modified || diff.original || '—', 36)
        const muted = !diff.modified || isMutedChangeValue(diff.modified)
        rows.push({
          property: diff.property,
          value,
          checked: !muted,
          muted,
          colorValue: getColorPreviewValue(diff.property, diff.modified),
        })
      })

      if (!rows.length && change.comment) {
        rows.push({ property: i18n.changes.note, value: truncate(change.comment, 36), checked: false, muted: true })
      }

      return rows.slice(0, 6)
    }

    const createChangeCheckbox = (checked: boolean, label: string, onChange: (checked: boolean) => void): HTMLLabelElement => {
      const wrap = el('label', 'ei-checkbox')
      const input = document.createElement('input')
      const mark = el('span', 'ei-checkbox-mark')
      input.type = 'checkbox'
      input.checked = checked
      input.setAttribute(IGNORE_ATTR, 'true')
      input.setAttribute('aria-label', label)
      input.addEventListener('click', (event) => event.stopPropagation())
      input.addEventListener('change', () => onChange(input.checked))
      wrap.addEventListener('click', (event) => event.stopPropagation())
      wrap.append(input, mark)
      return wrap
    }

    const createChangeInfoRow = (row: ChangeInfoRow): HTMLDivElement => {
      const node = el('div', `ei-ann-info-row${row.checked ? '' : ' is-muted'}`)
      const content = el('div', 'ei-ann-info-content')
      const property = el('span', 'ei-ann-info-property', `${row.property}:`)
      const valueWrap = el('span', 'ei-ann-info-value-wrap')
      if (row.colorValue) {
        const swatch = el('span', 'ei-ann-info-swatch')
        swatch.style.backgroundColor = row.colorValue
        valueWrap.appendChild(swatch)
      }
      valueWrap.appendChild(el('span', 'ei-ann-info-value', row.value))
      content.append(property, valueWrap)
      node.append(createChangeCheckbox(row.checked, `${row.property}: ${row.value}`, (checked) => {
        node.classList.toggle('is-muted', !checked)
      }), content)
      return node
    }

    const buildSingleAIPayload = (change: Change): string => buildAIPayload([change])

    const resetElementToBefore = (change: Change): void => {
      if (change.patch.textDiff) change.element.textContent = change.patch.textDiff.from
      for (const diff of change.patch.styleDiffs) {
        change.element.style.setProperty(diff.property, diff.original)
      }
    }

    const applyElementToAfter = (change: Change): void => {
      if (change.patch.textDiff) change.element.textContent = change.patch.textDiff.to
      for (const diff of change.patch.styleDiffs) {
        change.element.style.setProperty(diff.property, diff.modified)
      }
    }

    const resetMoveToBefore = (change: Change): void => {
      if (!change.patch.moveDiff) return
      moveElementToIndex(change.element, Math.max(0, change.patch.moveDiff.fromIndex))
    }

    const applyMoveToAfter = (change: Change): void => {
      if (!change.patch.moveDiff) return
      applyChangeToAfter(change)
    }

    const syncPreviewState = (): void => {
      changes.forEach((change) => {
        if (!document.contains(change.element)) return
        if (change.type === 'design') {
          if (beforePreviewChangeIds.has(change.id)) resetElementToBefore(change)
          else applyChangeToAfter(change)
          return
        }
        if (change.type === 'move') {
          if (beforePreviewChangeIds.has(change.id)) resetMoveToBefore(change)
          else applyMoveToAfter(change)
        }
      })
      renderMarkers()
      if (lockedElement && document.contains(lockedElement)) {
        const freshInfo = extractInspectorInfo(lockedElement)
        currentInfo = freshInfo
        updateHighlight(freshInfo)
      }
    }

    const toggleBeforePreview = (change: Change): void => {
      if (change.type !== 'design' && change.type !== 'move') return
      if (beforePreviewChangeIds.has(change.id)) beforePreviewChangeIds.delete(change.id)
      else beforePreviewChangeIds.add(change.id)
      syncPreviewState()
    }

    const filterOptions: Array<{ key: typeof changesFilter; label: string }> = [
      { key: 'all', label: i18n.changes.all },
      { key: 'style', label: i18n.changes.style },
      { key: 'text', label: i18n.changes.text },
      { key: 'move', label: i18n.changes.move },
      { key: 'note', label: i18n.changes.note },
    ]

    if (changes.length === 0) {
      body.innerHTML = '<div class="ei-ann-empty">还没有变更记录。在 Inspector 或 Design 模式中添加。</div>'
    } else {
      const filters = el('div', 'ei-ann-filters')
      for (const option of filterOptions) {
        const btn = el('button', `ei-ann-filter${changesFilter === option.key ? ' is-active' : ''}`, option.label)
        btn.type = 'button'
        btn.setAttribute(IGNORE_ATTR, 'true')
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          changesFilter = option.key
          refreshChangesList()
        })
        filters.appendChild(btn)
      }
      body.appendChild(filters)

      if (visibleChanges.length === 0) {
        body.appendChild(el('div', 'ei-ann-empty', i18n.changes.emptyFiltered))
      } else {
        const groupedChanges = visibleChanges.reduce<Record<string, Change[]>>((acc, change) => {
          const key = routeText(change)
          if (!acc[key]) acc[key] = []
          acc[key].push(change)
          return acc
        }, {})

        let visibleIndex = 0
        for (const [_groupRoute, groupItems] of Object.entries(groupedChanges)) {
          const group = el('section', 'ei-ann-group')
          const list = el('div', 'ei-ann-list')
          groupItems.forEach((c, index) => {
            visibleIndex += 1
            const selected = activeChangeId === c.id
            const isPreviewingBefore = beforePreviewChangeIds.has(c.id)
            const summaryLines = buildSummaryLines(c)
            const snapshotRows = collectSnapshotRows(c)
            const infoRows = collectChangeInfoRows(c)
            const note = noteText(c)
            if (index > 0) {
              list.appendChild(el('div', 'ei-ann-divider'))
            }
            const item = el('div', `ei-ann-item${selected ? ' is-active' : ''}${isPreviewingBefore ? ' is-previewing-before' : ''}`)
            item.setAttribute(IGNORE_ATTR, 'true')
            item.dataset.changeId = c.id
            item.addEventListener('click', () => {
              activeChangeId = c.id
              locateChangeTarget(c)
            })

            const num = el('div', 'ei-ann-num', String(visibleIndex))
            const main = el('div', 'ei-ann-main')

            const top = el('div', 'ei-ann-top')
            const author = el('div', 'ei-ann-author')
            const avatar = el('div', 'ei-ann-avatar')
            avatar.innerHTML = `<img src="${CHANGES_AVATAR_URL}" alt="" />`
            const time = el('div', 'ei-ann-time', formatRelativeTime(c.meta.updatedAt || c.meta.createdAt))
            const actions = el('div', 'ei-ann-actions')

            const previewBtn = iconButton(isPreviewingBefore ? EYE_CLOSED_ICON : EYE_OPEN_ICON, isPreviewingBefore ? i18n.actions.showAfter : i18n.actions.showBefore)
            if (c.type !== 'design' && c.type !== 'move') {
              previewBtn.disabled = true
              previewBtn.style.opacity = '0.35'
              previewBtn.style.cursor = 'default'
            } else {
              const syncPreviewButton = (): void => {
                const previewingBefore = beforePreviewChangeIds.has(c.id)
                swapButtonIcon(previewBtn, previewingBefore ? EYE_CLOSED_ICON : EYE_OPEN_ICON)
                setActionButtonLabel(previewBtn, previewingBefore ? i18n.actions.showAfter : i18n.actions.showBefore)
                previewBtn.classList.toggle('is-active', previewingBefore)
              }
              syncPreviewButton()
              previewBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                toggleBeforePreview(c)
                syncPreviewButton()
              })
            }

            const singleCopyBtn = iconButton(CHANGES_HOVER_COPY_ICON, i18n.actions.copyAI)
            singleCopyBtn.addEventListener('click', async (e) => {
              e.stopPropagation()
              await navigator.clipboard.writeText(buildSingleAIPayload(c))
              setActionCopied(singleCopyBtn)
            })

            const closeBtn = iconButton(CHANGES_HOVER_DELETE_ICON, i18n.actions.delete, 'ei-ann-action is-danger')
            closeBtn.addEventListener('click', (e) => {
              e.stopPropagation()
              beforePreviewChangeIds.delete(c.id)
              if (activeChangeId === c.id) clearActiveChangeCard()
              removeChange(c.id)
              syncPreviewState()
              refreshChangesList()
            })

            actions.append(previewBtn, singleCopyBtn, closeBtn)
            const headerTitle = el('div', 'ei-ann-header-title')
            headerTitle.append(
              el('span', 'ei-ann-header-accent'),
              el('span', 'ei-ann-header-target', `#${visibleIndex} · ${selectorText(c)}`),
            )
            author.append(avatar, headerTitle)
            top.append(author, time, actions)

            const infoList = el('div', 'ei-ann-info-list')
            if (infoRows.length) {
              infoRows.forEach((row) => infoList.appendChild(createChangeInfoRow(row)))
            } else {
              for (const line of summaryLines) {
                infoList.appendChild(el('div', 'ei-ann-diff', line))
              }
            }

            main.append(top, infoList)

            if (note) {
              const noteSection = el('div', 'ei-ann-note-block')
              noteSection.append(el('div', 'ei-ann-note-label', 'Note'), el('div', 'ei-ann-note', note))
              main.appendChild(noteSection)
            }


            item.append(num, main)
            list.appendChild(item)
          })

          group.appendChild(list)
          body.appendChild(group)
        }
      }
    }

    const exportRow = el('div', 'ei-ann-export')
    const exportPrimary = el('div', 'ei-ann-export-primary')
    const copyAIBtn = el('button', 'ei-ann-export-btn ei-ann-export-btn-primary', `${i18n.actions.copyAI} (${getOutputDetailLabel(outputDetail)})`)
    copyAIBtn.type = 'button'
    copyAIBtn.setAttribute(IGNORE_ATTR, 'true')
    copyAIBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(buildAIPayload(changes, outputDetail))
      copyAIBtn.textContent = i18n.actions.copied
      setTimeout(() => { copyAIBtn.textContent = `${i18n.actions.copyAI} (${getOutputDetailLabel(outputDetail)})` }, 1500)
    })

    const copyJSONBtn = el('button', 'ei-ann-export-btn ei-ann-export-btn-dropdown') as HTMLButtonElement
    copyJSONBtn.type = 'button'
    copyJSONBtn.title = i18n.outputDetail.title
    copyJSONBtn.ariaLabel = i18n.outputDetail.title
    copyJSONBtn.setAttribute(IGNORE_ATTR, 'true')
    copyJSONBtn.innerHTML = CHANGES_PANEL_CHEVRON_ICON
    copyJSONBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      toggleOutputDetailMenu(copyJSONBtn, (detail) => {
        copyAIBtn.textContent = `${i18n.actions.copyAI} (${getOutputDetailLabel(detail)})`
      })
    })

    const clearBtn = el('button', 'ei-ann-export-btn ei-ann-export-btn-ghost', i18n.actions.clearAll)
    clearBtn.type = 'button'
    clearBtn.setAttribute(IGNORE_ATTR, 'true')
    clearBtn.addEventListener('click', () => {
      clearAllChanges()
      clearActiveChangeCard()
    })

    exportPrimary.append(copyAIBtn, copyJSONBtn)
    exportRow.append(exportPrimary, clearBtn)
    panel.appendChild(exportRow)

    setPanelVisible(true)
    positionPanel({ x: window.innerWidth / 2, y: window.innerHeight / 3 })
  }

  // --- Inspector rendering ---

  function renderEmpty(): void {
    subtitle.textContent = currentMode === 'inspector'
      ? i18n.panel.inspectMode
      : currentMode === 'design'
        ? i18n.panel.designMode
        : currentMode === 'move'
          ? i18n.panel.moveMode
          : i18n.panel.ready
    body.innerHTML = currentMode === 'design'
      ? `<div class="ei-empty">点击一个元素开始编辑样式。修改即时生效，完成后点完成保存变更。</div>`
      : currentMode === 'move'
        ? `<div class="ei-empty">${i18n.changes.moveEmpty}</div>`
        : `<div class="ei-empty">\u5F00\u542F\u540E\u5148\u70B9\u51FB\u4E00\u4E2A\u5143\u7D20\uFF0C\u518D\u663E\u793A\u4FE1\u606F\u9762\u677F\u3002\u79FB\u52A8\u9F20\u6807\u53EA\u9AD8\u4EAE\u5143\u7D20\uFF0C\u4E0D\u4F1A\u7ACB\u523B\u6253\u5F00\u4FE1\u606F\u6846\u3002\u9501\u5B9A\u540E\u53EF\u7528\u65B9\u5411\u952E\u5207\u7236/\u5B50/\u5144\u5F1F\u5143\u7D20\uFF0C\u4E5F\u53EF\u4EE5\u76F4\u63A5\u70B9 breadcrumbs \u8DF3\u5C42\u3002</div>`
    copyBtn.style.display = 'none'
    unlockBtn.style.display = 'none'
    changesCloseBtn.style.display = 'inline-flex'
    changesCloseBtn.onclick = () => setMode('off')
    setPanelVisible(false)
    setHighlightVisible(false)
  }

  function updateHighlight(info: InspectorInfo | null): void {
    // Support capture selection mode (element/state) when currentMode is 'off'
    // Also support outlines mode for hover highlight
    const isCaptureSelection = captureMenuMode === 'element' || captureMenuMode === 'state'
    if ((currentMode === 'off' && !isCaptureSelection && !outlinesEnabled) || currentMode === 'changes' || !info) {
      setHighlightVisible(false)
      // Remove hover highlight class from previous element in outlines mode
      if (outlinesHoverElement) {
        outlinesHoverElement.classList.remove('ei-hover-highlight')
        outlinesHoverElement = null
      }
      return
    }
    // Update hover highlight class for outlines mode
    if (outlinesEnabled && info.element !== outlinesHoverElement) {
      if (outlinesHoverElement) {
        outlinesHoverElement.classList.remove('ei-hover-highlight')
      }
      outlinesHoverElement = info.element
      outlinesHoverElement.classList.add('ei-hover-highlight')
    }
    const px = (v: string) => parseFloat(v) || 0
    const m = info.boxModel.margin
    const p = info.boxModel.padding
    const mt = px(m.top), mr = px(m.right), mb = px(m.bottom), ml = px(m.left)
    const pt = px(p.top), pr = px(p.right), pb = px(p.bottom), pl = px(p.left)
    const w = Math.max(info.rect.width, 1)
    const h = Math.max(info.rect.height, 1)
    const isGuides = currentMode === 'guides'

    highlight.style.left = `${isGuides ? info.rect.left : info.rect.left - ml}px`
    highlight.style.top = `${isGuides ? info.rect.top : info.rect.top - mt}px`
    highlight.style.width = `${isGuides ? w : w + ml + mr}px`
    highlight.style.height = `${isGuides ? h : h + mt + mb}px`

    hlPadding.style.top = `${isGuides ? 0 : mt}px`
    hlPadding.style.left = `${isGuides ? 0 : ml}px`
    hlPadding.style.width = `${w}px`
    hlPadding.style.height = `${h}px`

    hlContent.style.top = `${pt}px`
    hlContent.style.left = `${pl}px`
    hlContent.style.width = `${Math.max(w - pl - pr, 0)}px`
    hlContent.style.height = `${Math.max(h - pt - pb, 0)}px`

    const isDesign = currentMode === 'design' || isCaptureSelection
    const isInspector = currentMode === 'inspector'
    const isMove = currentMode === 'move'
    highlight.dataset.design = isDesign ? 'true' : 'false'
    highlight.dataset.inspector = isInspector ? 'true' : 'false'
    highlight.dataset.move = isMove ? 'true' : 'false'
    highlight.dataset.outlines = outlinesEnabled ? 'true' : 'false'

    if (isDesign || isInspector || outlinesEnabled) {
      // Element name label
      const tag = info.tagName.toLowerCase()
      const cls = info.element.className && typeof info.element.className === 'string'
        ? '.' + info.element.className.trim().split(/\s+/)[0] : ''
      hlLabel.textContent = (hoverLocked ? '🔒 ' : '') + tag + cls
      hlLabel.style.display = 'block'
      hlCode.style.display = 'block'

      // Padding badges + measurement lines
      const sides: [string, number][] = [['top', pt], ['right', pr], ['bottom', pb], ['left', pl]]
      for (const [side, val] of sides) {
        const badge = hlPadBadges[side]!
        const line = hlPadLines[side]!
        const edge = hlPadEdges[side]!
        if (val > 0) {
          badge.textContent = String(Math.round(val))
          badge.style.display = 'block'
          line.style.display = 'block'
          edge.style.display = 'block'

          if (side === 'top') {
            badge.style.cssText = `display:block;left:${w / 2 - 10}px;top:${pt / 2 - 7}px;`
            line.style.cssText = `display:block;left:${w / 2}px;top:0;height:${pt}px;width:0;border-left:1px solid var(--interactive-accent);`
            edge.style.cssText = `display:block;left:0;top:0;width:${w}px;height:${pt}px;background:repeating-linear-gradient(-45deg, color-mix(in srgb, var(--interactive-accent) 12%, transparent), color-mix(in srgb, var(--interactive-accent) 12%, transparent) 2px, transparent 2px, transparent 4px);`
          } else if (side === 'bottom') {
            badge.style.cssText = `display:block;left:${w / 2 - 10}px;bottom:${pb / 2 - 7}px;`
            line.style.cssText = `display:block;left:${w / 2}px;bottom:0;height:${pb}px;width:0;border-left:1px solid var(--interactive-accent);`
            edge.style.cssText = `display:block;left:0;bottom:0;width:${w}px;height:${pb}px;background:repeating-linear-gradient(-45deg, color-mix(in srgb, var(--interactive-accent) 12%, transparent), color-mix(in srgb, var(--interactive-accent) 12%, transparent) 2px, transparent 2px, transparent 4px);`
          } else if (side === 'left') {
            badge.style.cssText = `display:block;left:${pl / 2 - 10}px;top:${h / 2 - 7}px;`
            line.style.cssText = `display:block;top:${h / 2}px;left:0;width:${pl}px;height:0;border-top:1px solid var(--interactive-accent);`
            edge.style.cssText = `display:block;left:0;top:0;width:${pl}px;height:${h}px;background:repeating-linear-gradient(-45deg, color-mix(in srgb, var(--interactive-accent) 12%, transparent), color-mix(in srgb, var(--interactive-accent) 12%, transparent) 2px, transparent 2px, transparent 4px);`
          } else {
            badge.style.cssText = `display:block;right:${pr / 2 - 10}px;top:${h / 2 - 7}px;`
            line.style.cssText = `display:block;top:${h / 2}px;right:0;width:${pr}px;height:0;border-top:1px solid var(--interactive-accent);`
            edge.style.cssText = `display:block;right:0;top:0;width:${pr}px;height:${h}px;background:repeating-linear-gradient(-45deg, color-mix(in srgb, var(--interactive-accent) 12%, transparent), color-mix(in srgb, var(--interactive-accent) 12%, transparent) 2px, transparent 2px, transparent 4px);`
          }
        } else {
          badge.style.display = 'none'
          line.style.display = 'none'
          edge.style.display = 'none'
        }
      }

      // Margin badges + measurement lines (in margin layer coordinates)
      const marginSides: [string, number][] = [['top', mt], ['right', mr], ['bottom', mb], ['left', ml]]
      for (const [side, val] of marginSides) {
        const badge = hlMarginBadges[side]!
        const line = hlMarginLines[side]!
        const edge = hlMarginEdges[side]!
        if (val > 0) {
          badge.textContent = String(Math.round(val))
          badge.style.display = 'block'
          line.style.display = 'block'
          edge.style.display = 'block'

          // Total dimensions including padding
          const fullW = w + ml + mr
          const fullH = h + mt + mb

          if (side === 'top') {
            badge.style.cssText = `display:block;left:${fullW / 2 - 10}px;top:${mt / 2 - 7}px;`
            line.style.cssText = `display:block;left:${fullW / 2}px;top:0;height:${mt}px;width:0;border-left:1px dashed var(--overlay-margin);`
            edge.style.cssText = `display:block;left:0;top:0;width:${fullW}px;height:${mt}px;border-top:1px solid var(--overlay-margin);background:repeating-linear-gradient(-45deg, color-mix(in srgb, var(--overlay-margin) 16%, transparent), color-mix(in srgb, var(--overlay-margin) 16%, transparent) 2px, transparent 2px, transparent 4px);`
          } else if (side === 'bottom') {
            badge.style.cssText = `display:block;left:${fullW / 2 - 10}px;bottom:${mb / 2 - 7}px;`
            line.style.cssText = `display:block;left:${fullW / 2}px;bottom:0;height:${mb}px;width:0;border-left:1px dashed var(--overlay-margin);`
            edge.style.cssText = `display:block;left:0;bottom:0;width:${fullW}px;height:${mb}px;border-bottom:1px solid var(--overlay-margin);background:repeating-linear-gradient(-45deg, color-mix(in srgb, var(--overlay-margin) 16%, transparent), color-mix(in srgb, var(--overlay-margin) 16%, transparent) 2px, transparent 2px, transparent 4px);`
          } else if (side === 'left') {
            badge.style.cssText = `display:block;left:${ml / 2 - 10}px;top:${fullH / 2 - 7}px;`
            line.style.cssText = `display:block;top:${fullH / 2}px;left:0;width:${ml}px;height:0;border-top:1px dashed var(--overlay-margin);`
            edge.style.cssText = `display:block;left:0;top:0;width:${ml}px;height:${fullH}px;border-left:1px solid var(--overlay-margin);background:repeating-linear-gradient(-45deg, color-mix(in srgb, var(--overlay-margin) 16%, transparent), color-mix(in srgb, var(--overlay-margin) 16%, transparent) 2px, transparent 2px, transparent 4px);`
          } else {
            badge.style.cssText = `display:block;right:${mr / 2 - 10}px;top:${fullH / 2 - 7}px;`
            line.style.cssText = `display:block;top:${fullH / 2}px;right:0;width:${mr}px;height:0;border-top:1px dashed var(--overlay-margin);`
            edge.style.cssText = `display:block;right:0;top:0;width:${mr}px;height:${fullH}px;border-right:1px solid var(--overlay-margin);background:repeating-linear-gradient(-45deg, color-mix(in srgb, var(--overlay-margin) 16%, transparent), color-mix(in srgb, var(--overlay-margin) 16%, transparent) 2px, transparent 2px, transparent 4px);`
          }
        } else {
          badge.style.display = 'none'
          line.style.display = 'none'
          edge.style.display = 'none'
        }
      }
    } else {
      hlLabel.style.display = 'none'
      hlCode.style.display = 'none'
      for (const side of ['top', 'right', 'bottom', 'left']) {
        hlPadBadges[side]!.style.display = 'none'
        hlPadLines[side]!.style.display = 'none'
        hlPadEdges[side]!.style.display = 'none'
        hlMarginBadges[side]!.style.display = 'none'
        hlMarginLines[side]!.style.display = 'none'
        hlMarginEdges[side]!.style.display = 'none'
      }
    }

    setHighlightVisible(true)
  }

  function buildSection(name: 'typography' | 'box' | 'layout', active: boolean): HTMLDivElement {
    const section = el('div', 'ei-section')
    section.dataset.active = active ? 'true' : 'false'
    section.dataset.section = name
    return section
  }

  function buildTabs(): HTMLDivElement {
    const tabs = el('div', 'ei-tabs')
    ;(['typography', 'box', 'layout'] as const).forEach(tabName => {
      const buttonLabel = tabName === 'typography'
        ? i18n.inspector.typography
        : tabName === 'box'
          ? i18n.inspector.box
          : i18n.inspector.layout
      const button = el('button', 'ei-tab', buttonLabel)
      button.type = 'button'
      button.dataset.tab = tabName
      button.dataset.active = currentTab === tabName ? 'true' : 'false'
      button.setAttribute(IGNORE_ATTR, 'true')
      button.addEventListener('click', () => {
        currentTab = tabName
        renderInfo(currentInfo)
      })
      tabs.appendChild(button)
    })
    return tabs
  }

  function renderInfo(info: InspectorInfo | null): void {
    currentInfo = info
    annotateInput = null
    cleanupPanelExtras()

    titleEl.textContent = i18n.panel.inspectorTitle
    subtitle.textContent = ''
    subtitle.style.display = 'none'
    changesCloseBtn.style.display = 'inline-flex'
    changesCloseBtn.onclick = () => setMode('off')

    if (currentMode === 'off' && !info) {
      setPanelVisible(false)
      setHighlightVisible(false)
      return
    }

    copyBtn.style.display = 'none'
    unlockBtn.style.display = 'none'

    if (!info) {
      renderEmpty()
      return
    }

    setPanelVisible(true)
    positionPanel(panelAnchor, info)

    body.innerHTML = ''

    const textHead = el('div', 'ei-text-head', info.text || '\u2014')
    const path = el('div', 'ei-path', info.domPath)
    const tabs = buildTabs()

    const typography = buildSection('typography', currentTab === 'typography')
    typography.append(
      styleRow(i18n.inspector.font, info.typography.fontFamily),
      styleRow(i18n.inspector.size, info.typography.fontSize),
      styleRow(i18n.inspector.weight, info.typography.fontWeight),
      styleRow(i18n.inspector.style, info.typography.fontStyle),
      styleRow(i18n.inspector.lineHeight, info.typography.lineHeight),
      styleRow(i18n.inspector.letterSpacing, info.typography.letterSpacing),
      styleRow(i18n.inspector.color, info.typography.color, info.typography.color),
      styleRow(i18n.inspector.align, info.typography.textAlign),
      styleRow(i18n.inspector.transform, info.typography.textTransform),
      styleRow(i18n.inspector.decoration, info.typography.textDecoration),
    )
    const box = buildSection('box', currentTab === 'box')
    const boxDiagram = buildBoxDiagram(info.boxModel)

    box.append(
      boxDiagram,
      styleRow(i18n.inspector.background, info.visual.backgroundColor, info.visual.backgroundColor),
      styleRow(i18n.inspector.borderColor, info.visual.borderColor, info.visual.borderColor),
      styleRow(i18n.inspector.shadow, info.visual.boxShadow),
    )

    const layout = buildSection('layout', currentTab === 'layout')
    layout.append(
      styleRow(i18n.inspector.display, info.layout.display),
      styleRow(i18n.inspector.position, info.layout.position),
      styleRow(i18n.inspector.gap, info.layout.gap),
      styleRow(i18n.inspector.direction, info.layout.flexDirection),
      styleRow(i18n.inspector.justify, info.layout.justifyContent),
      styleRow(i18n.inspector.align, info.layout.alignItems),
      styleRow(i18n.inspector.wrap, info.layout.flexWrap),
      styleRow(i18n.inspector.gridCols, info.layout.gridTemplateColumns),
      styleRow(i18n.inspector.gridRows, info.layout.gridTemplateRows),
      styleRow(i18n.inspector.opacity, info.visual.opacity),
      styleRow(i18n.inspector.overflow, info.visual.overflow),
      styleRow(i18n.inspector.className, info.className),
      styleRow(i18n.inspector.id, info.id),
    )

    body.append(textHead, path, tabs, typography, box, layout)

    if (lockedElement) {
      panel.appendChild(renderAnnotateInput(lockedElement))
    }

    updateHighlight(info)
    options.onInspect?.(info)
  }

  // --- Design rendering ---

  function resetDesignTracker(): void {
    // Don't reset styles — they persist until the Change is deleted
    styleTracker = null
  }

  function renderDesign(info: InspectorInfo | null): void {
    currentInfo = info
    annotateInput = null
    cleanupPanelExtras()

    titleEl.textContent = i18n.panel.designTitle
    subtitle.textContent = ''
    subtitle.style.display = 'none'
    copyBtn.style.display = 'none'
    unlockBtn.style.display = 'none'
    changesCloseBtn.style.display = 'inline-flex'
    changesCloseBtn.onclick = () => setMode('off')

    if (!info || !lockedElement) {
      renderEmpty()
      return
    }
    setPanelVisible(true)
    positionPanel(panelAnchor, info)

    body.innerHTML = ''

    // Create tracker and design panel with auto-save to Changes
    // Resume existing change if this element already has one
    const existingChange = changes.find(c => c.type === 'design' && c.element === info.element)
    let activeChangeId: string | null = existingChange?.id ?? null
    let currentTextDiff: { property: string; original: string; modified: string } | null = null

    const getExistingDesignNote = (): string => {
      if (!activeChangeId) return ''
      return changes.find(c => c.id === activeChangeId)?.meta.note ?? ''
    }

    const saveToChanges = () => {
      if (!styleTracker) return
      const styleDiffs = styleTracker.getDiffs()
      const diffs = [...styleDiffs]
      // Include or update text diff
      if (currentTextDiff) {
        const existingTextDiffIndex = diffs.findIndex(d => d.property === 'textContent')
        if (existingTextDiffIndex >= 0) {
          diffs[existingTextDiffIndex] = currentTextDiff
        } else {
          diffs.push(currentTextDiff)
        }
      }
      const autoComment = diffs
        .filter(d => d.property === 'textContent' || !isInternalResetDiff(d as NonNullable<Change['diffs']>[number]))
        .map(d => `${d.property}: ${d.original} → ${d.modified}`)
        .join(', ')
      const note = getExistingDesignNote().trim()
      if (!diffs.length && !note) return
      if (activeChangeId) {
        updateChange(activeChangeId, autoComment, diffs)
      } else {
        activeChangeId = addChange(info.element, [autoComment, note].filter(Boolean).join('\n'), 'design', diffs)
        const createdChange = changes.find(c => c.id === activeChangeId)
        if (createdChange && note) {
          createdChange.meta.note = note
          createdChange.comment = [autoComment, note].filter(Boolean).join('\n')
          createdChange.patch = buildChangePatch(createdChange.type, createdChange.diffs, createdChange.comment)
        }
      }
      // Update highlight to reflect new element dimensions
      requestAnimationFrame(() => {
        const freshInfo = extractInspectorInfo(info.element)
        currentInfo = freshInfo
        updateHighlight(freshInfo)
      })
    }

    const syncDesignNote = (note: string) => {
      const trimmedNote = note.trim()
      if (!activeChangeId) {
        if (!trimmedNote) return
        activeChangeId = addChange(info.element, trimmedNote, 'design', [])
      }
      const change = changes.find(c => c.id === activeChangeId)
      if (!change) return
      change.meta.note = trimmedNote
      const styleComment = (change.diffs ?? [])
        .filter(d => !isInternalResetDiff(d))
        .map(d => `${d.property}: ${d.original} → ${d.modified}`)
        .join(', ')
      change.comment = [styleComment, trimmedNote].filter(Boolean).join('\n')
      change.patch = buildChangePatch(change.type, change.diffs, change.comment)
      change.timestamp = Date.now()
      change.meta.updatedAt = new Date().toISOString()
      change.meta.route = getRoute()
      persistChangesState()
      options.onChangeAdd?.(change)
      renderMarkers()
    }

    styleTracker = createStyleTracker(info.element, saveToChanges)
    const designPanel = buildDesignPanel(info.element, info, styleTracker, {
      onStyleChange: () => {
        const freshInfo = extractInspectorInfo(info.element)
        currentInfo = freshInfo
        updateHighlight(freshInfo)
      },
      onTextChange: (original, modified) => {
        if (modified !== original) {
          currentTextDiff = { property: 'textContent', original, modified }
        } else {
          currentTextDiff = null
        }
        saveToChanges()
      },
      onNoteChange: (note) => {
        syncDesignNote(note)
      },
      getInitialNote: () => getExistingDesignNote(),
    })
    body.appendChild(designPanel)

    updateHighlight(info)
  }

  function renderMove(info: InspectorInfo | null): void {
    currentInfo = info
    annotateInput = null
    cleanupPanelExtras()

    titleEl.textContent = i18n.panel.moveTitle
    subtitle.textContent = i18n.panel.moveSubtitle
    copyBtn.style.display = 'none'

    if (!info || !lockedElement) {
      hideMoveIndicator()
      unlockBtn.style.display = 'none'
      renderEmpty()
      return
    }

    unlockBtn.style.display = 'inline-block'
    // Hide panel in Move mode — operations are done via external handles
    setPanelVisible(false)
    updateHighlight(info)
    syncMoveOverlay()
  }

  function renderForCurrentMode(info: InspectorInfo | null): void {
    if (currentMode === 'inspector') {
      renderInfo(info)
    } else if (currentMode === 'design') {
      renderDesign(info)
    } else if (currentMode === 'move') {
      renderMove(info)
    } else if (currentMode === 'guides') {
      renderGuides(info)
    }
  }

  // --- Inspect logic ---

  function inspectPoint(x: number, y: number): void {
    if (!isInteractiveMode() && !outlinesEnabled) return
    if (lockedElement) return
    if (hoverLocked) return // Hover lock: don't update element
    const element = getInspectableElementFromPoint(x, y, IGNORE_ATTR)
    if (!element) {
      hideTooltip()
      return
    }
    const info = extractInspectorInfo(element)
    currentInfo = info

    // Guides mode: render alignment guides or distance labels on hover
    if (currentMode === 'guides') {
      updateHighlight(info)
      renderGuides(info)
      hideTooltip()
      return
    }

    updateHighlight(info)
    if (currentMode === 'inspector') {
      showTooltip(info, x, y)
    } else {
      hideTooltip()
    }
    options.onInspect?.(info)
  }

  function queueInspect(x: number, y: number): void {
    latestPoint = { x, y }
    if (rafId != null) return
    rafId = window.requestAnimationFrame(() => {
      rafId = null
      if (!latestPoint) return
      inspectPoint(latestPoint.x, latestPoint.y)
    })
  }

  function refreshLocked(): void {
    if (outlinesEnabled) return // Outlines mode: no refresh
    renderMarkers()
    if (!lockedElement) {
      updateHighlight(currentInfo)
      hideMoveIndicator()
      if (panelPosition) {
        positionPanel(panelAnchor, currentInfo)
      } else if (currentInfo && panelAnchor) {
        positionPanel(panelAnchor, currentInfo)
      }
      return
    }
    if (!document.contains(lockedElement)) {
      resetDesignTracker()
      lockedElement = null
      panelAnchor = null
      renderForCurrentMode(null)
      return
    }
    if (currentMode === 'inspector') {
      renderInfo(extractInspectorInfo(lockedElement))
    } else if (currentMode === 'design' || currentMode === 'move') {
      const info = extractInspectorInfo(lockedElement)
      currentInfo = info
      updateHighlight(info)
      if (panelPosition) positionPanel(panelAnchor, info)
      if (currentMode === 'move') renderMove(info)
    }
  }

  // --- Event handlers ---

  function onMouseMove(event: MouseEvent): void {
    if (!isInteractiveMode() && !outlinesEnabled) return
    if (isIgnoredEvent(event)) return
    if (currentMode === 'move' && updateMoveDrag(event)) return
    if (currentMode === 'guides' && (rulerDragState || guideLineDragState)) {
      hideTooltip()
      return
    }
    if (currentMode === 'move' && lockedElement) {
      hideTooltip()
      return
    }
    if (lockedElement) {
      hideTooltip()
      return
    }
    queueInspect(event.clientX, event.clientY)
  }

  function onMouseDown(event: MouseEvent): void {
    if (!isInteractiveMode() || isPanelEvent(event)) return
    if (currentMode !== 'move' || event.button !== 0) return
    const handleEntry = getMoveHandleEntryFromTarget(event.target)
    if (!handleEntry) return
    startMoveDragFromHandle(handleEntry, event)
  }

  function onMouseUp(event: MouseEvent): void {
    if (!moveDragState) return
    finishMoveDrag()
    event.preventDefault()
    event.stopPropagation()
  }

  function blockMouse(event: Event): void {
    if (outlinesEnabled) return // Outlines mode: allow normal interaction
    if (!isInteractiveMode() || isIgnoredEvent(event) || isPanelEvent(event)) return
    if (currentMode === 'move' && (event.type === 'mousedown' || event.type === 'mouseup')) return
    event.preventDefault()
    event.stopPropagation()
  }

  function onClick(event: MouseEvent): void {
    if (suppressNextClick) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (outlinesEnabled) return // Outlines mode: no interaction
    if (!isInteractiveMode() || isIgnoredEvent(event)) return
    if (isPanelEvent(event)) return
    event.preventDefault()
    event.stopPropagation()
    hideTooltip()

    const element = getInspectableElementFromPoint(event.clientX, event.clientY, IGNORE_ATTR)
    if (!element || isLikelyBackgroundElement(element)) {
      resetDesignTracker()
      lockedElement = null
      panelAnchor = null
      panelPosition = null
      // Guides mode: clear anchor on background click
      if (currentMode === 'guides') {
        guidesAnchorElement = null
        guidesAnchorRect = null
        clearGuideLines()
        clearDistanceLabels()
      }
      renderForCurrentMode(null)
      return
    }

    // Guides mode: anchor element instead of locking
    if (currentMode === 'guides') {
      if (guidesAnchorElement === element) {
        // Clicking same element clears anchor
        guidesAnchorElement = null
        guidesAnchorRect = null
        clearGuideLines()
        clearDistanceLabels()
      } else {
        // Set new anchor
        guidesAnchorElement = element
        guidesAnchorRect = element.getBoundingClientRect()
      }
      renderGuides(extractInspectorInfo(element))
      return
    }

    if (lockedElement === element) {
      resetDesignTracker()
      lockedElement = null
      panelAnchor = null
      panelPosition = null
      renderForCurrentMode(null)
      return
    }

    resetDesignTracker()
    lockedElement = element
    panelAnchor = { x: event.clientX, y: event.clientY }
    renderForCurrentMode(extractInspectorInfo(element))
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!isInteractiveMode() || isIgnoredEvent(event)) return
    if (isEditableTarget(event.target)) return

    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (moveDragState?.element) {
        cancelMoveDrag()
        return
      }
      if (hoverLocked) {
        hoverLocked = false
        return
      }
      if (lockedElement) {
        resetDesignTracker()
        lockedElement = null
        panelAnchor = null
        panelPosition = null
        renderForCurrentMode(null)
      } else {
        setMode('off')
      }
      return
    }

    // H key to lock hover state in Design mode
    if (event.key === 'h' || event.key === 'H') {
      if (currentMode === 'design' && currentInfo) {
        event.preventDefault()
        event.stopPropagation()
        hoverLocked = !hoverLocked
        return
      }
    }

    // Arrow key navigation only for inspector mode
    if (currentMode === 'inspector') {
      if (event.key === 'ArrowUp' && lockedElement?.parentElement) {
        event.preventDefault()
        event.stopPropagation()
        lockedElement = lockedElement.parentElement
        renderInfo(extractInspectorInfo(lockedElement))
        return
      }

      if (event.key === 'ArrowDown' && lockedElement) {
        const nextChild = getHTMLElementChildren(lockedElement)[0]
        if (nextChild) {
          event.preventDefault()
          event.stopPropagation()
          lockedElement = nextChild
          renderInfo(extractInspectorInfo(lockedElement))
          return
        }
      }

      if (event.key === 'ArrowLeft' && lockedElement) {
        const prevSibling = getSiblingElement(lockedElement, 'prev')
        if (prevSibling) {
          event.preventDefault()
          event.stopPropagation()
          lockedElement = prevSibling
          renderInfo(extractInspectorInfo(lockedElement))
          return
        }
      }

      if (event.key === 'ArrowRight' && lockedElement) {
        const nextSibling = getSiblingElement(lockedElement, 'next')
        if (nextSibling) {
          event.preventDefault()
          event.stopPropagation()
          lockedElement = nextSibling
          renderInfo(extractInspectorInfo(lockedElement))
          return
        }
      }

      if (event.key === 'n' && lockedElement && annotateInput) {
        event.preventDefault()
        event.stopPropagation()
        annotateInput.focus()
        return
      }
    }

    event.preventDefault()
    event.stopPropagation()
  }

  async function copyCurrent(): Promise<void> {
    if (!currentInfo) return
    try {
      await navigator.clipboard.writeText(buildCopyText(currentInfo))
    } catch (error) {
      console.error('Failed to copy element inspector data', error)
    }
  }

  // --- Panel drag ---

  function startPanelDrag(event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    isDraggingPanel = true
    const rect = panel.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const offsetY = event.clientY - rect.top

    const onMove = (moveEvent: MouseEvent) => {
      if (!isDraggingPanel) return
      const next = clampPanelPosition(moveEvent.clientX - offsetX, moveEvent.clientY - offsetY)
      panelPosition = next
      panel.style.left = `${next.left}px`
      panel.style.top = `${next.top}px`
    }

    const onUp = () => {
      isDraggingPanel = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // --- Event binding ---

  function bindEvents(): void {
    const wheelOptions: AddEventListenerOptions = { capture: true, passive: false }
    const captureOptions: AddEventListenerOptions = { capture: true }
    window.addEventListener('mousemove', onMouseMove, captureOptions)
    window.addEventListener('mousedown', onMouseDown, captureOptions)
    window.addEventListener('mousedown', blockMouse, captureOptions)
    window.addEventListener('mouseup', onMouseUp, captureOptions)
    window.addEventListener('mouseup', blockMouse, captureOptions)
    window.addEventListener('dblclick', blockMouse, captureOptions)
    window.addEventListener('contextmenu', blockMouse, captureOptions)
    window.addEventListener('click', onClick, captureOptions)
    window.addEventListener('wheel', blockMouse, wheelOptions)
    window.addEventListener('keydown', onKeyDown, captureOptions)
    window.addEventListener('resize', refreshLocked)
    window.addEventListener('scroll', refreshLocked, true)
  }

  function unbindEvents(): void {
    const wheelOptions: AddEventListenerOptions = { capture: true }
    const captureOptions: AddEventListenerOptions = { capture: true }
    window.removeEventListener('mousemove', onMouseMove, captureOptions)
    window.removeEventListener('mousedown', onMouseDown, captureOptions)
    window.removeEventListener('mousedown', blockMouse, captureOptions)
    window.removeEventListener('mouseup', onMouseUp, captureOptions)
    window.removeEventListener('mouseup', blockMouse, captureOptions)
    window.removeEventListener('dblclick', blockMouse, captureOptions)
    window.removeEventListener('contextmenu', blockMouse, captureOptions)
    window.removeEventListener('click', onClick, captureOptions)
    window.removeEventListener('wheel', blockMouse, wheelOptions)
    window.removeEventListener('keydown', onKeyDown, captureOptions)
    window.removeEventListener('resize', refreshLocked)
    window.removeEventListener('scroll', refreshLocked, true)
  }

  // --- Mode management ---

  function activateInspector(): void {
    document.body.style.cursor = 'crosshair'
    bindEvents()
    renderInfo(currentInfo)
  }

  function deactivateInspector(): void {
    lockedElement = null
    currentInfo = null
    panelAnchor = null
    panelPosition = null
    currentTab = 'typography'
    annotateInput = null
    unbindEvents()
    document.body.style.cursor = ''
    setHighlightVisible(false)
    setPanelVisible(false)
    hideTooltip()
    cleanupPanelExtras()
  }

  function activateDesign(): void {
    document.body.style.cursor = 'crosshair'
    bindEvents()
    renderDesign(null)
  }

  function deactivateDesign(): void {
    resetDesignTracker()
    lockedElement = null
    currentInfo = null
    panelAnchor = null
    panelPosition = null
    unbindEvents()
    document.body.style.cursor = ''
    setHighlightVisible(false)
    setPanelVisible(false)
    hideTooltip()
  }

  function activateMove(): void {
    document.body.style.cursor = 'grab'
    suppressNextClick = false
    bindEvents()
    renderMove(null)
  }

  function deactivateMove(): void {
    if (moveDragState?.element) {
      delete moveDragState.element.dataset.eiMoving
    }
    hideMoveIndicator()
    resetMoveDragHandleState()
    suppressNextClick = false
    moveDragState = null
    lockedElement = null
    currentInfo = null
    panelAnchor = null
    panelPosition = null
    unbindEvents()
    document.body.style.cursor = ''
    setHighlightVisible(false)
    setPanelVisible(false)
    hideTooltip()
  }

  function activateChanges(): void {
    cleanupPanelExtras()
    panelPosition = null
    renderChangesList()
  }

  function deactivateChanges(): void {
    panel.querySelectorAll('.ei-ann-export').forEach(n => n.remove())
    setPanelVisible(false)
  }

// --- Guides mode functions ---

  function activateGuides(): void {
    document.body.style.cursor = 'crosshair'
    bindEvents()
    guidesOverlay.dataset.visible = 'true'
    updateRulerMarks()
    renderGuides(null)
    window.addEventListener('scroll', onGuidesScroll, true)
    window.addEventListener('resize', onGuidesResize)
  }

  function deactivateGuides(): void {
    guidesOverlay.dataset.visible = 'false'
    guidesAnchorElement = null
    guidesAnchorRect = null
    clearGuideLines()
    clearDistanceLabels()
    clearPaddingOverlay()
    guideLines = []
    referenceLinesContainer.innerHTML = ''
    window.removeEventListener('scroll', onGuidesScroll, true)
    window.removeEventListener('resize', onGuidesResize)
    lockedElement = null
    currentInfo = null
    panelAnchor = null
    panelPosition = null
    unbindEvents()
    document.body.style.cursor = ''
    setHighlightVisible(false)
    setPanelVisible(false)
    hideTooltip()
  }

  function updateRulerMarks(): void {
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Clear existing marks
    topRulerMarks.innerHTML = ''
    leftRulerMarks.innerHTML = ''

    // Generate marks every 50px, major marks every 100px
    const step = 50
    const majorStep = 100

    // Top ruler marks
    for (let x = 0; x <= vw + scrollX; x += step) {
      const mark = el('div', `ei-ruler-mark${x % majorStep === 0 ? ' ei-ruler-mark-major' : ''}`)
      mark.style.left = `${x - scrollX}px`
      topRulerMarks.appendChild(mark)
      if (x % majorStep === 0 && x > 0) {
        const label = el('div', 'ei-ruler-label', String(x))
        label.style.left = `${x - scrollX + 2}px`
        label.style.bottom = '2px'
        topRulerMarks.appendChild(label)
      }
    }

    // Left ruler marks
    for (let y = 0; y <= vh + scrollY - 24; y += step) {
      const mark = el('div', `ei-ruler-mark${y % majorStep === 0 ? ' ei-ruler-mark-major' : ''}`)
      mark.style.top = `${y - scrollY + 24}px`
      leftRulerMarks.appendChild(mark)
      if (y % majorStep === 0 && y > 0) {
        const label = el('div', 'ei-ruler-label', String(y))
        label.style.top = `${y - scrollY + 26}px`
        label.style.right = '2px'
        leftRulerMarks.appendChild(label)
      }
    }
  }

  function clearGuideLines(): void {
    // Remove all alignment guide lines
    const lines = guidesOverlay.querySelectorAll('.ei-guide-line')
    lines.forEach(line => line.remove())
  }

  function showDistanceLabels(anchorRect: DOMRect, hoverRect: { left: number; top: number; width: number; height: number }): void {
    const distances = calculateDistance(anchorRect, hoverRect)
    const hoverRight = hoverRect.left + hoverRect.width
    const hoverBottom = hoverRect.top + hoverRect.height

    // Horizontal distance line + label
    if (distances.horizontal !== null) {
      const gap = Math.abs(distances.horizontal)
      const lineLeft = distances.horizontal > 0 ? anchorRect.right : hoverRight
      // Vertical center: use overlapping vertical range midpoint, or midpoint of both centers
      const overlapTop = Math.max(anchorRect.top, hoverRect.top)
      const overlapBottom = Math.min(anchorRect.bottom, hoverBottom)
      const lineY = overlapTop < overlapBottom
        ? (overlapTop + overlapBottom) / 2
        : (anchorRect.top + anchorRect.bottom + hoverRect.top + hoverBottom) / 4

      distanceLineH.style.left = `${lineLeft}px`
      distanceLineH.style.top = `${lineY}px`
      distanceLineH.style.width = `${gap}px`
      distanceLineH.dataset.visible = 'true'

      distanceLabelH.textContent = `${Math.round(gap)}px`
      distanceLabelH.style.left = `${lineLeft + gap / 2}px`
      distanceLabelH.style.top = `${lineY}px`
      distanceLabelH.dataset.visible = 'true'
    } else {
      distanceLineH.dataset.visible = 'false'
      distanceLabelH.dataset.visible = 'false'
    }

    // Vertical distance line + label
    if (distances.vertical !== null) {
      const gap = Math.abs(distances.vertical)
      const lineTop = distances.vertical > 0 ? anchorRect.bottom : hoverBottom
      // Horizontal center: use overlapping horizontal range midpoint, or midpoint of both centers
      const overlapLeft = Math.max(anchorRect.left, hoverRect.left)
      const overlapRight = Math.min(anchorRect.right, hoverRight)
      const lineX = overlapLeft < overlapRight
        ? (overlapLeft + overlapRight) / 2
        : (anchorRect.left + anchorRect.right + hoverRect.left + hoverRight) / 4

      distanceLineV.style.left = `${lineX}px`
      distanceLineV.style.top = `${lineTop}px`
      distanceLineV.style.height = `${gap}px`
      distanceLineV.dataset.visible = 'true'

      distanceLabelV.textContent = `${Math.round(gap)}px`
      distanceLabelV.style.left = `${lineX}px`
      distanceLabelV.style.top = `${lineTop + gap / 2}px`
      distanceLabelV.dataset.visible = 'true'
    } else {
      distanceLineV.dataset.visible = 'false'
      distanceLabelV.dataset.visible = 'false'
    }
  }

  function clearDistanceLabels(): void {
    distanceLineH.dataset.visible = 'false'
    distanceLineV.dataset.visible = 'false'
    distanceLabelH.dataset.visible = 'false'
    distanceLabelV.dataset.visible = 'false'
  }

  function clearPaddingOverlay(): void {
    paddingOverlay.dataset.visible = 'false'
    paddingOutline.dataset.visible = 'false'
    paddingContentOutline.dataset.visible = 'false'
    paddingHighlight.dataset.visible = 'false'
    paddingTag.dataset.visible = 'false'
    paddingCode.dataset.visible = 'false'
    ;(['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
      paddingBands[side].dataset.visible = 'false'
      paddingBadges[side].dataset.visible = 'false'
    })
  }

  function renderPaddingOverlay(anchorInfo: InspectorInfo, hoverInfo: InspectorInfo): boolean {
    const anchorEl = anchorInfo.element
    const hoverEl = hoverInfo.element
    const isInsideAnchor = hoverEl !== anchorEl && anchorEl.contains(hoverEl)
    if (!isInsideAnchor) {
      clearPaddingOverlay()
      return false
    }

    const anchorStyle = window.getComputedStyle(anchorEl)
    const hasAnyPadding = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']
      .some((key) => (parseFloat(anchorStyle[key as keyof CSSStyleDeclaration] as string) || 0) > 0)
    if (!hasAnyPadding) {
      clearPaddingOverlay()
      return false
    }

    const hoverComputed = extractInspectorInfo(hoverEl)
    hoverInfo = hoverComputed

    if (hoverInfo.element === anchorEl) {
      clearPaddingOverlay()
      return false
    }

    const px = (v: string) => parseFloat(v) || 0
    const anchorRect = anchorEl.getBoundingClientRect()
    const hoverRect = hoverEl.getBoundingClientRect()
    const pt = px(anchorInfo.boxModel.padding.top)
    const pr = px(anchorInfo.boxModel.padding.right)
    const pb = px(anchorInfo.boxModel.padding.bottom)
    const pl = px(anchorInfo.boxModel.padding.left)
    const contentLeft = anchorRect.left + pl
    const contentTop = anchorRect.top + pt
    const contentRight = anchorRect.right - pr
    const contentBottom = anchorRect.bottom - pb

    paddingOverlay.dataset.visible = 'true'
    paddingOutline.dataset.visible = 'true'
    paddingOutline.style.left = `${anchorRect.left}px`
    paddingOutline.style.top = `${anchorRect.top}px`
    paddingOutline.style.width = `${anchorRect.width}px`
    paddingOutline.style.height = `${anchorRect.height}px`

    paddingContentOutline.dataset.visible = 'true'
    paddingContentOutline.style.left = `${contentLeft}px`
    paddingContentOutline.style.top = `${contentTop}px`
    paddingContentOutline.style.width = `${Math.max(contentRight - contentLeft, 0)}px`
    paddingContentOutline.style.height = `${Math.max(contentBottom - contentTop, 0)}px`

    paddingHighlight.dataset.visible = 'true'
    paddingHighlight.dataset.style = 'solid'
    paddingHighlight.style.left = `${hoverRect.left}px`
    paddingHighlight.style.top = `${hoverRect.top}px`
    paddingHighlight.style.width = `${hoverRect.width}px`
    paddingHighlight.style.height = `${hoverRect.height}px`

    paddingTag.textContent = formatCrumbLabel(anchorEl)
    paddingTag.dataset.visible = 'true'
    paddingTag.style.left = `${anchorRect.left}px`
    paddingTag.style.top = `${anchorRect.top - 28}px`

    paddingCode.dataset.visible = 'true'
    paddingCode.style.left = `${anchorRect.right - 4}px`
    paddingCode.style.top = `${anchorRect.top - 28}px`

    const bands = {
      top: { visible: pt > 0, left: anchorRect.left, top: anchorRect.top, width: anchorRect.width, height: pt, badgeLeft: anchorRect.left + anchorRect.width / 2, badgeTop: anchorRect.top + pt / 2, value: pt },
      right: { visible: pr > 0, left: contentRight, top: anchorRect.top, width: pr, height: anchorRect.height, badgeLeft: contentRight + pr / 2, badgeTop: anchorRect.top + anchorRect.height / 2, value: pr },
      bottom: { visible: pb > 0, left: anchorRect.left, top: contentBottom, width: anchorRect.width, height: pb, badgeLeft: anchorRect.left + anchorRect.width / 2, badgeTop: contentBottom + pb / 2, value: pb },
      left: { visible: pl > 0, left: anchorRect.left, top: anchorRect.top, width: pl, height: anchorRect.height, badgeLeft: anchorRect.left + pl / 2, badgeTop: anchorRect.top + anchorRect.height / 2, value: pl },
    } as const

    ;(['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
      const band = bands[side]
      paddingBands[side].dataset.visible = band.visible ? 'true' : 'false'
      paddingBadges[side].dataset.visible = band.visible ? 'true' : 'false'
      if (!band.visible) return
      paddingBands[side].style.left = `${band.left}px`
      paddingBands[side].style.top = `${band.top}px`
      paddingBands[side].style.width = `${band.width}px`
      paddingBands[side].style.height = `${band.height}px`
      paddingBadges[side].textContent = `${Math.round(band.value)}`
      paddingBadges[side].style.left = `${band.badgeLeft}px`
      paddingBadges[side].style.top = `${band.badgeTop}px`
    })

    clearDistanceLabels()
    return true
  }

  function calculateDistance(anchorRect: DOMRect, hoverRect: { left: number; top: number; width: number; height: number }): { horizontal: number | null; vertical: number | null } {
    let horizontal: number | null = null
    let vertical: number | null = null

    const hoverRight = hoverRect.left + hoverRect.width
    const hoverBottom = hoverRect.top + hoverRect.height

    // Check horizontal relationship
    if (hoverRect.left >= anchorRect.right) {
      // Hover is to the right of anchor
      horizontal = hoverRect.left - anchorRect.right
    } else if (hoverRight <= anchorRect.left) {
      // Hover is to the left of anchor
      horizontal = hoverRight - anchorRect.left
    }

    // Check vertical relationship
    if (hoverRect.top >= anchorRect.bottom) {
      // Hover is below anchor
      vertical = hoverRect.top - anchorRect.bottom
    } else if (hoverBottom <= anchorRect.top) {
      // Hover is above anchor
      vertical = hoverBottom - anchorRect.top
    }

    return { horizontal, vertical }
  }

  function getSnappedGuidePosition(type: 'horizontal' | 'vertical', rawPosition: number, pointerX: number, pointerY: number): number {
    const SNAP_THRESHOLD = 6
    const candidates = document.elementsFromPoint(pointerX, pointerY)
    let bestPosition = rawPosition
    let bestDistance = SNAP_THRESHOLD + 1

    for (const candidate of candidates) {
      if (!(candidate instanceof HTMLElement)) continue
      if (candidate.closest(`[${IGNORE_ATTR}="true"]`)) continue

      const rect = candidate.getBoundingClientRect()
      const positions = type === 'horizontal'
        ? [rect.top, rect.bottom]
        : [rect.left, rect.right]

      for (const position of positions) {
        const distance = Math.abs(position - rawPosition)
        if (distance <= SNAP_THRESHOLD && distance < bestDistance) {
          bestDistance = distance
          bestPosition = position
        }
      }
    }

    return bestPosition
  }

  function createReferenceLine(type: 'horizontal' | 'vertical', position: number): void {
    const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const line = el('div', `ei-ref-line ei-ref-line-${type === 'horizontal' ? 'h' : 'v'}`)
    line.dataset.id = id

    if (type === 'horizontal') {
      line.style.top = `${position}px`
    } else {
      line.style.left = `${position}px`
    }

    const label = el('div', 'ei-ref-line-label', String(Math.round(position)))
    line.appendChild(label)

    line.addEventListener('mousedown', (e) => startGuideLineDrag(e, id))
    line.addEventListener('dblclick', () => deleteReferenceLine(id))

    referenceLinesContainer.appendChild(line)
    guideLines.push({ id, type, position, element: line })
  }

  function deleteReferenceLine(id: string): void {
    const index = guideLines.findIndex(l => l.id === id)
    if (index !== -1 && guideLines[index]) {
      guideLines[index]!.element.remove()
      guideLines.splice(index, 1)
    }
  }

  function startGuideLineDrag(e: MouseEvent, id: string): void {
    e.preventDefault()
    e.stopPropagation()
    const line = guideLines.find(l => l.id === id)
    if (!line) return
    guideLineDragState = { id, type: line.type, startPos: line.position, snappedPosition: null }
    window.addEventListener('mousemove', updateGuideLineDrag, true)
    window.addEventListener('mouseup', finishGuideLineDrag, true)
  }

  function updateGuideLineDrag(e: MouseEvent): void {
    if (!guideLineDragState) return
    const line = guideLines.find(l => l.id === guideLineDragState!.id)
    if (!line) return
    const rawPosition = line.type === 'horizontal' ? e.clientY : e.clientX
    const nextPosition = getSnappedGuidePosition(line.type, rawPosition, e.clientX, e.clientY)
    guideLineDragState.snappedPosition = nextPosition
    line.position = nextPosition
    if (line.type === 'horizontal') {
      line.element.style.top = `${nextPosition}px`
    } else {
      line.element.style.left = `${nextPosition}px`
    }
    const label = line.element.querySelector('.ei-ref-line-label')
    if (label) label.textContent = String(Math.round(nextPosition))
  }

  function finishGuideLineDrag(): void {
    guideLineDragState = null
    suppressNextClick = true
    setTimeout(() => {
      suppressNextClick = false
    }, 0)
    window.removeEventListener('mousemove', updateGuideLineDrag, true)
    window.removeEventListener('mouseup', finishGuideLineDrag, true)
  }

  function startRulerDrag(e: MouseEvent, type: 'horizontal' | 'vertical'): void {
    e.preventDefault()
    e.stopPropagation()
    const tempLine = el('div', `ei-guide-line ei-guide-line-${type === 'horizontal' ? 'h' : 'v'}`)
    tempLine.dataset.visible = 'true'
    if (type === 'horizontal') {
      tempLine.style.borderTopStyle = 'solid'
      tempLine.style.borderTopColor = 'var(--overlay-guide)'
      tempLine.style.top = `${e.clientY}px`
    } else {
      tempLine.style.borderLeftStyle = 'solid'
      tempLine.style.borderLeftColor = 'var(--overlay-guide)'
      tempLine.style.left = `${e.clientX}px`
    }
    guidesOverlay.appendChild(tempLine)
    rulerDragState = { type, tempLine, snappedPosition: null }
    window.addEventListener('mousemove', updateRulerDrag, true)
    window.addEventListener('mouseup', finishRulerDrag, true)
  }

  function updateRulerDrag(e: MouseEvent): void {
    if (!rulerDragState) return
    const rawPosition = rulerDragState.type === 'horizontal' ? e.clientY : e.clientX
    const nextPosition = getSnappedGuidePosition(rulerDragState.type, rawPosition, e.clientX, e.clientY)
    rulerDragState.snappedPosition = nextPosition
    if (rulerDragState.type === 'horizontal') {
      rulerDragState.tempLine.style.top = `${nextPosition}px`
    } else {
      rulerDragState.tempLine.style.left = `${nextPosition}px`
    }
  }

  function finishRulerDrag(e: MouseEvent): void {
    if (!rulerDragState) return
    const rawPosition = rulerDragState.type === 'horizontal' ? e.clientY : e.clientX
    const position = rulerDragState.snappedPosition ?? getSnappedGuidePosition(rulerDragState.type, rawPosition, e.clientX, e.clientY)
    rulerDragState.tempLine.remove()
    createReferenceLine(rulerDragState.type, position)
    rulerDragState = null
    suppressNextClick = true
    setTimeout(() => {
      suppressNextClick = false
    }, 0)
    window.removeEventListener('mousemove', updateRulerDrag, true)
    window.removeEventListener('mouseup', finishRulerDrag, true)
  }

  function renderGuides(info: InspectorInfo | null): void {
    currentInfo = info
    titleEl.textContent = i18n.panel.guidesTitle
    subtitle.textContent = i18n.panel.guidesSubtitle
    copyBtn.style.display = 'none'
    unlockBtn.style.display = guidesAnchorElement ? 'inline-block' : 'none'

    // Always clear previous state first
    clearGuideLines()
    clearDistanceLabels()
    clearPaddingOverlay()

    if (!info) {
      setPanelVisible(false)
      const existingAnchor = guidesOverlay.querySelector('.ei-guide-anchor-highlight')
      if (existingAnchor) existingAnchor.remove()
      return
    }

    setPanelVisible(false)
    updateHighlight(info)

    if (guidesAnchorElement && guidesAnchorRect) {
      // Show anchor element outline
      let anchorHighlight = guidesOverlay.querySelector('.ei-guide-anchor-highlight') as HTMLElement
      if (!anchorHighlight) {
        anchorHighlight = el('div', 'ei-guide-anchor-highlight')
        anchorHighlight.setAttribute(IGNORE_ATTR, 'true')
        ;(['tl', 'tm', 'tr', 'rm', 'br', 'bm', 'bl', 'lm'] as const).forEach((pos) => {
          const handle = el('div', 'ei-guide-anchor-handle')
          handle.setAttribute(IGNORE_ATTR, 'true')
          handle.dataset.pos = pos
          anchorHighlight.appendChild(handle)
        })
        guidesOverlay.appendChild(anchorHighlight)
      }
      anchorHighlight.style.left = `${guidesAnchorRect.left}px`
      anchorHighlight.style.top = `${guidesAnchorRect.top}px`
      anchorHighlight.style.width = `${guidesAnchorRect.width}px`
      anchorHighlight.style.height = `${guidesAnchorRect.height}px`

      // If hovering a child inside the anchored container, show padding measurement overlay.
      const anchorInfo = extractInspectorInfo(guidesAnchorElement)
      const didRenderPadding = renderPaddingOverlay(anchorInfo, info)
      if (!didRenderPadding) {
        // Show distance lines + labels between anchor and hovered element
        showDistanceLabels(guidesAnchorRect, info.rect)
      }
    } else {
      // Remove anchor highlight if no anchor
      const existingAnchor = guidesOverlay.querySelector('.ei-guide-anchor-highlight')
      if (existingAnchor) existingAnchor.remove()

      // Show alignment guides (VisBug style)
      showAlignmentGuides(info.element, info.rect)
    }
  }

  // Show 4 guide lines extending from element edges to viewport
  function showAlignmentGuides(hoveredEl: HTMLElement, rect: { left: number; top: number; width: number; height: number }): void {
    clearGuideLines()

    const rectRight = rect.left + rect.width
    const rectBottom = rect.top + rect.height

    // Top line
    const lineTop = el('div', 'ei-guide-line ei-guide-line-h')
    lineTop.setAttribute(IGNORE_ATTR, 'true')
    lineTop.style.top = `${rect.top}px`
    lineTop.dataset.visible = 'true'
    guidesOverlay.appendChild(lineTop)

    // Bottom line
    const lineBottom = el('div', 'ei-guide-line ei-guide-line-h')
    lineBottom.setAttribute(IGNORE_ATTR, 'true')
    lineBottom.style.top = `${rectBottom}px`
    lineBottom.dataset.visible = 'true'
    guidesOverlay.appendChild(lineBottom)

    // Left line
    const lineLeft = el('div', 'ei-guide-line ei-guide-line-v')
    lineLeft.setAttribute(IGNORE_ATTR, 'true')
    lineLeft.style.left = `${rect.left}px`
    lineLeft.dataset.visible = 'true'
    guidesOverlay.appendChild(lineLeft)

    // Right line
    const lineRight = el('div', 'ei-guide-line ei-guide-line-v')
    lineRight.setAttribute(IGNORE_ATTR, 'true')
    lineRight.style.left = `${rectRight}px`
    lineRight.dataset.visible = 'true'
    guidesOverlay.appendChild(lineRight)
  }

  function onGuidesScroll(): void {
    updateRulerMarks()
    if (guidesAnchorElement) {
      guidesAnchorRect = guidesAnchorElement.getBoundingClientRect()
    }
  }

  function onGuidesResize(): void {
    updateRulerMarks()
    if (guidesAnchorElement) {
      guidesAnchorRect = guidesAnchorElement.getBoundingClientRect()
    }
  }

  // Ruler drag handlers
  topRuler.addEventListener('mousedown', (e) => startRulerDrag(e, 'horizontal'))
  leftRuler.addEventListener('mousedown', (e) => startRulerDrag(e, 'vertical'))

  function setMode(mode: InspectorMode): void {
    if (destroyed) return
    if (currentMode === mode && mode !== 'off') return

    // Deactivate current
    switch (currentMode) {
      case 'inspector': deactivateInspector(); break
      case 'design': deactivateDesign(); break
      case 'move': deactivateMove(); break
      case 'changes': deactivateChanges(); break
      case 'guides': deactivateGuides(); break
    }

    currentMode = mode
    persistMode(mode)

    // Activate new
    switch (currentMode) {
      case 'inspector': activateInspector(); break
      case 'design': activateDesign(); break
      case 'move': activateMove(); break
      case 'changes': activateChanges(); break
      case 'guides': activateGuides(); break
    }

    updateToolbar()
    renderMarkers()
  }

  function updateToolbar(): void {
    root.dataset.mode = currentMode
    inspectorBtn.dataset.active = currentMode === 'inspector' ? 'true' : 'false'
    designBtn.dataset.active = currentMode === 'design' ? 'true' : 'false'
    moveBtn.dataset.active = currentMode === 'move' ? 'true' : 'false'
    changesBtn.dataset.active = currentMode === 'changes' ? 'true' : 'false'
    guidesBtn.dataset.active = currentMode === 'guides' ? 'true' : 'false'
  }

  function expandToolbar(): void {
    toolbarExpanded = true
    toolbar.dataset.expanded = 'true'
    // Recalculate position so toolbar stays bottom-right aligned
    toolbarPos = null
    requestAnimationFrame(() => initToolbarPosition())
  }

  function collapseToolbar(): void {
    toolbarExpanded = false
    toolbar.dataset.expanded = 'false'
    // Reset to bottom-right default position
    toolbarPos = null
    toolbar.style.left = ''
    toolbar.style.top = ''
    toolbar.style.right = '16px'
    toolbar.style.bottom = '16px'
  }

  // Toolbar drag
  let toolbarPos: { left: number; top: number } | null = null
  function initToolbarPosition(): void {
    if (!toolbarPos) {
      const rect = toolbar.getBoundingClientRect()
      toolbarPos = { left: window.innerWidth - rect.width - 16, top: window.innerHeight - rect.height - 16 }
    }
    toolbar.style.left = `${toolbarPos.left}px`
    toolbar.style.top = `${toolbarPos.top}px`
    toolbar.style.right = 'auto'
    toolbar.style.bottom = 'auto'
  }

  function startToolbarDrag(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.ei-toolbar-btn')) return
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const rect = toolbar.getBoundingClientRect()
    const startLeft = rect.left
    const startTop = rect.top
    let dragged = false
    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      if (!dragged && Math.abs(dx) < 3 && Math.abs(dy) < 3) return
      dragged = true
      toolbarPos = { left: startLeft + dx, top: startTop + dy }
      toolbar.style.left = `${toolbarPos.left}px`
      toolbar.style.top = `${toolbarPos.top}px`
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function unlockCurrent(): void {
    resetDesignTracker()
    cancelMoveDrag()
    lockedElement = null
    panelAnchor = null
    panelPosition = null
    hideMoveIndicator()
    renderForCurrentMode(null)
  }

  // --- Figma Capture Functions (replaced by new capture system) ---
  // See captureEntireScreen, captureWindow, startSelectElementCapture, startStateCapture above

  function showToast(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const toast = el('div', 'ei-toast')
    toast.textContent = message
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      border-radius: 20px;
      background: ${type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--success)' : 'var(--surface-panel)'};
      color: var(--overlay-label-text);
      font-size: 13px;
      font-weight: var(--font-medium);
      z-index: ${theme.config.zIndex + 10};
      border: 1px solid ${type === 'error' ? 'var(--danger-bg)' : type === 'success' ? 'var(--success-bg)' : 'var(--border-default)'};
      box-shadow: var(--shadow-dropdown);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    `
    root.appendChild(toast)
    requestAnimationFrame(() => {
      toast.style.opacity = '1'
    })
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => toast.remove(), 300)
    }, 3000)
  }

  function destroy(): void {
    if (destroyed) return
    setMode('off')
    destroyed = true
    if (rafId != null) {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
    root.remove()
  }

  // --- Wire up events ---

  inspectorBtn.addEventListener('click', () => {
    if (!toolbarExpanded) {
      expandToolbar()
      // Reposition after expanding since size changes
      requestAnimationFrame(initToolbarPosition)
      setMode('inspector')
    } else {
      setMode('inspector')
    }
  })
  designBtn.addEventListener('click', () => setMode('design'))
  moveBtn.addEventListener('click', () => setMode('move'))
  changesBtn.addEventListener('click', () => setMode('changes'))
  guidesBtn.addEventListener('click', () => setMode('guides'))
  exitBtn.addEventListener('click', () => {
    setMode('off')
    outlinesEnabled = false
    outlinesBtn.dataset.active = ''
    document.body.dataset.eiOutlines = ''
    // Clear hover highlight class
    if (outlinesHoverElement) {
      outlinesHoverElement.classList.remove('ei-hover-highlight')
      outlinesHoverElement = null
    }
    // Unbind events when closing toolbar with outlines mode
    unbindEvents()
    collapseToolbar()
    requestAnimationFrame(initToolbarPosition)
  })

  // --- Outlines toggle ---
  outlinesBtn.addEventListener('click', () => {
    outlinesEnabled = !outlinesEnabled
    outlinesBtn.dataset.active = outlinesEnabled ? 'true' : ''
    document.body.dataset.eiOutlines = outlinesEnabled ? 'true' : ''
    if (outlinesEnabled) {
      // Clear mode when entering outlines mode
      setMode('off')
      // Re-bind events for hover highlight in outlines mode
      bindEvents()
    } else {
      // Clear hover highlight class
      if (outlinesHoverElement) {
        outlinesHoverElement.classList.remove('ei-hover-highlight')
        outlinesHoverElement = null
      }
      // Unbind events when disabling outlines (if mode is off)
      if (currentMode === 'off') unbindEvents()
    }
  })

  // --- Capture Dropdown Menu ---
  let isCaptureMenuOpen = false
  let captureMenuMode: 'entire' | 'window' | 'element' | 'state' | null = null
  let stateCaptureElement: HTMLElement | null = null
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

  function positionCaptureMenu(): void {
    const rect = screenshotGroup.getBoundingClientRect()
    captureMenu.style.left = `${rect.left}px`
    captureMenu.style.top = `${rect.top - captureMenu.offsetHeight - 8}px`
  }

  function openCaptureMenu(): void {
    if (isCaptureMenuOpen) return
    isCaptureMenuOpen = true
    captureMenu.style.display = 'block'
    positionCaptureMenu()
    screenshotDropdownBtn.style.background = 'var(--surface-active)'
  }

  function closeCaptureMenu(): void {
    if (!isCaptureMenuOpen) return
    isCaptureMenuOpen = false
    captureMenu.style.display = 'none'
    screenshotDropdownBtn.style.background = ''
  }

  function toggleCaptureMenu(): void {
    if (isCaptureMenuOpen) closeCaptureMenu()
    else openCaptureMenu()
  }

  // Capture functions for each mode
  async function captureEntireScreen(): Promise<void> {
    if (currentMode !== 'off') setMode('off')
    showToast(i18n.capture.capturingEntirePage, 'info')
    await performCapture('body', { scroll: true })
  }

  async function captureWindow(): Promise<void> {
    if (currentMode !== 'off') setMode('off')
    showToast(i18n.capture.capturingCurrentWindow, 'info')
    await performCapture('body', { scroll: false })
  }

  async function startSelectElementCapture(): Promise<void> {
    if (currentMode !== 'off') setMode('off')
    showToast(i18n.capture.hoverToCapture, 'info')
    captureMenuMode = 'element'

    // Show highlight overlay for element selection
    let selectedElement: HTMLElement | null = null
    highlight.style.display = 'block'
    highlight.dataset.design = 'true'

    const moveHandler = (e: MouseEvent) => {
      const element = getInspectableElementFromPoint(e.clientX, e.clientY, IGNORE_ATTR)
      if (element && element !== selectedElement) {
        selectedElement = element
        const info = extractInspectorInfo(element)
        updateHighlight(info)
        showTooltip(info, e.clientX, e.clientY)
      }
    }

    const clickHandler = async (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const element = getInspectableElementFromPoint(e.clientX, e.clientY, IGNORE_ATTR)
      if (element) {
        document.removeEventListener('click', clickHandler, true)
        document.removeEventListener('mousemove', moveHandler, true)
        highlight.style.display = 'none'
        tooltip.style.display = 'none'
        const selector = buildDomPath(element)
        showToast(i18n.capture.capturingSelectedElement, 'info')
        await performCapture(selector, { scroll: false })
      }
    }

    document.addEventListener('mousemove', moveHandler, true)
    document.addEventListener('click', clickHandler, true)
  }

  async function startStateCapture(): Promise<void> {
    if (currentMode !== 'off') setMode('off')
    captureMenuMode = 'state'
    showToast(i18n.capture.hoverToCaptureState, 'info')

    // Show highlight overlay for element selection
    let selectedElement: HTMLElement | null = null
    highlight.style.display = 'block'
    highlight.dataset.design = 'true'

    const moveHandler = (e: MouseEvent) => {
      const element = getInspectableElementFromPoint(e.clientX, e.clientY, IGNORE_ATTR)
      if (element && element !== selectedElement) {
        selectedElement = element
        const info = extractInspectorInfo(element)
        updateHighlight(info)
        showTooltip(info, e.clientX, e.clientY)
      }
    }

    const clickHandler = async (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const element = getInspectableElementFromPoint(e.clientX, e.clientY, IGNORE_ATTR)
      if (element) {
        document.removeEventListener('click', clickHandler, true)
        document.removeEventListener('mousemove', moveHandler, true)
        highlight.style.display = 'none'
        tooltip.style.display = 'none'
        stateCaptureElement = element
        await captureMultipleStates(element)
      }
    }

    document.addEventListener('mousemove', moveHandler, true)
    document.addEventListener('click', clickHandler, true)
  }

  async function captureMultipleStates(element: HTMLElement): Promise<void> {
    const states = ['default', 'hover', 'active']
    showToast(`Capturing ${states.length} states...`, 'info')

    for (let i = 0; i < states.length; i++) {
      const state = states[i]
      showToast(`Capturing ${state} state (${i + 1}/${states.length})...`, 'info')

      // Simulate state
      if (state === 'hover') {
        element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
        element.classList.add('hover')
      } else if (state === 'active') {
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
        element.classList.add('active')
      }

      await sleep(300)
      const selector = buildDomPath(element)
      await performCapture(selector, { scroll: false, state })

      // Reset state
      if (state === 'hover') {
        element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
        element.classList.remove('hover')
      } else if (state === 'active') {
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
        element.classList.remove('active')
      }

      await sleep(200)
    }

    showToast(i18n.capture.allStatesCaptured, 'success')
    stateCaptureElement = null
  }

  interface CaptureOptions {
    scroll: boolean
    state?: string
  }

  async function performCapture(selector: string, options: CaptureOptions): Promise<void> {
    try {
      // 1) 注入 capture.js
      if (!window.figma?.captureForDesign) {
        const r = await fetch(CAPTURE_SCRIPT_URL)
        const s = await r.text()
        const el_script = document.createElement('script')
        el_script.textContent = s
        document.head.appendChild(el_script)
        await sleep(1200)
      }

      // 2) 如果需要滚动，触发懒加载
      if (options.scroll) {
        const step = Math.max(400, Math.floor(window.innerHeight * 0.8))
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y)
          await sleep(180)
        }
        await sleep(600)
        window.scrollTo(0, 0)
      }

      // 3) 等图片与字体
      const imgs = Array.from(document.images || [])
      await Promise.allSettled(
        imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => {
          img.addEventListener('load', res, { once: true })
          img.addEventListener('error', res, { once: true })
          setTimeout(res, 4000)
        }))
      )
      if (document.fonts?.ready) await Promise.race([document.fonts.ready, sleep(3000)])
      await sleep(500)

      // 4) 执行抓取
      const result = await window.figma?.captureForDesign({ selector })

      showToast(options.state ? `${options.state} state captured!` : i18n.capture.captured, 'success')
      console.log('[Elens] Capture result:', result)
    } catch (error) {
      console.error('[Elens] Capture failed:', error)
      showToast(`${i18n.capture.captureFailed}: ` + (error instanceof Error ? error.message : i18n.capture.unknownError), 'error')
    }
  }

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as Node
    if (isCaptureMenuOpen && !captureMenu.contains(target) && !screenshotDropdownBtn.contains(target)) {
      closeCaptureMenu()
    }
    if (isOutputDetailMenuOpen && !outputDetailMenu.contains(target)) {
      closeOutputDetailMenu()
    }
  })

  // Update window resize handler to reposition menu
  window.addEventListener('resize', () => {
    if (isCaptureMenuOpen) positionCaptureMenu()
    if (isOutputDetailMenuOpen) closeOutputDetailMenu()
  })

  screenshotBtn.addEventListener('click', () => captureEntireScreen())
  screenshotDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleCaptureMenu()
  })
  captureEntireScreenItem.addEventListener('click', () => {
    closeCaptureMenu()
    captureEntireScreen()
  })
  captureWindowItem.addEventListener('click', () => {
    closeCaptureMenu()
    captureWindow()
  })
  selectElementItem.addEventListener('click', () => {
    closeCaptureMenu()
    startSelectElementCapture()
  })
  stateCaptureItem.addEventListener('click', () => {
    closeCaptureMenu()
    startStateCapture()
  })
  toolbar.addEventListener('mousedown', startToolbarDrag)
  copyBtn.addEventListener('click', copyCurrent)
  unlockBtn.addEventListener('click', unlockCurrent)
  dragHandle.addEventListener('mousedown', startPanelDrag)

  // Initial toolbar position: right:16 bottom:16
  toolbar.style.right = '16px'
  toolbar.style.bottom = '16px'

  restorePersistedChanges()

  // Initial state
  if (options.enabled) {
    expandToolbar()
    // Defer position init until after layout
    requestAnimationFrame(initToolbarPosition)
    setMode(options.defaultMode ?? loadPersistedMode() ?? 'inspector')
  }

  return {
    setMode,
    getMode: () => currentMode,
    updateTheme: (nextTheme, updateOptions) => {
      applyTheme(nextTheme, { persist: updateOptions?.persist })
    },
    getTheme: () => theme.config,
    resetTheme: (resetOptions) => {
      applyTheme(defaultThemeConfig, { persist: resetOptions?.persist, reset: true })
    },
    destroy,
    getCurrentInfo: () => currentInfo,
    getChanges: () => [...changes],
    clearChanges: () => {
      clearAllChanges()
    },
    exportMarkdown: (detail?: OutputDetail) => buildMarkdownExport(changes, detail),
    exportJSON: (detail?: OutputDetail) => buildJSONExport(changes, detail),
  }
}
