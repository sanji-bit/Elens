const BLOCK_STATE_EVENT = 'elens:block-page-interactions'
const LISTENER_REGISTRATION_EVENT = 'elens:keyboard-listener-registration'
const KEYBOARD_EVENT_TYPES = new Set(['keydown', 'keypress', 'keyup'])
const nativeAddEventListener = EventTarget.prototype.addEventListener
const nativeRemoveEventListener = EventTarget.prototype.removeEventListener
const wrappedListeners = new WeakMap()
let blockPageInteractions = true
let elensRegisteringKeyboardListeners = false

try {
  blockPageInteractions = localStorage.getItem('elens-block-page-interactions') !== 'false'
} catch {
  blockPageInteractions = true
}

function isGlobalKeyboardTarget(target) {
  return target === window || target === document || target === document.documentElement || target === document.body
}

function isElensKeyboardEvent(event) {
  return event.composedPath().some((target) => (
    target instanceof Element
    && (target.hasAttribute('data-elens-ignore') || target.hasAttribute('data-elens-inline-editing'))
  ))
}

function getCaptureOption(options) {
  return typeof options === 'boolean' ? options : Boolean(options?.capture)
}

function getWrappedListener(target, type, listener, options) {
  let targetListeners = wrappedListeners.get(target)
  if (!targetListeners) {
    targetListeners = new Map()
    wrappedListeners.set(target, targetListeners)
  }

  let typeListeners = targetListeners.get(type)
  if (!typeListeners) {
    typeListeners = new WeakMap()
    targetListeners.set(type, typeListeners)
  }

  let listenerCaptures = typeListeners.get(listener)
  if (!listenerCaptures) {
    listenerCaptures = new Map()
    typeListeners.set(listener, listenerCaptures)
  }

  const capture = getCaptureOption(options)
  let wrapped = listenerCaptures.get(capture)
  if (!wrapped) {
    const once = typeof options === 'object' && options?.once === true
    wrapped = function (event) {
      if (blockPageInteractions && isElensKeyboardEvent(event)) {
        if (once) nativeAddEventListener.call(target, type, wrapped, options)
        return
      }
      if (once) listenerCaptures.delete(capture)
      if (typeof listener === 'function') return listener.call(this, event)
      return listener.handleEvent(event)
    }
    listenerCaptures.set(capture, wrapped)

    const signal = typeof options === 'object' ? options?.signal : null
    if (signal) {
      nativeAddEventListener.call(signal, 'abort', () => listenerCaptures.delete(capture), { once: true })
    }
  }

  return wrapped
}

EventTarget.prototype.addEventListener = function (type, listener, options) {
  if (
    listener
    && KEYBOARD_EVENT_TYPES.has(type)
    && isGlobalKeyboardTarget(this)
    && !elensRegisteringKeyboardListeners
  ) {
    return nativeAddEventListener.call(this, type, getWrappedListener(this, type, listener, options), options)
  }
  return nativeAddEventListener.call(this, type, listener, options)
}

EventTarget.prototype.removeEventListener = function (type, listener, options) {
  const capture = getCaptureOption(options)
  const listenerCaptures = listener && wrappedListeners.get(this)?.get(type)?.get(listener)
  const wrapped = listenerCaptures?.get(capture)
  if (wrapped) listenerCaptures.delete(capture)
  return nativeRemoveEventListener.call(this, type, wrapped ?? listener, options)
}

nativeAddEventListener.call(window, BLOCK_STATE_EVENT, (event) => {
  blockPageInteractions = event.detail?.enabled !== false
})

nativeAddEventListener.call(window, LISTENER_REGISTRATION_EVENT, (event) => {
  elensRegisteringKeyboardListeners = event.detail?.active === true
})
