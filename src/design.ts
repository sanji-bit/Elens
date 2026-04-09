import type { InspectorInfo, StyleDiff } from './types'
import { rgbToHex } from './utils'

const IGNORE_ATTR = 'data-elens-ignore'

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

// --- Style Tracker ---

export type StyleTracker = {
  apply: (property: string, value: string) => void
  reset: () => void
  getDiffs: () => StyleDiff[]
  hasChanges: () => boolean
}

export function createStyleTracker(element: HTMLElement, onChange?: () => void): StyleTracker {
  const originals = new Map<string, string>()

  return {
    apply(property: string, value: string): void {
      if (!originals.has(property)) {
        originals.set(property, window.getComputedStyle(element).getPropertyValue(property))
      }
      element.style.setProperty(property, value)
      onChange?.()
    },

    reset(): void {
      for (const [prop] of originals) {
        element.style.removeProperty(prop)
      }
      originals.clear()
    },

    getDiffs(): StyleDiff[] {
      const diffs: StyleDiff[] = []
      const computed = window.getComputedStyle(element)
      for (const [prop, original] of originals) {
        const current = computed.getPropertyValue(prop)
        if (current !== original) {
          diffs.push({ property: prop, original, modified: current })
        }
      }
      return diffs
    },

    hasChanges(): boolean {
      return this.getDiffs().length > 0
    },
  }
}

// --- Number Input ---

function parsePxValue(value: string): number {
  const num = parseFloat(value)
  return Number.isFinite(num) ? num : 0
}

function parseBorderRadius(raw: string): [string, string, string, string] {
  const parts = raw.split(/\s+/).map((token) => {
    const num = parseFloat(token)
    return Number.isFinite(num) ? String(num) : '0'
  })
  const a = parts[0] ?? '0'
  const b = parts[1] ?? a
  const c = parts[2] ?? a
  const d = parts[3] ?? b
  return [a, b, c, d]
}

type NumberInputOptions = {
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}

