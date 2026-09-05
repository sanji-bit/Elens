import type { ViewportController, ViewportControllerCapabilities, ViewportPreset, ViewportState, WindowBounds } from './types'

export type ClipboardWriteHandlers = {
  write?: ViewportController['writeClipboard']
}

export async function blobToDataUrl(blob: Blob, fallbackMessage: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error(fallbackMessage))
    reader.onerror = () => reject(reader.error ?? new Error(fallbackMessage))
    reader.readAsDataURL(blob)
  })
}

export async function writeClipboardText(text: string, handlers?: ClipboardWriteHandlers): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    if (handlers?.write) {
      await handlers.write({ text })
      return
    }
    throw new Error('Clipboard write failed')
  }
}

export async function writeClipboardImage(blob: Blob, handlers: ClipboardWriteHandlers | undefined, fallbackMessage: string): Promise<void> {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ])
    return
  } catch {
    if (handlers?.write) {
      await handlers.write({ imageDataUrl: await blobToDataUrl(blob, fallbackMessage) })
      return
    }
    throw new Error('Clipboard image write failed')
  }
}

export async function captureElementImageBlob(target: HTMLElement, captureVisibleTab: ViewportController['captureVisibleTab'] | undefined, messages: { unsupported: string; unavailable: string; unknownError: string }): Promise<Blob> {
  if (!captureVisibleTab) {
    throw new Error(messages.unsupported)
  }

  const dataUrl = await captureVisibleTab()
  if (!dataUrl) throw new Error(messages.unavailable)

  const screenshotImage = new Image()
  screenshotImage.src = dataUrl
  await new Promise<void>((resolve, reject) => {
    screenshotImage.onload = () => resolve()
    screenshotImage.onerror = () => reject(new Error(messages.unknownError))
  })

  const rect = target.getBoundingClientRect()
  const scaleX = screenshotImage.width / window.innerWidth
  const scaleY = screenshotImage.height / window.innerHeight
  const cropX = Math.max(0, Math.round(rect.left * scaleX))
  const cropY = Math.max(0, Math.round(rect.top * scaleY))
  const cropWidth = Math.max(1, Math.min(screenshotImage.width - cropX, Math.round(rect.width * scaleX)))
  const cropHeight = Math.max(1, Math.min(screenshotImage.height - cropY, Math.round(rect.height * scaleY)))

  const canvas = document.createElement('canvas')
  canvas.width = cropWidth
  canvas.height = cropHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error(messages.unknownError)
  context.drawImage(screenshotImage, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value)
      else reject(new Error(messages.unknownError))
    }, 'image/png')
  })
}

export function canResizeWindow(controller: ViewportController | undefined, capabilities: ViewportControllerCapabilities): boolean {
  return Boolean(controller?.setWindowBounds && capabilities.resizeWindow !== false)
}

export function canResizeViewport(controller: ViewportController | undefined, capabilities: ViewportControllerCapabilities): boolean {
  return Boolean(controller?.setViewportSize && capabilities.resizeViewport !== false)
}

export async function applyWindowBounds(controller: ViewportController | undefined, capabilities: ViewportControllerCapabilities, bounds: WindowBounds): Promise<boolean | 'unsupported'> {
  if (!controller?.setWindowBounds || capabilities.resizeWindow === false) {
    return 'unsupported'
  }

  const result = await controller.setWindowBounds(bounds)
  return result === false ? 'unsupported' : true
}

export async function applyViewportSize(controller: ViewportController | undefined, capabilities: ViewportControllerCapabilities, width: number, height: number): Promise<boolean | 'unsupported'> {
  if (!controller?.setViewportSize || capabilities.resizeViewport === false) {
    return 'unsupported'
  }

  const result = await controller.setViewportSize(width, height)
  return result === false ? 'unsupported' : true
}

export async function resolveViewportCapabilities(controller: ViewportController | undefined): Promise<ViewportControllerCapabilities | null> {
  if (!controller?.getCapabilities) return null
  return await Promise.resolve(controller.getCapabilities())
}

export async function resolveInitialViewportState(controller: ViewportController | undefined, currentPreset: ViewportPreset | null): Promise<ViewportState | null> {
  if (!controller) return null

  if (controller.getWindowBounds) {
    const bounds = await Promise.resolve(controller.getWindowBounds())
    if (!bounds) return null
    return {
      presetId: currentPreset?.id,
      width: bounds.width,
      height: bounds.height,
      left: bounds.left,
      top: bounds.top,
      target: 'window',
    }
  }

  if (controller.getViewportSize) {
    const size = await Promise.resolve(controller.getViewportSize())
    if (!size) return null
    return {
      presetId: currentPreset?.id,
      width: size.width,
      height: size.height,
      target: 'viewport',
    }
  }

  return null
}

export function createDesktopViewportController(overrides: Partial<ViewportController> = {}): ViewportController {
  return {
    capabilities: {
      resizeViewport: false,
      resizeWindow: false,
      moveWindow: false,
      writeClipboard: false,
      ...overrides.capabilities,
    },
    setViewportSize: overrides.setViewportSize ?? (() => false),
    getViewportSize: overrides.getViewportSize,
    setWindowBounds: overrides.setWindowBounds,
    getWindowBounds: overrides.getWindowBounds,
    captureVisibleTab: overrides.captureVisibleTab,
    writeClipboard: overrides.writeClipboard,
    getCapabilities: overrides.getCapabilities,
  }
}
