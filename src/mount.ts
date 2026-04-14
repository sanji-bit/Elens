import CHECK_ICON_SVG from './assets/check-inline.svg?raw'
import ICON_CAPTURE_SCREEN from './assets/capture-screen.svg?raw'
import ICON_CAPTURE_WINDOW from './assets/capture-window.svg?raw'
import ICON_CHEVRON_DOWN from './assets/chevron-down-inline.svg?raw'
import COPY_ICON_SVG from './assets/copy-inline.svg?raw'
import ICON_SELECT_ELEMENT from './assets/select-element.svg?raw'
import ICON_STATE_CAPTURE from './assets/state-capture.svg?raw'
import ICON_CHANGES from './assets/toolbar-changes.svg?raw'
import ICON_DESIGN from './assets/toolbar-design.svg?raw'
import DESIGN_MODE_ICON from './assets/design-mode-figma.svg?raw'
import DESIGN_DEV_MODE_ICON from './assets/design-dev-mode-figma.svg?raw'
import PANEL_MINIMIZE_UI_ICON from './assets/panel-minimize-ui.svg?raw'
import ICON_EXIT from './assets/toolbar-exit.svg?raw'
import ICON_GUIDES from './assets/toolbar-guides.svg?raw'
import ICON_INSPECTOR from './assets/toolbar-inspector.svg?raw'
import ICON_MOVE from './assets/toolbar-move.svg?raw'
import ICON_OUTLINES from './assets/toolbar-outlines.svg?raw'
import ICON_SCREENSHOT from './assets/toolbar-screenshot.svg?raw'
import type { Change, ElementInspectorInstance, ElementInspectorOptions, InspectorInfo, InspectorMode, OutputDetail, StyleDiff, ThemeConfig, ViewportControllerCapabilities, ViewportPreset, ViewportState, ViewportTarget, WindowBounds } from './types'
import { buildDesignDevEditor, buildDesignPanel, createStyleTracker, type StyleTracker } from './design'
import { buildTheme } from './design-tokens'
import { i18n } from './i18n'
import { createRuntimeStyles } from './runtime-styles'
import { clearPersistedTheme, getDefaultThemeConfig, loadPersistedTheme, mergeThemeConfig, persistTheme } from './theme-store'
import { buildAIPayload, buildChangePatch, buildChangeSnapshot, buildChangeTarget, buildCopyText, buildDomPath, buildJSONExport, buildMarkdownExport, extractInspectorInfo, getInspectableElementFromPoint, getRoute, rgbToHex, truncate } from './utils'

const IGNORE_ATTR = 'data-elens-ignore'
const MODE_STORAGE_KEY = 'elens-mode'
const CHANGES_STORAGE_KEY = 'elens-changes'
const VIEWPORT_PRESET_STORAGE_KEY = 'elens-viewport-preset'

const DEFAULT_VIEWPORT_PRESETS: ViewportPreset[] = [
  { id: 'desktop-1920x1080', label: '1920 × 1080', width: 1920, height: 1080, category: 'desktop' },
  { id: 'desktop-1728x1117', label: '1728 × 1117', width: 1728, height: 1117, category: 'desktop' },
  { id: 'desktop-1440x900', label: '1440 × 900', width: 1440, height: 900, category: 'desktop' },
  { id: 'desktop-1366x768', label: '1366 × 768', width: 1366, height: 768, category: 'desktop' },
  { id: 'desktop-1280x800', label: '1280 × 800', width: 1280, height: 800, category: 'desktop' },
  { id: 'tablet-1024x768', label: '1024 × 768', width: 1024, height: 768, category: 'tablet' },
  { id: 'tablet-834x1194', label: '834 × 1194', width: 834, height: 1194, category: 'tablet' },
  { id: 'tablet-768x1024', label: '768 × 1024', width: 768, height: 1024, category: 'tablet' },
  { id: 'mobile-430x932', label: '430 × 932', width: 430, height: 932, category: 'mobile' },
  { id: 'mobile-414x896', label: '414 × 896', width: 414, height: 896, category: 'mobile' },
  { id: 'mobile-390x844', label: '390 × 844', width: 390, height: 844, category: 'mobile' },
  { id: 'mobile-375x812', label: '375 × 812', width: 375, height: 812, category: 'mobile' },
  { id: 'mobile-360x800', label: '360 × 800', width: 360, height: 800, category: 'mobile' },
]

function loadPersistedViewportPresetId(): string | null {
  try {
    return window.localStorage.getItem(VIEWPORT_PRESET_STORAGE_KEY)
  } catch {
    return null
  }
}

function persistViewportPresetId(presetId: string | null): void {
  try {
    if (presetId) {
      window.localStorage.setItem(VIEWPORT_PRESET_STORAGE_KEY, presetId)
    } else {
      window.localStorage.removeItem(VIEWPORT_PRESET_STORAGE_KEY)
    }
  } catch {
    // Ignore storage failures.
  }
}

type PersistedChange = Omit<Change, 'element'>

type ChangesArchive = {
  version: 1
  source: 'elens'
  exportedAt: string
  page: {
    url: string
    route: string
    title: string
    viewport?: ViewportState
  }
  changes: PersistedChange[]
}

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

function toPersistedChanges(changes: Change[]): PersistedChange[] {
  return changes.map(({ element: _element, ...change }) => change)
}

