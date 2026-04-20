import { mountElementInspector } from './mount'
import { createChromeExtensionViewportController } from './extension-bridge'
import type { ElementInspectorInstance } from './types'

export function mountChromeExtensionInspector(): ElementInspectorInstance {
  return mountElementInspector({
    enabled: true,
    viewportController: createChromeExtensionViewportController(),
    theme: {
      zIndex: 2147483000,
    },
  })
}
