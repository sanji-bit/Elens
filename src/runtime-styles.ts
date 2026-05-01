import { getDesignStyles } from './design'
import { generateCSSVariables } from './design-tokens'
import type { ThemeBuildResult } from './types'

export function createInspectorStyles(zIndex: number): string {
  return `
.ei-root, .ei-root * { box-sizing: border-box; }
.ei-root { position: fixed; inset: 0; pointer-events: none; z-index: ${zIndex}; font-family: var(--font-family); }
.ei-highlight { position: fixed; pointer-events: none; }
.ei-design-scope-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 2; }
.ei-design-scope-box { position: fixed; border: 1px solid var(--interactive-accent); background: transparent; pointer-events: none; }
.ei-hl-margin { position: relative; width: 100%; height: 100%; background: var(--overlay-margin-bg); }
.ei-hl-padding { position: absolute; background: var(--overlay-padding); }
.ei-hl-content { position: absolute; background: var(--overlay-content); }
.ei-hl-gap { position: absolute; inset: 0; pointer-events: none; }
.ei-highlight[data-design="true"] .ei-hl-margin { background: transparent; outline: none; }
.ei-highlight[data-design="true"] .ei-hl-padding { background: transparent; border: 1px solid var(--interactive-accent); }
.ei-highlight[data-design="true"] .ei-hl-content { background: transparent; }
.ei-highlight[data-inspector="true"] .ei-hl-margin { background: transparent; outline: none; }
.ei-highlight[data-inspector="true"] .ei-hl-padding { background: transparent; border: 1px solid var(--interactive-accent); }
.ei-highlight[data-inspector="true"] .ei-hl-content { background: transparent; }
.ei-highlight[data-outlines="true"] .ei-hl-margin { background: transparent; }
.ei-highlight[data-outlines="true"] .ei-hl-padding { background: transparent; border: 1px solid var(--interactive-accent); }
.ei-highlight[data-outlines="true"] .ei-hl-content { background: repeating-linear-gradient(-45deg, color-mix(in srgb, var(--interactive-accent) 12%, transparent), color-mix(in srgb, var(--interactive-accent) 12%, transparent) 2px, transparent 2px, transparent 4px); }
.ei-highlight[data-move="true"] .ei-hl-padding { border: 1px solid var(--interactive-accent); background: transparent; }
.ei-highlight[data-move="true"] .ei-hl-content { background: transparent; }
.ei-moving { opacity: 0.72; outline: 1px solid var(--interactive-accent); outline-offset: 2px; pointer-events: none; }
.ei-move-indicator { position: fixed; inset: 0; display: none; pointer-events: none; z-index: 2; }
.ei-move-indicator[data-visible="true"] { display: block; }
.ei-move-bounds { position: absolute; border: 1px dashed var(--overlay-move); border-radius: 0; background: transparent; box-shadow: none; }
.ei-move-bounds-label { position: absolute; display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 0; background: var(--overlay-move); color: var(--overlay-label-text); font-size: var(--text-sm); font-weight: var(--font-semibold); line-height: 1; white-space: nowrap; box-shadow: 0 6px 20px color-mix(in srgb, var(--overlay-move) 22%, transparent); }
.ei-move-handles { position: absolute; inset: 0; }
.ei-move-handle { position: absolute; pointer-events: auto; width: 32px; height: 10px; margin: -5px 0 0 -16px; border: 2px solid var(--overlay-move); border-radius: 999px; background: color-mix(in srgb, var(--interactive-accent) 10%, transparent); cursor: grab; transition: background-color 120ms ease, box-shadow 120ms ease, transform 120ms ease, opacity 120ms ease; }
.ei-move-handle::before { content: ''; position: absolute; inset: 1px 5px; border-radius: 999px; background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--overlay-move) 22%, transparent) 0 2px, transparent 2px 5px); }
.ei-move-handle:hover,
.ei-move-handle[data-active="true"] { background: var(--overlay-move); box-shadow: 0 0 0 3px color-mix(in srgb, var(--overlay-move) 14%, transparent); }
.ei-move-handle:hover::before,
.ei-move-handle[data-active="true"]::before { background: transparent; }
.ei-move-handle:hover { transform: scale(1.03); }
.ei-move-handle[data-active="true"] { cursor: grabbing; transform: scale(1.04); }
.ei-move-guide-line { position: absolute; display: none; height: 1px; background: var(--overlay-move); transform-origin: center; }
.ei-move-guide-dot { position: absolute; display: none; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 999px; border: 2px solid var(--overlay-move); background: var(--text-inverse); }
.ei-move-indicator[data-visible="true"] .ei-move-guide-line,
.ei-move-indicator[data-visible="true"] .ei-move-guide-dot { display: block; }
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-content { background: transparent; }
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-margin { background: transparent; }
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-padding { background: transparent; border: 1px solid var(--interactive-accent); }
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-label,
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-code,
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-pad-badge,
.ei-root[data-mode="move"] .ei-highlight[data-design="false"] .ei-hl-pad-line { display: none !important; }
.ei-root[data-mode="move"] .ei-panel { user-select: none; }
.ei-root[data-mode="move"] .ei-empty { line-height: 1.6; color: var(--text-secondary); }
.ei-root[data-mode="move"] .ei-badge-lock { background: color-mix(in srgb, var(--interactive-accent) 22%, var(--surface-panel)); }
.ei-root[data-mode="move"] .ei-copy-color,
.ei-root[data-mode="move"] .ei-annotate { display: none; }
.ei-root[data-mode="move"] [data-ei-moving="true"] { opacity: 0.72; outline: 1px solid var(--interactive-accent); outline-offset: 2px; }
.ei-hl-label { position: absolute; bottom: 100%; left: 0; background: transparent; color: var(--interactive-accent); font-size: var(--text-base); font-weight: var(--font-medium); white-space: nowrap; padding: 0 0 2px; display: none; font-family: var(--font-family); }
.ei-hl-code { position: absolute; bottom: 100%; right: 0; color: var(--interactive-accent); font-size: var(--text-lg); font-weight: var(--font-semibold); padding: 0 0 2px; display: none; font-family: var(--font-family); }
.ei-hl-pad-badge { position: absolute; background: var(--interactive-accent); color: var(--overlay-label-text); font-size: var(--text-xs); font-weight: var(--font-medium); padding: 1px 4px; border-radius: 3px; white-space: nowrap; display: none; font-family: var(--font-family); z-index: 1; }
.ei-hl-pad-line { position: absolute; display: none; }
.ei-hl-pad-line-h { border-top: 1px solid var(--interactive-accent); }
.ei-hl-pad-line-v { border-left: 1px solid var(--interactive-accent); }
.ei-hl-pad-edge { position: absolute; display: none; pointer-events: none; background: repeating-linear-gradient(-45deg, color-mix(in srgb, var(--interactive-accent) 12%, transparent), color-mix(in srgb, var(--interactive-accent) 12%, transparent) 2px, transparent 2px, transparent 4px); }
.ei-hl-margin-badge { position: absolute; background: var(--overlay-margin); color: var(--overlay-label-text); font-size: var(--text-xs); font-weight: var(--font-medium); padding: 1px 4px; border-radius: 3px; white-space: nowrap; display: none; font-family: var(--font-family); z-index: 1; }
.ei-hl-margin-line { position: absolute; display: none; }
.ei-hl-margin-line-h { border-top: 1px dashed var(--overlay-margin); }
.ei-hl-margin-line-v { border-left: 1px dashed var(--overlay-margin); }
.ei-hl-margin-edge { position: absolute; display: none; pointer-events: none; background: repeating-linear-gradient(-45deg, color-mix(in srgb, var(--overlay-margin) 16%, transparent), color-mix(in srgb, var(--overlay-margin) 16%, transparent) 2px, transparent 2px, transparent 4px); }
.ei-hl-gap-band { position: absolute; display: none; pointer-events: none; background: repeating-linear-gradient(-45deg, color-mix(in srgb, var(--purple) 32%, transparent), color-mix(in srgb, var(--purple) 32%, transparent) 2px, color-mix(in srgb, var(--purple) 12%, transparent) 2px, color-mix(in srgb, var(--purple) 12%, transparent) 5px); border: 1px dashed var(--purple); }
.ei-hl-gap-badge { position: absolute; display: none; transform: translate(-50%, -50%); background: var(--purple); color: var(--overlay-label-text); font-size: var(--text-xs); font-weight: var(--font-medium); padding: 1px 4px; border-radius: 3px; white-space: nowrap; font-family: var(--font-family); z-index: 2; }
.ei-highlight[data-design="true"] .ei-hl-margin-badge,
.ei-highlight[data-design="true"] .ei-hl-margin-line,
.ei-highlight[data-design="true"] .ei-hl-margin-edge { display: block; }
.ei-guides-overlay { position: fixed; inset: 0; pointer-events: none; display: none; z-index: 2; }
.ei-guides-overlay[data-visible="true"] { display: block; }
.ei-ruler { position: fixed; background: var(--overlay-ruler); pointer-events: auto; z-index: 3; font-family: var(--font-family); }
.ei-ruler-top { left: 0; top: 0; width: 100%; height: 24px; border-bottom: 1px solid var(--border-input); cursor: ns-resize; }
.ei-ruler-left { left: 0; top: 24px; width: 24px; height: calc(100vh - 24px); border-right: 1px solid var(--border-input); cursor: ew-resize; }
.ei-ruler-marks { position: absolute; inset: 0; overflow: hidden; }
.ei-ruler-mark { position: absolute; background: var(--text-muted); }
.ei-ruler-mark-major { background: var(--text-secondary); }
.ei-ruler-top .ei-ruler-mark { width: 1px; height: 6px; bottom: 0; }
.ei-ruler-top .ei-ruler-mark-major { height: 10px; }
.ei-ruler-left .ei-ruler-mark { height: 1px; width: 6px; right: 0; }
.ei-ruler-left .ei-ruler-mark-major { width: 10px; }
.ei-ruler-label { font-size: var(--text-xs); color: var(--text-secondary); position: absolute; }
.ei-reference-lines { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
.ei-ref-line { position: absolute; pointer-events: auto; }
.ei-ref-line-h { left: 24px; right: 0; height: 1px; background: var(--overlay-guide); cursor: ns-resize; }
.ei-ref-line-v { top: 24px; bottom: 0; width: 1px; background: var(--overlay-guide); cursor: ew-resize; }
.ei-ref-line:hover { background: var(--overlay-guide); }
.ei-ref-line-label { position: absolute; background: var(--overlay-guide); color: var(--overlay-label-text); font-size: var(--text-xs); font-weight: var(--font-semibold); padding: 2px 4px; border-radius: 2px; white-space: nowrap; pointer-events: none; }
.ei-ref-line-h .ei-ref-line-label { left: 4px; top: -16px; }
.ei-ref-line-v .ei-ref-line-label { top: 4px; left: 4px; }
.ei-guide-line { position: fixed; display: none; z-index: 2; pointer-events: none; }
.ei-guide-line-h { left: 0; right: 0; height: 0; border-top: 1px dashed var(--overlay-guide); }
.ei-guide-line-v { top: 0; bottom: 0; width: 0; border-left: 1px dashed var(--overlay-guide); }
.ei-guide-line[data-visible="true"] { display: block; }
.ei-distance-line { position: fixed; display: none; background: var(--overlay-move); pointer-events: none; z-index: 2; }
.ei-distance-line[data-visible="true"] { display: block; }
.ei-distance-line-h { height: 1px; }
.ei-distance-line-v { width: 1px; }
.ei-distance-label { position: fixed; display: none; background: var(--overlay-move); color: var(--overlay-label-text); font-size: var(--text-base); font-weight: var(--font-semibold); padding: 3px 6px; border-radius: 3px; pointer-events: none; white-space: nowrap; z-index: 3; font-family: var(--font-family); }
.ei-distance-label[data-visible="true"] { display: block; }
.ei-distance-label-h { transform: translate(-50%, -50%); }
.ei-distance-label-v { transform: translate(-50%, -50%); }
.ei-padding-overlay { position: fixed; inset: 0; display: none; pointer-events: none; z-index: 2; font-family: var(--font-family); }
.ei-padding-overlay[data-visible="true"] { display: block; }
.ei-padding-outline,
.ei-padding-content-outline,
.ei-padding-highlight,
.ei-padding-band,
.ei-padding-badge,
.ei-padding-tag,
.ei-padding-code { position: fixed; pointer-events: none; }
.ei-padding-outline { border: 1px solid var(--overlay-guide); }
.ei-padding-content-outline { border: 1px solid var(--overlay-move-bg); background: var(--text-inverse); }
.ei-padding-highlight { border: 1px dashed var(--overlay-guide); }
.ei-padding-band { background: repeating-linear-gradient(-45deg, color-mix(in srgb, var(--overlay-guide) 10%, transparent), color-mix(in srgb, var(--overlay-guide) 10%, transparent) 4px, color-mix(in srgb, var(--overlay-guide) 2%, transparent) 4px, color-mix(in srgb, var(--overlay-guide) 2%, transparent) 8px); }
.ei-padding-badge { display: none; min-width: 0; height: auto; padding: 1px 4px; align-items: center; justify-content: center; background: var(--overlay-label-bg); color: var(--overlay-label-text); font-size: var(--text-xs); font-weight: var(--font-medium); border-radius: 3px; transform: translate(-50%, -50%); }
.ei-padding-badge[data-visible="true"] { display: inline-flex; }
.ei-padding-tag,
.ei-padding-code { display: none; color: var(--overlay-guide); line-height: 1; white-space: nowrap; }
.ei-padding-tag { font-size: var(--text-base); font-weight: var(--font-medium); padding: 0 0 2px; }
.ei-padding-code { font-size: var(--text-lg); font-weight: var(--font-semibold); padding: 0 0 2px; }
.ei-padding-tag[data-visible="true"],
.ei-padding-code[data-visible="true"] { display: block; }
.ei-guide-anchor-highlight { position: fixed; pointer-events: none; z-index: 3; border: 1px solid var(--overlay-guide); }
.ei-guide-anchor-handle { position: absolute; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 0; border: 1px solid var(--overlay-guide); background: white; }
.ei-guide-anchor-handle[data-pos="tl"] { left: 0; top: 0; }
.ei-guide-anchor-handle[data-pos="tm"] { left: 50%; top: 0; }
.ei-guide-anchor-handle[data-pos="tr"] { left: 100%; top: 0; }
.ei-guide-anchor-handle[data-pos="rm"] { left: 100%; top: 50%; }
.ei-guide-anchor-handle[data-pos="br"] { left: 100%; top: 100%; }
.ei-guide-anchor-handle[data-pos="bm"] { left: 50%; top: 100%; }
.ei-guide-anchor-handle[data-pos="bl"] { left: 0; top: 100%; }
.ei-guide-anchor-handle[data-pos="lm"] { left: 0; top: 50%; }
.ei-root[data-mode="guides"] .ei-highlight { border: 1px dashed var(--overlay-guide) !important; }
.ei-root[data-mode="guides"] .ei-hl-margin,
.ei-root[data-mode="guides"] .ei-hl-padding,
.ei-root[data-mode="guides"] .ei-hl-content { display: none !important; }
.ei-toolbar { position: fixed; display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-full); background: var(--surface-toolbar); box-shadow: var(--shadow-toolbar); pointer-events: auto; cursor: grab; user-select: none; }
.ei-toolbar:active { cursor: grabbing; }
.ei-toolbar::after { content: ''; position: absolute; inset: 0; border-radius: inherit; box-shadow: var(--shadow-inset); pointer-events: none; }
.ei-toolbar[data-expanded="false"] { padding: var(--space-3); gap: 0; }
.ei-toolbar[data-expanded="false"] .ei-toolbar-extra { display: none; }
.ei-toolbar-btn,
.ei-design-action-btn { border: 0; outline: none; background: transparent; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0; transition: background var(--duration-slow) var(--ease-default), color var(--duration-slow) var(--ease-default), box-shadow var(--duration-slow) var(--ease-default); }
.ei-toolbar-btn { width: var(--btn-icon-size); height: var(--btn-icon-size); border-radius: var(--radius-full); color: var(--text-primary); position: relative; }
.ei-toolbar-btn:hover { background: var(--surface-hover-strong); }
.ei-toolbar-btn:focus,
.ei-toolbar-btn:focus-visible { outline: none; box-shadow: none; }
.ei-toolbar-btn:hover .ei-toolbar-tip { opacity: 1; }
.ei-toolbar-btn[data-active="true"] { background: var(--interactive-accent); color: var(--overlay-label-text); }
.ei-toolbar-btn[data-active="true"]:hover { background: var(--interactive-accent); }
.ei-toolbar-btn[data-disabled="true"] { opacity: 0.35; pointer-events: none; }
.ei-toolbar-btn svg { width: var(--btn-icon-glyph-size); height: var(--btn-icon-glyph-size); flex-shrink: 0; }
.ei-toolbar-divider { display: flex; align-items: center; padding: 0 var(--space-1); }
.ei-toolbar-divider-line { width: 1px; height: var(--space-8); background: var(--surface-hover-strong); }
.ei-toolbar-tip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: var(--space-4); padding: var(--space-2) var(--space-4); border-radius: var(--radius-lg); background: var(--overlay-ruler); color: var(--text-primary); font-size: var(--text-base); font-weight: var(--font-medium); white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity var(--duration-slow) var(--ease-default); font-family: var(--font-family); }
.ei-toolbar-btn-group { display: flex; align-items: center; gap: 0; }
.ei-toolbar-btn-group .ei-toolbar-btn { border-radius: 0; }
.ei-toolbar-btn-group .ei-toolbar-btn:first-child { border-radius: var(--radius-full) 0 0 var(--radius-full); }
.ei-toolbar-btn-group .ei-toolbar-btn:last-child { border-radius: 0 var(--radius-full) var(--radius-full) 0; }
.ei-capture-menu { position: fixed; display: flex; flex-direction: column; gap: var(--dropdown-menu-item-gap); min-width: calc(var(--panel-width) - 100px); border-radius: var(--radius-3xl); background: var(--surface-panel); border: 1px solid var(--border-default); box-shadow: var(--shadow-dropdown); padding: var(--space-3); z-index: ${zIndex + 5}; pointer-events: auto; font-family: var(--font-family); }
.ei-capture-menu-item { display: flex; align-items: center; gap: var(--space-4); width: 100%; min-height: var(--dropdown-option-height); padding: var(--space-2) var(--space-4); border-radius: var(--radius-lg); border: 0; background: transparent; color: var(--text-primary); cursor: pointer; text-align: left; transition: background var(--duration-slow) var(--ease-default); }
.ei-capture-menu-item[data-size="lg"] { min-height: var(--menu-item-height-lg); border-radius: var(--menu-item-radius-lg); }
.ei-capture-menu-item:hover { background: var(--surface-hover-strong); }
.ei-capture-menu-item[data-active="true"] { background: color-mix(in srgb, var(--interactive-accent) 22%, var(--surface-panel)); color: var(--interactive-accent); }
.ei-capture-menu-item[data-active="true"] .ei-capture-menu-icon,
.ei-capture-menu-item[data-active="true"] .ei-capture-menu-label { color: inherit; }
.ei-capture-menu-icon { flex-shrink: 0; width: var(--space-8); height: var(--space-8); color: var(--text-secondary); display: inline-flex; align-items: center; justify-content: center; }
.ei-capture-menu-icon svg { width: var(--space-8); height: var(--space-8); display: block; }
.ei-capture-menu-label { font-size: var(--text-base); line-height: 16px; font-weight: var(--font-normal); color: var(--text-primary); font-family: var(--font-family); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
.ei-capture-menu-item[data-size="lg"] .ei-capture-menu-label { font-size: var(--menu-item-font-size-lg); }
.ei-viewport-menu { width: calc(var(--panel-width) - 120px); min-width: calc(var(--panel-width) - 120px); }
.ei-viewport-mode.ei-tabs { grid-template-columns: repeat(2, 1fr); margin-bottom: var(--space-4); }
.ei-viewport-custom { display: flex; flex-direction: column; gap: var(--space-4); padding-top: var(--space-4); margin-top: var(--space-4); border-top: 1px solid var(--border-subtle); }
.ei-viewport-custom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.ei-viewport-custom .ei-dp-field { min-width: 0; }
.ei-viewport-custom .ei-dp-field-input { cursor: text; appearance: textfield; -moz-appearance: textfield; }
.ei-viewport-custom .ei-dp-field-input::-webkit-outer-spin-button,
.ei-viewport-custom .ei-dp-field-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.ei-viewport-custom .ei-button { width: 100%; }
.ei-panel { position: fixed; top: var(--panel-offset); left: var(--panel-offset); width: var(--panel-width); border-radius: var(--panel-radius); overflow: visible; background: var(--surface-panel); border: 1px solid var(--border-default); box-shadow: var(--panel-shadow); pointer-events: auto; color: var(--text-primary); user-select: text; z-index: 4; transition: height var(--duration-slow) var(--ease-default), min-height var(--duration-slow) var(--ease-default); }
.ei-layers-panel { position: fixed; top: var(--panel-offset); left: var(--panel-offset); width: min(var(--panel-width), calc(100vw - 32px)); height: calc(100vh - var(--panel-offset) * 2); border-radius: var(--panel-radius); overflow: hidden; background: var(--surface-panel); border: 1px solid var(--border-default); box-shadow: var(--panel-shadow); pointer-events: auto; color: var(--text-primary); z-index: 4; display: flex; flex-direction: column; }
.ei-root[data-mode="design"] .ei-panel { top: var(--panel-offset); right: var(--panel-offset); left: auto; }
.ei-root[data-mode="design"] .ei-panel:not(.is-changes) .ei-body { max-height: calc(100vh - var(--panel-offset) * 2 - 140px); }
.ei-layers-panel[data-collapsed="true"] { height: auto; }
.ei-layers-panel[data-collapsed="true"] .ei-layers-search-wrap,
.ei-layers-panel[data-collapsed="true"] .ei-layers-body { display: none; }
.ei-layers-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--panel-header-padding); border-bottom: 1px solid var(--border-subtle); }
.ei-layers-title { font-size: var(--text-lg); line-height: var(--leading-none); font-weight: var(--font-bold); color: var(--text-primary); }
.ei-layers-actions { display: inline-flex; align-items: center; gap: var(--space-2); }
.ei-layers-window-btn [fill*="var(--fill-0, white)"],
.ei-layers-window-btn [fill="currentColor"] { color: inherit; fill: currentColor; }
.ei-layers-window-btn [stroke="currentColor"] { color: inherit; stroke: currentColor; }
.ei-layers-window-btn-collapse svg { transition: transform var(--duration-slow) var(--ease-default); }
.ei-layers-panel[data-collapsed="true"] .ei-layers-window-btn-collapse svg { transform: rotate(180deg); }
.ei-layers-search-wrap { padding: var(--space-4); border-bottom: 1px solid var(--border-subtle); }
.ei-layers-search { width: 100%; height: var(--input-height); border: 0; border-radius: 0; background: transparent; color: var(--text-primary); padding: 0 var(--space-4); font-size: var(--text-base); outline: none; }
.ei-layers-search:focus { border-color: transparent; }
.ei-layers-body { flex: 1; min-height: 0; overflow: auto; padding: 0; display: flex; flex-direction: column; gap: 0; }
.ei-layers-empty { padding: var(--space-4); }
.ei-layers-notice { padding: var(--space-2) var(--space-3); border-radius: var(--radius-lg); background: color-mix(in srgb, var(--interactive-accent) 12%, transparent); color: var(--text-secondary); font-size: var(--text-sm); margin-bottom: var(--space-2); }
.ei-layer-row { width: 100%; min-height: 28px; border: 0; background: transparent; color: var(--text-primary); border-radius: 0; display: flex; align-items: center; gap: var(--space-2); padding: 0 var(--space-2); text-align: left; cursor: pointer; user-select: none; }
.ei-layer-row:focus-visible { outline: none; }
.ei-layer-row:hover { background: var(--surface-hover); }
.ei-layer-row[data-active="true"] { background: color-mix(in srgb, var(--interactive-accent) 16%, var(--surface-panel)); color: var(--interactive-accent); }
.ei-layer-disclosure { width: 16px; height: 16px; flex: 0 0 16px; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--text-secondary); display: inline-flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; }
.ei-layer-row[data-active="true"] .ei-layer-disclosure { color: inherit; }
.ei-layer-disclosure[data-empty="true"] { opacity: 0; pointer-events: none; }
.ei-layer-icon { width: 16px; height: 16px; flex: 0 0 16px; display: inline-flex; align-items: center; justify-content: center; color: var(--text-secondary); }
.ei-layer-label { min-width: 0; font-size: var(--text-base); line-height: 16px; font-weight: var(--font-medium); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-layer-secondary { min-width: 0; flex: 1; font-size: var(--text-base); line-height: 16px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-layer-row[data-active="true"] .ei-layer-icon,
.ei-layer-row[data-active="true"] .ei-layer-secondary { color: inherit; }
.ei-root[data-mode="inspector"] .ei-layers-panel { left: 16px; top: 16px; }
.ei-root[data-mode="design"] .ei-layers-panel,
.ei-root[data-mode="move"] .ei-layers-panel,
.ei-root[data-mode="changes"] .ei-layers-panel,
.ei-root[data-mode="guides"] .ei-layers-panel,
.ei-root[data-mode="off"] .ei-layers-panel { left: 16px; top: 16px; }
.ei-panel.is-changes { min-height: 520px; display: flex; flex-direction: column; }
.ei-panel-header { display: flex; justify-content: space-between; align-items: center; gap: var(--space-6); padding: var(--panel-header-padding); border-bottom: 1px solid var(--border-subtle); }
.ei-panel.is-changes .ei-panel-header { padding: var(--panel-header-padding); border-bottom: 1px solid var(--border-subtle); }
.ei-design-actions { display: none; align-items: center; justify-content: space-between; gap: var(--space-4); padding: var(--space-4) var(--space-8) calc(var(--space-4) + 1px); border-bottom: 0.5px solid var(--border-subtle); }
.ei-design-selection-summary { padding: var(--space-4) var(--space-8); border-bottom: 0.5px solid var(--border-subtle); }
.ei-design-selection-summary-text { font-size: 11px; line-height: 24px; color: var(--text-secondary); letter-spacing: 0.055px; }
.ei-design-actions-left, .ei-design-actions-right { display: inline-flex; align-items: center; }
.ei-design-actions-left { gap: var(--space-4); }
.ei-design-actions-right { gap: 0; }
.ei-design-action-btn-group { display: inline-flex; align-items: center; gap: var(--space-1); }
.ei-design-action-btn { width: var(--btn-icon-size-sm); height: var(--btn-icon-size-sm); border-radius: var(--space-3); color: var(--text-secondary); }
.ei-design-action-btn img,
.ei-design-action-btn svg { width: var(--btn-icon-glyph-size-sm); height: var(--btn-icon-glyph-size-sm); display: block; }
.ei-design-action-btn img { filter: brightness(0) saturate(100%) invert(80%) sepia(8%) saturate(453%) hue-rotate(179deg) brightness(86%) contrast(85%); }
.ei-design-action-btn:hover { background: var(--surface-hover); color: var(--text-primary); }
.ei-design-action-btn:hover img { filter: brightness(0) saturate(100%) invert(94%) sepia(3%) saturate(289%) hue-rotate(186deg) brightness(93%) contrast(92%); }
.ei-design-action-btn[data-active="true"] { background: color-mix(in srgb, var(--interactive-accent) 22%, transparent); color: var(--interactive-accent); }
.ei-design-action-btn[data-active="true"] img { filter: brightness(0) saturate(100%) invert(47%) sepia(94%) saturate(2044%) hue-rotate(184deg) brightness(101%) contrast(101%); }
.ei-design-action-btn[data-active="true"] [fill*="var(--fill-0, white)"],
.ei-design-action-btn[data-active="true"] [stroke="currentColor"] { color: inherit; fill: currentColor; stroke: currentColor; }
.ei-design-action-btn:focus-visible { outline: none; box-shadow: inset 0 0 0 1px var(--interactive-accent); }
.ei-design-action-btn:disabled { opacity: 0.4; cursor: default; }
.ei-design-action-btn:disabled img { filter: none; }
.ei-drag-handle { position: absolute; top: 0; left: 0; width: 100%; height: 12px; border: 0; background: transparent; cursor: grab; display: block; padding: 0; }
.ei-drag-handle:active { cursor: grabbing; }
.ei-drag-bar { display: none; }
.ei-panel-title { font-size: var(--text-lg); line-height: var(--leading-none); font-weight: var(--font-bold); color: var(--text-primary); }
.ei-panel.is-changes .ei-panel-title { font-size: var(--text-lg); line-height: var(--leading-none); font-weight: var(--font-bold); color: var(--text-primary); }
.ei-panel-subtitle { font-size: var(--text-base); color: var(--text-muted); margin-top: var(--space-1); }
.ei-actions { display: flex; gap: var(--space-4); }
.ei-panel.is-changes .ei-actions { gap: 0; }
.ei-panel-window-actions { display: inline-flex; align-items: center; gap: 0; }
.ei-icon-btn { min-width: var(--btn-icon-size); height: var(--btn-icon-size); border-radius: var(--radius-xl); border: 1px solid var(--border-hover); background: var(--surface-hover); color: var(--text-primary); cursor: pointer; font-size: var(--text-lg); }
.ei-panel-minimize [fill*="var(--fill-0, white)"],
.ei-changes-close [fill*="var(--fill-0, white)"] { fill: currentColor; }
.ei-panel-minimize[aria-pressed="true"] { color: var(--text-primary); }
.ei-panel-action-divider { width: 1px; height: var(--space-6); margin: 0 var(--space-2); background: var(--border-subtle); flex-shrink: 0; }
.ei-body { padding: var(--panel-body-padding); overflow-y: auto; scrollbar-width: auto; -ms-overflow-style: auto; }
.ei-panel[data-collapsed="true"] { min-height: 0; }
.ei-panel[data-collapsed="true"] .ei-panel-header { transition: padding var(--duration-slow) var(--ease-default); }
.ei-panel[data-collapsed="true"] .ei-design-actions,
.ei-panel[data-collapsed="true"] .ei-ann-summary-bar,
.ei-panel[data-collapsed="true"] .ei-body,
.ei-panel[data-collapsed="true"] .ei-annotate,
.ei-panel[data-collapsed="true"] .ei-ann-export { opacity: 0; pointer-events: none; }
.ei-panel[data-collapse-hidden="true"] .ei-design-actions,
.ei-panel[data-collapse-hidden="true"] .ei-ann-summary-bar,
.ei-panel[data-collapse-hidden="true"] .ei-body,
.ei-panel[data-collapse-hidden="true"] .ei-annotate,
.ei-panel[data-collapse-hidden="true"] .ei-ann-export { display: none !important; }
.ei-panel.is-inspector-compact .ei-panel-header { display: none; }
.ei-panel.is-inspector-compact .ei-body { padding: var(--space-4) var(--space-4) var(--space-4) var(--space-4); }
.ei-panel.is-inspector-compact .ei-annotate { padding: 0 var(--space-4) var(--space-4); }
.ei-panel.is-changes .ei-body { flex: 1; min-height: 0; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-8); }
.ei-body::-webkit-scrollbar { width: 10px; height: 10px; }
.ei-body::-webkit-scrollbar-track { background: transparent; }
.ei-body::-webkit-scrollbar-thumb { background: var(--surface-active); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }
.ei-body::-webkit-scrollbar-thumb:hover { background: var(--surface-hover-strong); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }
.ei-empty { font-size: var(--text-lg); color: var(--text-secondary); line-height: 1.5; }
.ei-badges { display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-5); }
.ei-badge { display: inline-flex; align-items: center; border-radius: var(--radius-full); padding: var(--space-1) var(--space-3); font-size: var(--text-sm); font-weight: var(--font-bold); background: var(--surface-field); color: var(--text-primary); }
.ei-badge-lock { background: color-mix(in srgb, var(--interactive-accent) 22%, var(--surface-panel)); color: var(--interactive-accent); }
.ei-breadcrumbs { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-5); }
.ei-crumb { display: inline-flex; align-items: center; height: var(--input-height); max-width: 100%; border-radius: var(--field-radius); padding: 0 var(--space-4); font-size: var(--text-sm); font-weight: var(--font-semibold); background: var(--surface-field); color: var(--text-primary); border: 0; cursor: pointer; }
.ei-crumb[data-active="true"] { background: color-mix(in srgb, var(--interactive-accent) 22%, var(--surface-panel)); color: var(--interactive-accent); }
.ei-text-head { font-size: var(--text-lg); font-weight: var(--font-semibold); line-height: 1.45; margin-bottom: var(--space-3); }
.ei-path { font-size: var(--text-base); color: var(--text-tertiary); line-height: 1.4; margin-bottom: var(--space-6); word-break: break-word; }
.ei-inspector-wrap { display: flex; flex-direction: column; gap: var(--space-2); }
.ei-inspector-card { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4) var(--space-4) var(--space-8); border-radius: var(--radius-xl); background: color-mix(in srgb, var(--text-primary) 5%, transparent); }
.ei-inspector-target { display: flex; align-items: center; gap: var(--space-2); min-width: 0; height: var(--input-height); border: 0; background: transparent; padding: 0 var(--space-2) 0 0; cursor: pointer; text-align: left; }
.ei-inspector-target-chevron { width: 16px; height: 16px; color: var(--text-secondary); opacity: 0.72; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transform: rotate(-90deg); transition: transform 120ms ease; }
.ei-inspector-target[data-expanded="true"] .ei-inspector-target-chevron { transform: rotate(0deg); }
.ei-inspector-target-chevron img, .ei-inspector-target-chevron svg { width: 16px; height: 16px; display: block; }
.ei-inspector-target-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-lg); line-height: 16px; font-weight: var(--font-medium); letter-spacing: var(--tracking-normal); color: var(--text-secondary); }
.ei-inspector-target:hover .ei-inspector-target-name { color: var(--text-primary); }
.ei-inspector-target:focus { outline: none; }
.ei-inspector-target:focus .ei-inspector-target-name { color: var(--text-primary); }
.ei-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); margin-bottom: var(--space-6); padding: 0; border-radius: var(--field-radius); background: var(--surface-hover); }
.ei-tab { height: var(--input-height); border: 0; border-radius: var(--field-radius); background: transparent; font-size: var(--text-base); font-weight: var(--font-medium); color: var(--text-secondary); cursor: pointer; letter-spacing: var(--tracking-normal); }
.ei-tab[data-active="true"] { background: var(--surface-field); color: var(--text-primary); font-weight: var(--font-semibold); }
.ei-design-mode-tabs { display: inline-flex; width: calc(var(--btn-icon-size-sm) * 2 + var(--space-1)); min-width: calc(var(--btn-icon-size-sm) * 2 + var(--space-1)); height: var(--btn-icon-size-sm); gap: var(--space-1); margin-bottom: 0; padding: 0; border-radius: var(--field-radius); background: var(--surface-hover); flex-shrink: 0; overflow: hidden; }
.ei-design-mode-tab { width: var(--btn-icon-size-sm); min-width: var(--btn-icon-size-sm); height: var(--btn-icon-size-sm); padding: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--text-secondary); flex: 0 0 var(--btn-icon-size-sm); }
.ei-design-mode-tab[data-active="true"] { background: var(--surface-field); color: var(--text-primary); }
.ei-design-mode-tab-icon { width: var(--btn-icon-size-sm); height: var(--btn-icon-size-sm); display: inline-flex; align-items: center; justify-content: center; }
.ei-design-mode-tab[data-icon-kind="design"] .ei-design-mode-tab-icon svg { width: var(--btn-icon-size-sm); height: var(--btn-icon-size-sm); display: block; color: currentColor; }
.ei-design-mode-tab[data-icon-kind="code"] .ei-design-mode-tab-icon svg { width: 14px; height: 12px; display: block; color: currentColor; }
.ei-design-mode-tab-icon [fill*="var(--fill-0, white)"] { fill: currentColor; }
.ei-design-mode-tab-icon [fill-opacity] { fill-opacity: 1; }
.ei-inspector-radio-group { display: inline-flex; align-items: center; gap: var(--space-2); margin-bottom: 0; }
.ei-section { display: none; }
.ei-section[data-active="true"] { display: block; }
.ei-inspector-card .ei-section[data-active="true"] { display: flex; flex-direction: column; gap: var(--space-3); padding: 0 var(--space-4); }
.ei-row { display: grid; grid-template-columns: 92px minmax(0,1fr); gap: var(--space-4); align-items: start; font-size: var(--text-base); line-height: 16px; margin-bottom: 7px; }
.ei-inspector-card .ei-row { margin-bottom: 0; }
.ei-label { color: rgba(255,255,255,0.56); }
.ei-value { min-width: 0; display: flex; align-items: center; gap: var(--space-4); color: var(--text-primary); }
.ei-text { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-typography-code { display: flex; flex-direction: column; gap: var(--space-2); padding: 0; color: var(--text-primary); font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; font-size: var(--text-base); line-height: 16px; font-weight: var(--font-normal); }
.ei-typography-code-line { display: grid; grid-template-columns: max-content minmax(0,1fr); gap: var(--space-4); align-items: center; }
.ei-typography-code-prop { color: var(--interactive-accent); white-space: nowrap; min-width: 0; }
.ei-typography-code-value { min-width: 0; display: flex; align-items: center; gap: var(--space-4); color: color-mix(in srgb, var(--text-primary) 92%, transparent); overflow: hidden; }
.ei-typography-code-text { display: block; min-width: 0; flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-typography-code-swatch { margin-top: 0; }
.ei-swatch { width: var(--space-6); height: var(--space-6); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); flex-shrink: 0; }
.ei-copy-color { flex-shrink: 0; cursor: pointer; color: var(--text-muted); line-height: 0; padding: var(--space-1); border-radius: var(--radius-sm); opacity: 0; pointer-events: none; width: var(--space-8); }
.ei-copy-color:hover { color: var(--text-primary); }
.ei-row:hover .ei-copy-color { opacity: 1; pointer-events: auto; }
.ei-box-diagram { width: 100%; margin: 0 0 var(--space-4); border-radius: var(--radius-md); background: transparent; border: 1px dashed var(--border-hover); padding: 0; overflow: hidden; position: relative; }
.ei-box-body { display: flex; align-items: stretch; }
.ei-box-m { display: flex; align-items: center; justify-content: center; position: relative; }
.ei-box-m-h { height: 20px; flex-direction: column; }
.ei-box-m-v { width: 20px; flex-direction: row; flex-shrink: 0; }
.ei-box-m-line { position: absolute; background: var(--interactive-accent); }
.ei-box-m-h .ei-box-m-line { width: 1px; height: 100%; left: 50%; transform: translateX(-50%); }
.ei-box-m-v .ei-box-m-line { height: 1px; width: 100%; top: 50%; transform: translateY(-50%); }
.ei-box-m-badge { position: relative; z-index: 1; background: var(--interactive-accent); color: var(--overlay-label-text); font-size: var(--text-sm); font-weight: var(--font-normal); line-height: 12px; padding: 0 var(--space-1); border-radius: var(--radius-xs); white-space: nowrap; letter-spacing: var(--tracking-normal); }
.ei-box-container { flex: 1; min-width: 0; display: grid; grid-template-columns: 18px 1fr 18px; grid-template-rows: 18px 1fr 18px; background: var(--surface-field); border-radius: var(--radius-xl); }
.ei-box-corner { display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.ei-box-corner-mark { position: absolute; width: 12px; height: 12px; border-color: var(--text-muted); border-style: solid; border-width: 0; }
.ei-box-corner-tl .ei-box-corner-mark { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; border-top-left-radius: var(--radius-xl); }
.ei-box-corner-tr .ei-box-corner-mark { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; border-top-right-radius: var(--radius-xl); }
.ei-box-corner-bl .ei-box-corner-mark { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; border-bottom-left-radius: var(--radius-xl); }
.ei-box-corner-br .ei-box-corner-mark { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; border-bottom-right-radius: var(--radius-xl); }
.ei-box-corner-val { position: relative; z-index: 1; font-size: var(--text-sm); color: var(--text-primary); line-height: 12px; letter-spacing: var(--tracking-normal); }
.ei-box-b-cell { display: flex; align-items: center; justify-content: center; gap: var(--space-1); }
.ei-box-b-label { font-size: var(--text-sm); color: var(--text-tertiary); letter-spacing: var(--tracking-tight); }
.ei-box-b-val { font-size: var(--text-sm); color: var(--text-tertiary); letter-spacing: var(--tracking-normal); }
.ei-box-pad { display: grid; grid-template-columns: minmax(18px,1fr) 3fr minmax(18px,1fr); grid-template-rows: 18px 1fr 18px; align-items: center; justify-items: center; background: var(--interactive-accent-soft); border-radius: 2px; }
.ei-box-pad-label { grid-column: 1; grid-row: 1; justify-self: start; font-size: 10px; color: var(--text-tertiary); padding-left: 4px; letter-spacing: 0.005px; }
.ei-box-pad-val { font-size: 10px; font-weight: 400; color: var(--text-primary); line-height: 12px; letter-spacing: 0.055px; }
.ei-box-pad-tv { grid-column: 2; grid-row: 1; }
.ei-box-pad-lv { grid-column: 1; grid-row: 2; }
.ei-box-pad-rv { grid-column: 3; grid-row: 2; }
.ei-box-pad-bv { grid-column: 2; grid-row: 3; }
.ei-box-content { grid-column: 2; grid-row: 2; border: 1px dashed var(--text-muted); border-radius: 2px; padding: 2px 6px; font-size: 10px; font-weight: 400; color: var(--text-primary); white-space: nowrap; background: var(--surface-hover); line-height: 12px; letter-spacing: 0.055px; display: flex; align-items: center; justify-content: center; gap: 1px; }
.ei-box-sizing { position: absolute; right: 5px; bottom: 2px; font-size: 10px; color: var(--text-faint); letter-spacing: 0.005px; }
.ei-tooltip { position: fixed; max-width: var(--tooltip-max-width); border-radius: var(--tooltip-radius); background: var(--surface-panel); border: 1px solid var(--border-default); box-shadow: var(--shadow-dropdown); padding: var(--tooltip-padding); pointer-events: none; font-size: var(--text-base); line-height: 16px; color: var(--text-primary); z-index: ${zIndex + 8}; }
.ei-tt-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-8); margin-bottom: var(--space-2); }
.ei-tt-tag { font-weight: var(--font-bold); color: var(--purple); font-size: var(--text-base); line-height: 16px; }
.ei-tt-size { font-size: var(--text-base); line-height: 16px; color: var(--text-primary); white-space: nowrap; }
.ei-tt-row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-1); font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; font-weight: var(--font-normal); }
.ei-tt-label { color: var(--interactive-accent); flex-shrink: 0; font-weight: var(--font-normal); }
.ei-tt-val { color: color-mix(in srgb, var(--text-primary) 92%, transparent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: var(--font-normal); }
.ei-tt-swatch { width: var(--space-5); height: var(--space-5); border-radius: var(--radius-sm); border: 1px solid var(--border-input); flex-shrink: 0; }
.ei-tt-divider { display: flex; align-items: center; gap: var(--space-4); margin: var(--space-3) 0 var(--space-2); font-size: var(--text-xs); font-weight: var(--font-bold); text-transform: uppercase; letter-spacing: var(--tracking-wide); color: var(--text-muted); }
.ei-tt-divider::after { content: ''; flex: 1; height: 1px; background: var(--border-default); }
.ei-tt-no { display: inline-flex; align-items: center; justify-content: center; width: var(--space-8); height: var(--space-8); border-radius: var(--radius-full); background: var(--surface-field); color: var(--text-tertiary); font-size: var(--text-sm); line-height: var(--leading-none); }
.ei-tt-yes { display: inline-flex; align-items: center; justify-content: center; width: var(--space-8); height: var(--space-8); border-radius: var(--radius-full); background: var(--success-bg); color: var(--success); font-size: var(--text-sm); line-height: var(--leading-none); }
.ei-annotate { border-top: 1px solid var(--border-subtle); padding: var(--space-6) var(--space-4); }
.ei-panel:not(.is-changes) .ei-annotate { border-top: 0; padding: 0 var(--space-4) var(--space-4); }
.ei-annotate-input { width: 100%; min-height: var(--annotate-min-height); resize: vertical; background: var(--surface-field); border: 1px solid var(--border-hover); border-radius: var(--annotate-radius); color: var(--text-primary); font-size: var(--text-base); font-family: inherit; padding: var(--annotate-padding); outline: none; overflow: auto; user-select: text; -webkit-user-select: text; }
.ei-annotate-input:hover { border-color: var(--border-hover); }
.ei-annotate-input:focus { border-color: var(--border-hover); }
.ei-annotate-input:focus-visible { border-color: var(--interactive-accent); }
.ei-annotate-input::placeholder { color: var(--text-muted); }
.ei-annotate-input::-webkit-scrollbar { width: 8px; height: 8px; }
.ei-annotate-input::-webkit-scrollbar-track { background: transparent; }
.ei-annotate-input::-webkit-scrollbar-thumb { background: var(--surface-active); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }
.ei-annotate-input::-webkit-scrollbar-thumb:hover { background: var(--surface-hover-strong); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; }
.ei-annotate-actions { display: flex; justify-content: flex-end; gap: var(--space-4); margin-top: var(--space-2); padding-top: 0; }
.ei-button { height: var(--btn-text-height-md); border-radius: var(--button-radius); border: 1px solid var(--border-hover); background: var(--surface-hover); color: var(--text-primary); cursor: pointer; font-size: var(--text-base); line-height: 16px; font-weight: var(--font-medium); padding: 0 var(--button-padding-x); transition: background var(--duration-normal) var(--ease-default), border-color var(--duration-normal) var(--ease-default), opacity var(--duration-normal) var(--ease-default); }
.ei-button:hover { background: var(--surface-hover-strong); }
.ei-button:focus { outline: none; border-color: var(--interactive-accent); }
.ei-button:disabled { opacity: 0.4; cursor: default; }
.ei-button-ghost { background: transparent; border-color: transparent; }
.ei-button-ghost:hover { background: var(--surface-hover); border-color: transparent; }
.ei-button-ghost:focus,
.ei-button-ghost:active,
.ei-button-ghost:focus-visible { border-color: transparent; }
.ei-button-primary { background: var(--interactive-accent); border-color: var(--interactive-accent); color: var(--overlay-label-text); }
.ei-button-primary:hover { background: var(--interactive-accent); opacity: 0.92; }
.ei-annotate-btn { height: var(--btn-text-height-md); border-radius: var(--button-radius); border: 1px solid var(--border-hover); background: var(--surface-hover); color: var(--text-primary); cursor: pointer; font-size: var(--text-base); line-height: 16px; font-weight: var(--font-medium); padding: 0 var(--button-padding-x); transition: background var(--duration-normal) var(--ease-default), border-color var(--duration-normal) var(--ease-default), opacity var(--duration-normal) var(--ease-default); }
.ei-annotate-btn:hover { background: var(--surface-hover-strong); }
.ei-annotate-btn:focus { outline: none; border-color: var(--interactive-accent); }
.ei-annotate-btn:disabled { opacity: 0.4; cursor: default; }
.ei-annotate-btn-primary { background: var(--interactive-accent); border-color: var(--interactive-accent); color: var(--overlay-label-text); }
.ei-annotate-btn-primary:hover { background: var(--interactive-accent); opacity: 0.92; }
.ei-annotate-btn.ei-button { height: var(--btn-text-height-md); }
.ei-annotate-btn-primary.ei-button-primary { background: var(--interactive-accent); }
.ei-annotate-btn-primary.ei-button-primary:hover { background: var(--interactive-accent); opacity: 0.92; }
.ei-marker { position: fixed; pointer-events: auto; width: var(--btn-icon-size-sm); height: var(--btn-icon-size-sm); border-radius: var(--radius-full); background: var(--interactive-accent); color: var(--overlay-label-text); font-size: var(--text-sm); font-weight: var(--font-bold); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--control-handle-shadow); border: none; z-index: 1; }
.ei-ann-summary-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-6); padding: var(--space-4) var(--space-8) calc(var(--space-4) + 1px); border-bottom: 0.5px solid var(--border-subtle); }
.ei-ann-summary-count { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-lg); line-height: 16px; letter-spacing: var(--tracking-normal); color: var(--text-secondary); opacity: 0.78; }
.ei-ann-summary-actions { display: inline-flex; align-items: center; justify-content: flex-end; gap: var(--space-2); flex-shrink: 0; }
.ei-ann-filters { display: none; }
.ei-ann-filter { min-width: var(--btn-icon-size); height: var(--btn-icon-size-sm); border-radius: var(--radius-lg); border: none; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: var(--text-base); font-weight: var(--font-normal); line-height: 16px; letter-spacing: var(--tracking-normal); padding: var(--space-2) var(--space-4); transition: background var(--duration-normal) var(--ease-default), color var(--duration-normal) var(--ease-default); }
.ei-ann-filter.is-active { background: var(--surface-active); color: var(--text-primary); font-weight: var(--font-medium); }
.ei-ann-group { display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: 14px; }
.ei-ann-group:last-of-type { margin-bottom: 0; }
.ei-ann-group-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: 0 2px; }
.ei-ann-group-title { font-size: var(--text-base); font-weight: var(--font-semibold); color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-ann-group-meta { font-size: var(--text-base); color: var(--text-faint); white-space: nowrap; }
.ei-ann-list { padding: 0; display: flex; flex-direction: column; gap: 0; }
.ei-ann-divider { position: relative; height: 17px; margin: 0 var(--space-4); }
.ei-ann-divider::before { content: ''; position: absolute; left: 0; right: 0; top: var(--space-4); border-top: 0.5px solid var(--border-subtle); }
.ei-ann-item { display: flex; align-items: flex-start; gap: var(--space-5); padding: var(--space-4); border-radius: var(--radius-xl); background: transparent; border: 1px solid transparent; opacity: 0.8; cursor: pointer; transition: background var(--duration-normal) var(--ease-default), border-color var(--duration-normal) var(--ease-default), transform var(--duration-normal) var(--ease-default), box-shadow var(--duration-normal) var(--ease-default); }
.ei-ann-item:hover { background: var(--surface-hover); border-color: transparent; }
.ei-ann-item.is-active { background: var(--interactive-accent-soft); border-color: transparent; box-shadow: none; }
.ei-ann-num { display: none; }
.ei-ann-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.ei-ann-top { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-6); min-width: 0; padding-bottom: 0; }
.ei-ann-author { display: inline-flex; align-items: center; gap: var(--space-3); min-width: 0; flex: 1; }
.ei-ann-avatar { display: none; }
.ei-ann-avatar img { width: var(--btn-icon-size-sm); height: var(--btn-icon-size-sm); object-fit: cover; display: block; }
.ei-ann-header-title { display: inline-flex; align-items: center; gap: var(--space-3); min-width: 0; height: var(--input-height); }
.ei-ann-header-accent { width: var(--space-1); height: var(--space-6); border-radius: var(--radius-full); background: var(--interactive-accent); flex-shrink: 0; }
.ei-ann-header-target { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-lg); line-height: 16px; font-weight: var(--font-medium); color: var(--text-primary); letter-spacing: var(--tracking-normal); }
.ei-ann-time { font-size: var(--text-base); font-weight: var(--font-normal); color: var(--text-muted); white-space: nowrap; line-height: 16px; letter-spacing: var(--tracking-tight); }
.ei-ann-actions { display: none; align-items: center; gap: var(--space-2); }
.ei-ann-item:hover .ei-ann-actions { display: inline-flex; }
.ei-ann-item:hover .ei-ann-time { display: none; }
.ei-ann-action { width: var(--btn-icon-size-sm); height: var(--btn-icon-size-sm); border-radius: var(--radius-lg); border: none; background: transparent; color: var(--text-primary); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; transition: background var(--duration-normal) var(--ease-default), opacity var(--duration-normal) var(--ease-default), transform var(--duration-normal) var(--ease-default); }
.ei-ann-action:hover, .ei-ann-filter:hover { background: var(--surface-hover); color: var(--text-primary); }
.ei-ann-action.ei-ann-action-archive .ei-ann-action-icon-stack { width: calc(var(--btn-icon-size-sm) - var(--space-2)); height: calc(var(--btn-icon-size-sm) - var(--space-2)); }
.ei-ann-action.ei-ann-action-archive img, .ei-ann-action.ei-ann-action-archive svg { width: calc(var(--btn-icon-size-sm) - var(--space-2)); height: calc(var(--btn-icon-size-sm) - var(--space-2)); }
.ei-ann-action-icon-stack { position: relative; width: var(--btn-icon-size-sm); height: var(--btn-icon-size-sm); display: inline-flex; align-items: center; justify-content: center; }
.ei-ann-action-icon { position: absolute; inset: 0; display: inline-flex; align-items: center; justify-content: center; opacity: 1; transition: opacity 50ms ease; }
.ei-ann-action-icon.is-next { opacity: 0; }
.ei-ann-action.is-switching .ei-ann-action-icon.is-current { opacity: 0; }
.ei-ann-action.is-switching .ei-ann-action-icon.is-next { opacity: 1; }
.ei-ann-action img, .ei-ann-action svg { width: var(--btn-icon-size-sm); height: var(--btn-icon-size-sm); display: block; }
.ei-ann-action.is-danger img, .ei-ann-action.is-danger svg { width: calc(var(--space-6) + 1px); height: calc(var(--space-6) + 1px); }
.ei-ann-action.is-success .ei-ann-action-icon img, .ei-ann-action.is-success .ei-ann-action-icon svg { filter: saturate(1.05); }
.ei-ann-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 0; min-width: 0; font-size: var(--text-base); line-height: 16px; letter-spacing: var(--tracking-normal); color: var(--text-secondary); }
.ei-ann-dot { color: var(--text-faint); margin: 0 var(--space-2); }
.ei-ann-title, .ei-ann-type, .ei-ann-source-badge { white-space: nowrap; }
.ei-ann-selector-inline { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.ei-ann-summary { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
.ei-ann-diff { font-size: var(--text-base); font-weight: var(--font-normal); color: var(--text-secondary); line-height: 16px; letter-spacing: var(--tracking-tight); padding-left: var(--space-4); border-left: var(--space-1) solid var(--interactive-accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: inherit; }
.ei-ann-note { min-width: 0; font-size: var(--text-base); font-weight: var(--font-normal); color: var(--text-secondary); line-height: 16px; letter-spacing: var(--tracking-tight); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-ann-extra { display: flex; flex-direction: column; gap: var(--space-4); padding-top: var(--space-2); }
.ei-ann-meta-lines { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
.ei-ann-note-block { display: flex; align-items: center; gap: var(--space-3); min-width: 0; padding-top: var(--space-2); }
.ei-ann-note-block.is-muted .ei-ann-note-label, .ei-ann-note-block.is-muted .ei-ann-note { text-decoration: line-through; color: var(--text-secondary); }
.ei-ann-note-content { min-width: 0; flex: 1; display: flex; align-items: baseline; gap: var(--space-2); overflow: hidden; }
.ei-ann-note-label { flex-shrink: 0; font-size: var(--text-base); line-height: 16px; font-weight: var(--font-normal); letter-spacing: var(--tracking-tight); color: var(--text-secondary); }
.ei-ann-note-label, .ei-ann-note { min-width: 0; }
.ei-ann-route, .ei-ann-selector { font-size: var(--text-base); color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-ann-compare { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
.ei-ann-compare-col { background: var(--surface-hover); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: var(--space-4); min-width: 0; }
.ei-ann-compare-label { font-size: var(--text-base); font-weight: var(--font-bold); text-transform: uppercase; letter-spacing: var(--tracking-wide); color: var(--text-faint); margin-bottom: var(--space-3); }
.ei-ann-compare-row { font-size: var(--text-base); color: var(--text-secondary); line-height: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-ann-export { display: flex; align-items: center; justify-content: space-between; gap: var(--space-6); padding: var(--space-8); }
.ei-ann-export-primary { flex: 1; min-width: 0; display: inline-flex; align-items: stretch; }
.ei-ann-export-btn { height: var(--btn-text-height-md); min-height: var(--btn-text-height-md); border: none; background: transparent; color: var(--overlay-label-text); cursor: pointer; font-size: var(--text-lg); font-weight: var(--font-medium); line-height: 18px; transition: opacity var(--duration-normal) var(--ease-default), background var(--duration-normal) var(--ease-default); }
.ei-ann-export-btn:hover { background: var(--surface-hover); }
.ei-ann-export-btn-primary { flex: 1; min-width: 0; background: var(--interactive-accent); border-radius: var(--radius-xl) 0 0 var(--radius-xl); padding: calc(var(--space-3) + 1px) var(--space-8); font-size: var(--text-base); }
.ei-ann-export-btn-primary:hover { background: var(--interactive-accent); opacity: 0.92; }
.ei-ann-export-btn-dropdown { background: var(--interactive-accent); border-left: 1px solid var(--border-input); border-radius: 0 var(--radius-xl) var(--radius-xl) 0; padding: calc(var(--space-2) + 1px) var(--space-3); min-width: calc(var(--btn-icon-size-sm) + var(--space-1)); display: inline-flex; align-items: center; justify-content: center; }
.ei-ann-export-btn-dropdown img, .ei-ann-export-btn-dropdown svg { width: calc(var(--space-6) + 1px); height: calc(var(--space-6) + 1px); display: block; }
.ei-ann-export-btn-dropdown:hover { background: var(--interactive-accent); opacity: 0.92; }
.ei-ann-export-btn-dropdown.is-success { opacity: 0.72; }
.ei-ann-export input[type="file"] { display: none; }
.ei-output-detail-menu { position: fixed; min-width: calc(var(--panel-width) / 2); border-radius: var(--radius-3xl); background: var(--surface-panel); border: 1px solid var(--border-default); box-shadow: var(--panel-shadow); padding: var(--space-3); z-index: ${zIndex + 6}; pointer-events: auto; display: none; }
.ei-output-detail-item { width: 100%; border: 0; background: transparent; color: var(--text-secondary); border-radius: var(--radius-xl); cursor: pointer; display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-1); padding: var(--space-4) var(--space-5); text-align: left; }
.ei-output-detail-item:hover { background: var(--surface-hover); color: var(--text-primary); }
.ei-output-detail-item.is-active { background: var(--interactive-accent-soft); color: var(--text-primary); }
.ei-output-detail-name { font-size: var(--text-lg); line-height: 16px; font-weight: var(--font-semibold); }
.ei-output-detail-desc { font-size: var(--text-sm); line-height: 14px; color: var(--text-tertiary); }
.ei-ann-export-btn-ghost { width: var(--btn-icon-size); height: var(--btn-icon-size); padding: var(--space-2); opacity: 0.5; border-radius: var(--radius-xl); display: inline-flex; align-items: center; justify-content: center; }
.ei-ann-export-btn-ghost:hover { background: var(--surface-hover); opacity: 1; }
.ei-ann-empty { font-size: var(--text-lg); color: var(--text-faint); text-align: center; padding: var(--btn-icon-size-sm) var(--space-8); }
.ei-ann-type { color: var(--text-secondary); }
.ei-ann-source-badge { color: var(--text-secondary); }
.ei-ann-info-list { display: flex; flex-direction: column; gap: var(--space-2); padding-top: 0; }
.ei-ann-info-row { display: flex; align-items: center; gap: var(--space-3); min-width: 0; max-width: 100%; overflow: hidden; }
.ei-ann-info-row.is-muted .ei-ann-info-property, .ei-ann-info-row.is-muted .ei-ann-info-value { text-decoration: line-through; color: var(--text-secondary); }
.ei-ann-info-content { display: flex; align-items: center; gap: var(--space-3); min-width: 0; max-width: 100%; flex: 1; overflow: hidden; white-space: nowrap; font-size: var(--text-base); line-height: 16px; font-weight: var(--font-normal); letter-spacing: var(--tracking-tight); }
.ei-ann-info-property { color: var(--text-secondary); white-space: nowrap; flex-shrink: 0; }
.ei-ann-info-value-wrap { display: inline-flex; align-items: center; gap: var(--space-2); min-width: 0; flex: 1; overflow: hidden; white-space: nowrap; }
.ei-ann-info-value { color: var(--interactive-accent); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-ann-info-swatch { width: calc(var(--space-6) + 2px); height: calc(var(--space-6) + 2px); border-radius: var(--radius-xs); border: 1px solid var(--surface-panel); box-shadow: inset 0 0 0 1px var(--border-input); flex-shrink: 0; }
.ei-checkbox { position: relative; width: calc(var(--space-6) + 2px); height: calc(var(--space-6) + 2px); flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; }
.ei-checkbox input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: pointer; }
.ei-checkbox-mark { width: calc(var(--space-6) + 2px); height: calc(var(--space-6) + 2px); border-radius: var(--radius-xs); background: color-mix(in srgb, var(--text-primary) 5%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 10%, transparent); pointer-events: none; }
.ei-checkbox input:hover + .ei-checkbox-mark { box-shadow: inset 0 0 0 1px var(--border-default); }
.ei-checkbox input:focus-visible + .ei-checkbox-mark { box-shadow: inset 0 0 0 1px var(--interactive-accent), 0 0 0 2px color-mix(in srgb, var(--interactive-focus-ring) 30%, transparent); }
.ei-checkbox input:checked + .ei-checkbox-mark { background: var(--interactive-accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--interactive-accent) 85%, white); }
.ei-checkbox input:checked + .ei-checkbox-mark::after { content: ''; position: absolute; width: 7px; height: 4px; border-left: 1.5px solid var(--overlay-label-text); border-bottom: 1.5px solid var(--overlay-label-text); transform: translate(3px, 3px) rotate(-45deg); }
.ei-ann-more { font-size: var(--text-base); color: var(--text-faint); }
.ei-ann-previewing { font-size: var(--text-base); color: var(--text-muted); }
.ei-ann-action.is-active { background: var(--surface-hover); color: var(--text-primary); }
.ei-ann-action.is-danger:hover { background: var(--surface-hover); color: var(--text-primary); }
.ei-ann-action.is-success { color: var(--success); }
.ei-ann-action.is-success:hover { color: var(--success); }
.ei-change-flash-target { animation: ei-change-flash 1.2s var(--ease-out) 1; }
@keyframes ei-change-flash { 0% { outline: 2px solid color-mix(in srgb, var(--purple) 95%, transparent); outline-offset: var(--space-1); } 100% { outline: 2px solid color-mix(in srgb, var(--purple) 0%, transparent); outline-offset: var(--space-4); } }
[data-ei-outlines="true"] * { outline: 1px solid color-mix(in srgb, var(--overlay-ruler) 60%, transparent); outline-offset: -1px; }
[data-ei-outlines="true"] *:hover { outline-color: color-mix(in srgb, var(--overlay-ruler) 90%, transparent); }
[data-ei-outlines="true"] .ei-hover-highlight { outline: 2px solid var(--interactive-accent); outline-offset: -1px; }
${getDesignStyles()}
`
}

export function createRuntimeStyles(theme: ThemeBuildResult): string {
  return generateCSSVariables(theme) + createInspectorStyles(theme.config.zIndex)
}
