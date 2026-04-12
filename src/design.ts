import type { InspectorInfo, StyleDiff } from './types'
import { i18n } from './i18n'
import { collectPageColors, normalizeColorValue, rgbToHex } from './utils'

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
  const applied = new Map<string, string>()

  return {
    apply(property: string, value: string): void {
      if (!originals.has(property)) {
        originals.set(property, window.getComputedStyle(element).getPropertyValue(property))
      }
      const original = originals.get(property) ?? ''
      if (value === original) applied.delete(property)
      else applied.set(property, value)
      element.style.setProperty(property, value)
      onChange?.()
    },

    reset(): void {
      for (const [prop] of originals) {
        element.style.removeProperty(prop)
      }
      originals.clear()
      applied.clear()
    },

    getDiffs(): StyleDiff[] {
      const diffs: StyleDiff[] = []
      for (const [prop, original] of originals) {
        const current = applied.get(prop) ?? element.style.getPropertyValue(prop)
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

// --- Margin direction SVG icons (external space |o ō o| style) ---
const MARGIN_ICONS: Record<string, string> = {
  left: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M5 7.5a.5.5 0 0 0-1 0v9a.5.5 0 0 0 1 0v-9ZM12 11v2h-2v-2h2Zm0-1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h2Z" fill="currentColor" fill-opacity="0.4"/></svg>`,
  top: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 5a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9ZM12 11v2h-2v-2h2Zm0-1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h2Z" fill="currentColor" fill-opacity="0.4"/></svg>`,
  right: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M20 7.5a.5.5 0 0 0-1 0v9a.5.5 0 0 0 1 0v-9ZM12 11v2h-2v-2h2Zm0-1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h2Z" fill="currentColor" fill-opacity="0.4"/></svg>`,
  bottom: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 11v2h-2v-2h2Zm0-1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h2ZM7.5 18a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1h-9Z" fill="currentColor" fill-opacity="0.4"/></svg>`,
}

const FIELD_ICONS: Record<string, string> = {
  opacity: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 7h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM6 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8Zm9 1.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Zm-1.5 2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm-2 2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm-2 2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm2 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm2-2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm0 2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm2-4a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm0 2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm0 2a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  radius: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.9 6h-.02c-.403 0-.735 0-1.006.022-.28.023-.54.072-.782.196a2 2 0 0 0-.874.874c-.124.243-.173.501-.196.782C6 8.144 6 8.477 6 8.88V9.5a.5.5 0 0 0 1 0V8.9c0-.428 0-.72.019-.944.018-.22.05-.332.09-.41a1 1 0 0 1 .437-.437c.078-.04.19-.072.41-.09C8.18 7 8.472 7 8.9 7H9.5a.5.5 0 0 0 0-1H8.9Zm6.2 0h.02c.403 0 .735 0 1.006.022.28.023.54.072.782.196a2 2 0 0 1 .874.874c.124.243.173.501.196.782.022.27.022.603.022 1.005V9.5a.5.5 0 0 1-1 0V8.9c0-.428 0-.72-.019-.944-.018-.22-.05-.332-.09-.41a1 1 0 0 0-.437-.437c-.078-.04-.19-.072-.41-.09A17 17 0 0 0 15.1 7H14.5a.5.5 0 0 1 0-1h.6Zm.02 12H14.5a.5.5 0 0 1 0-1h.6c.428 0 .72 0 .944-.019.22-.018.332-.05.41-.09a1 1 0 0 0 .437-.437c.04-.078.072-.19.09-.41.019-.225.019-.516.019-.944V14.5a.5.5 0 0 1 1 0v.62c0 .403 0 .735-.022 1.006-.023.281-.072.54-.196.782a2 2 0 0 1-.874.874c-.243.124-.5.173-.782.196-.27.022-.603.022-1.006.022M8.9 18h-.02c-.403 0-.735 0-1.006-.022-.28-.023-.541-.072-.782-.196a2 2 0 0 1-.874-.874c-.124-.243-.174-.501-.196-.782A18 18 0 0 1 6 15.12V14.5a.5.5 0 0 1 1 0v.6c0 .428 0 .82.019.944.018.22.05.332.09.41a1 1 0 0 0 .437.437c.078.04.19.072.41.09.225.019.516.019.944.019H9.5a.5.5 0 0 1 0 1H8.9Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  radiusSettings: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M 2.498505115509033 12 C 2.631113365292549 12 2.7582907006144524 11.947321958839893 2.8520588874816895 11.853553771972656 C 2.9458270743489265 11.75978558510542 2.998505115509033 11.632608249783516 2.998505115509033 11.5 L 2.998505115509033 9.949999809265137 C 3.563649356365204 9.835242375731468 4.07174214720726 9.528635561466217 4.4366936683654785 9.08212947845459 C 4.801645189523697 8.635623395442963 5.001011371612549 8.076677799224854 5.001011371612549 7.5 C 5.001011371612549 6.9233222007751465 4.801645189523697 6.364376604557037 4.4366936683654785 5.91787052154541 C 4.07174214720726 5.471364438533783 3.563649356365204 5.164757624268532 2.998505115509033 5.050000190734863 L 2.998505115509033 0.5 C 2.998505115509033 0.36739175021648407 2.9458270743489265 0.24021489173173904 2.8520588874816895 0.14644670486450195 C 2.7582907006144524 0.05267851799726486 2.631113365292549 0 2.498505115509033 0 C 2.3658968657255173 0 2.238719530403614 0.05267851799726486 2.144951343536377 0.14644670486450195 C 2.05118315666914 0.24021489173173904 1.9985051155090332 0.36739175021648407 1.9985051155090332 0.5 L 1.9985051155090332 5.050000190734863 C 1.434184968471527 5.165742203593254 0.9271209537982941 5.472745716571808 0.562993049621582 5.919136047363281 C 0.19886514544487 6.365526378154755 0 6.923932790756226 0 7.5 C -8.881784197001252e-16 8.076067209243774 0.19886514544487 8.634473621845245 0.562993049621582 9.080863952636719 C 0.9271209537982941 9.527254283428192 1.434184968471527 9.834257796406746 1.9985051155090332 9.949999809265137 L 1.9985051155090332 11.5 C 1.9985051155090332 11.632608249783516 2.05118315666914 11.75978558510542 2.144951343536377 11.853553771972656 C 2.238719530403614 11.947321958839893 2.3658968657255173 12 2.498505115509033 12 Z M 9.498504638671875 12 C 9.631112888455391 12 9.758290223777294 11.947321958839893 9.852058410644531 11.853553771972656 C 9.945826597511768 11.75978558510542 9.998504638671875 11.632608249783516 9.998504638671875 11.5 L 9.998504638671875 6.949999809265137 C 10.562824785709381 6.834257796406746 11.069889277219772 6.527254283428192 11.434017181396484 6.080863952636719 C 11.798145085573196 5.634473621845245 11.99700927734375 5.076067209243774 11.99700927734375 4.5 C 11.99700927734375 3.9239327907562256 11.798145085573196 3.3655263781547546 11.434017181396484 2.9191360473632812 C 11.069889277219772 2.472745716571808 10.562824785709381 2.165742203593254 9.998504638671875 2.0500001907348633 L 9.998504638671875 0.5 C 9.998504638671875 0.36739175021648407 9.945826597511768 0.24021489173173904 9.852058410644531 0.14644670486450195 C 9.758290223777294 0.05267851799726486 9.631112888455391 0 9.498504638671875 0 C 9.365896388888359 0 9.238719053566456 0.05267851799726486 9.144950866699219 0.14644670486450195 C 9.051182679831982 0.24021489173173904 8.998504638671875 0.36739175021648407 8.998504638671875 0.5 L 8.998504638671875 2.0500001907348633 C 8.433360397815704 2.164757624268532 7.925268083810806 2.471364438533783 7.560316562652588 2.91787052154541 C 7.1953650414943695 3.3643766045570374 6.995998859405518 3.9233222007751465 6.995998859405518 4.5 C 6.995998859405518 5.0766777992248535 7.1953650414943695 5.635623395442963 7.560316562652588 6.08212947845459 C 7.925268083810806 6.528635561466217 8.433360397815704 6.835242375731468 8.998504638671875 6.949999809265137 L 8.998504638671875 11.5 C 8.998504638671875 11.632608249783516 9.051182679831982 11.75978558510542 9.144950866699219 11.853553771972656 C 9.238719053566456 11.947321958839893 9.365896388888359 12 9.498504638671875 12 Z M 9.498504638671875 6 C 9.100679904222488 5.999999999999998 8.719149798154831 5.841964930295944 8.437845230102539 5.560660362243652 C 8.156540662050247 5.2793557941913605 7.998505115509033 4.897824734449387 7.998505115509033 4.5 C 7.998505115509033 4.102175265550613 8.156540662050247 3.7206442058086395 8.437845230102539 3.4393396377563477 C 8.719149798154831 3.158035069704056 9.100679904222488 3.0000000000000018 9.498504638671875 3 C 9.896329373121262 3.0000000000000018 10.277859479188919 3.158035069704056 10.559164047241211 3.4393396377563477 C 10.840468615293503 3.7206442058086395 10.998504638671875 4.102175265550613 10.998504638671875 4.5 C 10.998504638671875 4.897824734449387 10.840468615293503 5.2793557941913605 10.559164047241211 5.560660362243652 C 10.277859479188919 5.841964930295944 9.896329373121262 5.999999999999998 9.498504638671875 6 Z M 2.498505115509033 9 C 2.1006803810596466 8.999999999999998 1.7191493213176727 8.841964930295944 1.4378447532653809 8.560660362243652 C 1.156540185213089 8.27935579419136 0.9985051155090332 7.897824734449387 0.9985051155090332 7.5 C 0.9985051155090332 7.102175265550613 1.156540185213089 6.7206442058086395 1.4378447532653809 6.439339637756348 C 1.7191493213176727 6.158035069704056 2.1006803810596466 6.000000000000002 2.498505115509033 6 C 2.89632984995842 6.000000000000002 3.2778609097003937 6.158035069704056 3.5591654777526855 6.439339637756348 C 3.8404700458049774 6.7206442058086395 3.9985051155090314 7.102175265550613 3.998505115509033 7.5 C 3.9985051155090314 7.897824734449387 3.8404700458049774 8.27935579419136 3.5591654777526855 8.560660362243652 C 3.2778609097003937 8.841964930295944 2.89632984995842 8.999999999999998 2.498505115509033 9 Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  gap: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M15 14.75c0 .138.112.25.25.25h.25a.5.5 0 0 1 0 1h-.25A1.25 1.25 0 0 1 14 14.75v-6.5C14 7.56 14.56 7 15.25 7h.25a.5.5 0 0 1 0 1h-.25a.25.25 0 0 0-.25.25v6.5ZM7 15.5a.5.5 0 0 1 .5-.5h.25a.25.25 0 0 0 .25-.25v-6.5A.25.25 0 0 0 7.75 8H7.5a.5.5 0 0 1 0-1h.25C8.44 7 9 7.56 9 8.25v6.5C9 15.44 8.44 16 7.75 16H7.5a.5.5 0 0 1-.5-.5Zm4-2a.5.5 0 0 0 1 0v-4a.5.5 0 0 0-1 0v4Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  strokeWeight: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 8.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Zm0 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Zm0 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  lineHeight: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M17.5 17C17.6326 17 17.7598 17.0527 17.8536 17.1464C17.9473 17.2402 18 17.3674 18 17.5C18 17.6326 17.9473 17.7598 17.8536 17.8536C17.7598 17.9473 17.6326 18 17.5 18H6.5C6.36739 18 6.24021 17.9473 6.14645 17.8536C6.05268 17.7598 6 17.6326 6 17.5C6 17.3674 6.05268 17.2402 6.14645 17.1464C6.24021 17.0527 6.36739 17 6.5 17H17.5ZM12.25 8C12.3559 8 12.459 8.0336 12.5445 8.09596C12.6301 8.15832 12.6936 8.24622 12.726 8.347L14.976 15.347C15.0154 15.4729 15.0034 15.6093 14.9427 15.7264C14.882 15.8436 14.7774 15.932 14.6518 15.9723C14.5262 16.0127 14.3897 16.0018 14.2721 15.942C14.1545 15.8822 14.0653 15.7783 14.024 15.653L13.494 14H10.507L9.976 15.653C9.93465 15.7783 9.84546 15.8822 9.72786 15.942C9.61026 16.0018 9.47379 16.0127 9.34818 15.9723C9.22257 15.932 9.11801 15.8436 9.05729 15.7264C8.99657 15.6093 8.9846 15.4729 9.024 15.347L11.274 8.347L11.304 8.272C11.346 8.18995 11.4099 8.12112 11.4887 8.07312C11.5674 8.02512 11.6578 7.99981 11.75 8H12.25ZM10.828 13H13.172L12 9.354L10.828 13ZM17.5 6C17.6326 6 17.7598 6.05268 17.8536 6.14645C17.9473 6.24021 18 6.36739 18 6.5C18 6.63261 17.9473 6.75979 17.8536 6.85355C17.7598 6.94732 17.6326 7 17.5 7H6.5C6.36739 7 6.24021 6.94732 6.14645 6.85355C6.05268 6.75979 6 6.63261 6 6.5C6 6.36739 6.05268 6.24021 6.14645 6.14645C6.24021 6.05268 6.36739 6 6.5 6H17.5Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  letterSpacing: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6.5 6C6.63261 6 6.75975 6.05272 6.85352 6.14648C6.94728 6.24025 7 6.36739 7 6.5V17.5C7 17.6326 6.94728 17.7597 6.85352 17.8535C6.75975 17.9473 6.63261 18 6.5 18C6.36739 18 6.24025 17.9473 6.14648 17.8535C6.05272 17.7597 6 17.6326 6 17.5V6.5C6 6.36739 6.05272 6.24025 6.14648 6.14648C6.24025 6.05272 6.36739 6 6.5 6ZM17.5 6C17.6326 6 17.7597 6.05272 17.8535 6.14648C17.9473 6.24025 18 6.36739 18 6.5V17.5C18 17.6326 17.9473 17.7597 17.8535 17.8535C17.7597 17.9473 17.6326 18 17.5 18C17.3674 18 17.2403 17.9473 17.1465 17.8535C17.0527 17.7597 17 17.6326 17 17.5V6.5C17 6.36739 17.0527 6.24025 17.1465 6.14648C17.2403 6.05272 17.3674 6 17.5 6ZM12.25 8C12.3559 8 12.4594 8.03334 12.5449 8.0957C12.6303 8.15797 12.6932 8.24612 12.7256 8.34668L14.9756 15.3467C15.015 15.4726 15.0031 15.6094 14.9424 15.7266C14.8816 15.8436 14.7769 15.9323 14.6514 15.9727C14.526 16.0128 14.3898 16.0019 14.2725 15.9424C14.155 15.8826 14.0658 15.7784 14.0244 15.6533L13.4941 14H10.5068L9.97559 15.6533C9.93418 15.7784 9.84501 15.8826 9.72754 15.9424C9.61019 16.0019 9.47395 16.0128 9.34863 15.9727C9.2231 15.9323 9.11836 15.8436 9.05762 15.7266C8.99689 15.6094 8.98501 15.4726 9.02441 15.3467L11.2744 8.34668L11.3037 8.27246C11.3457 8.19053 11.4097 8.12123 11.4883 8.07324C11.567 8.02525 11.6578 7.99982 11.75 8H12.25ZM10.8281 13H13.1719L12 9.35352L10.8281 13Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
}

const CORNER_ICONS: Record<string, string> = {
  TL: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 12V6A2 2 0 0 1 6 4H12" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  TR: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 12V6A2 2 0 0 0 10 4H4" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  BR: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4V10A2 2 0 0 1 10 12H4" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  BL: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4V10A2 2 0 0 0 6 12H12" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
}

// --- Restore icon (24×24 from Figma) ---
const RESTORE_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.854 7.146C8.90056 7.19245 8.93751 7.24762 8.96271 7.30837C8.98792 7.36911 9.00089 7.43423 9.00089 7.5C9.00089 7.56577 8.98792 7.63089 8.96271 7.69163C8.93751 7.75238 8.90056 7.80755 8.854 7.854L6.707 10H15.5C16.4283 10 17.3185 10.3687 17.9749 11.0251C18.6313 11.6815 19 12.5717 19 13.5C19 14.4283 18.6313 15.3185 17.9749 15.9749C17.3185 16.6313 16.4283 17 15.5 17H14.5C14.3674 17 14.2402 16.9473 14.1464 16.8536C14.0527 16.7598 14 16.6326 14 16.5C14 16.3674 14.0527 16.2402 14.1464 16.1464C14.2402 16.0527 14.3674 16 14.5 16H15.5C16.163 16 16.7989 15.7366 17.2678 15.2678C17.7366 14.7989 18 14.163 18 13.5C18 12.837 17.7366 12.2011 17.2678 11.7322C16.7989 11.2634 16.163 11 15.5 11H6.707L8.854 13.146C8.94789 13.2399 9.00063 13.3672 9.00063 13.5C9.00063 13.6328 8.94789 13.7601 8.854 13.854C8.76011 13.9479 8.63278 14.0006 8.5 14.0006C8.36722 14.0006 8.23989 13.9479 8.146 13.854L5.146 10.854C5.05226 10.7602 4.99961 10.6331 4.99961 10.5005C4.99961 10.3679 5.05226 10.2408 5.146 10.147L8.146 7.147C8.19245 7.10044 8.24762 7.06349 8.30837 7.03829C8.36911 7.01308 8.43423 7.00011 8.5 7.00011C8.56577 7.00011 8.63089 7.01308 8.69163 7.03829C8.75238 7.06349 8.80755 7.09944 8.854 7.146Z" fill="currentColor" fill-opacity="0.7"/></svg>`

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
  fixed: i18n.design.fixed,
  hug: i18n.design.hug,
  fill: i18n.design.fill,
}

const SIZING_FULL_LABELS: Record<string, Record<SizingMode, string>> = {
  width: { fixed: i18n.design.fixedWidth, hug: i18n.design.hugContents, fill: i18n.design.fillContainer },
  height: { fixed: i18n.design.fixedHeight, hug: i18n.design.hugContents, fill: i18n.design.fillContainer },
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
  onChange: () => void
}

function createGapField(options: GapFieldOptions): HTMLDivElement {
  const { value, tracker, onChange } = options
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
        input.value = i18n.design.auto
        input.style.color = 'var(--text-tertiary)'
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
    })
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
      check.style.color = 'var(--interactive-accent)'
    }

    const iconWrap = el('span', 'ei-dp-size-option-icon')
    iconWrap.innerHTML = mode === 'fixed' ? (SIZE_ICONS.fixed ?? '') : (SIZE_ICONS.hug ?? '')

    const label = el('span', 'ei-dp-size-option-label', mode === 'fixed' ? i18n.design.fixed : i18n.design.auto)

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
  button.title = i18n.design.editCornerRadii
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
  onChange: () => void
}

