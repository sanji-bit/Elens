import CHECK_INLINE_SVG from './assets/check-inline.svg?raw'
import CHEVRON_DOWN_INLINE_SVG from './assets/chevron-down-inline.svg?raw'
import COPY_INLINE_SVG from './assets/copy-inline.svg?raw'
import TOOLBAR_CHANGES_SVG from './assets/toolbar-changes.svg?raw'
import TOOLBAR_DESIGN_SVG from './assets/toolbar-design.svg?raw'
import DESIGN_MODE_FIGMA_SVG from './assets/design-mode-figma.svg?raw'
import DESIGN_SELECT_MATCHING_LAYERS_SVG from './assets/design-select-matching-layers.svg?raw'
import DESIGN_RESET_SVG from './assets/design-reset.svg?raw'
import PANEL_MINIMIZE_UI_SVG from './assets/panel-minimize-ui.svg?raw'
import TOOLBAR_EXIT_SVG from './assets/toolbar-exit.svg?raw'
import TOOLBAR_GUIDES_SVG from './assets/toolbar-guides.svg?raw'
import TOOLBAR_INSPECTOR_SVG from './assets/toolbar-inspector.svg?raw'
import TOOLBAR_MOVE_SVG from './assets/toolbar-move.svg?raw'
import TOOLBAR_ACTIONS_SVG from './assets/toolbar-actions.svg?raw'
import TOOLBAR_OUTLINES_SVG from './assets/toolbar-outlines.svg?raw'
import CHANGES_PANEL_CLOSE_SVG from './assets/changes-panel-close.svg?raw'
import CHANGES_DELETE_SVG from './assets/changes-delete.svg?raw'

const CHANGES_AVATAR_URL = new URL('./assets/changes-avatar.jpg', import.meta.url).href
const CHANGES_DELETE_URL = new URL('./assets/changes-delete.svg', import.meta.url).href
const CHANGES_COPY_URL = new URL('./assets/changes-copy.svg', import.meta.url).href
const CHANGES_COPY_SUCCESS_URL = new URL('./assets/changes-copy-success.svg', import.meta.url).href
const CHANGES_PREVIEW_AFTER_URL = new URL('./assets/changes-preview-after.svg', import.meta.url).href
const CHANGES_PREVIEW_BEFORE_URL = new URL('./assets/changes-preview-before.svg', import.meta.url).href
const CHANGES_PANEL_CLOSE_URL = new URL('./assets/changes-panel-close.svg', import.meta.url).href
const CHANGES_PANEL_CHEVRON_URL = new URL('./assets/changes-panel-chevron.svg', import.meta.url).href
const CHANGES_UPLOAD_URL = new URL('./assets/changes-upload.svg', import.meta.url).href
const CHANGES_DOWNLOAD_URL = new URL('./assets/changes-download.svg', import.meta.url).href
const DESIGN_RESET_URL = new URL('./assets/design-reset.svg', import.meta.url).href
const EXTENSION_ICON_URL = new URL('../extension/icon.svg', import.meta.url).href
const EXTENSION_ICON_16_URL = new URL('../extension/icons/icon-16.png', import.meta.url).href
const EXTENSION_ICON_32_URL = new URL('../extension/icons/icon-32.png', import.meta.url).href
const EXTENSION_ICON_48_URL = new URL('../extension/icons/icon-48.png', import.meta.url).href
const EXTENSION_ICON_128_URL = new URL('../extension/icons/icon-128.png', import.meta.url).href

export type ElensIconGroup = 'toolbar' | 'design' | 'changes' | 'layers' | 'inline' | 'extension'
export type ElensIconRenderMode = 'svg' | 'image'

export type ElensIconDefinition = {
  id: string
  name: string
  group: ElensIconGroup
  source: string
  usage: string
  renderMode: ElensIconRenderMode
  svg?: string
  url?: string
  fixedColor?: boolean
}