function createNumberInput(options: NumberInputOptions): HTMLInputElement {
  const { value, min, max, step = 1, onChange } = options

  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'ei-dp-num'
  input.value = String(Math.round(value * 100) / 100)
  input.setAttribute(IGNORE_ATTR, 'true')

  function clamp(v: number): number {
    let n = v
    if (min != null && n < min) n = min
    if (max != null && n > max) n = max
    return n
  }

  function commit(newVal: number): void {
    const clamped = clamp(Math.round(newVal * 100) / 100)
    input.value = String(clamped)
    onChange(clamped)
  }

  input.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      const num = parseFloat(input.value)
      if (Number.isFinite(num)) commit(num)
      input.blur()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const delta = e.shiftKey ? 10 : step
      const current = parseFloat(input.value) || 0
      commit(current + delta)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const delta = e.shiftKey ? 10 : step
      const current = parseFloat(input.value) || 0
      commit(current - delta)
    }
  })

  input.addEventListener('blur', () => {
    const num = parseFloat(input.value)
    if (Number.isFinite(num)) commit(num)
  })

  let dragStartY = 0
  let dragStartValue = 0

  input.addEventListener('mousedown', (e) => {
    if (document.activeElement === input) return
    e.preventDefault()
    dragStartY = e.clientY
    dragStartValue = parseFloat(input.value) || 0
    let dragged = false

    const onMove = (moveEvent: MouseEvent) => {
      const delta = dragStartY - moveEvent.clientY
      if (!dragged && Math.abs(delta) < 2) return
      dragged = true
      const multiplier = moveEvent.shiftKey ? 10 : 1
      commit(dragStartValue + delta * multiplier * step)
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (!dragged) {
        input.focus()
        input.select()
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  })

  return input
}

// --- Padding direction SVG icons (Figma |o ō o| _o style) ---

const PADDING_ICONS: Record<string, string> = {
  left: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 7.5a.5.5 0 0 0-1 0v9a.5.5 0 0 0 1 0v-9ZM13 11v2h-2v-2h2Zm0-1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h2Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  top: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 7a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9ZM11 11h2v2h-2v-2Zm-1 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  right: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M17 7.5a.5.5 0 0 0-1 0v9a.5.5 0 0 0 1 0v-9ZM13 11v2h-2v-2h2Zm0-1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h2Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  bottom: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M11 11h2v2h-2v-2Zm-1 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2ZM7.5 16a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
}

const FIELD_ICONS: Record<string, string> = {
  opacity: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 7h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM6 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8Zm9 1.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Zm-1.5 2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm-2 2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm-2 2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm2 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm2-2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm0 2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm2-4a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm0 2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm0 2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  radius: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.9 6h-.02c-.403 0-.735 0-1.006.022-.28.023-.54.072-.782.196a2 2 0 0 0-.874.874c-.124.243-.173.501-.196.782C6 8.144 6 8.477 6 8.88V9.5a.5.5 0 0 0 1 0V8.9c0-.428 0-.72.019-.944.018-.22.05-.332.09-.41a1 1 0 0 1 .437-.437c.078-.04.19-.072.41-.09C8.18 7 8.472 7 8.9 7H9.5a.5.5 0 0 0 0-1H8.9Zm6.2 0h.02c.403 0 .735 0 1.006.022.28.023.54.072.782.196a2 2 0 0 1 .874.874c.124.243.173.501.196.782.022.27.022.603.022 1.005V9.5a.5.5 0 0 1-1 0V8.9c0-.428 0-.72-.019-.944-.018-.22-.05-.332-.09-.41a1 1 0 0 0-.437-.437c-.078-.04-.19-.072-.41-.09A17 17 0 0 0 15.1 7H14.5a.5.5 0 0 1 0-1h.6Zm.02 12H14.5a.5.5 0 0 1 0-1h.6c.428 0 .72 0 .944-.019.22-.018.332-.05.41-.09a1 1 0 0 0 .437-.437c.04-.078.072-.19.09-.41.019-.225.019-.516.019-.944V14.5a.5.5 0 0 1 1 0v.62c0 .403 0 .735-.022 1.006-.023.281-.072.54-.196.782a2 2 0 0 1-.874.874c-.243.124-.5.173-.782.196-.27.022-.603.022-1.006.022M8.9 18h-.02c-.403 0-.735 0-1.006-.022-.28-.023-.541-.072-.782-.196a2 2 0 0 1-.874-.874c-.124-.243-.174-.501-.196-.782A18 18 0 0 1 6 15.12V14.5a.5.5 0 0 1 1 0v.6c0 .428 0 .82.019.944.018.22.05.332.09.41a1 1 0 0 0 .437.437c.078.04.19.072.41.09.225.019.516.019.944.019H9.5a.5.5 0 0 1 0 1H8.9Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  radiusSettings: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M 2.498505115509033 12 C 2.631113365292549 12 2.7582907006144524 11.947321958839893 2.8520588874816895 11.853553771972656 C 2.9458270743489265 11.75978558510542 2.998505115509033 11.632608249783516 2.998505115509033 11.5 L 2.998505115509033 9.949999809265137 C 3.563649356365204 9.835242375731468 4.07174214720726 9.528635561466217 4.4366936683654785 9.08212947845459 C 4.801645189523697 8.635623395442963 5.001011371612549 8.076677799224854 5.001011371612549 7.5 C 5.001011371612549 6.9233222007751465 4.801645189523697 6.364376604557037 4.4366936683654785 5.91787052154541 C 4.07174214720726 5.471364438533783 3.563649356365204 5.164757624268532 2.998505115509033 5.050000190734863 L 2.998505115509033 0.5 C 2.998505115509033 0.36739175021648407 2.9458270743489265 0.24021489173173904 2.8520588874816895 0.14644670486450195 C 2.7582907006144524 0.05267851799726486 2.631113365292549 0 2.498505115509033 0 C 2.3658968657255173 0 2.238719530403614 0.05267851799726486 2.144951343536377 0.14644670486450195 C 2.05118315666914 0.24021489173173904 1.9985051155090332 0.36739175021648407 1.9985051155090332 0.5 L 1.9985051155090332 5.050000190734863 C 1.434184968471527 5.165742203593254 0.9271209537982941 5.472745716571808 0.562993049621582 5.919136047363281 C 0.19886514544487 6.365526378154755 0 6.923932790756226 0 7.5 C -8.881784197001252e-16 8.076067209243774 0.19886514544487 8.634473621845245 0.562993049621582 9.080863952636719 C 0.9271209537982941 9.527254283428192 1.434184968471527 9.834257796406746 1.9985051155090332 9.949999809265137 L 1.9985051155090332 11.5 C 1.9985051155090332 11.632608249783516 2.05118315666914 11.75978558510542 2.144951343536377 11.853553771972656 C 2.238719530403614 11.947321958839893 2.3658968657255173 12 2.498505115509033 12 Z M 9.498504638671875 12 C 9.631112888455391 12 9.758290223777294 11.947321958839893 9.852058410644531 11.853553771972656 C 9.945826597511768 11.75978558510542 9.998504638671875 11.632608249783516 9.998504638671875 11.5 L 9.998504638671875 6.949999809265137 C 10.562824785709381 6.834257796406746 11.069889277219772 6.527254283428192 11.434017181396484 6.080863952636719 C 11.798145085573196 5.634473621845245 11.99700927734375 5.076067209243774 11.99700927734375 4.5 C 11.99700927734375 3.9239327907562256 11.798145085573196 3.3655263781547546 11.434017181396484 2.9191360473632812 C 11.069889277219772 2.472745716571808 10.562824785709381 2.165742203593254 9.998504638671875 2.0500001907348633 L 9.998504638671875 0.5 C 9.998504638671875 0.36739175021648407 9.945826597511768 0.24021489173173904 9.852058410644531 0.14644670486450195 C 9.758290223777294 0.05267851799726486 9.631112888455391 0 9.498504638671875 0 C 9.365896388888359 0 9.238719053566456 0.05267851799726486 9.144950866699219 0.14644670486450195 C 9.051182679831982 0.24021489173173904 8.998504638671875 0.36739175021648407 8.998504638671875 0.5 L 8.998504638671875 2.0500001907348633 C 8.433360397815704 2.164757624268532 7.925268083810806 2.471364438533783 7.560316562652588 2.91787052154541 C 7.1953650414943695 3.3643766045570374 6.995998859405518 3.9233222007751465 6.995998859405518 4.5 C 6.995998859405518 5.0766777992248535 7.1953650414943695 5.635623395442963 7.560316562652588 6.08212947845459 C 7.925268083810806 6.528635561466217 8.433360397815704 6.835242375731468 8.998504638671875 6.949999809265137 L 8.998504638671875 11.5 C 8.998504638671875 11.632608249783516 9.051182679831982 11.75978558510542 9.144950866699219 11.853553771972656 C 9.238719053566456 11.947321958839893 9.365896388888359 12 9.498504638671875 12 Z M 9.498504638671875 6 C 9.100679904222488 5.999999999999998 8.719149798154831 5.841964930295944 8.437845230102539 5.560660362243652 C 8.156540662050247 5.2793557941913605 7.998505115509033 4.897824734449387 7.998505115509033 4.5 C 7.998505115509033 4.102175265550613 8.156540662050247 3.7206442058086395 8.437845230102539 3.4393396377563477 C 8.719149798154831 3.158035069704056 9.100679904222488 3.0000000000000018 9.498504638671875 3 C 9.896329373121262 3.0000000000000018 10.277859479188919 3.158035069704056 10.559164047241211 3.4393396377563477 C 10.840468615293503 3.7206442058086395 10.998504638671875 4.102175265550613 10.998504638671875 4.5 C 10.998504638671875 4.897824734449387 10.840468615293503 5.2793557941913605 10.559164047241211 5.560660362243652 C 10.277859479188919 5.841964930295944 9.896329373121262 5.999999999999998 9.498504638671875 6 Z M 2.498505115509033 9 C 2.1006803810596466 8.999999999999998 1.7191493213176727 8.841964930295944 1.4378447532653809 8.560660362243652 C 1.156540185213089 8.27935579419136 0.9985051155090332 7.897824734449387 0.9985051155090332 7.5 C 0.9985051155090332 7.102175265550613 1.156540185213089 6.7206442058086395 1.4378447532653809 6.439339637756348 C 1.7191493213176727 6.158035069704056 2.1006803810596466 6.000000000000002 2.498505115509033 6 C 2.89632984995842 6.000000000000002 3.2778609097003937 6.158035069704056 3.5591654777526855 6.439339637756348 C 3.8404700458049774 6.7206442058086395 3.9985051155090314 7.102175265550613 3.998505115509033 7.5 C 3.9985051155090314 7.897824734449387 3.8404700458049774 8.27935579419136 3.5591654777526855 8.560660362243652 C 3.2778609097003937 8.841964930295944 2.89632984995842 8.999999999999998 2.498505115509033 9 Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  gap: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M15 14.75c0 .138.112.25.25.25h.25a.5.5 0 0 1 0 1h-.25A1.25 1.25 0 0 1 14 14.75v-6.5C14 7.56 14.56 7 15.25 7h.25a.5.5 0 0 1 0 1h-.25a.25.25 0 0 0-.25.25v6.5ZM7 15.5a.5.5 0 0 1 .5-.5h.25a.25.25 0 0 0 .25-.25v-6.5A.25.25 0 0 0 7.75 8H7.5a.5.5 0 0 1 0-1h.25C8.44 7 9 7.56 9 8.25v6.5C9 15.44 8.44 16 7.75 16H7.5a.5.5 0 0 1-.5-.5Zm4-2a.5.5 0 0 0 1 0v-4a.5.5 0 0 0-1 0v4Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  strokeWeight: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 8.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Zm0 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Zm0 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  lineHeight: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 4h14M5 8h14M5 12h14M5 16h14M5 20h14" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-opacity="0.7"/></svg>`,
}

const CORNER_ICONS: Record<string, string> = {
  TL: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 12V6A2 2 0 0 1 6 4H12" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  TR: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 12V6A2 2 0 0 0 10 4H4" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  BR: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4V10A2 2 0 0 1 10 12H4" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  BL: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4V10A2 2 0 0 0 6 12H12" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
}

// --- Direction SVG icons (24×24 from Figma design) ---
const DIRECTION_ICONS: Record<string, string> = {
  row: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15.147 13.147C15.2408 13.0533 15.368 13.0006 15.5005 13.0006C15.6331 13.0006 15.7603 13.0533 15.854 13.147L17.854 15.147C17.9478 15.2408 18.0004 15.3679 18.0004 15.5005C18.0004 15.6331 17.9478 15.7602 17.854 15.854L15.854 17.854C15.7597 17.9451 15.6334 17.9955 15.5023 17.9943C15.3712 17.9932 15.2458 17.9406 15.1531 17.8479C15.0604 17.7552 15.0078 17.6298 15.0067 17.4987C15.0056 17.3676 15.056 17.2413 15.147 17.147L16.293 16H6.50004L6.39904 15.99C6.28601 15.967 6.18439 15.9057 6.1114 15.8164C6.03841 15.7271 5.99854 15.6153 5.99854 15.5C5.99854 15.3847 6.03841 15.2729 6.1114 15.1836C6.18439 15.0943 6.28601 15.033 6.39904 15.01L6.50004 15H16.293L15.147 13.854C15.0533 13.7602 15.0006 13.6331 15.0006 13.5005C15.0006 13.3679 15.0533 13.2408 15.147 13.147ZM9.654 6.007C10.0234 6.04512 10.3655 6.21889 10.6141 6.49468C10.8628 6.77047 11.0003 7.12868 11 7.5V9.5L10.993 9.653C10.958 9.99645 10.8056 10.3173 10.5614 10.5614C10.3173 10.8055 9.99648 10.958 9.653 10.993L9.5 11H7.5L7.347 10.992C7.00392 10.9568 6.68343 10.8044 6.43954 10.5605C6.19564 10.3166 6.04325 9.99611 6.008 9.653L6 9.5V7.5C6.00008 7.1287 6.13784 6.7706 6.38665 6.495C6.63547 6.2194 6.97767 6.04587 7.347 6.008L7.5 6H9.5L9.654 6.007ZM16.654 6.007C17.0234 6.04512 17.3655 6.21889 17.6141 6.49468C17.8628 6.77047 18.0003 7.12868 18 7.5V9.5L17.993 9.653C17.958 9.99645 17.8056 10.3173 17.5614 10.5614C17.3173 10.8055 16.9965 10.958 16.653 10.993L16.5 11H14.5L14.347 10.992C14.0039 10.9568 13.6834 10.8044 13.4395 10.5605C13.1956 10.3166 13.0433 9.99611 13.008 9.653L13 9.5V7.5C13.0001 7.1287 13.1378 6.7706 13.3867 6.495C13.6355 6.2194 13.9777 6.04587 14.347 6.008L14.5 6H16.5L16.654 6.007ZM14.5 7C14.3674 7 14.2403 7.05268 14.1465 7.14645C14.0527 7.24021 14 7.36739 14 7.5V9.5C14 9.63261 14.0527 9.75979 14.1465 9.85355C14.2403 9.94732 14.3674 10 14.5 10H16.5C16.6326 10 16.7598 9.94732 16.8536 9.85355C16.9474 9.75979 17 9.63261 17 9.5V7.5C17 7.36739 16.9474 7.24021 16.8536 7.14645C16.7598 7.05268 16.6326 7 16.5 7H14.5ZM7.5 7C7.36743 7 7.24025 7.05268 7.14648 7.14645C7.05271 7.24021 7 7.36739 7 7.5V9.5C7 9.63261 7.05271 9.75979 7.14648 9.85355C7.24025 9.94732 7.36743 10 7.5 10H9.5C9.63264 10 9.75982 9.94732 9.85359 9.85355C9.94736 9.75979 10 9.63261 10 9.5V7.5C10 7.36739 9.94736 7.24021 9.85359 7.14645C9.75982 7.05268 9.63264 7 9.5 7H7.5Z" fill="currentColor"/></svg>`,
  column: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9.654 13.008C10.0232 13.0461 10.3651 13.2197 10.6138 13.4953C10.8624 13.7709 11 14.1289 11 14.5V16.5L10.992 16.653C10.957 16.9961 10.8049 17.3167 10.5612 17.5608C10.3175 17.8049 9.99709 17.9575 9.654 17.993L9.5 18H7.5L7.347 17.992C7.00389 17.9568 6.68339 17.8044 6.4395 17.5605C6.19561 17.3166 6.04322 16.9961 6.008 16.653L6 16.5V14.5C6.00004 14.1287 6.1378 13.7706 6.38662 13.495C6.63544 13.2194 6.97763 13.0459 7.347 13.008L7.5 13H9.5L9.654 13.008ZM15.5 6C15.6153 5.99998 15.727 6.03978 15.8163 6.11267C15.9056 6.18556 15.9669 6.28706 15.99 6.4L16 6.5V16.294L17.146 15.148C17.2413 15.0623 17.3659 15.0163 17.4941 15.0197C17.6223 15.023 17.7443 15.0754 17.835 15.166C17.9257 15.2566 17.9783 15.3786 17.9818 15.5067C17.9853 15.6349 17.9396 15.7595 17.854 15.855L15.854 17.855C15.7602 17.9487 15.6331 18.0014 15.5005 18.0014C15.3679 18.0014 15.2408 17.9487 15.147 17.855L13.147 15.855C13.0559 15.7607 13.0055 15.6344 13.0067 15.5033C13.0078 15.3722 13.0604 15.2468 13.1531 15.1541C13.2458 15.0614 13.3712 15.0088 13.5023 15.0077C13.6334 15.0065 13.7597 15.0569 13.854 15.148L15 16.294V6.5L15.01 6.4C15.0331 6.28706 15.0944 6.18556 15.1837 6.11267C15.273 6.03978 15.3847 5.99998 15.5 6ZM7.5 14C7.36739 14 7.24021 14.0527 7.14645 14.1464C7.05268 14.2402 7 14.3674 7 14.5V16.5C7 16.6326 7.05268 16.7598 7.14645 16.8536C7.24021 16.9473 7.36739 17 7.5 17H9.5C9.63261 17 9.75979 16.9473 9.85355 16.8536C9.94732 16.7598 10 16.6326 10 16.5V14.5C10 14.3674 9.94732 14.2402 9.85355 14.1464C9.75979 14.0527 9.63261 14 9.5 14H7.5ZM9.654 6.008C10.0232 6.0461 10.3651 6.21973 10.6138 6.49531C10.8624 6.77089 11 7.12885 11 7.5V9.5L10.992 9.653C10.957 9.99614 10.8049 10.3167 10.5612 10.5608C10.3175 10.8049 9.99709 10.9575 9.654 10.993L9.5 11H7.5L7.347 10.992C7.00389 10.9568 6.68339 10.8044 6.4395 10.5605C6.19561 10.3166 6.04322 9.99611 6.008 9.653L6 9.5V7.5C6.00004 7.1287 6.1378 6.7706 6.38662 6.495C6.63544 6.2194 6.97763 6.04587 7.347 6.008L7.5 6H9.5L9.654 6.008ZM7.5 7C7.36739 7 7.24021 7.05268 7.14645 7.14645C7.05268 7.24021 7 7.36739 7 7.5V9.5C7 9.63261 7.05268 9.75979 7.14645 9.85355C7.24021 9.94732 7.36739 10 7.5 10H9.5C9.63261 10 9.75979 9.94732 9.85355 9.85355C9.94732 9.75979 10 9.63261 10 9.5V7.5C10 7.36739 9.94732 7.24021 9.85355 7.14645C9.75979 7.05268 9.63261 7 9.5 7H7.5Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
}

// --- Sizing mode dropdown icons (24×24 from Figma) ---
const SIZE_ICONS: Record<string, string> = {
  fixed: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.5 8.5C16.6326 8.5 16.7598 8.55268 16.8536 8.64645C16.9473 8.74021 17 8.86739 17 9V14C17 14.1326 16.9473 14.2598 16.8536 14.3536C16.7598 14.4473 16.6326 14.5 16.5 14.5C16.3674 14.5 16.2402 14.4473 16.1464 14.3536C16.0527 14.2598 16 14.1326 16 14V12H7V14C7 14.1326 6.94732 14.2598 6.85355 14.3536C6.75979 14.4473 6.63261 14.5 6.5 14.5C6.36739 14.5 6.24021 14.4473 6.14645 14.3536C6.05268 14.2598 6 14.1326 6 14V9C6 8.86739 6.05268 8.74021 6.14645 8.64645C6.24021 8.55268 6.36739 8.5 6.5 8.5C6.63261 8.5 6.75979 8.55268 6.85355 8.64645C6.94732 8.74021 7 8.86739 7 9V11H16V9C16 8.86739 16.0527 8.74021 16.1464 8.64645C16.2402 8.55268 16.3674 8.5 16.5 8.5Z" fill="currentColor"/></svg>`,
  hug: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.14592 8.14604C7.19236 8.09948 7.24754 8.06253 7.30828 8.03733C7.36903 8.01212 7.43415 7.99915 7.49992 7.99915C7.56568 7.99915 7.63081 8.01212 7.69155 8.03733C7.7523 8.06253 7.80747 8.09948 7.85392 8.14604L10.8539 11.146C10.9477 11.2398 11.0003 11.367 11.0003 11.4995C11.0003 11.6321 10.9477 11.7593 10.8539 11.853L7.85392 14.853C7.80749 14.8995 7.75237 14.9364 7.69169 14.9616C7.63101 14.9868 7.56597 14.9998 7.50027 14.9998C7.43457 14.9999 7.36951 14.987 7.3088 14.9619C7.24808 14.9368 7.19291 14.9 7.14642 14.8535C7.09993 14.8071 7.06304 14.752 7.03786 14.6913C7.01267 14.6306 6.99969 14.5656 6.99964 14.4999C6.99959 14.4342 7.01249 14.3691 7.03759 14.3084C7.06268 14.2477 7.09949 14.1925 7.14592 14.146L9.79292 11.5L7.14592 8.85404C7.09935 8.80759 7.06241 8.75242 7.0372 8.69167C7.012 8.63093 6.99902 8.56581 6.99902 8.50004C6.99902 8.43427 7.012 8.36915 7.0372 8.30841C7.06241 8.24766 7.09935 8.19248 7.14592 8.14604ZM16.8539 8.14604C16.9005 8.19248 16.9374 8.24766 16.9626 8.30841C16.9878 8.36915 17.0008 8.43427 17.0008 8.50004C17.0008 8.56581 16.9878 8.63093 16.9626 8.69167C16.9374 8.75242 16.9005 8.80759 16.8539 8.85404L14.2069 11.5L16.8539 14.146C16.9477 14.2399 17.0003 14.3672 17.0002 14.4999C17.0001 14.6326 16.9473 14.7598 16.8534 14.8535C16.8069 14.9 16.7518 14.9368 16.691 14.9619C16.6303 14.987 16.5653 14.9999 16.4996 14.9998C16.3669 14.9997 16.2397 14.9469 16.1459 14.853L13.1459 11.853C13.0522 11.7593 12.9995 11.6321 12.9995 11.4995C12.9995 11.367 13.0522 11.2398 13.1459 11.146L16.1459 8.14604C16.1924 8.09948 16.2475 8.06253 16.3083 8.03733C16.369 8.01212 16.4341 7.99915 16.4999 7.99915C16.5657 7.99915 16.6308 8.01212 16.6916 8.03733C16.7523 8.06253 16.8075 8.09948 16.8539 8.14604Z" fill="currentColor"/></svg>`,
  fill: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.35392 8.14598C9.40048 8.19242 9.43742 8.2476 9.46263 8.30834C9.48784 8.36909 9.50081 8.43421 9.50081 8.49998C9.50081 8.56575 9.48784 8.63087 9.46263 8.69161C9.43742 8.75236 9.40048 8.80753 9.35392 8.85398L7.20692 11H16.7929L14.6469 8.85398C14.553 8.76022 14.5002 8.63301 14.5001 8.50033C14.5 8.36765 14.5527 8.24036 14.6464 8.14648C14.7402 8.05259 14.8674 7.99979 15.0001 7.9997C15.1327 7.99961 15.26 8.05222 15.3539 8.14598L18.3539 11.146C18.4477 11.2397 18.5003 11.3669 18.5003 11.4995C18.5003 11.6321 18.4477 11.7592 18.3539 11.853L15.3539 14.853C15.2602 14.9469 15.133 14.9997 15.0003 14.9998C14.8676 14.9998 14.7403 14.9472 14.6464 14.8535C14.5525 14.7597 14.4997 14.6325 14.4996 14.4998C14.4995 14.3671 14.5522 14.2399 14.6459 14.146L16.7929 12H7.20692L9.35392 14.146C9.4478 14.2399 9.50055 14.3672 9.50055 14.5C9.50055 14.6328 9.4478 14.7601 9.35392 14.854C9.26003 14.9479 9.13269 15.0006 8.99992 15.0006C8.86714 15.0006 8.7398 14.9479 8.64592 14.854L5.64592 11.854C5.59935 11.8075 5.56241 11.7524 5.5372 11.6916C5.512 11.6309 5.49902 11.5657 5.49902 11.5C5.49902 11.4342 5.512 11.3691 5.5372 11.3083C5.56241 11.2476 5.59935 11.1924 5.64592 11.146L8.64592 8.14598C8.69236 8.09941 8.74754 8.06247 8.80828 8.03727C8.86903 8.01206 8.93415 7.99908 8.99992 7.99908C9.06568 7.99908 9.13081 8.01206 9.19155 8.03727C9.2523 8.06247 9.30747 8.09941 9.35392 8.14598Z" fill="currentColor"/></svg>`,
  checkmark: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.5841 3.723C11.6594 3.6169 11.773 3.54429 11.9009 3.52058C12.0288 3.49688 12.1609 3.52394 12.2691 3.59603C12.3774 3.66812 12.4533 3.77956 12.4808 3.9067C12.5082 4.03384 12.485 4.16667 12.4161 4.277L7.41614 11.777C7.37495 11.8384 7.3207 11.8899 7.25728 11.9279C7.19386 11.9659 7.12283 11.9894 7.04927 11.9968C6.97571 12.0041 6.90143 11.9951 6.83174 11.9705C6.76206 11.9458 6.69868 11.906 6.64614 11.854L3.64614 8.854C3.55226 8.76012 3.49951 8.63278 3.49951 8.5C3.49951 8.36723 3.55226 8.23989 3.64614 8.146C3.74003 8.05212 3.86737 7.99937 4.00014 7.99937C4.13292 7.99937 4.26026 8.05212 4.35414 8.146L6.92214 10.715L11.5841 3.723Z" fill="white"/></svg>`,
}

type SizingMode = 'fixed' | 'hug' | 'fill'

const SIZING_LABELS: Record<SizingMode, string> = {
  fixed: 'Fixed',
  hug: 'Hug',
  fill: 'Fill',
}

const SIZING_FULL_LABELS: Record<string, Record<SizingMode, string>> = {
  width: { fixed: 'Fixed width', hug: 'Hug contents', fill: 'Fill container' },
  height: { fixed: 'Fixed height', hug: 'Hug contents', fill: 'Fill container' },
}

function detectSizingMode(element: HTMLElement, dimension: 'width' | 'height'): SizingMode {
  const style = window.getComputedStyle(element)
  const inlineVal = element.style.getPropertyValue(dimension)
  if (inlineVal === 'fit-content' || inlineVal === 'auto') return 'hug'
  if (inlineVal === '100%') return 'fill'
  if (inlineVal && inlineVal !== 'auto') return 'fixed'
  // Check computed: if parent is flex/grid and element stretches
  const parentDisplay = element.parentElement ? window.getComputedStyle(element.parentElement).display : ''
  const isParentLayout = parentDisplay.includes('flex') || parentDisplay.includes('grid')
  if (isParentLayout) {
    const val = style.getPropertyValue(dimension)
    // If no explicit size set, check if it's stretching or hugging
    if (!element.style.getPropertyValue(dimension)) return 'fixed'
  }
  return 'fixed'
}

function canFillContainer(element: HTMLElement): boolean {
  if (!element.parentElement) return false
  const parentDisplay = window.getComputedStyle(element.parentElement).display
  return parentDisplay.includes('flex') || parentDisplay.includes('grid')
}

const GAP_DROPDOWN_ICON = `<svg width="23" height="24" viewBox="0 0 23 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.24404 11.1816C9.28855 11.137 9.34143 11.1016 9.39965 11.0774C9.45786 11.0533 9.52027 11.0408 9.58329 11.0408C9.64632 11.0408 9.70873 11.0533 9.76694 11.0774C9.82516 11.1016 9.87803 11.137 9.92254 11.1816L11.5 12.76L13.0774 11.1816C13.1219 11.1371 13.1748 11.1017 13.233 11.0776C13.2912 11.0535 13.3536 11.0411 13.4166 11.0411C13.4796 11.0411 13.542 11.0535 13.6002 11.0776C13.6584 11.1017 13.7113 11.1371 13.7559 11.1816C13.8004 11.2262 13.8358 11.279 13.8599 11.3373C13.884 11.3955 13.8964 11.4579 13.8964 11.5209C13.8964 11.5839 13.884 11.6462 13.8599 11.7045C13.8358 11.7627 13.8004 11.8156 13.7559 11.8601L11.8392 13.7768C11.7947 13.8214 11.7418 13.8568 11.6836 13.881C11.6254 13.9051 11.563 13.9175 11.5 13.9175C11.4369 13.9175 11.3745 13.9051 11.3163 13.881C11.2581 13.8568 11.2052 13.8214 11.1607 13.7768L9.24404 11.8601C9.19942 11.8156 9.16402 11.7627 9.13986 11.7045C9.11571 11.6463 9.10327 11.5839 9.10327 11.5209C9.10327 11.4578 9.11571 11.3954 9.13986 11.3372C9.16402 11.279 9.19942 11.2261 9.24404 11.1816Z" fill="currentColor"/></svg>`

type GapFieldOptions = {
  value: number
  tracker: StyleTracker
  accentColor: string
  onChange: () => void
}

function createGapField(options: GapFieldOptions): HTMLDivElement {
  const { value, tracker, accentColor, onChange } = options
  const isAuto = value === 0 && !document.querySelector('[style*="gap"]') // fallback heuristic

  const wrap = el('div', 'ei-dp-gap-field')
  const iconEl = el('div', 'ei-dp-field-icon')
  iconEl.innerHTML = FIELD_ICONS.gap ?? ''

  let autoMode = false

  const input = createNumberInput({
    value,
    min: 0,
    onChange: (v) => {
      autoMode = false
      tracker.apply('gap', `${v}px`)
      trigger.dataset.auto = 'false'
      onChange()
    },
  })
  input.className = 'ei-dp-field-input'

  const trigger = el('div', 'ei-dp-gap-trigger')
  trigger.setAttribute(IGNORE_ATTR, 'true')
  trigger.innerHTML = GAP_DROPDOWN_ICON
  trigger.dataset.auto = 'false'

  let dropdownOpen = false

  trigger.addEventListener('click', (e) => {
    e.stopPropagation()
    if (dropdownOpen) {
      closeGapDropdown()
      return
    }
    openGapDropdown(trigger, autoMode, (mode) => {
      if (mode === 'auto') {
        autoMode = true
        tracker.apply('gap', 'normal')
        input.value = 'Auto'
        input.style.color = 'rgba(255,255,255,0.45)'
        trigger.dataset.auto = 'true'
      } else {
        autoMode = false
        const v = parseFloat(input.value) || 0
        tracker.apply('gap', `${v}px`)
        input.value = String(v)
        input.style.color = ''
        trigger.dataset.auto = 'false'
      }
      onChange()
    }, accentColor)
  })

  wrap.append(iconEl, input, trigger)
  wrap.addEventListener('click', () => { if (!autoMode) input.focus() })
  return wrap
}

let activeGapDropdown: HTMLDivElement | null = null

function closeGapDropdown(): void {
  if (activeGapDropdown) {
    activeGapDropdown.remove()
    activeGapDropdown = null
  }
  document.removeEventListener('mousedown', handleGapDropdownOutside, true)
}

function handleGapDropdownOutside(e: MouseEvent): void {
  if (activeGapDropdown && e.target instanceof Element && !activeGapDropdown.contains(e.target)) {
    closeGapDropdown()
  }
}

function openGapDropdown(
  anchor: HTMLElement,
  isAuto: boolean,
  onSelect: (mode: 'fixed' | 'auto') => void,
  accentColor: string,
): void {
  closeGapDropdown()

  const dropdown = el('div', 'ei-dp-size-dropdown')
  dropdown.setAttribute(IGNORE_ATTR, 'true')

  for (const mode of ['fixed', 'auto'] as const) {
    const item = el('div', 'ei-dp-size-option')
    item.setAttribute(IGNORE_ATTR, 'true')

    const check = el('span', 'ei-dp-size-check')
    const active = mode === 'auto' ? isAuto : !isAuto
    if (active) {
      check.innerHTML = SIZE_ICONS.checkmark ?? ''
      check.style.color = accentColor
    }

    const iconWrap = el('span', 'ei-dp-size-option-icon')
    iconWrap.innerHTML = mode === 'fixed' ? (SIZE_ICONS.fixed ?? '') : (SIZE_ICONS.hug ?? '')

    const label = el('span', 'ei-dp-size-option-label', mode === 'fixed' ? 'Fixed' : 'Auto')

    item.append(check, iconWrap, label)
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      onSelect(mode)
      closeGapDropdown()
    })
    dropdown.appendChild(item)
  }

  const panel = anchor.closest('.ei-panel')
  if (panel) {
    panel.appendChild(dropdown)
    const anchorRect = anchor.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    dropdown.style.left = `${anchorRect.left - panelRect.left}px`
    dropdown.style.top = `${anchorRect.bottom - panelRect.top + 4}px`
  }

  activeGapDropdown = dropdown
  requestAnimationFrame(() => {
    document.addEventListener('mousedown', handleGapDropdownOutside, true)
  })
}