function createSizeField(options: SizeFieldOptions): HTMLDivElement {
  const { icon, dimension, value, element, tracker, onChange } = options

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
    })
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
      check.style.color = 'var(--interactive-accent)'
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

// --- Color Fill Controls ---

type FillKind = 'solid' | 'gradient' | 'image'
type GradientType = 'linear' | 'radial'
type ImageFit = 'cover' | 'contain' | 'auto'

type GradientStop = {
  id: string
  color: string
  position: number
  opacity: number
}

type FillDraft = {
  kind: FillKind
  color: string
  opacity: number
  gradientType: GradientType
  gradientAngle: number
  gradientStops: GradientStop[]
  activeGradientStopId: string
  imageUrl: string
  imageFit: ImageFit
}

type FillRowOptions = {
  value: string
  opacity?: number
  className?: string
  onChange: (value: string) => void
  onOpacityChange?: (opacity: number, currentHex: string) => void
  onSwatchClick?: (swatch: HTMLDivElement) => void
}

function ensureHexColor(value: string, fallback = '#FFFFFF'): string {
  const normalized = normalizeColorValue(value)
  if (!normalized) return fallback
  if (normalized.startsWith('#')) return normalized.length === 4
    ? `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`.toUpperCase()
    : normalized.slice(0, 7).toUpperCase()
  return fallback
}

function cssUrlValue(url: string): string {
  return `url("${url.replace(/"/g, '%22')}")`
}

function extractCssUrl(value: string): string {
  const match = value.match(/url\((['"]?)(.*?)\1\)/i)
  return match?.[2] ?? ''
}

function createGradientCss(draft: FillDraft): string {
  const withAlpha = (hex: string, opacity: number): string => {
    const { r, g, b } = hexToRgb(hex)
    return opacity >= 100 ? hex : `rgba(${r}, ${g}, ${b}, ${opacity / 100})`
  }
  const stops = draft.gradientStops
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(stop => `${withAlpha(stop.color, stop.opacity)} ${stop.position}%`)
    .join(', ')
  if (draft.gradientType === 'radial') {
    return `radial-gradient(circle, ${stops})`
  }
  return `linear-gradient(${draft.gradientAngle}deg, ${stops})`
}

function createGradientStop(color: string, position: number, opacity = 100): GradientStop {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    color,
    position,
    opacity,
  }
}

function getActiveGradientStop(draft: FillDraft): GradientStop {
  return draft.gradientStops.find(stop => stop.id === draft.activeGradientStopId) ?? draft.gradientStops[0]!
}

function setActiveGradientStop(draft: FillDraft, id: string): void {
  draft.activeGradientStopId = id
}

function removeGradientStop(draft: FillDraft, id: string): void {
  if (draft.gradientStops.length <= 2) return
  draft.gradientStops = draft.gradientStops.filter(stop => stop.id !== id)
  if (draft.activeGradientStopId === id) {
    draft.activeGradientStopId = draft.gradientStops[0]!.id
  }
}

function addGradientStop(draft: FillDraft): void {
  const active = getActiveGradientStop(draft)
  const nextPosition = clamp(active.position + 10, 0, 100)
  const stop = createGradientStop(active.color, nextPosition, active.opacity)
  draft.gradientStops = [...draft.gradientStops, stop]
  draft.activeGradientStopId = stop.id
}

function sortGradientStops(draft: FillDraft): void {
  draft.gradientStops = draft.gradientStops.slice().sort((a, b) => a.position - b.position)
}

function updateGradientStop(draft: FillDraft, id: string, patch: Partial<GradientStop>): void {
  draft.gradientStops = draft.gradientStops.map(stop => stop.id === id ? { ...stop, ...patch } : stop)
  sortGradientStops(draft)
}

function parseGradientStops(backgroundImage: string, fallbackColor: string): GradientStop[] {
  const matches = [...backgroundImage.matchAll(/(rgba?\([^)]*\)|#[0-9A-Fa-f]{3,8})\s+(\d+)%/g)]
  if (matches.length >= 2) {
    return matches.slice(0, 8).map((match, index) => createGradientStop(ensureHexColor(match[1] ?? fallbackColor, fallbackColor), Number(match[2] ?? index * 100), 100))
  }
  return [
    createGradientStop(fallbackColor, 0, 100),
    createGradientStop('#737373', 100, 100),
  ]
}

type RgbColor = { r: number; g: number; b: number }
type HsvColor = { h: number; s: number; v: number }
type HslColor = { h: number; s: number; l: number }
type ColorFormat = 'hex' | 'rgb' | 'css' | 'hsl' | 'hsb'

function hexToRgb(value: string): RgbColor {
  const hex = ensureHexColor(value).slice(1)
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  }
}

function rgbToHsvColor(rgb: RgbColor): HsvColor {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max }
}

function hsvToHexColor(hsv: HsvColor): string {
  const c = hsv.v * hsv.s
  const x = c * (1 - Math.abs((hsv.h / 60) % 2 - 1))
  const m = hsv.v - c
  let r = 0
  let g = 0
  let b = 0
  if (hsv.h < 60) [r, g, b] = [c, x, 0]
  else if (hsv.h < 120) [r, g, b] = [x, c, 0]
  else if (hsv.h < 180) [r, g, b] = [0, c, x]
  else if (hsv.h < 240) [r, g, b] = [0, x, c]
  else if (hsv.h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return `#${[r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

function rgbToHslColor(rgb: RgbColor): HslColor {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s, l }
}

function hslToHexColor(hsl: HslColor): string {
  const h = hsl.h
  const s = hsl.s
  const l = hsl.l
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return `#${[r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

function rgbToHexColor(rgb: RgbColor): string {
  return `#${[rgb.r, rgb.g, rgb.b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

function formatColorValue(value: string, format: ColorFormat, opacity = 100): string {
  const hex = ensureHexColor(value)
  const rgb = hexToRgb(hex)
  if (format === 'hex') return hex.replace('#', '')
  if (format === 'rgb') return `${rgb.r}, ${rgb.g}, ${rgb.b}`
  if (format === 'css') return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.round(opacity) / 100})`
  if (format === 'hsl') {
    const hsl = rgbToHslColor(rgb)
    return `${Math.round(hsl.h)}°, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%`
  }
  const hsv = rgbToHsvColor(rgb)
  return `${Math.round(hsv.h)}°, ${Math.round(hsv.s * 100)}%, ${Math.round(hsv.v * 100)}%`
}

function createFillDraft(element: HTMLElement, info: InspectorInfo): FillDraft {
  const style = window.getComputedStyle(element)
  const backgroundImage = style.getPropertyValue('background-image')
  const backgroundColor = ensureHexColor(style.getPropertyValue('background-color'), '#FFFFFF')
  const isGradient = backgroundImage.includes('gradient(')
  const isImage = backgroundImage.includes('url(')

  const gradientStops = parseGradientStops(backgroundImage, backgroundColor)
  return {
    kind: isImage ? 'image' : isGradient ? 'gradient' : 'solid',
    color: backgroundColor,
    opacity: Number(info.visual.backgroundOpacity) || 100,
    gradientType: backgroundImage.includes('radial-gradient(') ? 'radial' : 'linear',
    gradientAngle: 90,
    gradientStops,
    activeGradientStopId: gradientStops[0]!.id,
    imageUrl: isImage ? extractCssUrl(backgroundImage) : '',
    imageFit: (style.getPropertyValue('background-size') as ImageFit) || 'cover',
  }
}

function createFillRow(options: FillRowOptions): HTMLDivElement {
  const { value, opacity = 100, className = '', onChange, onOpacityChange, onSwatchClick } = options
  const wrap = el('div', `ei-dp-fill-row${className ? ` ${className}` : ''}`)
  let currentHex = ensureHexColor(value)

  const swatch = el('div', 'ei-dp-swatch')
  swatch.style.background = currentHex

  const picker = document.createElement('input')
  picker.type = 'color'
  picker.className = 'ei-dp-picker'
  picker.setAttribute(IGNORE_ATTR, 'true')
  picker.value = currentHex
  picker.tabIndex = -1
  if (onSwatchClick) {
    picker.style.pointerEvents = 'none'
  }

  const hexInput = document.createElement('input')
  hexInput.type = 'text'
  hexInput.className = 'ei-dp-hex'
  hexInput.setAttribute(IGNORE_ATTR, 'true')
  hexInput.value = currentHex.replace('#', '')

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
    const normalized = ensureHexColor(hex, currentHex)
    currentHex = normalized
    swatch.style.background = normalized
    hexInput.value = normalized.replace('#', '').toUpperCase()
    picker.value = normalized
    onChange(normalized)
  }

  picker.addEventListener('input', (e) => {
    e.stopPropagation()
    applyColor(picker.value)
  })

  picker.addEventListener('click', (e) => {
    if (!onSwatchClick) return
    e.preventDefault()
    e.stopPropagation()
  })

  swatch.addEventListener('click', (e) => {
    if (!onSwatchClick) return
    e.preventDefault()
    e.stopPropagation()
    onSwatchClick(swatch)
  })

  hexInput.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      let hex = hexInput.value.trim()
      if (!hex.startsWith('#')) hex = '#' + hex
      applyColor(hex)
      hexInput.blur()
    }
  })

  hexInput.addEventListener('blur', () => {
    let hex = hexInput.value.trim()
    if (!hex.startsWith('#')) hex = '#' + hex
    if (/^#[0-9A-Fa-f]{3,8}$/.test(hex)) applyColor(hex)
  })

  swatch.appendChild(picker)
  wrap.append(swatch, hexInput, opacityInput, opacitySuffix)
  return wrap
}

function createTextInput(value: string, placeholder: string, onChange: (value: string) => void): HTMLInputElement {
  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'ei-dp-text-field'
  input.value = value
  input.placeholder = placeholder
  input.setAttribute(IGNORE_ATTR, 'true')
  input.addEventListener('input', (e) => {
    e.stopPropagation()
    onChange(input.value.trim())
  })
  input.addEventListener('keydown', (e) => e.stopPropagation())
  return input
}

function createColorSegmentGroup(
  format: ColorFormat,
  draft: FillDraft,
  applySolid: () => void,
  applyImage: () => void,
  render: () => void,
): HTMLDivElement {
  const group = el('div', 'ei-dp-color-segment-group')
  group.dataset.format = format
  group.setAttribute(IGNORE_ATTR, 'true')

  if (draft.kind === 'image') {
    group.dataset.single = 'true'
    group.appendChild(createColorSegmentInput(draft.imageUrl, (value) => {
      draft.imageUrl = value
      applyImage()
    }))
    return group
  }

  if (draft.kind === 'gradient') {
    group.dataset.single = 'true'
    group.appendChild(createColorSegmentInput(createGradientCss(draft), () => undefined))
    return group
  }

  const rgb = hexToRgb(draft.color)
  const hsl = rgbToHslColor(rgb)
  const hsv = rgbToHsvColor(rgb)

  if (format === 'hex') {
    group.append(
      createColorSegmentInput(formatColorValue(draft.color, 'hex'), (value) => {
        draft.color = ensureHexColor(value.startsWith('#') ? value : `#${value}`, draft.color)
        applySolid()
        render()
      }),
      createColorNumberSegment(draft.opacity, 0, 100, (value) => {
        draft.opacity = value
        applySolid()
      }),
      el('span', 'ei-dp-color-segment-suffix', '%'),
    )
    return group
  }

  if (format === 'css') {
    group.dataset.single = 'true'
    group.appendChild(createColorSegmentInput(formatColorValue(draft.color, 'css', draft.opacity), (value) => {
      const hex = rgbToHex(value)
      if (hex) {
        draft.color = hex
        const alphaMatch = value.match(/rgba?\([^)]*,\s*([\d.]+)\s*\)/i)
        if (alphaMatch) draft.opacity = clamp(Number(alphaMatch[1]) * 100, 0, 100)
        applySolid()
        render()
      }
    }))
    return group
  }

  if (format === 'rgb') {
    group.append(
      createColorNumberSegment(rgb.r, 0, 255, (value) => {
        draft.color = rgbToHexColor({ ...rgb, r: value })
        applySolid()
        render()
      }),
      createColorNumberSegment(rgb.g, 0, 255, (value) => {
        draft.color = rgbToHexColor({ ...rgb, g: value })
        applySolid()
        render()
      }),
      createColorNumberSegment(rgb.b, 0, 255, (value) => {
        draft.color = rgbToHexColor({ ...rgb, b: value })
        applySolid()
        render()
      }),
      createColorNumberSegment(draft.opacity, 0, 100, (value) => {
        draft.opacity = value
        applySolid()
      }),
      el('span', 'ei-dp-color-segment-suffix', '%'),
    )
    return group
  }

  if (format === 'hsl') {
    group.append(
      createColorNumberSegment(Math.round(hsl.h), 0, 360, (value) => {
        draft.color = hslToHexColor({ ...hsl, h: value })
        applySolid()
        render()
      }),
      createColorNumberSegment(Math.round(hsl.s * 100), 0, 100, (value) => {
        draft.color = hslToHexColor({ ...hsl, s: value / 100 })
        applySolid()
        render()
      }),
      createColorNumberSegment(Math.round(hsl.l * 100), 0, 100, (value) => {
        draft.color = hslToHexColor({ ...hsl, l: value / 100 })
        applySolid()
        render()
      }),
      createColorNumberSegment(draft.opacity, 0, 100, (value) => {
        draft.opacity = value
        applySolid()
      }),
      el('span', 'ei-dp-color-segment-suffix', '%'),
    )
    return group
  }

  group.append(
    createColorNumberSegment(Math.round(hsv.h), 0, 360, (value) => {
      draft.color = hsvToHexColor({ ...hsv, h: value })
      applySolid()
      render()
    }),
    createColorNumberSegment(Math.round(hsv.s * 100), 0, 100, (value) => {
      draft.color = hsvToHexColor({ ...hsv, s: value / 100 })
      applySolid()
      render()
    }),
    createColorNumberSegment(Math.round(hsv.v * 100), 0, 100, (value) => {
      draft.color = hsvToHexColor({ ...hsv, v: value / 100 })
      applySolid()
      render()
    }),
    createColorNumberSegment(draft.opacity, 0, 100, (value) => {
      draft.opacity = value
      applySolid()
    }),
    el('span', 'ei-dp-color-segment-suffix', '%'),
  )
  return group
}

function createColorSegmentInput(value: string, onChange: (value: string) => void): HTMLInputElement {
  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'ei-dp-color-segment-input'
  input.value = value
  input.setAttribute(IGNORE_ATTR, 'true')
  input.addEventListener('input', (event) => {
    event.stopPropagation()
    onChange(input.value.trim())
  })
  input.addEventListener('keydown', (event) => event.stopPropagation())
  return input
}

function createColorNumberSegment(value: number, min: number, max: number, onChange: (value: number) => void): HTMLInputElement {
  const input = createNumberInput({
    value,
    min,
    max,
    step: 1,
    onChange,
  })
  input.className = 'ei-dp-color-segment-input ei-dp-color-segment-number'
  return input
}

function createFillModeTabs(active: FillKind, onSelect: (kind: FillKind) => void): HTMLDivElement {
  const tabs = el('div', 'ei-dp-fill-modebar')
  const items: Array<{ kind: FillKind; icon: string; label: string }> = [
    { kind: 'solid', label: 'Solid', icon: '<svg viewBox="0 0 20 20"><rect x="4" y="4" width="12" height="12" rx="1.5"/></svg>' },
    { kind: 'gradient', label: 'Gradient', icon: '<svg viewBox="0 0 20 20"><rect x="4" y="4" width="12" height="12" rx="1.5"/><circle cx="8" cy="8" r="1.2"/><circle cx="12" cy="12" r="1.2"/></svg>' },
    { kind: 'image', label: 'Image', icon: '<svg viewBox="0 0 20 20"><rect x="4" y="4" width="12" height="12" rx="1.5"/><path d="M6 14l3-3 2 2 2-3 2 4"/></svg>' },
  ]
  for (const item of items) {
    const btn = el('button', 'ei-dp-fill-mode-btn')
    btn.type = 'button'
    btn.title = item.label
    btn.innerHTML = item.icon
    btn.setAttribute(IGNORE_ATTR, 'true')
    if (item.kind === active) btn.dataset.active = 'true'
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      onSelect(item.kind)
    })
    tabs.appendChild(btn)
  }
  return tabs
}

function createFillPopoverChrome(content: HTMLElement): HTMLDivElement {
  const chrome = el('div', 'ei-dp-fill-chrome')
  const header = el('div', 'ei-dp-fill-chrome-header')
  const tabs = el('div', 'ei-dp-fill-chrome-tabs')
  const custom = el('button', 'ei-dp-fill-chrome-tab', 'Custom')
  const libraries = el('button', 'ei-dp-fill-chrome-tab', 'Libraries')
  custom.type = 'button'
  libraries.type = 'button'
  custom.dataset.active = 'true'
  custom.setAttribute(IGNORE_ATTR, 'true')
  libraries.setAttribute(IGNORE_ATTR, 'true')
  const setChromeTab = (active: HTMLButtonElement): void => {
    custom.dataset.active = active === custom ? 'true' : 'false'
    libraries.dataset.active = active === libraries ? 'true' : 'false'
  }
  custom.addEventListener('click', (e) => {
    e.stopPropagation()
    setChromeTab(custom)
  })
  libraries.addEventListener('click', (e) => {
    e.stopPropagation()
    setChromeTab(libraries)
  })
  tabs.append(custom, libraries)
  const actions = el('div', 'ei-dp-fill-chrome-actions')
  const add = el('button', 'ei-dp-fill-chrome-action', '+')
  const close = el('button', 'ei-dp-fill-chrome-action', '×')
  add.type = 'button'
  close.type = 'button'
  add.setAttribute(IGNORE_ATTR, 'true')
  close.setAttribute(IGNORE_ATTR, 'true')
  add.addEventListener('click', (e) => {
    e.stopPropagation()
    custom.click()
  })
  close.addEventListener('click', (e) => {
    e.stopPropagation()
    closeFillPopover()
  })
  actions.append(add, close)
  header.append(tabs, actions)
  chrome.append(header, content)
  return chrome
}

function createPageColorGrid(colors: string[], onSelect: (color: string) => void): HTMLDivElement {
  const wrap = el('div', 'ei-dp-page-colors')
  const title = el('button', 'ei-dp-page-colors-title') as HTMLButtonElement
  title.type = 'button'
  title.setAttribute(IGNORE_ATTR, 'true')
  title.dataset.open = 'true'
  const arrow = el('span', 'ei-dp-page-colors-title-arrow')
  arrow.innerHTML = DOWN_ARROW_ICON
  title.append(
    el('span', 'ei-dp-page-colors-title-text', 'On this page'),
    arrow,
  )
  const grid = el('div', 'ei-dp-page-colors-grid')
  title.addEventListener('click', (e) => {
    e.stopPropagation()
    const open = title.dataset.open !== 'false'
    title.dataset.open = open ? 'false' : 'true'
    grid.style.display = open ? 'none' : 'grid'
  })

  for (const color of colors) {
    const swatch = el('button', 'ei-dp-page-color')
    swatch.type = 'button'
    swatch.title = color
    swatch.style.background = color
    swatch.setAttribute(IGNORE_ATTR, 'true')
    swatch.addEventListener('click', (e) => {
      e.stopPropagation()
      onSelect(color)
    })
    grid.appendChild(swatch)
  }

  wrap.append(title, grid)
  return wrap
}

