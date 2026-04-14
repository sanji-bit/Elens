import type { ThemeConfig } from './types'

export const THEME_STORAGE_KEY = 'elens-theme'

const CORE_THEME_DEFAULTS: ThemeConfig = {
  brand: { accent: '#008AFF' },
}

export function loadPersistedTheme(): ThemeConfig | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function persistTheme(theme: ThemeConfig): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme))
  } catch {
    // Ignore storage failures.
  }
}

export function clearPersistedTheme(): void {
  try {
    window.localStorage.removeItem(THEME_STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export function mergeThemeConfig(base: ThemeConfig = {}, override: ThemeConfig = {}): ThemeConfig {
  return {
    ...base,
    ...override,
    brand: { ...base.brand, ...override.brand },
    surface: { ...base.surface, ...override.surface },
    typography: { ...base.typography, ...override.typography },
    component: {
      ...base.component,
      ...override.component,
      panel: { ...base.component?.panel, ...override.component?.panel },
      field: { ...base.component?.field, ...override.component?.field },
      dropdown: { ...base.component?.dropdown, ...override.component?.dropdown },
      toolbar: { ...base.component?.toolbar, ...override.component?.toolbar },
    },
  }
}

export function getDefaultThemeConfig(optionsTheme: ThemeConfig = {}, defaults: ThemeConfig = {}): ThemeConfig {
  return mergeThemeConfig(mergeThemeConfig(CORE_THEME_DEFAULTS, defaults), optionsTheme)
}