// --- Alignment grid icons ---
const ALIGN_DOT = `<svg width="2" height="2" viewBox="0 0 2 2"><rect width="2" height="2" rx="1" fill="currentColor"/></svg>`

// Gap icon for distribute mode (stacked lines)
const GAP_ICON_DISTRIBUTE = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 8.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Zm-1 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm1 3a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Z" fill="currentColor" fill-opacity="0.7"/></svg>`

/**
 * Generate per-cell 16×16 SVG for alignment grid.
 * row: 0=flex-start, 1=center, 2=flex-end (align-items axis)
 * col: 0=first, 1=second, 2=third (justify-content axis)
 * isRow: flex-direction === 'row'
 * isAuto: gap is auto (distributed mode)
 */
function generateCellSvg(row: number, col: number, isRow: boolean, isAuto: boolean): string {
  // Bar thickness 1.5px, rounded-999px → rx=0.75
  // 3-bar group uses gap=2, container 10px, centered in 16x16 cell
  const rects: string[] = []
  const r = (x: number, y: number, w: number, h: number) =>
    rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.75" fill="currentColor"/>`)

  // Container: 10px zone centered in 16px → offset 3
  const cOff = 3
  const cSize = 10
  const bw = 1.5 // bar thickness

  if (isRow) {
    // === Horizontal flex ===
    // row = alignIdx (cross axis = vertical): 0=top, 1=center, 2=bottom
    // col = justifyIdx (main axis)
    const barHeights = [7, 10, 5]

    if (isAuto) {
      // 1 vertical bar, centered horizontally
      const barH = col === 1 ? 5 : 10
      const x = (16 - bw) / 2
      const y = row === 0 ? cOff : row === 1 ? cOff + (cSize - barH) / 2 : cOff + cSize - barH
      r(x, y, bw, barH)
    } else {
      // 3 vertical bars packed center with gap=2
      // Total width = 1.5*3 + 2*2 = 8.5, centered: startX = (16-8.5)/2 = 3.75
      const xPositions = [3.75, 7.25, 10.75]
      for (let i = 0; i < 3; i++) {
        const h = barHeights[i]!
        const x = xPositions[i]!
        const y = row === 0 ? cOff : row === 1 ? cOff + (cSize - h) / 2 : cOff + cSize - h
        r(x, y, bw, h)
      }
    }
  } else {
    // === Vertical flex ===
    // col = alignIdx (cross axis = horizontal): 0=left, 1=center, 2=right
    // row = justifyIdx (main axis)
    const barWidths = [7, 10, 5]

    if (isAuto) {
      // 1 horizontal bar, centered vertically
      const barW = row === 1 ? 5 : 10
      const y = (16 - bw) / 2
      const x = col === 0 ? cOff : col === 1 ? cOff + (cSize - barW) / 2 : cOff + cSize - barW
      r(x, y, barW, bw)
    } else {
      // 3 horizontal bars packed center with gap=2
      // Total height = 1.5*3 + 2*2 = 8.5, centered: startY = 3.75
      const yPositions = [3.75, 7.25, 10.75]
      for (let i = 0; i < 3; i++) {
        const w = barWidths[i]!
        const y = yPositions[i]!
        const x = col === 0 ? cOff : col === 1 ? cOff + (cSize - w) / 2 : cOff + cSize - w
        r(x, y, w, bw)
      }
    }
  }

  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">${rects.join('')}</svg>`
}

// --- Labeled field (input with embedded icon label) ---

type LabeledFieldOptions = {
  icon: string
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  iconHtml?: string
  onChange: (value: number) => void
}

function createLabeledField(options: LabeledFieldOptions): HTMLDivElement {
  const { icon, suffix, iconHtml, ...numOpts } = options
  const wrap = el('div', 'ei-dp-field')
  const iconEl = el('div', 'ei-dp-field-icon')
  if (iconHtml) {
    iconEl.innerHTML = iconHtml
  } else {
    iconEl.textContent = icon
  }
  const input = createNumberInput(numOpts)
  input.className = 'ei-dp-field-input'
  wrap.append(iconEl, input)
  if (suffix) {
    wrap.appendChild(el('div', 'ei-dp-field-suffix', suffix))
  }
  wrap.addEventListener('click', () => input.focus())
  return wrap
}

