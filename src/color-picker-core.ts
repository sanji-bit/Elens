export type HsvaColor = {
  h: number
  s: number
  v: number
  a: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function roundChannel(value: number): number {
  return Math.round(value * 10000) / 10000
}

export function normalizeHsva(value: HsvaColor): HsvaColor {
  return {
    h: roundChannel(clamp(Number.isFinite(value.h) ? value.h : 0, 0, 360)),
    s: roundChannel(clamp(Number.isFinite(value.s) ? value.s : 0, 0, 1)),
    v: roundChannel(clamp(Number.isFinite(value.v) ? value.v : 0, 0, 1)),
    a: roundChannel(clamp(Number.isFinite(value.a) ? value.a : 1, 0, 1)),
  }
}

export function hexToHsva(hex: string, opacity = 100): HsvaColor {
  const normalized = hex.trim().replace(/^#/, '')
  const expanded = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized
  if (!/^[0-9a-f]{6}$/i.test(expanded)) throw new Error(`Invalid hex color: ${hex}`)

  const r = Number.parseInt(expanded.slice(0, 2), 16) / 255
  const g = Number.parseInt(expanded.slice(2, 4), 16) / 255
  const b = Number.parseInt(expanded.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0

  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6)
    else if (max === g) h = 60 * ((b - r) / delta + 2)
    else h = 60 * ((r - g) / delta + 4)
  }
  if (h < 0) h += 360

  return normalizeHsva({
    h,
    s: max === 0 ? 0 : delta / max,
    v: max,
    a: opacity / 100,
  })
}

export function hsvaToHex(value: HsvaColor): string {
  const { h, s, v } = normalizeHsva(value)
  const hue = h === 360 ? 0 : h
  const chroma = v * s
  const segment = hue / 60
  const x = chroma * (1 - Math.abs((segment % 2) - 1))
  const m = v - chroma
  let r = 0
  let g = 0
  let b = 0

  if (segment < 1) [r, g, b] = [chroma, x, 0]
  else if (segment < 2) [r, g, b] = [x, chroma, 0]
  else if (segment < 3) [r, g, b] = [0, chroma, x]
  else if (segment < 4) [r, g, b] = [0, x, chroma]
  else if (segment < 5) [r, g, b] = [x, 0, chroma]
  else [r, g, b] = [chroma, 0, x]

  const toHex = (channel: number): string => Math.round((channel + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export function hsvaToOpacity(value: HsvaColor): number {
  return Math.round(normalizeHsva(value).a * 100)
}

export function hsvaHueColor(value: HsvaColor): string {
  return `hsl(${Math.round(normalizeHsva(value).h)}, 100%, 50%)`
}

export function hsvaFromPlane(value: HsvaColor, x: number, y: number, width: number, height: number): HsvaColor {
  if (width <= 0 || height <= 0) return value
  return normalizeHsva({
    ...value,
    s: x / width,
    v: 1 - y / height,
  })
}

export function hsvaFromHorizontalSlider(
  value: HsvaColor,
  channel: 'h' | 'a',
  x: number,
  width: number,
): HsvaColor {
  if (width <= 0) return value
  const ratio = clamp(x / width, 0, 1)
  return normalizeHsva({
    ...value,
    [channel]: channel === 'h' ? ratio * 360 : ratio,
  })
}

export function moveHsvaByKey(
  value: HsvaColor,
  channel: 'plane' | 'hue' | 'alpha',
  key: string,
  shiftKey = false,
): HsvaColor {
  const next = { ...normalizeHsva(value) }

  if (channel === 'plane') {
    const step = shiftKey ? 0.1 : 0.01
    if (key === 'ArrowLeft') next.s -= step
    else if (key === 'ArrowRight') next.s += step
    else if (key === 'ArrowUp') next.v += step
    else if (key === 'ArrowDown') next.v -= step
    else if (key === 'PageUp') next.v += 0.1
    else if (key === 'PageDown') next.v -= 0.1
    else if (key === 'Home') Object.assign(next, { s: 0, v: 1 })
    else if (key === 'End') Object.assign(next, { s: 1, v: 0 })
    else return next
    return normalizeHsva(next)
  }

  const target = channel === 'hue' ? 'h' : 'a'
  const arrowStep = channel === 'hue' ? (shiftKey ? 10 : 1) : (shiftKey ? 0.1 : 0.01)
  const pageStep = channel === 'hue' ? 10 : 0.1
  const max = channel === 'hue' ? 360 : 1

  if (key === 'ArrowLeft' || key === 'ArrowDown') next[target] -= arrowStep
  else if (key === 'ArrowRight' || key === 'ArrowUp') next[target] += arrowStep
  else if (key === 'PageDown') next[target] -= pageStep
  else if (key === 'PageUp') next[target] += pageStep
  else if (key === 'Home') next[target] = 0
  else if (key === 'End') next[target] = max
  else return next

  return normalizeHsva(next)
}
