import { createChromeExtensionViewportController, mountElementInspector } from '../src'

const viewportController = createChromeExtensionViewportController()

;(window as Window & { __ELENS_VIEWPORT_CONTROLLER__?: typeof viewportController }).__ELENS_VIEWPORT_CONTROLLER__ = viewportController

console.info('[Elens] Window controller ready. Load the local extension in /extension to enable browser window resize.')

const initialController = viewportController.getWindowBounds?.bind(viewportController)
if (initialController) {
  void initialController().then((bounds) => {
    if (!bounds) {
      console.info('[Elens] Browser extension not connected yet. Viewport menu will show unsupported until the extension is loaded.')
    }
  })
}

const inspector = mountElementInspector({
  enabled: false,
  viewportController,
  theme: {
    accentColor: '#008DFF',
    zIndex: 999999,
  },
})

;(window as Window & { __ELEMENT_INSPECTOR__?: typeof inspector }).__ELEMENT_INSPECTOR__ = inspector
