import { createDesktopViewportController, mountElementInspector } from '../src/desktop'

const desktopViewportController = createDesktopViewportController({
  async getViewportSize() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  },
  async setViewportSize() {
    return false
  },
  async writeClipboard(content) {
    if (content.text) {
      await navigator.clipboard.writeText(content.text)
      return true
    }
    return false
  },
})

const inspector = mountElementInspector({
  enabled: true,
  viewportController: desktopViewportController,
  theme: {
    accentColor: '#008DFF',
    zIndex: 2147483000,
  },
})

;(window as Window & { __ELENS_ELECTRON_EXAMPLE__?: typeof inspector }).__ELENS_ELECTRON_EXAMPLE__ = inspector

console.info('[Elens] Electron desktop example mounted via ../src/desktop.')
console.info('[Elens] Replace createDesktopViewportController overrides with your Electron preload bridge.')