function describeFillDraft(draft: FillDraft): string {
  if (draft.kind === 'gradient') return draft.gradientType === 'radial' ? 'Radial gradient' : `Linear ${draft.gradientAngle}°`
  if (draft.kind === 'image') return draft.imageUrl ? 'Image fill' : 'Select image'
  return draft.color.toUpperCase()
}

function getFillTriggerSwatchBackground(draft: FillDraft): string {
  return draft.kind === 'gradient'
    ? createGradientCss(draft)
    : draft.kind === 'image' && draft.imageUrl
      ? cssUrlValue(draft.imageUrl)
      : draft.color
}

function getFillTriggerValue(draft: FillDraft): string {
  return draft.kind === 'solid' ? draft.color.toUpperCase() : describeFillDraft(draft)
}

function createFillTrigger(draft: FillDraft, onChange: () => void): HTMLDivElement {
  const trigger = createFillRow({
    value: draft.color,
    opacity: draft.opacity,
    onChange: (value) => {
      draft.color = value
      onChange()
    },
    onOpacityChange: (opacity, currentHex) => {
      draft.opacity = opacity
      draft.color = currentHex
      onChange()
    },
  })
  trigger.classList.add('ei-dp-fill-trigger')
  return trigger
}

function updateFillTrigger(trigger: HTMLDivElement, draft: FillDraft): void {
  const swatch = trigger.querySelector<HTMLDivElement>('.ei-dp-swatch')
  const picker = trigger.querySelector<HTMLInputElement>('.ei-dp-picker')
  const value = trigger.querySelector<HTMLInputElement>('.ei-dp-hex')
  const opacity = trigger.querySelector<HTMLInputElement>('.ei-dp-fill-opacity')

  if (swatch) {
    swatch.style.background = getFillTriggerSwatchBackground(draft)
  }
  if (picker) {
    picker.value = ensureHexColor(draft.color)
  }
  if (value && document.activeElement !== value) {
    value.value = draft.color.replace('#', '').toUpperCase()
  }
  if (opacity && document.activeElement !== opacity) {
    opacity.value = String(draft.opacity)
  }
}

function attachFillTriggerEvents(
  trigger: HTMLDivElement,
  draft: FillDraft,
  pageColors: string[],
  tracker: StyleTracker,
  onChange: () => void,
): void {
  const swatch = trigger.querySelector<HTMLDivElement>('.ei-dp-swatch')
  const picker = trigger.querySelector<HTMLInputElement>('.ei-dp-picker')
  if (picker) {
    picker.style.pointerEvents = 'none'
    picker.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
    })
  }
  swatch?.addEventListener('click', (event) => {
    event.stopPropagation()
    if (activeFillPopover) {
      closeFillPopover()
      return
    }
    openFillPopover(swatch, draft, pageColors, tracker, onChange, () => {
      updateFillTrigger(trigger, draft)
    })
  })

  trigger.addEventListener('click', (event) => {
    const target = event.target as Element | null
    if (
      target instanceof HTMLInputElement &&
      (target.classList.contains('ei-dp-hex') || target.classList.contains('ei-dp-fill-opacity') || target.classList.contains('ei-dp-picker'))
    ) {
      return
    }
    event.stopPropagation()
  })
}

function isFillTriggerElement(element: Element | null): element is HTMLDivElement {
  return element instanceof HTMLDivElement && element.classList.contains('ei-dp-fill-row')
}

function getFillTriggerElement(container: HTMLDivElement): HTMLDivElement | null {
  return isFillTriggerElement(container.firstElementChild) ? container.firstElementChild : null
}

function mountFillTrigger(
  container: HTMLDivElement,
  draft: FillDraft,
  pageColors: string[],
  tracker: StyleTracker,
  onChange: () => void,
): void {
  const trigger = createFillTrigger(draft, onChange)
  attachFillTriggerEvents(trigger, draft, pageColors, tracker, onChange)
  updateFillTrigger(trigger, draft)
  container.appendChild(trigger)
}

function refreshFillTrigger(container: HTMLDivElement, draft: FillDraft): void {
  const trigger = getFillTriggerElement(container)
  if (trigger) {
    updateFillTrigger(trigger, draft)
  }
}

function toggleFillTriggerPopover(
  container: HTMLDivElement,
  draft: FillDraft,
  pageColors: string[],
  tracker: StyleTracker,
  onChange: () => void,
): void {
  const trigger = getFillTriggerElement(container)
  const swatch = trigger?.querySelector<HTMLElement>('.ei-dp-swatch')
  if (!trigger || !swatch) return
  if (activeFillPopover) {
    closeFillPopover()
    return
  }
  openFillPopover(swatch, draft, pageColors, tracker, onChange, () => {
    updateFillTrigger(trigger, draft)
  })
}

function renderFillTrigger(
  container: HTMLDivElement,
  draft: FillDraft,
  pageColors: string[],
  tracker: StyleTracker,
  onChange: () => void,
): void {
  const trigger = getFillTriggerElement(container)
  if (trigger) {
    updateFillTrigger(trigger, draft)
    return
  }
  mountFillTrigger(container, draft, pageColors, tracker, onChange)
}

function createSolidColorDraft(value: string, opacity = 100): FillDraft {
  const color = ensureHexColor(value)
  return {
    kind: 'solid',
    color,
    opacity,
    gradientType: 'linear',
    gradientAngle: 90,
    gradientStops: [createGradientStop(color, 0), createGradientStop('#737373', 100)],
    activeGradientStopId: '',
    imageUrl: '',
    imageFit: 'cover',
  }
}

function openSolidColorPopover(
  anchor: HTMLElement,
  value: string,
  opacity: number,
  pageColors: string[],
  tracker: StyleTracker,
  onColorChange: (value: string, opacity: number) => void,
  onChange: () => void,
): void {
  const draft = createSolidColorDraft(value, opacity)
  draft.activeGradientStopId = draft.gradientStops[0]!.id
  openFillPopover(anchor, draft, pageColors, tracker, onChange, () => {
    onColorChange(draft.color, draft.opacity)
  }, {
    showModes: false,
    applySolid: () => onColorChange(draft.color, draft.opacity),
  })
}

function updateFillTriggerInContainer(container: HTMLDivElement, draft: FillDraft): void {
  refreshFillTrigger(container, draft)
}

function openFillTriggerFromContainer(
  container: HTMLDivElement,
  draft: FillDraft,
  pageColors: string[],
  tracker: StyleTracker,
  onChange: () => void,
): void {
  toggleFillTriggerPopover(container, draft, pageColors, tracker, onChange)
}

let activeFillPopover: HTMLDivElement | null = null
let fillPopoverDragCleanup: (() => void) | null = null

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function enableFillPopoverDrag(popover: HTMLDivElement): void {
  let startX = 0
  let startY = 0
  let startLeft = 0
  let startTop = 0
  let dragging = false

  const onMove = (event: PointerEvent): void => {
    if (!dragging) return
    const nextLeft = startLeft + event.clientX - startX
    const nextTop = startTop + event.clientY - startY
    popover.style.left = `${clamp(nextLeft, 8, window.innerWidth - popover.offsetWidth - 8)}px`
    popover.style.top = `${clamp(nextTop, 8, window.innerHeight - popover.offsetHeight - 8)}px`
  }

  const onUp = (): void => {
    dragging = false
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
  }

  const onDown = (event: PointerEvent): void => {
    if (!(event.target instanceof Element) || !event.target.closest('.ei-dp-fill-chrome-header') || event.target.closest('button,input,textarea,select')) return
    dragging = true
    startX = event.clientX
    startY = event.clientY
    startLeft = popover.offsetLeft
    startTop = popover.offsetTop
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  popover.addEventListener('pointerdown', onDown)
  fillPopoverDragCleanup = () => {
    popover.removeEventListener('pointerdown', onDown)
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
  }
}

function closeFillPopover(): void {
  if (fillPopoverDragCleanup) {
    fillPopoverDragCleanup()
    fillPopoverDragCleanup = null
  }
  if (activeFillPopover) {
    activeFillPopover.remove()
    activeFillPopover = null
  }
  document.removeEventListener('mousedown', handleFillPopoverOutside, true)
}

function handleFillPopoverOutside(e: MouseEvent): void {
  if (activeFillPopover && e.target instanceof Element && !activeFillPopover.contains(e.target)) {
    closeFillPopover()
  }
}

type FillPanelOptions = {
  showModes?: boolean
  applySolid?: (draft: FillDraft) => void
  applyGradient?: (draft: FillDraft) => void
  applyImage?: (draft: FillDraft) => void
}

function openFillPopover(
  anchor: HTMLElement,
  draft: FillDraft,
  pageColors: string[],
  tracker: StyleTracker,
  onChange: () => void,
  onDraftChange: () => void,
  panelOptions: FillPanelOptions = {},
): void {
  closeFillPopover()
  const popover = el('div', 'ei-dp-fill-popover')
  popover.setAttribute(IGNORE_ATTR, 'true')
  popover.appendChild(createFillPopoverChrome(createFillPanel(draft, pageColors, tracker, onChange, onDraftChange, panelOptions)))

  document.body.appendChild(popover)
  const anchorRect = anchor.getBoundingClientRect()
  const left = clamp(anchorRect.left, 8, window.innerWidth - popover.offsetWidth - 8)
  const top = clamp(anchorRect.bottom + 8, 8, window.innerHeight - popover.offsetHeight - 8)
  popover.style.left = `${left}px`
  popover.style.top = `${top}px`
  enableFillPopoverDrag(popover)

  activeFillPopover = popover
  requestAnimationFrame(() => {
    document.addEventListener('mousedown', handleFillPopoverOutside, true)
  })
}

function createFillPanel(
  draft: FillDraft,
  pageColors: string[],
  tracker: StyleTracker,
  onChange: () => void,
  onDraftChange: () => void,
  options: FillPanelOptions = {},
): HTMLDivElement {
  const panel = el('div', 'ei-dp-fill-panel')

  function applySolid(): void {
    if (options.applySolid) {
      options.applySolid(draft)
      onDraftChange()
      onChange()
      return
    }
    const alpha = draft.opacity / 100
    if (alpha < 1) {
      const hex = ensureHexColor(draft.color)
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      tracker.apply('background-color', `rgba(${r}, ${g}, ${b}, ${alpha})`)
    } else {
      tracker.apply('background-color', draft.color)
    }
    tracker.apply('background-image', 'none')
    onDraftChange()
    onChange()
  }

  function applyGradient(): void {
    if (options.applyGradient) {
      options.applyGradient(draft)
      onDraftChange()
      onChange()
      return
    }
    tracker.apply('background-image', createGradientCss(draft))
    onDraftChange()
    onChange()
  }

  function applyImage(): void {
    if (!draft.imageUrl) return
    if (options.applyImage) {
      options.applyImage(draft)
      onDraftChange()
      onChange()
      return
    }
    tracker.apply('background-image', cssUrlValue(draft.imageUrl))
    tracker.apply('background-size', draft.imageFit)
    tracker.apply('background-position', 'center')
    tracker.apply('background-repeat', 'no-repeat')
    onDraftChange()
    onChange()
  }

  function applyCurrent(): void {
    if (draft.kind === 'solid') applySolid()
    else if (draft.kind === 'gradient') applyGradient()
    else applyImage()
  }

  function editableColor(): string {
    if (draft.kind === 'gradient') return getActiveGradientStop(draft).color
    return draft.color
  }

  function updateEditableColor(hex: string): void {
    const nextColor = ensureHexColor(hex, editableColor())
    if (draft.kind === 'gradient') {
      updateGradientStop(draft, draft.activeGradientStopId, { color: nextColor })
      applyGradient()
    } else {
      draft.color = nextColor
      if (draft.kind === 'solid') applySolid()
    }
  }

  function bindColorPlane(area: HTMLDivElement, handle: HTMLDivElement): void {
    let hsv = rgbToHsvColor(hexToRgb(editableColor()))

    const updateFromPointer = (event: PointerEvent): void => {
      const rect = area.getBoundingClientRect()
      const x = clamp(event.clientX - rect.left, 0, rect.width)
      const y = clamp(event.clientY - rect.top, 0, rect.height)
      hsv = { ...hsv, s: x / rect.width, v: 1 - y / rect.height }
      handle.style.left = `${x - 8}px`
      handle.style.top = `${y - 8}px`
      updateEditableColor(hsvToHexColor(hsv))
    }

    const onMove = (event: PointerEvent): void => updateFromPointer(event)
    const onUp = (): void => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      render()
    }

    area.addEventListener('pointerdown', (event) => {
      event.stopPropagation()
      event.preventDefault()
      updateFromPointer(event)
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    })
  }

  function bindColorSlider(slider: HTMLDivElement, handle: HTMLDivElement, type: 'hue' | 'alpha'): void {
    const updateFromPointer = (event: PointerEvent): void => {
      const rect = slider.getBoundingClientRect()
      const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1)
      handle.style.left = `${ratio * rect.width - 8}px`
      if (type === 'hue') {
        const hsv = rgbToHsvColor(hexToRgb(editableColor()))
        updateEditableColor(hsvToHexColor({ ...hsv, h: ratio * 360 }))
      } else {
        draft.opacity = Math.round(ratio * 100)
        if (draft.kind === 'solid') applySolid()
      }
    }

    const onMove = (event: PointerEvent): void => updateFromPointer(event)
    const onUp = (): void => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      render()
    }

    slider.addEventListener('pointerdown', (event) => {
      event.stopPropagation()
      event.preventDefault()
      updateFromPointer(event)
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    })
  }

  function render(): void {
    panel.innerHTML = ''
    if (options.showModes !== false) {
      panel.appendChild(createFillModeTabs(draft.kind, (kind) => {
        draft.kind = kind
        render()
        applyCurrent()
      }))
    }

    const body = el('div', 'ei-dp-fill-body')
    const pickerArea = el('div', 'ei-dp-color-square')
    const pickerBase = editableColor()
    pickerArea.style.background = draft.kind === 'gradient'
      ? `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pickerBase})`
      : `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pickerBase})`
    const pickerHandle = el('div', 'ei-dp-color-square-handle')
    const pickerHsv = rgbToHsvColor(hexToRgb(pickerBase))
    pickerHandle.style.left = `${pickerHsv.s * 208 - 8}px`
    pickerHandle.style.top = `${(1 - pickerHsv.v) * 208 - 8}px`
    pickerArea.appendChild(pickerHandle)
    bindColorPlane(pickerArea, pickerHandle)
    const eyedropper = el('button', 'ei-dp-eyedropper') as HTMLButtonElement
    eyedropper.type = 'button'
    eyedropper.setAttribute(IGNORE_ATTR, 'true')
    eyedropper.innerHTML = '<svg viewBox="0 0 20 20"><path d="M13.5 3.5l3 3-8.8 8.8-3.2.7.7-3.2 8.3-8.3zM12 5l3 3"/></svg>'
    eyedropper.addEventListener('click', async (e) => {
      e.stopPropagation()
      const EyeDropperCtor = (window as Window & { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper
      if (!EyeDropperCtor) return
      try {
        const result = await new EyeDropperCtor().open()
        updateEditableColor(result.sRGBHex)
        render()
      } catch {}
    })
    const sliderStack = el('div', 'ei-dp-color-sliders')
    body.appendChild(pickerArea)

    if (draft.kind === 'solid') {
      body.appendChild(sliderStack)
    } else if (draft.kind === 'gradient') {
      const gradientTypeRow = el('div', 'ei-dp-gradient-type-row')
      const typeBtn = el('button', 'ei-dp-gradient-type-btn', draft.gradientType === 'linear' ? '线性渐变' : '径向渐变') as HTMLButtonElement
      typeBtn.type = 'button'
      typeBtn.setAttribute(IGNORE_ATTR, 'true')
      typeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        draft.gradientType = draft.gradientType === 'linear' ? 'radial' : 'linear'
        applyGradient()
        render()
      })
      const swapBtn = el('button', 'ei-dp-gradient-icon-btn') as HTMLButtonElement
      swapBtn.type = 'button'
      swapBtn.setAttribute(IGNORE_ATTR, 'true')
      swapBtn.innerHTML = '<svg viewBox="0 0 20 20"><path d="M4 6h10m0 0-3-3m3 3-3 3M16 14H6m0 0 3-3m-3 3 3 3"/></svg>'
      swapBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        draft.gradientStops = draft.gradientStops.slice().reverse()
        const active = getActiveGradientStop(draft)
        draft.gradientStops = draft.gradientStops.map(stop => ({ ...stop, position: 100 - stop.position }))
        sortGradientStops(draft)
        draft.activeGradientStopId = active.id
        applyGradient()
        render()
      })
      gradientTypeRow.append(typeBtn, swapBtn)
      body.appendChild(gradientTypeRow)

      const preview = el('div', 'ei-dp-gradient-strip')
      preview.style.background = createGradientCss(draft)
      const onPreviewPointerDown = (stopId: string) => (event: PointerEvent): void => {
        event.stopPropagation()
        event.preventDefault()
        setActiveGradientStop(draft, stopId)
        const onMove = (moveEvent: PointerEvent): void => {
          const rect = preview.getBoundingClientRect()
          updateGradientStop(draft, stopId, { position: Math.round(clamp((moveEvent.clientX - rect.left) / rect.width, 0, 1) * 100) })
          preview.style.background = createGradientCss(draft)
          const stopEl = preview.querySelector(`[data-stop-id="${stopId}"]`) as HTMLButtonElement | null
          if (stopEl) stopEl.style.left = `calc(${getActiveGradientStop(draft).position}% - 10px)`
        }
        const onUp = (): void => {
          document.removeEventListener('pointermove', onMove)
          document.removeEventListener('pointerup', onUp)
          applyGradient()
          render()
        }
        onMove(event)
        document.addEventListener('pointermove', onMove)
        document.addEventListener('pointerup', onUp)
      }
      for (const stop of draft.gradientStops) {
        const stopBtn = el('button', `ei-dp-gradient-stop${stop.color === '#737373' ? ' ei-dp-gradient-stop-dark' : ''}`) as HTMLButtonElement
        stopBtn.type = 'button'
        stopBtn.setAttribute(IGNORE_ATTR, 'true')
        stopBtn.dataset.stopId = stop.id
        stopBtn.dataset.active = stop.id === draft.activeGradientStopId ? 'true' : 'false'
        stopBtn.style.left = `calc(${stop.position}% - 10px)`
        const chip = el('span', 'ei-dp-gradient-stop-chip')
        chip.style.background = stop.color
        stopBtn.appendChild(chip)
        stopBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          setActiveGradientStop(draft, stop.id)
          render()
        })
        stopBtn.addEventListener('pointerdown', onPreviewPointerDown(stop.id))
        preview.appendChild(stopBtn)
      }
      body.appendChild(preview)

      const stopsHeader = el('div', 'ei-dp-gradient-stops-header')
      stopsHeader.append(el('span', 'ei-dp-gradient-stops-label', '断点'))
      const addStopBtn = el('button', 'ei-dp-gradient-icon-btn', '+') as HTMLButtonElement
      addStopBtn.type = 'button'
      addStopBtn.setAttribute(IGNORE_ATTR, 'true')
      addStopBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        addGradientStop(draft)
        applyGradient()
        render()
      })
      stopsHeader.appendChild(addStopBtn)
      body.appendChild(stopsHeader)

      const createStopRow = (stop: GradientStop): HTMLDivElement => {
        const active = stop.id === draft.activeGradientStopId
        const row = el('div', 'ei-dp-gradient-stop-row')
        if (active) row.dataset.active = 'true'
        row.addEventListener('click', () => {
          setActiveGradientStop(draft, stop.id)
          render()
        })
        const positionWrap = el('div', 'ei-dp-gradient-stop-position')
        const positionInput = createNumberInput({
          value: stop.position,
          min: 0,
          max: 100,
          step: 1,
          onChange: (value) => {
            updateGradientStop(draft, stop.id, { position: value })
            applyGradient()
          },
        })
        positionInput.className = 'ei-dp-gradient-stop-position-input'
        positionWrap.append(positionInput, el('span', 'ei-dp-gradient-stop-position-suffix', '%'))
        const colorRow = el('div', 'ei-dp-gradient-stop-color')
        const swatchBtn = el('button', 'ei-dp-gradient-stop-swatch-btn') as HTMLButtonElement
        swatchBtn.type = 'button'
        swatchBtn.setAttribute(IGNORE_ATTR, 'true')
        const swatch = el('span', 'ei-dp-gradient-stop-swatch')
        swatch.style.background = stop.color
        const picker = document.createElement('input')
        picker.type = 'color'
        picker.className = 'ei-dp-picker'
        picker.value = ensureHexColor(stop.color)
        picker.setAttribute(IGNORE_ATTR, 'true')
        picker.addEventListener('input', (e) => {
          e.stopPropagation()
          updateGradientStop(draft, stop.id, { color: picker.value })
          applyGradient()
          render()
        })
        swatchBtn.append(swatch, picker)
        const colorInput = document.createElement('input')
        colorInput.type = 'text'
        colorInput.className = 'ei-dp-gradient-stop-color-input'
        colorInput.value = stop.color.replace('#', '')
        colorInput.setAttribute(IGNORE_ATTR, 'true')
        colorInput.addEventListener('input', (e) => {
          e.stopPropagation()
          updateGradientStop(draft, stop.id, { color: ensureHexColor(colorInput.value.startsWith('#') ? colorInput.value : `#${colorInput.value}`, stop.color) })
          applyGradient()
        })
        const opacityWrap = el('div', 'ei-dp-gradient-stop-opacity')
        const opacityInput = createNumberInput({
          value: stop.opacity,
          min: 0,
          max: 100,
          step: 1,
          onChange: (value) => {
            updateGradientStop(draft, stop.id, { opacity: value })
            applyGradient()
          },
        })
        opacityInput.className = 'ei-dp-gradient-stop-opacity-input'
        opacityWrap.append(opacityInput, el('span', 'ei-dp-gradient-stop-position-suffix', '%'))
        const removeBtn = el('button', 'ei-dp-gradient-stop-remove', '−') as HTMLButtonElement
        removeBtn.type = 'button'
        removeBtn.setAttribute(IGNORE_ATTR, 'true')
        removeBtn.disabled = draft.gradientStops.length <= 2
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          removeGradientStop(draft, stop.id)
          applyGradient()
          render()
        })
        colorRow.append(swatchBtn, colorInput, opacityWrap)
        row.append(positionWrap, colorRow, removeBtn)
        return row
      }

      for (const stop of draft.gradientStops) {
        body.appendChild(createStopRow(stop))
      }

      if (draft.gradientType === 'linear') {
        body.appendChild(createLabeledField({
          icon: '°',
          value: draft.gradientAngle,
          min: 0,
          max: 360,
          onChange: (value) => {
            draft.gradientAngle = value
            applyGradient()
          },
        }))
      }
    } else {
      body.appendChild(createTextInput(draft.imageUrl, 'Image URL', (value) => {
        draft.imageUrl = value
        applyImage()
      }))
      const fitBtns = el('div', 'ei-dp-btn-group')
      for (const fit of ['cover', 'contain', 'auto'] as ImageFit[]) {
        const btn = el('button', 'ei-dp-btn', fit)
        btn.type = 'button'
        btn.setAttribute(IGNORE_ATTR, 'true')
        if (draft.imageFit === fit) btn.dataset.active = 'true'
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          draft.imageFit = fit
          applyImage()
          render()
        })
        fitBtns.appendChild(btn)
      }
      body.appendChild(fitBtns)
    }

    const hue = el('div', 'ei-dp-color-slider ei-dp-color-slider-hue')
    const hueHandle = el('div', 'ei-dp-color-slider-handle')
    hueHandle.style.left = `${rgbToHsvColor(hexToRgb(editableColor())).h / 360 * 180 - 8}px`
    hue.appendChild(hueHandle)
    bindColorSlider(hue, hueHandle, 'hue')
    const alphaRow = el('div', 'ei-dp-color-slider-row')
    alphaRow.appendChild(eyedropper)
    const alpha = el('div', 'ei-dp-color-slider ei-dp-color-slider-alpha')
    alpha.style.background = `linear-gradient(90deg, color-mix(in srgb, var(--text-inverse) 0%, transparent) 0%, ${editableColor()} 100%), conic-gradient(from 90deg, var(--border-hover) 0 25%, transparent 0 50%, var(--border-hover) 0 75%, transparent 0)`
    alpha.style.backgroundSize = '100% 100%, 12px 12px'
    const alphaHandle = el('div', 'ei-dp-color-slider-handle ei-dp-color-slider-handle-alpha')
    alphaHandle.style.left = `${draft.opacity / 100 * 180 - 8}px`
    alpha.appendChild(alphaHandle)
    bindColorSlider(alpha, alphaHandle, 'alpha')
    alphaRow.appendChild(alpha)
    sliderStack.append(hue, alphaRow)

    const valueRow = el('div', 'ei-dp-color-value-row')
    const currentFormat = (panel.dataset.colorFormat as ColorFormat | undefined) ?? 'hex'
    const formatLabels: Record<ColorFormat, string> = { hex: 'Hex', rgb: 'RGB', css: 'CSS', hsl: 'HSL', hsb: 'HSB' }
    const formatBtn = el('button', 'ei-dp-color-format')
    formatBtn.innerHTML = `<span>${formatLabels[currentFormat]}</span><span class="ei-dp-color-format-arrow">${DOWN_ARROW_ICON}</span>`
    formatBtn.type = 'button'
    formatBtn.setAttribute(IGNORE_ATTR, 'true')
    formatBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      openColorFormatDropdown(formatBtn, currentFormat, (format) => {
        panel.dataset.colorFormat = format
        render()
      })
    })
    const segmentGroup = createColorSegmentGroup(currentFormat, draft, applySolid, applyImage, render)
    valueRow.append(formatBtn, segmentGroup)
    body.appendChild(valueRow)

    if (pageColors.length > 0) {
      body.appendChild(createPageColorGrid(pageColors, (color) => {
        if (draft.kind === 'gradient') {
          updateGradientStop(draft, draft.activeGradientStopId, { color: ensureHexColor(color, editableColor()) })
          applyGradient()
          render()
          return
        }
        draft.color = ensureHexColor(color, draft.color)
        draft.kind = 'solid'
        applySolid()
        render()
      }))
    }

    panel.appendChild(body)
  }

  render()
  return panel
}

