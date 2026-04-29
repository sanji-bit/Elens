const INSPECTOR_SCRIPT_ID = 'elens-extension-inspector-script'

let inspectorScriptReady = false
let inspectorScriptCallbacks = []

function flushInspectorScriptCallbacks() {
  inspectorScriptReady = true
  const callbacks = inspectorScriptCallbacks
  inspectorScriptCallbacks = []
  callbacks.forEach((callback) => callback())
}

function ensureInspectorScript(callback) {
  if (inspectorScriptReady) {
    callback()
    return
  }

  inspectorScriptCallbacks.push(callback)
  if (document.getElementById(INSPECTOR_SCRIPT_ID)) return

  const script = document.createElement('script')
  script.id = INSPECTOR_SCRIPT_ID
  script.src = chrome.runtime.getURL('inspector.js')
  script.async = false
  script.addEventListener('load', flushInspectorScriptCallbacks, { once: true })
  script.addEventListener('error', () => {
    inspectorScriptCallbacks = []
  }, { once: true })
  ;(document.head || document.documentElement).appendChild(script)
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== 'ELENS_TOGGLE_INSPECTOR') return

  ensureInspectorScript(() => {
    window.postMessage({
      source: 'elens-extension-control',
      type: 'ELENS_TOGGLE_INSPECTOR',
    }, '*')
  })
})

function getViewportMetrics() {
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
  }
}

function postBridgeResponse(id, response) {
  window.postMessage({
    source: 'elens-extension',
    id,
    ok: Boolean(response?.ok),
    result: response?.result,
    error: response?.error,
  }, '*')
}

function handlePageCapture(message) {
  const handlePageResult = (event) => {
    if (event.source !== window) return
    const data = event.data
    if (
      !data
      || data.source !== 'elens-extension-page'
      || data.type !== 'ELENS_PAGE_CAPTURE_RESULT'
      || data.requestId !== message.id
    ) return

    window.removeEventListener('message', handlePageResult)

    if (data.ok && data.result?.clipboard) {
      chrome.runtime.sendMessage({
        source: 'elens-extension-content',
        type: 'ELENS_WRITE_CLIPBOARD',
        clipboard: data.result.clipboard,
      }, (response) => {
        if (!response?.ok) {
          postBridgeResponse(message.id, { ok: false, error: response?.error || '扩展剪贴板写入失败' })
          return
        }
        postBridgeResponse(message.id, { ok: true, result: data.result.result })
      })
      return
    }

    postBridgeResponse(message.id, data)
  }

  window.addEventListener('message', handlePageResult)
  window.postMessage({
    source: 'elens-extension-control',
    type: 'ELENS_PAGE_CAPTURE',
    selector: message.selector,
    scroll: message.scroll,
    requestId: message.id,
  }, '*')
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return
  const message = event.data
  if (!message || message.source !== 'elens') return
  if (
    message.type !== 'ELENS_SET_VIEWPORT_SIZE'
    && message.type !== 'ELENS_GET_VIEWPORT_SIZE'
    && message.type !== 'ELENS_SET_WINDOW_BOUNDS'
    && message.type !== 'ELENS_GET_WINDOW_BOUNDS'
    && message.type !== 'ELENS_CAPTURE_VISIBLE_TAB'
    && message.type !== 'ELENS_WRITE_CLIPBOARD'
    && message.type !== 'ELENS_PAGE_CAPTURE'
  ) return

  if (message.type === 'ELENS_PAGE_CAPTURE') {
    handlePageCapture(message)
    return
  }

  chrome.runtime.sendMessage({
    source: 'elens-extension-content',
    type: message.type,
    bounds: message.bounds,
    clipboard: message.clipboard,
    selector: message.selector,
    scroll: message.scroll,
    viewportMetrics: getViewportMetrics(),
  }, (response) => {
    postBridgeResponse(message.id, response)
  })
})
