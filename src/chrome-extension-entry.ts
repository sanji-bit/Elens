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

const CAPTURE_SCRIPT_REMOTE_URL = 'https://mcp.figma.com/mcp/html-to-design/capture.js'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

async function ensureCaptureScript(): Promise<void> {
  if (window.figma?.captureForDesign) return
  const response = await fetch(CAPTURE_SCRIPT_REMOTE_URL)
  if (!response.ok) throw new Error(`Failed to fetch remote capture.js: ${response.status}`)
  const scriptText = await response.text()
  const script = document.createElement('script')
  script.textContent = scriptText
  document.head.appendChild(script)
  await sleep(1200)
}

async function runPageCapture(selector: string, options?: { scroll?: boolean }): Promise<unknown> {
  await ensureCaptureScript()

  if (options?.scroll) {
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8))
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await sleep(180)
    }
    await sleep(600)
    window.scrollTo(0, 0)
  }

  const imgs = Array.from(document.images || [])
  await Promise.allSettled(
    imgs.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true })
      img.addEventListener('error', resolve, { once: true })
      window.setTimeout(resolve, 4000)
    }))
  )
  if (document.fonts?.ready) await Promise.race([document.fonts.ready, sleep(3000)])
  await sleep(500)

  return await window.figma?.captureForDesign({ selector })
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
