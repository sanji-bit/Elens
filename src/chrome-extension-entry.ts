import { runPageCapture } from './figma-capture'
import { mountChromeExtensionInspector } from './extension-entry'
import type { ElementInspectorInstance } from './types'

type TrustedTypesPolicyRules = {
  createHTML?: (input: string) => string
  createScript?: (input: string) => string
  createScriptURL?: (input: string) => string
}

type TrustedTypesLike = {
  createPolicy?: (name: string, rules: TrustedTypesPolicyRules) => unknown
}

declare global {
  interface Window {
    __ELEMENT_INSPECTOR__?: ElementInspectorInstance
    trustedTypes?: TrustedTypesLike
    __ELENS_DEFAULT_TRUSTED_TYPES_POLICY__?: boolean
  }
}

function ensureDefaultTrustedTypesPolicy(): void {
  if (window.__ELENS_DEFAULT_TRUSTED_TYPES_POLICY__) return
  if (!window.trustedTypes?.createPolicy) return

  try {
    window.trustedTypes.createPolicy('default', {
      createHTML: input => input,
      createScript: input => input,
      createScriptURL: input => input,
    })
    window.__ELENS_DEFAULT_TRUSTED_TYPES_POLICY__ = true
  } catch {
    window.__ELENS_DEFAULT_TRUSTED_TYPES_POLICY__ = true
  }
}

function mountInspector(): ElementInspectorInstance {
  ensureDefaultTrustedTypesPolicy()
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
  const data = event.data as { source?: string; type?: string; command?: string; width?: number; height?: number; selector?: string; requestId?: string; scroll?: boolean } | undefined
  if (!data) return

  if (data.source === 'elens-extension-control' && data.type === 'ELENS_TOGGLE_INSPECTOR') {
    if (window.__ELEMENT_INSPECTOR__) {
      unmountInspector()
      return
    }
    mountInspector()
    return
  }

  if (data.source === 'elens-extension-control' && data.type === 'ELENS_RUN_COMMAND' && data.command) {
    if (data.command === 'show-hide') {
      if (window.__ELEMENT_INSPECTOR__) unmountInspector()
      else mountInspector()
      return
    }
    if (data.command === 'figma-capture') {
      void runPageCapture('body', { scroll: true })
      return
    }
    const inspector = window.__ELEMENT_INSPECTOR__ ?? mountInspector()
    if (data.command === 'inspector') {
      inspector.setMode('inspector')
      return
    }
    if (data.command === 'design') {
      inspector.setMode('design')
      return
    }
    if (data.command === 'layers') {
      inspector.toggleLayersPanel()
      return
    }
    if (data.command === 'viewport-size' && typeof data.width === 'number' && typeof data.height === 'number') {
      void inspector.setViewportSize(data.width, data.height)
    }
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
