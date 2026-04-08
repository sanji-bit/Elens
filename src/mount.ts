import type { Change, ElementInspectorInstance, ElementInspectorOptions, InspectorInfo, InspectorMode } from './types'
import { buildDesignPanel, createStyleTracker, getDesignStyles, type StyleTracker } from './design'
import { buildCopyText, buildJSONExport, buildMarkdownExport, extractInspectorInfo, getInspectableElementFromPoint, rgbToHex, truncate } from './utils'

const IGNORE_ATTR = 'data-element-inspector-ignore'
const MODE_STORAGE_KEY = 'element-inspector-mode'

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

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

const COPY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`
const CHECK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`

// Toolbar icons — from Figma design, 20x20, stroke=currentColor
const ICON_INSPECTOR = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3.364 3.907a.417.417 0 0 1 .543-.543L17.24 8.781a.417.417 0 0 1-.053.789l-5.103 1.317a1.667 1.667 0 0 0-1.199 1.196L9.57 17.188a.417.417 0 0 1-.789.052L3.364 3.907Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON_DESIGN = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10.028 10.568a.417.417 0 0 1 .54-.54l7.5 2.917a.417.417 0 0 1-.028.79l-2.87.89a1.25 1.25 0 0 0-.793.793l-.89 2.87a.417.417 0 0 1-.789-.027l-2.917-7.5Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.5 9.167V4.167a1.667 1.667 0 0 0-1.667-1.667H4.167A1.667 1.667 0 0 0 2.5 4.167v11.666a1.667 1.667 0 0 0 1.667 1.667h5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON_CHANGES = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4.167 12.5c-.777 0-1.165 0-1.472-.127a1.667 1.667 0 0 1-.901-.902C1.667 11.165 1.667 10.777 1.667 10V4.333c0-.933 0-1.4.181-1.756a1.667 1.667 0 0 1 .729-.729c.357-.181.823-.181 1.756-.181H10c.777 0 1.165 0 1.471.127.408.169.733.494.902.902.127.306.127.695.127 1.471M10.167 18.333h5.5c.933 0 1.4 0 1.756-.181a1.667 1.667 0 0 0 .729-.729c.181-.357.181-.823.181-1.757v-5.5c0-.933 0-1.4-.181-1.756a1.667 1.667 0 0 0-.729-.729c-.357-.181-.823-.181-1.756-.181h-5.5c-.934 0-1.4 0-1.757.181a1.667 1.667 0 0 0-.729.729c-.181.357-.181.823-.181 1.756v5.5c0 .934 0 1.4.181 1.757.16.306.424.57.729.729.357.181.823.181 1.757.181Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON_CLEAR = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 2.5h5M2.5 5h15m-1.667 0-.584 8.766c-.088 1.315-.132 1.973-.416 2.471a2.5 2.5 0 0 1-1.082 1.013c-.516.25-1.175.25-2.493.25H8.742c-1.318 0-1.977 0-2.493-.25a2.5 2.5 0 0 1-1.082-1.013c-.284-.498-.328-1.156-.416-2.471L4.167 5m4.166 3.75v4.167m3.334-4.167v4.167" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON_SCREENSHOT = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M1.667 6.981c0-.292 0-.438.012-.561a2.5 2.5 0 0 1 2.241-2.241c.123-.013.277-.013.585-.013.118 0 .178 0 .228-.003a1.667 1.667 0 0 0 1.446-1.042l.071-.204c.035-.106.053-.158.072-.205a1.667 1.667 0 0 1 1.445-1.042c.05-.003.106-.003.217-.003h4.032c.111 0 .167 0 .217.003a1.667 1.667 0 0 1 1.446 1.042c.018.047.036.1.071.205l.072.204a1.667 1.667 0 0 0 1.445 1.042c.05.003.11.003.228.003.308 0 .462 0 .585.013a2.5 2.5 0 0 1 2.241 2.241c.013.123.013.269.013.561V13.5c0 1.4 0 2.1-.273 2.635a2.5 2.5 0 0 1-1.092 1.092c-.535.273-1.235.273-2.635.273H5.667c-1.4 0-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.093-1.092c-.272-.535-.272-1.235-.272-2.635V6.981Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10.417" r="3.333" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON_EXIT = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`

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
        copyBtn.style.color = 'rgba(0,184,148,0.9)'
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
    corner('tl', rTL), borderCell(boxModel.borderWidth.top, 'Border'), corner('tr', rTR),
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

function createStyles(zIndex: number, accentColor: string): string {
  return `