export const ICON_VIEWPORT = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12C2 7.757 2 5.636 3.172 4.318C4.344 3 6.229 3 10 3H14C17.771 3 19.657 3 20.828 4.318C21.999 5.636 22 7.758 22 12C22 16.242 22 18.364 20.828 19.682C19.656 21 17.771 21 14 21H10C6.229 21 4.343 21 3.172 19.682C2.001 18.364 2 16.242 2 12Z" stroke="white" stroke-width="1.5"/><path d="M2 9H10C12.828 9 14.243 9 15.121 9.879C16 10.757 16 12.172 16 15V21" stroke="white" stroke-width="1.5"/><path d="M10 21V9" stroke="white" stroke-width="1.5"/></svg>'
export const ICON_SETTINGS = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12C8.5 10.067 10.067 8.5 12 8.5C13.933 8.5 15.5 10.067 15.5 12Z" stroke="currentColor" stroke-width="1.5"/><path d="M21.011 14.0965C21.5329 13.9558 21.7939 13.8854 21.8969 13.7508C22 13.6163 22 13.3998 22 12.9669V11.0332C22 10.6003 22 10.3838 21.8969 10.2493C21.7938 10.1147 21.5329 10.0443 21.011 9.90358C19.0606 9.37759 17.8399 7.33851 18.3433 5.40087C18.4817 4.86799 18.5509 4.60156 18.4848 4.44529C18.4187 4.28902 18.2291 4.18134 17.8497 3.96596L16.125 2.98673C15.7528 2.77539 15.5667 2.66972 15.3997 2.69222C15.2326 2.71472 15.0442 2.90273 14.6672 3.27873C13.208 4.73448 10.7936 4.73442 9.33434 3.27864C8.95743 2.90263 8.76898 2.71463 8.60193 2.69212C8.43489 2.66962 8.24877 2.77529 7.87653 2.98663L6.15184 3.96587C5.77253 4.18123 5.58287 4.28891 5.51678 4.44515C5.45068 4.6014 5.51987 4.86787 5.65825 5.4008C6.16137 7.3385 4.93972 9.37763 2.98902 9.9036C2.46712 10.0443 2.20617 10.1147 2.10308 10.2492C2 10.3838 2 10.6003 2 11.0332V12.9669C2 13.3998 2 13.6163 2.10308 13.7508C2.20615 13.8854 2.46711 13.9558 2.98902 14.0965C4.9394 14.6225 6.16008 16.6616 5.65672 18.5992C5.51829 19.1321 5.44907 19.3985 5.51516 19.5548C5.58126 19.7111 5.77092 19.8188 6.15025 20.0341L7.87495 21.0134C8.24721 21.2247 8.43334 21.3304 8.6004 21.3079C8.76746 21.2854 8.95588 21.0973 9.33271 20.7213C10.7927 19.2644 13.2088 19.2643 14.6689 20.7212C15.0457 21.0973 15.2341 21.2853 15.4012 21.3078C15.5682 21.3303 15.7544 21.2246 16.1266 21.0133L17.8513 20.034C18.2307 19.8187 18.4204 19.711 18.4864 19.5547C18.5525 19.3984 18.4833 19.132 18.3448 18.5991C17.8412 16.6616 19.0609 14.6226 21.011 14.0965Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
export const ICON_LAYERS = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.75 5.41667C3.75 4.95643 4.1231 4.58333 4.58333 4.58333H8.75C9.21024 4.58333 9.58333 4.95643 9.58333 5.41667V9.58333C9.58333 10.0436 9.21024 10.4167 8.75 10.4167H4.58333C4.1231 10.4167 3.75 10.0436 3.75 9.58333V5.41667Z" stroke="currentColor" stroke-width="1.25"/><path d="M10.4167 5.41667C10.4167 4.95643 10.7898 4.58333 11.25 4.58333H15.4167C15.8769 4.58333 16.25 4.95643 16.25 5.41667V9.58333C16.25 10.0436 15.8769 10.4167 15.4167 10.4167H11.25C10.7898 10.4167 10.4167 10.0436 10.4167 9.58333V5.41667Z" stroke="currentColor" stroke-width="1.25"/><path d="M3.75 11.25C3.75 10.7898 4.1231 10.4167 4.58333 10.4167H8.75C9.21024 10.4167 9.58333 10.7898 9.58333 11.25V15.4167C9.58333 15.8769 9.21024 16.25 8.75 16.25H4.58333C4.1231 16.25 3.75 15.8769 3.75 15.4167V11.25Z" stroke="currentColor" stroke-width="1.25"/><path d="M10.4167 11.25C10.4167 10.7898 10.7898 10.4167 11.25 10.4167H15.4167C15.8769 10.4167 16.25 10.7898 16.25 11.25V15.4167C16.25 15.8769 15.8769 16.25 15.4167 16.25H11.25C10.7898 16.25 10.4167 15.8769 10.4167 15.4167V11.25Z" stroke="currentColor" stroke-width="1.25"/></svg>'
export const ICON_LAYER_DISCLOSURE_COLLAPSED = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.121 10.121L9.243 8.00003L7.12 5.87903" stroke="currentColor" stroke-linecap="round"/></svg>'
export const ICON_LAYER_DISCLOSURE_EXPANDED = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.87903 7.12097L8.00003 9.24297L10.121 7.12097" stroke="currentColor" stroke-linecap="round"/></svg>'
export const ICON_LAYER_TEXT = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 3.5C3 3.36739 3.05268 3.24021 3.14645 3.14645C3.24021 3.05268 3.36739 3 3.5 3H11.5C11.6326 3 11.7598 3.05268 11.8536 3.14645C11.9473 3.24021 12 3.36739 12 3.5V4.5C12 4.63261 11.9473 4.75979 11.8536 4.85355C11.7598 4.94732 11.6326 5 11.5 5C11.3674 5 11.2402 4.94732 11.1464 4.85355C11.0527 4.75979 11 4.63261 11 4.5V4H8V11H8.5C8.63261 11 8.75979 11.0527 8.85355 11.1464C8.94732 11.2402 9 11.3674 9 11.5C9 11.6326 8.94732 11.7598 8.85355 11.8536C8.75979 11.9473 8.63261 12 8.5 12H6.5C6.36739 12 6.24021 11.9473 6.14645 11.8536C6.05268 11.7598 6 11.6326 6 11.5C6 11.3674 6.05268 11.2402 6.14645 11.1464C6.24021 11.0527 6.36739 11 6.5 11H7V4H4V4.5C4 4.63261 3.94732 4.75979 3.85355 4.85355C3.75979 4.94732 3.63261 5 3.5 5C3.36739 5 3.24021 4.94732 3.14645 4.85355C3.05268 4.75979 3 4.63261 3 4.5V3.5Z" fill="currentColor"/></svg>'
export const ICON_LAYER_BODY = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9 4H11.5C11.6326 4 11.7598 4.05268 11.8536 4.14645C11.9473 4.24021 12 4.36739 12 4.5V11.5C12 11.6326 11.9473 11.7598 11.8536 11.8536C11.7598 11.9473 11.6326 12 11.5 12H4.5C4.36739 12 4.24021 11.9473 4.14645 11.8536C4.05268 11.7598 4 11.6326 4 11.5V7H8.5C8.63261 7 8.75979 6.94732 8.85355 6.85355C8.94732 6.75979 9 6.63261 9 6.5V4ZM8 4H4.5C4.36739 4 4.24021 4.05268 4.14645 4.14645C4.05268 4.24021 4 4.36739 4 4.5V6H8V4ZM3 4.5C3 4.10218 3.15804 3.72064 3.43934 3.43934C3.72064 3.15804 4.10218 3 4.5 3H11.5C11.8978 3 12.2794 3.15804 12.5607 3.43934C12.842 3.72064 13 4.10218 13 4.5V11.5C13 11.8978 12.842 12.2794 12.5607 12.5607C12.2794 12.842 11.8978 13 11.5 13H4.5C4.10218 13 3.72064 12.842 3.43934 12.5607C3.15804 12.2794 3 11.8978 3 11.5V4.5Z" fill="currentColor"/></svg>'
export const ICON_LAYER_FRAME = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.5 3C5.63261 3 5.75979 3.05268 5.85355 3.14645C5.94732 3.24021 6 3.36739 6 3.5V5H10V3.5C10 3.36739 10.0527 3.24021 10.1464 3.14645C10.2402 3.05268 10.3674 3 10.5 3C10.6326 3 10.7598 3.05268 10.8536 3.14645C10.9473 3.24021 11 3.36739 11 3.5V5H12.5C12.6326 5 12.7598 5.05268 12.8536 5.14645C12.9473 5.24021 13 5.36739 13 5.5C13 5.63261 12.9473 5.75979 12.8536 5.85355C12.7598 5.94732 12.6326 6 12.5 6H11V10H12.5C12.6326 10 12.7598 10.0527 12.8536 10.1464C12.9473 10.2402 13 10.3674 13 10.5C13 10.6326 12.9473 10.7598 12.8536 10.8536C12.7598 10.9473 12.6326 11 12.5 11H11V12.5C11 12.6326 10.9473 12.7598 10.8536 12.8536C10.7598 12.9473 10.6326 13 10.5 13C10.3674 13 10.2402 12.9473 10.1464 12.8536C10.0527 12.7598 10 12.6326 10 12.5V11H6V12.5C6 12.6326 5.94732 12.7598 5.85355 12.8536C5.75979 12.9473 5.63261 13 5.5 13C5.36739 13 5.24021 12.9473 5.14645 12.8536C5.05268 12.7598 5 12.6326 5 12.5V11H3.5C3.36739 11 3.24021 10.9473 3.14645 10.8536C3.05268 10.7598 3 10.6326 3 10.5C3 10.3674 3.05268 10.2402 3.14645 10.1464C3.24021 10.0527 3.36739 10 3.5 10H5V6H3.5C3.36739 6 3.24021 5.94732 3.14645 5.85355C3.05268 5.75979 3 5.63261 3 5.5C3 5.36739 3.05268 5.24021 3.14645 5.14645C3.24021 5.05268 3.36739 5 3.5 5H5V3.5C5 3.36739 5.05268 3.24021 5.14645 3.14645C5.24021 3.05268 5.36739 3 5.5 3ZM10 10V6H6V10H10Z" fill="currentColor"/></svg>'
export const ICON_LAYER_VECTOR = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11 4.50001C11 4.63262 11.0527 4.75979 11.1464 4.85356C11.2402 4.94733 11.3674 5.00001 11.5 5.00001C11.6326 5.00001 11.7598 4.94733 11.8536 4.85356C11.9473 4.75979 12 4.63262 12 4.50001C12 4.3674 11.9473 4.24022 11.8536 4.14645C11.7598 4.05269 11.6326 4.00001 11.5 4.00001C11.3674 4.00001 11.2402 4.05269 11.1464 4.14645C11.0527 4.24022 11 4.3674 11 4.50001ZM11 5.91501C10.6664 5.79706 10.3852 5.56497 10.2062 5.25977C10.0271 4.95456 9.96177 4.59589 10.0216 4.24714C10.0814 3.89839 10.2626 3.58203 10.5332 3.35395C10.8037 3.12588 11.1462 3.00079 11.5 3.00079C11.8538 3.00079 12.1963 3.12588 12.4668 3.35395C12.7374 3.58203 12.9186 3.89839 12.9784 4.24714C13.0382 4.59589 12.9729 4.95456 12.7938 5.25977C12.6148 5.56497 12.3336 5.79706 12 5.91501V10.5L12.823 11.323C12.8463 11.3462 12.8648 11.3738 12.8774 11.4042C12.89 11.4346 12.8965 11.4671 12.8965 11.5C12.8965 11.5329 12.89 11.5655 12.8774 11.5958C12.8648 11.6262 12.8463 11.6538 12.823 11.677L11.677 12.823C11.6538 12.8463 11.6262 12.8648 11.5958 12.8774C11.5654 12.89 11.5329 12.8965 11.5 12.8965C11.4671 12.8965 11.4346 12.89 11.4042 12.8774C11.3738 12.8648 11.3462 12.8463 11.323 12.823L10.177 11.677C10.1537 11.6538 10.1353 11.6262 10.1226 11.5958C10.11 11.5655 10.1036 11.5329 10.1036 11.5C10.1036 11.4671 10.11 11.4346 10.1226 11.4042C10.1353 11.3738 10.1537 11.3462 10.177 11.323L11 10.5V8.50501C10.7693 8.78347 10.4581 8.98365 10.109 9.07801C9.665 9.19201 9.229 9.10301 8.851 8.96601C8.481 8.83201 8.109 8.62901 7.778 8.44801L7.761 8.43801C7.409 8.24801 7.1 8.08001 6.808 7.97401C6.518 7.86901 6.306 7.84801 6.14 7.89101C5.99 7.92901 5.8 8.04001 5.594 8.37101C5.386 8.70401 5.179 9.23401 5 10.053V10.085C5.33361 10.203 5.61478 10.435 5.79382 10.7402C5.97286 11.0455 6.03824 11.4041 5.9784 11.7529C5.91857 12.1016 5.73737 12.418 5.46683 12.6461C5.1963 12.8741 4.85385 12.9992 4.5 12.9992C4.14616 12.9992 3.80371 12.8741 3.53317 12.6461C3.26264 12.418 3.08144 12.1016 3.02161 11.7529C2.96177 11.4041 3.02715 11.0455 3.20619 10.7402C3.38523 10.435 3.6664 10.203 4 10.085V5.50001L3.177 4.67701C3.15372 4.65378 3.13525 4.6262 3.12265 4.59582C3.11004 4.56545 3.10356 4.53289 3.10356 4.50001C3.10356 4.46712 3.11004 4.43456 3.12265 4.40419C3.13525 4.37382 3.15372 4.34623 3.177 4.32301L4.323 3.17701C4.34623 3.15373 4.37381 3.13525 4.40419 3.12265C4.43456 3.11005 4.46712 3.10356 4.5 3.10356C4.53289 3.10356 4.56545 3.11005 4.59582 3.12265C4.62619 3.13525 4.65378 3.15373 4.677 3.17701L5.823 4.32301C5.84628 4.34623 5.86476 4.37382 5.87736 4.40419C5.88996 4.43456 5.89645 4.46712 5.89645 4.50001C5.89645 4.53289 5.88996 4.56545 5.87736 4.59582C5.86476 4.6262 5.84628 4.65378 5.823 4.67701L5 5.50001V7.49501C5.25534 7.20101 5.55234 7.01001 5.891 6.92201C6.335 6.80801 6.771 6.89701 7.149 7.03401C7.519 7.16801 7.891 7.37101 8.222 7.55201L8.239 7.56201C8.591 7.75201 8.9 7.92001 9.192 8.02601C9.482 8.13101 9.694 8.15201 9.86 8.10901C10.01 8.07101 10.2 7.96001 10.406 7.62901C10.614 7.29601 10.821 6.76601 11 5.94601V5.91501ZM4 11.5C4 11.6326 4.05268 11.7598 4.14645 11.8536C4.24022 11.9473 4.36739 12 4.5 12C4.63261 12 4.75979 11.9473 4.85356 11.8536C4.94732 11.7598 5 11.6326 5 11.5C5 11.3674 4.94732 11.2402 4.85356 11.1465C4.75979 11.0527 4.63261 11 4.5 11C4.36739 11 4.24022 11.0527 4.14645 11.1465C4.05268 11.2402 4 11.3674 4 11.5Z" fill="currentColor"/></svg>'
export const ICON_LAYER_AUTO_LAYOUT = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 4V6H12V4H4ZM4 3C3.73478 3 3.48043 3.10536 3.29289 3.29289C3.10536 3.48043 3 3.73478 3 4V6C3 6.26522 3.10536 6.51957 3.29289 6.70711C3.48043 6.89464 3.73478 7 4 7H12C12.2652 7 12.5196 6.89464 12.7071 6.70711C12.8946 6.51957 13 6.26522 13 6V4C13 3.73478 12.8946 3.48043 12.7071 3.29289C12.5196 3.10536 12.2652 3 12 3H4ZM4 10V12H8V10H4ZM4 9C3.73478 9 3.48043 9.10536 3.29289 9.29289C3.10536 9.48043 3 9.73478 3 10V12C3 12.2652 3.10536 12.5196 3.29289 12.7071C3.48043 12.8946 3.73478 13 4 13H8C8.26522 13 8.51957 12.8946 8.70711 12.7071C8.89464 12.5196 9 12.2652 9 12V10C9 9.73478 8.89464 9.48043 8.70711 9.29289C8.51957 9.10536 8.26522 9 8 9H4Z" fill="currentColor"/></svg>'
export const ICON_LAYER_IMAGE = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.9993 2.66666C12.7356 2.66666 13.3331 3.26343 13.3333 3.99966V11.9997L13.3265 12.1364C13.2627 12.7639 12.7635 13.2631 12.136 13.3268L11.9993 13.3336H3.99933L3.86359 13.3268C3.19126 13.2585 2.66632 12.69 2.66632 11.9997V3.99966C2.6665 3.26365 3.26336 2.66701 3.99933 2.66666H11.9993ZM3.66632 10.3932V11.9997C3.66632 12.1835 3.81553 12.3333 3.99933 12.3336H10.3333L6.00226 8.04068L3.66632 10.3932ZM3.99933 3.66666C3.81564 3.66701 3.6665 3.81594 3.66632 3.99966V8.97427L5.64484 6.98111L5.72296 6.91666C5.9164 6.78794 6.18037 6.80832 6.35187 6.97818L11.7542 12.3336H11.9993C12.1834 12.3336 12.3333 12.1838 12.3333 11.9997V3.99966C12.3331 3.81572 12.1833 3.66666 11.9993 3.66666H3.99933ZM9.83722 4.67545C10.6775 4.76089 11.3333 5.47078 11.3333 6.33365L11.3255 6.50357C11.2403 7.34388 10.53 7.99932 9.6673 7.99966L9.4964 7.99185C8.71202 7.91214 8.0887 7.28798 8.00909 6.50357L8.00031 6.33365C8.00031 5.41318 8.74683 4.66666 9.6673 4.66666L9.83722 4.67545ZM9.6673 5.66666C9.29911 5.66666 9.00031 5.96546 9.00031 6.33365C9.00048 6.70169 9.29922 6.99966 9.6673 6.99966C10.0351 6.9993 10.3331 6.70147 10.3333 6.33365C10.3333 5.96569 10.0352 5.66702 9.6673 5.66666Z" fill="currentColor" fill-opacity="0.9"/></svg>'
export const ICON_DESIGN_LAYERS_PANEL = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.5557 13.1768C19.7341 12.8031 20.1819 12.645 20.5557 12.8232C21.1405 13.1022 21.6555 13.3693 22.0254 13.6641C22.4124 13.9726 22.7499 14.4009 22.75 15C22.75 15.7473 22.2329 16.2204 21.7314 16.5469C21.2218 16.8787 20.4812 17.2165 19.6006 17.6211L14.707 19.8682C13.5901 20.3813 12.827 20.75 12 20.75C11.173 20.75 10.4099 20.3813 9.29297 19.8682L4.39941 17.6211C3.51877 17.2165 2.77823 16.8787 2.26855 16.5469C1.7671 16.2204 1.25 15.7473 1.25 15C1.25006 14.4009 1.58764 13.9726 1.97461 13.6641C2.34452 13.3693 2.85952 13.1022 3.44434 12.8232C3.8181 12.645 4.26592 12.8031 4.44434 13.1768C4.62267 13.5506 4.46369 13.9984 4.08984 14.1768C3.49701 14.4596 3.1283 14.6623 2.90918 14.8369C2.80589 14.9193 2.76686 14.9725 2.75391 14.9941C2.75263 14.9963 2.75076 14.9976 2.75 14.999C2.752 15.0031 2.75687 15.0122 2.76758 15.0264C2.80629 15.0775 2.89511 15.1651 3.08691 15.29C3.48139 15.5468 4.09786 15.8317 5.02539 16.2578L9.91895 18.5059C11.1615 19.0767 11.5781 19.25 12 19.25C12.4219 19.25 12.8385 19.0767 14.0811 18.5059L18.9746 16.2578C19.9022 15.8317 20.5186 15.5468 20.9131 15.29C21.1049 15.1651 21.1937 15.0775 21.2324 15.0264C21.2428 15.0126 21.2469 15.0033 21.249 14.999C21.2483 14.9977 21.2473 14.9961 21.2461 14.9941C21.2331 14.9725 21.1941 14.9193 21.0908 14.8369C20.8717 14.6623 20.503 14.4595 19.9102 14.1768C19.5363 13.9984 19.3773 13.5506 19.5557 13.1768ZM12 3.25C12.827 3.25 13.5901 3.61876 14.707 4.13184L19.6006 6.37891C20.4813 6.78345 21.2218 7.1213 21.7314 7.45312C22.2329 7.77964 22.75 8.25273 22.75 9C22.75 9.74728 22.2329 10.2204 21.7314 10.5469C21.2218 10.8787 20.4813 11.2165 19.6006 11.6211L14.707 13.8682C13.5901 14.3812 12.827 14.75 12 14.75C11.173 14.75 10.4099 14.3812 9.29297 13.8682L4.39941 11.6211C3.51874 11.2165 2.77824 10.8787 2.26855 10.5469C1.76709 10.2204 1.25 9.74728 1.25 9C1.25 8.25272 1.76708 7.77963 2.26855 7.45312C2.77825 7.1213 3.51873 6.78345 4.39941 6.37891L9.29297 4.13184C10.4099 3.61876 11.173 3.25 12 3.25ZM12 4.75C11.5781 4.75 11.1615 4.92336 9.91895 5.49414L5.02539 7.74219C4.09783 8.16827 3.48139 8.45315 3.08691 8.70996C2.89514 8.83482 2.80632 8.92244 2.76758 8.97363C2.75756 8.98688 2.75225 8.99558 2.75 9C2.75225 9.00442 2.75756 9.01313 2.76758 9.02637C2.80633 9.07756 2.89515 9.16518 3.08691 9.29004C3.48139 9.54686 4.09784 9.8317 5.02539 10.2578L9.91895 12.5059C11.1615 13.0766 11.5781 13.25 12 13.25C12.4219 13.25 12.8385 13.0766 14.0811 12.5059L18.9746 10.2578C19.9022 9.8317 20.5186 9.54686 20.9131 9.29004C21.1049 9.16518 21.1937 9.07756 21.2324 9.02637C21.2422 9.01351 21.2467 9.00453 21.249 9C21.2467 8.99547 21.2422 8.9865 21.2324 8.97363C21.1937 8.92244 21.1049 8.83482 20.9131 8.70996C20.5186 8.45315 19.9022 8.16827 18.9746 7.74219L14.0811 5.49414C12.8385 4.92337 12.4219 4.75 12 4.75Z" fill="white"/></svg>'

