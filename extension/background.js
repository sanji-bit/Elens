chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return
  chrome.tabs.sendMessage(tab.id, { type: 'ELENS_TOGGLE_INSPECTOR' })
})

function getViewportDelta(viewportMetrics) {
  if (!viewportMetrics) return { width: 0, height: 0 }
  const widthDelta = Math.max(0, (viewportMetrics.outerWidth ?? 0) - (viewportMetrics.innerWidth ?? 0))
  const heightDelta = Math.max(0, (viewportMetrics.outerHeight ?? 0) - (viewportMetrics.innerHeight ?? 0))
  return { width: widthDelta, height: heightDelta }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.source !== 'elens-extension-content') return undefined

  if (message.type === 'ELENS_GET_VIEWPORT_SIZE') {
    const viewportMetrics = message.viewportMetrics
    if (!viewportMetrics) {
      sendResponse({ ok: false })
      return undefined
    }
    sendResponse({
      ok: true,
      result: {
        width: viewportMetrics.innerWidth,
        height: viewportMetrics.innerHeight,
      },
    })
    return undefined
  }

  if (message.type === 'ELENS_SET_VIEWPORT_SIZE') {
    chrome.windows.getCurrent({}, (windowInfo) => {
      if (!windowInfo || windowInfo.id == null || !message.bounds) {
        sendResponse({ ok: false })
        return
      }
      const viewportDelta = getViewportDelta(message.viewportMetrics)
      chrome.windows.update(windowInfo.id, {
        width: message.bounds.width + viewportDelta.width,
        height: message.bounds.height + viewportDelta.height,
      }, (updatedWindow) => {
        if (chrome.runtime.lastError || !updatedWindow || !message.viewportMetrics) {
          sendResponse({ ok: false })
          return
        }
        sendResponse({
          ok: true,
          result: {
            width: message.bounds.width,
            height: message.bounds.height,
          },
        })
      })
    })
    return true
  }

  if (message.type === 'ELENS_GET_WINDOW_BOUNDS') {
    chrome.windows.getCurrent({}, (windowInfo) => {
      if (!windowInfo || windowInfo.id == null || windowInfo.width == null || windowInfo.height == null) {
        sendResponse({ ok: false })
        return
      }
      sendResponse({
        ok: true,
        result: {
          width: windowInfo.width,
          height: windowInfo.height,
          left: windowInfo.left,
          top: windowInfo.top,
        },
      })
    })
    return true
  }

  if (message.type === 'ELENS_SET_WINDOW_BOUNDS') {
    chrome.windows.getCurrent({}, (windowInfo) => {
      if (!windowInfo || windowInfo.id == null || !message.bounds) {
        sendResponse({ ok: false })
        return
      }
      chrome.windows.update(windowInfo.id, {
        width: message.bounds.width,
        height: message.bounds.height,
        left: message.bounds.left,
        top: message.bounds.top,
      }, (updatedWindow) => {
        if (chrome.runtime.lastError || !updatedWindow || updatedWindow.width == null || updatedWindow.height == null) {
          sendResponse({ ok: false })
          return
        }
        sendResponse({
          ok: true,
          result: {
            width: updatedWindow.width,
            height: updatedWindow.height,
            left: updatedWindow.left,
            top: updatedWindow.top,
          },
        })
      })
    })
    return true
  }

  return undefined
})
