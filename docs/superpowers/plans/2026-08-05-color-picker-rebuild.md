# Color Picker Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Elens shared color-picker core so solid colors and gradient stops update live across the color plane, hue, alpha, formats, eyedropper, and page-color library.

**Architecture:** Add a small pure HSVA state module and keep `FillDraft` as the Inspector business model. The UI adapter in `src/design.ts` will update stable DOM nodes in place during continuous interaction and only rebuild structure for tab, mode, format, or active-stop changes.

**Tech Stack:** TypeScript, DOM Pointer Events, Bun tests, Vite, existing Elens design tokens and StyleTracker.

---

### Task 1: Pure HSVA core

**Files:**
- Create: `src/color-picker-core.ts`
- Create: `tests/color-picker-core.test.ts`

- [ ] **Step 1: Write failing conversion and coordinate tests**

Cover normalized HSVA values, HEX round trips, alpha percentages, pure-hue CSS, plane coordinates, horizontal slider coordinates, and keyboard deltas.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `bun test tests/color-picker-core.test.ts`

Expected: FAIL because `src/color-picker-core.ts` does not exist.

- [ ] **Step 3: Implement the pure core**

Export:

```ts
export type HsvaColor = { h: number; s: number; v: number; a: number }
export function normalizeHsva(value: HsvaColor): HsvaColor
export function hexToHsva(hex: string, opacity?: number): HsvaColor
export function hsvaToHex(value: HsvaColor): string
export function hsvaToOpacity(value: HsvaColor): number
export function hsvaHueColor(value: HsvaColor): string
export function hsvaFromPlane(value: HsvaColor, x: number, y: number, width: number, height: number): HsvaColor
export function hsvaFromHorizontalSlider(value: HsvaColor, channel: 'h' | 'a', x: number, width: number): HsvaColor
export function moveHsvaByKey(value: HsvaColor, channel: 'plane' | 'hue' | 'alpha', key: string, shiftKey?: boolean): HsvaColor
```

- [ ] **Step 4: Run focused tests**

Run: `bun test tests/color-picker-core.test.ts`

Expected: all tests PASS.

### Task 2: Stable color control DOM

**Files:**
- Modify: `src/design.ts` around `createFillPanel`, `bindColorPlane`, and `bindColorSlider`
- Test: `tests/color-picker-core.test.ts`

- [ ] **Step 1: Add tests for boundary and keyboard behavior**

Add cases for zero-size guards, clamped pointer coordinates, Home/End, arrow keys, and Page Up/Down.

- [ ] **Step 2: Run tests and confirm the new cases fail**

Run: `bun test tests/color-picker-core.test.ts`

- [ ] **Step 3: Replace captured HSV and mouse-document listeners**

Use the shared HSVA value for the active solid color or active gradient stop. Use Pointer Events with `setPointerCapture`, update the business draft on every move, and release capture on pointer end or cancel.

- [ ] **Step 4: Update existing nodes in place**

Create a `syncColorControls()` closure that updates the plane background, plane handle, hue handle, alpha background, alpha handle, format fields, swatches, gradient preview, and ARIA values without calling full `render()`.

- [ ] **Step 5: Run focused tests and type checking**

Run:

```bash
bun test tests/color-picker-core.test.ts
npx tsc --noEmit
```

Expected: PASS.

### Task 3: Input and format stability

**Files:**
- Modify: `src/design.ts` around `createColorSegmentGroup`, `createColorSegmentInput`, and `createColorNumberSegment`

- [ ] **Step 1: Change text fields to preserve draft text**

Keep incomplete HEX and CSS input text in the active input. Apply only valid values during `input`; commit on Enter or blur; restore the last valid value after invalid blur.

- [ ] **Step 2: Stop full-panel rendering on channel edits**

RGB, HSL, HSB, HEX, CSS, and opacity changes call the shared state setter and `syncColorControls()` instead of `render()`.

- [ ] **Step 3: Preserve format semantics**

HEX remains six digits without `#`, opacity stays separate, and switching formats changes representation without changing HSVA.

- [ ] **Step 4: Run type checking**

Run: `npx tsc --noEmit`

Expected: PASS.

### Task 4: Functional Custom and Libraries tabs

**Files:**
- Modify: `src/design.ts` around `getCachedPageColors`, `createFillPopoverChrome`, and `createPageColorGrid`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Replace the decorative tab state**

Make `createFillPopoverChrome` own a content region and render either the Custom panel or the Libraries panel.

- [ ] **Step 2: Make page-color loading observable**

Return cached colors immediately and register a one-shot listener for the active popover. When asynchronous collection completes, refresh only a still-connected Libraries region.

- [ ] **Step 3: Add loading and empty states**

Add localized labels for page-color loading, empty page colors, and unsupported eyedropper.

- [ ] **Step 4: Route library selections through shared state**

Selecting a page color updates the solid color or active gradient stop while preserving opacity.

- [ ] **Step 5: Run type checking and design-system checks**

Run:

```bash
npx tsc --noEmit
npm run check:design-system
```

Expected: PASS or existing unrelated warnings only.

### Task 5: Eyedropper and lifecycle cleanup

**Files:**
- Modify: `src/design.ts`

- [ ] **Step 1: Add explicit unsupported state**

Disable the eyedropper button and set localized title/ARIA text when `window.EyeDropper` is unavailable.

- [ ] **Step 2: Route successful picks through HSVA state**

Do not update `FillDraft` through a separate path.

- [ ] **Step 3: Clean up interaction state**

Closing the popover destroys pointer handlers, pending page-color listeners, format dropdowns, and drag listeners.

- [ ] **Step 4: Run type checking**

Run: `npx tsc --noEmit`

Expected: PASS.

### Task 6: Final regression verification

**Files:**
- Modify only if a check finds a task-related defect.

- [ ] **Step 1: Run focused and existing tests**

```bash
bun test tests/color-picker-core.test.ts
npm run test:selection
```

- [ ] **Step 2: Run full UI validation**

```bash
npx tsc --noEmit
npx vite build --outDir demo-dist
npm run check:design-system
npm run check:design-scope
```

- [ ] **Step 3: Inspect the final diff**

Confirm only the color-picker implementation, tests, i18n labels, and approved documents changed because of this task. Preserve all pre-existing user changes.

- [ ] **Step 4: Report GUI verification as pending**

Do not launch or operate the application unless the user separately authorizes GUI verification.