export const ICON_LAYER_COLLAPSE = PANEL_MINIMIZE_UI_SVG
export const ICON_LAYER_EXPAND = PANEL_MINIMIZE_UI_SVG

export const ICON_URLS = {
  changesAvatar: CHANGES_AVATAR_URL,
  changesDelete: CHANGES_DELETE_URL,
  changesCopy: CHANGES_COPY_URL,
  changesCopySuccess: CHANGES_COPY_SUCCESS_URL,
  changesPreviewAfter: CHANGES_PREVIEW_AFTER_URL,
  changesPreviewBefore: CHANGES_PREVIEW_BEFORE_URL,
  changesPanelClose: CHANGES_PANEL_CLOSE_URL,
  changesPanelChevron: CHANGES_PANEL_CHEVRON_URL,
  changesUpload: CHANGES_UPLOAD_URL,
  changesDownload: CHANGES_DOWNLOAD_URL,
  designReset: DESIGN_RESET_URL,
  extensionIcon: EXTENSION_ICON_URL,
  extensionIcon16: EXTENSION_ICON_16_URL,
  extensionIcon32: EXTENSION_ICON_32_URL,
  extensionIcon48: EXTENSION_ICON_48_URL,
  extensionIcon128: EXTENSION_ICON_128_URL,
} as const

