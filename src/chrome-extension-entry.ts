import { createChromeExtensionViewportController, mountElementInspector } from './index'
import type { ElementInspectorInstance } from './types'

declare global {
  interface Window {
    __ELEMENT_INSPECTOR__?: ElementInspectorInstance
  }
}

function mountInspector(): ElementInspectorInstance {
  const inspector = mountElementInspector({
    enabled: true,
    viewportController: createChromeExtensionViewportController(),
    theme: {
      zIndex: 2147483000,
    },
  })

  window.__ELEMENT_INSPECTOR__ = inspector
  return inspector
}

function unmountInspector(): void {
  window.__ELEMENT_INSPECTOR__?.destroy()
  delete window.__ELEMENT_INSPECTOR__
}

window.addEventListener('message', event => {
  if (event.source !== window) return
  const data = event.data as { source?: string; type?: string } | undefined
  if (!data || data.source !== 'elens-extension-control') return
  if (data.type !== 'ELENS_TOGGLE_INSPECTOR') return

  if (window.__ELEMENT_INSPECTOR__) {
    unmountInspector()
    return
  }

  mountInspector()
})