// --- Weight Select ---

function createWeightSelect(value: string, onChange: (value: string) => void): HTMLDivElement {
  const wrap = el('div', 'ei-dp-font-select')
  wrap.setAttribute(IGNORE_ATTR, 'true')

  const normalizedValue = String(parseInt(value) || '400')
  const textEl = el('span', 'ei-dp-font-text', normalizedValue)

  const arrowEl = el('span', 'ei-dp-font-arrow')
  arrowEl.innerHTML = DOWN_ARROW_ICON

  wrap.append(textEl, arrowEl)

  wrap.addEventListener('click', (e) => {
    e.stopPropagation()
    openWeightDropdown(wrap, textEl.textContent || '400', (weight) => {
      textEl.textContent = weight
      onChange(weight)
    })
  })

  return wrap
}

let activeWeightDropdown: HTMLDivElement | null = null

function closeWeightDropdown(): void {
  if (activeWeightDropdown) {
    activeWeightDropdown.remove()
    activeWeightDropdown = null
  }
  document.removeEventListener('mousedown', handleWeightDropdownOutside, true)
}

function handleWeightDropdownOutside(e: MouseEvent): void {
  if (activeWeightDropdown && e.target instanceof Element && !activeWeightDropdown.contains(e.target)) {
    closeWeightDropdown()
  }
}

function openWeightDropdown(
  anchor: HTMLElement,
  currentWeight: string,
  onSelect: (weight: string) => void,
): void {
  closeWeightDropdown()

  const dropdown = el('div', 'ei-dp-font-dropdown')
  dropdown.setAttribute(IGNORE_ATTR, 'true')

  const weights = ['100', '200', '300', '400', '500', '600', '700', '800', '900']
  for (const w of weights) {
    const item = el('div', 'ei-dp-font-option', w)
    item.setAttribute(IGNORE_ATTR, 'true')
    if (w === currentWeight) {
      item.dataset.active = 'true'
    }
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      onSelect(w)
      closeWeightDropdown()
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

  activeWeightDropdown = dropdown
  requestAnimationFrame(() => {
    document.addEventListener('mousedown', handleWeightDropdownOutside, true)
  })
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
  const wrap = el('div', 'ei-dp-font-select ei-dp-font-family-select')
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

let activeColorFormatDropdown: HTMLDivElement | null = null
let activeFontDropdown: HTMLDivElement | null = null

function closeColorFormatDropdown(): void {
  if (activeColorFormatDropdown) {
    activeColorFormatDropdown.remove()
    activeColorFormatDropdown = null
  }
  document.removeEventListener('mousedown', handleColorFormatDropdownOutside, true)
}

function handleColorFormatDropdownOutside(e: MouseEvent): void {
  if (activeColorFormatDropdown && e.target instanceof Element && !activeColorFormatDropdown.contains(e.target)) {
    closeColorFormatDropdown()
  }
}

function openColorFormatDropdown(anchor: HTMLElement, currentFormat: ColorFormat, onSelect: (format: ColorFormat) => void): void {
  closeColorFormatDropdown()
  const labels: Record<ColorFormat, string> = { hex: 'Hex', rgb: 'RGB', css: 'CSS', hsl: 'HSL', hsb: 'HSB' }
  const dropdown = el('div', 'ei-dp-color-format-dropdown')
  dropdown.setAttribute(IGNORE_ATTR, 'true')

  for (const format of ['hex', 'rgb', 'css', 'hsl', 'hsb'] as ColorFormat[]) {
    const item = el('div', 'ei-dp-color-format-option')
    item.setAttribute(IGNORE_ATTR, 'true')
    item.innerHTML = `${format === currentFormat ? '<span class="ei-dp-color-format-check">✓</span>' : '<span class="ei-dp-color-format-check"></span>'}<span>${labels[format]}</span>`
    if (format === currentFormat) item.dataset.active = 'true'
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      onSelect(format)
      closeColorFormatDropdown()
    })
    dropdown.appendChild(item)
  }

  const panel = anchor.closest('.ei-dp-fill-popover')
  if (panel) {
    panel.appendChild(dropdown)
    const anchorRect = anchor.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    dropdown.style.left = `${anchorRect.left - panelRect.left}px`
    dropdown.style.top = `${anchorRect.bottom - panelRect.top + 4}px`
  }

  activeColorFormatDropdown = dropdown
  requestAnimationFrame(() => {
    document.addEventListener('mousedown', handleColorFormatDropdownOutside, true)
  })
}

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

const VERTICAL_ALIGN_ICONS: Record<string, string> = {
  top: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 5C5.36739 5 5.24021 5.05268 5.14645 5.14645C5.05268 5.24021 5 5.36739 5 5.5C5 5.63261 5.05268 5.75979 5.14645 5.85355C5.24021 5.94732 5.36739 6 5.5 6H17.5C17.6326 6 17.7598 5.94732 17.8536 5.85355C17.9473 5.75979 18 5.63261 18 5.5C18 5.36739 17.9473 5.24021 17.8536 5.14645C17.7598 5.05268 17.6326 5 17.5 5H5.5ZM11.854 7.146C11.8076 7.09944 11.7524 7.06249 11.6916 7.03729C11.6309 7.01208 11.5658 6.99911 11.5 6.99911C11.4342 6.99911 11.3691 7.01208 11.3084 7.03729C11.2476 7.06249 11.1924 7.09944 11.146 7.146L8.146 10.146C8.05211 10.2399 7.99937 10.3672 7.99937 10.5C7.99937 10.6328 8.05211 10.7601 8.146 10.854C8.23989 10.9479 8.36722 11.0006 8.5 11.0006C8.63278 11.0006 8.76011 10.9479 8.854 10.854L11 8.707V16.5C11 16.6326 11.0527 16.7598 11.1464 16.8536C11.2402 16.9473 11.3674 17 11.5 17C11.6326 17 11.7598 16.9473 11.8536 16.8536C11.9473 16.7598 12 16.6326 12 16.5V8.707L14.146 10.854C14.2399 10.9479 14.3672 11.0006 14.5 11.0006C14.6328 11.0006 14.7601 10.9479 14.854 10.854C14.9479 10.7601 15.0006 10.6328 15.0006 10.5C15.0006 10.3672 14.9479 10.2399 14.854 10.146L11.854 7.146Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  middle: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.854 9.854L13.854 7.854C13.9479 7.76011 14.0006 7.63278 14.0006 7.5C14.0006 7.36722 13.9479 7.23989 13.854 7.146C13.7601 7.05211 13.6328 6.99937 13.5 6.99937C13.3672 6.99937 13.2399 7.05211 13.146 7.146L12 8.293V4.5C12 4.36739 11.9473 4.24021 11.8536 4.14645C11.7598 4.05268 11.6326 4 11.5 4C11.3674 4 11.2402 4.05268 11.1464 4.14645C11.0527 4.24021 11 4.36739 11 4.5V8.293L9.854 7.146C9.76011 7.05211 9.63278 6.99937 9.5 6.99937C9.36722 6.99937 9.23989 7.05211 9.146 7.146C9.05211 7.23989 8.99937 7.36722 8.99937 7.5C8.99937 7.63278 9.05211 7.76011 9.146 7.854L11.146 9.854C11.1924 9.90056 11.2476 9.93751 11.3084 9.96271C11.3691 9.98792 11.4342 10.0009 11.5 10.0009C11.5658 10.0009 11.6309 9.98792 11.6916 9.96271C11.7524 9.93751 11.8076 9.90056 11.854 9.854ZM11.854 13.146L13.854 15.146C13.9479 15.2399 14.0006 15.3672 14.0006 15.5C14.0006 15.6328 13.9479 15.7601 13.854 15.854C13.7601 15.9479 13.6328 16.0006 13.5 16.0006C13.3672 16.0006 13.2399 15.9479 13.146 15.854L12 14.707V18.5C12 18.6326 11.9473 18.7598 11.8536 18.8536C11.7598 18.9473 11.6326 19 11.5 19C11.3674 19 11.2402 18.9473 11.1464 18.8536C11.0527 18.7598 11 18.6326 11 18.5V14.707L9.854 15.854C9.76011 15.9479 9.63278 16.0006 9.5 16.0006C9.36722 16.0006 9.23989 15.9479 9.146 15.854C9.05211 15.7601 8.99937 15.6328 8.99937 15.5C8.99937 15.3672 9.05211 15.2399 9.146 15.146L11.146 13.146C11.1924 13.0994 11.2476 13.0625 11.3084 13.0373C11.3691 13.0121 11.4342 12.9991 11.5 12.9991C11.5658 12.9991 11.6309 13.0121 11.6916 13.0373C11.7524 13.0625 11.8076 13.0994 11.854 13.146ZM5.5 11C5.36739 11 5.24021 11.0527 5.14645 11.1464C5.05268 11.2402 5 11.3674 5 11.5C5 11.6326 5.05268 11.7598 5.14645 11.8536C5.24021 11.9473 5.36739 12 5.5 12H17.5C17.6326 12 17.7598 11.9473 17.8536 11.8536C17.9473 11.7598 18 11.6326 18 11.5C18 11.3674 17.9473 11.2402 17.8536 11.1464C17.7598 11.0527 17.6326 11 17.5 11H5.5Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  bottom: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.854 13.854L11.854 16.854C11.8076 16.9006 11.7524 16.9375 11.6916 16.9627C11.6309 16.9879 11.5658 17.0009 11.5 17.0009C11.4342 17.0009 11.3691 16.9879 11.3084 16.9627C11.2476 16.9375 11.1924 16.9006 11.146 16.854L8.146 13.854C8.09951 13.8075 8.06264 13.7523 8.03748 13.6916C8.01232 13.6308 7.99937 13.5657 7.99937 13.5C7.99937 13.4343 8.01232 13.3692 8.03748 13.3084C8.06264 13.2477 8.09951 13.1925 8.146 13.146C8.19249 13.0995 8.24768 13.0626 8.30842 13.0375C8.36916 13.0123 8.43426 12.9994 8.5 12.9994C8.56574 12.9994 8.63084 13.0123 8.69158 13.0375C8.75232 13.0626 8.80751 13.0995 8.854 13.146L11 15.293V7.5C11 7.36739 11.0527 7.24021 11.1464 7.14645C11.2402 7.05268 11.3674 7 11.5 7C11.6326 7 11.7598 7.05268 11.8536 7.14645C11.9473 7.24021 12 7.36739 12 7.5V15.293L14.146 13.146C14.2399 13.0521 14.3672 12.9994 14.5 12.9994C14.6328 12.9994 14.7601 13.0521 14.854 13.146C14.9479 13.2399 15.0006 13.3672 15.0006 13.5C15.0006 13.6328 14.9479 13.7601 14.854 13.854ZM5.5 19C5.36739 19 5.24021 18.9473 5.14645 18.8536C5.05268 18.7598 5 18.6326 5 18.5C5 18.3674 5.05268 18.2402 5.14645 18.1464C5.24021 18.0527 5.36739 18 5.5 18H17.5C17.6326 18 17.7598 18.0527 17.8536 18.1464C17.9473 18.2402 18 18.3674 18 18.5C18 18.6326 17.9473 18.7598 17.8536 18.8536C17.7598 18.9473 17.6326 19 17.5 19H5.5Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
}

