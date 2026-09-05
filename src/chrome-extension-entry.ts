import { mountChromeExtensionInspector } from './extension-entry'
import { captureToClipboard, type ClipboardScreenshotMode } from './clipboard-screenshot'
import { createChromeExtensionViewportController } from './extension-bridge'
import { i18n } from './i18n'
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

const screenshotController = createChromeExtensionViewportController()

function showScreenshotFeedback(message: string, type: 'success' | 'error'): void {
  document.querySelector('[data-elens-screenshot-feedback]')?.remove()
  const toast = document.createElement('div')
  toast.dataset.elensScreenshotFeedback = 'true'
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    max-width: min(480px, calc(100vw - 32px));
    padding: 8px 12px;
    border-radius: 8px;
    background: ${type === 'error' ? '#c9362b' : 'rgba(30, 30, 34, .94)'};
    color: #fff;
    border: 1px solid ${type === 'error' ? '#e46b62' : 'rgba(255, 255, 255, .18)'};
    box-shadow: 0 8px 24px rgba(0, 0, 0, .2);
    font: 500 12px/18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    text-align: center;
    z-index: 2147483647;
    pointer-events: none;
    opacity: 0;
    transition: opacity .2s ease;
  `
  document.documentElement.appendChild(toast)
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
  })
  window.setTimeout(() => {
    toast.style.opacity = '0'
    window.setTimeout(() => toast.remove(), 220)
  }, type === 'error' ? 4500 : 3000)
}

async function runClipboardScreenshot(mode: ClipboardScreenshotMode): Promise<void> {
  try {
    const copied = await captureToClipboard(mode, screenshotController)
    if (copied) showScreenshotFeedback(i18n.design.screenshotSaved, 'success')
  } catch (error) {
    console.error('[Elens] Screenshot failed:', error)
    const detail = error instanceof Error && error.message ? `：${error.message}` : ''
    showScreenshotFeedback(`${i18n.capture.captureFailed}${detail}`, 'error')
  }
}

window.addEventListener('message', event => {
  if (event.source !== window) return
  const data = event.data as { source?: string; type?: string; command?: string; width?: number; height?: number } | undefined
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
    if (data.command === 'screenshot-viewport' || data.command === 'screenshot-full') {
      if (window.__ELEMENT_INSPECTOR__) unmountInspector()
      void runClipboardScreenshot(data.command.replace('screenshot-', '') as ClipboardScreenshotMode)
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

})