export const ICON_SVGS = {
  checkInline: CHECK_INLINE_SVG,
  chevronDownInline: CHEVRON_DOWN_INLINE_SVG,
  copyInline: COPY_INLINE_SVG,
  toolbarChanges: TOOLBAR_CHANGES_SVG,
  toolbarDesign: TOOLBAR_DESIGN_SVG,
  designModeFigma: DESIGN_MODE_FIGMA_SVG,
  designSelectMatchingLayers: DESIGN_SELECT_MATCHING_LAYERS_SVG,
  designReset: DESIGN_RESET_SVG,
  panelMinimizeUi: PANEL_MINIMIZE_UI_SVG,
  toolbarExit: TOOLBAR_EXIT_SVG,
  toolbarGuides: TOOLBAR_GUIDES_SVG,
  toolbarInspector: TOOLBAR_INSPECTOR_SVG,
  toolbarMove: TOOLBAR_MOVE_SVG,
  toolbarActions: TOOLBAR_ACTIONS_SVG,
  toolbarOutlines: TOOLBAR_OUTLINES_SVG,
  changesPanelClose: CHANGES_PANEL_CLOSE_SVG,
  changesDelete: CHANGES_DELETE_SVG,
  viewport: ICON_VIEWPORT,
  settings: ICON_SETTINGS,
  layers: ICON_LAYERS,
  layerDisclosureCollapsed: ICON_LAYER_DISCLOSURE_COLLAPSED,
  layerDisclosureExpanded: ICON_LAYER_DISCLOSURE_EXPANDED,
  layerText: ICON_LAYER_TEXT,
  layerBody: ICON_LAYER_BODY,
  layerFrame: ICON_LAYER_FRAME,
  layerVector: ICON_LAYER_VECTOR,
  layerAutoLayout: ICON_LAYER_AUTO_LAYOUT,
  layerImage: ICON_LAYER_IMAGE,
  designLayersPanel: ICON_DESIGN_LAYERS_PANEL,
} as const

