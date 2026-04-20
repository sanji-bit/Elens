import { createDesktopViewportController } from '../src/desktop'
import { createChromeExtensionViewportController } from '../src/extension'
import { mountElementInspector } from '../src/web'

const extensionViewportController = createChromeExtensionViewportController()
const desktopViewportController = createDesktopViewportController({
  setViewportSize: async () => false,
})

;(
  window as Window & {
    __ELENS_VIEWPORT_CONTROLLER__?: typeof extensionViewportController
    __ELENS_DESKTOP_VIEWPORT_CONTROLLER__?: typeof desktopViewportController
  }
).__ELENS_VIEWPORT_CONTROLLER__ = extensionViewportController

;(
  window as Window & {
    __ELENS_VIEWPORT_CONTROLLER__?: typeof extensionViewportController
    __ELENS_DESKTOP_VIEWPORT_CONTROLLER__?: typeof desktopViewportController
  }
).__ELENS_DESKTOP_VIEWPORT_CONTROLLER__ = desktopViewportController

console.info('[Elens] Web entry loaded from ../src/web.')
console.info('[Elens] Extension entry helpers loaded from ../src/extension. Load /extension to enable browser window resize.')
console.info('[Elens] Desktop entry helper loaded from ../src/desktop.')

const initialController = extensionViewportController.getWindowBounds?.bind(extensionViewportController)
if (initialController) {
  void initialController().then((bounds) => {
    if (!bounds) {
      console.info('[Elens] Browser extension not connected yet. Viewport menu will show unsupported until the extension is loaded.')
    }
  })
}

const inspector = mountElementInspector({
  enabled: false,
  viewportController: extensionViewportController,
  theme: {
    accentColor: '#008DFF',
    zIndex: 999999,
  },
})

;(window as Window & { __ELEMENT_INSPECTOR__?: typeof inspector }).__ELEMENT_INSPECTOR__ = inspector

const statusNode = document.querySelector<HTMLElement>('[data-elens-host-status]')
if (statusNode) {
  statusNode.textContent = '当前 Demo 使用 ../src/web 挂载，并接入 ../src/extension 的 viewport controller。'
}