function persistChanges(changes: Change[]): void {
  try {
    window.localStorage.setItem(CHANGES_STORAGE_KEY, JSON.stringify(toPersistedChanges(changes)))
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
const CHANGES_UPLOAD_URL = new URL('./assets/changes-upload.svg', import.meta.url).href
const CHANGES_DOWNLOAD_URL = new URL('./assets/changes-download.svg', import.meta.url).href
const DESIGN_SELECT_MATCHING_LAYERS_URL = new URL('./assets/design-select-matching-layers.svg', import.meta.url).href
const DESIGN_DEV_MODE_URL = new URL('./assets/design-dev-mode.svg', import.meta.url).href
const DESIGN_RESET_URL = new URL('./assets/design-reset.svg', import.meta.url).href
const CAPTURE_SCRIPT_URL = new URL('./assets/capture.js', import.meta.url).href
const CHANGES_HOVER_DELETE_ICON = `<img src="${CHANGES_HOVER_DELETE_URL}" alt="" />`
const CHANGES_HOVER_COPY_ICON = `<img src="${CHANGES_HOVER_COPY_URL}" alt="" />`
const CHANGES_HOVER_COPY_SUCCESS_ICON = `<img src="${CHANGES_HOVER_COPY_SUCCESS_URL}" alt="" />`
const CHANGES_HOVER_PREVIEW_AFTER_ICON = `<img src="${CHANGES_HOVER_PREVIEW_AFTER_URL}" alt="" />`
const CHANGES_HOVER_PREVIEW_BEFORE_ICON = `<img src="${CHANGES_HOVER_PREVIEW_BEFORE_URL}" alt="" />`
const CHANGES_PANEL_CLOSE_ICON = `<img src="${CHANGES_PANEL_CLOSE_URL}" alt="" />`
const CHANGES_PANEL_CHEVRON_ICON = `<img src="${CHANGES_PANEL_CHEVRON_URL}" alt="" />`
const CHANGES_UPLOAD_ICON = `<img src="${CHANGES_UPLOAD_URL}" alt="" />`
const CHANGES_DOWNLOAD_ICON = `<img src="${CHANGES_DOWNLOAD_URL}" alt="" />`

preloadImage(CHANGES_AVATAR_URL)
preloadImage(CHANGES_HOVER_DELETE_URL)
preloadImage(CHANGES_HOVER_COPY_URL)
preloadImage(CHANGES_HOVER_COPY_SUCCESS_URL)
preloadImage(CHANGES_HOVER_PREVIEW_AFTER_URL)
preloadImage(CHANGES_HOVER_PREVIEW_BEFORE_URL)
preloadImage(CHANGES_PANEL_CLOSE_URL)
preloadImage(CHANGES_PANEL_CHEVRON_URL)
preloadImage(CHANGES_UPLOAD_URL)
preloadImage(CHANGES_DOWNLOAD_URL)
preloadImage(DESIGN_SELECT_MATCHING_LAYERS_URL)
preloadImage(DESIGN_DEV_MODE_URL)
preloadImage(DESIGN_RESET_URL)

// Toolbar icons — from Figma design, 20x20, stroke=currentColor
const ICON_VIEWPORT = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="5" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M9 20H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 17V20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'

function codeRow(property: string, value: string, swatch?: string): HTMLDivElement {
  const row = el('div', 'ei-typography-code-line')
  row.appendChild(el('span', 'ei-typography-code-prop', property))
  const valueWrap = el('span', 'ei-typography-code-value')
  if (swatch) {
    const chip = el('span', 'ei-swatch ei-typography-code-swatch')
    chip.style.backgroundColor = swatch
    valueWrap.appendChild(chip)
  }
  const text = el('span', 'ei-typography-code-text', value || '\u2014')
  text.title = value || '\u2014'
  valueWrap.appendChild(text)
  row.appendChild(valueWrap)
  return row
}

function codeRows(rows: Array<[string, string, string?]>): HTMLDivElement {
  const wrap = el('div', 'ei-typography-code')
  rows.forEach(([property, value, swatch]) => {
    wrap.appendChild(codeRow(property, value, swatch))
  })
  return wrap
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
  const viewportPresets = options.viewportPresets?.length ? options.viewportPresets : DEFAULT_VIEWPORT_PRESETS
  const persistedViewportPresetId = options.persistViewportPreset === false ? null : loadPersistedViewportPresetId()
  let currentViewportPreset: ViewportPreset | null = viewportPresets.find((preset) => preset.id === options.defaultViewportPreset)
    ?? viewportPresets.find((preset) => preset.id === persistedViewportPresetId)
    ?? null
  let currentViewportState: ViewportState | null = currentViewportPreset
    ? {
        presetId: currentViewportPreset.id,
        width: currentViewportPreset.width,
        height: currentViewportPreset.height,
        left: currentViewportPreset.left,
        top: currentViewportPreset.top,
        target: currentViewportPreset.target ?? 'window',
      }
    : null
  let viewportCapabilities: ViewportControllerCapabilities = options.viewportController?.capabilities ?? {}
  let currentViewportTarget: ViewportTarget = currentViewportState?.target ?? 'window'
  let viewportMenuOpen = false

  let currentMode: InspectorMode = 'off'
  let destroyed = false
  let lockedElement: HTMLElement | null = null
  let currentInfo: InspectorInfo | null = null
  let hoverLocked = false
  let outlinesEnabled = false
  let outlinesHoverElement: Element | null = null
  let currentTab: 'typography' | 'box' | 'layout' = 'typography'
  let inspectorDetailsExpanded = false
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
  let disabledStyleDiffsByChangeId = new Map<string, Set<string>>()
  let disabledTextDiffByChangeId = new Set<string>()
  let disabledMoveDiffByChangeId = new Set<string>()
  let disabledNoteByChangeId = new Set<string>()
  let changeFlashTimeout: number | null = null
  let changeFlashElement: HTMLElement | null = null
  let toolbarExpanded = false
  let styleTracker: StyleTracker | null = null
  let designApplyOnceMatches = false
  let designScopeUserToggled = false
  let designPanelView: 'visual' | 'dev' = 'visual'
  let panelCollapsed = false
  let panelExpandedHeight = 0
  let designDevDraft = ''
  let designDevError = ''
  let designDevSessionBaseline: Array<{ element: HTMLElement; inlineStyle: string; changeIds: string[] }> = []
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
  const designScopeOverlay = el('div', 'ei-design-scope-overlay')
  designScopeOverlay.setAttribute(IGNORE_ATTR, 'true')
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

  const inspectorBtn = makeToolbarBtn(ICON_INSPECTOR, i18n.toolbar.inspectorTooltip)
  const designBtn = makeToolbarBtn(ICON_DESIGN, i18n.toolbar.designTooltip)
  designBtn.classList.add('ei-toolbar-extra')
  const moveBtn = makeToolbarBtn(ICON_MOVE, i18n.toolbar.moveTooltip)
  moveBtn.classList.add('ei-toolbar-extra')
  const changesBtn = makeToolbarBtn(ICON_CHANGES, i18n.toolbar.changesTooltip)
  changesBtn.classList.add('ei-toolbar-extra')
  // Screenshot button with dropdown
  const viewportGroup = el('div', 'ei-toolbar-btn-group ei-toolbar-extra')
  viewportGroup.setAttribute(IGNORE_ATTR, 'true')
  const viewportBtn = makeToolbarBtn(ICON_VIEWPORT, i18n.toolbar.viewportTooltip)
  const viewportDropdownBtn = el('button', 'ei-toolbar-btn ei-toolbar-dropdown-btn')
  viewportDropdownBtn.type = 'button'
  viewportDropdownBtn.innerHTML = ICON_CHEVRON_DOWN
  viewportDropdownBtn.setAttribute(IGNORE_ATTR, 'true')
  const viewportDropdownTip = el('span', 'ei-toolbar-tip', i18n.toolbar.viewportOptions)
  viewportDropdownTip.setAttribute(IGNORE_ATTR, 'true')
  viewportDropdownBtn.appendChild(viewportDropdownTip)
  viewportGroup.append(viewportBtn, viewportDropdownBtn)

  const screenshotGroup = el('div', 'ei-toolbar-btn-group ei-toolbar-extra')
  screenshotGroup.setAttribute(IGNORE_ATTR, 'true')
  const screenshotBtn = makeToolbarBtn(ICON_SCREENSHOT, i18n.toolbar.screenshotTooltip)
  const screenshotDropdownBtn = el('button', 'ei-toolbar-btn ei-toolbar-dropdown-btn')
  screenshotDropdownBtn.type = 'button'
  screenshotDropdownBtn.innerHTML = ICON_CHEVRON_DOWN
  screenshotDropdownBtn.setAttribute(IGNORE_ATTR, 'true')
  const screenshotDropdownTip = el('span', 'ei-toolbar-tip', i18n.toolbar.captureOptions)
  screenshotDropdownTip.setAttribute(IGNORE_ATTR, 'true')
  screenshotDropdownBtn.appendChild(screenshotDropdownTip)
  screenshotGroup.append(screenshotBtn, screenshotDropdownBtn)

  const viewportMenu = el('div', 'ei-capture-menu')
  viewportMenu.setAttribute(IGNORE_ATTR, 'true')
  viewportMenu.style.display = 'none'

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

  const viewportMode = el('div', 'ei-tabs ei-viewport-mode')
  const viewportModeViewportBtn = el('button', 'ei-tab', i18n.viewport.modeViewport)
  viewportModeViewportBtn.type = 'button'
  viewportModeViewportBtn.setAttribute(IGNORE_ATTR, 'true')
  const viewportModeWindowBtn = el('button', 'ei-tab', i18n.viewport.modeWindow)
  viewportModeWindowBtn.type = 'button'
  viewportModeWindowBtn.setAttribute(IGNORE_ATTR, 'true')
  viewportMode.append(viewportModeViewportBtn, viewportModeWindowBtn)
  const viewportModeHint = el('div', 'ei-panel-subtitle ei-viewport-mode-hint')

  const viewportPresetItems = viewportPresets.map((preset) => {
    const item = makeCaptureMenuItem(ICON_VIEWPORT, preset.label)
    item.dataset.viewportPresetId = preset.id
    return item
  })

  const viewportCustom = el('div', 'ei-viewport-custom')
  const viewportCustomGrid = el('div', 'ei-viewport-custom-grid')
  const viewportWidthField = el('label', 'ei-dp-field')
  viewportWidthField.appendChild(el('span', 'ei-dp-field-icon', 'W'))
  const viewportWidthInput = document.createElement('input')
  viewportWidthInput.className = 'ei-dp-field-input'
  viewportWidthInput.type = 'number'
  viewportWidthInput.min = '1'
  viewportWidthInput.placeholder = i18n.viewport.width
  viewportWidthInput.setAttribute(IGNORE_ATTR, 'true')
  viewportWidthField.append(viewportWidthInput, el('span', 'ei-dp-field-suffix', 'px'))
  const viewportHeightField = el('label', 'ei-dp-field')
  viewportHeightField.appendChild(el('span', 'ei-dp-field-icon', 'H'))
  const viewportHeightInput = document.createElement('input')
  viewportHeightInput.className = 'ei-dp-field-input'
  viewportHeightInput.type = 'number'
  viewportHeightInput.min = '1'
  viewportHeightInput.placeholder = i18n.viewport.height
  viewportHeightInput.setAttribute(IGNORE_ATTR, 'true')
  viewportHeightField.append(viewportHeightInput, el('span', 'ei-dp-field-suffix', 'px'))
  const viewportLeftField = el('label', 'ei-dp-field ei-viewport-position-fields')
  viewportLeftField.appendChild(el('span', 'ei-dp-field-icon', 'X'))
  const viewportLeftInput = document.createElement('input')
  viewportLeftInput.className = 'ei-dp-field-input'
  viewportLeftInput.type = 'number'
  viewportLeftInput.placeholder = i18n.viewport.left
  viewportLeftInput.setAttribute(IGNORE_ATTR, 'true')
  viewportLeftField.append(viewportLeftInput, el('span', 'ei-dp-field-suffix', 'px'))
  const viewportTopField = el('label', 'ei-dp-field ei-viewport-position-fields')
  viewportTopField.appendChild(el('span', 'ei-dp-field-icon', 'Y'))
  const viewportTopInput = document.createElement('input')
  viewportTopInput.className = 'ei-dp-field-input'
  viewportTopInput.type = 'number'
  viewportTopInput.placeholder = i18n.viewport.top
  viewportTopInput.setAttribute(IGNORE_ATTR, 'true')
  viewportTopField.append(viewportTopInput, el('span', 'ei-dp-field-suffix', 'px'))
  viewportCustomGrid.append(viewportWidthField, viewportHeightField, viewportLeftField, viewportTopField)
  const viewportApplyButton = el('button', 'ei-button', i18n.viewport.apply)
  viewportApplyButton.type = 'button'
  viewportApplyButton.setAttribute(IGNORE_ATTR, 'true')
  viewportCustom.append(viewportCustomGrid, viewportApplyButton)

  viewportMenu.append(viewportMode, viewportModeHint, ...viewportPresetItems, viewportCustom)
  captureMenu.append(captureEntireScreenItem, captureWindowItem, selectElementItem, stateCaptureItem)

  const toolbarDivider = el('div', 'ei-toolbar-divider ei-toolbar-extra')
  toolbarDivider.appendChild(el('div', 'ei-toolbar-divider-line'))

  const exitBtn = makeToolbarBtn(ICON_EXIT, i18n.toolbar.exitTooltip)
  exitBtn.classList.add('ei-toolbar-extra')

  const guidesBtn = makeToolbarBtn(ICON_GUIDES, i18n.toolbar.guidesTooltip)
  guidesBtn.classList.add('ei-toolbar-extra')

  const outlinesBtn = makeToolbarBtn(ICON_OUTLINES, i18n.toolbar.outlinesTooltip)
  outlinesBtn.classList.add('ei-toolbar-extra')

  toolbar.append(inspectorBtn, designBtn, moveBtn, guidesBtn, outlinesBtn, viewportGroup, screenshotGroup, changesBtn, toolbarDivider, exitBtn)
  root.append(viewportMenu, captureMenu, outputDetailMenu)

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
  const panelWindowActions = el('div', 'ei-panel-window-actions')
  const panelMinimizeBtn = el('button', 'ei-panel-minimize') as HTMLButtonElement
  const panelActionDivider = el('div', 'ei-panel-action-divider')
  const changesCloseBtn = el('button', 'ei-changes-close') as HTMLButtonElement
  copyBtn.type = 'button'
  unlockBtn.type = 'button'
  panelMinimizeBtn.type = 'button'
  changesCloseBtn.type = 'button'
  copyBtn.setAttribute(IGNORE_ATTR, 'true')
  unlockBtn.setAttribute(IGNORE_ATTR, 'true')
  panelWindowActions.setAttribute(IGNORE_ATTR, 'true')
  panelMinimizeBtn.setAttribute(IGNORE_ATTR, 'true')
  panelActionDivider.setAttribute(IGNORE_ATTR, 'true')
  changesCloseBtn.setAttribute(IGNORE_ATTR, 'true')
  panelMinimizeBtn.title = 'Minimize UI'
  panelMinimizeBtn.ariaLabel = 'Minimize UI'
  panelMinimizeBtn.setAttribute('aria-pressed', 'false')
  panelMinimizeBtn.innerHTML = PANEL_MINIMIZE_UI_ICON
  changesCloseBtn.title = i18n.panel.closeChanges
  changesCloseBtn.ariaLabel = i18n.panel.closeChanges
  changesCloseBtn.innerHTML = CHANGES_PANEL_CLOSE_ICON
  panelWindowActions.append(panelMinimizeBtn, panelActionDivider, changesCloseBtn)
  actions.append(copyBtn, unlockBtn, panelWindowActions)
  header.append(titleWrap, actions)

  const changesSummaryBar = el('div', 'ei-ann-summary-bar')
  changesSummaryBar.style.display = 'none'

  const body = el('div', 'ei-body')
  panel.append(dragHandle, header, changesSummaryBar, body)

  root.append(styleEl, highlight, designScopeOverlay, moveIndicator, guidesOverlay, tooltip, panel, markersContainer, toolbar)
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

  function getPanelCollapsedHeight(): number {
    return header.offsetHeight || 49
  }

  function getPanelExpandHeight(): number {
    const currentHeight = panel.offsetHeight
    if (currentHeight > 0) return currentHeight
    const scrollHeight = panel.scrollHeight
    if (scrollHeight > 0) return scrollHeight
    return panelExpandedHeight || 0
  }

  function syncPanelCollapsed(): void {
    panel.dataset.collapsed = panelCollapsed ? 'true' : 'false'
    panelMinimizeBtn.setAttribute('aria-pressed', panelCollapsed ? 'true' : 'false')
    panel.style.height = panelCollapsed ? `${getPanelCollapsedHeight()}px` : ''
  }

  panelMinimizeBtn.addEventListener('click', (event) => {
    event.stopPropagation()
    const isCollapsing = !panelCollapsed
    if (isCollapsing) {
      panel.dataset.collapseHidden = 'false'
      panelExpandedHeight = getPanelExpandHeight()
      panel.style.height = `${panelExpandedHeight}px`
      panel.getBoundingClientRect()
      panelCollapsed = true
      syncPanelCollapsed()
      window.setTimeout(() => {
        if (panelCollapsed) panel.dataset.collapseHidden = 'true'
      }, 160)
    } else {
      panelCollapsed = false
      panel.dataset.collapsed = 'false'
      panel.dataset.collapseHidden = 'false'
      panelMinimizeBtn.setAttribute('aria-pressed', 'false')
      const expandedHeight = panelExpandedHeight || getPanelExpandHeight()
      panel.style.height = `${getPanelCollapsedHeight()}px`
      panel.getBoundingClientRect()
      panel.style.height = `${expandedHeight}px`
      window.setTimeout(() => {
        if (!panelCollapsed) panel.style.height = ''
      }, 160)
    }
    positionPanel(panelAnchor, currentInfo)
  })

  function setPanelVisible(visible: boolean): void {
    if (!visible) {
      panel.style.display = 'none'
      return
    }
    syncPanelCollapsed()
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
    panel.querySelectorAll('.ei-annotate, .ei-ann-export, .ei-design-actions').forEach(n => n.remove())
    panel.classList.remove('is-changes')
    panelCollapsed = false
    panel.dataset.collapseHidden = 'false'
    syncPanelCollapsed()
    changesSummaryBar.innerHTML = ''
    changesSummaryBar.style.display = 'none'
    changesCloseBtn.style.display = 'none'
    subtitle.style.display = 'none'
  }

  function clearDesignScopeOverlay(): void {
    designScopeOverlay.innerHTML = ''
  }

  function renderDesignScopeOverlay(elements: HTMLElement[]): void {
    clearDesignScopeOverlay()
    elements.forEach((element) => {
      if (!document.contains(element)) return
      const rect = element.getBoundingClientRect()
      const box = el('div', 'ei-design-scope-box')
      box.setAttribute(IGNORE_ATTR, 'true')
      box.style.left = `${rect.left}px`
      box.style.top = `${rect.top}px`
      box.style.width = `${rect.width}px`
      box.style.height = `${rect.height}px`
      designScopeOverlay.appendChild(box)
    })
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
      el('span', 'ei-tt-tag', info.tagName.toLowerCase()),
      el('span', 'ei-tt-size', `${Math.round(info.rect.width)} \u00D7 ${Math.round(info.rect.height)}`),
    )
    tooltip.appendChild(head)

    const rows: Array<{ label: string; value: string; swatch?: string }> = [
      { label: 'color', value: rgbToHex(info.typography.color), swatch: info.typography.color },
      { label: 'font-size', value: info.typography.fontSize },
      { label: 'font-weight', value: info.typography.fontWeight },
      { label: 'font-family', value: truncate(info.typography.fontFamily, 36) },
      { label: 'line-height', value: info.typography.lineHeight },
      { label: 'letter-spacing', value: info.typography.letterSpacing },
    ]

    rows.forEach(({ label, value, swatch }) => {
      const row = el('div', 'ei-tt-row')
      row.appendChild(el('span', 'ei-tt-label', label))
      if (swatch) {
        const colorSwatch = el('span', 'ei-tt-swatch')
        colorSwatch.style.backgroundColor = swatch
        row.appendChild(colorSwatch)
      }
      row.appendChild(el('span', 'ei-tt-val', value))
      tooltip.appendChild(row)
    })

    if (!isAllZeroMargin(info.boxModel.padding)) {
      const paddingRow = el('div', 'ei-tt-row')
      const p = info.boxModel.padding
      paddingRow.append(
        el('span', 'ei-tt-label', 'padding'),
        el('span', 'ei-tt-val', `${p.top} ${p.right} ${p.bottom} ${p.left}`),
      )
      tooltip.appendChild(paddingRow)
    }

    const a11y = info.accessibility
    const divider = el('div', 'ei-tt-divider', 'accessibility')
    tooltip.appendChild(divider)

    if (a11y.name) {
      const nameRow = el('div', 'ei-tt-row')
      nameRow.append(el('span', 'ei-tt-label', 'name'), el('span', 'ei-tt-val', truncate(a11y.name, 40)))
      tooltip.appendChild(nameRow)
    }

    const roleRow = el('div', 'ei-tt-row')
    roleRow.append(el('span', 'ei-tt-label', 'role'), el('span', 'ei-tt-val', a11y.role))
    tooltip.appendChild(roleRow)

    const kbRow = el('div', 'ei-tt-row')
    kbRow.append(el('span', 'ei-tt-label', 'keyboard-focusable'), el('span', 'ei-tt-val', a11y.keyboardFocusable ? 'yes' : 'no'))
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

  function findNoteChangeForElement(element: HTMLElement): Change | undefined {
    return changes.find(c => c.element === element && (c.type === 'annotation' || Boolean(c.meta.note?.trim())))
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

  function isStyleDiffEnabled(changeId: string, property: string): boolean {
    return !disabledStyleDiffsByChangeId.get(changeId)?.has(property)
  }

  function setStyleDiffEnabled(change: Change, property: string, enabled: boolean): void {
    const disabled = disabledStyleDiffsByChangeId.get(change.id) ?? new Set<string>()
    if (enabled) disabled.delete(property)
    else disabled.add(property)
    if (disabled.size > 0) disabledStyleDiffsByChangeId.set(change.id, disabled)
    else disabledStyleDiffsByChangeId.delete(change.id)

    const diff = change.patch.styleDiffs.find(item => item.property === property)
    if (!diff) return
    if (enabled) change.element.style.setProperty(diff.property, diff.modified)
    else if (diff.original) change.element.style.setProperty(diff.property, diff.original)
    else change.element.style.removeProperty(diff.property)
    renderMarkers()
  }

  function isTextDiffEnabled(changeId: string): boolean {
    return !disabledTextDiffByChangeId.has(changeId)
  }

  function setTextDiffEnabled(change: Change, enabled: boolean): void {
    if (!change.patch.textDiff) return
    if (enabled) disabledTextDiffByChangeId.delete(change.id)
    else disabledTextDiffByChangeId.add(change.id)
    change.element.textContent = enabled ? change.patch.textDiff.to : change.patch.textDiff.from
    renderMarkers()
  }

  function isMoveDiffEnabled(changeId: string): boolean {
    return !disabledMoveDiffByChangeId.has(changeId)
  }

  function setMoveDiffEnabled(change: Change, enabled: boolean): void {
    if (!change.patch.moveDiff) return
    if (enabled) disabledMoveDiffByChangeId.delete(change.id)
    else disabledMoveDiffByChangeId.add(change.id)
    moveElementToIndex(change.element, Math.max(0, enabled ? change.patch.moveDiff.toIndex : change.patch.moveDiff.fromIndex))
    renderMarkers()
  }

  function getChangeNoteText(change: Change): string {
    if (change.type === 'annotation') return change.comment
    return change.meta.note?.trim() ?? ''
  }

  function hasAnyEnabledDiff(change: Change): boolean {
    if (change.patch.textDiff && isTextDiffEnabled(change.id)) return true
    if (change.patch.moveDiff && isMoveDiffEnabled(change.id)) return true
    if (change.patch.styleDiffs.some((diff) => isStyleDiffEnabled(change.id, diff.property))) return true
    return false
  }

  function setAllDiffsEnabled(change: Change, enabled: boolean): void {
    if (change.patch.textDiff) {
      if (enabled) disabledTextDiffByChangeId.delete(change.id)
      else disabledTextDiffByChangeId.add(change.id)
    }
    if (change.patch.moveDiff) {
      if (enabled) disabledMoveDiffByChangeId.delete(change.id)
      else disabledMoveDiffByChangeId.add(change.id)
    }
    if (change.patch.styleDiffs.length > 0) {
      if (enabled) disabledStyleDiffsByChangeId.delete(change.id)
      else disabledStyleDiffsByChangeId.set(change.id, new Set(change.patch.styleDiffs.map((diff) => diff.property)))
    }
    if (enabled) applyChangeToAfter(change)
    else resetChangeToBefore(change)
    renderMarkers()
    if (currentMode === 'changes') renderChangesList()
  }

  function syncChangePreviewFromEnabledState(change: Change): void {
    if (hasAnyEnabledDiff(change)) beforePreviewChangeIds.delete(change.id)
    else beforePreviewChangeIds.add(change.id)
  }

  function applyChangeToAfter(change: Change): void {
    if (change.patch.textDiff && isTextDiffEnabled(change.id)) change.element.textContent = change.patch.textDiff.to
    for (const diff of change.patch.styleDiffs) {
      if (isStyleDiffEnabled(change.id, diff.property)) change.element.style.setProperty(diff.property, diff.modified)
    }
    if (change.patch.moveDiff && isMoveDiffEnabled(change.id)) {
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
    disabledStyleDiffsByChangeId.clear()
    disabledTextDiffByChangeId.clear()
    disabledMoveDiffByChangeId.clear()
    disabledNoteByChangeId.clear()
    moveChangeIdByElement = new WeakMap<HTMLElement, string>()
    renderMarkers()
    if (currentMode === 'changes') renderChangesList()
    closeOutputDetailMenu()
  }

  function persistChangesState(): void {
    persistChanges(changes)
  }

  function buildChangesArchive(): ChangesArchive {
    return {
      version: 1,
      source: 'elens',
      exportedAt: new Date().toISOString(),
      page: {
        url: window.location.href,
        route: getRoute(),
        title: document.title,
        ...(currentViewportState ? { viewport: currentViewportState } : {}),
      },
      changes: toPersistedChanges(changes),
    }
  }

  function exportArchiveJSON(): string {
    return JSON.stringify(buildChangesArchive(), null, 2)
  }

  function downloadChangesArchive(): void {
    const archive = buildChangesArchive()
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = archive.exportedAt.replace(/[:]/g, '-').replace(/\.\d+Z$/, 'Z')
    link.href = url
    link.download = `elens-changes-${timestamp}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  function parseChangesArchive(value: string): PersistedChange[] {
    const parsed = JSON.parse(value) as Partial<ChangesArchive> | PersistedChange[]
    if (Array.isArray(parsed)) return parsed
    if (
      parsed &&
      parsed.version === 1 &&
      parsed.source === 'elens' &&
      Array.isArray(parsed.changes)
    ) {
      return parsed.changes
    }
    throw new Error('invalid archive')
  }

  function restoreChangesFromPersistedData(persistedChanges: PersistedChange[]): { restored: number; skipped: number } {
    if (persistedChanges.length === 0) {
      changes = []
      changeIdCounter = 0
      renderMarkers()
      return { restored: 0, skipped: 0 }
    }

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
    renderMarkers()
    return {
      restored: restoredChanges.length,
      skipped: Math.max(0, persistedChanges.length - restoredChanges.length),
    }
  }

  function importChangesArchive(value: string): { restored: number; skipped: number } {
    const persistedChanges = parseChangesArchive(value)
    clearAllChanges()
    const result = restoreChangesFromPersistedData(persistedChanges)
    persistChangesState()
    if (currentMode === 'changes') renderChangesList()
    return result
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

    const result = restoreChangesFromPersistedData(persistedChanges)
    if (result.restored === 0) clearPersistedChanges()
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

  function updateChangeNote(change: Change, note: string): void {
    const trimmedNote = note.trim()
    change.meta.note = trimmedNote
    if (change.type === 'annotation') {
      change.comment = trimmedNote
    } else if (change.type === 'design') {
      const styleComment = (change.diffs ?? [])
        .filter(d => !isInternalResetDiff(d))
        .map(d => `${d.property}: ${d.original} → ${d.modified}`)
        .join(', ')
      change.comment = [styleComment, trimmedNote].filter(Boolean).join('\n')
    } else {
      change.comment = trimmedNote
    }
    change.patch = buildChangePatch(change.type, change.diffs, change.comment)
    change.timestamp = Date.now()
    change.meta.updatedAt = new Date().toISOString()
    change.meta.route = getRoute()
    persistChangesState()
    options.onChangeAdd?.(change)
    renderMarkers()
  }

  function createNoteChange(element: HTMLElement, note: string): string {
    const id = addChange(element, note, 'annotation', [])
    const change = changes.find((item) => item.id === id)
    if (change) updateChangeNote(change, note)
    return id
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
    disabledStyleDiffsByChangeId.delete(id)
    disabledTextDiffByChangeId.delete(id)
    disabledMoveDiffByChangeId.delete(id)
    disabledNoteByChangeId.delete(id)
    persistChangesState()
    options.onChangeRemove?.(id)
    renderMarkers()
  }

  function renderMarkers(): void {
    markersContainer.innerHTML = ''
    const seenGroupKeys = new Set<string>()
    let visibleMarkerIndex = 0

    changes.forEach((c) => {
      if (!document.contains(c.element)) return
      if (c.type === 'design' && c.meta.groupKey) {
        if (seenGroupKeys.has(c.meta.groupKey)) return
        seenGroupKeys.add(c.meta.groupKey)
      }

      visibleMarkerIndex += 1
      const rect = c.element.getBoundingClientRect()
      const marker = el('div', 'ei-marker')
      marker.textContent = String(visibleMarkerIndex)
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
    textarea.placeholder = i18n.design.notePlaceholder
    textarea.setAttribute(IGNORE_ATTR, 'true')
    const existing = findNoteChangeForElement(element)
    if (existing) textarea.value = getChangeNoteText(existing)
    annotateInput = textarea

    textarea.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        submitAnnotation(element, textarea.value)
      }
    })

    const actionsRow = el('div', 'ei-annotate-actions')
    const cancelBtn = el('button', 'ei-button ei-button-ghost', i18n.actions.cancel)
    cancelBtn.type = 'button'
    cancelBtn.setAttribute(IGNORE_ATTR, 'true')
    cancelBtn.addEventListener('click', () => {
      lockedElement = null
      panelAnchor = null
      panelPosition = null
      annotateInput = null
      renderInfo(null)
    })
    const submitBtn = el('button', 'ei-button ei-button-primary', existing ? i18n.actions.update : i18n.actions.add)
    submitBtn.type = 'button'
    submitBtn.setAttribute(IGNORE_ATTR, 'true')
    submitBtn.addEventListener('click', () => submitAnnotation(element, textarea.value))
    actionsRow.append(cancelBtn, submitBtn)

    wrap.append(textarea, actionsRow)
    requestAnimationFrame(() => {
      if (annotateInput === textarea && document.contains(textarea)) {
        textarea.focus()
        textarea.setSelectionRange(textarea.value.length, textarea.value.length)
      }
    })
    return wrap
  }

  function submitAnnotation(element: HTMLElement, comment: string): void {
    const trimmed = comment.trim()
    if (!trimmed) return
    const existing = findNoteChangeForElement(element)
    if (existing) updateChangeNote(existing, trimmed)
    else createNoteChange(element, trimmed)
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
    body.style.paddingLeft = ''
    cleanupPanelExtras()
    panel.classList.remove('is-inspector-compact')
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

    type ChangeListEntry = {
      id: string
      primary: Change
      members: Change[]
      isGrouped: boolean
    }

    const buildChangeListEntries = (items: Change[]): ChangeListEntry[] => {
      const entries: ChangeListEntry[] = []
      const grouped = new Map<string, Change[]>()

      items.forEach((change) => {
        if (change.type === 'design' && change.meta.groupKey) {
          const key = `${routeText(change)}::${change.meta.groupKey}`
          const bucket = grouped.get(key) ?? []
          bucket.push(change)
          grouped.set(key, bucket)
          return
        }
        entries.push({ id: change.id, primary: change, members: [change], isGrouped: false })
      })

      grouped.forEach((members) => {
        const primary = members[0]
        if (!primary) return
        entries.push({
          id: `group:${primary.meta.groupKey}`,
          primary,
          members,
          isGrouped: members.length > 1,
        })
      })

      return entries.sort((a, b) => a.primary.timestamp - b.primary.timestamp)
    }

    const visibleEntries = buildChangeListEntries(visibleChanges)
    const displayedCount = visibleEntries.length
    const isEntryPreviewingBefore = (entry: ChangeListEntry): boolean => entry.members.every((change) => beforePreviewChangeIds.has(change.id))
    const toggleEntryBeforePreview = (entry: ChangeListEntry): void => {
      const previewing = isEntryPreviewingBefore(entry)
      entry.members.forEach((change) => {
        setAllDiffsEnabled(change, previewing)
        if (previewing) beforePreviewChangeIds.delete(change.id)
        else beforePreviewChangeIds.add(change.id)
      })
    }
    const deleteEntry = (entry: ChangeListEntry): void => {
      entry.members.forEach((change) => {
        beforePreviewChangeIds.delete(change.id)
        if (activeChangeId === change.id) clearActiveChangeCard()
        removeChange(change.id)
      })
    }
    const buildEntryAIPayload = (entry: ChangeListEntry): string => buildAIPayload(entry.members)
    const entryTargetText = (entry: ChangeListEntry): string => selectorText(entry.primary)
    const entrySummaryLines = (entry: ChangeListEntry): string[] => entry.isGrouped
      ? ['scope: matching peer layers',
        `match rule: same signature, or same child signature inside matching parent cards`,
        ...buildSummaryLines(entry.primary)]
      : buildSummaryLines(entry.primary)
    const entryNoteText = (entry: ChangeListEntry): string => noteText(entry.primary)
    const entryInfoRows = (entry: ChangeListEntry): ChangeInfoRow[] => entry.isGrouped
      ? []
      : collectChangeInfoRows(entry.primary)
    const entryTimestampText = (entry: ChangeListEntry): string => formatRelativeTime(entry.primary.meta.updatedAt || entry.primary.meta.createdAt)
    const locateEntryTarget = (entry: ChangeListEntry): void => locateChangeTarget(entry.primary)
    const isEntrySelected = (entry: ChangeListEntry): boolean => entry.members.some((change) => change.id === activeChangeId)

    const count = el('div', 'ei-ann-summary-count', `${displayedCount} ${i18n.changes.count}`)

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
      if (!Number.isFinite(timestamp)) return '刚刚'
      const delta = Math.max(0, Date.now() - timestamp)
      const minute = 60_000
      const hour = 60 * minute
      const day = 24 * hour
      if (delta < minute) return '刚刚'
      if (delta < hour) return `${Math.max(1, Math.floor(delta / minute))} 分钟前`
      if (delta < day) return `${Math.max(1, Math.floor(delta / hour))} 小时前`
      return `${Math.max(1, Math.floor(delta / day))} 天前`
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
      return [i18n.changes.noExtraNotes]
    }

    const noteText = (change: Change): string => getChangeNoteText(change)

    type ChangeInfoRow = {
      property: string
      value: string
      checked: boolean
      muted: boolean
      colorValue?: string
      onToggle: (checked: boolean) => void
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
        const checked = isTextDiffEnabled(change.id)
        rows.push({
          property: 'text',
          value: truncate(change.patch.textDiff.to, 32),
          checked,
          muted: !checked,
          onToggle: (enabled) => setTextDiffEnabled(change, enabled),
        })
      }

      if (change.patch.moveDiff) {
        const checked = isMoveDiffEnabled(change.id)
        rows.push({
          property: 'position',
          value: `${change.patch.moveDiff.fromIndex} → ${change.patch.moveDiff.toIndex}`,
          checked,
          muted: !checked,
          onToggle: (enabled) => setMoveDiffEnabled(change, enabled),
        })
      }

      getUserVisibleStyleDiffs(change).forEach((diff) => {
        const value = truncate(diff.modified || diff.original || '—', 36)
        const checked = isStyleDiffEnabled(change.id, diff.property)
        rows.push({
          property: diff.property,
          value,
          checked,
          muted: !checked,
          colorValue: getColorPreviewValue(diff.property, diff.modified),
          onToggle: (enabled) => setStyleDiffEnabled(change, diff.property, enabled),
        })
      })

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

    const createChangeInfoRow = (change: Change, row: ChangeInfoRow): HTMLDivElement => {
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
        row.onToggle(checked)
        syncChangePreviewFromEnabledState(change)
        if (currentMode === 'changes') renderChangesList()
      }), content)
      return node
    }

    const syncPreviewState = (): void => {
      changes.forEach((change) => {
        if (!document.contains(change.element)) return
        if (beforePreviewChangeIds.has(change.id)) resetChangeToBefore(change)
        else applyChangeToAfter(change)
      })
      renderMarkers()
      if (lockedElement && document.contains(lockedElement)) {
        const freshInfo = extractInspectorInfo(lockedElement)
        currentInfo = freshInfo
        updateHighlight(freshInfo)
      }
    }

    const importInput = document.createElement('input')
    importInput.type = 'file'
    importInput.accept = 'application/json,.json'
    importInput.style.display = 'none'
    importInput.setAttribute(IGNORE_ATTR, 'true')

    const exportBtn = iconButton(CHANGES_UPLOAD_ICON, i18n.actions.export, 'ei-ann-action ei-ann-action-archive')
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      downloadChangesArchive()
    })

    const importBtn = iconButton(CHANGES_DOWNLOAD_ICON, i18n.actions.import, 'ei-ann-action ei-ann-action-archive')
    importBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      importInput.value = ''
      importInput.click()
    })
    importInput.addEventListener('change', async () => {
      const file = importInput.files?.[0]
      if (!file) return
      try {
        const result = importChangesArchive(await file.text())
        setActionButtonLabel(importBtn, result.skipped > 0 ? `${i18n.actions.imported} ${result.restored}/${result.restored + result.skipped}` : i18n.actions.imported)
        window.setTimeout(() => { setActionButtonLabel(importBtn, i18n.actions.import) }, 1500)
      } catch {
        setActionButtonLabel(importBtn, i18n.actions.invalidImportFile)
        window.setTimeout(() => { setActionButtonLabel(importBtn, i18n.actions.import) }, 1500)
      }
    })

    const summaryActions = el('div', 'ei-ann-summary-actions')
    summaryActions.append(exportBtn, importBtn)

    if (changes.length === 0) {
      changesSummaryBar.replaceChildren(count, summaryActions)
      changesSummaryBar.style.display = 'flex'
      body.innerHTML = '<div class="ei-ann-empty">还没有变更记录。在 Inspector 或 Design 模式中添加。</div>'
    } else {
      const isPreviewingAllBefore = changes.length > 0 && changes.every((change) => beforePreviewChangeIds.has(change.id))
      const previewAllBtn = iconButton(isPreviewingAllBefore ? EYE_CLOSED_ICON : EYE_OPEN_ICON, isPreviewingAllBefore ? i18n.changes.previewAllAfter : i18n.changes.previewAllBefore)
      const syncPreviewAllButton = (): void => {
        const previewing = changes.length > 0 && changes.every((change) => beforePreviewChangeIds.has(change.id))
        swapButtonIcon(previewAllBtn, previewing ? EYE_CLOSED_ICON : EYE_OPEN_ICON)
        setActionButtonLabel(previewAllBtn, previewing ? i18n.changes.previewAllAfter : i18n.changes.previewAllBefore)
        previewAllBtn.classList.toggle('is-active', previewing)
      }
      syncPreviewAllButton()
      previewAllBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const previewing = changes.length > 0 && changes.every((change) => beforePreviewChangeIds.has(change.id))
        changes.forEach((change) => {
          setAllDiffsEnabled(change, previewing)
          if (previewing) beforePreviewChangeIds.delete(change.id)
          else beforePreviewChangeIds.add(change.id)
        })
        refreshChangesList()
      })

      const clearAllBtn = iconButton(CHANGES_HOVER_DELETE_ICON, i18n.changes.clearAll, 'ei-ann-action is-danger')
      clearAllBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        clearAllChanges()
      })
      summaryActions.append(previewAllBtn, clearAllBtn)
      changesSummaryBar.replaceChildren(count, summaryActions)
      changesSummaryBar.style.display = 'flex'

      if (visibleEntries.length === 0) {
        body.appendChild(el('div', 'ei-ann-empty', i18n.changes.emptyFiltered))
      } else {
        const groupedEntries = visibleEntries.reduce<Record<string, ChangeListEntry[]>>((acc, entry) => {
          const key = routeText(entry.primary)
          if (!acc[key]) acc[key] = []
          acc[key].push(entry)
          return acc
        }, {})

        let visibleIndex = 0
        for (const [_groupRoute, groupItems] of Object.entries(groupedEntries)) {
          const group = el('section', 'ei-ann-group')
          const list = el('div', 'ei-ann-list')
          groupItems.forEach((entry, index) => {
            visibleIndex += 1
            const c = entry.primary
            const selected = isEntrySelected(entry)
            const isPreviewingBefore = isEntryPreviewingBefore(entry)
            const summaryLines = entrySummaryLines(entry)
            const infoRows = entryInfoRows(entry)
            const note = entryNoteText(entry)
            if (index > 0) {
              list.appendChild(el('div', 'ei-ann-divider'))
            }
            const item = el('div', `ei-ann-item${selected ? ' is-active' : ''}${isPreviewingBefore ? ' is-previewing-before' : ''}`)
            item.setAttribute(IGNORE_ATTR, 'true')
            item.dataset.changeId = entry.id
            item.addEventListener('click', () => {
              activeChangeId = c.id
              locateEntryTarget(entry)
            })

            const num = el('div', 'ei-ann-num', String(visibleIndex))
            const main = el('div', 'ei-ann-main')

            const top = el('div', 'ei-ann-top')
            const author = el('div', 'ei-ann-author')
            const avatar = el('div', 'ei-ann-avatar')
            avatar.innerHTML = `<img src="${CHANGES_AVATAR_URL}" alt="" />`
            const time = el('div', 'ei-ann-time', entryTimestampText(entry))
            const actions = el('div', 'ei-ann-actions')

            const previewBtn = iconButton(isPreviewingBefore ? EYE_CLOSED_ICON : EYE_OPEN_ICON, isPreviewingBefore ? i18n.actions.showAfter : i18n.actions.showBefore)
            if (c.type !== 'design' && c.type !== 'move') {
              previewBtn.disabled = true
              previewBtn.style.opacity = '0.35'
              previewBtn.style.cursor = 'default'
            } else {
              const syncPreviewButton = (): void => {
                const previewingBefore = isEntryPreviewingBefore(entry)
                swapButtonIcon(previewBtn, previewingBefore ? EYE_CLOSED_ICON : EYE_OPEN_ICON)
                setActionButtonLabel(previewBtn, previewingBefore ? i18n.actions.showAfter : i18n.actions.showBefore)
                previewBtn.classList.toggle('is-active', previewingBefore)
              }
              syncPreviewButton()
              previewBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                toggleEntryBeforePreview(entry)
                syncPreviewButton()
              })
            }

            const singleCopyBtn = iconButton(CHANGES_HOVER_COPY_ICON, i18n.actions.copyAI)
            singleCopyBtn.addEventListener('click', async (e) => {
              e.stopPropagation()
              await navigator.clipboard.writeText(buildEntryAIPayload(entry))
              setActionCopied(singleCopyBtn)
            })

            const closeBtn = iconButton(CHANGES_HOVER_DELETE_ICON, i18n.actions.delete, 'ei-ann-action is-danger')
            closeBtn.addEventListener('click', (e) => {
              e.stopPropagation()
              deleteEntry(entry)
              syncPreviewState()
              refreshChangesList()
            })

            actions.append(previewBtn, singleCopyBtn, closeBtn)
            const headerTitle = el('div', 'ei-ann-header-title')
            headerTitle.append(
              el('span', 'ei-ann-header-target', `#${visibleIndex} · ${entryTargetText(entry)}`),
            )
            author.append(avatar, headerTitle)
            top.append(author, time, actions)

            const infoList = el('div', 'ei-ann-info-list')
            if (infoRows.length) {
              infoRows.forEach((row) => infoList.appendChild(createChangeInfoRow(c, row)))
            } else if (!(summaryLines.length === 1 && summaryLines[0] === i18n.changes.noExtraNotes)) {
              for (const line of summaryLines) {
                infoList.appendChild(el('div', 'ei-ann-diff', line))
              }
            }

            main.append(top)
            if (infoList.childNodes.length) {
              main.appendChild(infoList)
            }

            if (note) {
              const noteSection = el('div', 'ei-ann-note-block')
              const noteContent = el('div', 'ei-ann-note-content')
              const noteTextEl = el('span', 'ei-ann-note', note)
              noteTextEl.title = note
              noteContent.append(el('span', 'ei-ann-note-label', 'Note:'), noteTextEl)
              const noteChecked = !disabledNoteByChangeId.has(c.id)
              noteSection.classList.toggle('is-muted', !noteChecked)
              noteSection.append(createChangeCheckbox(noteChecked, `Note: ${note}`, (checked) => {
                if (checked) disabledNoteByChangeId.delete(c.id)
                else disabledNoteByChangeId.add(c.id)
                noteSection.classList.toggle('is-muted', !checked)
                syncChangePreviewFromEnabledState(c)
                if (currentMode === 'changes') renderChangesList()
              }), noteContent)
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

    exportPrimary.append(copyAIBtn, copyJSONBtn)
    exportRow.append(exportPrimary, importInput)
    panel.appendChild(exportRow)

    setPanelVisible(true)
    positionPanel({ x: window.innerWidth / 2, y: window.innerHeight / 3 })
  }

  // --- Inspector rendering ---

  function renderEmpty(): void {
    body.style.paddingLeft = ''
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

  function buildTypographyCode(info: InspectorInfo): HTMLDivElement {
    return codeRows([
      ['font-family', info.typography.fontFamily],
      ['font-size', info.typography.fontSize],
      ['font-weight', info.typography.fontWeight],
      ['font-style', info.typography.fontStyle],
      ['line-height', info.typography.lineHeight],
      ['letter-spacing', info.typography.letterSpacing],
      ['color', info.typography.color, info.typography.color],
      ['text-align', info.typography.textAlign],
      ['text-transform', info.typography.textTransform],
      ['text-decoration', info.typography.textDecoration],
    ])
  }

  function buildBoxCode(info: InspectorInfo): HTMLDivElement {
    return codeRows([
      ['background', info.visual.backgroundColor, info.visual.backgroundColor],
      ['border-color', info.visual.borderColor, info.visual.borderColor],
      ['box-shadow', info.visual.boxShadow],
    ])
  }

  function buildLayoutCode(info: InspectorInfo): HTMLDivElement {
    return codeRows([
      ['display', info.layout.display],
      ['position', info.layout.position],
      ['gap', info.layout.gap],
      ['flex-direction', info.layout.flexDirection],
      ['justify-content', info.layout.justifyContent],
      ['align-items', info.layout.alignItems],
      ['flex-wrap', info.layout.flexWrap],
      ['grid-template-columns', info.layout.gridTemplateColumns],
      ['grid-template-rows', info.layout.gridTemplateRows],
      ['opacity', info.visual.opacity],
      ['overflow', info.visual.overflow],
      ['class', info.className],
      ['id', info.id],
    ])
  }

  function buildTabs(): HTMLDivElement {
    const tabs = el('div', 'ei-inspector-radio-group')
    tabs.setAttribute('role', 'radiogroup')
    ;(['typography', 'box', 'layout'] as const).forEach(tabName => {
      const buttonLabel = tabName === 'typography'
        ? i18n.inspector.typography
        : tabName === 'box'
          ? i18n.inspector.box
          : i18n.inspector.layout
      const button = el('button', `ei-ann-filter${currentTab === tabName ? ' is-active' : ''}`, buttonLabel)
      button.type = 'button'
      button.dataset.tab = tabName
      button.setAttribute('role', 'radio')
      button.setAttribute('aria-checked', currentTab === tabName ? 'true' : 'false')
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

    panel.classList.add('is-inspector-compact')
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
    body.style.paddingLeft = ''

    const wrap = el('div', 'ei-inspector-wrap')
    const target = el('button', 'ei-inspector-target') as HTMLButtonElement
    target.type = 'button'
    target.setAttribute(IGNORE_ATTR, 'true')
    const chevron = el('span', 'ei-inspector-target-chevron')
    chevron.innerHTML = ICON_CHEVRON_DOWN
    const targetName = el('span', 'ei-inspector-target-name', formatCrumbLabel(info.element) || '\u2014')
    targetName.title = info.domPath
    target.append(chevron, targetName)

    const card = el('div', 'ei-inspector-card')
    const tabs = buildTabs()

    const typography = buildSection('typography', currentTab === 'typography')
    typography.append(buildTypographyCode(info))

    const box = buildSection('box', currentTab === 'box')
    box.append(
      buildBoxDiagram(info.boxModel),
      buildBoxCode(info),
    )

    const layout = buildSection('layout', currentTab === 'layout')
    layout.append(buildLayoutCode(info))

    const syncInspectorExpanded = () => {
      target.dataset.expanded = inspectorDetailsExpanded ? 'true' : 'false'
      card.style.display = inspectorDetailsExpanded ? 'flex' : 'none'
      tabs.style.display = inspectorDetailsExpanded ? '' : 'none'
      typography.style.display = inspectorDetailsExpanded && currentTab === 'typography' ? 'flex' : 'none'
      box.style.display = inspectorDetailsExpanded && currentTab === 'box' ? 'flex' : 'none'
      layout.style.display = inspectorDetailsExpanded && currentTab === 'layout' ? 'flex' : 'none'
    }
    target.addEventListener('click', () => {
      inspectorDetailsExpanded = !inspectorDetailsExpanded
      syncInspectorExpanded()
      if (inspectorDetailsExpanded && annotateInput) {
        requestAnimationFrame(() => {
          if (annotateInput && document.contains(annotateInput)) {
            annotateInput.focus()
            annotateInput.setSelectionRange(annotateInput.value.length, annotateInput.value.length)
          }
        })
      }
    })
    syncInspectorExpanded()

    card.append(tabs, typography, box, layout)
    wrap.append(target, card)
    body.append(wrap)

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
    designApplyOnceMatches = false
    designScopeUserToggled = false
    designPanelView = 'visual'
    designDevDraft = ''
    designDevError = ''
    designDevSessionBaseline = []
    clearDesignScopeOverlay()
  }

  function getElementSignature(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase()
    const className = Array.from(element.classList).filter(name => !name.startsWith('ei-')).sort().join('.')
    return `${tagName}.${className}`
  }

  function hasSameSignature(element: HTMLElement, signature: string): boolean {
    return getElementSignature(element) === signature
  }

  function getDesignSelectionGroupKey(element: HTMLElement): string {
    const parent = element.parentElement
    const children = parent ? Array.from(parent.children) : []
    const siblingIndex = children.indexOf(element)
    const parentSignature = parent ? getElementSignature(parent) : ''
    return [getRoute(), parentSignature, getElementSignature(element), String(siblingIndex)].join('|')
  }

  function getMatchingLayerElements(element: HTMLElement): HTMLElement[] {
    const parent = element.parentElement
    if (!parent) return [element]

    const elementSignature = getElementSignature(element)
    const sameParentMatches = Array.from(parent.children).filter((child): child is HTMLElement => (
      child instanceof HTMLElement && hasSameSignature(child, elementSignature)
    ))
    if (sameParentMatches.length > 1) return [element, ...sameParentMatches.filter(match => match !== element)]

    const grandparent = parent.parentElement
    if (!grandparent) return sameParentMatches.length ? sameParentMatches : [element]

    const parentSignature = getElementSignature(parent)
    const matchingParents = Array.from(grandparent.children).filter((child): child is HTMLElement => (
      child instanceof HTMLElement && hasSameSignature(child, parentSignature)
    ))
    const matchingChildren = matchingParents.flatMap(container => (
      Array.from(container.children).filter((child): child is HTMLElement => (
        child instanceof HTMLElement && hasSameSignature(child, elementSignature)
      ))
    ))

    return matchingChildren.length > 1 ? [element, ...matchingChildren.filter(match => match !== element)] : [element]
  }

  function consumeDesignScopeElements(element: HTMLElement): HTMLElement[] {
    return designApplyOnceMatches ? getMatchingLayerElements(element) : [element]
  }

  function getCurrentDesignScopeElements(element: HTMLElement): HTMLElement[] {
    return designApplyOnceMatches ? getMatchingLayerElements(element) : [element]
  }

  function hasDesignScopedChanges(element: HTMLElement): boolean {
    const scopeElements = new Set(getCurrentDesignScopeElements(element))
    const scopeGroupKey = getDesignSelectionGroupKey(element)
    return changes.some((change) => change.type === 'design' && (
      scopeElements.has(change.element) || change.meta.groupKey === scopeGroupKey
    ))
  }

  function hasExistingMatchingLayerGroup(element: HTMLElement): boolean {
    const matchingElements = new Set(getMatchingLayerElements(element))
    const groupCounts = new Map<string, number>()
    changes.forEach((change) => {
      if (change.type !== 'design' || !change.meta.groupKey || !matchingElements.has(change.element)) return
      groupCounts.set(change.meta.groupKey, (groupCounts.get(change.meta.groupKey) ?? 0) + 1)
    })
    return Array.from(groupCounts.values()).some(count => count > 1)
  }

  function resetDesignSelectionChanges(element: HTMLElement): void {
    const scopeElements = new Set(getCurrentDesignScopeElements(element))
    const scopeGroupKey = getDesignSelectionGroupKey(element)
    const idsToRemove = changes
      .filter((change) => change.type === 'design' && (
        scopeElements.has(change.element) || change.meta.groupKey === scopeGroupKey
      ))
      .map(change => change.id)

    if (idsToRemove.length === 0) return
    idsToRemove.forEach(removeChange)
    resetDesignTracker()
    if (!document.contains(element)) {
      renderDesign(null)
      return
    }
    lockedElement = element
    renderDesign(extractInspectorInfo(element))
  }

  function createDesignActionIconButton(label: string, iconUrl: string): HTMLButtonElement {
    const button = el('button', 'ei-design-action-btn') as HTMLButtonElement
    button.type = 'button'
    button.title = label
    button.setAttribute('aria-label', label)
    button.setAttribute(IGNORE_ATTR, 'true')
    button.innerHTML = `<img src="${iconUrl}" alt="" />`
    return button
  }

  function createDesignModeSegmentButton(label: string, icon: string, active: boolean, iconKind: 'design' | 'code'): HTMLButtonElement {
    const button = el('button', 'ei-tab ei-design-mode-tab') as HTMLButtonElement
    button.dataset.iconOnly = 'true'
    button.dataset.iconKind = iconKind
    button.innerHTML = `<span class="ei-design-mode-tab-icon">${icon}</span>`
    button.setAttribute('aria-pressed', active ? 'true' : 'false')
    button.type = 'button'
    button.title = label
    button.setAttribute('aria-label', label)
    button.setAttribute(IGNORE_ATTR, 'true')
    if (active) button.dataset.active = 'true'
    return button
  }

  function createDesignModeSegmentedControl(info: InspectorInfo): HTMLDivElement {
    const control = el('div', 'ei-tabs ei-design-mode-tabs')
    control.setAttribute(IGNORE_ATTR, 'true')

    const visualBtn = createDesignModeSegmentButton('设计模式', DESIGN_MODE_ICON, designPanelView === 'visual', 'design')
    visualBtn.addEventListener('click', () => {
      if (designPanelView === 'visual') return
      designDevSessionBaseline = []
      designPanelView = 'visual'
      designDevDraft = ''
      designDevError = ''
      renderDesign(extractInspectorInfo(currentInfo?.element ?? info.element))
    })

    const devBtn = createDesignModeSegmentButton('代码模式', DESIGN_DEV_MODE_ICON, designPanelView === 'dev', 'code')
    devBtn.addEventListener('click', () => {
      if (designPanelView === 'dev') return
      designPanelView = 'dev'
      designDevError = ''
      renderDesign(extractInspectorInfo(currentInfo?.element ?? info.element))
    })

    control.append(visualBtn, devBtn)
    return control
  }

  function getCssPatchSelector(element: HTMLElement): string {
    const classes = Array.from(element.classList).filter(name => !name.startsWith('ei-'))
    const firstClass = classes[0]
    if (firstClass) return `.${CSS.escape(firstClass)}`
    const tagName = element.tagName.toLowerCase()
    return element.id ? `${tagName}#${CSS.escape(element.id)}` : tagName
  }

  function formatCssBoxValue(edges: { top: string; right: string; bottom: string; left: string }): string {
    const { top, right, bottom, left } = edges
    if (top === right && right === bottom && bottom === left) return top
    if (top === bottom && right === left) return `${top} ${right}`
    if (right === left) return `${top} ${right} ${bottom}`
    return `${top} ${right} ${bottom} ${left}`
  }

  function formatCssBorderWidth(edges: { top: string; right: string; bottom: string; left: string }): string {
    return formatCssBoxValue(edges)
  }

  function normalizeCssBackgroundValue(value: string): string {
    return value === 'rgba(0, 0, 0, 0)' ? 'transparent' : value
  }

  function collectMatchedRuleDeclarations(element: HTMLElement): Map<string, string> {
    const declarations = new Map<string, string>()

    const visitRules = (rules: CSSRuleList): void => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule) {
          try {
            if (!element.matches(rule.selectorText)) continue
          } catch {
            continue
          }
          for (const property of Array.from(rule.style)) {
            const value = rule.style.getPropertyValue(property).trim()
            if (value) declarations.set(property, value)
          }
          continue
        }

        if ('cssRules' in rule) {
          try {
            visitRules((rule as CSSMediaRule | CSSSupportsRule).cssRules)
          } catch {
            // Ignore nested rule access failures.
          }
        }
      }
    }

    for (const sheet of Array.from(document.styleSheets)) {
      try {
        visitRules(sheet.cssRules)
      } catch {
        // Ignore cross-origin or restricted stylesheets.
      }
    }

    return declarations
  }

  function pickPreferredDeclaration(authored: Map<string, string>, property: string, fallback: string): string {
    return authored.get(property) ?? fallback
  }

  function hasVisiblePadding(edges: { top: string; right: string; bottom: string; left: string }): boolean {
    return [edges.top, edges.right, edges.bottom, edges.left].some(value => value !== '0px')
  }

  function hasVisibleBorder(edges: { top: string; right: string; bottom: string; left: string }, style: string, color: string): boolean {
    const hasWidth = [edges.top, edges.right, edges.bottom, edges.left].some(value => value !== '0px')
    return hasWidth && style !== 'none' && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)'
  }

  function hasVisibleBackground(value: string): boolean {
    return value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)' && value !== 'none'
  }

  function buildInitialCssPatch(info: InspectorInfo, existingChange?: Change): string {
    const selector = getCssPatchSelector(info.element)
    const diffs = existingChange?.diffs?.filter(diff => diff.property !== 'textContent' && !isInternalResetDiff(diff))
    const hasText = info.text.trim().length > 0 && !Array.from(info.element.children).some((child) => {
      const display = window.getComputedStyle(child).display
      return display === 'block' || display === 'flex' || display === 'grid' || display === 'table' || display === 'list-item'
    })
    const authored = collectMatchedRuleDeclarations(info.element)

    const boxDeclarations: Array<[string, string]> = []
    if (hasVisiblePadding(info.boxModel.padding)) {
      boxDeclarations.push(['padding', pickPreferredDeclaration(authored, 'padding', formatCssBoxValue(info.boxModel.padding))])
    }
    if (info.boxModel.borderRadius !== '0px') {
      boxDeclarations.push(['border-radius', pickPreferredDeclaration(authored, 'border-radius', info.boxModel.borderRadius)])
    }
    if (hasVisibleBackground(info.visual.backgroundColor)) {
      boxDeclarations.push(['background', pickPreferredDeclaration(authored, 'background', normalizeCssBackgroundValue(info.visual.backgroundColor))])
    }
    if (info.visual.boxShadow !== 'none') {
      boxDeclarations.push(['box-shadow', pickPreferredDeclaration(authored, 'box-shadow', info.visual.boxShadow)])
    }
    if (hasVisibleBorder(info.boxModel.borderWidth, info.visual.borderStyle, info.visual.borderColor)) {
      boxDeclarations.push(['border', pickPreferredDeclaration(authored, 'border', `${formatCssBorderWidth(info.boxModel.borderWidth)} ${info.visual.borderStyle} ${info.visual.borderColor}`)])
    }

    const textDeclarations: Array<[string, string]> = [
      ['font-size', pickPreferredDeclaration(authored, 'font-size', info.typography.fontSize)],
      ['font-weight', pickPreferredDeclaration(authored, 'font-weight', info.typography.fontWeight)],
      ['color', pickPreferredDeclaration(authored, 'color', info.typography.color)],
    ]
    if (info.typography.textAlign !== 'start') {
      textDeclarations.push(['text-align', pickPreferredDeclaration(authored, 'text-align', info.typography.textAlign)])
    }
    if (hasVisiblePadding(info.boxModel.padding)) {
      textDeclarations.push(['padding', pickPreferredDeclaration(authored, 'padding', formatCssBoxValue(info.boxModel.padding))])
    }
    if (info.typography.textTransform !== 'none') {
      textDeclarations.push(['text-transform', pickPreferredDeclaration(authored, 'text-transform', info.typography.textTransform)])
    }
    if (info.typography.letterSpacing !== 'normal') {
      textDeclarations.push(['letter-spacing', pickPreferredDeclaration(authored, 'letter-spacing', info.typography.letterSpacing)])
    }
    if (hasVisibleBackground(info.visual.backgroundColor)) {
      textDeclarations.push(['background', pickPreferredDeclaration(authored, 'background', normalizeCssBackgroundValue(info.visual.backgroundColor))])
    }

    const declarations: Array<[string, string]> = diffs?.length
      ? diffs.map(diff => [diff.property, diff.modified])
      : hasText
        ? textDeclarations
        : boxDeclarations
    return `${selector} {\n${declarations.map(([property, value]) => `  ${property}: ${value};`).join('\n')}\n}`
  }

  function captureDesignDevBaseline(elements: HTMLElement[]): Array<{ element: HTMLElement; inlineStyle: string; changeIds: string[] }> {
    return elements.map((element) => ({
      element,
      inlineStyle: element.getAttribute('style') ?? '',
      changeIds: changes.filter(change => change.type === 'design' && change.element === element).map(change => change.id),
    }))
  }

  function rollbackDesignDevSession(baseline: Array<{ element: HTMLElement; inlineStyle: string; changeIds: string[] }>): void {
    baseline.forEach(({ element, inlineStyle, changeIds }) => {
      if (!document.contains(element)) return
      if (inlineStyle) element.setAttribute('style', inlineStyle)
      else element.removeAttribute('style')
      changeIds.forEach((id) => {
        changes = changes.filter(change => change.id !== id)
        disabledStyleDiffsByChangeId.delete(id)
        disabledTextDiffByChangeId.delete(id)
        disabledMoveDiffByChangeId.delete(id)
        disabledNoteByChangeId.delete(id)
      })
    })
    persistChangesState()
    renderMarkers()
  }

  function parseCssPatch(input: string, element: HTMLElement): { declarations: StyleDiff[]; error?: string; line?: number } {
    const trimmed = input.trim()
    if (!trimmed) return { declarations: [], error: '请输入 CSS 声明。', line: 1 }
    if (/@|:is\(|:where\(|:has\(|:[\w-]+|,/i.test(trimmed.split('{')[0] ?? '')) return { declarations: [], error: 'Dev Mode MVP 只支持单个普通选择器。', line: 1 }

    let bodyText = trimmed
    let bodyStartLine = 1
    const openIndex = trimmed.indexOf('{')
    const closeIndex = trimmed.lastIndexOf('}')
    if (openIndex >= 0 || closeIndex >= 0) {
      if (openIndex < 0 || closeIndex < 0 || closeIndex < openIndex) return { declarations: [], error: 'CSS block 不完整。', line: 1 }
      const selectorText = trimmed.slice(0, openIndex).trim()
      if (!selectorText || /[{},]/.test(selectorText)) return { declarations: [], error: 'Dev Mode MVP 只支持单个普通选择器。', line: 1 }
      const tail = trimmed.slice(closeIndex + 1).trim()
      if (tail) return { declarations: [], error: 'Dev Mode MVP 只支持一个 CSS block。', line: trimmed.slice(0, closeIndex + 1).split('\n').length + 1 }
      bodyText = trimmed.slice(openIndex + 1, closeIndex)
      bodyStartLine = trimmed.slice(0, openIndex + 1).split('\n').length
      if (/[{}]/.test(bodyText)) return { declarations: [], error: 'Dev Mode MVP 不支持嵌套规则。', line: bodyStartLine }
    }
    if (!bodyText.trim()) return { declarations: [], error: '没有可保存的 CSS 声明。', line: bodyStartLine }

    const computed = window.getComputedStyle(element)
    const declarations: StyleDiff[] = []
    const seen = new Set<string>()
    const segments = bodyText.split(';')
    let consumed = 0
    for (const raw of segments) {
      const rawLine = raw
      const line = raw.trim()
      const lineNumber = bodyStartLine + rawLine.slice(0, rawLine.length - rawLine.trimStart().length).split('\n').length - 1 + bodyText.slice(0, consumed).split('\n').length - 1
      consumed += raw.length + 1
      if (!line) continue
      const separator = line.indexOf(':')
      if (separator <= 0) return { declarations: [], error: `无法解析声明：${line}`, line: lineNumber }
      const property = line.slice(0, separator).trim().toLowerCase()
      const value = line.slice(separator + 1).trim()
      if (!/^-[\w-]+$|^[a-z][\w-]*$/.test(property)) return { declarations: [], error: `不支持的属性名：${property}`, line: lineNumber }
      if (!value || /[{}]/.test(value)) return { declarations: [], error: `不支持的属性值：${property}`, line: lineNumber }
      if (seen.has(property)) return { declarations: [], error: `重复声明：${property}`, line: lineNumber }
      seen.add(property)
      declarations.push({ property, original: computed.getPropertyValue(property), modified: value })
    }
    if (!declarations.length) return { declarations: [], error: '没有可保存的 CSS 声明。', line: bodyStartLine }
    return { declarations }
  }

  function renderDesign(info: InspectorInfo | null): void {
    currentInfo = info
    annotateInput = null
    cleanupPanelExtras()

    panel.classList.remove('is-inspector-compact')
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
    if (!designScopeUserToggled && !designApplyOnceMatches && hasExistingMatchingLayerGroup(info.element)) {
      designApplyOnceMatches = true
    }
    setPanelVisible(true)
    positionPanel(panelAnchor, info)

    body.innerHTML = ''
    body.style.paddingLeft = designPanelView === 'dev' ? '8px' : ''

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
      const scopedElements = scopeElements.filter(element => document.contains(element))
      if (!diffs.length && !note) {
        scopedElements.forEach((element) => {
          const existingScopedChange = changes.find(c => c.type === 'design' && c.element === element)
          if (existingScopedChange) removeChange(existingScopedChange.id)
        })
        requestAnimationFrame(() => {
          const freshInfo = extractInspectorInfo(info.element)
          currentInfo = freshInfo
          updateHighlight(freshInfo)
        })
        return
      }
      scopedElements.forEach((element) => {
        if (element !== primaryElement) {
          diffs.forEach((diff) => {
            if (diff.property === 'textContent') element.textContent = diff.modified
            else element.style.setProperty(diff.property, diff.modified)
          })
        }
        const existingScopedChange = changes.find(c => c.type === 'design' && c.element === element)
        if (existingScopedChange) {
          updateChange(existingScopedChange.id, autoComment, diffs)
          existingScopedChange.meta.groupKey = getDesignSelectionGroupKey(info.element)
          existingScopedChange.meta.designInputMode = designPanelView
          if (note) existingScopedChange.meta.note = note
          activeChangeId = element === primaryElement ? existingScopedChange.id : activeChangeId
          return
        }
        const changeId = addChange(element, [autoComment, note].filter(Boolean).join('\n'), 'design', diffs)
        const createdChange = changes.find(c => c.id === changeId)
        if (createdChange) {
          createdChange.meta.groupKey = getDesignSelectionGroupKey(info.element)
          createdChange.meta.designInputMode = designPanelView
          if (note) {
            createdChange.meta.note = note
            createdChange.comment = [autoComment, note].filter(Boolean).join('\n')
            createdChange.patch = buildChangePatch(createdChange.type, createdChange.diffs, createdChange.comment)
          }
        }
        if (element === primaryElement) activeChangeId = changeId
      })
      requestAnimationFrame(() => {
        const freshInfo = extractInspectorInfo(info.element)
        currentInfo = freshInfo
        updateHighlight(freshInfo)
      })
    }

    const syncDesignNote = (note: string) => {
      const trimmedNote = note.trim()
      const scopedElements = scopeElements.filter(element => document.contains(element))
      if (!scopedElements.length || (!activeChangeId && !trimmedNote)) return
      scopedElements.forEach((element) => {
        let change = changes.find(c => c.type === 'design' && c.element === element)
        if (!change) {
          const changeId = addChange(element, trimmedNote, 'design', [])
          change = changes.find(c => c.id === changeId)
          if (element === primaryElement) activeChangeId = changeId
        }
        if (!change) return
        change.meta.groupKey = getDesignSelectionGroupKey(info.element)
        change.meta.designInputMode = designPanelView
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
        options.onChangeAdd?.(change)
      })
      persistChangesState()
      renderMarkers()
    }

    const designActions = el('div', 'ei-design-actions')
    designActions.style.display = 'flex'
    const actionsLeft = el('div', 'ei-design-actions-left')
    const actionsRight = el('div', 'ei-design-actions-right')

    const matchBtn = createDesignActionIconButton(i18n.design.selectMatchingLayers, DESIGN_SELECT_MATCHING_LAYERS_URL)
    if (designApplyOnceMatches) matchBtn.dataset.active = 'true'
    matchBtn.addEventListener('click', () => {
      designScopeUserToggled = true
      designApplyOnceMatches = matchBtn.dataset.active !== 'true'
      renderDesign(extractInspectorInfo(info.element))
    })

    const currentScopeElements = getCurrentDesignScopeElements(info.element)
    if (designApplyOnceMatches) renderDesignScopeOverlay(currentScopeElements)
    else clearDesignScopeOverlay()

    const modeControl = createDesignModeSegmentedControl(info)

    const resetBtn = createDesignActionIconButton(i18n.design.reset, DESIGN_RESET_URL)
    resetBtn.disabled = !hasDesignScopedChanges(info.element)
    resetBtn.addEventListener('click', () => {
      resetDesignSelectionChanges(info.element)
    })

    actionsLeft.append(modeControl, matchBtn)
    actionsRight.append(resetBtn)
    designActions.append(actionsLeft, actionsRight)
    panel.insertBefore(designActions, body)

    const scopeElements = consumeDesignScopeElements(info.element)
    const primaryElement = scopeElements[0] ?? info.element
    styleTracker = createStyleTracker(primaryElement, designPanelView === 'dev' ? undefined : saveToChanges)

    if (designPanelView === 'dev') {
      if (!designDevDraft) {
        designDevDraft = buildInitialCssPatch(extractInspectorInfo(primaryElement), existingChange)
      }
      if (!designDevSessionBaseline.length) {
        designDevSessionBaseline = captureDesignDevBaseline(scopeElements)
      }
      const syncDesignHighlight = (): void => {
        const freshInfo = extractInspectorInfo(info.element)
        currentInfo = freshInfo
        updateHighlight(freshInfo)
      }
      const applyDevPatch = (value: string, setError: (message: string, line?: number) => void) => {
        designDevDraft = value
        const parsed = parseCssPatch(value, primaryElement)
        if (parsed.error) {
          designDevError = parsed.error
          setError(parsed.error, parsed.line)
          return
        }
        styleTracker?.reset()
        parsed.declarations.forEach((diff) => {
          styleTracker?.apply(diff.property, diff.modified)
        })
        currentTextDiff = null
        saveToChanges()
        syncDesignHighlight()
        designDevError = ''
        setError('')
      }
      const devEditor = buildDesignDevEditor(designDevDraft, {
        onInput: (value, setError) => {
          applyDevPatch(value, setError)
        },
      })
      if (designDevError) {
        const errorEl = devEditor.querySelector<HTMLElement>('.ei-design-dev-error')
        if (errorEl) {
          errorEl.hidden = false
          errorEl.textContent = designDevError
        }
      }
      body.appendChild(devEditor)
      updateHighlight(info)
      return
    }

    const designPanel = buildDesignPanel(primaryElement, extractInspectorInfo(primaryElement), styleTracker, {
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

    panel.classList.remove('is-inspector-compact')
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
    if (isIgnoredEvent(event)) return
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

    if (event.key === 'i' || event.key === 'I') {
      event.preventDefault()
      event.stopPropagation()
      setMode('inspector')
      return
    }

    if (event.key === 'd' || event.key === 'D') {
      event.preventDefault()
      event.stopPropagation()
      setMode('design')
      return
    }

    if (event.key === 'v' || event.key === 'V') {
      event.preventDefault()
      event.stopPropagation()
      setMode('move')
      return
    }

    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault()
      event.stopPropagation()
      setMode('guides')
      return
    }

    if (event.key === 'o' || event.key === 'O') {
      event.preventDefault()
      event.stopPropagation()
      toggleOutlines()
      return
    }

    if (event.key === 'j' || event.key === 'J') {
      event.preventDefault()
      event.stopPropagation()
      toggleToolbarMode('changes')
      return
    }

    if (event.key === 'c' || event.key === 'C') {
      event.preventDefault()
      event.stopPropagation()
      triggerPrimaryCapture()
      return
    }

    if (!isInteractiveMode()) return

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
    panel.classList.remove('is-inspector-compact')
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

  function syncViewportMenu(): void {
    viewportPresetItems.forEach((item) => {
      item.dataset.active = item.dataset.viewportPresetId === currentViewportPreset?.id ? 'true' : 'false'
    })
    viewportBtn.title = currentViewportPreset ? `${i18n.toolbar.viewport}: ${currentViewportPreset.label}` : i18n.toolbar.viewportTooltip
    viewportWidthInput.value = currentViewportState?.width ? String(currentViewportState.width) : ''
    viewportHeightInput.value = currentViewportState?.height ? String(currentViewportState.height) : ''
    viewportLeftInput.value = currentViewportState?.left != null ? String(currentViewportState.left) : ''
    viewportTopInput.value = currentViewportState?.top != null ? String(currentViewportState.top) : ''
    syncViewportModeUi()
  }

  function positionViewportMenu(): void {
    const rect = viewportGroup.getBoundingClientRect()
    viewportMenu.style.left = `${rect.left}px`
    viewportMenu.style.top = `${rect.top - viewportMenu.offsetHeight - 8}px`
  }

  function openViewportMenu(): void {
    if (viewportMenuOpen) return
    viewportMenuOpen = true
    viewportMenu.style.display = 'block'
    syncViewportMenu()
    positionViewportMenu()
    viewportDropdownBtn.style.background = 'var(--surface-active)'
  }

  function closeViewportMenu(): void {
    if (!viewportMenuOpen) return
    viewportMenuOpen = false
    viewportMenu.style.display = 'none'
    viewportDropdownBtn.style.background = ''
  }

  function toggleViewportMenu(): void {
    if (viewportMenuOpen) closeViewportMenu()
    else openViewportMenu()
  }

  function canResizeWindow(): boolean {
    return Boolean(options.viewportController?.setWindowBounds && viewportCapabilities.resizeWindow !== false)
  }

  function canResizeViewport(): boolean {
    return Boolean(options.viewportController?.setViewportSize && viewportCapabilities.resizeViewport !== false)
  }

  function syncViewportModeUi(): void {
    viewportModeViewportBtn.dataset.active = currentViewportTarget === 'viewport' ? 'true' : 'false'
    viewportModeWindowBtn.dataset.active = currentViewportTarget === 'window' ? 'true' : 'false'
    viewportModeViewportBtn.disabled = !canResizeViewport()
    viewportModeWindowBtn.disabled = !canResizeWindow()
    viewportLeftField.dataset.hidden = currentViewportTarget === 'viewport' ? 'true' : 'false'
    viewportTopField.dataset.hidden = currentViewportTarget === 'viewport' ? 'true' : 'false'
    viewportModeHint.textContent = currentViewportTarget === 'window' ? i18n.viewport.modeHintWindow : i18n.viewport.modeHintViewport
  }

  function getPresetTarget(preset?: ViewportPreset | null): ViewportTarget {
    return preset?.target ?? currentViewportTarget
  }

  function setViewportTarget(target: ViewportTarget): void {
    currentViewportTarget = target
    syncViewportModeUi()
  }

  if (!canResizeWindow() && canResizeViewport()) {
    currentViewportTarget = 'viewport'
  }
  if (!canResizeViewport() && canResizeWindow()) {
    currentViewportTarget = 'window'
  }
  syncViewportModeUi()

  async function applyWindowBounds(bounds: WindowBounds): Promise<boolean> {
    if (!options.viewportController?.setWindowBounds || viewportCapabilities.resizeWindow === false) {
      showToast(i18n.viewport.unsupported, 'info')
      return false
    }

    try {
      const result = await options.viewportController.setWindowBounds(bounds)
      if (result === false) {
        showToast(i18n.viewport.unsupported, 'info')
        return false
      }
      return true
    } catch (error) {
      console.error('[Elens] Window resize failed:', error)
      showToast(i18n.viewport.applyFailed, 'error')
      return false
    }
  }

  async function applyViewportSize(width: number, height: number): Promise<boolean> {
    if (!options.viewportController?.setViewportSize || viewportCapabilities.resizeViewport === false) {
      showToast(i18n.viewport.unsupported, 'info')
      return false
    }

    try {
      const result = await options.viewportController.setViewportSize(width, height)
      if (result === false) {
        showToast(i18n.viewport.unsupported, 'info')
        return false
      }
      return true
    } catch (error) {
      console.error('[Elens] Viewport resize failed:', error)
      showToast(i18n.viewport.applyFailed, 'error')
      return false
    }
  }

  async function applyViewportTarget(target: ViewportTarget, bounds: WindowBounds): Promise<boolean> {
    if (target === 'window') {
      if (canResizeWindow()) return applyWindowBounds(bounds)
      if (!canResizeViewport()) {
        showToast(i18n.viewport.unsupported, 'info')
        return false
      }
    }

    if (canResizeViewport()) return applyViewportSize(bounds.width, bounds.height)

    showToast(i18n.viewport.unsupported, 'info')
    return false
  }

  async function setViewportSize(width: number, height: number): Promise<boolean> {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      showToast(i18n.viewport.invalid, 'error')
      return false
    }

    const nextWidth = Math.round(width)
    const nextHeight = Math.round(height)
    const target = currentViewportTarget
    const applied = await applyViewportTarget(target, { width: nextWidth, height: nextHeight })
    if (!applied) return false

    currentViewportPreset = null
    currentViewportState = { width: nextWidth, height: nextHeight, target }
    if (options.persistViewportPreset !== false) persistViewportPresetId(null)
    syncViewportMenu()
    showToast(`${i18n.viewport.applied}: ${nextWidth} × ${nextHeight}`, 'success')
    return true
  }

  async function setViewportPreset(id: string | null): Promise<boolean> {
    if (id == null) {
      currentViewportPreset = null
      currentViewportState = null
      if (options.persistViewportPreset !== false) persistViewportPresetId(null)
      syncViewportMenu()
      return true
    }

    const preset = viewportPresets.find((item) => item.id === id)
    if (!preset) return false

    const target = getPresetTarget(preset)
    const applied = await applyViewportTarget(target, {
      width: preset.width,
      height: preset.height,
      left: preset.left,
      top: preset.top,
    })
    if (!applied) return false

    currentViewportPreset = preset
    currentViewportState = {
      presetId: preset.id,
      width: preset.width,
      height: preset.height,
      left: preset.left,
      top: preset.top,
      target,
    }
    if (options.persistViewportPreset !== false) persistViewportPresetId(preset.id)
    syncViewportMenu()
    showToast(`${i18n.viewport.applied}: ${preset.label}`, 'success')
    return true
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

  function clearOutlines(): void {
    outlinesEnabled = false
    outlinesBtn.dataset.active = ''
    document.body.dataset.eiOutlines = ''
    if (outlinesHoverElement) {
      outlinesHoverElement.classList.remove('ei-hover-highlight')
      outlinesHoverElement = null
    }
  }

  function toggleToolbarMode(mode: InspectorMode): void {
    if (currentMode === mode) {
      setMode('off')
      return
    }
    if (outlinesEnabled) clearOutlines()
    setMode(mode)
  }

  inspectorBtn.addEventListener('click', () => {
    if (!toolbarExpanded) {
      expandToolbar()
      // Reposition after expanding since size changes
      requestAnimationFrame(initToolbarPosition)
    }
    toggleToolbarMode('inspector')
  })
  designBtn.addEventListener('click', () => toggleToolbarMode('design'))
  moveBtn.addEventListener('click', () => toggleToolbarMode('move'))
  changesBtn.addEventListener('click', () => toggleToolbarMode('changes'))
  guidesBtn.addEventListener('click', () => toggleToolbarMode('guides'))
  exitBtn.addEventListener('click', () => {
    setMode('off')
    clearOutlines()
    // Unbind events when closing toolbar with outlines mode
    unbindEvents()
    collapseToolbar()
    requestAnimationFrame(initToolbarPosition)
  })

  function toggleOutlines(): void {
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
  }

  // --- Outlines toggle ---
  outlinesBtn.addEventListener('click', () => {
    toggleOutlines()
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

  function triggerPrimaryCapture(): void {
    if (captureMenuMode === 'element' || captureMenuMode === 'state') return
    void captureEntireScreen()
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
    if (viewportMenuOpen && !viewportMenu.contains(target) && !viewportGroup.contains(target)) {
      closeViewportMenu()
    }
    if (isCaptureMenuOpen && !captureMenu.contains(target) && !screenshotDropdownBtn.contains(target)) {
      closeCaptureMenu()
    }
    if (isOutputDetailMenuOpen && !outputDetailMenu.contains(target)) {
      closeOutputDetailMenu()
    }
  })

  // Update window resize handler to reposition menu
  window.addEventListener('resize', () => {
    if (viewportMenuOpen) positionViewportMenu()
    if (isCaptureMenuOpen) positionCaptureMenu()
    if (isOutputDetailMenuOpen) closeOutputDetailMenu()
  })

  viewportBtn.addEventListener('click', () => {
    openViewportMenu()
  })
  viewportDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleViewportMenu()
  })
  viewportPresetItems.forEach((item) => {
    item.addEventListener('click', () => {
      closeViewportMenu()
      const presetId = item.dataset.viewportPresetId ?? null
      void setViewportPreset(presetId)
    })
  })
  viewportModeViewportBtn.addEventListener('click', (event) => {
    event.stopPropagation()
    setViewportTarget('viewport')
  })
  viewportModeWindowBtn.addEventListener('click', (event) => {
    event.stopPropagation()
    setViewportTarget('window')
  })
  const applyCustomViewport = () => {
    const width = Number.parseInt(viewportWidthInput.value, 10)
    const height = Number.parseInt(viewportHeightInput.value, 10)
    const left = viewportLeftInput.value.trim() === '' ? undefined : Number.parseInt(viewportLeftInput.value, 10)
    const top = viewportTopInput.value.trim() === '' ? undefined : Number.parseInt(viewportTopInput.value, 10)
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      showToast(i18n.viewport.invalid, 'error')
      return
    }
    if ((left != null && !Number.isFinite(left)) || (top != null && !Number.isFinite(top))) {
      showToast(i18n.viewport.invalid, 'error')
      return
    }
    closeViewportMenu()
    const roundedWidth = Math.round(width)
    const roundedHeight = Math.round(height)
    const roundedLeft = left != null ? Math.round(left) : undefined
    const roundedTop = top != null ? Math.round(top) : undefined
    const target = currentViewportTarget
    void applyViewportTarget(target, {
      width: roundedWidth,
      height: roundedHeight,
      left: roundedLeft,
      top: roundedTop,
    }).then((applied) => {
      if (!applied) return
      currentViewportPreset = null
      currentViewportState = {
        width: roundedWidth,
        height: roundedHeight,
        left: roundedLeft,
        top: roundedTop,
        target,
      }
      if (options.persistViewportPreset !== false) persistViewportPresetId(null)
      syncViewportMenu()
      showToast(`${i18n.viewport.applied}: ${roundedWidth} × ${roundedHeight}`, 'success')
    })
  }
  viewportApplyButton.addEventListener('click', (event) => {
    event.stopPropagation()
    applyCustomViewport()
  })
  ;[viewportWidthInput, viewportHeightInput, viewportLeftInput, viewportTopInput].forEach((input) => {
    input.addEventListener('click', (event) => event.stopPropagation())
    input.addEventListener('keydown', (event) => {
      event.stopPropagation()
      if (event.key === 'Enter') applyCustomViewport()
    })
  })

  screenshotBtn.addEventListener('click', () => triggerPrimaryCapture())
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
  syncViewportMenu()

  if (options.viewportController?.getCapabilities) {
    void Promise.resolve(options.viewportController.getCapabilities())
      .then((capabilities) => {
        viewportCapabilities = capabilities
      })
      .catch(() => {
        // Ignore viewport capability read failures.
      })
  }

  if (options.viewportController?.getWindowBounds) {
    void Promise.resolve(options.viewportController.getWindowBounds())
      .then((bounds) => {
        if (!bounds) return
        currentViewportState = {
          presetId: currentViewportPreset?.id,
          width: bounds.width,
          height: bounds.height,
          left: bounds.left,
          top: bounds.top,
          target: 'window',
        }
      })
      .catch(() => {
        // Ignore window bounds read failures.
      })
  } else if (options.viewportController?.getViewportSize) {
    void Promise.resolve(options.viewportController.getViewportSize())
      .then((size) => {
        if (!size) return
        currentViewportState = {
          presetId: currentViewportPreset?.id,
          width: size.width,
          height: size.height,
          target: 'viewport',
        }
      })
      .catch(() => {
        // Ignore viewport size read failures.
      })
  }

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
    setViewportPreset,
    setViewportSize,
    getViewportPreset: () => currentViewportPreset,
    getViewportState: () => currentViewportState,
    destroy,
    getCurrentInfo: () => currentInfo,
    getChanges: () => [...changes],
    clearChanges: () => {
      clearAllChanges()
    },
    exportMarkdown: (detail?: OutputDetail) => buildMarkdownExport(changes, detail),
    exportJSON: (detail?: OutputDetail) => buildJSONExport(changes, detail),
    exportArchiveJSON,
    importChanges: importChangesArchive,
  }
}
