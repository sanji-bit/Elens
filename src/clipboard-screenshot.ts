import { writeClipboardImage } from './host-runtime'
import type { ViewportController } from './types'

export type ClipboardScreenshotMode = 'viewport' | 'full'

type ScreenshotImage = {
  image: HTMLImageElement
  scaleX: number
  scaleY: number
}

type CaptureThrottle = {
  lastCaptureAt: number
}

// chrome.tabs.captureVisibleTab is limited to roughly two calls per second.
const CAPTURE_VISIBLE_TAB_INTERVAL_MS = 550

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

async function loadScreenshot(dataUrl: string): Promise<ScreenshotImage> {
  const image = new Image()
  image.src = dataUrl
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('截图图片读取失败'))
  })
  return {
    image,
    scaleX: image.width / Math.max(1, window.innerWidth),
    scaleY: image.height / Math.max(1, window.innerHeight),
  }
}

async function imageToBlob(image: HTMLImageElement, source: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number }): Promise<Blob> {
  const cropX = Math.max(0, Math.round(source.x * source.scaleX))
  const cropY = Math.max(0, Math.round(source.y * source.scaleY))
  const cropWidth = Math.max(1, Math.min(image.width - cropX, Math.round(source.width * source.scaleX)))
  const cropHeight = Math.max(1, Math.min(image.height - cropY, Math.round(source.height * source.scaleY)))
  const canvas = document.createElement('canvas')
  canvas.width = cropWidth
  canvas.height = cropHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('截图画布不可用')
  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('截图导出失败')), 'image/png')
  })
}

async function captureVisibleTab(controller: ViewportController, throttle?: CaptureThrottle): Promise<string | null> {
  if (throttle) {
    const elapsed = Date.now() - throttle.lastCaptureAt
    if (elapsed < CAPTURE_VISIBLE_TAB_INTERVAL_MS) {
      await sleep(CAPTURE_VISIBLE_TAB_INTERVAL_MS - elapsed)
    }
  }

  if (throttle) throttle.lastCaptureAt = Date.now()
  return await controller.captureVisibleTab?.() ?? null
}

async function captureViewport(controller: ViewportController): Promise<Blob> {
  const dataUrl = await captureVisibleTab(controller)
  if (!dataUrl) throw new Error('当前页面无法截图')
  const { image } = await loadScreenshot(dataUrl)
  return await imageToBlob(image, {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    scaleX: image.width / Math.max(1, window.innerWidth),
    scaleY: image.height / Math.max(1, window.innerHeight),
  })
}

async function captureFullPage(controller: ViewportController): Promise<Blob> {
  const originalX = window.scrollX
  const originalY = window.scrollY
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const documentWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0, viewportWidth)
  const documentHeight = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0, viewportHeight)
  let canvas: HTMLCanvasElement | null = null
  const captureThrottle: CaptureThrottle = { lastCaptureAt: 0 }
  try {
    window.scrollTo(0, 0)
    await sleep(120)
    const firstDataUrl = await captureVisibleTab(controller, captureThrottle)
    if (!firstDataUrl) throw new Error('当前页面无法截图')
    const first = await loadScreenshot(firstDataUrl)
    canvas = document.createElement('canvas')
    canvas.width = Math.round(documentWidth * first.scaleX)
    canvas.height = Math.round(documentHeight * first.scaleY)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('截图画布不可用')

    const positions: number[] = []
    for (let y = 0; y < documentHeight; y += viewportHeight) {
      positions.push(Math.min(y, Math.max(0, documentHeight - viewportHeight)))
    }
    const uniquePositions = Array.from(new Set(positions))
    for (const y of uniquePositions) {
      window.scrollTo(0, y)
      await sleep(120)
      const dataUrl = y === 0 ? firstDataUrl : await captureVisibleTab(controller, captureThrottle)
      if (!dataUrl) throw new Error('当前页面无法截图')
      const shot = y === 0 ? first : await loadScreenshot(dataUrl)
      context.drawImage(shot.image, 0, 0, shot.image.width, shot.image.height, 0, Math.round(y * first.scaleY), Math.round(viewportWidth * first.scaleX), Math.round(viewportHeight * first.scaleY))
    }
  } finally {
    window.scrollTo(originalX, originalY)
  }

  if (!canvas) throw new Error('截图画布不可用')
  const outputCanvas = canvas
  return await new Promise<Blob>((resolve, reject) => {
    outputCanvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('截图导出失败')), 'image/png')
  })
}

export async function captureToClipboard(mode: ClipboardScreenshotMode, controller: ViewportController): Promise<boolean> {
  if (!controller.captureVisibleTab || !controller.writeClipboard) throw new Error('当前环境不支持截图到剪贴板')
  const blob = mode === 'full'
    ? await captureFullPage(controller)
    : await captureViewport(controller)
  await writeClipboardImage(blob, { write: controller.writeClipboard }, '截图写入剪贴板失败')
  return true
}
