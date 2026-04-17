import type { ClipboardContent, ViewportController, WindowBounds } from './types'

const REQUEST_SOURCE = 'elens'
const RESPONSE_SOURCE = 'elens-extension'
const REQUEST_TIMEOUT = 15000

type BridgeRequestType = 'ELENS_SET_VIEWPORT_SIZE' | 'ELENS_GET_VIEWPORT_SIZE' | 'ELENS_SET_WINDOW_BOUNDS' | 'ELENS_GET_WINDOW_BOUNDS' | 'ELENS_CAPTURE_VISIBLE_TAB' | 'ELENS_WRITE_CLIPBOARD' | 'ELENS_PAGE_CAPTURE'

type BridgeResponse<T> = {
  ok: boolean
  result?: T
  error?: string
}

type BridgeMessage = {
  source: typeof REQUEST_SOURCE
  id: string
  type: BridgeRequestType
  bounds?: WindowBounds
  clipboard?: ClipboardContent
  selector?: string
  scroll?: boolean
}

type BridgeResponseMessage<T> = {
  source: typeof RESPONSE_SOURCE
  id: string
  ok: boolean
  result?: T
  error?: string
}

function isBridgeResponse<T>(value: unknown, id: string): value is BridgeResponseMessage<T> {
  if (!value || typeof value !== 'object') return false
  const message = value as Partial<BridgeResponseMessage<T>>
  return message.source === RESPONSE_SOURCE && message.id === id
}

function requestExtension<T>(type: BridgeRequestType, options: { bounds?: WindowBounds; clipboard?: ClipboardContent; selector?: string; scroll?: boolean } = {}): Promise<BridgeResponse<T>> {
  return new Promise((resolve) => {
    const id = `elens-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', onMessage)
      resolve({ ok: false })
    }, REQUEST_TIMEOUT)

    function onMessage(event: MessageEvent): void {
      if (event.source !== window || !isBridgeResponse<T>(event.data, id)) return
      window.clearTimeout(timeout)
      window.removeEventListener('message', onMessage)
      resolve({ ok: event.data.ok, result: event.data.result, error: event.data.error })
    }

    window.addEventListener('message', onMessage)
    window.postMessage({ source: REQUEST_SOURCE, id, type, bounds: options.bounds, clipboard: options.clipboard, selector: options.selector, scroll: options.scroll } satisfies BridgeMessage, '*')
  })
}

export function createChromeExtensionViewportController(): ViewportController {
  return {
    capabilities: {
      resizeViewport: true,
      resizeWindow: true,
      moveWindow: true,
      writeClipboard: true,
      captureForDesign: true,
    },
    async setViewportSize(width, height) {
      const response = await requestExtension<{ width: number; height: number }>('ELENS_SET_VIEWPORT_SIZE', { bounds: { width, height } })
      return response.ok
    },
    async getViewportSize() {
      const response = await requestExtension<{ width: number; height: number }>('ELENS_GET_VIEWPORT_SIZE')
      return response.ok ? response.result ?? null : null
    },
    async setWindowBounds(bounds) {
      const response = await requestExtension<WindowBounds>('ELENS_SET_WINDOW_BOUNDS', { bounds })
      return response.ok
    },
    async getWindowBounds() {
      const response = await requestExtension<WindowBounds>('ELENS_GET_WINDOW_BOUNDS')
      return response.ok ? response.result ?? null : null
    },
    async captureVisibleTab() {
      const response = await requestExtension<string>('ELENS_CAPTURE_VISIBLE_TAB')
      if (!response.ok) {
        throw new Error(response.error || '截图桥接不可用，请刷新扩展后重试')
      }
      return response.result ?? null
    },
    async writeClipboard(content) {
      const response = await requestExtension<void>('ELENS_WRITE_CLIPBOARD', { clipboard: content })
      if (!response.ok) {
        throw new Error(response.error || '剪贴板桥接不可用，请刷新扩展后重试')
      }
      return true
    },
    async captureForDesign(selector, options) {
      const response = await requestExtension<unknown>('ELENS_PAGE_CAPTURE', { selector, scroll: options?.scroll })
      if (!response.ok) {
        throw new Error(response.error || '页面捕获桥接不可用，请刷新扩展后重试')
      }
      return response.result
    },
  }
}
