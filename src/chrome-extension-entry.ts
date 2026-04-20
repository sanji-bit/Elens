import { runPageCapture } from './figma-capture'
import { mountChromeExtensionInspector } from './extension-entry'
import type { ElementInspectorInstance } from './types'

declare global {
  interface Window {
    __ELEMENT_INSPECTOR__?: ElementInspectorInstance
  }
}

function mountInspector(): ElementInspectorInstance {
  const inspector = mountChromeExtensionInspector()
  window.__ELEMENT_INSPECTOR__ = inspector
  return inspector
}

function unmountInspector(): void {
  window.__ELEMENT_INSPECTOR__?.destroy()
  delete window.__ELEMENT_INSPECTOR__
}

window.addEventListener('message', event => {
  if (event.source !== window) return
  const data = event.data as { source?: string; type?: string; selector?: string; requestId?: string; scroll?: boolean } | undefined
  if (!data) return

  if (data.source === 'elens-extension-control' && data.type === 'ELENS_TOGGLE_INSPECTOR') {
    if (window.__ELEMENT_INSPECTOR__) {
      unmountInspector()
      return
    }
    mountInspector()
    return
  }

  if (data.source === 'elens-extension-control' && data.type === 'ELENS_PAGE_CAPTURE' && data.selector && data.requestId) {
    const selector = data.selector
    const requestId = data.requestId
    ;(async () => {
      try {
        const result = await runPageCapture(selector, { scroll: data.scroll })
        window.postMessage({
          source: 'elens-extension-page',
          type: 'ELENS_PAGE_CAPTURE_RESULT',
          requestId,
          ok: true,
          result,
        }, '*')
      } catch (error) {
        window.postMessage({
          source: 'elens-extension-page',
          type: 'ELENS_PAGE_CAPTURE_RESULT',
          requestId,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }, '*')
      }
    })()
  }
})
