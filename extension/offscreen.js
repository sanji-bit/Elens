async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl)
  return await response.blob()
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== 'ELENS_OFFSCREEN_WRITE_CLIPBOARD') return undefined

  ;(async () => {
    try {
      const clipboard = message.clipboard || {}
      if (clipboard.html || clipboard.imageDataUrl) {
        const item = {}
        if (clipboard.text) {
          item['text/plain'] = new Blob([clipboard.text], { type: 'text/plain' })
        }
        if (clipboard.html) {
          item['text/html'] = new Blob([clipboard.html], { type: 'text/html' })
        }
        if (clipboard.imageDataUrl) {
          item['image/png'] = await dataUrlToBlob(clipboard.imageDataUrl)
        }
        await navigator.clipboard.write([new ClipboardItem(item)])
      } else {
        await navigator.clipboard.writeText(clipboard.text || '')
      }
      sendResponse({ ok: true })
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  })()

  return true
})
