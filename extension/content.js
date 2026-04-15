chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== 'ELENS_TOGGLE_INSPECTOR') return

  window.postMessage({
    source: 'elens-extension-control',
    type: 'ELENS_TOGGLE_INSPECTOR',
  }, '*')
})

function getViewportMetrics() {
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
  }
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
  ) return

  chrome.runtime.sendMessage({
    source: 'elens-extension-content',
    type: message.type,
    bounds: message.bounds,
    viewportMetrics: getViewportMetrics(),
  }, (response) => {
    window.postMessage({
      source: 'elens-extension',
      id: message.id,
      ok: Boolean(response?.ok),
      result: response?.result,
    }, '*')
  })
})