function createAlignButtons(value: string, onChange: (value: string) => void): HTMLDivElement {
  const wrap = el('div', 'ei-dp-align-btns')

  const aligns: Array<{ key: string; css: string }> = [
    { key: 'left', css: 'left' },
    { key: 'center', css: 'center' },
    { key: 'right', css: 'right' },
  ]

  // Normalize value: map 'start' to 'left', 'end' to 'right', default to 'left'
  let normalizedValue = value
  if (value === 'start' || value === '' || !aligns.some(a => a.css === value)) {
    normalizedValue = 'left'
  } else if (value === 'end') {
    normalizedValue = 'right'
  }

  for (const { key, css } of aligns) {
    const btn = el('button', 'ei-dp-align-btn')
    btn.type = 'button'
    btn.innerHTML = ALIGN_ICONS[key] ?? ''
    btn.setAttribute(IGNORE_ATTR, 'true')
    if (normalizedValue === css) btn.dataset.active = 'true'
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

// --- Vertical Align Button Group ---

function createVerticalAlignButtons(value: string, onChange: (value: string) => void): HTMLDivElement {
  const wrap = el('div', 'ei-dp-align-btns')

  const aligns: Array<{ key: string; css: string }> = [
    { key: 'top', css: 'top' },
    { key: 'middle', css: 'middle' },
    { key: 'bottom', css: 'bottom' },
  ]

  // Normalize value: default to 'middle' for unrecognized values
  let normalizedValue = value
  if (value === '' || !aligns.some(a => a.css === value)) {
    normalizedValue = 'middle'
  }

  for (const { key, css } of aligns) {
    const btn = el('button', 'ei-dp-align-btn')
    btn.type = 'button'
    btn.innerHTML = VERTICAL_ALIGN_ICONS[key] ?? ''
    btn.setAttribute(IGNORE_ATTR, 'true')
    if (normalizedValue === css) btn.dataset.active = 'true'
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

// --- Letter Spacing Field ---

function createLetterSpacingField(value: number, onChange: (value: number) => void): HTMLDivElement {
  const wrap = el('div', 'ei-dp-field ei-dp-field-letter-spacing')
  const iconEl = el('div', 'ei-dp-field-icon')
  iconEl.innerHTML = FIELD_ICONS.letterSpacing ?? ''

  const input = createNumberInput({
    value,
    min: -100,
    max: 100,
    step: 0.01,
    onChange,
  })
  input.className = 'ei-dp-field-input'

  const suffix = el('div', 'ei-dp-field-suffix', 'em')

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
  inside: i18n.design.inside,
  center: i18n.design.center,
  outside: i18n.design.outside,
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

// --- Effects (Shadow) constants ---
type ShadowType = 'drop' | 'inner'

const SHADOW_TYPE_LABELS: Record<ShadowType, string> = {
  drop: i18n.design.dropShadow,
  inner: i18n.design.innerShadow,
}

type ShadowValues = {
  type: ShadowType
  color: string
  opacity: number
  x: number
  y: number
  blur: number
  spread: number
}

// Shadow field icons (from Figma)
const EFFECTS_ICONS: Record<string, string> = {
  blur: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M13 9C13 9.26522 12.8946 9.51957 12.7071 9.70711C12.5196 9.89464 12.2652 10 12 10C11.7348 10 11.4804 9.89464 11.2929 9.70711C11.1054 9.51957 11 9.26522 11 9C11 8.73478 11.1054 8.48043 11.2929 8.29289C11.4804 8.10536 11.7348 8 12 8C12.2652 8 12.5196 8.10536 12.7071 8.29289C12.8946 8.48043 13 8.73478 13 9ZM9.75 9C9.75 9.19891 9.67098 9.38968 9.53033 9.53033C9.38968 9.67098 9.19891 9.75 9 9.75C8.80109 9.75 8.61032 9.67098 8.46967 9.53033C8.32902 9.38968 8.25 9.19891 8.25 9C8.25 8.80109 8.32902 8.61032 8.46967 8.46967C8.61032 8.32902 8.80109 8.25 9 8.25C9.19891 8.25 9.38968 8.32902 9.53033 8.46967C9.67098 8.61032 9.75 8.80109 9.75 9ZM10 12C10 12.2652 9.89464 12.5196 9.70711 12.7071C9.51957 12.8946 9.26522 13 9 13C8.73478 13 8.48043 12.8946 8.29289 12.7071C8.10536 12.5196 8 12.2652 8 12C8 11.7348 8.10536 11.4804 8.29289 11.2929C8.48043 11.1054 8.73478 11 9 11C9.26522 11 9.51957 11.1054 9.70711 11.2929C9.89464 11.4804 10 11.7348 10 12ZM9 15.75C9.19891 15.75 9.38968 15.671 9.53033 15.5303C9.67098 15.3897 9.75 15.1989 9.75 15C9.75 14.8011 9.67098 14.6103 9.53033 14.4697C9.38968 14.329 9.19891 14.25 9 14.25C8.80109 14.25 8.61032 14.329 8.46967 14.4697C8.32902 14.6103 8.25 14.8011 8.25 15C8.25 15.1989 8.32902 15.3897 8.46967 15.5303C8.61032 15.671 8.80109 15.75 9 15.75ZM12 13C12.2652 13 12.5196 12.8946 12.7071 12.7071C12.8946 12.5196 13 12.2652 13 12C13 11.7348 12.8946 11.4804 12.7071 11.2929C12.5196 11.1054 12.2652 11 12 11C11.7348 11 11.4804 11.1054 11.2929 11.2929C11.1054 11.4804 11 11.7348 11 12C11 12.2652 11.1054 12.5196 11.2929 12.7071C11.4804 12.8946 11.7348 13 12 13ZM13 15C13 15.2652 12.8946 15.5196 12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16C11.7348 16 11.4804 15.8946 11.2929 15.7071C11.1054 15.5196 11 15.2652 11 15C11 14.7348 11.1054 14.4804 11.2929 14.2929C11.4804 14.1054 11.7348 14 12 14C12.2652 14 12.5196 14.1054 12.7071 14.2929C12.8946 14.4804 13 14.7348 13 15ZM15 9.75C15.1989 9.75 15.3897 9.67098 15.5303 9.53033C15.671 9.38968 15.75 9.19891 15.75 9C15.75 8.80109 15.671 8.61032 15.5303 8.46967C15.3897 8.32902 15.1989 8.25 15 8.25C14.8011 8.25 14.6103 8.32902 14.4697 8.46967C14.329 8.61032 14.25 8.80109 14.25 9C14.25 9.19891 14.329 9.38968 14.4697 9.53033C14.6103 9.67098 14.8011 9.75 15 9.75ZM16 12C16 12.2652 15.8946 12.5196 15.7071 12.7071C15.5196 12.8946 15.2652 13 15 13C14.7348 13 14.4804 12.8946 14.2929 12.7071C14.1054 12.5196 14 12.2652 14 12C14 11.7348 14.1054 11.4804 14.2929 11.2929C14.4804 11.1054 14.7348 11 15 11C15.2652 11 15.5196 11.1054 15.7071 11.2929C15.8946 11.4804 16 11.7348 16 12ZM15 15.75C15.1989 15.75 15.3897 15.671 15.5303 15.5303C15.671 15.3897 15.75 15.1989 15.75 15C15.75 14.8011 15.671 14.6103 15.5303 14.4697C15.3897 14.329 15.1989 14.25 15 14.25C14.8011 14.25 14.6103 14.329 14.4697 14.4697C14.329 14.6103 14.25 14.8011 14.25 15C14.25 15.1989 14.329 15.3897 14.4697 15.5303C14.6103 15.671 14.8011 15.75 15 15.75Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
  spread: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M13 6C13 6.26522 12.8946 6.51957 12.7071 6.70711C12.5196 6.89464 12.2652 7 12 7C11.7348 7 11.4804 6.89464 11.2929 6.70711C11.1054 6.51957 11 6.26522 11 6C11 5.73478 11.1054 5.48043 11.2929 5.29289C11.4804 5.10536 11.7348 5 12 5C12.2652 5 12.5196 5.10536 12.7071 5.29289C12.8946 5.48043 13 5.73478 13 6ZM18 13C17.7348 13 17.4804 12.8946 17.2929 12.7071C17.1054 12.5196 17 12.2652 17 12C17 11.7348 17.1054 11.4804 17.2929 11.2929C17.4804 11.1054 17.7348 11 18 11C18.2652 11 18.5196 11.1054 18.7071 11.2929C18.8946 11.4804 19 11.7348 19 12C19 12.2652 18.8946 12.5196 18.7071 12.7071C18.5196 12.8946 18.2652 13 18 13ZM15.536 8.464C15.6282 8.55951 15.7386 8.63569 15.8606 8.6881C15.9826 8.74051 16.1138 8.7681 16.2466 8.76925C16.3794 8.7704 16.5111 8.7451 16.634 8.69482C16.7568 8.64454 16.8685 8.57029 16.9624 8.47639C17.0563 8.3825 17.1305 8.27085 17.1808 8.14795C17.2311 8.02506 17.2564 7.89338 17.2553 7.7606C17.2541 7.62782 17.2265 7.4966 17.1741 7.3746C17.1217 7.25259 17.0455 7.14225 16.95 7.05C16.7614 6.86784 16.5088 6.76705 16.2466 6.76933C15.9844 6.7716 15.7336 6.87677 15.5482 7.06218C15.3628 7.24759 15.2576 7.4984 15.2553 7.7606C15.253 8.0228 15.3538 8.2754 15.536 8.464ZM15.536 16.949C15.4405 16.8568 15.3643 16.7464 15.3119 16.6244C15.2595 16.5024 15.2319 16.3712 15.2307 16.2384C15.2296 16.1056 15.2549 15.9739 15.3052 15.851C15.3555 15.7281 15.4297 15.6165 15.5236 15.5226C15.6175 15.4287 15.7291 15.3545 15.852 15.3042C15.9749 15.2539 16.1066 15.2286 16.2394 15.2297C16.3722 15.2309 16.5034 15.2585 16.6254 15.3109C16.7474 15.3633 16.8578 15.4395 16.95 15.535C17.1322 15.7236 17.233 15.9762 17.2307 16.2384C17.2284 16.5006 17.1232 16.7514 16.9378 16.9368C16.7524 17.1222 16.5016 17.2274 16.2394 17.2297C15.9772 17.232 15.7246 17.1312 15.536 16.949ZM12 19C12.2652 19 12.5196 18.8946 12.7071 18.7071C12.8946 18.5196 13 18.2652 13 18C13 17.7348 12.8946 17.4804 12.7071 17.2929C12.5196 17.1054 12.2652 17 12 17C11.7348 17 11.4804 17.1054 11.2929 17.2929C11.1054 17.4804 11 17.7348 11 18C11 18.2652 11.1054 18.5196 11.2929 18.7071C11.4804 18.8946 11.7348 19 12 19ZM6 13C5.73478 13 5.48043 12.8946 5.29289 12.7071C5.10536 12.5196 5 12.2652 5 12C5 11.7348 5.10536 11.4804 5.29289 11.2929C5.48043 11.1054 5.73478 11 6 11C6.26522 11 6.51957 11.1054 6.70711 11.2929C6.89464 11.4804 7 11.7348 7 12C7 12.2652 6.89464 12.5196 6.70711 12.7071C6.51957 12.8946 6.26522 13 6 13ZM7.05 16.95C7.14225 17.0455 7.25259 17.1217 7.3746 17.1741C7.4966 17.2265 7.62782 17.2541 7.7606 17.2553C7.89338 17.2564 8.02506 17.2311 8.14795 17.1808C8.27085 17.1305 8.3825 17.0563 8.47639 16.9624C8.57029 16.8685 8.64454 16.7568 8.69482 16.634C8.7451 16.5111 8.7704 16.3794 8.76925 16.2466C8.7681 16.1138 8.74051 15.9826 8.6881 15.8606C8.63569 15.7386 8.55951 15.6282 8.464 15.536C8.27467 15.3582 8.02361 15.2611 7.76392 15.2651C7.50424 15.2691 7.25631 15.374 7.07259 15.5576C6.88888 15.7412 6.7838 15.989 6.77958 16.2487C6.77537 16.5084 6.87235 16.7595 7.05 16.949ZM7.05 8.464C6.86249 8.27623 6.75726 8.02166 6.75744 7.75629C6.75763 7.49093 6.86323 7.23651 7.051 7.049C7.23877 6.86149 7.49334 6.75626 7.75871 6.75644C8.02407 6.75663 8.27849 6.86223 8.466 7.05C8.65364 7.23777 8.759 7.4924 8.75891 7.75785C8.75882 8.02331 8.65327 8.27786 8.4655 8.4655C8.27773 8.65314 8.0231 8.7585 7.75765 8.75841C7.49219 8.75832 7.23764 8.65277 7.05 8.465ZM14 12C14 12.5304 13.7893 13.0391 13.4142 13.4142C13.0391 13.7893 12.5304 14 12 14C11.4696 14 10.9609 13.7893 10.5858 13.4142C10.2107 13.0391 10 12.5304 10 12C10 11.4696 10.2107 10.9609 10.5858 10.5858C10.9609 10.2107 11.4696 10 12 10C12.5304 10 13.0391 10.2107 13.4142 10.5858C13.7893 10.9609 14 11.4696 14 12ZM15 12C15 12.7956 14.6839 13.5587 14.1213 14.1213C13.5587 14.6839 12.7956 15 12 15C11.2044 15 10.4413 14.6839 9.87868 14.1213C9.31607 13.5587 9 12.7956 9 12C9 11.2044 9.31607 10.4413 9.87868 9.87868C10.4413 9.31607 11.2044 9 12 9C12.7956 9 13.5587 9.31607 14.1213 9.87868C14.6839 10.4413 15 11.2044 15 12Z" fill="currentColor" fill-opacity="0.7"/></svg>`,
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
      check.style.color = 'var(--interactive-accent)'
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

// --- Shadow type dropdown ---
let activeShadowDropdown: HTMLDivElement | null = null

function closeShadowDropdown(): void {
  if (activeShadowDropdown) {
    activeShadowDropdown.remove()
    activeShadowDropdown = null
  }
  document.removeEventListener('mousedown', handleShadowDropdownOutside, true)
}

function handleShadowDropdownOutside(e: MouseEvent): void {
  if (activeShadowDropdown && e.target instanceof Element && !activeShadowDropdown.contains(e.target)) {
    closeShadowDropdown()
  }
}

function openShadowDropdown(
  anchor: HTMLElement,
  currentType: ShadowType,
  onSelect: (type: ShadowType) => void,
): void {
  closeShadowDropdown()
  const dropdown = el('div', 'ei-dp-size-dropdown')
  dropdown.setAttribute(IGNORE_ATTR, 'true')

  for (const t of ['drop', 'inner'] as ShadowType[]) {
    const item = el('div', 'ei-dp-size-option')
    item.setAttribute(IGNORE_ATTR, 'true')
    const check = el('span', 'ei-dp-size-check')
    if (t === currentType) {
      check.innerHTML = SIZE_ICONS.checkmark ?? ''
      check.style.color = 'var(--interactive-accent)'
    }
    const label = el('span', 'ei-dp-size-option-label', SHADOW_TYPE_LABELS[t])
    label.style.paddingLeft = '8px'
    item.append(check, label)
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      onSelect(t)
      closeShadowDropdown()
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

  activeShadowDropdown = dropdown
  requestAnimationFrame(() => {
    document.addEventListener('mousedown', handleShadowDropdownOutside, true)
  })
}

// --- Effects Panel (Shadow) ---

function createEffectsPanel(
  initialValues: ShadowValues,
  tracker: StyleTracker,
  onChange: () => void,
): HTMLDivElement {
  const panel = el('div', 'ei-dp-effects-panel')
  panel.setAttribute(IGNORE_ATTR, 'true')

  const values = initialValues

  // Row 1: Shadow type dropdown + Color + Opacity
  const row1 = el('div', 'ei-dp-effects-row1')

  // Type dropdown button (compact)
  const typeBtn = el('button', 'ei-dp-effects-type-btn')
  typeBtn.type = 'button'
  typeBtn.setAttribute(IGNORE_ATTR, 'true')
  const typeLabel = el('span', '', SHADOW_TYPE_LABELS[values.type])
  const typeArrow = el('span', 'ei-dp-effects-type-arrow')
  typeArrow.innerHTML = DOWN_ARROW_ICON
  typeBtn.append(typeLabel, typeArrow)

  typeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    openShadowDropdown(typeBtn, values.type, (t) => {
      values.type = t
      typeLabel.textContent = SHADOW_TYPE_LABELS[t]
      applyShadow(tracker, values)
      onChange()
    })
  })

  // Color inputs
  const shadowPageColors = collectPageColors(document).filter(color => color !== values.color)
  const colorInputs = createFillRow({
    value: values.color,
    opacity: values.opacity,
    className: 'ei-dp-effects-color-row',
    onChange: (hex) => {
      values.color = hex
      applyShadow(tracker, values)
      onChange()
    },
    onOpacityChange: (opacity, currentHex) => {
      values.opacity = opacity
      values.color = currentHex
      applyShadow(tracker, values)
      onChange()
    },
    onSwatchClick: (swatch) => {
      openSolidColorPopover(swatch, values.color, values.opacity, shadowPageColors, tracker, (nextColor, nextOpacity) => {
        values.color = nextColor
        values.opacity = nextOpacity
        applyShadow(tracker, values)
        onChange()
      }, onChange)
    },
  })
  row1.append(typeBtn, colorInputs)

  // Row 3: X + Y
  const posRow = el('div', 'ei-dp-effects-grid')

  const xInput = createLabeledField({
    icon: 'X',
    value: values.x,
    onChange: (v) => {
      values.x = v
      applyShadow(tracker, values)
      onChange()
    },
  })

  const yInput = createLabeledField({
    icon: 'Y',
    value: values.y,
    onChange: (v) => {
      values.y = v
      applyShadow(tracker, values)
      onChange()
    },
  })

  posRow.append(xInput, yInput)

  // Row 4: Blur + Spread
  const blurSpreadRow = el('div', 'ei-dp-effects-grid')

  const blurInput = createLabeledField({
    icon: '',
    iconHtml: EFFECTS_ICONS.blur ?? '',
    value: values.blur,
    min: 0,
    onChange: (v) => {
      values.blur = v
      applyShadow(tracker, values)
      onChange()
    },
  })

  const spreadInput = createLabeledField({
    icon: '',
    iconHtml: EFFECTS_ICONS.spread ?? '',
    value: values.spread,
    onChange: (v) => {
      values.spread = v
      applyShadow(tracker, values)
      onChange()
    },
  })

  blurSpreadRow.append(blurInput, spreadInput)

  panel.append(row1, posRow, blurSpreadRow)
  return panel
}

function applyShadow(tracker: StyleTracker, values: ShadowValues): void {
  const { type, color, opacity, x, y, blur, spread } = values

  let r = 0, g = 0, b = 0
  const hex = color.replace('#', '')
  if (hex.length >= 6) {
    r = parseInt(hex.slice(0, 2), 16)
    g = parseInt(hex.slice(2, 4), 16)
    b = parseInt(hex.slice(4, 6), 16)
  }
  const alpha = opacity / 100
  const rgba = `rgba(${r}, ${g}, ${b}, ${alpha})`

  const inset = type === 'inner' ? 'inset ' : ''
  const shadowValue = `${inset}${x}px ${y}px ${blur}px ${spread}px ${rgba}`

  tracker.apply('box-shadow', shadowValue)
}

function detectShadowValues(element: HTMLElement): ShadowValues | null {
  const style = window.getComputedStyle(element)
  const boxShadow = style.getPropertyValue('box-shadow')

  if (!boxShadow || boxShadow === 'none') return null

  // Parse box-shadow: inset? offsetX offsetY blur spread color
  const isInset = boxShadow.includes('inset')
  const shadowParts = boxShadow.replace('inset', '').trim().split(/\s+/)

  // Extract values - box-shadow format varies, try to parse
  let x = 0, y = 0, blur = 0, spread = 0
  let colorPart = ''

  // Try to extract numbers (first 4 should be x, y, blur, spread)
  const nums: number[] = []
  for (const part of shadowParts) {
    const num = parseFloat(part)
    if (Number.isFinite(num)) {
      nums.push(num)
    } else {
      // Non-number part is likely the color
      colorPart = part
    }
  }

  if (nums.length >= 2) {
    x = nums[0] ?? 0
    y = nums[1] ?? 0
    blur = nums[2] ?? 0
    spread = nums[3] ?? 0
  }

  // Parse color
  const hex = rgbToHex(colorPart || 'rgba(0,0,0,0.25)')

  // Try to extract opacity from rgba if present
  let opacity = 100
  const rgbaMatch = boxShadow.match(/rgba\([^,]+,\s*[^,]+,\s*[^,]+,\s*([\d.]+)\)/)
  if (rgbaMatch) {
    opacity = Math.round(parseFloat(rgbaMatch[1]!) * 100)
  }

  return {
    type: isInset ? 'inner' : 'drop',
    color: hex,
    opacity,
    x,
    y,
    blur,
    spread,
  }
}

// --- Stroke Panel ---

function createStrokePanel(
  initialValues: StrokeValues,
  tracker: StyleTracker,
  onRemove: () => void,
  onChange: () => void,
): HTMLDivElement {
  const panel = el('div', 'ei-dp-stroke-panel')
  panel.setAttribute(IGNORE_ATTR, 'true')

  // Use shared values directly (mutated in place)
  const values = initialValues

  // Row 1: Color + Opacity (remove button outside)
  const colorWrapper = el('div', 'ei-dp-stroke-color-wrapper')
  const strokePageColors = collectPageColors(document).filter(color => color !== values.color)
  const colorInputs = createFillRow({
    value: values.color,
    opacity: values.opacity,
    className: 'ei-dp-stroke-color-row',
    onChange: (hex) => {
      values.color = hex
      applyStroke(tracker, values)
      onChange()
    },
    onOpacityChange: (opacity, currentHex) => {
      values.opacity = opacity
      values.color = currentHex
      applyStroke(tracker, values)
      onChange()
    },
    onSwatchClick: (swatch) => {
      openSolidColorPopover(swatch, values.color, values.opacity, strokePageColors, tracker, (nextColor, nextOpacity) => {
        values.color = nextColor
        values.opacity = nextOpacity
        applyStroke(tracker, values)
        onChange()
      }, onChange)
    },
  })
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
  settingsBtn.title = i18n.design.editIndividualSides
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
    }, () => {
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
  onTextChange: (original: string, modified: string) => void
}

export function buildDesignPanel(
  element: HTMLElement,
  info: InspectorInfo,
  tracker: StyleTracker,
  callbacks: DesignPanelCallbacks,
): HTMLDivElement {
  // Close any stale dropdown from previous panel
  closeSizingDropdown()
  closeGapDropdown()
  closeWeightDropdown()
  closeFontDropdown()
  closePosDropdown()
  closeFillPopover()
  const container = el('div', 'ei-dp')

  // --- Text Content Section (for text elements) ---
  const originalText = info.text || ''
  const hasTextContent = originalText.length > 0 && originalText.trim().length > 0
  // A text element has text but no block-level children (leaf text node)
  const isTextElement = hasTextContent && !Array.from(element.children).some((child) => {
    const d = window.getComputedStyle(child).display
    return d === 'block' || d === 'flex' || d === 'grid' || d === 'table' || d === 'list-item'
  })

  if (isTextElement) {
    const textSection = el('div', 'ei-dp-text-section')

    // Header with label and restore button
    const header = el('div', 'ei-dp-text-header')
    const label = el('span', 'ei-dp-text-label', i18n.changes.textLabel)

    const restoreBtn = el('button', 'ei-dp-text-restore')
    restoreBtn.type = 'button'
    restoreBtn.setAttribute(IGNORE_ATTR, 'true')
    restoreBtn.innerHTML = RESTORE_ICON
    restoreBtn.style.display = 'none' // Hidden by default

    header.append(label, restoreBtn)

    // Text input area
    const inputWrap = el('div', 'ei-dp-text-input-wrap')
    const textInput = document.createElement('textarea')
    textInput.className = 'ei-dp-text-input'
    textInput.setAttribute(IGNORE_ATTR, 'true')
    textInput.value = originalText
    textInput.rows = 1

    // Auto-resize textarea (max 5 lines)
    const MAX_LINES = 5
    const LINE_HEIGHT = 16
    const MAX_HEIGHT = LINE_HEIGHT * MAX_LINES
    const adjustHeight = () => {
      textInput.style.height = 'auto'
      const scrollHeight = textInput.scrollHeight
      textInput.style.height = Math.min(scrollHeight, MAX_HEIGHT) + 'px'
    }

    inputWrap.appendChild(textInput)
    textSection.append(header, inputWrap)
    container.appendChild(textSection)

    // Initial height adjustment
    requestAnimationFrame(adjustHeight)

    // Track if text has been modified
    let isModified = false

    textInput.addEventListener('input', () => {
      adjustHeight()
      const newText = textInput.value
      if (newText !== originalText) {
        if (!isModified) {
          isModified = true
          restoreBtn.style.display = 'flex'
        }
        element.textContent = newText
        callbacks.onTextChange(originalText, newText)
        callbacks.onStyleChange()
      } else if (isModified) {
        isModified = false
        restoreBtn.style.display = 'none'
        callbacks.onTextChange(newText, originalText) // Revert change
      }
    })

    textInput.addEventListener('keydown', (e) => {
      e.stopPropagation()
    })

    restoreBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      textInput.value = originalText
      element.textContent = originalText
      isModified = false
      restoreBtn.style.display = 'none'
      adjustHeight()
      callbacks.onTextChange(textInput.value, originalText) // Revert to original
      callbacks.onStyleChange()
    })
  }

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
    const label = el('div', 'ei-dp-sublabel')
    label.textContent = i18n.design.padding
    target.appendChild(label)
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

  // --- Margin helper ---
  function appendMarginFields(target: HTMLElement): void {
    const label = el('div', 'ei-dp-sublabel')
    label.textContent = i18n.design.margin
    target.appendChild(label)
    target.appendChild(grid(
      createLabeledField({
        icon: '',
        iconHtml: MARGIN_ICONS.left,
        value: parsePxValue(info.boxModel.margin.left),
        onChange: (v) => tracker.apply('margin-left', `${v}px`),
      }),
      createLabeledField({
        icon: '',
        iconHtml: MARGIN_ICONS.top,
        value: parsePxValue(info.boxModel.margin.top),
        onChange: (v) => tracker.apply('margin-top', `${v}px`),
      }),
    ))
    target.appendChild(grid(
      createLabeledField({
        icon: '',
        iconHtml: MARGIN_ICONS.right,
        value: parsePxValue(info.boxModel.margin.right),
        onChange: (v) => tracker.apply('margin-right', `${v}px`),
      }),
      createLabeledField({
        icon: '',
        iconHtml: MARGIN_ICONS.bottom,
        value: parsePxValue(info.boxModel.margin.bottom),
        onChange: (v) => tracker.apply('margin-bottom', `${v}px`),
      }),
    ))
  }

  const display = info.layout.display
  const isLayoutElement = display.includes('flex') || display.includes('grid')

  const showTypography = isTextElement && !!(info.typography.fontSize && info.typography.fontSize !== '0px')

  if (isLayoutElement) {
    // === 1. Auto layout section ===
    const layoutSec = createSection(i18n.design.autoLayout, { isFirst: true })

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
      createSizeField({ icon: 'W', dimension: 'width', value: info.rect.width, element, tracker, onChange: callbacks.onStyleChange }),
      createSizeField({ icon: 'H', dimension: 'height', value: info.rect.height, element, tracker, onChange: callbacks.onStyleChange }),
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
        gapInput.value = i18n.design.auto
        gapInput.style.color = 'var(--text-tertiary)'
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
            gapInput.value = i18n.design.auto
            gapInput.style.color = 'var(--text-tertiary)'
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
        })
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
        createGapField({ value: parsePxValue(info.layout.gap), tracker, onChange: callbacks.onStyleChange }),
        el('div'),
      ))
    }

    appendPaddingFields(layoutSec.content)
    appendMarginFields(layoutSec.content)
    container.appendChild(layoutSec.container)

  } else {
    // === 1. Size section (non-layout) ===
    const sizeSec = createSection(i18n.design.size, { isFirst: true })
    sizeSec.content.appendChild(grid(
      createSizeField({ icon: 'W', dimension: 'width', value: info.rect.width, element, tracker, onChange: callbacks.onStyleChange }),
      createSizeField({ icon: 'H', dimension: 'height', value: info.rect.height, element, tracker, onChange: callbacks.onStyleChange }),
    ))
    container.appendChild(sizeSec.container)

    // === 2. Spacing section (non-layout) ===
    const spacingSec = createSection(i18n.design.spacing)
    appendPaddingFields(spacingSec.content)
    appendMarginFields(spacingSec.content)
    container.appendChild(spacingSec.container)
  }

  // === 3. Appearance ===
  const appearanceSec = createSection(i18n.design.appearance)
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
    const typoSec = createSection(i18n.design.typography)

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

    // Row 3: Line height + Letter spacing
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
      tracker.apply('line-height', `${(v / 100).toFixed(2)}`)
    }))

    // Parse letter spacing (could be "normal", "0.1em", "2px", etc.)
    let letterSpacingValue = 0
    const ls = info.typography.letterSpacing
    if (ls && ls !== 'normal') {
      if (ls.endsWith('em')) {
        letterSpacingValue = parseFloat(ls)
      } else if (ls.endsWith('px')) {
        const fontSize = parsePxValue(info.typography.fontSize) || 16
        letterSpacingValue = parseFloat(ls) / fontSize
      }
    }

    row3.appendChild(createLetterSpacingField(letterSpacingValue, (v) => {
      tracker.apply('letter-spacing', `${v.toFixed(2)}em`)
    }))

    typoSec.content.appendChild(row3)

    // Row 4: Horizontal + Vertical align
    const row4 = el('div', 'ei-dp-typography-row')
    row4.appendChild(createAlignButtons(
      info.typography.textAlign || 'left',
      (v) => tracker.apply('text-align', v),
    ))
    row4.appendChild(createVerticalAlignButtons(
      window.getComputedStyle(element).verticalAlign || 'middle',
      (v) => tracker.apply('vertical-align', v),
    ))

    typoSec.content.appendChild(row4)

    // Row 5: Text color
    const textPageColors = collectPageColors(document).filter(color => color !== info.typography.color)
    typoSec.content.appendChild(createFillRow({
      value: info.typography.color,
      onChange: (v) => tracker.apply('color', v),
      onSwatchClick: (swatch) => {
        openSolidColorPopover(swatch, info.typography.color, 100, textPageColors, tracker, (nextColor) => {
          info.typography.color = nextColor
          tracker.apply('color', nextColor)
        }, callbacks.onStyleChange)
      },
    }))

    container.appendChild(typoSec.container)
  }

  // === 5. Fill ===
  const fillDraft = createFillDraft(element, info)
  const hasFill = fillDraft.kind !== 'solid' || info.visual.backgroundColor !== 'transparent' && info.visual.backgroundColor !== 'rgba(0, 0, 0, 0)'
  const pageColors = collectPageColors(document).filter(color => color !== fillDraft.color)

  function populateFillContent(contentEl: HTMLDivElement): void {
    contentEl.innerHTML = ''
    mountFillTrigger(contentEl, fillDraft, pageColors, tracker, callbacks.onStyleChange)
  }

  function refreshFillSectionTrigger(): void {
    updateFillTriggerInContainer(fillSection.content, fillDraft)
  }

  function openFillSectionTriggerPopover(): void {
    openFillTriggerFromContainer(fillSection.content, fillDraft, pageColors, tracker, callbacks.onStyleChange)
  }

  fillSection = createSection(i18n.design.fill, {
    addRemove: {
      onAdd: () => {
        fillDraft.kind = 'solid'
        fillDraft.color = '#FFFFFF'
        fillDraft.opacity = 100
        tracker.apply('background-color', '#FFFFFF')
        tracker.apply('background-image', 'none')
        closeFillPopover()
        populateFillContent(fillSection.content)
        fillSection.setHasContent(true)
        callbacks.onStyleChange()
      },
      onRemove: () => {
        tracker.apply('background-color', 'transparent')
        tracker.apply('background-image', 'none')
        tracker.apply('background-size', '')
        tracker.apply('background-position', '')
        tracker.apply('background-repeat', '')
        closeFillPopover()
        fillSection.content.innerHTML = ''
        fillSection.setHasContent(false)
        callbacks.onStyleChange()
      },
    },
  })
  if (hasFill) {
    populateFillContent(fillSection.content)
    fillSection.setHasContent(true)
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
      () => {
        // Remove via section button, not stroke panel's internal remove
      },
      callbacks.onStyleChange,
    ))
  }

  strokeSection = createSection(i18n.design.stroke, {
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

  // === 7. Effects (Shadow) ===
  let effectsSection: SectionHandle
  const existingShadow = detectShadowValues(element)
  // Ignore shadow if it's from stroke (inset stroke uses box-shadow too)
  const isStrokeShadow = existingStroke?.position === 'inside'
  const hasEffects = existingShadow && !isStrokeShadow

  function populateEffectsContent(contentEl: HTMLDivElement, values: ShadowValues): void {
    contentEl.innerHTML = ''
    contentEl.appendChild(createEffectsPanel(
      values,
      tracker,
      callbacks.onStyleChange,
    ))
  }

  effectsSection = createSection(i18n.design.effects, {
    addRemove: {
      onAdd: () => {
        const defaultShadow: ShadowValues = {
          type: 'drop',
          color: '#000000',
          opacity: 25,
          x: 0,
          y: 4,
          blur: 4,
          spread: 0,
        }
        applyShadow(tracker, defaultShadow)
        populateEffectsContent(effectsSection.content, defaultShadow)
        effectsSection.setHasContent(true)
        callbacks.onStyleChange()
      },
      onRemove: () => {
        tracker.apply('box-shadow', 'none')
        effectsSection.content.innerHTML = ''
        effectsSection.setHasContent(false)
        callbacks.onStyleChange()
      },
    },
  })
  if (hasEffects) {
    populateEffectsContent(effectsSection.content, existingShadow)
  } else {
    effectsSection.setHasContent(false)
  }
  container.appendChild(effectsSection.container)

  return container
}

// --- Design Panel Styles ---

export function getDesignStyles(): string {
  return `
.ei-dp { padding: 4px 0 0; }
.ei-dp-section { }
.ei-dp-section-border { border-top: 0.5px solid var(--border-subtle); }
.ei-dp-section-header { display: flex; align-items: center; justify-content: space-between; height: 40px; }
.ei-dp-section-label { font-size: 11px; font-weight: 500; color: var(--text-secondary); letter-spacing: 0.11px; }
.ei-dp-section-btn { display: flex; align-items: center; justify-content: center; width: var(--input-height); height: var(--input-height); padding: 0; border: none; background: transparent; color: var(--text-muted); cursor: pointer; border-radius: var(--field-radius); transition: color 0.12s ease; }
.ei-dp-section-btn:hover { color: var(--text-secondary); }
.ei-dp-section-btn:focus { outline: none; }
.ei-dp-section-btn svg { display: block; }
.ei-dp-section-content { padding-bottom: 16px; }
.ei-dp-section-content[data-visible="false"] { display: none; }
.ei-dp-section-content > :last-child { margin-bottom: 0; }
.ei-dp-sublabel { font-size: 10px; font-weight: 400; color: var(--text-muted); letter-spacing: 0.1px; margin-bottom: 4px; padding-left: 2px; }
.ei-dp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.ei-dp-field { display: flex; align-items: center; height: var(--input-height); border-radius: var(--field-radius); border: 1px solid transparent; background: var(--surface-field); cursor: text; overflow: hidden; transition: border-color 0.15s ease; }
.ei-dp-field:hover { border-color: var(--border-default); }
.ei-dp-field:focus-within { border-color: var(--interactive-accent); }
.ei-dp-field-icon { flex-shrink: 0; width: var(--input-height); display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--text-muted); user-select: none; line-height: 0; }
.ei-dp-field-icon svg { display: block; }
.ei-dp-field-input { flex: 1; min-width: 0; height: 100%; border: 0; background: transparent; color: var(--text-primary); font-size: 11px; font-family: inherit; padding: 0 6px 0 0; outline: none; cursor: ew-resize; letter-spacing: 0.055px; }
.ei-dp-field-input:focus { cursor: text; }
.ei-dp-field-suffix { flex-shrink: 0; font-size: 11px; color: var(--text-muted); padding-right: 6px; user-select: none; }
.ei-dp-field-action { flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: var(--input-height); height: var(--input-height); padding: 0; border: none; background: transparent; color: var(--text-tertiary); cursor: pointer; border-radius: var(--field-radius); transition: background 0.12s ease, color 0.12s ease; }
.ei-dp-field-action:hover { color: var(--text-secondary); }
.ei-dp-field-action:focus { outline: none; }
.ei-dp-field-action[data-active="true"] { color: var(--interactive-accent); }
.ei-dp-field-radius { gap: 4px; }
.ei-dp-field-select { flex: 1; min-width: 0; height: 100%; border: 0; background: transparent; color: var(--text-primary); font-size: 11px; font-family: inherit; padding: 0 4px 0 0; outline: none; cursor: pointer; -webkit-appearance: none; }
.ei-dp-fill-trigger { display: flex; align-items: center; width: 100%; height: var(--input-height); border: 1px solid transparent; border-radius: var(--field-radius); background: var(--surface-field); color: var(--text-primary); padding: 0 8px; gap: 8px; font: inherit; overflow: hidden; }
.ei-dp-fill-trigger:focus-within { border-color: var(--interactive-accent); }
.ei-dp-fill-trigger-swatch { width: 16px; height: 16px; padding: 0; border: 0; border-radius: 4px; box-shadow: inset 0 0 0 1px var(--border-input); flex-shrink: 0; background-size: cover; background-position: center; cursor: pointer; }
.ei-dp-fill-trigger-swatch:hover { box-shadow: inset 0 0 0 1px var(--interactive-accent); }
.ei-dp-fill-trigger-swatch:focus { outline: none; box-shadow: inset 0 0 0 1px var(--interactive-accent), 0 0 0 2px color-mix(in srgb, var(--interactive-focus-ring) 30%, transparent); }
.ei-dp-fill-trigger-value { min-width: 0; flex: 1; height: 100%; border: 0; background: transparent; color: var(--text-primary); font-size: 11px; font-family: inherit; line-height: var(--input-height); letter-spacing: 0.055px; outline: none; padding: 0; }
.ei-dp-fill-trigger-opacity-wrap { display: flex; align-items: center; height: 100%; flex-shrink: 0; }
.ei-dp-fill-trigger-opacity { width: 34px; height: 100%; border: 0; background: transparent; color: var(--text-secondary); font-size: 11px; font-family: inherit; line-height: var(--input-height); letter-spacing: 0.055px; text-align: right; outline: none; padding: 0; }
.ei-dp-fill-trigger-opacity-suffix { color: var(--text-tertiary); font-size: 11px; line-height: var(--input-height); padding-left: 2px; }
.ei-dp-fill-popover { position: fixed; z-index: 2147483646; width: 240px; max-height: min(720px, calc(100vh - 32px)); overflow: hidden; background: color-mix(in srgb, var(--surface-panel) 98%, transparent); border-radius: 16px; box-shadow: var(--panel-shadow), inset 0 0 0 1px var(--border-subtle); cursor: default; user-select: none; backdrop-filter: blur(18px); }
.ei-dp-fill-chrome-header { cursor: grab; }
.ei-dp-fill-chrome-header:active { cursor: grabbing; }
.ei-dp-fill-popover input,
.ei-dp-fill-popover textarea,
.ei-dp-fill-popover button { user-select: auto; }
.ei-dp-fill-popover button,
.ei-dp-fill-popover input,
.ei-dp-fill-popover textarea,
.ei-dp-fill-popover select { cursor: auto; }
.ei-dp-fill-chrome { display: flex; flex-direction: column; max-height: inherit; overflow: hidden; }
.ei-dp-fill-chrome-header { height: 40px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; border-bottom: 1px solid var(--border-subtle); }
.ei-dp-fill-chrome-tabs { display: flex; gap: 4px; align-items: center; }
.ei-dp-fill-chrome-tab { height: var(--input-height); min-width: 58px; border: 0; border-radius: var(--field-radius); background: transparent; color: var(--text-secondary); padding: 0 10px; font: inherit; font-size: 11px; font-weight: 500; line-height: var(--input-height); cursor: pointer; }
.ei-dp-fill-chrome-tab:hover { background: var(--surface-hover); color: var(--text-primary); }
.ei-dp-fill-chrome-tab[data-active="true"] { background: var(--border-subtle); color: var(--text-primary); }
.ei-dp-fill-chrome-tab[data-active="false"] { background: transparent; }
.ei-dp-fill-chrome-actions { display: flex; gap: 6px; align-items: center; }
.ei-dp-fill-chrome-action { width: var(--input-height); height: var(--input-height); border: 0; border-radius: var(--field-radius); background: transparent; color: var(--text-primary); font-size: 18px; line-height: var(--input-height); padding: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.ei-dp-fill-chrome-action:hover { background: var(--border-subtle); }
.ei-dp-fill-popover::-webkit-scrollbar { width: 8px; }
.ei-dp-fill-popover::-webkit-scrollbar-track { background: transparent; }
.ei-dp-fill-popover::-webkit-scrollbar-thumb { background: var(--surface-hover-strong); border-radius: 999px; }
.ei-dp-fill-panel { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding: 0 12px 14px; }
.ei-dp-fill-modebar { display: flex; align-items: center; justify-content: flex-start; gap: 32px; height: 41px; padding: 0 0 0 4px; border-bottom: 1px solid var(--border-subtle); margin: 0; }
.ei-dp-fill-mode-btn { width: var(--input-height); height: var(--input-height); border: 0; border-radius: var(--field-radius); background: transparent; color: var(--text-secondary); padding: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.ei-dp-fill-mode-btn:hover { background: var(--surface-field); color: var(--text-primary); }
.ei-dp-fill-mode-btn[data-active="true"] { background: var(--border-default); color: var(--text-primary); }
.ei-dp-fill-mode-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; }
.ei-dp-fill-body { display: flex; flex-direction: column; align-items: center; gap: 10px; padding-top: 10px; }
.ei-dp-fill-row { display: flex; align-items: center; width: 100%; height: var(--input-height); border: 1px solid transparent; border-radius: var(--field-radius); background: var(--surface-field); color: var(--text-primary); padding: 0; gap: 0; overflow: hidden; }
.ei-dp-fill-row:hover { border-color: var(--border-default); }
.ei-dp-fill-row:focus-within { border-color: var(--interactive-accent); }
.ei-dp-color-square { position: relative; width: 208px; height: 208px; border-radius: 10px; overflow: hidden; box-shadow: inset 0 0 0 1px var(--border-subtle); cursor: default; }
.ei-dp-color-square-handle { position: absolute; left: -8px; top: 62px; width: 16px; height: 16px; border-radius: 50%; background: var(--text-inverse); box-shadow: var(--shadow-dropdown); border: 5px solid var(--text-inverse); box-sizing: border-box; }
.ei-dp-color-sliders { width: 208px; display: flex; flex-direction: column; gap: 10px; }
.ei-dp-color-slider-row { width: 208px; display: flex; align-items: center; gap: 8px; }
.ei-dp-eyedropper { width: 16px; height: 16px; color: var(--text-secondary); flex-shrink: 0; border: 0; padding: 0; background: transparent; cursor: pointer; }
.ei-dp-eyedropper svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 1.7; }
.ei-dp-eyedropper:hover { color: var(--text-primary); }
.ei-dp-color-slider { position: relative; width: 180px; height: 12px; border-radius: 999px; overflow: visible; align-self: flex-end; cursor: default; }
.ei-dp-color-slider-hue { background: linear-gradient(90deg, #ff2a2a 0%, #ffd600 16%, #2cff66 33%, #1ad7ff 50%, #3156ff 66%, #ff37f2 83%, #ff2a2a 100%); }
.ei-dp-color-slider-alpha { }
.ei-dp-color-slider-handle { position: absolute; left: 14px; top: -3px; width: 18px; height: 18px; border-radius: 50%; background: var(--text-inverse); box-shadow: var(--shadow-dropdown); border: 3px solid var(--text-inverse); box-sizing: border-box; }
.ei-dp-color-slider-handle::after { content: ''; position: absolute; inset: 2px; border-radius: 50%; border: 2px solid var(--control-handle-border); }
.ei-dp-color-slider-handle-alpha::after { border-color: var(--text-secondary); }
.ei-dp-color-slider-handle-alpha { left: calc(100% - 18px); }
.ei-dp-gradient-type-row { width: 208px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ei-dp-gradient-type-btn { height: var(--input-height); min-width: 112px; border: 1px solid var(--border-hover); border-radius: var(--field-radius); background: color-mix(in srgb, var(--surface-field) 40%, transparent); color: var(--text-primary); font: inherit; font-size: 11px; padding: 0 12px; text-align: left; cursor: pointer; }
.ei-dp-gradient-type-btn:hover { background: var(--surface-field); }
.ei-dp-gradient-icon-btn { width: var(--input-height); height: var(--input-height); border: 0; border-radius: var(--field-radius); background: transparent; color: var(--text-primary); display: flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; }
.ei-dp-gradient-icon-btn:hover { background: var(--border-subtle); }
.ei-dp-gradient-icon-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.6; }
.ei-dp-gradient-strip { position: relative; width: 208px; height: 64px; border-radius: 10px; box-shadow: inset 0 0 0 1px var(--border-subtle); }
.ei-dp-gradient-stop { position: absolute; top: -8px; width: 20px; height: 20px; border: 0; padding: 0; background: transparent; cursor: pointer; }
.ei-dp-gradient-stop-chip { display: block; width: 20px; height: 20px; border-radius: 6px; border: 4px solid var(--control-handle); box-shadow: var(--control-handle-shadow); box-sizing: border-box; }
.ei-dp-gradient-stop-dark .ei-dp-gradient-stop-chip { border-color: var(--text-muted); }
.ei-dp-gradient-stop[data-active="true"]::after { content: ''; position: absolute; left: 6px; top: 20px; width: 8px; height: 8px; border-radius: 50%; background: var(--interactive-accent); }
.ei-dp-gradient-stops-header { width: 208px; display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.ei-dp-gradient-stops-label { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.ei-dp-gradient-stop-row { width: 208px; height: 32px; display: grid; grid-template-columns: 54px 1fr 24px; gap: 8px; align-items: center; padding: 0 6px; border-radius: 8px; }
.ei-dp-gradient-stop-row[data-active="true"] { background: var(--interactive-selection); }
.ei-dp-gradient-stop-position { height: var(--input-height); display: flex; align-items: center; justify-content: center; gap: 1px; border-radius: var(--field-radius); background: var(--surface-field); }
.ei-dp-gradient-stop-position-input { width: 26px; height: 100%; border: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 11px; text-align: right; outline: none; }
.ei-dp-gradient-stop-position-suffix { color: var(--text-secondary); font-size: 11px; }
.ei-dp-gradient-stop-color { height: var(--input-height); display: grid; grid-template-columns: var(--input-height) 1fr 54px; align-items: center; border-radius: var(--field-radius); overflow: hidden; background: var(--surface-field); }
.ei-dp-gradient-stop-swatch-btn { position: relative; width: var(--input-height); height: var(--input-height); border: 0; padding: 0; background: transparent; cursor: pointer; }
.ei-dp-gradient-stop-swatch { display: block; width: 16px; height: 16px; border-radius: 4px; margin-left: 4px; box-shadow: inset 0 0 0 1px var(--border-hover); }
.ei-dp-gradient-stop-color-input { width: 100%; height: 100%; border: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 11px; padding: 0 6px; outline: none; text-transform: uppercase; }
.ei-dp-gradient-stop-opacity { height: 100%; display: flex; align-items: center; justify-content: center; gap: 1px; border-left: 1px solid var(--border-subtle); }
.ei-dp-gradient-stop-opacity-input { width: 28px; height: 100%; border: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 11px; text-align: right; outline: none; }
.ei-dp-gradient-stop-remove { width: var(--input-height); height: var(--input-height); border: 0; border-radius: var(--field-radius); background: transparent; color: var(--text-primary); font-size: 18px; line-height: var(--input-height); padding: 0; cursor: pointer; }
.ei-dp-gradient-stop-remove:hover { background: var(--border-subtle); }
.ei-dp-gradient-stop-remove:disabled { opacity: 0.35; cursor: default; }
.ei-dp-gradient-stop-remove:disabled:hover { background: transparent; }
.ei-dp-gradient-stop-row input { cursor: text; }
.ei-dp-gradient-stop-row .ei-dp-picker { cursor: pointer; }
.ei-dp-gradient-strip .ei-dp-gradient-stop { cursor: pointer; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch-btn .ei-dp-picker { inset: 0; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position,
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color { border: 1px solid transparent; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position:hover,
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color:hover { border-color: var(--border-default); }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position:focus-within,
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color:focus-within { border-color: var(--interactive-accent); }
.ei-dp-gradient-stop-row[data-active="true"] .ei-dp-gradient-stop-position,
.ei-dp-gradient-stop-row[data-active="true"] .ei-dp-gradient-stop-color { background: var(--border-subtle); }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position { box-sizing: border-box; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color { box-sizing: border-box; }
.ei-dp-gradient-strip { overflow: visible; }
.ei-dp-gradient-strip::before { content: ''; position: absolute; inset: 12px 0 0; border-radius: 10px; background: inherit; box-shadow: inset 0 0 0 1px var(--border-subtle); }
.ei-dp-gradient-stop { z-index: 1; }
.ei-dp-gradient-stop[data-active="true"] { z-index: 2; }
.ei-dp-gradient-stop-row { cursor: pointer; }
.ei-dp-gradient-stop-row > * { min-width: 0; }
.ei-dp-gradient-stop-position-input,
.ei-dp-gradient-stop-color-input,
.ei-dp-gradient-stop-opacity-input { min-width: 0; }
.ei-dp-gradient-icon-btn { cursor: pointer; }
.ei-dp-gradient-type-btn { cursor: pointer; }
.ei-dp-gradient-stop-swatch-btn:hover .ei-dp-gradient-stop-swatch { box-shadow: inset 0 0 0 1px var(--text-muted); }
.ei-dp-gradient-strip .ei-dp-gradient-stop-chip { pointer-events: none; }
.ei-dp-gradient-strip .ei-dp-gradient-stop::before { content: ''; position: absolute; left: 9px; top: 20px; width: 2px; height: 10px; background: var(--text-muted); }
.ei-dp-gradient-strip .ei-dp-gradient-stop-dark::before { background: var(--text-muted); }
.ei-dp-gradient-strip .ei-dp-gradient-stop[data-active="true"]::before { background: var(--interactive-accent); }
.ei-dp-gradient-strip .ei-dp-gradient-stop[data-active="true"]::after { content: ''; position: absolute; left: 6px; top: 30px; width: 8px; height: 8px; border-radius: 50%; background: var(--interactive-accent); }
.ei-dp-gradient-strip .ei-dp-gradient-stop-dark[data-active="true"]::after { background: var(--interactive-accent); }
.ei-dp-gradient-stop-chip { pointer-events: none; }
.ei-dp-gradient-strip { padding-top: 12px; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch-btn { min-width: var(--input-height); }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color-input { letter-spacing: 0.02em; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position-input,
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-opacity-input { letter-spacing: 0.02em; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position-suffix { flex-shrink: 0; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-opacity { min-width: 54px; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position { min-width: 54px; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color { min-width: 0; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-remove { flex-shrink: 0; }
.ei-dp-gradient-strip button { user-select: none; }
.ei-dp-gradient-stop-row button { user-select: none; }
.ei-dp-gradient-strip { user-select: none; }
.ei-dp-gradient-stop-row { user-select: none; }
.ei-dp-gradient-strip .ei-dp-gradient-stop { touch-action: none; }
.ei-dp-color-square,
.ei-dp-color-slider { touch-action: none; }
.ei-dp-gradient-strip { touch-action: none; }
.ei-dp-gradient-type-row { touch-action: auto; }
.ei-dp-gradient-stop-row { touch-action: auto; }
.ei-dp-gradient-stop-swatch-btn { touch-action: auto; }
.ei-dp-gradient-stop-remove { touch-action: auto; }
.ei-dp-gradient-icon-btn { touch-action: auto; }
.ei-dp-gradient-type-btn { touch-action: auto; }
.ei-dp-page-colors-title { touch-action: auto; }
.ei-dp-fill-chrome-header { touch-action: none; }
.ei-dp-fill-chrome-header button { touch-action: auto; }
.ei-dp-fill-mode-btn { touch-action: auto; }
.ei-dp-color-format { touch-action: auto; }
.ei-dp-eyedropper { touch-action: auto; }
.ei-dp-gradient-stop-swatch-btn .ei-dp-swatch { margin-left: 0; }
.ei-dp-gradient-stop-swatch-btn .ei-dp-picker { width: 100%; height: 100%; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color-input::placeholder { color: var(--text-muted); }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color-input:focus,
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position-input:focus,
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-opacity-input:focus { outline: none; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch-btn:focus { outline: none; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch-btn:focus-visible .ei-dp-gradient-stop-swatch { box-shadow: inset 0 0 0 1px var(--text-muted), 0 0 0 1px var(--interactive-accent); }
.ei-dp-gradient-strip .ei-dp-gradient-stop:focus { outline: none; }
.ei-dp-gradient-strip .ei-dp-gradient-stop:focus-visible .ei-dp-gradient-stop-chip { box-shadow: inset 0 0 0 1px var(--border-hover), 0 0 0 1px var(--interactive-accent); }
.ei-dp-gradient-type-btn:focus-visible,
.ei-dp-gradient-icon-btn:focus-visible,
.ei-dp-gradient-stop-remove:focus-visible { outline: 1px solid var(--interactive-accent); outline-offset: 0; }
.ei-dp-gradient-stop-row[data-active="true"] { box-shadow: inset 0 0 0 1px var(--border-subtle); }
.ei-dp-gradient-stop-row[data-active="true"] .ei-dp-gradient-stop-position,
.ei-dp-gradient-stop-row[data-active="true"] .ei-dp-gradient-stop-color { border-color: var(--surface-field); }
.ei-dp-gradient-stops-header .ei-dp-gradient-icon-btn { font-size: 22px; line-height: 22px; }
.ei-dp-gradient-type-row .ei-dp-gradient-icon-btn { color: var(--text-secondary); }
.ei-dp-gradient-type-row .ei-dp-gradient-icon-btn:hover { color: var(--text-primary); }
.ei-dp-gradient-strip .ei-dp-gradient-stop-dark .ei-dp-gradient-stop-chip { box-shadow: var(--control-handle-shadow); }
.ei-dp-gradient-strip .ei-dp-gradient-stop-chip { box-sizing: border-box; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch { box-sizing: border-box; }
.ei-dp-gradient-strip .ei-dp-gradient-stop[data-active="true"] .ei-dp-gradient-stop-chip { box-shadow: var(--control-handle-shadow), 0 0 0 1px var(--interactive-accent-soft); }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch-btn .ei-dp-picker { opacity: 0; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch-btn { overflow: hidden; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch { margin-top: 4px; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch-btn { display: flex; align-items: center; justify-content: center; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color { padding-right: 0; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-opacity { padding-right: 4px; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position { padding-right: 4px; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position-input { width: 22px; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-opacity-input { width: 24px; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color-input { padding-left: 4px; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch-btn { border-right: 1px solid var(--border-subtle); }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color { grid-template-columns: 24px 1fr 54px; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color-input { border-right: 1px solid var(--border-subtle); }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-opacity { border-left: 0; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position { justify-content: flex-end; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-opacity { justify-content: flex-end; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position,
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-opacity { padding-left: 0; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position-input,
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-opacity-input { text-align: right; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position-suffix { margin-left: 1px; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color { padding-left: 0; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch-btn { margin: 0; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch { margin-left: 0; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch-btn { width: var(--input-height); }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-swatch { width: 16px; height: 16px; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color-input { text-transform: uppercase; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-position,
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-color,
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-remove { transition: background 0.12s ease, border-color 0.12s ease; }
.ei-dp-gradient-stop-row:hover .ei-dp-gradient-stop-remove { background: var(--surface-hover); }
.ei-dp-gradient-stop-row:hover .ei-dp-gradient-stop-remove:disabled { background: transparent; }
.ei-dp-gradient-stop-row[data-active="true"] .ei-dp-gradient-stop-remove { background: var(--surface-field); }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-remove:hover { background: var(--surface-hover-strong); }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-remove:disabled:hover { background: transparent; }
.ei-dp-gradient-stop-row .ei-dp-gradient-stop-remove:disabled { color: var(--text-muted); }
.ei-dp-gradient-preview { width: 208px; height: 96px; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--border-default); }
.ei-dp-text-field { width: 208px; height: 28px; box-sizing: border-box; border: 1px solid transparent; border-radius: 6px; background: var(--surface-field); color: var(--text-primary); font: inherit; font-size: 11px; padding: 0 8px; outline: none; }
.ei-dp-text-field:hover { border-color: var(--border-default); }
.ei-dp-text-field:focus { border-color: var(--interactive-accent); }
.ei-dp-color-value-row { display: flex; align-items: center; gap: 8px; width: 208px; }
.ei-dp-color-format { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; height: var(--input-height); border: 1px solid transparent; border-radius: var(--field-radius); background: var(--surface-field); color: var(--text-primary); font: inherit; font-size: 11px; font-weight: 500; cursor: pointer; padding: 0 8px; transition: border-color 0.15s ease, background 0.12s ease; }
.ei-dp-color-format:hover { border-color: var(--border-default); background: var(--surface-hover-strong); }
.ei-dp-color-format:focus { outline: none; border-color: var(--interactive-accent); }
.ei-dp-color-format-arrow { display: flex; align-items: center; color: var(--text-tertiary); flex-shrink: 0; }
.ei-dp-color-format-arrow svg { width: 10px; height: 10px; }
.ei-dp-color-segment-group { display: flex; align-items: stretch; flex: 1 1 auto; min-width: 0; height: var(--input-height); border-radius: var(--field-radius); overflow: hidden; background: var(--surface-field); }
.ei-dp-color-segment-group[data-single="true"] { display: block; }
.ei-dp-color-segment-group:focus-within { box-shadow: inset 0 0 0 1px var(--interactive-accent); }
.ei-dp-color-segment-input { width: 100%; min-width: 0; height: 100%; border: 0; border-radius: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 11px; padding: 0 8px; outline: none; }
.ei-dp-color-segment-number { text-align: center; padding: 0 6px; }
.ei-dp-color-segment-group > .ei-dp-color-segment-input + .ei-dp-color-segment-input,
.ei-dp-color-segment-group > .ei-dp-color-segment-input + .ei-dp-color-segment-suffix,
.ei-dp-color-segment-group > .ei-dp-color-segment-suffix + .ei-dp-color-segment-input { box-shadow: inset 1px 0 0 var(--surface-field); }
.ei-dp-color-segment-suffix { flex-shrink: 0; display: flex; align-items: center; justify-content: center; min-width: 28px; padding: 0 8px; color: var(--text-secondary); font-size: 11px; }
.ei-dp-color-segment-group[data-format="rgb"] > .ei-dp-color-segment-number,
.ei-dp-color-segment-group[data-format="hsl"] > .ei-dp-color-segment-number,
.ei-dp-color-segment-group[data-format="hsb"] > .ei-dp-color-segment-number { width: 0; flex: 1 1 0; }
.ei-dp-color-segment-group[data-format="hex"] > .ei-dp-color-segment-input:first-child { flex: 1 1 auto; }
.ei-dp-color-segment-group[data-format="hex"] > .ei-dp-color-segment-number { width: 40px; flex: 0 0 40px; }
.ei-dp-color-segment-group[data-format="css"] > .ei-dp-color-segment-input,
.ei-dp-color-segment-group[data-single="true"] > .ei-dp-color-segment-input { width: 100%; }
.ei-dp-color-segment-input::-webkit-outer-spin-button,
.ei-dp-color-segment-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.ei-dp-color-segment-input { -moz-appearance: textfield; }
.ei-dp-page-colors { width: 208px; padding-top: 0; }
.ei-dp-page-colors-title { width: 100%; height: var(--input-height); display: flex; align-items: center; justify-content: space-between; padding: 0 8px; border: 1px solid transparent; border-radius: var(--field-radius); background: var(--surface-field); color: var(--text-primary); font: inherit; font-size: 11px; font-weight: 500; letter-spacing: 0.01em; cursor: pointer; transition: border-color 0.15s ease, background 0.12s ease; }
.ei-dp-page-colors-title:hover { border-color: var(--border-default); background: var(--border-subtle); }
.ei-dp-page-colors-title:focus { outline: none; }
.ei-dp-page-colors-title:focus-visible { border-color: var(--interactive-accent); }
.ei-dp-page-colors-title-text { pointer-events: none; }
.ei-dp-page-colors-title-arrow { display: flex; align-items: center; color: var(--text-tertiary); transition: transform 0.12s ease; }
.ei-dp-page-colors-title[data-open="false"] .ei-dp-page-colors-title-arrow { transform: rotate(-90deg); }
.ei-dp-page-colors-title-arrow svg { width: 10px; height: 10px; }
.ei-dp-page-colors-grid { display: grid; grid-template-columns: repeat(8, 18px); justify-content: space-between; gap: 8px 8px; margin-top: 10px; }
.ei-dp-page-color { width: 18px; height: 18px; border: 0; border-radius: 4px; cursor: pointer; padding: 0; box-shadow: inset 0 0 0 1px var(--border-input); }
.ei-dp-page-color:hover { box-shadow: inset 0 0 0 1px var(--text-tertiary); }
.ei-dp-swatch { width: 14px; height: 14px; border-radius: 2px; border: none; box-shadow: inset 0 0 0 1px var(--border-default); flex-shrink: 0; position: relative; cursor: pointer; overflow: hidden; margin-left: 4px; }
.ei-dp-picker { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.ei-dp-hex { flex: 1; min-width: 0; height: 100%; border: none; background: transparent; color: var(--text-primary); font-size: 11px; font-family: inherit; padding: 0 8px; outline: none; }
.ei-dp-fill-opacity { flex-shrink: 0; width: 32px; height: 100%; border: none; border-left: none; background: transparent; color: var(--text-primary); font-size: 11px; font-family: inherit; padding: 0 4px; outline: none; text-align: right; cursor: ew-resize; }
.ei-dp-fill-opacity:focus { cursor: text; }
.ei-dp-fill-opacity-suffix { flex-shrink: 0; font-size: 11px; color: var(--text-muted); padding-right: 8px; }
.ei-dp-btn-group { display: flex; gap: 0; margin-bottom: 8px; background: var(--surface-field); border-radius: var(--field-radius); overflow: hidden; }
.ei-dp-btn { flex: 1; height: var(--input-height); border-radius: var(--field-radius); border: none; background: transparent; color: var(--text-muted); font-size: 10px; font-weight: 600; cursor: pointer; padding: 0; transition: all 0.12s ease; display: flex; align-items: center; justify-content: center; }
.ei-dp-btn svg { display: block; }
.ei-dp-btn:hover { color: var(--text-secondary); }
.ei-dp-btn[data-active="true"] { background: transparent; color: var(--text-primary); box-shadow: inset 0 0 0 0.5px var(--border-input); }
.ei-dp-align-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start; }
.ei-dp-align-row .ei-dp-field { flex: 1; }
.ei-dp-align-row > * { flex: 1; min-width: 0; }
.ei-dp-align-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; background: var(--surface-field); border: none; border-radius: var(--field-radius); padding: 5px 1px; }
.ei-dp-align-cell { display: flex; align-items: center; justify-content: center; width: 28px; height: 15px; background: transparent; border: none; border-radius: 3px; color: var(--text-faint); cursor: pointer; padding: 0; transition: all 0.12s ease; }
.ei-dp-align-cell:hover { background: var(--border-subtle); color: var(--text-muted); }
.ei-dp-align-cell[data-active="true"] { color: var(--interactive-accent); }
.ei-dp-align-cell[data-row-active="true"] { color: var(--text-tertiary); }
.ei-dp-gap-field { display: flex; align-items: center; height: var(--input-height); border-radius: var(--field-radius); border: 1px solid transparent; background: var(--surface-field); cursor: text; overflow: hidden; transition: border-color 0.15s ease; position: relative; min-width: 0; }
.ei-dp-gap-field:hover { border-color: var(--border-default); }
.ei-dp-gap-field:focus-within { border-color: var(--interactive-accent); }
.ei-dp-gap-field .ei-dp-field-input { flex: 1; min-width: 0; }
.ei-dp-gap-trigger { flex-shrink: 0; display: flex; align-items: center; justify-content: center; height: 100%; width: 25px; cursor: pointer; color: var(--text-muted); transition: color 0.12s ease; }
.ei-dp-gap-trigger:hover { color: var(--text-secondary); }
.ei-dp-gap-trigger svg { display: block; }
.ei-dp-size-field { display: flex; align-items: center; height: var(--input-height); border-radius: var(--field-radius); border: 1px solid transparent; background: var(--surface-field); cursor: text; overflow: hidden; transition: border-color 0.15s ease; position: relative; min-width: 0; }
.ei-dp-size-field:hover { border-color: var(--border-default); }
.ei-dp-size-field:focus-within { border-color: var(--interactive-accent); }
.ei-dp-size-field .ei-dp-field-input { flex: 1; min-width: 0; }
.ei-dp-size-trigger { flex-shrink: 0; display: flex; align-items: center; height: 100%; padding: 0 4px; cursor: pointer; color: var(--text-tertiary); font-size: 10px; border-left: none; transition: color 0.12s ease; }
.ei-dp-size-trigger:hover { color: var(--text-secondary); }
.ei-dp-size-mode { font-size: 10px; letter-spacing: 0.05px; white-space: nowrap; }
.ei-dp-size-dropdown { position: absolute; z-index: 100; background: var(--surface-dropdown); border-radius: 13px; padding: 8px; box-shadow: var(--shadow-dropdown), inset 0px 0.5px 0px var(--border-subtle), inset 0px 0px 0.5px var(--text-muted); min-width: 150px; }
.ei-dp-size-option { display: flex; align-items: center; height: var(--input-height); border-radius: var(--field-radius); cursor: pointer; padding: 0; gap: 0; color: var(--text-primary); transition: background 0.1s ease; }
.ei-dp-size-option:hover { background: var(--border-subtle); }
.ei-dp-size-check { flex-shrink: 0; width: 26px; display: flex; align-items: center; justify-content: center; color: var(--text-primary); }
.ei-dp-size-check svg { display: block; }
.ei-dp-size-option-icon { flex-shrink: 0; width: var(--input-height); height: var(--input-height); display: flex; align-items: center; justify-content: center; color: var(--text-primary); }
.ei-dp-size-option-icon svg { display: block; }
.ei-dp-size-option-label { font-size: 11px; letter-spacing: 0.055px; white-space: nowrap; }
.ei-dp-stroke-panel { }
.ei-dp-stroke-color-wrapper { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
.ei-dp-stroke-color-row { display: flex; align-items: center; height: var(--input-height); border-radius: var(--field-radius); border: 1px solid transparent; background: var(--surface-field); overflow: hidden; flex: 1; transition: border-color 0.15s ease; }
.ei-dp-stroke-color-row:hover { border-color: var(--border-default); }
.ei-dp-stroke-color-row:focus-within { border-color: var(--interactive-accent); }
.ei-dp-stroke-remove { display: flex; align-items: center; justify-content: center; width: var(--input-height); height: var(--input-height); padding: 0; border: none; background: transparent; color: var(--text-muted); cursor: pointer; border-radius: var(--field-radius); flex-shrink: 0; transition: color 0.12s ease; }
.ei-dp-stroke-remove:hover { color: var(--text-secondary); }
.ei-dp-stroke-remove:focus { outline: none; }
.ei-dp-stroke-remove svg { display: block; }
.ei-dp-stroke-settings-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; align-items: center; }
.ei-dp-stroke-pos-btn { display: flex; align-items: center; justify-content: space-between; height: var(--input-height); padding: 0 8px; border: none; background: var(--surface-field); color: var(--text-primary); font-size: 11px; font-family: inherit; cursor: pointer; border-radius: var(--field-radius); width: 100%; transition: background 0.12s ease; }
.ei-dp-stroke-pos-btn:hover { background: var(--surface-hover-strong); }
.ei-dp-stroke-pos-btn:focus { outline: none; }
.ei-dp-stroke-pos-arrow { display: flex; align-items: center; color: var(--text-muted); }
.ei-dp-stroke-pos-arrow svg { display: block; }
.ei-dp-stroke-sides-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.ei-dp-font-select { display: flex; align-items: center; justify-content: space-between; height: var(--input-height); border-radius: var(--field-radius); background: var(--surface-field); padding: 0 8px; cursor: pointer; transition: background 0.12s ease; }
.ei-dp-font-family-select { margin-bottom: 8px; }
.ei-dp-font-select:hover { background: var(--surface-hover-strong); }
.ei-dp-font-text { font-size: 11px; color: var(--text-primary); letter-spacing: 0.055px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ei-dp-font-arrow { display: flex; align-items: center; color: var(--text-muted); flex-shrink: 0; margin-left: 8px; }
.ei-dp-font-arrow svg { display: block; }
.ei-dp-font-dropdown { position: absolute; z-index: 100; background: var(--surface-dropdown); border-radius: 13px; padding: 8px; box-shadow: var(--shadow-dropdown), inset 0px 0.5px 0px var(--border-subtle), inset 0px 0px 0.5px var(--text-muted); min-width: 180px; max-height: 200px; overflow-y: auto; }
.ei-dp-font-dropdown::-webkit-scrollbar { width: 8px; }
.ei-dp-font-dropdown::-webkit-scrollbar-track { background: var(--surface-field); border-radius: 4px; }
.ei-dp-font-dropdown::-webkit-scrollbar-thumb { background: var(--surface-active); border-radius: 4px; }
.ei-dp-font-dropdown::-webkit-scrollbar-thumb:hover { background: var(--surface-hover-strong); }
.ei-dp-font-option { display: flex; align-items: center; height: var(--dropdown-option-height); padding: 0 8px; border-radius: var(--field-radius); cursor: pointer; font-size: 11px; color: var(--text-primary); letter-spacing: 0.055px; transition: background 0.1s ease; }
.ei-dp-font-option:hover { background: var(--border-subtle); }
.ei-dp-font-option[data-active="true"] { background: var(--surface-active); }
.ei-dp-color-format-dropdown { position: absolute; z-index: 100; background: var(--surface-dropdown); border-radius: 13px; padding: 8px; box-shadow: var(--shadow-dropdown), inset 0px 0.5px 0px var(--border-subtle), inset 0px 0px 0.5px var(--text-muted); min-width: 112px; }
.ei-dp-color-format-option { display: flex; align-items: center; height: var(--dropdown-option-height); padding: 0 8px 0 0; border-radius: var(--field-radius); cursor: pointer; font-size: 11px; color: var(--text-primary); letter-spacing: 0.055px; transition: background 0.1s ease; }
.ei-dp-color-format-option:hover { background: var(--border-subtle); }
.ei-dp-color-format-option[data-active="true"] { background: var(--surface-active); }
.ei-dp-color-format-check { flex-shrink: 0; width: 24px; display: flex; align-items: center; justify-content: center; color: var(--text-primary); font-size: 10px; }
.ei-dp-typography-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.ei-dp-align-btns { display: flex; height: var(--input-height); border-radius: var(--field-radius); background: var(--surface-field); overflow: hidden; }
.ei-dp-align-btn { flex: 1; height: var(--input-height); border: none; background: transparent; color: var(--text-muted); cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; transition: all 0.12s ease; }
.ei-dp-align-btn svg { display: block; }
.ei-dp-align-btn:hover { color: var(--text-secondary); }
.ei-dp-align-btn[data-active="true"] { color: var(--text-primary); background: var(--surface-hover); box-shadow: inset 0 0 0 0.5px var(--border-subtle); }
.ei-dp-field-line-height { gap: 4px; }
.ei-dp-field-letter-spacing { gap: 4px; }
.ei-dp-text-section { display: flex; flex-direction: column; border-bottom: 0.5px solid var(--border-subtle); }
.ei-dp-text-header { display: flex; align-items: center; justify-content: space-between; height: 40px; }
.ei-dp-text-label { font-size: 11px; font-weight: 500; color: var(--text-secondary); letter-spacing: 0.11px; }
.ei-dp-text-restore { display: flex; align-items: center; justify-content: center; width: var(--input-height); height: var(--input-height); padding: 0; border: none; background: transparent; color: var(--text-muted); cursor: pointer; border-radius: var(--field-radius); transition: color 0.12s ease; }
.ei-dp-text-restore:hover { color: var(--text-secondary); }
.ei-dp-text-restore:focus { outline: none; }
.ei-dp-text-restore svg { display: block; }
.ei-dp-text-input-wrap { display: flex; align-items: center; background: var(--surface-field); border: 1px solid transparent; border-radius: var(--field-radius); padding: 4px 8px; margin-bottom: 16px; transition: border-color 0.15s ease; }
.ei-dp-text-input-wrap:hover { border-color: var(--border-default); }
.ei-dp-text-input-wrap:focus-within { border-color: var(--interactive-accent); }
.ei-dp-text-input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--text-primary); font-size: 11px; font-family: inherit; line-height: 16px; padding: 0; resize: none; outline: none; letter-spacing: 0.055px; max-height: 80px; overflow-y: auto; }
.ei-dp-text-input::placeholder { color: var(--text-muted); }
.ei-dp-text-input::-webkit-scrollbar { width: 4px; }
.ei-dp-text-input::-webkit-scrollbar-track { background: transparent; }
.ei-dp-text-input::-webkit-scrollbar-thumb { background: var(--surface-active); border-radius: 2px; }
.ei-dp-text-input::-webkit-scrollbar-thumb:hover { background: var(--surface-hover-strong); }
.ei-dp-effects-panel { }
.ei-dp-effects-row1 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: center; gap: 8px; margin-bottom: 8px; }
.ei-dp-effects-row1 > * { min-width: 0; width: 100%; }
.ei-dp-effects-type-btn { display: flex; align-items: center; justify-content: space-between; height: var(--input-height); padding: 0 8px; border: 1px solid transparent; background: var(--surface-field); color: var(--text-primary); font-size: 11px; font-family: inherit; cursor: pointer; border-radius: var(--field-radius); min-width: 0; transition: border-color 0.15s ease, background 0.12s ease; }
.ei-dp-effects-type-btn:hover { border-color: var(--border-default); background: var(--border-subtle); }
.ei-dp-effects-type-btn:focus { outline: none; border-color: var(--interactive-accent); }
.ei-dp-effects-type-arrow { display: flex; align-items: center; color: var(--text-muted); }
.ei-dp-effects-type-arrow svg { display: block; }
.ei-dp-effects-color-row { display: flex; align-items: center; height: var(--input-height); border-radius: var(--field-radius); border: 1px solid transparent; background: var(--surface-field); overflow: hidden; min-width: 0; transition: border-color 0.15s ease; }
.ei-dp-effects-color-row:hover { border-color: var(--border-default); }
.ei-dp-effects-color-row:focus-within { border-color: var(--interactive-accent); }
.ei-dp-effects-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
`
}
