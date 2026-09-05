import { describe, expect, test } from 'bun:test'
import {
  hexToHsva,
  hsvaFromHorizontalSlider,
  hsvaFromPlane,
  hsvaHueColor,
  hsvaToHex,
  hsvaToOpacity,
  moveHsvaByKey,
  normalizeHsva,
} from '../src/color-picker-core'

describe('color picker HSVA core', () => {
  test('normalizes channels into supported ranges', () => {
    expect(normalizeHsva({ h: 420, s: -1, v: 2, a: 1.4 })).toEqual({ h: 360, s: 0, v: 1, a: 1 })
  })

  test('round-trips six digit hex while keeping alpha separate', () => {
    const value = hexToHsva('#0080FF', 25)

    expect(value.h).toBeCloseTo(209.8824, 4)
    expect(value.s).toBeCloseTo(1, 4)
    expect(value.v).toBeCloseTo(1, 4)
    expect(value.a).toBeCloseTo(0.25, 4)
    expect(hsvaToHex(value)).toBe('#0080FF')
    expect(hsvaToOpacity(value)).toBe(25)
  })

  test('uses a pure hue color for the saturation plane', () => {
    expect(hsvaHueColor({ h: 210, s: 0.2, v: 0.3, a: 0.4 })).toBe('hsl(210, 100%, 50%)')
  })

  test('maps pointer coordinates to saturation and value', () => {
    expect(hsvaFromPlane({ h: 10, s: 0, v: 0, a: 1 }, 50, 25, 100, 100)).toEqual({
      h: 10,
      s: 0.5,
      v: 0.75,
      a: 1,
    })
  })

  test('clamps pointer coordinates and ignores zero-sized controls', () => {
    const current = { h: 10, s: 0.25, v: 0.75, a: 0.5 }

    expect(hsvaFromPlane(current, 200, -20, 100, 100)).toEqual({ h: 10, s: 1, v: 1, a: 0.5 })
    expect(hsvaFromPlane(current, 10, 10, 0, 100)).toEqual(current)
    expect(hsvaFromHorizontalSlider(current, 'h', 10, 0)).toEqual(current)
  })

  test('maps horizontal sliders to hue and alpha', () => {
    const current = { h: 10, s: 0.25, v: 0.75, a: 0.5 }

    expect(hsvaFromHorizontalSlider(current, 'h', 50, 100)).toEqual({ ...current, h: 180 })
    expect(hsvaFromHorizontalSlider(current, 'a', 25, 100)).toEqual({ ...current, a: 0.25 })
  })

  test('moves the color plane with arrow and page keys', () => {
    const current = { h: 10, s: 0.5, v: 0.5, a: 0.5 }

    expect(moveHsvaByKey(current, 'plane', 'ArrowRight')).toEqual({ ...current, s: 0.51 })
    expect(moveHsvaByKey(current, 'plane', 'ArrowUp', true)).toEqual({ ...current, v: 0.6 })
    expect(moveHsvaByKey(current, 'plane', 'PageDown')).toEqual({ ...current, v: 0.4 })
  })

  test('supports hue and alpha keyboard boundaries', () => {
    const current = { h: 120, s: 0.5, v: 0.5, a: 0.5 }

    expect(moveHsvaByKey(current, 'hue', 'End')).toEqual({ ...current, h: 360 })
    expect(moveHsvaByKey(current, 'hue', 'ArrowLeft', true)).toEqual({ ...current, h: 110 })
    expect(moveHsvaByKey(current, 'alpha', 'Home')).toEqual({ ...current, a: 0 })
    expect(moveHsvaByKey(current, 'alpha', 'ArrowRight')).toEqual({ ...current, a: 0.51 })
  })
})