// --- Radius field with settings button ---
type RadiusFieldOptions = LabeledFieldOptions & {
  onOpenSettings: (anchor: HTMLElement) => void
}

function createRadiusField(options: RadiusFieldOptions): HTMLDivElement {
  const { icon, suffix, iconHtml, onOpenSettings, ...numOpts } = options
  const wrap = el('div', 'ei-dp-field ei-dp-field-radius')
  const iconEl = el('div', 'ei-dp-field-icon')
  if (iconHtml) {
    iconEl.innerHTML = iconHtml
  } else {
    iconEl.textContent = icon
  }

  const input = createNumberInput(numOpts)
  input.className = 'ei-dp-field-input'

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ei-dp-field-action'
  button.setAttribute(IGNORE_ATTR, 'true')
  button.title = 'Edit corner radii'
  button.innerHTML = FIELD_ICONS.radiusSettings || ''
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    onOpenSettings(button)
  })

  wrap.append(iconEl, input, button)
  if (suffix) {
    wrap.appendChild(el('div', 'ei-dp-field-suffix', suffix))
  }
  wrap.addEventListener('click', () => input.focus())
  return wrap
}

function formatBorderRadiusCss(tl: string, tr: string, br: string, bl: string): string {
  const px = (value: string) => `${Number(value) || 0}px`
  const a = px(tl)
  const b = px(tr)
  const c = px(br)
  const d = px(bl)
  if (a === b && a === c && a === d) return a
  if (a === c && b === d) return `${a} ${b}`
  if (b === d) return `${a} ${b} ${c}`
  return `${a} ${b} ${c} ${d}`
}

function openRadiusDropdown(
  anchor: HTMLButtonElement,
  getRadius: () => string,
  onChange: (value: string) => void,
  updateInput: (displayValue: string) => void,
): void {
  // Toggle: if already open with same button, close it
  if (activeDropdown && activeRadiusButton === anchor) {
    closeSizingDropdown()
    return
  }

  closeSizingDropdown()

  anchor.setAttribute('data-active', 'true')
  activeRadiusButton = anchor

  const [rTL, rTR, rBR, rBL] = parseBorderRadius(getRadius())
  const values: [string, string, string, string] = [rTL, rTR, rBR, rBL]

  const row = el('div', 'ei-dp-grid')
  row.setAttribute(IGNORE_ATTR, 'true')

  const fields: Array<[string, number]> = [
    ['TL', 0],
    ['TR', 1],
    ['BL', 3],
    ['BR', 2],
  ]

  for (const [labelText, index] of fields) {
    const field = createLabeledField({
      icon: '',
      iconHtml: CORNER_ICONS[labelText],
      value: Number(values[index]),
      min: 0,
      onChange: (value) => {
        values[index] = String(value)
        const cssValue = formatBorderRadiusCss(values[0], values[1], values[2], values[3])
        onChange(cssValue)
        // Update input display
        const uniqueValues = [...new Set(values.map(v => Number(v)))]
        updateInput(uniqueValues.length === 1 ? String(uniqueValues[0]) : uniqueValues.join(', '))
      },
    })
    row.appendChild(field)
  }

  const currentRow = anchor.closest('.ei-dp-grid')
  if (currentRow && currentRow.parentElement) {
    currentRow.parentElement.insertBefore(row, currentRow.nextSibling)
  } else {
    document.body.appendChild(row)
  }

  activeDropdown = row
}

// --- Size Field (number + sizing mode dropdown) ---

type SizeFieldOptions = {
  icon: string
  dimension: 'width' | 'height'
  value: number
  element: HTMLElement
  tracker: StyleTracker
  accentColor: string
  onChange: () => void
}

function createSizeField(options: SizeFieldOptions): HTMLDivElement {
  const { icon, dimension, value, element, tracker, accentColor, onChange } = options

  const wrap = el('div', 'ei-dp-size-field')
  const iconEl = el('div', 'ei-dp-field-icon')
  iconEl.textContent = icon

  const input = createNumberInput({
    value,
    min: 0,
    onChange: (v) => {
      tracker.apply(dimension, `${v}px`)
      modeLabel.textContent = SIZING_LABELS.fixed
      currentMode = 'fixed'
      onChange()
    },
  })
  input.className = 'ei-dp-field-input'

  let currentMode = detectSizingMode(element, dimension)
  const modeLabel = el('span', 'ei-dp-size-mode', SIZING_LABELS[currentMode])
  modeLabel.setAttribute(IGNORE_ATTR, 'true')

  const trigger = el('div', 'ei-dp-size-trigger')
  trigger.setAttribute(IGNORE_ATTR, 'true')
  trigger.appendChild(modeLabel)
  trigger.addEventListener('click', (e) => {
    e.stopPropagation()
    openSizingDropdown(trigger, currentMode, dimension, element, (mode) => {
      currentMode = mode
      modeLabel.textContent = SIZING_LABELS[mode]
      if (mode === 'fixed') {
        const rect = element.getBoundingClientRect()
        const px = Math.round(dimension === 'width' ? rect.width : rect.height)
        tracker.apply(dimension, `${px}px`)
        input.value = String(px)
      } else if (mode === 'hug') {
        tracker.apply(dimension, 'fit-content')
        // Update input to reflect new computed size
        requestAnimationFrame(() => {
          const rect = element.getBoundingClientRect()
          input.value = String(Math.round(dimension === 'width' ? rect.width : rect.height))
        })
      } else if (mode === 'fill') {
        tracker.apply(dimension, '100%')
        requestAnimationFrame(() => {
          const rect = element.getBoundingClientRect()
          input.value = String(Math.round(dimension === 'width' ? rect.width : rect.height))
        })
      }
      onChange()
    }, accentColor)
  })

  wrap.append(iconEl, input, trigger)
  wrap.addEventListener('click', () => input.focus())
  return wrap
}

let activeDropdown: HTMLDivElement | null = null
let activeRadiusButton: HTMLButtonElement | null = null

function closeSizingDropdown(): void {
  if (activeDropdown) {
    activeDropdown.remove()
    activeDropdown = null
  }
  if (activeRadiusButton) {
    activeRadiusButton.removeAttribute('data-active')
    activeRadiusButton = null
  }
  document.removeEventListener('mousedown', handleDropdownOutsideClick, true)
}

function handleDropdownOutsideClick(e: MouseEvent): void {
  if (activeDropdown && e.target instanceof Element && !activeDropdown.contains(e.target)) {
    closeSizingDropdown()
  }
}

function openSizingDropdown(
  anchor: HTMLElement,
  currentMode: SizingMode,
  dimension: 'width' | 'height',
  element: HTMLElement,
  onSelect: (mode: SizingMode) => void,
  accentColor: string,
): void {
  closeSizingDropdown()

  const dropdown = el('div', 'ei-dp-size-dropdown')
  dropdown.setAttribute(IGNORE_ATTR, 'true')

  const showFill = canFillContainer(element)
  const modes: SizingMode[] = showFill ? ['fixed', 'hug', 'fill'] : ['fixed', 'hug']
  const labels = SIZING_FULL_LABELS[dimension]

  for (const mode of modes) {
    const item = el('div', 'ei-dp-size-option')
    item.setAttribute(IGNORE_ATTR, 'true')

    const check = el('span', 'ei-dp-size-check')
    if (mode === currentMode) {
      check.innerHTML = SIZE_ICONS.checkmark ?? ''
      check.style.color = accentColor
    }

    const iconWrap = el('span', 'ei-dp-size-option-icon')
    iconWrap.innerHTML = SIZE_ICONS[mode] ?? ''

    const label = el('span', 'ei-dp-size-option-label', labels?.[mode] ?? mode)

    item.append(check, iconWrap, label)
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      onSelect(mode)
      closeSizingDropdown()
    })
    dropdown.appendChild(item)
  }

  // Position dropdown below the anchor
  const panel = anchor.closest('.ei-panel')
  if (panel) {
    panel.appendChild(dropdown)
    const anchorRect = anchor.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    dropdown.style.left = `${anchorRect.left - panelRect.left}px`
    dropdown.style.top = `${anchorRect.bottom - panelRect.top + 4}px`
  } else {
    document.body.appendChild(dropdown)
    const anchorRect = anchor.getBoundingClientRect()
    dropdown.style.left = `${anchorRect.left}px`
    dropdown.style.top = `${anchorRect.bottom + 4}px`
  }

  activeDropdown = dropdown
  requestAnimationFrame(() => {
    document.addEventListener('mousedown', handleDropdownOutsideClick, true)
  })
}

// --- Color Fill Row (swatch + hex + opacity) ---

type FillRowOptions = {
  value: string
  opacity?: number
  onChange: (value: string) => void
  onOpacityChange?: (opacity: number, currentHex: string) => void
}

function createFillRow(options: FillRowOptions): HTMLDivElement {
  const { value, opacity = 100, onChange, onOpacityChange } = options
  const isGradient = value.includes('gradient(')

  const wrap = el('div', 'ei-dp-fill-row')

  // Track current color for opacity changes
  let currentHex = rgbToHex(value)

  const swatch = el('div', 'ei-dp-swatch')
  if (isGradient) {
    swatch.style.background = value
  } else {
    swatch.style.backgroundColor = value
  }

  const picker = document.createElement('input')
  picker.type = 'color'
  picker.className = 'ei-dp-picker'
  picker.setAttribute(IGNORE_ATTR, 'true')

  const hexInput = document.createElement('input')
  hexInput.type = 'text'
  hexInput.className = 'ei-dp-hex'
  hexInput.setAttribute(IGNORE_ATTR, 'true')

  if (isGradient) {
    hexInput.value = 'Gradient'
    hexInput.readOnly = true
    hexInput.style.color = 'rgba(255,255,255,0.45)'
    picker.value = '#000000'
  } else {
    hexInput.value = currentHex.replace('#', '')
    picker.value = currentHex
  }

  const opacityInput = createNumberInput({
    value: opacity,
    min: 0,
    max: 100,
    step: 1,
    onChange: (v) => {
      currentHex = picker.value || currentHex
      onOpacityChange?.(v, currentHex)
    },
  })
  opacityInput.className = 'ei-dp-fill-opacity'
  const opacitySuffix = el('div', 'ei-dp-fill-opacity-suffix', '%')

  function applyColor(hex: string): void {
    currentHex = hex
    swatch.style.background = hex
    hexInput.value = hex.replace('#', '').toUpperCase()
    hexInput.readOnly = false
    hexInput.style.color = ''
    onChange(hex)
  }

  picker.addEventListener('input', (e) => {
    e.stopPropagation()
    applyColor(picker.value)
  })

  hexInput.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      let hex = hexInput.value.trim()
      if (!hex.startsWith('#')) hex = '#' + hex
      applyColor(hex)
      picker.value = hex
      hexInput.blur()
    }
  })

  hexInput.addEventListener('blur', () => {
    if (hexInput.readOnly) return
    let hex = hexInput.value.trim()
    if (!hex.startsWith('#')) hex = '#' + hex
    if (/^#[0-9A-Fa-f]{3,8}$/.test(hex)) {
      currentHex = hex
      swatch.style.background = hex
      picker.value = hex.length <= 7 ? hex : hex.slice(0, 7)
      onChange(hex)
    }
  })

  swatch.appendChild(picker)
  wrap.append(swatch, hexInput, opacityInput, opacitySuffix)
  return wrap
}

// --- Weight Select ---

function createWeightSelect(value: string, onChange: (value: string) => void): HTMLDivElement {
  const wrap = el('div', 'ei-dp-field')
  const iconEl = el('div', 'ei-dp-field-icon', 'W')

  const select = document.createElement('select')
  select.className = 'ei-dp-field-select'
  select.setAttribute(IGNORE_ATTR, 'true')

  const weights = ['100', '200', '300', '400', '500', '600', '700', '800', '900']
  for (const w of weights) {
    const opt = document.createElement('option')
    opt.value = w
    opt.textContent = w
    if (w === String(parseInt(value))) opt.selected = true
    select.appendChild(opt)
  }

  select.addEventListener('change', (e) => {
    e.stopPropagation()
    onChange(select.value)
  })

  select.addEventListener('keydown', (e) => e.stopPropagation())

  wrap.append(iconEl, select)
  return wrap
}

// --- Font Family Select ---

const COMMON_FONTS = [
  'Inter',
  'SF Pro',
  'Roboto',
  'Helvetica Neue',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Menlo',
  'Monaco',
]

function createFontSelect(value: string, onChange: (value: string) => void): HTMLDivElement {
  const wrap = el('div', 'ei-dp-font-select')
  wrap.setAttribute(IGNORE_ATTR, 'true')

  const textEl = el('span', 'ei-dp-font-text', value || 'Inter')

  const arrowEl = el('span', 'ei-dp-font-arrow')
  arrowEl.innerHTML = DOWN_ARROW_ICON

  wrap.append(textEl, arrowEl)

  wrap.addEventListener('click', (e) => {
    e.stopPropagation()
    openFontDropdown(wrap, textEl.textContent || '', (font) => {
      textEl.textContent = font
      onChange(font)
    })
  })

  return wrap
}

let activeFontDropdown: HTMLDivElement | null = null

function closeFontDropdown(): void {
  if (activeFontDropdown) {
    activeFontDropdown.remove()
    activeFontDropdown = null
  }
  document.removeEventListener('mousedown', handleFontDropdownOutside, true)
}