export const ELENS_ICONS: ElensIconDefinition[] = [
  { id: 'toolbar-inspector', name: 'Inspector', group: 'toolbar', source: 'src/assets/toolbar-inspector.svg', usage: 'Toolbar inspector mode', renderMode: 'svg', svg: TOOLBAR_INSPECTOR_SVG },
  { id: 'toolbar-design', name: 'Design', group: 'toolbar', source: 'src/assets/toolbar-design.svg', usage: 'Toolbar design mode', renderMode: 'svg', svg: TOOLBAR_DESIGN_SVG },
  { id: 'toolbar-move', name: 'Move', group: 'toolbar', source: 'src/assets/toolbar-move.svg', usage: 'Toolbar move mode', renderMode: 'svg', svg: TOOLBAR_MOVE_SVG },
  { id: 'toolbar-changes', name: 'Changes', group: 'toolbar', source: 'src/assets/toolbar-changes.svg', usage: 'Toolbar changes mode', renderMode: 'svg', svg: TOOLBAR_CHANGES_SVG },
  { id: 'toolbar-viewport', name: 'Viewport', group: 'toolbar', source: 'src/icons.ts inline', usage: 'Toolbar viewport panel', renderMode: 'svg', svg: ICON_VIEWPORT },
  { id: 'toolbar-settings', name: 'Settings', group: 'toolbar', source: 'src/icons.ts inline', usage: 'Toolbar settings panel', renderMode: 'svg', svg: ICON_SETTINGS },
  { id: 'toolbar-guides', name: 'Guides', group: 'toolbar', source: 'src/assets/toolbar-guides.svg', usage: 'More menu guides action', renderMode: 'svg', svg: TOOLBAR_GUIDES_SVG },
  { id: 'toolbar-outlines', name: 'Outlines', group: 'toolbar', source: 'src/assets/toolbar-outlines.svg', usage: 'More menu outlines action', renderMode: 'svg', svg: TOOLBAR_OUTLINES_SVG },
  { id: 'toolbar-actions', name: 'More', group: 'toolbar', source: 'src/assets/toolbar-actions.svg', usage: 'Toolbar more menu', renderMode: 'svg', svg: TOOLBAR_ACTIONS_SVG },
  { id: 'toolbar-exit', name: 'Exit', group: 'toolbar', source: 'src/assets/toolbar-exit.svg', usage: 'Toolbar exit action', renderMode: 'svg', svg: TOOLBAR_EXIT_SVG },
  { id: 'toolbar-layers', name: 'Layers', group: 'toolbar', source: 'src/icons.ts inline', usage: 'Toolbar layers action', renderMode: 'svg', svg: ICON_LAYERS },

  { id: 'design-mode-figma', name: 'Design Mode', group: 'design', source: 'src/assets/design-mode-figma.svg', usage: 'Design panel visual mode segment', renderMode: 'svg', svg: DESIGN_MODE_FIGMA_SVG },
  { id: 'design-select-matching-layers', name: 'Select Matching Layers', group: 'design', source: 'src/assets/design-select-matching-layers.svg', usage: 'Design action button', renderMode: 'svg', svg: DESIGN_SELECT_MATCHING_LAYERS_SVG },
  { id: 'design-layers-panel', name: 'Layers Panel', group: 'design', source: 'src/icons.ts inline', usage: 'Design action button', renderMode: 'svg', svg: ICON_DESIGN_LAYERS_PANEL },
  { id: 'design-reset', name: 'Reset', group: 'design', source: 'src/assets/design-reset.svg', usage: 'Design action button image asset', renderMode: 'image', svg: DESIGN_RESET_SVG, url: DESIGN_RESET_URL, fixedColor: true },

  { id: 'changes-delete', name: 'Delete', group: 'changes', source: 'src/assets/changes-delete.svg', usage: 'Changes item delete action', renderMode: 'image', svg: CHANGES_DELETE_SVG, url: CHANGES_DELETE_URL, fixedColor: true },
  { id: 'changes-copy', name: 'Copy', group: 'changes', source: 'src/assets/changes-copy.svg', usage: 'Changes item copy action', renderMode: 'image', url: CHANGES_COPY_URL, fixedColor: true },
  { id: 'changes-copy-success', name: 'Copy Success', group: 'changes', source: 'src/assets/changes-copy-success.svg', usage: 'Changes copy success action', renderMode: 'image', url: CHANGES_COPY_SUCCESS_URL, fixedColor: true },
  { id: 'changes-preview-after', name: 'Preview After', group: 'changes', source: 'src/assets/changes-preview-after.svg', usage: 'Changes preview toggle', renderMode: 'image', url: CHANGES_PREVIEW_AFTER_URL, fixedColor: true },
  { id: 'changes-preview-before', name: 'Preview Before', group: 'changes', source: 'src/assets/changes-preview-before.svg', usage: 'Changes preview toggle', renderMode: 'image', url: CHANGES_PREVIEW_BEFORE_URL, fixedColor: true },
  { id: 'changes-panel-close', name: 'Panel Close', group: 'changes', source: 'src/assets/changes-panel-close.svg', usage: 'Panel close action', renderMode: 'image', svg: CHANGES_PANEL_CLOSE_SVG, url: CHANGES_PANEL_CLOSE_URL, fixedColor: true },
  { id: 'changes-panel-chevron', name: 'Panel Chevron', group: 'changes', source: 'src/assets/changes-panel-chevron.svg', usage: 'Panel collapse / copy JSON action', renderMode: 'image', url: CHANGES_PANEL_CHEVRON_URL, fixedColor: true },
  { id: 'changes-upload', name: 'Upload', group: 'changes', source: 'src/assets/changes-upload.svg', usage: 'Changes import/export action', renderMode: 'image', url: CHANGES_UPLOAD_URL, fixedColor: true },
  { id: 'changes-download', name: 'Download', group: 'changes', source: 'src/assets/changes-download.svg', usage: 'Changes import/export action', renderMode: 'image', url: CHANGES_DOWNLOAD_URL, fixedColor: true },
  { id: 'changes-avatar', name: 'Avatar', group: 'changes', source: 'src/assets/changes-avatar.jpg', usage: 'Changes item avatar', renderMode: 'image', url: CHANGES_AVATAR_URL, fixedColor: true },

  { id: 'layer-disclosure-collapsed', name: 'Disclosure Collapsed', group: 'layers', source: 'src/icons.ts inline', usage: 'Layer row collapsed disclosure', renderMode: 'svg', svg: ICON_LAYER_DISCLOSURE_COLLAPSED },
  { id: 'layer-disclosure-expanded', name: 'Disclosure Expanded', group: 'layers', source: 'src/icons.ts inline', usage: 'Layer row expanded disclosure', renderMode: 'svg', svg: ICON_LAYER_DISCLOSURE_EXPANDED },
  { id: 'layer-text', name: 'Text Layer', group: 'layers', source: 'src/icons.ts inline', usage: 'Layer row text element', renderMode: 'svg', svg: ICON_LAYER_TEXT },
  { id: 'layer-body', name: 'Body Layer', group: 'layers', source: 'src/icons.ts inline', usage: 'Layer row body element', renderMode: 'svg', svg: ICON_LAYER_BODY },
  { id: 'layer-frame', name: 'Frame Layer', group: 'layers', source: 'src/icons.ts inline', usage: 'Layer row generic element', renderMode: 'svg', svg: ICON_LAYER_FRAME },
  { id: 'layer-vector', name: 'Vector Layer', group: 'layers', source: 'src/icons.ts inline', usage: 'Layer row vector element', renderMode: 'svg', svg: ICON_LAYER_VECTOR },
  { id: 'layer-auto-layout', name: 'Auto Layout Layer', group: 'layers', source: 'src/icons.ts inline', usage: 'Layer row flex/grid element', renderMode: 'svg', svg: ICON_LAYER_AUTO_LAYOUT },
  { id: 'layer-image', name: 'Image Layer', group: 'layers', source: 'src/icons.ts inline', usage: 'Layer row image element', renderMode: 'svg', svg: ICON_LAYER_IMAGE },
  { id: 'layer-collapse', name: 'Layer Collapse', group: 'layers', source: 'src/assets/panel-minimize-ui.svg', usage: 'Layers panel collapse action', renderMode: 'svg', svg: PANEL_MINIMIZE_UI_SVG },

  { id: 'check-inline', name: 'Check', group: 'inline', source: 'src/assets/check-inline.svg', usage: 'Inline success check icon', renderMode: 'svg', svg: CHECK_INLINE_SVG },
  { id: 'copy-inline', name: 'Copy Inline', group: 'inline', source: 'src/assets/copy-inline.svg', usage: 'Inline copy icon', renderMode: 'svg', svg: COPY_INLINE_SVG },
  { id: 'chevron-down-inline', name: 'Chevron Down', group: 'inline', source: 'src/assets/chevron-down-inline.svg', usage: 'Dropdown chevron', renderMode: 'svg', svg: CHEVRON_DOWN_INLINE_SVG },
  { id: 'panel-minimize-ui', name: 'Panel Minimize', group: 'inline', source: 'src/assets/panel-minimize-ui.svg', usage: 'Panel minimize / collapse icon', renderMode: 'svg', svg: PANEL_MINIMIZE_UI_SVG },

  { id: 'extension-icon', name: 'Extension Icon', group: 'extension', source: 'extension/icon.svg', usage: 'Browser extension source icon', renderMode: 'image', url: EXTENSION_ICON_URL, fixedColor: true },
  { id: 'extension-icon-16', name: 'Extension Icon 16', group: 'extension', source: 'extension/icons/icon-16.png', usage: 'Browser extension 16px icon', renderMode: 'image', url: EXTENSION_ICON_16_URL, fixedColor: true },
  { id: 'extension-icon-32', name: 'Extension Icon 32', group: 'extension', source: 'extension/icons/icon-32.png', usage: 'Browser extension 32px icon', renderMode: 'image', url: EXTENSION_ICON_32_URL, fixedColor: true },
  { id: 'extension-icon-48', name: 'Extension Icon 48', group: 'extension', source: 'extension/icons/icon-48.png', usage: 'Browser extension 48px icon', renderMode: 'image', url: EXTENSION_ICON_48_URL, fixedColor: true },
  { id: 'extension-icon-128', name: 'Extension Icon 128', group: 'extension', source: 'extension/icons/icon-128.png', usage: 'Browser extension 128px icon', renderMode: 'image', url: EXTENSION_ICON_128_URL, fixedColor: true },
]

export function getElensIcon(id: string): ElensIconDefinition {
  const icon = ELENS_ICONS.find((item) => item.id === id)
  if (!icon) throw new Error(`Unknown Elens icon: ${id}`)
  return icon
}
