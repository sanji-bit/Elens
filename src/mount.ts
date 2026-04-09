import type { Change, ElementInspectorInstance, ElementInspectorOptions, InspectorInfo, InspectorMode } from './types'
import { buildDesignPanel, createStyleTracker, getDesignStyles, type StyleTracker } from './design'
import { buildCopyText, buildDomPath, buildJSONExport, buildMarkdownExport, extractInspectorInfo, getInspectableElementFromPoint, rgbToHex, truncate } from './utils'

const IGNORE_ATTR = 'data-elens-ignore'
const MODE_STORAGE_KEY = 'elens-mode'

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
const ICON_CHANGES = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.3334 3.33337H15C15.4421 3.33337 15.866 3.50897 16.1786 3.82153C16.4911 4.13409 16.6667 4.55801 16.6667 5.00004V6.66671" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.7834 13.0533C17.9478 12.8889 18.0782 12.6938 18.1671 12.479C18.2561 12.2643 18.3019 12.0341 18.3019 11.8016C18.3019 11.5692 18.2561 11.339 18.1671 11.1242C18.0782 10.9095 17.9478 10.7143 17.7834 10.55C17.619 10.3856 17.4239 10.2552 17.2091 10.1662C16.9944 10.0773 16.7642 10.0315 16.5317 10.0315C16.2993 10.0315 16.0691 10.0773 15.8543 10.1662C15.6396 10.2552 15.4444 10.3856 15.2801 10.55L11.1051 14.7266C10.9069 14.9246 10.7619 15.1694 10.6834 15.4383L9.9859 17.83C9.96499 17.9017 9.96374 17.9777 9.98227 18.05C10.0008 18.1224 10.0385 18.1884 10.0913 18.2412C10.1441 18.2941 10.2101 18.3317 10.2825 18.3502C10.3549 18.3688 10.4309 18.3675 10.5026 18.3466L12.8942 17.6491C13.1631 17.5706 13.4079 17.4256 13.6059 17.2275L17.7834 13.0533Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.66671 18.3334H5.00004C4.55801 18.3334 4.13409 18.1578 3.82153 17.8452C3.50897 17.5327 3.33337 17.1087 3.33337 16.6667V5.00004C3.33337 4.55801 3.50897 4.13409 3.82153 3.82153C4.13409 3.50897 4.55801 3.33337 5.00004 3.33337H6.66671" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.5 1.66663H7.49996C7.03972 1.66663 6.66663 2.03972 6.66663 2.49996V4.16663C6.66663 4.62686 7.03972 4.99996 7.49996 4.99996H12.5C12.9602 4.99996 13.3333 4.62686 13.3333 4.16663V2.49996C13.3333 2.03972 12.9602 1.66663 12.5 1.66663Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON_MOVE = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 1.66663V18.3333" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.5 15.8334L10 18.3334L7.5 15.8334" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.8334 7.5L18.3334 10L15.8334 12.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M1.66663 10H18.3333" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.16663 7.5L1.66663 10L4.16663 12.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.5 4.16663L10 1.66663L12.5 4.16663" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON_SCREENSHOT = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.99996 1.25H7.08329C5.47246 1.25 4.16663 2.55584 4.16663 4.16667C4.16663 5.7775 5.47246 7.08333 7.08329 7.08333M9.99996 1.25V7.08333M9.99996 1.25H12.9166C14.5275 1.25 15.8333 2.55584 15.8333 4.16667C15.8333 5.7775 14.5275 7.08333 12.9166 7.08333M9.99996 7.08333H7.08329M9.99996 7.08333V12.9167M9.99996 7.08333H12.9166M7.08329 7.08333C5.47246 7.08333 4.16663 8.38917 4.16663 10C4.16663 11.6108 5.47246 12.9167 7.08329 12.9167M9.99996 12.9167H7.08329M9.99996 12.9167V15.8333C9.99996 17.4442 8.69412 18.75 7.08329 18.75C5.47246 18.75 4.16663 17.4442 4.16663 15.8333C4.16663 14.2225 5.47246 12.9167 7.08329 12.9167M12.9166 7.08333C14.5275 7.08333 15.8333 8.38917 15.8333 10C15.8333 11.6108 14.5275 12.9167 12.9166 12.9167C11.3058 12.9167 9.99996 11.6108 9.99996 10C9.99996 8.38917 11.3058 7.08333 12.9166 7.08333Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON_CHEVRON_DOWN = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`
const ICON_CAPTURE_SCREEN = `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.16675 4.88667C1.16675 4.68232 1.16675 4.58014 1.17527 4.49408C1.25752 3.66403 1.91415 3.00739 2.7442 2.92515C2.83027 2.91663 2.93796 2.91663 3.15334 2.91663C3.23633 2.91663 3.27782 2.91663 3.31306 2.91449C3.76294 2.88725 4.15689 2.6033 4.325 2.18513C4.33816 2.15238 4.35047 2.11546 4.37508 2.04163C4.39969 1.96779 4.412 1.93088 4.42516 1.89813C4.59328 1.47995 4.98722 1.19601 5.43711 1.16876C5.47234 1.16663 5.51125 1.16663 5.58908 1.16663H8.41108C8.48891 1.16663 8.52782 1.16663 8.56306 1.16876C9.01294 1.19601 9.40689 1.47995 9.575 1.89813C9.58816 1.93088 9.60047 1.96779 9.62508 2.04163C9.64969 2.11546 9.662 2.15238 9.67516 2.18513C9.84328 2.6033 10.2372 2.88725 10.6871 2.91449C10.7223 2.91663 10.7638 2.91663 10.8468 2.91663C11.0622 2.91663 11.1699 2.91663 11.256 2.92515C12.086 3.00739 12.7426 3.66403 12.8249 4.49408C12.8334 4.58014 12.8334 4.68232 12.8334 4.88667V9.44996C12.8334 10.4301 12.8334 10.9201 12.6427 11.2944C12.4749 11.6237 12.2072 11.8914 11.8779 12.0592C11.5036 12.25 11.0135 12.25 10.0334 12.25H3.96675C2.98666 12.25 2.49661 12.25 2.12226 12.0592C1.79298 11.8914 1.52527 11.6237 1.35749 11.2944C1.16675 10.9201 1.16675 10.4301 1.16675 9.44996V4.88667Z" stroke="currentColor" stroke-width="0.875" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.00008 9.62496C8.28875 9.62496 9.33341 8.58029 9.33341 7.29163C9.33341 6.00296 8.28875 4.95829 7.00008 4.95829C5.71142 4.95829 4.66675 6.00296 4.66675 7.29163C4.66675 8.58029 5.71142 9.62496 7.00008 9.62496Z" stroke="currentColor" stroke-width="0.875" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON_CAPTURE_WINDOW = `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.6666 2.33337H2.33329C1.68896 2.33337 1.16663 2.85571 1.16663 3.50004V10.5C1.16663 11.1444 1.68896 11.6667 2.33329 11.6667H11.6666C12.311 11.6667 12.8333 11.1444 12.8333 10.5V3.50004C12.8333 2.85571 12.311 2.33337 11.6666 2.33337Z" stroke="currentColor" stroke-width="0.875" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 4.66663H3.50583" stroke="currentColor" stroke-width="0.875" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.83337 4.66663H5.83921" stroke="currentColor" stroke-width="0.875" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.16663 4.66663H8.17246" stroke="currentColor" stroke-width="0.875" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON_SELECT_ELEMENT = `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.25 5.54167V4.55C12.25 3.56991 12.25 3.07986 12.0593 2.70552C11.8915 2.37623 11.6238 2.10852 11.2945 1.94074C10.9201 1.75 10.4301 1.75 9.45 1.75H4.55C3.56991 1.75 3.07986 1.75 2.70552 1.94074C2.37623 2.10852 2.10852 2.37623 1.94074 2.70552C1.75 3.07986 1.75 3.56991 1.75 4.55V9.45C1.75 10.4301 1.75 10.9201 1.94074 11.2945C2.10852 11.6238 2.37623 11.8915 2.70552 12.0593C3.07986 12.25 3.56991 12.25 4.55 12.25H5.54167M10.142 10.3316L9.15128 12.1714C8.98934 12.4721 8.90838 12.6225 8.80969 12.6618C8.72402 12.6958 8.62728 12.6874 8.5488 12.639C8.45842 12.5832 8.40474 12.4211 8.29738 12.0968L6.70856 7.29826C6.61455 7.01432 6.56754 6.87235 6.60134 6.7778C6.63076 6.69552 6.69552 6.63076 6.7778 6.60134C6.87235 6.56754 7.01432 6.61455 7.29826 6.70857L12.0968 8.29739C12.4211 8.40475 12.5832 8.45843 12.639 8.54882C12.6874 8.6273 12.6958 8.72404 12.6617 8.80971C12.6225 8.90839 12.4721 8.98936 12.1714 9.15129L10.3316 10.142C10.2858 10.1666 10.2629 10.179 10.2428 10.1948C10.225 10.2089 10.2089 10.225 10.1948 10.2428C10.179 10.2629 10.1666 10.2858 10.142 10.3316Z" stroke="currentColor" stroke-width="0.875" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON_STATE_CAPTURE = `<svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_icon)"><path d="M5.24996 2.04163V1.16663M2.95201 2.95201L2.33329 2.33329M2.95201 7.58329L2.33329 8.20201M7.58329 2.95201L8.20201 2.33329M2.04163 5.24996H1.16663M9.25424 9.44388L7.80072 12.1432C7.63467 12.4516 7.55164 12.6058 7.45175 12.6448C7.36506 12.6786 7.26743 12.6691 7.18894 12.6191C7.09851 12.5614 7.04696 12.3941 6.94385 12.0594L4.92632 5.50969C4.84209 5.23625 4.79998 5.09954 4.83386 5.0072C4.86338 4.92677 4.92677 4.86338 5.0072 4.83387C5.09954 4.79998 5.23625 4.84209 5.50969 4.92632L12.0593 6.94387C12.3941 7.04698 12.5614 7.09853 12.619 7.18897C12.6691 7.26745 12.6786 7.36509 12.6448 7.45177C12.6058 7.55167 12.4516 7.63469 12.1432 7.80074L9.44388 9.25424C9.39805 9.27891 9.37514 9.29125 9.35508 9.3071C9.33728 9.32117 9.32117 9.33728 9.3071 9.35508C9.29125 9.37514 9.27891 9.39805 9.25424 9.44388Z" stroke="currentColor" stroke-width="0.875" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="clip0_icon"><rect width="14" height="14" fill="white"/></clipPath></defs></svg>`
const ICON_EXIT = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const ICON_OUTLINES = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path opacity="0.12" d="M9.99996 13.3333C11.8409 13.3333 13.3333 11.8409 13.3333 9.99996C13.3333 8.15901 11.8409 6.66663 9.99996 6.66663C8.15901 6.66663 6.66663 8.15901 6.66663 9.99996C6.66663 11.8409 8.15901 13.3333 9.99996 13.3333Z" fill="currentColor"/><path d="M1.66663 6.5C1.66663 5.09987 1.66663 4.3998 1.93911 3.86502C2.17879 3.39462 2.56124 3.01217 3.03165 2.77248C3.56643 2.5 4.26649 2.5 5.66663 2.5H14.3333C15.7334 2.5 16.4335 2.5 16.9683 2.77248C17.4387 3.01217 17.8211 3.39462 18.0608 3.86502C18.3333 4.3998 18.3333 5.09987 18.3333 6.5V13.5C18.3333 14.9001 18.3333 15.6002 18.0608 16.135C17.8211 16.6054 17.4387 16.9878 16.9683 17.2275C16.4335 17.5 15.7334 17.5 14.3333 17.5H5.66663C4.26649 17.5 3.56643 17.5 3.03165 17.2275C2.56124 16.9878 2.17879 16.6054 1.93911 16.135C1.66663 15.6002 1.66663 14.9001 1.66663 13.5V6.5Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.99996 13.3333C11.8409 13.3333 13.3333 11.8409 13.3333 10C13.3333 8.15905 11.8409 6.66667 9.99996 6.66667C8.15901 6.66667 6.66663 8.15905 6.66663 10C6.66663 11.8409 8.15901 13.3333 9.99996 13.3333Z" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`

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
.ei-highlight[data-outlines="true"] .ei-hl-margin { background: transparent; }
.ei-highlight[data-outlines="true"] .ei-hl-padding { background: transparent; border: 1px solid ${accentColor}; }
.ei-highlight[data-outlines="true"] .ei-hl-content { background: repeating-linear-gradient(-45deg, color-mix(in srgb, ${accentColor} 12%, transparent), color-mix(in srgb, ${accentColor} 12%, transparent) 4px, transparent 4px, transparent 8px); }
.ei-highlight[data-move="true"] .ei-hl-padding { border: 1px solid ${accentColor}; background: transparent; }
.ei-highlight[data-move="true"] .ei-hl-content { background: transparent; }
.ei-moving { opacity: 0.72; outline: 1px solid ${accentColor}; outline-offset: 2px; pointer-events: none; }
.ei-move-indicator { position: fixed; inset: 0; display: none; pointer-events: none; z-index: 2; }
.ei-move-indicator[data-visible="true"] { display: block; }
.ei-move-bounds { position: absolute; border: 1px dashed #FF00FF; border-radius: 0; background: transparent; box-shadow: none; }
.ei-move-bounds-label { position: absolute; display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 0; background: #FF00FF; color: rgba(255,255,255,0.98); font-size: 10px; font-weight: 600; line-height: 1; white-space: nowrap; box-shadow: 0 6px 20px rgba(255,0,255,0.22); }
.ei-move-handles { position: absolute; inset: 0; }
.ei-move-handle { position: absolute; pointer-events: auto; width: 32px; height: 10px; margin: -5px 0 0 -16px; border: 2px solid #FF00FF; border-radius: 999px; background: rgba(255,255,255,0.92); cursor: grab; transition: background-color 120ms ease, box-shadow 120ms ease, transform 120ms ease, opacity 120ms ease; }
.ei-move-handle::before { content: ''; position: absolute; inset: 1px 5px; border-radius: 999px; background: repeating-linear-gradient(90deg, rgba(255,0,255,0.22) 0 2px, transparent 2px 5px); }
.ei-move-handle:hover,
.ei-move-handle[data-active="true"] { background: #FF00FF; box-shadow: 0 0 0 3px rgba(255,0,255,0.14); }
.ei-move-handle:hover::before,
.ei-move-handle[data-active="true"]::before { background: transparent; }
.ei-move-handle:hover { transform: scale(1.03); }
.ei-move-handle[data-active="true"] { cursor: grabbing; transform: scale(1.04); }
.ei-move-guide-line { position: absolute; display: none; height: 1px; background: #FF00FF; transform-origin: center; }
.ei-move-guide-dot { position: absolute; display: none; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 999px; border: 2px solid #FF00FF; background: #fff; }
.ei-move-indicator[data-visible="true"] .ei-move-guide-line,
.ei-move-indicator[data-visible="true"] .ei-move-guide-dot { display: block; }
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-content { background: transparent; }
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-margin { background: transparent; }
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-padding { background: transparent; border: 1px solid ${accentColor}; }
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-label,
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-code,
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-pad-badge,
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-pad-line { display: none !important; }
.ei-root[data-mode="move"] .ei-panel { user-select: none; }
.ei-root[data-mode="move"] .ei-empty { line-height: 1.6; color: rgba(255,255,255,0.72); }
.ei-root[data-mode="move"] .ei-badge-lock { background: color-mix(in srgb, ${accentColor} 22%, #111113); }
.ei-root[data-mode="move"] .ei-copy-color,
.ei-root[data-mode="move"] .ei-annotate { display: none; }
.ei-root[data-mode="move"] [data-ei-moving="true"] { opacity: 0.72; outline: 1px solid ${accentColor}; outline-offset: 2px; }
.ei-hl-label { position: absolute; bottom: 100%; left: 0; background: transparent; color: ${accentColor}; font-size: 11px; font-weight: 500; white-space: nowrap; padding: 0 0 2px; display: none; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.ei-hl-code { position: absolute; bottom: 100%; right: 0; color: ${accentColor}; font-size: 12px; font-weight: 600; padding: 0 0 2px; display: none; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.ei-hl-pad-badge { position: absolute; background: ${accentColor}; color: rgba(255,255,255,0.95); font-size: 9px; font-weight: 500; padding: 1px 4px; border-radius: 3px; white-space: nowrap; display: none; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; z-index: 1; }
.ei-hl-pad-line { position: absolute; display: none; }
.ei-hl-pad-line-h { border-top: 1px solid ${accentColor}; }
.ei-hl-pad-line-v { border-left: 1px solid ${accentColor}; }
.ei-hl-margin-badge { position: absolute; background: #E17055; color: rgba(255,255,255,0.95); font-size: 9px; font-weight: 500; padding: 1px 4px; border-radius: 3px; white-space: nowrap; display: none; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; z-index: 1; }
.ei-hl-margin-line { position: absolute; display: none; }
.ei-hl-margin-line-h { border-top: 1px dashed #E17055; }
.ei-hl-margin-line-v { border-left: 1px dashed #E17055; }
.ei-highlight[data-design="true"] .ei-hl-margin-badge,
.ei-highlight[data-design="true"] .ei-hl-margin-line { display: block; }
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
.ei-toolbar-btn-group { display: flex; align-items: center; gap: 0; }
.ei-toolbar-btn-group .ei-toolbar-btn { border-radius: 0; }
.ei-toolbar-btn-group .ei-toolbar-btn:first-child { border-radius: 9999px 0 0 9999px; }
.ei-toolbar-btn-group .ei-toolbar-btn:last-child { border-radius: 0 9999px 9999px 0; }
.ei-toolbar-dropdown-btn { width: 20px !important; display: flex !important; align-items: center !important; justify-content: center !important; }
.ei-capture-menu { position: fixed; min-width: 220px; border-radius: 12px; background: #111113; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 8px 28px rgba(0,0,0,0.5); padding: 6px; z-index: ${zIndex + 5}; pointer-events: auto; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.ei-capture-menu-item { display: flex; align-items: center; gap: 10px; width: 100%; height: 24px; padding: 0 8px; border-radius: 8px; border: 0; background: transparent; color: rgba(255,255,255,0.92); cursor: pointer; text-align: left; transition: background 0.15s ease; }
.ei-capture-menu-item:hover { background: rgba(255,255,255,0.15); }
.ei-capture-menu-icon { flex-shrink: 0; width: 16px; height: 16px; color: rgba(255,255,255,0.7); }
.ei-capture-menu-label { font-size: 11px; font-weight: 400; color: rgba(255,255,255,0.95); font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
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
.ei-body { padding: 4px 16px 16px; max-height: 70vh; overflow-y: auto; overflow-y: overlay; scrollbar-width: none; -ms-overflow-style: none; }
.ei-body::-webkit-scrollbar { width: 0; height: 0; display: none; }
.ei-body::-webkit-scrollbar-track { background: transparent; }
.ei-body::-webkit-scrollbar-thumb { background: transparent; border-radius: 0; }
.ei-body::-webkit-scrollbar-thumb:hover { background: transparent; }
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
[data-ei-outlines="true"] * { outline: 1px solid rgba(0, 0, 0, 0.6); outline-offset: -1px; }
[data-ei-outlines="true"] *:hover { outline-color: rgba(0, 0, 0, 0.9); }
[data-ei-outlines="true"] .ei-hover-highlight { outline: 2px solid ${accentColor}; outline-offset: -1px; }
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
  let toolbarExpanded = false
  let styleTracker: StyleTracker | null = null
  let moveChangeIdByElement = new WeakMap<HTMLElement, string>()
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

  const moveIndicator = el('div', 'ei-move-indicator')
  moveIndicator.setAttribute(IGNORE_ATTR, 'true')
  moveIndicator.dataset.visible = 'false'
  const moveBounds = el('div', 'ei-move-bounds')
  const moveBoundsLabel = el('div', 'ei-move-bounds-label', 'Drag Bounds')
  const moveHandles = el('div', 'ei-move-handles')
  const moveGuideLine = el('div', 'ei-move-guide-line')
  const moveGuideDot = el('div', 'ei-move-guide-dot')
  moveIndicator.append(moveBounds, moveBoundsLabel, moveHandles, moveGuideLine, moveGuideDot)

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
  const hlMarginBadges: Record<string, HTMLDivElement> = {}
  const hlMarginLines: Record<string, HTMLDivElement> = {}
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    hlPadBadges[side] = el('div', 'ei-hl-pad-badge')
    hlPadLines[side] = el('div', `ei-hl-pad-line ei-hl-pad-line-${side === 'top' || side === 'bottom' ? 'v' : 'h'}`)
    hlPadding.appendChild(hlPadLines[side])
    hlPadding.appendChild(hlPadBadges[side])
    // Margin badges and lines (attached to margin layer)
    hlMarginBadges[side] = el('div', 'ei-hl-margin-badge')
    hlMarginLines[side] = el('div', `ei-hl-margin-line ei-hl-margin-line-${side === 'top' || side === 'bottom' ? 'v' : 'h'}`)
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

  const inspectorBtn = makeToolbarBtn(ICON_INSPECTOR, 'Inspector')
  const designBtn = makeToolbarBtn(ICON_DESIGN, 'Design')
  designBtn.classList.add('ei-toolbar-extra')
  const moveBtn = makeToolbarBtn(ICON_MOVE, 'Move')
  moveBtn.classList.add('ei-toolbar-extra')
  const changesBtn = makeToolbarBtn(ICON_CHANGES, 'Changes')
  changesBtn.classList.add('ei-toolbar-extra')
  // Screenshot button with dropdown
  const screenshotGroup = el('div', 'ei-toolbar-btn-group ei-toolbar-extra')
  screenshotGroup.setAttribute(IGNORE_ATTR, 'true')
  const screenshotBtn = makeToolbarBtn(ICON_SCREENSHOT, 'Screenshot')
  const screenshotDropdownBtn = el('button', 'ei-toolbar-btn ei-toolbar-dropdown-btn')
  screenshotDropdownBtn.type = 'button'
  screenshotDropdownBtn.innerHTML = ICON_CHEVRON_DOWN
  screenshotDropdownBtn.setAttribute(IGNORE_ATTR, 'true')
  const screenshotDropdownTip = el('span', 'ei-toolbar-tip', 'Capture options')
  screenshotDropdownTip.setAttribute(IGNORE_ATTR, 'true')
  screenshotDropdownBtn.appendChild(screenshotDropdownTip)
  screenshotGroup.append(screenshotBtn, screenshotDropdownBtn)

  // Dropdown menu for capture options
  const captureMenu = el('div', 'ei-capture-menu')
  captureMenu.setAttribute(IGNORE_ATTR, 'true')
  captureMenu.style.display = 'none'

  function makeCaptureMenuItem(icon: string, label: string): HTMLButtonElement {
    const item = el('button', 'ei-capture-menu-item')
    item.type = 'button'
    item.innerHTML = `
      <span class="ei-capture-menu-icon">${icon}</span>
      <span class="ei-capture-menu-label">${label}</span>
    `
    return item
  }

  const captureEntireScreenItem = makeCaptureMenuItem(ICON_CAPTURE_SCREEN, 'Entire screen')
  const captureWindowItem = makeCaptureMenuItem(ICON_CAPTURE_WINDOW, 'Capture Window')
  const selectElementItem = makeCaptureMenuItem(ICON_SELECT_ELEMENT, 'Select element')
  const stateCaptureItem = makeCaptureMenuItem(ICON_STATE_CAPTURE, 'State Capture')

  captureMenu.append(captureEntireScreenItem, captureWindowItem, selectElementItem, stateCaptureItem)

  const toolbarDivider = el('div', 'ei-toolbar-divider ei-toolbar-extra')
  toolbarDivider.appendChild(el('div', 'ei-toolbar-divider-line'))

  const exitBtn = makeToolbarBtn(ICON_EXIT, 'Exit')
  exitBtn.classList.add('ei-toolbar-extra')

  const outlinesBtn = makeToolbarBtn(ICON_OUTLINES, 'Toggle Outlines')
  outlinesBtn.classList.add('ei-toolbar-extra')

  toolbar.append(inspectorBtn, designBtn, moveBtn, changesBtn, outlinesBtn, screenshotGroup, toolbarDivider, exitBtn)
  root.appendChild(captureMenu)

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

  root.append(styleEl, highlight, moveIndicator, tooltip, panel, markersContainer, toolbar)
  document.body.appendChild(root)

  // --- Helpers ---

  function isInteractiveMode(): boolean {
    return currentMode === 'inspector' || currentMode === 'design' || currentMode === 'move'
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
    if (children.length < 2) return 'y'
    const first = children[0].getBoundingClientRect()
    const second = children[1].getBoundingClientRect()
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
    if (newIndex !== currentIndex) {
      const draggedSize = moveDragState.axis === 'y'
        ? moveDragState.elementRect.height
        : moveDragState.elementRect.width

      siblings.forEach((sibling, idx) => {
        if (sibling === moveDragState.element) return
        sibling.style.transition = 'transform 80ms ease-out'

        let shift = 0
        if (currentIndex < newIndex) {
          // Moving forward: elements between current and new shift back
          if (idx > currentIndex && idx < newIndex) {
            shift = moveDragState.axis === 'y' ? -draggedSize : -draggedSize
          } else if (idx >= newIndex) {
            // No shift for elements after the new position
            shift = 0
          }
        } else if (currentIndex > newIndex) {
          // Moving backward: elements between new and current shift forward
          if (idx >= newIndex && idx < currentIndex) {
            shift = moveDragState.axis === 'y' ? draggedSize : draggedSize
          }
        }

        sibling.style.transform = shift !== 0 ? `translate${moveDragState.axis === 'y' ? 'Y' : 'X'}(${shift}px)` : ''
      })
    }

    updateMoveIndicator(moveDragState.container, insertion.target, insertion.placement, moveDragState.axis)
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
    const existingId = moveChangeIdByElement.get(element)
    if (existingId) {
      updateChange(existingId, comment, [])
      return
    }
    const changeId = addChange(element, comment, 'move', [])
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

  function addChange(element: HTMLElement, comment: string, type: 'annotation' | 'design' | 'move' = 'annotation', diffs?: Change['diffs']): string {
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
      const typeBadge = el('span', 'ei-ann-type', c.type === 'design' ? 'Design' : c.type === 'move' ? 'Move' : 'Note')
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
    const modeLabel = currentMode === 'inspector' ? 'Inspect' : currentMode === 'design' ? 'Design' : currentMode === 'move' ? 'Move' : ''
    subtitle.textContent = modeLabel ? `${modeLabel} mode \u2014 \u70B9\u51FB\u5143\u7D20\uFF0CEsc \u9000\u51FA` : 'Ready'
    body.innerHTML = currentMode === 'design'
      ? `<div class="ei-empty">\u70B9\u51FB\u4E00\u4E2A\u5143\u7D20\u5F00\u59CB\u7F16\u8F91\u6837\u5F0F\u3002\u4FEE\u6539\u5373\u65F6\u751F\u6548\uFF0C\u5B8C\u6210\u540E\u70B9 Done \u4FDD\u5B58\u53D8\u66F4\u3002</div>`
      : currentMode === 'move'
        ? `<div class="ei-empty">\u5148\u70B9\u51FB\u9501\u5B9A\u4E00\u4E2A\u5143\u7D20\u3002\u9501\u5B9A\u540E\u4F1A\u51FA\u73B0 Drag Bounds \u548C\u6BCF\u4E2A\u5143\u7D20\u4E2D\u95F4\u7684\u5C0F\u6A2A\u6761\uFF0C\u6309\u4F4F\u6A2A\u6761\u5373\u53EF\u5728 bounds \u5185\u8C03\u6574\u540C\u7EA7\u987A\u5E8F\u3002</div>`
        : `<div class="ei-empty">\u5F00\u542F\u540E\u5148\u70B9\u51FB\u4E00\u4E2A\u5143\u7D20\uFF0C\u518D\u663E\u793A\u4FE1\u606F\u9762\u677F\u3002\u79FB\u52A8\u9F20\u6807\u53EA\u9AD8\u4EAE\u5143\u7D20\uFF0C\u4E0D\u4F1A\u7ACB\u523B\u6253\u5F00\u4FE1\u606F\u6846\u3002\u9501\u5B9A\u540E\u53EF\u7528\u65B9\u5411\u952E\u5207\u7236/\u5B50/\u5144\u5F1F\u5143\u7D20\uFF0C\u4E5F\u53EF\u4EE5\u76F4\u63A5\u70B9 breadcrumbs \u8DF3\u5C42\u3002</div>`
    copyBtn.style.display = 'none'
    unlockBtn.style.display = lockedElement ? 'inline-block' : 'none'
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

    const isDesign = currentMode === 'design' || isCaptureSelection
    const isMove = currentMode === 'move'
    highlight.dataset.design = isDesign ? 'true' : 'false'
    highlight.dataset.move = isMove ? 'true' : 'false'
    highlight.dataset.outlines = outlinesEnabled ? 'true' : 'false'

    if (isDesign || outlinesEnabled) {
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

      // Margin badges + measurement lines (in margin layer coordinates)
      const marginSides: [string, number][] = [['top', mt], ['right', mr], ['bottom', mb], ['left', ml]]
      for (const [side, val] of marginSides) {
        const badge = hlMarginBadges[side]!
        const line = hlMarginLines[side]!
        if (val > 0) {
          badge.textContent = String(Math.round(val))
          badge.style.display = 'block'
          line.style.display = 'block'

          // Total dimensions including padding
          const fullW = w + ml + mr
          const fullH = h + mt + mb

          if (side === 'top') {
            badge.style.cssText = `display:block;left:${fullW / 2 - 10}px;top:${mt / 2 - 7}px;`
            line.style.cssText = `display:block;left:${fullW / 2}px;top:0;height:${mt}px;width:0;border-left:1px dashed #E17055;`
          } else if (side === 'bottom') {
            badge.style.cssText = `display:block;left:${fullW / 2 - 10}px;bottom:${mb / 2 - 7}px;`
            line.style.cssText = `display:block;left:${fullW / 2}px;bottom:0;height:${mb}px;width:0;border-left:1px dashed #E17055;`
          } else if (side === 'left') {
            badge.style.cssText = `display:block;left:${ml / 2 - 10}px;top:${fullH / 2 - 7}px;`
            line.style.cssText = `display:block;top:${fullH / 2}px;left:0;width:${ml}px;height:0;border-top:1px dashed #E17055;`
          } else {
            badge.style.cssText = `display:block;right:${mr / 2 - 10}px;top:${fullH / 2 - 7}px;`
            line.style.cssText = `display:block;top:${fullH / 2}px;right:0;width:${mr}px;height:0;border-top:1px dashed #E17055;`
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
        hlMarginBadges[side]!.style.display = 'none'
        hlMarginLines[side]!.style.display = 'none'
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
    let currentTextDiff: { property: string; original: string; modified: string } | null = null

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
    }

    styleTracker = createStyleTracker(info.element, saveToChanges)
    const designPanel = buildDesignPanel(info.element, info, styleTracker, accentColor, {
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
    })
    body.appendChild(designPanel)

    updateHighlight(info)
  }

  function renderMove(info: InspectorInfo | null): void {
    currentInfo = info
    annotateInput = null
    cleanupPanelExtras()

    titleEl.textContent = 'Move'
    subtitle.textContent = 'Move mode — 拖动 handle 调整顺序，Esc 退出'
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
    }
  }

  // --- Inspect logic ---

  function inspectPoint(x: number, y: number): void {
    if (!isInteractiveMode() && !outlinesEnabled) return
    if (lockedElement) return
    const element = getInspectableElementFromPoint(x, y, IGNORE_ATTR)
    if (!element) {
      hideTooltip()
      return
    }
    const info = extractInspectorInfo(element)
    currentInfo = info
    updateHighlight(info)
    if (outlinesEnabled) {
      // In outlines mode, only show highlight, no tooltip
      hideTooltip()
    } else {
      showTooltip(info, x, y)
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
      if (moveDragState?.element) {
        cancelMoveDrag()
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

  function setMode(mode: InspectorMode): void {
    if (destroyed) return
    if (currentMode === mode && mode !== 'off') return

    // Deactivate current
    switch (currentMode) {
      case 'inspector': deactivateInspector(); break
      case 'design': deactivateDesign(); break
      case 'move': deactivateMove(); break
      case 'changes': deactivateChanges(); break
    }

    currentMode = mode
    persistMode(mode)

    // Activate new
    switch (currentMode) {
      case 'inspector': activateInspector(); break
      case 'design': activateDesign(); break
      case 'move': activateMove(); break
      case 'changes': activateChanges(); break
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
      background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#00b894' : '#111113'};
      color: white;
      font-size: 13px;
      font-weight: 500;
      z-index: ${zIndex + 10};
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
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
    screenshotDropdownBtn.style.background = 'rgba(255,255,255,0.15)'
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
    showToast('Capturing entire page...', 'info')
    await performCapture('body', { scroll: true })
  }

  async function captureWindow(): Promise<void> {
    if (currentMode !== 'off') setMode('off')
    showToast('Capturing current window...', 'info')
    await performCapture('body', { scroll: false })
  }

  async function startSelectElementCapture(): Promise<void> {
    if (currentMode !== 'off') setMode('off')
    showToast('Hover to preview, click to capture', 'info')
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
        showToast(`Capturing selected element...`, 'info')
        await performCapture(selector, { scroll: false })
      }
    }

    document.addEventListener('mousemove', moveHandler, true)
    document.addEventListener('click', clickHandler, true)
  }

  async function startStateCapture(): Promise<void> {
    if (currentMode !== 'off') setMode('off')
    captureMenuMode = 'state'
    showToast('Hover to preview, click element with hover state...', 'info')

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

    showToast('All states captured! Paste in Figma', 'success')
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
        const r = await fetch('https://mcp.figma.com/mcp/html-to-design/capture.js')
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

      showToast(options.state ? `${options.state} state captured!` : 'Captured! Paste in Figma (Ctrl+V)', 'success')
      console.log('[Elens] Capture result:', result)
    } catch (error) {
      console.error('[Elens] Capture failed:', error)
      showToast('Capture failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error')
    }
  }

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (isCaptureMenuOpen && !captureMenu.contains(e.target as Node) && !screenshotDropdownBtn.contains(e.target as Node)) {
      closeCaptureMenu()
    }
  })

  // Update window resize handler to reposition menu
  window.addEventListener('resize', () => {
    if (isCaptureMenuOpen) positionCaptureMenu()
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