function handleFontDropdownOutside(e: MouseEvent): void {
  if (activeFontDropdown && e.target instanceof Element && !activeFontDropdown.contains(e.target)) {
    closeFontDropdown()
  }
}

function openFontDropdown(
  anchor: HTMLElement,
  currentFont: string,
  onSelect: (font: string) => void,
): void {
  closeFontDropdown()

  const dropdown = el('div', 'ei-dp-font-dropdown')
  dropdown.setAttribute(IGNORE_ATTR, 'true')

  for (const font of COMMON_FONTS) {
    const item = el('div', 'ei-dp-font-option', font)
    item.setAttribute(IGNORE_ATTR, 'true')
    if (font === currentFont) {
      item.dataset.active = 'true'
    }
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      onSelect(font)
      closeFontDropdown()
    })
    dropdown.appendChild(item)
  }

  const panel = anchor.closest('.ei-panel')
  if (panel) {
    panel.appendChild(dropdown)
    const anchorRect = anchor.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    dropdown.style.left = `${anchorRect.left - panelRect.left}px`
    dropdown.style.top = `${anchorRect.bottom - panelRect.top + 4}px`
  }

  activeFontDropdown = dropdown
  requestAnimationFrame(() => {
    document.addEventListener('mousedown', handleFontDropdownOutside, true)
  })
}

// --- Text Align Button Group ---

const ALIGN_ICONS: Record<string, string> = {
  left: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 7.5C5 7.36739 5.05268 7.24021 5.14645 7.14645C5.24021 7.05268 5.36739 7 5.5 7H18.5C18.6326 7 18.7598 7.05268 18.8536 7.14645C18.9473 7.24021 19 7.36739 19 7.5C19 7.63261 18.9473 7.75979 18.8536 7.85355C18.7598 7.94732 18.6326 8 18.5 8H5.5C5.36739 8 5.24021 7.94732 5.14645 7.85355C5.05268 7.75979 5 7.63261 5 7.5ZM5 11.5C5 11.3674 5.05268 11.2402 5.14645 11.1464C5.24021 11.0527 5.36739 11 5.5 11H12.5C12.6326 11 12.7598 11.0527 12.8536 11.1464C12.9473 11.2402 13 11.3674 13 11.5C13 11.6326 12.9473 11.7598 12.8536 11.8536C12.7598 11.9473 12.6326 12 12.5 12H5.5C5.36739 12 5.24021 11.9473 5.14645 11.8536C5.05268 11.7598 5 11.6326 5 11.5ZM5.5 15C5.36739 15 5.24021 15.0527 5.14645 15.1464C5.05268 15.2402 5 15.3674 5 15.5C5 15.6326 5.05268 15.7598 5.14645 15.8536C5.24021 15.9473 5.36739 16 5.5 16H14.5C14.6326 16 14.7598 15.9473 14.8536 15.8536C14.9473 15.7598 15 15.6326 15 15.5C15 15.3674 14.9473 15.2402 14.8536 15.1464C14.7598 15.0527 14.6326 15 14.5 15H5.5Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  center: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 7.5C5 7.36739 5.05268 7.24021 5.14645 7.14645C5.24021 7.05268 5.36739 7 5.5 7H18.5C18.6326 7 18.7598 7.05268 18.8536 7.14645C18.9473 7.24021 19 7.36739 19 7.5C19 7.63261 18.9473 7.75979 18.8536 7.85355C18.7598 7.94732 18.6326 8 18.5 8H5.5C5.36739 8 5.24021 7.94732 5.14645 7.85355C5.05268 7.75979 5 7.63261 5 7.5ZM8 11.5C8 11.3674 8.05268 11.2402 8.14645 11.1464C8.24021 11.0527 8.36739 11 8.5 11H15.5C15.6326 11 15.7598 11.0527 15.8536 11.1464C15.9473 11.2402 16 11.3674 16 11.5C16 11.6326 15.9473 11.7598 15.8536 11.8536C15.7598 11.9473 15.6326 12 15.5 12H8.5C8.36739 12 8.24021 11.9473 8.14645 11.8536C8.05268 11.7598 8 11.6326 8 11.5ZM7.5 15C7.36739 15 7.24021 15.0527 7.14645 15.1464C7.05268 15.2402 7 15.3674 7 15.5C7 15.6326 7.05268 15.7598 7.14645 15.8536C7.24021 15.9473 7.36739 16 7.5 16H16.5C16.6326 16 16.7598 15.9473 16.8536 15.8536C16.9473 15.7598 17 15.6326 17 15.5C17 15.3674 16.9473 15.2402 16.8536 15.1464C16.7598 15.0527 16.6326 15 16.5 15H7.5Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  right: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M19 7.5C19 7.36739 18.9473 7.24021 18.8536 7.14645C18.7598 7.05268 18.6326 7 18.5 7H5.5C5.36739 7 5.24021 7.05268 5.14645 7.14645C5.05268 7.24021 5 7.36739 5 7.5C5 7.63261 5.05268 7.75979 5.14645 7.85355C5.24021 7.94732 5.36739 8 5.5 8H18.5C18.6326 8 18.7598 7.94732 18.8536 7.85355C18.9473 7.75979 19 7.63261 19 7.5ZM19 11.5C19 11.3674 18.9473 11.2402 18.8536 11.1464C18.7598 11.0527 18.6326 11 18.5 11H11.5C11.3674 11 11.2402 11.0527 11.1464 11.1464C11.0527 11.2402 11 11.3674 11 11.5C11 11.6326 11.0527 11.7598 11.1464 11.8536C11.2402 11.9473 11.3674 12 11.5 12H18.5C18.6326 12 18.7598 11.9473 18.8536 11.8536C18.9473 11.7598 19 11.6326 19 11.5ZM18.5 15C18.6326 15 18.7598 15.0527 18.8536 15.1464C18.9473 15.2402 19 15.3674 19 15.5C19 15.6326 18.9473 15.7598 18.8536 15.8536C18.7598 15.9473 18.6326 16 18.5 16H9.5C9.36739 16 9.24021 15.9473 9.14645 15.8536C9.05268 15.7598 9 15.6326 9 15.5C9 15.3674 9.05268 15.2402 9.14645 15.1464C9.24021 15.0527 9.36739 15 9.5 15H18.5Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
}

function createAlignButtons(value: string, onChange: (value: string) => void): HTMLDivElement {
  const wrap = el('div', 'ei-dp-align-btns')

  const aligns: Array<{ key: string; css: string }> = [
    { key: 'left', css: 'left' },
    { key: 'center', css: 'center' },
    { key: 'right', css: 'right' },
  ]

  for (const { key, css } of aligns) {
    const btn = el('button', 'ei-dp-align-btn')
    btn.type = 'button'
    btn.innerHTML = ALIGN_ICONS[key] ?? ''
    btn.setAttribute(IGNORE_ATTR, 'true')
    if (value === css) btn.dataset.active = 'true'
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      wrap.querySelectorAll('.ei-dp-align-btn').forEach(b => b.removeAttribute('data-active'))
      btn.dataset.active = 'true'
      onChange(css)
    })
    wrap.appendChild(btn)
  }

  return wrap
}

// --- Line Height Field ---

function createLineHeightField(value: number, onChange: (value: number) => void): HTMLDivElement {
  const wrap = el('div', 'ei-dp-field ei-dp-field-line-height')
  const iconEl = el('div', 'ei-dp-field-icon')
  iconEl.innerHTML = FIELD_ICONS.lineHeight ?? ''

  const input = createNumberInput({
    value,
    min: 0,
    step: 1,
    onChange,
  })
  input.className = 'ei-dp-field-input'

  const suffix = el('div', 'ei-dp-field-suffix', '%')

  wrap.append(iconEl, input, suffix)
  wrap.addEventListener('click', () => input.focus())
  return wrap
}

// --- Section Icons ---
const SECTION_ADD_ICON = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`
const REMOVE_ICON = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`

// --- Stroke constants ---
const STROKE_SETTINGS_ICON = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.5 12c.133 0 .26-.053.354-.146a.5.5 0 0 0 .146-.354V9.95a2.5 2.5 0 0 0 1.438-.868A2.5 2.5 0 0 0 5 7.5a2.5 2.5 0 0 0-.562-1.582A2.5 2.5 0 0 0 3 5.05V.5a.5.5 0 0 0-.854-.354A.5.5 0 0 0 2 .5v4.55a2.5 2.5 0 0 0-1.437.869A2.5 2.5 0 0 0 0 7.5c0 .576.199 1.134.563 1.581A2.5 2.5 0 0 0 2 9.95v1.55a.5.5 0 0 0 .146.354c.094.093.221.146.354.146ZM9.5 12a.5.5 0 0 0 .352-.146.5.5 0 0 0 .148-.354V6.95a2.5 2.5 0 0 0 1.435-.869A2.5 2.5 0 0 0 12 4.5a2.5 2.5 0 0 0-.565-1.581A2.5 2.5 0 0 0 10 2.05V.5a.5.5 0 0 0-.146-.354A.5.5 0 0 0 9.5 0a.5.5 0 0 0-.354.146A.5.5 0 0 0 9 .5v1.55a2.5 2.5 0 0 0-1.44.868A2.5 2.5 0 0 0 7 4.5c0 .577.196 1.134.56 1.582A2.5 2.5 0 0 0 9 6.95v4.55a.5.5 0 0 0 .146.354c.094.093.22.146.354.146ZM9.5 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM2.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="currentColor" fill-opacity="0.7"/></svg>`

const DOWN_ARROW_ICON = `<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 3l2 2 2-2" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const STROKE_POSITION_ICONS: Record<string, string> = {
  top: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 7a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9ZM11 11h2v2h-2v-2Zm-1 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  right: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M17 7.5a.5.5 0 0 0-1 0v9a.5.5 0 0 0 1 0v-9ZM13 11v2h-2v-2h2Zm0-1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h2Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  bottom: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M11 11h2v2h-2v-2Zm-1 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2ZM7.5 16a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  left: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 7.5a.5.5 0 0 0-1 0v9a.5.5 0 0 0 1 0v-9ZM13 11v2h-2v-2h2Zm0-1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h2Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
}

type StrokePosition = 'inside' | 'center' | 'outside'

const STROKE_POSITION_LABELS: Record<StrokePosition, string> = {
  inside: 'Inside',
  center: 'Center',
  outside: 'Outside',
}

type StrokeValues = {
  color: string
  opacity: number
  position: StrokePosition
  width: number
  top: number
  right: number
  bottom: number
  left: number
}

// --- Stroke position dropdown ---
let activePosDropdown: HTMLDivElement | null = null

function closePosDropdown(): void {
  if (activePosDropdown) {
    activePosDropdown.remove()
    activePosDropdown = null
  }
  document.removeEventListener('mousedown', handlePosDropdownOutside, true)
}

function handlePosDropdownOutside(e: MouseEvent): void {
  if (activePosDropdown && e.target instanceof Element && !activePosDropdown.contains(e.target)) {
    closePosDropdown()
  }
}

function openPosDropdown(
  anchor: HTMLElement,
  currentPos: StrokePosition,
  onSelect: (pos: StrokePosition) => void,
  accentColor: string,
  onClose?: () => void,
): void {
  closePosDropdown()
  const dropdown = el('div', 'ei-dp-size-dropdown')
  dropdown.setAttribute(IGNORE_ATTR, 'true')

  for (const pos of ['inside', 'center', 'outside'] as StrokePosition[]) {
    const item = el('div', 'ei-dp-size-option')
    item.setAttribute(IGNORE_ATTR, 'true')
    const check = el('span', 'ei-dp-size-check')
    if (pos === currentPos) {
      check.innerHTML = SIZE_ICONS.checkmark ?? ''
      check.style.color = accentColor
    }
    const label = el('span', 'ei-dp-size-option-label', STROKE_POSITION_LABELS[pos])
    label.style.paddingLeft = '8px'
    item.append(check, label)
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      onSelect(pos)
      closePosDropdown()
      onClose?.()
    })
    dropdown.appendChild(item)
  }

  const panel = anchor.closest('.ei-panel')
  if (panel) {
    panel.appendChild(dropdown)
    const anchorRect = anchor.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    dropdown.style.left = `${anchorRect.left - panelRect.left}px`
    dropdown.style.top = `${anchorRect.bottom - panelRect.top + 4}px`
  }

  activePosDropdown = dropdown
  requestAnimationFrame(() => {
    document.addEventListener('mousedown', handlePosDropdownOutside, true)
  })
}

// --- Stroke Panel ---

