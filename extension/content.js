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
  if (!message || (message.type !== 'ELENS_TOGGLE_INSPECTOR' && message.type !== 'ELENS_RUN_COMMAND')) return

  if (message.type === 'ELENS_RUN_COMMAND' && message.command === 'viewport-size') {
    sendRuntimeMessage({
      source: 'elens-extension-content',
      type: 'ELENS_SET_VIEWPORT_SIZE',
      bounds: { width: message.width, height: message.height },
      viewportMetrics: getViewportMetrics(),
    }, () => {})
    return
  }

  ensureInspectorScript(() => {
    if (message.type === 'ELENS_TOGGLE_INSPECTOR') {
      window.postMessage({
        source: 'elens-extension-control',
        type: 'ELENS_TOGGLE_INSPECTOR',
      }, '*')
      return
    }

    window.postMessage({
      source: 'elens-extension-control',
      type: 'ELENS_RUN_COMMAND',
      command: message.command,
      width: message.width,
      height: message.height,
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

function sendRuntimeMessage(message, callback) {
  chrome.runtime.sendMessage(message, (response) => {
    const lastError = chrome.runtime.lastError
    if (lastError) {
      callback({ ok: false, error: lastError.message || '扩展运行时通信失败' })
      return
    }
    callback(response)
  })
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
  ) return

  sendRuntimeMessage({
    source: 'elens-extension-content',
    type: message.type,
    bounds: message.bounds,
    clipboard: message.clipboard,
    viewportMetrics: getViewportMetrics(),
  }, (response) => {
    postBridgeResponse(message.id, response)
  })
})
