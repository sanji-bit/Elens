import { describe, expect, test } from 'bun:test'
import { getDesignStyles, getVisibleFillModeKinds } from '../src/design'

describe('color picker UI contract', () => {
  test('only exposes complete fill modes', () => {
    expect(getVisibleFillModeKinds()).toEqual(['solid', 'gradient'])
  })

  test('keeps inactive Custom and Page Colors panels hidden', () => {
    expect(getDesignStyles()).toContain('.ei-dp-fill-panel[hidden] { display: none; }')
  })
})