function createStrokePanel(
  initialValues: StrokeValues,
  tracker: StyleTracker,
  accentColor: string,
  onRemove: () => void,
  onChange: () => void,
): HTMLDivElement {
  const panel = el('div', 'ei-dp-stroke-panel')
  panel.setAttribute(IGNORE_ATTR, 'true')

  // Use shared values directly (mutated in place)
  const values = initialValues

  // Row 1: Color + Opacity (remove button outside)
  const colorWrapper = el('div', 'ei-dp-stroke-color-wrapper')
  const colorInputs = el('div', 'ei-dp-stroke-color-row')

  // Color swatch
  const swatch = el('div', 'ei-dp-swatch')
  swatch.style.backgroundColor = values.color

  const picker = document.createElement('input')
  picker.type = 'color'
  picker.className = 'ei-dp-picker'
  picker.setAttribute(IGNORE_ATTR, 'true')
  picker.value = values.color

  // Hex input
  const hexInput = document.createElement('input')
  hexInput.type = 'text'
  hexInput.className = 'ei-dp-hex'
  hexInput.setAttribute(IGNORE_ATTR, 'true')
  hexInput.value = values.color.replace('#', '').toUpperCase()

  // Opacity input
  const opacityInput = createNumberInput({
    value: values.opacity,
    min: 0, max: 100, step: 1,
    onChange: (v) => {
      values.opacity = v
      applyStroke(tracker, values)
      onChange()
    },
  })
  opacityInput.className = 'ei-dp-fill-opacity'
  const opacitySuffix = el('div', 'ei-dp-fill-opacity-suffix', '%')


  function applyColor(hex: string): void {
    values.color = hex
    swatch.style.backgroundColor = hex
    hexInput.value = hex.replace('#', '').toUpperCase()
    applyStroke(tracker, values)
    onChange()
  }

  picker.addEventListener('input', (e) => {
    e.stopPropagation()
    applyColor(picker.value)
  })

  hexInput.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      let hex = hexInput.value.trim()
      if (!hex.startsWith('#')) hex = '#' + hex
      if (/^#[0-9A-Fa-f]{3,8}$/.test(hex)) {
        applyColor(hex)
        picker.value = hex.length <= 7 ? hex : hex.slice(0, 7)
      }
      hexInput.blur()
    }
  })

  hexInput.addEventListener('blur', () => {
    let hex = hexInput.value.trim()
    if (!hex.startsWith('#')) hex = '#' + hex
    if (/^#[0-9A-Fa-f]{3,8}$/.test(hex)) {
      applyColor(hex)
      picker.value = hex.length <= 7 ? hex : hex.slice(0, 7)
    }
  })

  swatch.appendChild(picker)
  colorInputs.append(swatch, hexInput, opacityInput, opacitySuffix)
  colorWrapper.append(colorInputs)

  // Row 2: Position dropdown + Stroke weight + Settings button
  const settingsRow = el('div', 'ei-dp-stroke-settings-row')

  // Position dropdown button
  const posBtn = el('button', 'ei-dp-stroke-pos-btn')
  posBtn.type = 'button'
  posBtn.setAttribute(IGNORE_ATTR, 'true')
  const posLabel = el('span', '', STROKE_POSITION_LABELS[values.position])
  const posArrow = el('span', 'ei-dp-stroke-pos-arrow')
  posArrow.innerHTML = DOWN_ARROW_ICON
  posBtn.append(posLabel, posArrow)

  // Stroke weight input (with embedded settings button, like radius field)
  const weightWrap = el('div', 'ei-dp-field ei-dp-field-radius')
  const weightIconEl = el('div', 'ei-dp-field-icon')
  weightIconEl.innerHTML = FIELD_ICONS.strokeWeight ?? ''
  const weightNumInput = createNumberInput({
    value: values.width,
    min: 0,
    onChange: (v) => {
      values.width = v
      values.top = v
      values.right = v
      values.bottom = v
      values.left = v
      applyStroke(tracker, values)
      topInput.querySelector('input')!.value = String(v)
      rightInput.querySelector('input')!.value = String(v)
      bottomInput.querySelector('input')!.value = String(v)
      leftInput.querySelector('input')!.value = String(v)
      onChange()
    },
  })
  weightNumInput.className = 'ei-dp-field-input'

  const settingsBtn = el('button', 'ei-dp-field-action')
  settingsBtn.type = 'button'
  settingsBtn.setAttribute(IGNORE_ATTR, 'true')
  settingsBtn.title = 'Edit individual sides'
  settingsBtn.innerHTML = STROKE_SETTINGS_ICON
  let expanded = false

  weightWrap.append(weightIconEl, weightNumInput, settingsBtn)
  weightWrap.addEventListener('click', () => weightNumInput.focus())

  settingsRow.append(posBtn, weightWrap)

  // Row 3 & 4: Individual side inputs (hidden by default)
  const sidesRow1 = el('div', 'ei-dp-stroke-sides-row')
  const sidesRow2 = el('div', 'ei-dp-stroke-sides-row')
  sidesRow1.style.display = 'none'
  sidesRow2.style.display = 'none'

  const topInput = createLabeledField({
    icon: '',
    iconHtml: STROKE_POSITION_ICONS.top ?? '',
    value: values.top,
    min: 0,
    onChange: (v) => {
      values.top = v
      values.width = Math.max(values.top, values.right, values.bottom, values.left)
      applyStroke(tracker, values)
      onChange()
    },
  })

  const rightInput = createLabeledField({
    icon: '',
    iconHtml: STROKE_POSITION_ICONS.right ?? '',
    value: values.right,
    min: 0,
    onChange: (v) => {
      values.right = v
      values.width = Math.max(values.top, values.right, values.bottom, values.left)
      applyStroke(tracker, values)
      onChange()
    },
  })

  const bottomInput = createLabeledField({
    icon: '',
    iconHtml: STROKE_POSITION_ICONS.bottom ?? '',
    value: values.bottom,
    min: 0,
    onChange: (v) => {
      values.bottom = v
      values.width = Math.max(values.top, values.right, values.bottom, values.left)
      applyStroke(tracker, values)
      onChange()
    },
  })

  const leftInput = createLabeledField({
    icon: '',
    iconHtml: STROKE_POSITION_ICONS.left ?? '',
    value: values.left,
    min: 0,
    onChange: (v) => {
      values.left = v
      values.width = Math.max(values.top, values.right, values.bottom, values.left)
      applyStroke(tracker, values)
      onChange()
    },
  })

  sidesRow1.append(topInput, rightInput)
  sidesRow2.append(bottomInput, leftInput)

  // Toggle individual sides
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    expanded = !expanded
    sidesRow1.style.display = expanded ? 'grid' : 'none'
    sidesRow2.style.display = expanded ? 'grid' : 'none'
    settingsBtn.dataset.active = expanded ? 'true' : 'false'
  })

  // Position dropdown
  let posDropdownOpen = false

  posBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    if (posDropdownOpen) {
      closePosDropdown()
      return
    }
    openPosDropdown(posBtn, values.position, (pos) => {
      values.position = pos
      posLabel.textContent = STROKE_POSITION_LABELS[pos]
      applyStroke(tracker, values)
      onChange()
    }, accentColor, () => {
      posDropdownOpen = false
    })
    posDropdownOpen = true
  })

  panel.append(colorWrapper, settingsRow, sidesRow1, sidesRow2)
  return panel
}

function applyStroke(tracker: StyleTracker, values: StrokeValues): void {
  const { color, opacity, position, top, right, bottom, left } = values

  let r = 0, g = 0, b = 0
  const hex = color.replace('#', '')
  if (hex.length >= 6) {
    r = parseInt(hex.slice(0, 2), 16)
    g = parseInt(hex.slice(2, 4), 16)
    b = parseInt(hex.slice(4, 6), 16)
  }
  const alpha = opacity / 100
  const rgba = `rgba(${r}, ${g}, ${b}, ${alpha})`

  // Clear previous stroke styles
  tracker.apply('border', '')
  tracker.apply('border-style', '')
  tracker.apply('border-color', '')
  tracker.apply('border-width', '')
  tracker.apply('outline', '')
  tracker.apply('outline-offset', '')
  tracker.apply('box-shadow', '')

  const allSame = top === right && right === bottom && bottom === left

  if (position === 'inside') {
    if (allSame) {
      tracker.apply('box-shadow', `inset 0 0 0 ${top}px ${rgba}`)
    } else {
      // 四边不同宽度：使用多个 inset box-shadow
      const shadows = []
      if (top > 0) shadows.push(`inset 0 ${top}px 0 0 ${rgba}`)
      if (right > 0) shadows.push(`inset -${right}px 0 0 0 ${rgba}`)
      if (bottom > 0) shadows.push(`inset 0 -${bottom}px 0 0 ${rgba}`)
      if (left > 0) shadows.push(`inset ${left}px 0 0 0 ${rgba}`)
      tracker.apply('box-shadow', shadows.join(', '))
    }
  } else if (position === 'outside') {
    if (allSame) {
      tracker.apply('outline', `${top}px solid ${rgba}`)
      tracker.apply('outline-offset', '0')
    } else {
      // 四边不同宽度：使用多个 box-shadow
      const shadows = []
      if (top > 0) shadows.push(`0 -${top}px 0 0 ${rgba}`)
      if (right > 0) shadows.push(`${right}px 0 0 0 ${rgba}`)
      if (bottom > 0) shadows.push(`0 ${bottom}px 0 0 ${rgba}`)
      if (left > 0) shadows.push(`-${left}px 0 0 0 ${rgba}`)
      tracker.apply('box-shadow', shadows.join(', '))
    }
  } else {
    // center: outline with negative offset
    if (allSame) {
      tracker.apply('outline', `${top}px solid ${rgba}`)
      tracker.apply('outline-offset', `${-Math.round(top / 2)}px`)
    } else {
      // 四边不同宽度的 center 比较复杂，用 box-shadow 模拟
      const shadows = []
      if (top > 0) {
        const offset = Math.round(top / 2)
        shadows.push(`0 -${offset}px 0 ${offset}px ${rgba}`)
      }
      if (right > 0) {
        const offset = Math.round(right / 2)
        shadows.push(`${offset}px 0 0 ${offset}px ${rgba}`)
      }
      if (bottom > 0) {
        const offset = Math.round(bottom / 2)
        shadows.push(`0 ${offset}px 0 ${offset}px ${rgba}`)
      }
      if (left > 0) {
        const offset = Math.round(left / 2)
        shadows.push(`-${offset}px 0 0 ${offset}px ${rgba}`)
      }
      tracker.apply('box-shadow', shadows.join(', '))
    }
  }
}

function detectStrokeValues(element: HTMLElement): StrokeValues | null {
  const style = window.getComputedStyle(element)

  // Check outline first (center/outside)
  const outline = style.getPropertyValue('outline')
  const outlineStyle = style.getPropertyValue('outline-style')
  const outlineWidth = parseFloat(style.getPropertyValue('outline-width'))

  if (outlineStyle !== 'none' && outlineWidth > 0) {
    const outlineColor = style.getPropertyValue('outline-color')
    const outlineOffset = parseFloat(style.getPropertyValue('outline-offset')) || 0
    const hex = rgbToHex(outlineColor)
    const position: StrokePosition = outlineOffset < 0 ? 'center' : 'outside'
    return {
      color: hex, opacity: 100, position,
      width: outlineWidth, top: outlineWidth, right: outlineWidth, bottom: outlineWidth, left: outlineWidth,
    }
  }

  // Check box-shadow for inside stroke
  const boxShadow = style.getPropertyValue('box-shadow')
  if (boxShadow && boxShadow !== 'none' && boxShadow.includes('inset')) {
    const match = boxShadow.match(/inset\s+0px?\s+0px?\s+0px?\s+([\d.]+)px\s+(.+)/)
    if (match) {
      const w = parseFloat(match[1]!)
      const hex = rgbToHex(match[2]!)
      return {
        color: hex, opacity: 100, position: 'inside',
        width: w, top: w, right: w, bottom: w, left: w,
      }
    }
  }

  // Check border
  const borderStyle = style.getPropertyValue('border-style')
  const borderWidth = parseFloat(style.getPropertyValue('border-width'))
  if (borderStyle !== 'none' && borderWidth > 0) {
    const borderColor = style.getPropertyValue('border-color')
    const hex = rgbToHex(borderColor)
    return {
      color: hex, opacity: 100, position: 'center',
      width: borderWidth, top: borderWidth, right: borderWidth, bottom: borderWidth, left: borderWidth,
    }
  }

  return null
}

// --- Design Panel Builder ---

export type DesignPanelCallbacks = {
  onStyleChange: () => void
}

