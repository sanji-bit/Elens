export const CAPTURE_SCRIPT_REMOTE_URL = 'https://mcp.figma.com/mcp/html-to-design/capture.js'

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

export async function runPageCapture(selector: string, options?: { scroll?: boolean }): Promise<unknown> {
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
