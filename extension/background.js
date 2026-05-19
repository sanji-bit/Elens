const OFFSCREEN_PATH = 'offscreen.html'

const CONTEXT_MENU_ROOT_ID = 'elens-root'
const VIEWPORT_PRESETS = [
  { id: 'viewport-1920x1080', title: '1920 × 1080', width: 1920, height: 1080 },
  { id: 'viewport-1440x900', title: '1440 × 900', width: 1440, height: 900 },
  { id: 'viewport-1280x800', title: '1280 × 800', width: 1280, height: 800 },
  { id: 'viewport-768x1024', title: '768 × 1024', width: 768, height: 1024 },
  { id: 'viewport-414x896', title: '414 × 896', width: 414, height: 896 },
  { id: 'viewport-375x812', title: '375 × 812', width: 375, height: 812 },
]

function sendTabCommand(tabId, command, options = {}) {
  if (!tabId) return
  void chrome.tabs.sendMessage(tabId, { type: 'ELENS_RUN_COMMAND', command, ...options }).catch(() => {})
}

function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: CONTEXT_MENU_ROOT_ID, title: 'Elens', contexts: ['all'] })
    chrome.contextMenus.create({ id: 'show-hide', parentId: CONTEXT_MENU_ROOT_ID, title: '显示 / 隐藏', contexts: ['all'] })
    chrome.contextMenus.create({ id: 'inspector', parentId: CONTEXT_MENU_ROOT_ID, title: '检查模式', contexts: ['all'] })
    chrome.contextMenus.create({ id: 'design', parentId: CONTEXT_MENU_ROOT_ID, title: '设计模式', contexts: ['all'] })
    chrome.contextMenus.create({ id: 'figma-capture', parentId: CONTEXT_MENU_ROOT_ID, title: 'Figma 捕获', contexts: ['all'] })
    chrome.contextMenus.create({ id: 'viewport-root', parentId: CONTEXT_MENU_ROOT_ID, title: '视口尺寸', contexts: ['all'] })
    VIEWPORT_PRESETS.forEach((preset) => {
      chrome.contextMenus.create({ id: preset.id, parentId: 'viewport-root', title: preset.title, contexts: ['all'] })
    })
    chrome.contextMenus.create({ id: 'layers', parentId: CONTEXT_MENU_ROOT_ID, title: '图层面板', contexts: ['all'] })
  })
}

chrome.runtime.onInstalled.addListener(createContextMenus)
chrome.runtime.onStartup.addListener(createContextMenus)
createContextMenus()

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const tabId = tab?.id
  if (!tabId || info.menuItemId === CONTEXT_MENU_ROOT_ID || info.menuItemId === 'viewport-root') return
  const viewportPreset = VIEWPORT_PRESETS.find(preset => preset.id === info.menuItemId)
  if (viewportPreset) {
    sendTabCommand(tabId, 'viewport-size', { width: viewportPreset.width, height: viewportPreset.height })
    return
  }
  sendTabCommand(tabId, String(info.menuItemId))
})

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return
  void chrome.tabs.sendMessage(tab.id, { type: 'ELENS_TOGGLE_INSPECTOR' }).catch(() => {})
})

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH)
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl],
  })
  if (contexts.length > 0) return
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['CLIPBOARD'],
    justification: 'Write clipboard data for Figma capture and copy actions from the extension context',
  })
}

async function writeClipboard(clipboard) {
  await ensureOffscreenDocument()
  return await chrome.runtime.sendMessage({
    type: 'ELENS_OFFSCREEN_WRITE_CLIPBOARD',
    clipboard,
  })
}

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

  if (message.type === 'ELENS_CAPTURE_VISIBLE_TAB') {
    chrome.tabs.captureVisibleTab(undefined, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ ok: false, error: chrome.runtime.lastError?.message || 'captureVisibleTab 返回空结果' })
        return
      }
      sendResponse({ ok: true, result: dataUrl })
    })
    return true
  }

  if (message.type === 'ELENS_WRITE_CLIPBOARD') {
    void writeClipboard(message.clipboard)
      .then((response) => {
        if (!response?.ok) {
          sendResponse({ ok: false, error: response?.error || '扩展剪贴板写入失败' })
          return
        }
        sendResponse({ ok: true })
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
    return true
  }

  return undefined
})