.ei-root, .ei-root * { box-sizing: border-box; }
.ei-root { position: fixed; inset: 0; pointer-events: none; z-index: ${zIndex}; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.ei-highlight { position: fixed; pointer-events: none; }
.ei-hl-margin { position: relative; width: 100%; height: 100%; background: rgba(225, 112, 85, 0.45); }
.ei-hl-padding { position: absolute; background: rgba(0, 184, 148, 0.50); }
.ei-hl-content { position: absolute; background: rgba(0, 206, 201, 0.50); }
.ei-highlight[data-design="true"] .ei-hl-margin { background: transparent; }
.ei-highlight[data-design="true"] .ei-hl-padding { background: transparent; border: 1px solid ${accentColor}; }
.ei-highlight[data-design="true"] .ei-hl-content { background: repeating-linear-gradient(-45deg, color-mix(in srgb, ${accentColor} 12%, transparent), color-mix(in srgb, ${accentColor} 12%, transparent) 4px, transparent 4px, transparent 8px); }
.ei-hl-label { position: absolute; bottom: 100%; left: 0; background: transparent; color: ${accentColor}; font-size: 11px; font-weight: 500; white-space: nowrap; padding: 0 0 2px; display: none; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.ei-hl-code { position: absolute; bottom: 100%; right: 0; color: ${accentColor}; font-size: 12px; font-weight: 600; padding: 0 0 2px; display: none; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.ei-hl-pad-badge { position: absolute; background: ${accentColor}; color: rgba(255,255,255,0.95); font-size: 9px; font-weight: 500; padding: 1px 4px; border-radius: 3px; white-space: nowrap; display: none; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; z-index: 1; }
.ei-hl-pad-line { position: absolute; display: none; }
.ei-hl-pad-line-h { border-top: 1px solid ${accentColor}; }
.ei-hl-pad-line-v { border-left: 1px solid ${accentColor}; }
.ei-toolbar { position: fixed; display: flex; align-items: center; gap: 6px; padding: 6px; border-radius: 9999px; background: black; box-shadow: 0px 2px 8px rgba(0,0,0,0.24), 0px 1px 24px rgba(0,0,0,0.24); pointer-events: auto; cursor: grab; user-select: none; }
.ei-toolbar:active { cursor: grabbing; }
.ei-toolbar::after { content: ''; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0px 0.5px 0px rgba(255,255,255,0.04), inset 0px 0px 0.5px rgba(255,255,255,0.08); pointer-events: none; }
.ei-toolbar[data-expanded="false"] { padding: 6px; gap: 0; }
.ei-toolbar[data-expanded="false"] .ei-toolbar-extra { display: none; }
.ei-toolbar-btn { width: 32px; height: 32px; border-radius: 9999px; border: 0; background: transparent; color: rgba(255,255,255,0.85); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0; transition: background 0.15s ease; position: relative; }
.ei-toolbar-btn:hover { background: rgba(255,255,255,0.15); }
.ei-toolbar-btn:hover .ei-toolbar-tip { opacity: 1; }
.ei-toolbar-btn[data-active="true"] { background: ${accentColor}; color: rgba(255,255,255,1); }
.ei-toolbar-btn[data-active="true"]:hover { background: ${accentColor}; }
.ei-toolbar-btn[data-disabled="true"] { opacity: 0.35; pointer-events: none; }
.ei-toolbar-btn svg { flex-shrink: 0; }
.ei-toolbar-divider { display: flex; align-items: center; padding: 0 2px; }
.ei-toolbar-divider-line { width: 1px; height: 16px; background: rgba(255,255,255,0.15); }
.ei-toolbar-tip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px; padding: 4px 8px; border-radius: 6px; background: rgba(0,0,0,0.85); color: rgba(255,255,255,0.9); font-size: 11px; font-weight: 500; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.15s ease; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.ei-panel { position: fixed; top: 16px; left: 16px; width: 320px; border-radius: 18px; overflow: visible; background: #111113; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.55); pointer-events: auto; color: #e8e8ec; user-select: text; }
.ei-panel-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.ei-drag-handle { position: absolute; top: 4px; left: 50%; transform: translateX(-50%); width: 40px; height: 12px; border: 0; background: transparent; cursor: grab; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
.ei-drag-handle:active { cursor: grabbing; }
.ei-drag-bar { display: block; width: 24px; height: 3px; border-radius: 999px; background: rgba(255,255,255,0.2); transition: background-color 160ms ease; pointer-events: none; }
.ei-drag-handle:hover .ei-drag-bar { background: rgba(255,255,255,0.45); }
.ei-panel-title { font-size: 12px; font-weight: 700; }
.ei-panel-subtitle { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px; }
.ei-actions { display: flex; gap: 8px; }
.ei-icon-btn { min-width: 32px; height: 32px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.92); cursor: pointer; font-size: 12px; }
.ei-body { padding: 14px 16px 16px; max-height: 70vh; overflow-y: auto; }
.ei-empty { font-size: 12px; color: rgba(255,255,255,0.55); line-height: 1.5; }
.ei-badges { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.ei-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 8px; font-size: 10px; font-weight: 700; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.85); }
.ei-badge-lock { background: color-mix(in srgb, ${accentColor} 22%, #111113); color: ${accentColor}; }
.ei-breadcrumbs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.ei-crumb { display: inline-flex; align-items: center; max-width: 100%; border-radius: 999px; padding: 4px 8px; font-size: 10px; font-weight: 600; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); border: 0; cursor: pointer; }
.ei-crumb[data-active="true"] { background: color-mix(in srgb, ${accentColor} 22%, #111113); color: ${accentColor}; }
.ei-text-head { font-size: 12px; font-weight: 600; line-height: 1.45; margin-bottom: 6px; }
.ei-path { font-size: 11px; color: rgba(255,255,255,0.45); line-height: 1.4; margin-bottom: 12px; word-break: break-word; }
.ei-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; padding: 4px; border-radius: 12px; background: rgba(255,255,255,0.07); }
.ei-tab { height: 30px; border: 0; border-radius: 9px; background: transparent; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.55); cursor: pointer; }
.ei-tab[data-active="true"] { background: rgba(255,255,255,0.14); color: #fff; }
.ei-section { display: none; }
.ei-section[data-active="true"] { display: block; }
.ei-row { display: grid; grid-template-columns: 88px minmax(0,1fr); gap: 8px; align-items: start; font-size: 11px; line-height: 1.4; margin-bottom: 7px; }
.ei-label { color: rgba(255,255,255,0.45); }
.ei-value { min-width: 0; display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.92); }
.ei-text { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-swatch { width: 12px; height: 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); flex-shrink: 0; }
.ei-copy-color { flex-shrink: 0; cursor: pointer; color: rgba(255,255,255,0.35); line-height: 0; padding: 2px; border-radius: 3px; opacity: 0; pointer-events: none; width: 16px; }
.ei-copy-color:hover { color: rgba(255,255,255,0.8); }
.ei-row:hover .ei-copy-color { opacity: 1; pointer-events: auto; }
.ei-box-diagram { width: 100%; margin: 0 0 8px; border-radius: 5px; background: rgba(255,255,255,0.06); padding: 0; overflow: hidden; position: relative; }
.ei-box-body { display: flex; align-items: stretch; }
.ei-box-m { display: flex; align-items: center; justify-content: center; position: relative; }
.ei-box-m-h { height: 32px; flex-direction: column; }
.ei-box-m-v { width: 32px; flex-direction: row; flex-shrink: 0; }
.ei-box-m-line { position: absolute; background: ${accentColor}; }
.ei-box-m-h .ei-box-m-line { width: 1px; height: 100%; left: 50%; transform: translateX(-50%); }
.ei-box-m-v .ei-box-m-line { height: 1px; width: 100%; top: 50%; transform: translateY(-50%); }
.ei-box-m-badge { position: relative; z-index: 1; background: ${accentColor}; color: #fff; font-size: 11px; font-weight: 400; line-height: 16px; padding: 0 3px; border-radius: 2px; white-space: nowrap; letter-spacing: 0.055px; }
.ei-box-container { flex: 1; min-width: 0; display: grid; grid-template-columns: 24px 1fr 24px; grid-template-rows: 24px 1fr 24px; background: rgba(255,255,255,0.1); border-radius: 12px; }
.ei-box-corner { display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.ei-box-corner-mark { position: absolute; width: 17px; height: 17px; border-color: rgba(255,255,255,0.5); border-style: solid; border-width: 0; }
.ei-box-corner-tl .ei-box-corner-mark { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; border-top-left-radius: 12px; }
.ei-box-corner-tr .ei-box-corner-mark { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; border-top-right-radius: 12px; }
.ei-box-corner-bl .ei-box-corner-mark { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; border-bottom-left-radius: 12px; }
.ei-box-corner-br .ei-box-corner-mark { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; border-bottom-right-radius: 12px; }
.ei-box-corner-val { position: relative; z-index: 1; font-size: 11px; color: rgba(255,255,255,0.85); line-height: 16px; letter-spacing: 0.055px; }
.ei-box-b-cell { display: flex; align-items: center; justify-content: center; gap: 6px; }
.ei-box-b-label { font-size: 11px; color: rgba(255,255,255,0.45); letter-spacing: 0.005px; }
.ei-box-b-val { font-size: 11px; color: rgba(255,255,255,0.45); letter-spacing: 0.055px; }
.ei-box-pad { display: grid; grid-template-columns: minmax(24px,1fr) 3fr minmax(24px,1fr); grid-template-rows: 24px 1fr 24px; align-items: center; justify-items: center; background: rgba(9,132,227,0.18); border-radius: 2px; }
.ei-box-pad-label { grid-column: 1; grid-row: 1; justify-self: start; font-size: 11px; color: rgba(255,255,255,0.45); padding-left: 8px; letter-spacing: 0.005px; }
.ei-box-pad-val { font-size: 11px; font-weight: 400; color: rgba(255,255,255,0.85); line-height: 16px; letter-spacing: 0.055px; }
.ei-box-pad-tv { grid-column: 2; grid-row: 1; }
.ei-box-pad-lv { grid-column: 1; grid-row: 2; }
.ei-box-pad-rv { grid-column: 3; grid-row: 2; }
.ei-box-pad-bv { grid-column: 2; grid-row: 3; }
.ei-box-content { grid-column: 2; grid-row: 2; border: 1px dashed rgba(255,255,255,0.35); border-radius: 2px; padding: 3px 10px; font-size: 11px; font-weight: 400; color: rgba(255,255,255,0.85); white-space: nowrap; background: rgba(255,255,255,0.08); line-height: 16px; letter-spacing: 0.055px; display: flex; align-items: center; justify-content: center; gap: 1px; }
.ei-box-sizing { position: absolute; right: 6px; bottom: 4px; font-size: 10px; color: rgba(255,255,255,0.3); letter-spacing: 0.005px; }
.ei-tooltip { position: fixed; max-width: 320px; border-radius: 12px; background: #111113; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 8px 28px rgba(0,0,0,0.5); padding: 10px 12px; pointer-events: none; font-size: 11px; line-height: 1.5; color: #e8e8ec; }
.ei-tt-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-bottom: 4px; }
.ei-tt-tag { font-weight: 700; color: #6C5CE7; font-size: 12px; }
.ei-tt-size { font-size: 11px; color: rgba(255,255,255,0.5); white-space: nowrap; }
.ei-tt-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.ei-tt-label { color: rgba(255,255,255,0.45); flex-shrink: 0; }
.ei-tt-val { color: rgba(255,255,255,0.92); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-tt-swatch { width: 10px; height: 10px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.18); flex-shrink: 0; }
.ei-tt-divider { display: flex; align-items: center; gap: 8px; margin: 6px 0 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.35); }
.ei-tt-divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.12); }
.ei-tt-no { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.45); font-size: 10px; line-height: 1; }
.ei-tt-yes { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: rgba(0,184,148,0.18); color: rgba(0,184,148,0.9); font-size: 10px; line-height: 1; }
.ei-annotate { border-top: 1px solid rgba(255,255,255,0.08); padding: 12px 16px; }
.ei-annotate-input { width: 100%; min-height: 56px; max-height: 120px; resize: vertical; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; color: #e8e8ec; font-size: 12px; font-family: inherit; padding: 8px 10px; outline: none; }
.ei-annotate-input:focus { border-color: ${accentColor}; }
.ei-annotate-input::placeholder { color: rgba(255,255,255,0.3); }
.ei-annotate-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.ei-annotate-btn { height: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.92); cursor: pointer; font-size: 11px; font-weight: 600; padding: 0 12px; }
.ei-annotate-btn-primary { background: ${accentColor}; border-color: ${accentColor}; color: #fff; }
.ei-marker { position: fixed; pointer-events: auto; width: 24px; height: 24px; border-radius: 50%; background: ${accentColor}; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.22); border: none; z-index: 1; }
.ei-ann-list { padding: 0; }
.ei-ann-item { display: flex; gap: 8px; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); cursor: pointer; }
.ei-ann-item:last-child { border-bottom: 0; }
.ei-ann-num { width: 20px; height: 20px; border-radius: 50%; background: ${accentColor}; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
.ei-ann-body { flex: 1; min-width: 0; }
.ei-ann-selector { font-size: 11px; color: rgba(255,255,255,0.55); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-ann-comment { font-size: 12px; color: #e8e8ec; margin-top: 2px; }
.ei-ann-del { flex-shrink: 0; width: 20px; height: 20px; border: 0; background: transparent; color: rgba(255,255,255,0.3); cursor: pointer; font-size: 14px; line-height: 1; padding: 0; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-top: 2px; }
.ei-ann-del:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.08); }
.ei-ann-export { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.08); }
.ei-ann-export-btn { flex: 1; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.92); cursor: pointer; font-size: 11px; font-weight: 600; }
.ei-ann-empty { font-size: 12px; color: rgba(255,255,255,0.4); text-align: center; padding: 24px 16px; }
.ei-ann-type { display: inline-block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 1px 5px; border-radius: 4px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); vertical-align: middle; }
.ei-ann-diffs { margin-top: 4px; }
.ei-ann-diff { font-size: 11px; color: rgba(255,255,255,0.6); font-family: monospace; line-height: 1.5; padding-left: 4px; border-left: 2px solid ${accentColor}; margin-bottom: 2px; }
${getDesignStyles(accentColor)}
`
}

export function mountElementInspector(options: ElementInspectorOptions = {}): ElementInspectorInstance {
  const accentColor = options.theme?.accentColor ?? '#0C8CE9'
  const zIndex = options.theme?.zIndex ?? 999999

  let currentMode: InspectorMode = 'off'
  let destroyed = false
  let lockedElement: HTMLElement | null = null
  let currentInfo: InspectorInfo | null = null
  let currentTab: 'typography' | 'box' | 'layout' = 'typography'
  let rafId: number | null = null
  let latestPoint: { x: number; y: number } | null = null
  let panelAnchor: { x: number; y: number } | null = null
  let panelPosition: { left: number; top: number } | null = null
  let isDraggingPanel = false
  let changes: Change[] = []
  let changeIdCounter = 0
  let annotateInput: HTMLTextAreaElement | null = null
  let toolbarExpanded = false
  let styleTracker: StyleTracker | null = null

  // --- DOM ---

  const root = el('div')
  root.className = 'ei-root'
  root.setAttribute(IGNORE_ATTR, 'true')

  const styleEl = document.createElement('style')
  styleEl.textContent = createStyles(zIndex, accentColor)

  const highlight = el('div', 'ei-highlight')
  highlight.setAttribute(IGNORE_ATTR, 'true')
  highlight.style.display = 'none'
  const hlMargin = el('div', 'ei-hl-margin')
  const hlPadding = el('div', 'ei-hl-padding')
  const hlContent = el('div', 'ei-hl-content')
  hlPadding.appendChild(hlContent)
  hlMargin.appendChild(hlPadding)
  highlight.appendChild(hlMargin)

  // Design mode overlay elements
  const hlLabel = el('div', 'ei-hl-label')
  const hlCode = el('div', 'ei-hl-code', '</>')
  const hlPadBadges: Record<string, HTMLDivElement> = {}
  const hlPadLines: Record<string, HTMLDivElement> = {}
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    hlPadBadges[side] = el('div', 'ei-hl-pad-badge')
    hlPadLines[side] = el('div', `ei-hl-pad-line ei-hl-pad-line-${side === 'top' || side === 'bottom' ? 'v' : 'h'}`)
    hlPadding.appendChild(hlPadLines[side])
    hlPadding.appendChild(hlPadBadges[side])
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

  const inspectorBtn = makeToolbarBtn(ICON_INSPECTOR, 'Inspector')
  const designBtn = makeToolbarBtn(ICON_DESIGN, 'Design')
  designBtn.classList.add('ei-toolbar-extra')
  const changesBtn = makeToolbarBtn(ICON_CHANGES, 'Changes')
  changesBtn.classList.add('ei-toolbar-extra')
  const clearBtn = makeToolbarBtn(ICON_CLEAR, 'Clear All')
  clearBtn.classList.add('ei-toolbar-extra')
  const screenshotBtn = makeToolbarBtn(ICON_SCREENSHOT, 'Screenshot')
  screenshotBtn.classList.add('ei-toolbar-extra')
  screenshotBtn.dataset.disabled = 'true'
  const toolbarDivider = el('div', 'ei-toolbar-divider ei-toolbar-extra')
  toolbarDivider.appendChild(el('div', 'ei-toolbar-divider-line'))

  const exitBtn = makeToolbarBtn(ICON_EXIT, 'Exit')
  exitBtn.classList.add('ei-toolbar-extra')

  toolbar.append(inspectorBtn, designBtn, changesBtn, clearBtn, screenshotBtn, toolbarDivider, exitBtn)

  // Panel
  const panel = el('div', 'ei-panel')
  panel.setAttribute(IGNORE_ATTR, 'true')
  panel.style.display = 'none'

  const header = el('div', 'ei-panel-header')
  const dragHandle = el('button', 'ei-drag-handle')
  dragHandle.type = 'button'
  dragHandle.title = 'Drag panel'
  dragHandle.setAttribute(IGNORE_ATTR, 'true')
  dragHandle.append(el('span', 'ei-drag-bar'))
  const titleWrap = el('div')
  const titleEl = el('div', 'ei-panel-title', 'Element Inspector')
  const subtitle = el('div', 'ei-panel-subtitle', 'Ready')
  titleWrap.append(titleEl, subtitle)

  const markersContainer = el('div')
  markersContainer.setAttribute(IGNORE_ATTR, 'true')

  const actions = el('div', 'ei-actions')
  const copyBtn = el('button', 'ei-icon-btn', 'Copy')
  const unlockBtn = el('button', 'ei-icon-btn', 'Unlock')
  copyBtn.type = 'button'
  unlockBtn.type = 'button'
  copyBtn.setAttribute(IGNORE_ATTR, 'true')
  unlockBtn.setAttribute(IGNORE_ATTR, 'true')
  actions.append(copyBtn, unlockBtn)
  header.append(titleWrap, actions)

  const body = el('div', 'ei-body')
  panel.append(dragHandle, header, body)

  root.append(styleEl, highlight, tooltip, panel, markersContainer, toolbar)
  document.body.appendChild(root)

  // --- Helpers ---

  function isInteractiveMode(): boolean {
    return currentMode === 'inspector' || currentMode === 'design'
  }

  function isIgnoredEvent(event: Event): boolean {
    const target = event.target
    return target instanceof Element && Boolean(target.closest(`[${IGNORE_ATTR}="true"]`))
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
    panel.style.display = visible ? 'block' : 'none'
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
      el('span', 'ei-tt-label', 'Color'),
      colorSwatch,
      el('span', 'ei-tt-val', rgbToHex(info.typography.color)),
    )
    tooltip.appendChild(colorRow)

    const fontRow = el('div', 'ei-tt-row')
    fontRow.append(
      el('span', 'ei-tt-label', 'Font'),
      el('span', 'ei-tt-val', `${info.typography.fontSize} ${truncate(info.typography.fontFamily, 36)}`),
    )
    tooltip.appendChild(fontRow)

    if (!isAllZeroMargin(info.boxModel.margin)) {
      const marginRow = el('div', 'ei-tt-row')
      const m = info.boxModel.margin
      marginRow.append(
        el('span', 'ei-tt-label', 'Margin'),
        el('span', 'ei-tt-val', `${m.top} ${m.right} ${m.bottom} ${m.left}`),
      )
      tooltip.appendChild(marginRow)
    }

    if (!isAllZeroMargin(info.boxModel.padding)) {
      const paddingRow = el('div', 'ei-tt-row')
      const p = info.boxModel.padding
      paddingRow.append(
        el('span', 'ei-tt-label', 'Padding'),
        el('span', 'ei-tt-val', `${p.top} ${p.right} ${p.bottom} ${p.left}`),
      )
      tooltip.appendChild(paddingRow)
    }

    const a11y = info.accessibility
    const divider = el('div', 'ei-tt-divider', 'Accessibility')
    tooltip.appendChild(divider)

    if (a11y.name) {
      const nameRow = el('div', 'ei-tt-row')
      nameRow.append(el('span', 'ei-tt-label', 'Name'), el('span', 'ei-tt-val', truncate(a11y.name, 40)))
      tooltip.appendChild(nameRow)
    }

    const roleRow = el('div', 'ei-tt-row')
    roleRow.append(el('span', 'ei-tt-label', 'Role'), el('span', 'ei-tt-val', a11y.role))
    tooltip.appendChild(roleRow)

    const kbRow = el('div', 'ei-tt-row')
    const kbIcon = el('span', a11y.keyboardFocusable ? 'ei-tt-yes' : 'ei-tt-no')
    kbIcon.textContent = a11y.keyboardFocusable ? '\u2713' : '\u2718'
    kbRow.append(el('span', 'ei-tt-label', 'Keyboard-focusable'), kbIcon)
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

  function showTooltip(info: InspectorInfo, x: number, y: number): void {
    buildTooltipContent(info)
    tooltip.style.display = 'block'
    positionTooltip(x, y)
  }

  function hideTooltip(): void {
    tooltip.style.display = 'none'
  }

  // --- Change management ---

  function findChangeForElement(element: HTMLElement): Change | undefined {
    return changes.find(c => c.element === element)
  }

  function addChange(element: HTMLElement, comment: string, type: 'annotation' | 'design' = 'annotation', diffs?: Change['diffs']): string {
    changeIdCounter++
    const change: Change = {
      id: String(changeIdCounter),
      type,
      element,
      comment,
      info: extractInspectorInfo(element),
      diffs,
      timestamp: Date.now(),
    }
    changes.push(change)
    options.onChangeAdd?.(change)
    renderMarkers()
    return change.id
  }

  function updateChange(id: string, comment: string, diffs: Change['diffs']): void {
    const change = changes.find(c => c.id === id)
    if (!change) return
    change.comment = comment
    change.diffs = diffs
    change.info = extractInspectorInfo(change.element)
    change.timestamp = Date.now()
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
    const submitBtn = el('button', 'ei-annotate-btn ei-annotate-btn-primary', existing ? 'Update' : 'Add')
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

  function renderChangesList(): void {
    body.innerHTML = ''
    cleanupPanelExtras()
    titleEl.textContent = 'Changes'
    subtitle.textContent = `${changes.length} item${changes.length !== 1 ? 's' : ''}`
    copyBtn.style.display = 'none'
    unlockBtn.style.display = 'none'

    if (changes.length === 0) {
      body.innerHTML = '<div class="ei-ann-empty">\u8FD8\u6CA1\u6709\u53D8\u66F4\u8BB0\u5F55\u3002\u5728 Inspector \u6216 Design \u6A21\u5F0F\u4E2D\u6DFB\u52A0\u3002</div>'
      setPanelVisible(true)
      positionPanel({ x: window.innerWidth / 2, y: window.innerHeight / 3 })
      return
    }

    const list = el('div', 'ei-ann-list')
    changes.forEach((c, i) => {
      const item = el('div', 'ei-ann-item')
      item.setAttribute(IGNORE_ATTR, 'true')

      const num = el('div', 'ei-ann-num', String(i + 1))
      const bodyDiv = el('div', 'ei-ann-body')
      const typeBadge = el('span', 'ei-ann-type', c.type === 'design' ? 'Design' : 'Note')
      const selector = el('div', 'ei-ann-selector')
      selector.append(typeBadge, document.createTextNode(` ${c.info.domPath}`))

      if (c.type === 'design' && c.diffs && c.diffs.length > 0) {
        const diffList = el('div', 'ei-ann-diffs')
        for (const d of c.diffs) {
          diffList.appendChild(el('div', 'ei-ann-diff', `${d.property}: ${d.original} → ${d.modified}`))
        }
        bodyDiv.append(selector, diffList)
        if (c.comment) bodyDiv.appendChild(el('div', 'ei-ann-comment', c.comment))
      } else {
        const comment = el('div', 'ei-ann-comment', c.comment)
        bodyDiv.append(selector, comment)
      }

      const delBtn = el('button', 'ei-ann-del', '\u00D7')
      delBtn.type = 'button'
      delBtn.setAttribute(IGNORE_ATTR, 'true')
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        removeChange(c.id)
        renderChangesList()
      })

      item.append(num, bodyDiv, delBtn)
      item.addEventListener('click', () => {
        setMode('inspector')
        lockedElement = c.element
        panelAnchor = null
        renderInfo(extractInspectorInfo(c.element))
      })
      list.appendChild(item)
    })
    body.appendChild(list)

    const exportRow = el('div', 'ei-ann-export')
    const copyAIBtn = el('button', 'ei-ann-export-btn', 'Copy AI')
    copyAIBtn.type = 'button'
    copyAIBtn.setAttribute(IGNORE_ATTR, 'true')
    copyAIBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(buildMarkdownExport(changes))
      copyAIBtn.textContent = 'Copied!'
      setTimeout(() => { copyAIBtn.textContent = 'Copy AI' }, 1500)
    })

    const copyJSONBtn = el('button', 'ei-ann-export-btn', 'Copy JSON')
    copyJSONBtn.type = 'button'
    copyJSONBtn.setAttribute(IGNORE_ATTR, 'true')
    copyJSONBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(buildJSONExport(changes))
      copyJSONBtn.textContent = 'Copied!'
      setTimeout(() => { copyJSONBtn.textContent = 'Copy JSON' }, 1500)
    })

    const clearBtn = el('button', 'ei-ann-export-btn', 'Clear All')
    clearBtn.type = 'button'
    clearBtn.setAttribute(IGNORE_ATTR, 'true')
    clearBtn.addEventListener('click', () => {
      changes = []
      changeIdCounter = 0
      renderMarkers()
      renderChangesList()
    })

    exportRow.append(copyAIBtn, copyJSONBtn, clearBtn)
    panel.appendChild(exportRow)

    setPanelVisible(true)
    positionPanel({ x: window.innerWidth / 2, y: window.innerHeight / 3 })
  }

  // --- Inspector rendering ---

  function renderEmpty(): void {
    const modeLabel = currentMode === 'inspector' ? 'Inspect' : currentMode === 'design' ? 'Design' : ''
    subtitle.textContent = modeLabel ? `${modeLabel} mode \u2014 \u70B9\u51FB\u5143\u7D20\uFF0CEsc \u9000\u51FA` : 'Ready'
    body.innerHTML = currentMode === 'design'
      ? `<div class="ei-empty">\u70B9\u51FB\u4E00\u4E2A\u5143\u7D20\u5F00\u59CB\u7F16\u8F91\u6837\u5F0F\u3002\u4FEE\u6539\u5373\u65F6\u751F\u6548\uFF0C\u5B8C\u6210\u540E\u70B9 Done \u4FDD\u5B58\u53D8\u66F4\u3002</div>`
      : `<div class="ei-empty">\u5F00\u542F\u540E\u5148\u70B9\u51FB\u4E00\u4E2A\u5143\u7D20\uFF0C\u518D\u663E\u793A\u4FE1\u606F\u9762\u677F\u3002\u79FB\u52A8\u9F20\u6807\u53EA\u9AD8\u4EAE\u5143\u7D20\uFF0C\u4E0D\u4F1A\u7ACB\u523B\u6253\u5F00\u4FE1\u606F\u6846\u3002\u9501\u5B9A\u540E\u53EF\u7528\u65B9\u5411\u952E\u5207\u7236/\u5B50/\u5144\u5F1F\u5143\u7D20\uFF0C\u4E5F\u53EF\u4EE5\u76F4\u63A5\u70B9 breadcrumbs \u8DF3\u5C42\u3002</div>`
    copyBtn.style.display = 'none'
    unlockBtn.style.display = lockedElement ? 'inline-block' : 'none'
    setPanelVisible(false)
    setHighlightVisible(false)
  }

  function updateHighlight(info: InspectorInfo | null): void {
    if (currentMode === 'off' || currentMode === 'changes' || !info) {
      setHighlightVisible(false)
      return
    }
    const px = (v: string) => parseFloat(v) || 0
    const m = info.boxModel.margin
    const p = info.boxModel.padding
    const mt = px(m.top), mr = px(m.right), mb = px(m.bottom), ml = px(m.left)
    const pt = px(p.top), pr = px(p.right), pb = px(p.bottom), pl = px(p.left)
    const w = Math.max(info.rect.width, 1)
    const h = Math.max(info.rect.height, 1)

    highlight.style.left = `${info.rect.left - ml}px`
    highlight.style.top = `${info.rect.top - mt}px`
    highlight.style.width = `${w + ml + mr}px`
    highlight.style.height = `${h + mt + mb}px`

    hlPadding.style.top = `${mt}px`
    hlPadding.style.left = `${ml}px`
    hlPadding.style.width = `${w}px`
    hlPadding.style.height = `${h}px`

    hlContent.style.top = `${pt}px`
    hlContent.style.left = `${pl}px`
    hlContent.style.width = `${Math.max(w - pl - pr, 0)}px`
    hlContent.style.height = `${Math.max(h - pt - pb, 0)}px`

    const isDesign = currentMode === 'design'
    highlight.dataset.design = isDesign ? 'true' : 'false'

    if (isDesign) {
      // Element name label
      const tag = info.tagName.toLowerCase()
      const cls = info.element.className && typeof info.element.className === 'string'
        ? '.' + info.element.className.trim().split(/\s+/)[0] : ''
      hlLabel.textContent = tag + cls
      hlLabel.style.display = 'block'
      hlCode.style.display = 'block'

      // Padding badges + measurement lines
      const sides: [string, number][] = [['top', pt], ['right', pr], ['bottom', pb], ['left', pl]]
      for (const [side, val] of sides) {
        const badge = hlPadBadges[side]!
        const line = hlPadLines[side]!
        if (val > 0) {
          badge.textContent = String(Math.round(val))
          badge.style.display = 'block'
          line.style.display = 'block'

          if (side === 'top') {
            badge.style.cssText = `display:block;left:${w / 2 - 10}px;top:${pt / 2 - 7}px;`
            line.style.cssText = `display:block;left:${w / 2}px;top:0;height:${pt}px;width:0;border-left:1px solid ${accentColor};`
          } else if (side === 'bottom') {
            badge.style.cssText = `display:block;left:${w / 2 - 10}px;bottom:${pb / 2 - 7}px;`
            line.style.cssText = `display:block;left:${w / 2}px;bottom:0;height:${pb}px;width:0;border-left:1px solid ${accentColor};`
          } else if (side === 'left') {
            badge.style.cssText = `display:block;left:${pl / 2 - 10}px;top:${h / 2 - 7}px;`
            line.style.cssText = `display:block;top:${h / 2}px;left:0;width:${pl}px;height:0;border-top:1px solid ${accentColor};`
          } else {
            badge.style.cssText = `display:block;right:${pr / 2 - 10}px;top:${h / 2 - 7}px;`
            line.style.cssText = `display:block;top:${h / 2}px;right:0;width:${pr}px;height:0;border-top:1px solid ${accentColor};`
          }
        } else {
          badge.style.display = 'none'
          line.style.display = 'none'
        }
      }
    } else {
      hlLabel.style.display = 'none'
      hlCode.style.display = 'none'
      for (const side of ['top', 'right', 'bottom', 'left']) {
        hlPadBadges[side]!.style.display = 'none'
        hlPadLines[side]!.style.display = 'none'
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
      const buttonLabel = tabName === 'box' ? 'Box' : `${tabName.slice(0, 1).toUpperCase()}${tabName.slice(1)}`
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

    titleEl.textContent = 'Element Inspector'
    subtitle.textContent = 'Inspect mode \u2014 \u70B9\u51FB\u5143\u7D20\u67E5\u770B\uFF0CEsc \u9000\u51FA'

    if (currentMode === 'off' && !info) {
      setPanelVisible(false)
      setHighlightVisible(false)
      return
    }

    copyBtn.style.display = info ? 'inline-block' : 'none'
    unlockBtn.style.display = lockedElement ? 'inline-block' : 'none'

    if (!info) {
      renderEmpty()
      return
    }

    setPanelVisible(true)
    positionPanel(panelAnchor, info)

    body.innerHTML = ''

    const badges = el('div', 'ei-badges')
    const tagBadge = el('span', 'ei-badge', info.tagName)
    badges.appendChild(tagBadge)
    if (lockedElement) {
      badges.appendChild(el('span', 'ei-badge ei-badge-lock', 'Locked'))
    }

    const breadcrumbs = el('div', 'ei-breadcrumbs')
    const chain = getElementChain(info.element).slice(-5)
    chain.forEach(node => {
      const crumb = el('button', 'ei-crumb', formatCrumbLabel(node))
      crumb.type = 'button'
      crumb.dataset.active = node === info.element ? 'true' : 'false'
      crumb.setAttribute(IGNORE_ATTR, 'true')
      crumb.title = formatCrumbLabel(node)
      crumb.addEventListener('click', () => {
        lockedElement = node
        renderInfo(extractInspectorInfo(node))
      })
      breadcrumbs.appendChild(crumb)
    })

    const textHead = el('div', 'ei-text-head', info.text || '\u2014')
    const path = el('div', 'ei-path', info.domPath)
    const tabs = buildTabs()

    const typography = buildSection('typography', currentTab === 'typography')
    typography.append(
      styleRow('Font', info.typography.fontFamily),
      styleRow('Size', info.typography.fontSize),
      styleRow('Weight', info.typography.fontWeight),
      styleRow('Style', info.typography.fontStyle),
      styleRow('Line height', info.typography.lineHeight),
      styleRow('Letter space', info.typography.letterSpacing),
      styleRow('Color', info.typography.color, info.typography.color),
      styleRow('Align', info.typography.textAlign),
      styleRow('Transform', info.typography.textTransform),
      styleRow('Decoration', info.typography.textDecoration),
    )
    const box = buildSection('box', currentTab === 'box')
    const boxDiagram = buildBoxDiagram(info.boxModel)

    box.append(
      boxDiagram,
      styleRow('Background', info.visual.backgroundColor, info.visual.backgroundColor),
      styleRow('Border color', info.visual.borderColor, info.visual.borderColor),
      styleRow('Shadow', info.visual.boxShadow),
    )

    const layout = buildSection('layout', currentTab === 'layout')
    layout.append(
      styleRow('Display', info.layout.display),
      styleRow('Position', info.layout.position),
      styleRow('Gap', info.layout.gap),
      styleRow('Direction', info.layout.flexDirection),
      styleRow('Justify', info.layout.justifyContent),
      styleRow('Align', info.layout.alignItems),
      styleRow('Wrap', info.layout.flexWrap),
      styleRow('Grid cols', info.layout.gridTemplateColumns),
      styleRow('Grid rows', info.layout.gridTemplateRows),
      styleRow('Opacity', info.visual.opacity),
      styleRow('Overflow', info.visual.overflow),
      styleRow('Class', info.className),
      styleRow('ID', info.id),
    )

    body.append(badges, breadcrumbs, textHead, path, tabs, typography, box, layout)

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

    titleEl.textContent = 'Design'
    subtitle.textContent = 'Design mode \u2014 \u70B9\u51FB\u5143\u7D20\u7F16\u8F91\uFF0CEsc \u9000\u51FA'
    copyBtn.style.display = 'none'

    if (!info || !lockedElement) {
      unlockBtn.style.display = 'none'
      renderEmpty()
      return
    }

    unlockBtn.style.display = 'inline-block'
    setPanelVisible(true)
    positionPanel(panelAnchor, info)

    body.innerHTML = ''

    // Create tracker and design panel with auto-save to Changes
    // Resume existing change if this element already has one
    const existingChange = changes.find(c => c.type === 'design' && c.element === info.element)
    let activeChangeId: string | null = existingChange?.id ?? null
    styleTracker = createStyleTracker(info.element, () => {
      if (!styleTracker) return
      const diffs = styleTracker.getDiffs()
      if (diffs.length === 0) return
      const autoComment = diffs.map(d => `${d.property}: ${d.original} \u2192 ${d.modified}`).join(', ')
      if (activeChangeId) {
        updateChange(activeChangeId, autoComment, diffs)
      } else {
        activeChangeId = addChange(info.element, autoComment, 'design', diffs)
      }
      // Update highlight to reflect new element dimensions
      requestAnimationFrame(() => {
        const freshInfo = extractInspectorInfo(info.element)
        currentInfo = freshInfo
        updateHighlight(freshInfo)
      })
    })
    const designPanel = buildDesignPanel(info.element, info, styleTracker, accentColor, {
      onStyleChange: () => {
        const freshInfo = extractInspectorInfo(info.element)
        currentInfo = freshInfo
        updateHighlight(freshInfo)
      },
    })
    body.appendChild(designPanel)

    updateHighlight(info)
  }

  function renderForCurrentMode(info: InspectorInfo | null): void {
    if (currentMode === 'inspector') {
      renderInfo(info)
    } else if (currentMode === 'design') {
      renderDesign(info)
    }
  }

  // --- Inspect logic ---

  function inspectPoint(x: number, y: number): void {
    if (!isInteractiveMode() || lockedElement) return
    const element = getInspectableElementFromPoint(x, y, IGNORE_ATTR)
    if (!element) {
      hideTooltip()
      return
    }
    const info = extractInspectorInfo(element)
    currentInfo = info
    updateHighlight(info)
    showTooltip(info, x, y)
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
    renderMarkers()
    if (!lockedElement) {
      updateHighlight(currentInfo)
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
    } else if (currentMode === 'design') {
      // Only update highlight position, don't re-render design panel
      const info = extractInspectorInfo(lockedElement)
      currentInfo = info
      updateHighlight(info)
      if (panelPosition) positionPanel(panelAnchor, info)
    }
  }

  // --- Event handlers ---

  function onMouseMove(event: MouseEvent): void {
    if (!isInteractiveMode() || isIgnoredEvent(event)) return
    if (lockedElement) {
      hideTooltip()
      return
    }
    queueInspect(event.clientX, event.clientY)
  }

  function blockMouse(event: Event): void {
    if (!isInteractiveMode() || isIgnoredEvent(event) || isPanelEvent(event)) return
    event.preventDefault()
    event.stopPropagation()
  }

  function onClick(event: MouseEvent): void {
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
      renderForCurrentMode(null)
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
    window.addEventListener('mousedown', blockMouse, captureOptions)
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
    window.removeEventListener('mousedown', blockMouse, captureOptions)
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

  function activateChanges(): void {
    cleanupPanelExtras()
    panelPosition = null
    renderChangesList()
  }

  function deactivateChanges(): void {
    panel.querySelectorAll('.ei-ann-export').forEach(n => n.remove())
    setPanelVisible(false)
  }

  function setMode(mode: InspectorMode): void {
    if (destroyed) return
    if (currentMode === mode && mode !== 'off') return

    // Deactivate current
    switch (currentMode) {
      case 'inspector': deactivateInspector(); break
      case 'design': deactivateDesign(); break
      case 'changes': deactivateChanges(); break
    }

    currentMode = mode
    persistMode(mode)

    // Activate new
    switch (currentMode) {
      case 'inspector': activateInspector(); break
      case 'design': activateDesign(); break
      case 'changes': activateChanges(); break
    }

    updateToolbar()
    renderMarkers()
  }

  function updateToolbar(): void {
    inspectorBtn.dataset.active = currentMode === 'inspector' ? 'true' : 'false'
    designBtn.dataset.active = currentMode === 'design' ? 'true' : 'false'
    changesBtn.dataset.active = currentMode === 'changes' ? 'true' : 'false'
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
    lockedElement = null
    panelAnchor = null
    panelPosition = null
    renderForCurrentMode(null)
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
  changesBtn.addEventListener('click', () => setMode('changes'))
  clearBtn.addEventListener('click', () => {
    changes.forEach(c => {
      if (c.type === 'design' && c.diffs) {
        for (const diff of c.diffs) c.element.style.removeProperty(diff.property)
      }
    })
    changes = []
    changeIdCounter = 0
    renderMarkers()
    if (currentMode === 'changes') renderChangesList()
  })
  exitBtn.addEventListener('click', () => {
    setMode('off')
    collapseToolbar()
    requestAnimationFrame(initToolbarPosition)
  })
  toolbar.addEventListener('mousedown', startToolbarDrag)
  copyBtn.addEventListener('click', copyCurrent)
  unlockBtn.addEventListener('click', unlockCurrent)
  dragHandle.addEventListener('mousedown', startPanelDrag)

  // Initial toolbar position: right:16 bottom:16
  toolbar.style.right = '16px'
  toolbar.style.bottom = '16px'

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
    destroy,
    getCurrentInfo: () => currentInfo,
    getChanges: () => [...changes],
    clearChanges: () => {
      changes.forEach(c => {
        if (c.type === 'design' && c.diffs) {
          for (const diff of c.diffs) c.element.style.removeProperty(diff.property)
        }
      })
      changes = []
      changeIdCounter = 0
      renderMarkers()
      if (currentMode === 'changes') renderChangesList()
    },
    exportMarkdown: () => buildMarkdownExport(changes),
    exportJSON: () => buildJSONExport(changes),
  }
}