export function buildDesignPanel(
  element: HTMLElement,
  info: InspectorInfo,
  tracker: StyleTracker,
  accentColor: string,
  callbacks: DesignPanelCallbacks,
): HTMLDivElement {
  // Close any stale dropdown from previous panel
  closeSizingDropdown()
  const container = el('div', 'ei-dp')

  function grid(...children: HTMLElement[]): HTMLDivElement {
    const g = el('div', 'ei-dp-grid')
    children.forEach(c => g.appendChild(c))
    return g
  }

  // --- createSection factory ---
  type SectionHandle = {
    container: HTMLDivElement
    content: HTMLDivElement
    setHasContent: (has: boolean) => void
  }

  let sectionIndex = 0
  function createSection(title: string, opts?: {
    isFirst?: boolean
    addRemove?: { onAdd: () => void; onRemove: () => void }
  }): SectionHandle {
    const section = el('div', 'ei-dp-section')
    if (sectionIndex > 0 && !opts?.isFirst) {
      section.classList.add('ei-dp-section-border')
    }
    sectionIndex++

    const header = el('div', 'ei-dp-section-header')
    const label = el('span', 'ei-dp-section-label', title)
    header.appendChild(label)

    const content = el('div', 'ei-dp-section-content')

    let setHasContent = (_has: boolean) => {}

    if (opts?.addRemove) {
      const btn = el('button', 'ei-dp-section-btn')
      btn.type = 'button'
      btn.setAttribute(IGNORE_ATTR, 'true')
      btn.innerHTML = SECTION_ADD_ICON

      let hasContent = false

      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (hasContent) {
          opts.addRemove!.onRemove()
        } else {
          opts.addRemove!.onAdd()
        }
      })

      header.appendChild(btn)

      setHasContent = (has: boolean) => {
        hasContent = has
        content.dataset.visible = has ? 'true' : 'false'
        btn.innerHTML = has ? REMOVE_ICON : SECTION_ADD_ICON
      }
    }

    section.append(header, content)
    return { container: section, content, setHasContent }
  }

  // Fill/Stroke section handles (created later, referenced by add/remove callbacks)
  let fillSection: SectionHandle
  let strokeSection: SectionHandle

  // --- Padding helper ---
  function appendPaddingFields(target: HTMLElement): void {
    target.appendChild(grid(
      createLabeledField({
        icon: '',
        iconHtml: PADDING_ICONS.left,
        value: parsePxValue(info.boxModel.padding.left),
        min: 0,
        onChange: (v) => tracker.apply('padding-left', `${v}px`),
      }),
      createLabeledField({
        icon: '',
        iconHtml: PADDING_ICONS.top,
        value: parsePxValue(info.boxModel.padding.top),
        min: 0,
        onChange: (v) => tracker.apply('padding-top', `${v}px`),
      }),
    ))
    target.appendChild(grid(
      createLabeledField({
        icon: '',
        iconHtml: PADDING_ICONS.right,
        value: parsePxValue(info.boxModel.padding.right),
        min: 0,
        onChange: (v) => tracker.apply('padding-right', `${v}px`),
      }),
      createLabeledField({
        icon: '',
        iconHtml: PADDING_ICONS.bottom,
        value: parsePxValue(info.boxModel.padding.bottom),
        min: 0,
        onChange: (v) => tracker.apply('padding-bottom', `${v}px`),
      }),
    ))
  }

  const display = info.layout.display
  const isLayoutElement = display.includes('flex') || display.includes('grid')
  const showTypography = !!(info.typography.fontSize && info.typography.fontSize !== '0px')

  if (isLayoutElement) {
    // === 1. Auto layout section ===
    const layoutSec = createSection('Auto layout', { isFirst: true })

    if (display.includes('flex')) {
      const dirBtns = el('div', 'ei-dp-btn-group')
      for (const dir of ['row', 'column'] as const) {
        const btn = el('button', 'ei-dp-btn')
        btn.type = 'button'
        btn.innerHTML = DIRECTION_ICONS[dir] ?? ''
        btn.setAttribute(IGNORE_ATTR, 'true')
        if (info.layout.flexDirection === dir) btn.dataset.active = 'true'
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          dirBtns.querySelectorAll('.ei-dp-btn').forEach(b => b.removeAttribute('data-active'))
          btn.dataset.active = 'true'
          tracker.apply('flex-direction', dir)
        })
        dirBtns.appendChild(btn)
      }
      layoutSec.content.appendChild(dirBtns)
    }

    layoutSec.content.appendChild(grid(
      createSizeField({ icon: 'W', dimension: 'width', value: info.rect.width, element, tracker, accentColor, onChange: callbacks.onStyleChange }),
      createSizeField({ icon: 'H', dimension: 'height', value: info.rect.height, element, tracker, accentColor, onChange: callbacks.onStyleChange }),
    ))

    if (display.includes('flex')) {
      const alignRow = el('div', 'ei-dp-align-row')
      const alignGrid = el('div', 'ei-dp-align-grid')

      const packedJustify = ['flex-start', 'center', 'flex-end'] as const
      const distJustify = ['space-between', 'space-around', 'space-evenly'] as const
      const alignVals = ['flex-start', 'center', 'flex-end'] as const

      const currentJustify = info.layout.justifyContent
      const isDistMode = distJustify.includes(currentJustify as typeof distJustify[number])
      let autoGap = isDistMode
      const isRow = info.layout.flexDirection !== 'column'

      const gapWrap = el('div', 'ei-dp-gap-field')
      const gapIconEl = el('div', 'ei-dp-field-icon')
      gapIconEl.innerHTML = autoGap ? GAP_ICON_DISTRIBUTE : (FIELD_ICONS.gap ?? '')

      const gapInput = createNumberInput({
        value: parsePxValue(info.layout.gap),
        min: 0,
        onChange: (v) => {
          autoGap = false
          tracker.apply('gap', `${v}px`)
          rebuildGrid()
          gapIconEl.innerHTML = FIELD_ICONS.gap ?? ''
          gapTrigger.dataset.auto = 'false'
          callbacks.onStyleChange()
        },
      })
      gapInput.className = 'ei-dp-field-input'
      if (autoGap) {
        gapInput.value = 'Auto'
        gapInput.style.color = 'rgba(255,255,255,0.45)'
      }

      const gapTrigger = el('div', 'ei-dp-gap-trigger')
      gapTrigger.setAttribute(IGNORE_ATTR, 'true')
      gapTrigger.innerHTML = GAP_DROPDOWN_ICON
      gapTrigger.dataset.auto = autoGap ? 'true' : 'false'

      gapTrigger.addEventListener('click', (e) => {
        e.stopPropagation()
        openGapDropdown(gapTrigger, autoGap, (mode) => {
          if (mode === 'auto') {
            autoGap = true
            tracker.apply('gap', 'normal')
            tracker.apply('justify-content', 'space-between')
            gapInput.value = 'Auto'
            gapInput.style.color = 'rgba(255,255,255,0.45)'
            gapTrigger.dataset.auto = 'true'
            gapIconEl.innerHTML = GAP_ICON_DISTRIBUTE
          } else {
            autoGap = false
            const v = parsePxValue(info.layout.gap) || 0
            tracker.apply('gap', `${v}px`)
            tracker.apply('justify-content', 'flex-start')
            gapInput.value = String(v)
            gapInput.style.color = ''
            gapTrigger.dataset.auto = 'false'
            gapIconEl.innerHTML = FIELD_ICONS.gap ?? ''
          }
          rebuildGrid()
          callbacks.onStyleChange()
        }, accentColor)
      })

      gapWrap.append(gapIconEl, gapInput, gapTrigger)
      gapWrap.addEventListener('click', () => { if (!autoGap) gapInput.focus() })

      let activeAlign = info.layout.alignItems
      let activeJustify = currentJustify

      function rebuildGrid(): void {
        alignGrid.innerHTML = ''
        const justifyVals = autoGap ? distJustify : packedJustify
        for (let gridRow = 0; gridRow < 3; gridRow++) {
          for (let gridCol = 0; gridCol < 3; gridCol++) {
            const alignIdx = isRow ? gridRow : gridCol
            const justifyIdx = isRow ? gridCol : gridRow
            const a = alignVals[alignIdx]!
            const j = justifyVals[justifyIdx]!

            const cell = document.createElement('button')
            cell.className = 'ei-dp-align-cell'
            cell.type = 'button'
            cell.setAttribute(IGNORE_ATTR, 'true')

            const alignMatch = a === activeAlign
            const isActive = alignMatch && j === activeJustify
            if (isActive) {
              cell.dataset.active = 'true'
              cell.innerHTML = generateCellSvg(gridRow, gridCol, isRow, autoGap)
            } else if (autoGap && alignMatch) {
              cell.dataset.rowActive = 'true'
              cell.innerHTML = generateCellSvg(gridRow, gridCol, isRow, true)
            } else {
              cell.innerHTML = ALIGN_DOT
            }
            cell.addEventListener('click', (e) => {
              e.stopPropagation()
              activeAlign = a
              activeJustify = j
              tracker.apply('justify-content', j)
              tracker.apply('align-items', a)
              rebuildGrid()
              callbacks.onStyleChange()
            })
            alignGrid.appendChild(cell)
          }
        }
      }
      rebuildGrid()

      alignRow.appendChild(alignGrid)
      alignRow.appendChild(gapWrap)
      layoutSec.content.appendChild(alignRow)
    } else {
      layoutSec.content.appendChild(grid(
        createGapField({ value: parsePxValue(info.layout.gap), tracker, accentColor, onChange: callbacks.onStyleChange }),
        el('div'),
      ))
    }

    appendPaddingFields(layoutSec.content)
    container.appendChild(layoutSec.container)

  } else {
    // === 1. Size section (non-layout) ===
    const sizeSec = createSection('Size', { isFirst: true })
    sizeSec.content.appendChild(grid(
      createSizeField({ icon: 'W', dimension: 'width', value: info.rect.width, element, tracker, accentColor, onChange: callbacks.onStyleChange }),
      createSizeField({ icon: 'H', dimension: 'height', value: info.rect.height, element, tracker, accentColor, onChange: callbacks.onStyleChange }),
    ))
    container.appendChild(sizeSec.container)

    // === 2. Spacing section (non-layout) ===
    const spacingSec = createSection('Spacing')
    appendPaddingFields(spacingSec.content)
    container.appendChild(spacingSec.container)
  }

  // === 3. Appearance ===
  const appearanceSec = createSection('Appearance')
  const radiusField = createRadiusField({
    icon: '',
    iconHtml: FIELD_ICONS.radius,
    value: parsePxValue(info.boxModel.borderRadius),
    min: 0,
    onChange: (v) => tracker.apply('border-radius', `${v}px`),
    onOpenSettings: (anchor) => {
      const radiusInput = radiusField.querySelector('input') as HTMLInputElement | null
      openRadiusDropdown(anchor as HTMLButtonElement, () => {
        const computed = window.getComputedStyle(element).getPropertyValue('border-radius')
        return computed || info.boxModel.borderRadius
      }, (value) => {
        tracker.apply('border-radius', value)
      }, (displayValue) => {
        if (radiusInput) {
          radiusInput.value = displayValue
        }
      })
    },
  })
  appearanceSec.content.appendChild(grid(
    createLabeledField({
      icon: '',
      iconHtml: FIELD_ICONS.opacity,
      value: Math.round(parseFloat(info.visual.opacity) * 100),
      min: 0, max: 100, step: 1, suffix: '%',
      onChange: (v) => tracker.apply('opacity', String(v / 100)),
    }),
    radiusField,
  ))
  container.appendChild(appearanceSec.container)

  // === 4. Typography ===
  if (showTypography) {
    const typoSec = createSection('Typography')

    // Row 1: Font family
    typoSec.content.appendChild(createFontSelect(
      info.typography.fontFamily.split(',')[0]?.replace(/['"]/g, '').trim() || 'Inter',
      (v) => tracker.apply('font-family', v),
    ))

    // Row 2: Font size + Font weight
    typoSec.content.appendChild(grid(
      createLabeledField({
        icon: 'Aa',
        value: parsePxValue(info.typography.fontSize),
        min: 0,
        onChange: (v) => tracker.apply('font-size', `${v}px`),
      }),
      createWeightSelect(info.typography.fontWeight, (v) => tracker.apply('font-weight', v)),
    ))

    // Row 3: Line height + Text align
    const row3 = el('div', 'ei-dp-typography-row')

    // Parse line height (could be "normal", "24px", "1.5", etc.)
    let lineHeightValue = 100
    const lh = info.typography.lineHeight
    if (lh && lh !== 'normal') {
      if (lh.endsWith('px')) {
        const fontSize = parsePxValue(info.typography.fontSize) || 16
        lineHeightValue = Math.round((parseFloat(lh) / fontSize) * 100)
      } else if (lh.endsWith('%')) {
        lineHeightValue = parseFloat(lh)
      } else {
        // Unitless number (relative to font size)
        lineHeightValue = Math.round(parseFloat(lh) * 100)
      }
    }

    row3.appendChild(createLineHeightField(lineHeightValue, (v) => {
      const fontSize = parsePxValue(info.typography.fontSize) || 16
      tracker.apply('line-height', `${(v / 100).toFixed(2)}`)
    }))
    row3.appendChild(createAlignButtons(
      info.typography.textAlign || 'left',
      (v) => tracker.apply('text-align', v),
    ))

    typoSec.content.appendChild(row3)

    // Row 4: Text color
    typoSec.content.appendChild(createFillRow({
      value: info.typography.color,
      onChange: (v) => tracker.apply('color', v),
    }))

    container.appendChild(typoSec.container)
  }

  // === 5. Fill ===
  const bgIsGradient = info.visual.backgroundColor.includes('gradient(')
  const hasFill = info.visual.backgroundColor !== 'transparent' && info.visual.backgroundColor !== 'rgba(0, 0, 0, 0)'

  function populateFillContent(contentEl: HTMLDivElement, bgColor: string, bgOpacity: number): void {
    contentEl.innerHTML = ''
    contentEl.appendChild(createFillRow({
      value: bgColor,
      opacity: bgOpacity,
      onChange: (v) => {
        if (bgIsGradient) {
          tracker.apply('background', v)
          tracker.apply('background-image', 'none')
        } else {
          tracker.apply('background-color', v)
        }
      },
      onOpacityChange: (opacity, hex) => {
        const alpha = opacity / 100
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        tracker.apply('background-color', `rgba(${r}, ${g}, ${b}, ${alpha})`)
      },
    }))
  }

  fillSection = createSection('Fill', {
    addRemove: {
      onAdd: () => {
        tracker.apply('background-color', '#FFFFFF')
        populateFillContent(fillSection.content, '#FFFFFF', 100)
        fillSection.setHasContent(true)
        callbacks.onStyleChange()
      },
      onRemove: () => {
        tracker.apply('background-color', 'transparent')
        fillSection.content.innerHTML = ''
        fillSection.setHasContent(false)
        callbacks.onStyleChange()
      },
    },
  })
  if (hasFill) {
    populateFillContent(fillSection.content, info.visual.backgroundColor, Number(info.visual.backgroundOpacity))
  } else {
    fillSection.setHasContent(false)
  }
  container.appendChild(fillSection.container)

  // === 6. Stroke ===
  const existingStroke = detectStrokeValues(element)

  function populateStrokeContent(contentEl: HTMLDivElement, values: StrokeValues): void {
    contentEl.innerHTML = ''
    contentEl.appendChild(createStrokePanel(
      values,
      tracker,
      accentColor,
      () => {
        // Remove via section button, not stroke panel's internal remove
      },
      callbacks.onStyleChange,
    ))
  }

  strokeSection = createSection('Stroke', {
    addRemove: {
      onAdd: () => {
        const defaultStroke: StrokeValues = {
          color: '#000000', opacity: 100, position: 'center',
          width: 1, top: 1, right: 1, bottom: 1, left: 1,
        }
        applyStroke(tracker, defaultStroke)
        populateStrokeContent(strokeSection.content, defaultStroke)
        strokeSection.setHasContent(true)
        callbacks.onStyleChange()
      },
      onRemove: () => {
        tracker.apply('border', '')
        tracker.apply('border-style', '')
        tracker.apply('border-color', '')
        tracker.apply('border-width', '')
        tracker.apply('outline', '')
        tracker.apply('outline-offset', '')
        tracker.apply('box-shadow', '')
        strokeSection.content.innerHTML = ''
        strokeSection.setHasContent(false)
        callbacks.onStyleChange()
      },
    },
  })
  if (existingStroke) {
    populateStrokeContent(strokeSection.content, existingStroke)
  } else {
    strokeSection.setHasContent(false)
  }
  container.appendChild(strokeSection.container)

  return container
}

// --- Design Panel Styles ---

export function getDesignStyles(accentColor: string): string {
  return `
.ei-dp { padding: 4px 0 0; }
.ei-dp-section { }
.ei-dp-section-border { border-top: 0.5px solid rgba(255,255,255,0.08); }
.ei-dp-section-header { display: flex; align-items: center; justify-content: space-between; height: 40px; }
.ei-dp-section-label { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.7); letter-spacing: 0.11px; }
.ei-dp-section-btn { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: none; background: transparent; color: rgba(255,255,255,0.4); cursor: pointer; border-radius: 4px; transition: color 0.12s ease; }
.ei-dp-section-btn:hover { color: rgba(255,255,255,0.7); }
.ei-dp-section-btn:focus { outline: none; }
.ei-dp-section-btn svg { display: block; }
.ei-dp-section-content { padding-bottom: 16px; }
.ei-dp-section-content[data-visible="false"] { display: none; }
.ei-dp-section-content > :last-child { margin-bottom: 0; }
.ei-dp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.ei-dp-field { display: flex; align-items: center; height: 24px; border-radius: 5px; border: 1px solid transparent; background: rgba(255,255,255,0.06); cursor: text; overflow: hidden; transition: border-color 0.15s ease; }
.ei-dp-field:focus-within { border-color: ${accentColor}; }
.ei-dp-field-icon { flex-shrink: 0; width: 24px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: rgba(255,255,255,0.4); user-select: none; line-height: 0; }
.ei-dp-field-icon svg { display: block; }
.ei-dp-field-input { flex: 1; min-width: 0; height: 100%; border: 0; background: transparent; color: rgba(255,255,255,0.85); font-size: 11px; font-family: inherit; padding: 0 6px 0 0; outline: none; cursor: ew-resize; letter-spacing: 0.055px; }
.ei-dp-field-input:focus { cursor: text; }
.ei-dp-field-suffix { flex-shrink: 0; font-size: 11px; color: rgba(255,255,255,0.4); padding-right: 6px; user-select: none; }
.ei-dp-field-action { flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: none; background: transparent; color: rgba(255,255,255,0.45); cursor: pointer; border-radius: 4px; transition: background 0.12s ease, color 0.12s ease; }
.ei-dp-field-action:hover { color: rgba(255,255,255,0.7); }
.ei-dp-field-action:focus { outline: none; }
.ei-dp-field-action[data-active="true"] { color: ${accentColor}; }
.ei-dp-field-radius { gap: 4px; }
.ei-dp-field-select { flex: 1; min-width: 0; height: 100%; border: 0; background: transparent; color: rgba(255,255,255,0.85); font-size: 11px; font-family: inherit; padding: 0 4px 0 0; outline: none; cursor: pointer; -webkit-appearance: none; }
.ei-dp-fill-row { display: flex; align-items: center; height: 24px; border-radius: 5px; background: rgba(255,255,255,0.06); margin-bottom: 8px; overflow: hidden; }
.ei-dp-swatch { width: 14px; height: 14px; border-radius: 2px; border: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1); flex-shrink: 0; position: relative; cursor: pointer; overflow: hidden; margin-left: 4px; }
.ei-dp-picker { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.ei-dp-hex { flex: 1; min-width: 0; height: 100%; border: none; background: transparent; color: rgba(255,255,255,0.85); font-size: 11px; font-family: inherit; padding: 0 8px; outline: none; }
.ei-dp-fill-opacity { flex-shrink: 0; width: 32px; height: 100%; border: none; border-left: none; background: transparent; color: rgba(255,255,255,0.85); font-size: 11px; font-family: inherit; padding: 0 4px; outline: none; text-align: right; cursor: ew-resize; }
.ei-dp-fill-opacity:focus { cursor: text; }
.ei-dp-fill-opacity-suffix { flex-shrink: 0; font-size: 11px; color: rgba(255,255,255,0.4); padding-right: 8px; }
.ei-dp-btn-group { display: flex; gap: 0; margin-bottom: 8px; background: rgba(255,255,255,0.06); border-radius: 5px; overflow: hidden; }
.ei-dp-btn { flex: 1; height: 24px; border-radius: 5px; border: none; background: transparent; color: rgba(255,255,255,0.4); font-size: 10px; font-weight: 600; cursor: pointer; padding: 0; transition: all 0.12s ease; display: flex; align-items: center; justify-content: center; }
.ei-dp-btn svg { display: block; }
.ei-dp-btn:hover { color: rgba(255,255,255,0.7); }
.ei-dp-btn[data-active="true"] { background: transparent; color: rgba(255,255,255,0.85); box-shadow: inset 0 0 0 0.5px rgba(255,255,255,0.15); }
.ei-dp-align-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start; }
.ei-dp-align-row .ei-dp-field { flex: 1; }
.ei-dp-align-row > * { flex: 1; min-width: 0; }
.ei-dp-align-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; background: rgba(255,255,255,0.06); border: none; border-radius: 5px; padding: 5px 1px; }
.ei-dp-align-cell { display: flex; align-items: center; justify-content: center; width: 28px; height: 15px; background: transparent; border: none; border-radius: 3px; color: rgba(255,255,255,0.25); cursor: pointer; padding: 0; transition: all 0.12s ease; }
.ei-dp-align-cell:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
.ei-dp-align-cell[data-active="true"] { color: ${accentColor}; }
.ei-dp-align-cell[data-row-active="true"] { color: rgba(255,255,255,0.45); }
.ei-dp-gap-field { display: flex; align-items: center; height: 24px; border-radius: 5px; border: 1px solid transparent; background: rgba(255,255,255,0.06); cursor: text; overflow: hidden; transition: border-color 0.15s ease; position: relative; min-width: 0; }
.ei-dp-gap-field:focus-within { border-color: ${accentColor}; }
.ei-dp-gap-field .ei-dp-field-input { flex: 1; min-width: 0; }
.ei-dp-gap-trigger { flex-shrink: 0; display: flex; align-items: center; justify-content: center; height: 100%; width: 25px; cursor: pointer; color: rgba(255,255,255,0.4); transition: color 0.12s ease; }
.ei-dp-gap-trigger:hover { color: rgba(255,255,255,0.7); }
.ei-dp-gap-trigger svg { display: block; }
.ei-dp-size-field { display: flex; align-items: center; height: 24px; border-radius: 5px; border: 1px solid transparent; background: rgba(255,255,255,0.06); cursor: text; overflow: hidden; transition: border-color 0.15s ease; position: relative; min-width: 0; }
.ei-dp-size-field:focus-within { border-color: ${accentColor}; }
.ei-dp-size-field .ei-dp-field-input { flex: 1; min-width: 0; }
.ei-dp-size-trigger { flex-shrink: 0; display: flex; align-items: center; height: 100%; padding: 0 4px; cursor: pointer; color: rgba(255,255,255,0.45); font-size: 10px; border-left: none; transition: color 0.12s ease; }
.ei-dp-size-trigger:hover { color: rgba(255,255,255,0.7); }
.ei-dp-size-mode { font-size: 10px; letter-spacing: 0.05px; white-space: nowrap; }
.ei-dp-size-dropdown { position: absolute; z-index: 100; background: rgba(30,30,30,1); border-radius: 13px; padding: 8px; box-shadow: 0px 10px 16px rgba(0,0,0,0.35), 0px 2px 5px rgba(0,0,0,0.35), inset 0px 0.5px 0px rgba(255,255,255,0.08), inset 0px 0px 0.5px rgba(255,255,255,0.35); min-width: 150px; }
.ei-dp-size-option { display: flex; align-items: center; height: 24px; border-radius: 5px; cursor: pointer; padding: 0; gap: 0; color: rgba(255,255,255,0.85); transition: background 0.1s ease; }
.ei-dp-size-option:hover { background: rgba(255,255,255,0.08); }
.ei-dp-size-check { flex-shrink: 0; width: 26px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.85); }
.ei-dp-size-check svg { display: block; }
.ei-dp-size-option-icon { flex-shrink: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.85); }
.ei-dp-size-option-icon svg { display: block; }
.ei-dp-size-option-label { font-size: 11px; letter-spacing: 0.055px; white-space: nowrap; }
.ei-dp-stroke-panel { }
.ei-dp-stroke-color-wrapper { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
.ei-dp-stroke-color-row { display: flex; align-items: center; height: 24px; border-radius: 5px; background: rgba(255,255,255,0.06); overflow: hidden; flex: 1; }
.ei-dp-stroke-remove { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: none; background: transparent; color: rgba(255,255,255,0.4); cursor: pointer; border-radius: 4px; flex-shrink: 0; transition: color 0.12s ease; }
.ei-dp-stroke-remove:hover { color: rgba(255,255,255,0.7); }
.ei-dp-stroke-remove:focus { outline: none; }
.ei-dp-stroke-remove svg { display: block; }
.ei-dp-stroke-settings-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; align-items: center; }
.ei-dp-stroke-pos-btn { display: flex; align-items: center; justify-content: space-between; height: 24px; padding: 0 8px; border: none; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); font-size: 11px; font-family: inherit; cursor: pointer; border-radius: 5px; width: 100%; transition: background 0.12s ease; }
.ei-dp-stroke-pos-btn:hover { background: rgba(255,255,255,0.1); }
.ei-dp-stroke-pos-btn:focus { outline: none; }
.ei-dp-stroke-pos-arrow { display: flex; align-items: center; color: rgba(255,255,255,0.4); }
.ei-dp-stroke-pos-arrow svg { display: block; }
.ei-dp-stroke-sides-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.ei-dp-font-select { display: flex; align-items: center; justify-content: space-between; height: 24px; border-radius: 5px; background: rgba(255,255,255,0.06); padding: 0 8px; cursor: pointer; margin-bottom: 8px; transition: background 0.12s ease; }
.ei-dp-font-select:hover { background: rgba(255,255,255,0.1); }
.ei-dp-font-text { font-size: 11px; color: rgba(255,255,255,0.85); letter-spacing: 0.055px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ei-dp-font-arrow { display: flex; align-items: center; color: rgba(255,255,255,0.4); flex-shrink: 0; margin-left: 8px; }
.ei-dp-font-arrow svg { display: block; }
.ei-dp-font-dropdown { position: absolute; z-index: 100; background: rgba(30,30,30,1); border-radius: 13px; padding: 8px; box-shadow: 0px 10px 16px rgba(0,0,0,0.35), 0px 2px 5px rgba(0,0,0,0.35), inset 0px 0.5px 0px rgba(255,255,255,0.08), inset 0px 0px 0.5px rgba(255,255,255,0.35); min-width: 180px; max-height: 200px; overflow-y: auto; }
.ei-dp-font-option { display: flex; align-items: center; height: 28px; padding: 0 8px; border-radius: 5px; cursor: pointer; font-size: 11px; color: rgba(255,255,255,0.85); letter-spacing: 0.055px; transition: background 0.1s ease; }
.ei-dp-font-option:hover { background: rgba(255,255,255,0.08); }
.ei-dp-font-option[data-active="true"] { background: rgba(255,255,255,0.12); }
.ei-dp-typography-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.ei-dp-align-btns { display: flex; height: 24px; border-radius: 5px; background: rgba(255,255,255,0.06); overflow: hidden; }
.ei-dp-align-btn { flex: 1; height: 24px; border: none; background: transparent; color: rgba(255,255,255,0.4); cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; transition: all 0.12s ease; }
.ei-dp-align-btn svg { display: block; }
.ei-dp-align-btn:hover { color: rgba(255,255,255,0.7); }
.ei-dp-align-btn[data-active="true"] { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.05); box-shadow: inset 0 0 0 0.5px rgba(255,255,255,0.05); }
.ei-dp-field-line-height { gap: 4px; }
`
}
