import { getDesignStyles } from './design'
import { generateCSSVariables } from './design-tokens'
import type { ThemeBuildResult } from './types'

export function createInspectorStyles(zIndex: number): string {
  return `
.ei-root, .ei-root * { box-sizing: border-box; }
.ei-root { position: fixed; inset: 0; pointer-events: none; z-index: ${zIndex}; font-family: var(--font-family); }
.ei-highlight { position: fixed; pointer-events: none; }
.ei-hl-margin { position: relative; width: 100%; height: 100%; background: var(--overlay-margin-bg); }
.ei-hl-padding { position: absolute; background: var(--overlay-padding); }
.ei-hl-content { position: absolute; background: var(--overlay-content); }
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
.ei-move-handle { position: absolute; pointer-events: auto; width: 32px; height: 10px; margin: -5px 0 0 -16px; border: 2px solid var(--overlay-move); border-radius: 999px; background: var(--text-inverse); cursor: grab; transition: background-color 120ms ease, box-shadow 120ms ease, transform 120ms ease, opacity 120ms ease; }
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
.ei-ref-line-h { left: 24px; right: 0; height: 1px; background: var(--overlay-move); cursor: ns-resize; }
.ei-ref-line-v { top: 24px; bottom: 0; width: 1px; background: var(--overlay-move); cursor: ew-resize; }
.ei-ref-line:hover { background: var(--interactive-accent-strong); }
.ei-ref-line-label { position: absolute; background: var(--overlay-move); color: var(--overlay-label-text); font-size: var(--text-xs); font-weight: var(--font-semibold); padding: 2px 4px; border-radius: 2px; white-space: nowrap; pointer-events: none; }
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
.ei-guide-anchor-handle { position: absolute; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 0; border: 1px solid var(--overlay-guide); background: var(--text-inverse); }
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
.ei-toolbar-btn { width: var(--btn-icon-size); height: var(--btn-icon-size); border-radius: var(--radius-full); border: 0; background: transparent; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0; transition: background var(--duration-slow) var(--ease-default); position: relative; }
.ei-toolbar-btn:hover { background: var(--surface-hover-strong); }
.ei-toolbar-btn:hover .ei-toolbar-tip { opacity: 1; }
.ei-toolbar-btn[data-active="true"] { background: var(--interactive-accent); color: var(--overlay-label-text); }
.ei-toolbar-btn[data-active="true"]:hover { background: var(--interactive-accent); }
.ei-toolbar-btn[data-disabled="true"] { opacity: 0.35; pointer-events: none; }
.ei-toolbar-btn svg { flex-shrink: 0; }
.ei-toolbar-divider { display: flex; align-items: center; padding: 0 2px; }
.ei-toolbar-divider-line { width: 1px; height: 16px; background: var(--surface-hover-strong); }
.ei-toolbar-tip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px; padding: 4px 8px; border-radius: var(--radius-lg); background: var(--overlay-ruler); color: var(--text-primary); font-size: var(--text-base); font-weight: var(--font-medium); white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity var(--duration-slow) var(--ease-default); font-family: var(--font-family); }
.ei-toolbar-btn-group { display: flex; align-items: center; gap: 0; }
.ei-toolbar-btn-group .ei-toolbar-btn { border-radius: 0; }
.ei-toolbar-btn-group .ei-toolbar-btn:first-child { border-radius: var(--radius-full) 0 0 9999px; }
.ei-toolbar-btn-group .ei-toolbar-btn:last-child { border-radius: 0 9999px 9999px 0; }
.ei-toolbar-dropdown-btn { width: 20px !important; display: flex !important; align-items: center !important; justify-content: center !important; }
.ei-capture-menu { position: fixed; min-width: 220px; border-radius: var(--radius-3xl); background: var(--surface-panel); border: 1px solid var(--border-default); box-shadow: var(--shadow-dropdown); padding: var(--space-3); z-index: ${zIndex + 5}; pointer-events: auto; font-family: var(--font-family); }
.ei-capture-menu-item { display: flex; align-items: center; gap: 10px; width: 100%; height: 24px; padding: 0 8px; border-radius: var(--radius-xl); border: 0; background: transparent; color: var(--text-primary); cursor: pointer; text-align: left; transition: background var(--duration-slow) var(--ease-default); }
.ei-capture-menu-item:hover { background: var(--surface-hover-strong); }
.ei-capture-menu-icon { flex-shrink: 0; width: 16px; height: 16px; color: var(--text-secondary); }
.ei-capture-menu-label { font-size: var(--text-base); font-weight: 400; color: var(--text-primary); font-family: var(--font-family); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
.ei-panel { position: fixed; top: 16px; left: 16px; width: var(--panel-width); border-radius: var(--panel-radius); overflow: hidden; background: var(--surface-panel); border: 1px solid var(--border-default); box-shadow: var(--panel-shadow); pointer-events: auto; color: var(--text-primary); user-select: text; z-index: 4; }
.ei-panel.is-changes { min-height: 520px; display: flex; flex-direction: column; }
.ei-panel-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 16px 16px; border-bottom: 1px solid var(--border-subtle); }
.ei-panel.is-changes .ei-panel-header { padding: 16px 16px 16px; border-bottom: 1px solid var(--border-subtle); }
.ei-drag-handle { position: absolute; top: 4px; left: 50%; transform: translateX(-50%); width: 40px; height: 12px; border: 0; background: transparent; cursor: grab; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
.ei-drag-handle:active { cursor: grabbing; }
.ei-drag-bar { display: block; width: 24px; height: 3px; border-radius: 999px; background: var(--text-faint); transition: background-color var(--duration-slower) var(--ease-default); pointer-events: none; }
.ei-drag-handle:hover .ei-drag-bar { background: var(--text-tertiary); }
.ei-panel-title { font-size: 13px; line-height: normal; font-weight: 700; color: var(--text-primary); }
.ei-panel.is-changes .ei-panel-title { font-size: 13px; line-height: normal; font-weight: 700; color: var(--text-primary); }
.ei-panel-subtitle { font-size: var(--text-base); color: var(--text-muted); margin-top: 2px; }
.ei-actions { display: flex; gap: var(--space-4); }
.ei-panel.is-changes .ei-actions { gap: 0; }
.ei-icon-btn { min-width: 32px; height: 32px; border-radius: var(--radius-xl); border: 1px solid var(--border-hover); background: var(--surface-hover); color: var(--text-primary); cursor: pointer; font-size: var(--text-lg); }
.ei-changes-close { width: 24px; height: 24px; border: none; border-radius: 5px; background: transparent; display: inline-flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; }
.ei-changes-close img { width: 24px; height: 24px; display: block; }
.ei-changes-close:hover { background: var(--surface-hover); }
.ei-body { padding: 4px 16px 16px; max-height: 70vh; overflow-y: auto; overflow-y: overlay; scrollbar-width: none; -ms-overflow-style: none; }
.ei-panel.is-changes .ei-body { flex: 1; min-height: 0; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.ei-body::-webkit-scrollbar { width: 0; height: 0; display: none; }
.ei-body::-webkit-scrollbar-track { background: transparent; }
.ei-body::-webkit-scrollbar-thumb { background: transparent; border-radius: 0; }
.ei-body::-webkit-scrollbar-thumb:hover { background: transparent; }
.ei-empty { font-size: var(--text-lg); color: var(--text-secondary); line-height: 1.5; }
.ei-badges { display: flex; align-items: center; gap: var(--space-4); margin-bottom: 10px; }
.ei-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 8px; font-size: var(--text-sm); font-weight: var(--font-bold); background: var(--surface-field); color: var(--text-primary); }
.ei-badge-lock { background: color-mix(in srgb, var(--interactive-accent) 22%, var(--surface-panel)); color: var(--interactive-accent); }
.ei-breadcrumbs { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-bottom: 10px; }
.ei-crumb { display: inline-flex; align-items: center; max-width: 100%; border-radius: 999px; padding: 4px 8px; font-size: var(--text-sm); font-weight: var(--font-semibold); background: var(--surface-field); color: var(--text-primary); border: 0; cursor: pointer; }
.ei-crumb[data-active="true"] { background: color-mix(in srgb, var(--interactive-accent) 22%, var(--surface-panel)); color: var(--interactive-accent); }
.ei-text-head { font-size: var(--text-lg); font-weight: var(--font-semibold); line-height: 1.45; margin-bottom: 6px; }
.ei-path { font-size: var(--text-base); color: var(--text-tertiary); line-height: 1.4; margin-bottom: 12px; word-break: break-word; }
.ei-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); margin-bottom: 12px; padding: 4px; border-radius: var(--radius-3xl); background: var(--surface-hover); }
.ei-tab { height: 30px; border: 0; border-radius: 9px; background: transparent; font-size: var(--text-base); font-weight: var(--font-semibold); color: var(--text-secondary); cursor: pointer; }
.ei-tab[data-active="true"] { background: var(--surface-active); color: var(--text-primary); }
.ei-section { display: none; }
.ei-section[data-active="true"] { display: block; }
.ei-row { display: grid; grid-template-columns: 88px minmax(0,1fr); gap: var(--space-4); align-items: start; font-size: var(--text-base); line-height: 1.4; margin-bottom: 7px; }
.ei-label { color: var(--text-tertiary); }
.ei-value { min-width: 0; display: flex; align-items: center; gap: var(--space-4); color: var(--text-primary); }
.ei-text { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-swatch { width: 12px; height: 12px; border-radius: 4px; border: 1px solid var(--border-hover); flex-shrink: 0; }
.ei-copy-color { flex-shrink: 0; cursor: pointer; color: var(--text-muted); line-height: 0; padding: 2px; border-radius: 3px; opacity: 0; pointer-events: none; width: 16px; }
.ei-copy-color:hover { color: var(--text-primary); }
.ei-row:hover .ei-copy-color { opacity: 1; pointer-events: auto; }
.ei-box-diagram { width: 100%; margin: 0 0 8px; border-radius: 5px; background: var(--surface-field); padding: 0; overflow: hidden; position: relative; }
.ei-box-body { display: flex; align-items: stretch; }
.ei-box-m { display: flex; align-items: center; justify-content: center; position: relative; }
.ei-box-m-h { height: 32px; flex-direction: column; }
.ei-box-m-v { width: 32px; flex-direction: row; flex-shrink: 0; }
.ei-box-m-line { position: absolute; background: var(--interactive-accent); }
.ei-box-m-h .ei-box-m-line { width: 1px; height: 100%; left: 50%; transform: translateX(-50%); }
.ei-box-m-v .ei-box-m-line { height: 1px; width: 100%; top: 50%; transform: translateY(-50%); }
.ei-box-m-badge { position: relative; z-index: 1; background: var(--interactive-accent); color: var(--overlay-label-text); font-size: var(--text-base); font-weight: 400; line-height: 16px; padding: 0 3px; border-radius: 2px; white-space: nowrap; letter-spacing: 0.055px; }
.ei-box-container { flex: 1; min-width: 0; display: grid; grid-template-columns: 24px 1fr 24px; grid-template-rows: 24px 1fr 24px; background: var(--surface-field); border-radius: var(--radius-3xl); }
.ei-box-corner { display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.ei-box-corner-mark { position: absolute; width: 17px; height: 17px; border-color: var(--text-muted); border-style: solid; border-width: 0; }
.ei-box-corner-tl .ei-box-corner-mark { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; border-top-left-radius: 12px; }
.ei-box-corner-tr .ei-box-corner-mark { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; border-top-right-radius: 12px; }
.ei-box-corner-bl .ei-box-corner-mark { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; border-bottom-left-radius: 12px; }
.ei-box-corner-br .ei-box-corner-mark { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; border-bottom-right-radius: 12px; }
.ei-box-corner-val { position: relative; z-index: 1; font-size: var(--text-base); color: var(--text-primary); line-height: 16px; letter-spacing: 0.055px; }
.ei-box-b-cell { display: flex; align-items: center; justify-content: center; gap: var(--space-3); }
.ei-box-b-label { font-size: var(--text-base); color: var(--text-tertiary); letter-spacing: 0.005px; }
.ei-box-b-val { font-size: var(--text-base); color: var(--text-tertiary); letter-spacing: 0.055px; }
.ei-box-pad { display: grid; grid-template-columns: minmax(24px,1fr) 3fr minmax(24px,1fr); grid-template-rows: 24px 1fr 24px; align-items: center; justify-items: center; background: var(--interactive-accent-soft); border-radius: 2px; }
.ei-box-pad-label { grid-column: 1; grid-row: 1; justify-self: start; font-size: var(--text-base); color: var(--text-tertiary); padding-left: 8px; letter-spacing: 0.005px; }
.ei-box-pad-val { font-size: var(--text-base); font-weight: 400; color: var(--text-primary); line-height: 16px; letter-spacing: 0.055px; }
.ei-box-pad-tv { grid-column: 2; grid-row: 1; }
.ei-box-pad-lv { grid-column: 1; grid-row: 2; }
.ei-box-pad-rv { grid-column: 3; grid-row: 2; }
.ei-box-pad-bv { grid-column: 2; grid-row: 3; }
.ei-box-content { grid-column: 2; grid-row: 2; border: 1px dashed var(--text-muted); border-radius: 2px; padding: 3px 10px; font-size: var(--text-base); font-weight: 400; color: var(--text-primary); white-space: nowrap; background: var(--surface-hover); line-height: 16px; letter-spacing: 0.055px; display: flex; align-items: center; justify-content: center; gap: 1px; }
.ei-box-sizing { position: absolute; right: 6px; bottom: 4px; font-size: var(--text-sm); color: var(--text-faint); letter-spacing: 0.005px; }
.ei-tooltip { position: fixed; max-width: 320px; border-radius: 8px; background: var(--surface-panel); border: 1px solid var(--border-default); box-shadow: var(--shadow-dropdown); padding: 6px 10px; pointer-events: none; font-size: var(--text-base); line-height: 1.35; color: var(--text-primary); z-index: ${zIndex + 8}; }
.ei-tt-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-bottom: 4px; }
.ei-tt-tag { font-weight: var(--font-bold); color: var(--purple); font-size: var(--text-lg); }
.ei-tt-size { font-size: var(--text-base); color: var(--text-muted); white-space: nowrap; }
.ei-tt-row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: 2px; }
.ei-tt-label { color: var(--text-tertiary); flex-shrink: 0; }
.ei-tt-val { color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-tt-swatch { width: 10px; height: 10px; border-radius: 3px; border: 1px solid var(--border-input); flex-shrink: 0; }
.ei-tt-divider { display: flex; align-items: center; gap: var(--space-4); margin: 6px 0 4px; font-size: var(--text-xs); font-weight: var(--font-bold); text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
.ei-tt-divider::after { content: ''; flex: 1; height: 1px; background: var(--border-default); }
.ei-tt-no { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: var(--surface-field); color: var(--text-tertiary); font-size: var(--text-sm); line-height: 1; }
.ei-tt-yes { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: var(--success-bg); color: var(--success); font-size: var(--text-sm); line-height: 1; }
.ei-annotate { border-top: 1px solid var(--border-subtle); padding: 12px 16px; }
.ei-annotate-input { width: 100%; min-height: 56px; max-height: 120px; resize: vertical; background: var(--surface-field); border: 1px solid transparent; border-radius: var(--radius-xl); color: var(--text-primary); font-size: var(--text-lg); font-family: inherit; padding: 8px 10px; outline: none; }
.ei-annotate-input:hover { border-color: var(--border-hover); }
.ei-annotate-input:focus { border-color: var(--interactive-accent); }
.ei-annotate-input::placeholder { color: var(--text-faint); }
.ei-annotate-actions { display: flex; justify-content: flex-end; gap: var(--space-4); margin-top: 8px; }
.ei-annotate-btn { height: 28px; border-radius: var(--radius-xl); border: 1px solid var(--border-hover); background: var(--surface-hover); color: var(--text-primary); cursor: pointer; font-size: var(--text-base); font-weight: var(--font-semibold); padding: 0 12px; }
.ei-annotate-btn-primary { background: var(--interactive-accent); border-color: var(--interactive-accent); color: var(--overlay-label-text); }
.ei-marker { position: fixed; pointer-events: auto; width: 24px; height: 24px; border-radius: 50%; background: var(--interactive-accent); color: var(--overlay-label-text); font-size: var(--text-sm); font-weight: var(--font-bold); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--control-handle-shadow); border: none; z-index: 1; }
.ei-ann-filters { display: flex; flex-wrap: wrap; gap: 4px; padding: 0; min-height: 24px; }
.ei-ann-filter { min-width: 32px; height: 24px; border-radius: 5px; border: none; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 11px; font-weight: 400; line-height: 16px; letter-spacing: 0.055px; padding: 4px 8px; transition: background 120ms ease, color 120ms ease; }
.ei-ann-filter.is-active { background: var(--surface-active); color: var(--text-primary); font-weight: 500; }
.ei-ann-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.ei-ann-group:last-of-type { margin-bottom: 0; }
.ei-ann-group-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); padding: 0 2px; }
.ei-ann-group-title { font-size: 11px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-ann-group-meta { font-size: 11px; color: var(--text-faint); white-space: nowrap; }
.ei-ann-list { padding: 0; display: flex; flex-direction: column; gap: 8px; }
.ei-ann-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px; border-radius: 8px; background: transparent; border: 1px solid transparent; opacity: 0.8; cursor: pointer; transition: background 120ms ease, border-color 120ms ease, transform 120ms ease, box-shadow 120ms ease; }
.ei-ann-item:hover { background: var(--surface-hover); border-color: transparent; }
.ei-ann-item.is-active { background: var(--interactive-accent-soft); border-color: transparent; box-shadow: none; }
.ei-ann-num { display: none; }
.ei-ann-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.ei-ann-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; min-width: 0; padding-bottom: 8px; }
.ei-ann-author { display: inline-flex; align-items: center; gap: 0; min-width: 0; flex: 1; }
.ei-ann-avatar { width: 24px; height: 24px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; overflow: hidden; background: var(--surface-hover); flex-shrink: 0; }
.ei-ann-avatar img { width: 24px; height: 24px; object-fit: cover; display: block; }
.ei-ann-time { font-size: 11px; color: var(--text-secondary); white-space: nowrap; line-height: 16px; letter-spacing: 0.005px; }
.ei-ann-actions { display: none; align-items: center; gap: 4px; }
.ei-ann-item:hover .ei-ann-actions { display: inline-flex; }
.ei-ann-item:hover .ei-ann-time { display: none; }
.ei-ann-action { width: 24px; height: 24px; border-radius: 5px; border: none; background: transparent; color: var(--text-primary); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; transition: background 120ms ease, opacity 120ms ease, transform 120ms ease; }
.ei-ann-action:hover, .ei-ann-filter:hover { background: var(--surface-hover); color: var(--text-primary); }
.ei-ann-action-icon-stack { position: relative; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; }
.ei-ann-action-icon { position: absolute; inset: 0; display: inline-flex; align-items: center; justify-content: center; opacity: 1; transition: opacity 50ms ease; }
.ei-ann-action-icon.is-next { opacity: 0; }
.ei-ann-action.is-switching .ei-ann-action-icon.is-current { opacity: 0; }
.ei-ann-action.is-switching .ei-ann-action-icon.is-next { opacity: 1; }
.ei-ann-action img, .ei-ann-action svg { width: 24px; height: 24px; display: block; }
.ei-ann-action.is-danger svg { width: 13px; height: 13px; }
.ei-ann-action.is-success .ei-ann-action-icon img, .ei-ann-action.is-success .ei-ann-action-icon svg { filter: saturate(1.05); }
.ei-ann-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 0; min-width: 0; font-size: 11px; line-height: 16px; letter-spacing: 0.055px; color: var(--text-secondary); }
.ei-ann-dot { color: var(--text-faint); margin: 0 4px; }
.ei-ann-title, .ei-ann-type, .ei-ann-source-badge { white-space: nowrap; }
.ei-ann-selector-inline { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.ei-ann-summary { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ei-ann-diff { font-size: 11px; color: var(--text-secondary); line-height: 16px; letter-spacing: 0.005px; padding-left: 8px; border-left: 2px solid var(--interactive-accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: inherit; }
.ei-ann-note { font-size: 11px; color: var(--text-primary); line-height: 16px; letter-spacing: 0.005px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ei-ann-extra { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
.ei-ann-meta-lines { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ei-ann-route, .ei-ann-selector { font-size: 11px; color: var(--text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-ann-compare { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
.ei-ann-compare-col { background: var(--surface-hover); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 8px; min-width: 0; }
.ei-ann-compare-label { font-size: 11px; font-weight: var(--font-bold); text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-faint); margin-bottom: 6px; }
.ei-ann-compare-row { font-size: 11px; color: var(--text-secondary); line-height: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ei-ann-export { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; }
.ei-ann-export-primary { display: inline-flex; align-items: stretch; }
.ei-ann-export-btn { min-height: 32px; border: none; background: transparent; color: var(--overlay-label-text); cursor: pointer; font-size: 12px; font-weight: 500; line-height: 18px; transition: opacity 120ms ease, background 120ms ease; }
.ei-ann-export-btn:hover { background: var(--surface-hover); }
.ei-ann-export-btn-primary { background: var(--interactive-accent); border-radius: 8px 0 0 8px; padding: 7px 16px; }
.ei-ann-export-btn-primary:hover { background: var(--interactive-accent); opacity: 0.92; }
.ei-ann-export-btn-dropdown { background: var(--interactive-accent); border-left: 1px solid var(--border-input); border-radius: 0 8px 8px 0; padding: 5px 6px; min-width: 26px; display: inline-flex; align-items: center; justify-content: center; }
.ei-ann-export-btn-dropdown img, .ei-ann-export-btn-dropdown svg { width: 14px; height: 14px; display: block; }
.ei-ann-export-btn-dropdown:hover { background: var(--interactive-accent); opacity: 0.92; }
.ei-ann-export-btn-dropdown.is-success { opacity: 0.72; }
.ei-output-detail-menu { position: fixed; min-width: 164px; border-radius: 12px; background: var(--surface-panel); border: 1px solid var(--border-default); box-shadow: var(--panel-shadow); padding: 6px; z-index: ${zIndex + 6}; pointer-events: auto; display: none; }
.ei-output-detail-item { width: 100%; border: 0; background: transparent; color: var(--text-secondary); border-radius: 8px; cursor: pointer; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px 10px; text-align: left; }
.ei-output-detail-item:hover { background: var(--surface-hover); color: var(--text-primary); }
.ei-output-detail-item.is-active { background: var(--interactive-accent-soft); color: var(--text-primary); }
.ei-output-detail-name { font-size: 12px; line-height: 16px; font-weight: 600; }
.ei-output-detail-desc { font-size: 10px; line-height: 14px; color: var(--text-tertiary); }
.ei-ann-export-btn-ghost { width: 32px; height: 32px; padding: 4px; opacity: 0.5; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
.ei-ann-export-btn-ghost:hover { background: var(--surface-hover); opacity: 1; }
.ei-ann-empty { font-size: var(--text-lg); color: var(--text-faint); text-align: center; padding: 24px 16px; }
.ei-ann-type { color: var(--text-secondary); }
.ei-ann-source-badge { color: var(--text-secondary); }
.ei-ann-more { font-size: 11px; color: var(--text-faint); }
.ei-ann-previewing { font-size: 11px; color: var(--text-muted); }
.ei-ann-action.is-active { background: var(--surface-hover); color: var(--text-primary); }
.ei-ann-action.is-danger:hover { background: var(--surface-hover); color: var(--text-primary); }
.ei-ann-action.is-success { color: var(--success); }
.ei-ann-action.is-success:hover { color: var(--success); }
.ei-change-flash-target { animation: ei-change-flash 1.2s ease-out 1; }
@keyframes ei-change-flash { 0% { outline: 2px solid color-mix(in srgb, var(--purple) 95%, transparent); outline-offset: 3px; } 100% { outline: 2px solid color-mix(in srgb, var(--purple) 0%, transparent); outline-offset: 8px; } }
[data-ei-outlines="true"] * { outline: 1px solid color-mix(in srgb, var(--overlay-ruler) 60%, transparent); outline-offset: -1px; }
[data-ei-outlines="true"] *:hover { outline-color: color-mix(in srgb, var(--overlay-ruler) 90%, transparent); }
[data-ei-outlines="true"] .ei-hover-highlight { outline: 2px solid var(--interactive-accent); outline-offset: -1px; }
${getDesignStyles()}
`
}

export function createRuntimeStyles(theme: ThemeBuildResult): string {
  return generateCSSVariables(theme) + createInspectorStyles(theme.config.zIndex)
}
