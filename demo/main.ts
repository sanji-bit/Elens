import { mountElementInspector } from '../src'

const inspector = mountElementInspector({
  enabled: false,
  theme: {
    accentColor: '#008DFF',
    zIndex: 999999,
  },
})

;(window as Window & { __ELEMENT_INSPECTOR__?: typeof inspector }).__ELEMENT_INSPECTOR__ = inspector
